import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createDevice, deleteDevice, deleteManyDevices, deleteExpiredDevices,
  getDeviceById, getDeviceStats, getRecentDevices, getUserPlanInfo,
  listApps, listDevices, seedApps, updateDevice, upsertUser, getDb,
  getDeviceUrls, addDeviceUrl, updateDeviceUrl, deleteDeviceUrl,
  listRevendas, createRevenda, updateRevenda, deleteRevenda, getRevendaStats,
  getConnectedDevices, updateUserProfile,
} from "./db";
import { eq, and, inArray, sql, desc, isNotNull, like, or } from "drizzle-orm";
import { users, appSettings, devices, deviceUrls, dnsEntries, carouselSlides, carouselConfig, suggestions, notices, localCredentials, nuvixConfig, auditLogs, listHealthChecks, payments, messageTemplates, resellerBillings, customerTags, deviceTags, customerNotes, maintenanceTasks, internalAlerts } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { recordAudit } from "./audit";
import { dateOnlyForDatabase } from "../shared/dateOnly";
import { getEnforcedDeviceLimit } from "./deviceLimit";
import { getEffectivePaymentStatus } from "./payments";
import { buildFinancialReport } from "./financialReport";
import { normalizeMessageTemplate } from "./messageTemplate";
import { buildSessionOverview } from "./sessionControl";
import { summarizeResellerFinance } from "./resellerReport";
import { buildRenewalAgenda } from "./renewalAgenda";
import { buildMaintenanceOverview } from "./maintenanceCenter";
import { buildApkUpdateOverview } from "./apkUpdates";
import { getConnectionState } from "./customerProfile";
import { probeListUrl } from "./listHealth";
import { bulkDeviceUpdateSchema } from "./deviceBulk";
import { autoBackupSettings, backupSnapshots, historyRetentionSettings } from "../drizzle/schema";
import { createBackupSnapshot, restoreBackupSnapshot, AUTO_BACKUP_CRON } from "./backupService";
import { createHeartbeatJob, deleteHeartbeatJob } from "./_core/heartbeat";
import { parse as parseCookie } from "cookie";
import { chooseLocalLoginAccount } from "./loginSelection";
import { addBillingMonths, getResellerBillingStatus } from "./resellerBilling";
import { cleanupOldOperationalHistory, HISTORY_RETENTION_CRON, HISTORY_RETENTION_DAYS } from "./historyRetention";

export const revendaUpdateInputSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  email: z.string().optional(),
  plano: z.string().optional(),
  planValidade: z.string().optional(),
  limiteDevices: z.number().optional(),
  limiteRevendas: z.number().optional(),
  isActive: z.boolean().optional(),
  password: z.union([z.string().trim().min(8), z.literal("")]).optional(),
});

type MonitorTarget = { deviceId: number; deviceUrlId: number | null; deviceName: string; listName: string; url: string };

async function getManagedResellerIds(db: any, ownerId: number): Promise<number[]> {
  const managedIds: number[] = [];
  let parentIds = [ownerId];
  while (parentIds.length > 0) {
    const children = await db.select({ id: users.id }).from(users).where(inArray(users.resellerId, parentIds));
    parentIds = children.map((child: { id: number }) => child.id).filter((id: number) => !managedIds.includes(id));
    managedIds.push(...parentIds);
  }
  return managedIds;
}

async function getListMonitorTargets(db: any, ownerId: number): Promise<MonitorTarget[]> {
  const ownedDevices = await db.select({ id: devices.id, nomeServer: devices.nomeServer, urlM3u8: devices.urlM3u8 })
    .from(devices).where(eq(devices.ownerId, ownerId));
  const devicesById = new Map<number, { id: number; nomeServer: string; urlM3u8: string | null }>();
  ownedDevices.forEach((device: any) => devicesById.set(device.id, device));
  const targets: MonitorTarget[] = ownedDevices.flatMap((device: any) => device.urlM3u8 ? [{ deviceId: device.id, deviceUrlId: null, deviceName: device.nomeServer, listName: "Lista principal", url: device.urlM3u8 }] : []);
  const childLists = await db.select({ id: deviceUrls.id, deviceId: deviceUrls.deviceId, nome: deviceUrls.nome, urlM3u8: deviceUrls.urlM3u8, xtServer: deviceUrls.xtServer })
    .from(deviceUrls).where(eq(deviceUrls.ativo, true));
  childLists.forEach((list: any) => {
    const device = devicesById.get(list.deviceId);
    const url = list.urlM3u8 || list.xtServer;
    if (device && url) targets.push({ deviceId: list.deviceId, deviceUrlId: list.id, deviceName: device.nomeServer, listName: list.nome, url });
  });
  return targets;
}

async function runListHealthCheck(db: any, ownerId: number, actorUserId: number, target: MonitorTarget) {
  const result = await probeListUrl(target.url);
  await db.insert(listHealthChecks).values({
    ownerId,
    deviceId: target.deviceId,
    deviceUrlId: target.deviceUrlId,
    urlSnapshot: target.url,
    status: result.status,
    statusCode: result.statusCode,
    responseTimeMs: result.responseTimeMs,
    message: result.message,
  });
  await recordAudit({
    ownerId,
    actorUserId,
    entityType: "list_health",
    entityId: target.deviceUrlId ?? target.deviceId,
    action: result.status === "success" ? "checked" : "error",
    summary: `${target.listName} de ${target.deviceName}: ${result.message}`,
    afterData: { target, result },
  });
  return { ...target, ...result };
}

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a administradores." });
  }
  return next({ ctx });
});

const ownerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.user.isOwner) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito ao proprietário do painel." });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,

  backups: router({
    overview: ownerProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { setting: null, snapshots: [] };
      const setting = (await db.select().from(autoBackupSettings).where(eq(autoBackupSettings.ownerId, ctx.user.id)).limit(1))[0] ?? null;
      const snapshots = await db.select().from(backupSnapshots).where(eq(backupSnapshots.ownerId, ctx.user.id)).orderBy(desc(backupSnapshots.createdAt)).limit(30);
      return { setting, snapshots };
    }),
    runNow: ownerProcedure.mutation(async ({ ctx }) => {
      const result = await createBackupSnapshot(ctx.user.id, "manual");
      await recordAudit({ ownerId: ctx.user.id, actorUserId: ctx.user.id, entityType: "backup", entityId: result.snapshot?.id ?? 0, action: "created", summary: "Backup manual criado", afterData: { type: "manual" } });
      return result;
    }),
    enableDaily: ownerProcedure.mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });
      const existing = (await db.select().from(autoBackupSettings).where(eq(autoBackupSettings.ownerId, ctx.user.id)).limit(1))[0];
      if (existing?.scheduleCronTaskUid) {
        await db.update(autoBackupSettings).set({ enabled: true, runTime: "03:00", lastError: null }).where(eq(autoBackupSettings.id, existing.id));
        return { enabled: true, existingSchedule: true };
      }
      const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
      if (!sessionToken) throw new TRPCError({ code: "UNAUTHORIZED", message: "Sua sessão expirou. Entre novamente para ativar o backup." });
      const job = await createHeartbeatJob({
        name: `backup-diario-${ctx.user.id}`,
        cron: AUTO_BACKUP_CRON,
        path: "/api/scheduled/automatic-backup",
        description: "Backup automático diário às 03:00 de Brasília",
      }, sessionToken);
      if (existing) {
        await db.update(autoBackupSettings).set({ enabled: true, runTime: "03:00", scheduleCronTaskUid: job.taskUid, lastError: null }).where(eq(autoBackupSettings.id, existing.id));
      } else {
        await db.insert(autoBackupSettings).values({ ownerId: ctx.user.id, enabled: true, runTime: "03:00", scheduleCronTaskUid: job.taskUid });
      }
      return { enabled: true, existingSchedule: false, nextExecutionAt: job.nextExecutionAt ?? null };
    }),
    disableDaily: ownerProcedure.mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });
      const setting = (await db.select().from(autoBackupSettings).where(eq(autoBackupSettings.ownerId, ctx.user.id)).limit(1))[0];
      const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
      if (setting?.scheduleCronTaskUid) await deleteHeartbeatJob(setting.scheduleCronTaskUid, sessionToken);
      if (setting) await db.update(autoBackupSettings).set({ enabled: false, scheduleCronTaskUid: null }).where(eq(autoBackupSettings.id, setting.id));
      return { enabled: false };
    }),
    restore: ownerProcedure.input(z.object({ snapshotId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const result = await restoreBackupSnapshot(ctx.user.id, input.snapshotId);
      await recordAudit({ ownerId: ctx.user.id, actorUserId: ctx.user.id, entityType: "backup", entityId: input.snapshotId, action: "restored", summary: "Backup restaurado", afterData: { snapshotId: input.snapshotId } });
      return result;
    }),
    remove: ownerProcedure.input(z.object({ snapshotId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(backupSnapshots).where(and(eq(backupSnapshots.id, input.snapshotId), eq(backupSnapshots.ownerId, ctx.user.id)));
      return { success: true };
    }),
    clearHistory: ownerProcedure.mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(backupSnapshots).where(eq(backupSnapshots.ownerId, ctx.user.id));
      return { success: true };
    }),
  }),

  history: router({
    retention: ownerProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return null;
      return (await db.select().from(historyRetentionSettings).where(eq(historyRetentionSettings.ownerId, ctx.user.id)).limit(1))[0] ?? null;
    }),
    enableRetention: ownerProcedure.mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });
      const existing = (await db.select().from(historyRetentionSettings).where(eq(historyRetentionSettings.ownerId, ctx.user.id)).limit(1))[0];
      if (existing?.scheduleCronTaskUid) {
        await db.update(historyRetentionSettings).set({ enabled: true, retentionDays: HISTORY_RETENTION_DAYS, lastError: null }).where(eq(historyRetentionSettings.id, existing.id));
        return { enabled: true, existingSchedule: true };
      }
      const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
      if (!sessionToken) throw new TRPCError({ code: "UNAUTHORIZED", message: "Sua sessão expirou. Entre novamente para ativar a limpeza." });
      const job = await createHeartbeatJob({ name: `limpeza-historicos-${ctx.user.id}`, cron: HISTORY_RETENTION_CRON, path: "/api/scheduled/history-retention", description: "Limpeza diária de históricos operacionais com retenção de 3 dias" }, sessionToken);
      if (existing) await db.update(historyRetentionSettings).set({ enabled: true, retentionDays: HISTORY_RETENTION_DAYS, scheduleCronTaskUid: job.taskUid, lastError: null }).where(eq(historyRetentionSettings.id, existing.id));
      else await db.insert(historyRetentionSettings).values({ ownerId: ctx.user.id, enabled: true, retentionDays: HISTORY_RETENTION_DAYS, scheduleCronTaskUid: job.taskUid });
      return { enabled: true, existingSchedule: false, nextExecutionAt: job.nextExecutionAt ?? null };
    }),
    disableRetention: ownerProcedure.mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });
      const setting = (await db.select().from(historyRetentionSettings).where(eq(historyRetentionSettings.ownerId, ctx.user.id)).limit(1))[0];
      const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
      if (setting?.scheduleCronTaskUid) await deleteHeartbeatJob(setting.scheduleCronTaskUid, sessionToken);
      if (setting) await db.update(historyRetentionSettings).set({ enabled: false, scheduleCronTaskUid: null }).where(eq(historyRetentionSettings.id, setting.id));
      return { enabled: false };
    }),
    runRetentionNow: ownerProcedure.mutation(async ({ ctx }) => cleanupOldOperationalHistory(ctx.user.id)),
    listAudit: ownerProcedure.input(z.object({ limit: z.number().min(1).max(100).optional().default(50) })).query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(auditLogs).where(eq(auditLogs.ownerId, ctx.user.id)).orderBy(desc(auditLogs.createdAt)).limit(input.limit);
    }),
    deleteAudit: ownerProcedure.input(z.object({ id: z.number().positive() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(auditLogs).where(and(eq(auditLogs.id, input.id), eq(auditLogs.ownerId, ctx.user.id)));
      return { success: true };
    }),
    clearAudit: ownerProcedure.mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(auditLogs).where(eq(auditLogs.ownerId, ctx.user.id));
      return { success: true };
    }),
  }),

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    loginLocal: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const { comparePassword } = await import('./auth');
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database connection failed' });
        
        // Uma revenda cadastrada pelo proprietário tem precedência sobre uma
        // conta legada que, por engano, tenha o mesmo e-mail.
        const normalizedEmail = input.email.trim().toLowerCase();
        const matches = await db.select().from(users)
          .where(sql`LOWER(${users.email}) = ${normalizedEmail}`)
          .limit(20);
        const user = chooseLocalLoginAccount(matches);
        
        if (!user || !user.passwordHash || !user.isActive) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Email ou senha inválidos.' });
        }
        
        // Comparar senha com bcrypt
        const isPasswordValid = await comparePassword(input.password, user.passwordHash);
        if (!isPasswordValid) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Email ou senha inválidos.' });
        }
        
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, JSON.stringify({ userId: user.id, email: user.email }), cookieOptions);
        return { success: true, user };
      }),
  }),

  globalSearch: router({
    query: protectedProcedure.input(z.object({ term: z.string().trim().min(2).max(120) })).query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
      const pattern = `%${input.term.trim()}%`;
      const managedIds = await getManagedResellerIds(db, ctx.user.id);
      const visibleOwnerIds = [ctx.user.id, ...managedIds];
      const [devicesFound, listsFound, resellersFound] = await Promise.all([
        db.select({ id: devices.id, nomeServer: devices.nomeServer, mac: devices.mac, telefone: devices.telefone, urlM3u8: devices.urlM3u8, ownerId: devices.ownerId, status: devices.status }).from(devices)
          .where(and(inArray(devices.ownerId, visibleOwnerIds), or(like(devices.nomeServer, pattern), like(devices.mac, pattern), like(devices.telefone, pattern), like(devices.urlM3u8, pattern)))).limit(15),
        db.select({ id: deviceUrls.id, deviceId: deviceUrls.deviceId, nome: deviceUrls.nome, urlM3u8: deviceUrls.urlM3u8, xtServer: deviceUrls.xtServer, deviceName: devices.nomeServer, deviceMac: devices.mac }).from(deviceUrls)
          .innerJoin(devices, eq(deviceUrls.deviceId, devices.id))
          .where(and(inArray(devices.ownerId, visibleOwnerIds), or(like(deviceUrls.nome, pattern), like(deviceUrls.urlM3u8, pattern), like(deviceUrls.xtServer, pattern)))).limit(15),
        managedIds.length > 0
          ? db.select({ id: users.id, name: users.name, email: users.email, plano: users.plano, isActive: users.isActive, limiteDevices: users.limiteDevices }).from(users)
            .where(and(inArray(users.id, managedIds), or(like(users.name, pattern), like(users.email, pattern)))).limit(15)
          : Promise.resolve([]),
      ]);
      const ownerRows = await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, visibleOwnerIds));
      const ownerNames = new Map(ownerRows.map((owner: { id: number; name: string | null }) => [owner.id, owner.name || `Revenda #${owner.id}`]));
      return { devices: devicesFound.map((device: any) => ({ ...device, ownerName: ownerNames.get(device.ownerId) ?? "Painel principal" })), lists: listsFound, resellers: resellersFound };
    }),
  }),

  security: router({
    overview: ownerProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
      const managedIds = await getManagedResellerIds(db, ctx.user.id);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const [accounts, activity] = await Promise.all([
        managedIds.length > 0 ? db.select({ id: users.id, name: users.name, email: users.email, plano: users.plano, isActive: users.isActive, lastSignedIn: users.lastSignedIn, limiteDevices: users.limiteDevices }).from(users).where(inArray(users.id, managedIds)).orderBy(desc(users.lastSignedIn)).limit(100) : Promise.resolve([]),
        db.select().from(auditLogs).where(eq(auditLogs.ownerId, ctx.user.id)).orderBy(desc(auditLogs.createdAt)).limit(60),
      ]);
      const blocked = accounts.filter((account: any) => !account.isActive);
      const recentLogins = accounts.filter((account: any) => account.lastSignedIn && new Date(account.lastSignedIn) >= sevenDaysAgo);
      const staleAccounts = accounts.filter((account: any) => !account.lastSignedIn || new Date(account.lastSignedIn) < thirtyDaysAgo);
      const sensitiveActions = activity.filter((item: any) => /blocked|unblocked|password|deleted|updated/i.test(item.action));
      return { accounts, activity, sensitiveActions, blocked, recentLogins, staleAccounts, counts: { accounts: accounts.length, blocked: blocked.length, recentLogins: recentLogins.length, staleAccounts: staleAccounts.length } };
    }),
  }),

  resellerBilling: router({
    list: ownerProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db.select({
        id: resellerBillings.id,
        resellerId: resellerBillings.resellerId,
        amount: resellerBillings.amount,
        status: resellerBillings.status,
        dueDate: resellerBillings.dueDate,
        paidAt: resellerBillings.paidAt,
        recurrenceMonths: resellerBillings.recurrenceMonths,
        note: resellerBillings.note,
        createdAt: resellerBillings.createdAt,
        resellerName: users.name,
        resellerEmail: users.email,
        resellerIsActive: users.isActive,
      }).from(resellerBillings).innerJoin(users, eq(resellerBillings.resellerId, users.id))
        .where(eq(resellerBillings.ownerId, ctx.user.id)).orderBy(desc(resellerBillings.dueDate));
      return rows.map((billing: any) => ({ ...billing, effectiveStatus: getResellerBillingStatus(billing.status, billing.dueDate) }));
    }),
    create: ownerProcedure.input(z.object({
      resellerId: z.number().int().positive(),
      amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Informe um valor válido"),
      dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      recurrenceMonths: z.number().int().min(0).max(24).default(1),
      note: z.string().max(1000).optional(),
    })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });
      const managedIds = await getManagedResellerIds(db, ctx.user.id);
      if (!managedIds.includes(input.resellerId)) throw new TRPCError({ code: "NOT_FOUND", message: "Revenda não encontrada no seu painel." });
      const result = await db.insert(resellerBillings).values({ ownerId: ctx.user.id, resellerId: input.resellerId, amount: input.amount, dueDate: new Date(`${input.dueDate}T12:00:00.000Z`), recurrenceMonths: input.recurrenceMonths, note: input.note?.trim() || null });
      const id = Number((result as any)[0]?.insertId ?? (result as any).insertId);
      await recordAudit({ ownerId: ctx.user.id, actorUserId: ctx.user.id, entityType: "reseller_billing", entityId: id, action: "created", summary: `Cobrança de R$ ${input.amount} criada para revenda #${input.resellerId}`, afterData: input });
      return { success: true, id };
    }),
    markPaid: ownerProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });
      const billing = (await db.select().from(resellerBillings).where(and(eq(resellerBillings.id, input.id), eq(resellerBillings.ownerId, ctx.user.id))).limit(1))[0];
      if (!billing) throw new TRPCError({ code: "NOT_FOUND", message: "Cobrança de revenda não encontrada." });
      if (billing.status === "paid") return { success: true, nextBillingId: null };
      await db.update(resellerBillings).set({ status: "paid", paidAt: new Date() }).where(eq(resellerBillings.id, input.id));
      let nextBillingId: number | null = null;
      if (billing.recurrenceMonths > 0) {
        const nextDueDate = addBillingMonths(billing.dueDate, billing.recurrenceMonths);
        const result = await db.insert(resellerBillings).values({ ownerId: billing.ownerId, resellerId: billing.resellerId, amount: billing.amount, dueDate: new Date(`${nextDueDate}T12:00:00.000Z`), recurrenceMonths: billing.recurrenceMonths, note: billing.note });
        nextBillingId = Number((result as any)[0]?.insertId ?? (result as any).insertId);
      }
      await recordAudit({ ownerId: ctx.user.id, actorUserId: ctx.user.id, entityType: "reseller_billing", entityId: input.id, action: "paid", summary: `Cobrança de revenda #${billing.resellerId} confirmada${nextBillingId ? " e próxima recorrência criada" : ""}`, afterData: { nextBillingId } });
      return { success: true, nextBillingId };
    }),
    remove: ownerProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });
      const billing = (await db.select().from(resellerBillings).where(and(eq(resellerBillings.id, input.id), eq(resellerBillings.ownerId, ctx.user.id))).limit(1))[0];
      if (!billing) throw new TRPCError({ code: "NOT_FOUND", message: "Cobrança de revenda não encontrada." });
      await db.delete(resellerBillings).where(eq(resellerBillings.id, input.id));
      await recordAudit({ ownerId: ctx.user.id, actorUserId: ctx.user.id, entityType: "reseller_billing", entityId: input.id, action: "deleted", summary: `Cobrança de revenda #${billing.resellerId} removida`, beforeData: billing });
      return { success: true };
    }),
  }),

  // ─── Devices (Usuários do painel) ──────────────────────────────────────────
  devices: router({
    list: protectedProcedure
      .input(z.object({
        search: z.string().optional().default(""),
        page: z.number().min(1).optional().default(1),
        pageSize: z.number().min(1).max(100).optional().default(50),
      }))
      .query(async ({ ctx, input }) => {
        return listDevices(ctx.user.id, input);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const device = await getDeviceById(input.id, ctx.user.id);
        if (!device) throw new TRPCError({ code: "NOT_FOUND", message: "Device não encontrado." });
        return device;
      }),

    recentList: protectedProcedure
      .input(z.object({
        search: z.string().optional().default(""),
        limit: z.number().min(1).max(20).optional().default(5),
      }))
      .query(async ({ ctx, input }) => {
        const result = await listDevices(ctx.user.id, { search: input.search, page: 1, pageSize: input.limit });
        return result.data;
      }),

    stats: protectedProcedure.query(async ({ ctx }) => {
      return getDeviceStats(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({
        mac: z.string().min(1),
        nomeServer: z.string().min(1),
        tipo: z.enum(["Usuario", "Revenda", "UltraMaster", "Master"]).optional().default("Usuario"),
        modoSelecao: z.enum(["XTeamCode", "M3U8"]).optional().default("XTeamCode"),
        app: z.string().optional(),
        urlM3u8: z.string().optional(),
        urlEpg: z.string().optional(),
        valor: z.string().optional(),
        dataExpiracao: z.string().optional(),
        telefone: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const planInfo = await getUserPlanInfo(ctx.user.id);
        const stats = await getDeviceStats(ctx.user.id);
        if (!planInfo) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Plano da revenda não encontrado." });
        }
        let limite: number;
        try {
          limite = getEnforcedDeviceLimit(planInfo.limiteDevices);
        } catch {
          throw new TRPCError({ code: "FORBIDDEN", message: "Limite de dispositivos inválido. Entre em contato com o administrador." });
        }
        if (stats.total >= limite) {
          throw new TRPCError({ code: "FORBIDDEN", message: `Limite de ${limite} devices atingido.` });
        }
        const result = await createDevice({ ownerId: ctx.user.id, ...input });
        await recordAudit({
          ownerId: ctx.user.id,
          actorUserId: ctx.user.id,
          entityType: "device",
          entityId: result.id,
          action: "created",
          summary: `Cliente ${input.nomeServer} cadastrado`,
          afterData: input,
        });

        if (input.dataExpiracao) {
          const { checkAndSendExpirationNotice } = await import("./autoNotifications");
          await checkAndSendExpirationNotice(result.id, input.dataExpiracao);
        }
        return { success: true, id: result.id };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        mac: z.string().optional(),
        nomeServer: z.string().optional(),
        tipo: z.enum(["Usuario", "Revenda", "UltraMaster", "Master"]).optional(),
        modoSelecao: z.enum(["XTeamCode", "M3U8"]).optional(),
        app: z.string().optional(),
        urlM3u8: z.string().optional(),
        urlEpg: z.string().optional(),
        valor: z.string().optional(),
        dataExpiracao: z.string().optional(),
        status: z.enum(["Liberado", "Bloqueado", "Expirado"]).optional(),
        telefone: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        const device = await getDeviceById(id, ctx.user.id);
        if (!device) throw new TRPCError({ code: "NOT_FOUND", message: "Device não encontrado." });
        await updateDevice(id, ctx.user.id, data);
        await recordAudit({
          ownerId: ctx.user.id,
          actorUserId: ctx.user.id,
          entityType: "device",
          entityId: id,
          action: "updated",
          summary: `Cliente ${device.nomeServer} atualizado`,
          beforeData: device,
          afterData: data,
        });
        
        // Enviar aviso automatico se a data de expiracao foi atualizada
        if (data.dataExpiracao) {
          const { checkAndSendExpirationNotice } = await import('./autoNotifications');
          checkAndSendExpirationNotice(id, data.dataExpiracao).catch(err => {
            console.error('[devices.update] Erro ao enviar notificacao:', err);
          });
        }
        
        return { success: true };
      }),

    bulkUpdate: protectedProcedure
      .input(bulkDeviceUpdateSchema)
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const selectedDevices = await db.select().from(devices).where(and(eq(devices.ownerId, ctx.user.id), inArray(devices.id, input.ids)));
        if (selectedDevices.length !== input.ids.length) throw new TRPCError({ code: "NOT_FOUND", message: "Um ou mais clientes não foram encontrados." });

        const updateData: Record<string, unknown> = {};
        if (input.status) updateData.status = input.status;
        if (input.app) updateData.app = input.app;
        if (input.urlM3u8) updateData.urlM3u8 = input.urlM3u8;
        if (input.dataExpiracao) updateData.dataExpiracao = dateOnlyForDatabase(input.dataExpiracao);
        await db.update(devices).set(updateData).where(and(eq(devices.ownerId, ctx.user.id), inArray(devices.id, input.ids)));

        if (input.dataExpiracao) {
          const { checkAndSendExpirationNotice } = await import("./autoNotifications");
          await Promise.all(selectedDevices.map((device) => checkAndSendExpirationNotice(device.id, input.dataExpiracao!).catch((error) => console.error("[devices.bulkUpdate] Aviso de vencimento:", error))));
        }

        await recordAudit({
          ownerId: ctx.user.id,
          actorUserId: ctx.user.id,
          entityType: "device",
          action: "bulk_updated",
          summary: `${selectedDevices.length} cliente(s) atualizados em massa`,
          beforeData: selectedDevices.map((device) => ({ id: device.id, nomeServer: device.nomeServer, status: device.status, app: device.app, dataExpiracao: device.dataExpiracao, urlM3u8: device.urlM3u8 })),
          afterData: { ...input, ids: undefined },
        });
        return { success: true, count: selectedDevices.length };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const device = await getDeviceById(input.id, ctx.user.id);
        if (!device) throw new TRPCError({ code: "NOT_FOUND", message: "Device não encontrado." });
        await deleteDevice(input.id, ctx.user.id);
        await recordAudit({
          ownerId: ctx.user.id,
          actorUserId: ctx.user.id,
          entityType: "device",
          entityId: input.id,
          action: "deleted",
          summary: `Cliente ${device.nomeServer} excluído`,
          beforeData: device,
        });
        return { success: true };
      }),

    deleteMany: protectedProcedure
      .input(z.object({ ids: z.array(z.number()) }))
      .mutation(async ({ ctx, input }) => {
        await deleteManyDevices(input.ids, ctx.user.id);
        return { success: true };
      }),

    deleteExpired: protectedProcedure.mutation(async ({ ctx }) => {
      await deleteExpiredDevices(ctx.user.id);
      return { success: true };
    }),

    updateCurrentContent: protectedProcedure
      .input(z.object({ id: z.number(), currentContent: z.string().nullable() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const device = await getDeviceById(input.id, ctx.user.id);
        if (!device) throw new TRPCError({ code: 'NOT_FOUND', message: 'Device nao encontrado.' });
        await db.update(devices)
          .set({ currentContent: input.currentContent })
          .where(and(eq(devices.id, input.id), eq(devices.ownerId, ctx.user.id)));
        return { success: true };
      }),

    updateForceShowChannel: protectedProcedure
      .input(z.object({ id: z.number(), forceShowChannel: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const device = await getDeviceById(input.id, ctx.user.id);
        if (!device) throw new TRPCError({ code: 'NOT_FOUND', message: 'Device nao encontrado.' });
        await db.update(devices)
          .set({ forceShowChannel: input.forceShowChannel })
          .where(and(eq(devices.id, input.id), eq(devices.ownerId, ctx.user.id)));
        return { success: true };
      }),

    bulkUpdateDns: protectedProcedure
      .input(z.object({
        newUrl: z.string().min(1),
        ids: z.array(z.number()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        if (input.ids && input.ids.length > 0) {
          await db.update(devices)
            .set({ urlM3u8: input.newUrl })
            .where(and(eq(devices.ownerId, ctx.user.id), inArray(devices.id, input.ids)));
        } else {
          await db.update(devices)
            .set({ urlM3u8: input.newUrl })
            .where(eq(devices.ownerId, ctx.user.id));
        }
        return { success: true };
      }),

    // Trocar DNS em massa: substitui oldUrl por newUrl (só afeta quem tinha aquela DNS)
    bulkSwapDns: protectedProcedure
      .input(z.object({
        oldUrl: z.string().min(1),
        newUrl: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { like, sql } = await import("drizzle-orm");

        // Extrair o host (protocolo + dominio + porta) da URL antiga e nova
        // Ex: "http://p47c.dvrcam.info/" -> "http://p47c.dvrcam.info"
        let oldHost: string;
        let newHost: string;
        try {
          const oldParsed = new URL(input.oldUrl.endsWith('/') ? input.oldUrl : input.oldUrl + '/');
          const newParsed = new URL(input.newUrl.endsWith('/') ? input.newUrl : input.newUrl + '/');
          oldHost = `${oldParsed.protocol}//${oldParsed.host}`;
          newHost = `${newParsed.protocol}//${newParsed.host}`;
        } catch {
          // Fallback: usar a URL inteira se não for URL válida
          oldHost = input.oldUrl;
          newHost = input.newUrl;
        }

        // Buscar devices que têm a DNS antiga no começo da URL
        const affected = await db.select({ id: devices.id, urlM3u8: devices.urlM3u8 })
          .from(devices)
          .where(and(
            eq(devices.ownerId, ctx.user.id),
            like(devices.urlM3u8, `${oldHost}%`)
          ));
        if (affected.length === 0) return { success: true, count: 0 };

        // Substituir apenas o host em cada URL, mantendo o caminho (/get.php?...) intacto
        let updated = 0;
        for (const d of affected) {
          if (!d.urlM3u8) continue;
          const newUrl = d.urlM3u8.replace(oldHost, newHost);
          await db.update(devices)
            .set({ urlM3u8: newUrl })
            .where(and(eq(devices.ownerId, ctx.user.id), eq(devices.id, d.id)));
          updated++;
        }
        return { success: true, count: updated };
      }),

    // Devices expirando nos próximos N dias
    expiringSoon: protectedProcedure
      .input(z.object({ days: z.number().min(1).max(30).optional().default(7) }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return [];
        const now = new Date();
        const future = new Date(now.getTime() + input.days * 24 * 60 * 60 * 1000);
        const rows = await db.select()
          .from(devices)
          .where(and(
            eq(devices.ownerId, ctx.user.id),
            sql`${devices.dataExpiracao} IS NOT NULL`,
            sql`${devices.dataExpiracao} >= ${now.toISOString()}`,
            sql`${devices.dataExpiracao} <= ${future.toISOString()}`
          ))
          .orderBy(devices.dataExpiracao)
          .limit(50);
        return rows;
      }),
    // Listar hosts únicos cadastrados (para dropdown da página DNS em massa)
    listUniqueUrls: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db.select({ urlM3u8: devices.urlM3u8 })
        .from(devices)
        .where(eq(devices.ownerId, ctx.user.id));
      const allUrls = rows.map(r => r.urlM3u8).filter((u): u is string => !!u);
      // Extrair apenas o host (protocolo + domínio + porta) de cada URL
      const hosts = allUrls.map(url => {
        try {
          const parsed = new URL(url.endsWith('/') ? url : url + '/');
          return `${parsed.protocol}//${parsed.host}`;
        } catch {
          return url;
        }
      });
      return Array.from(new Set(hosts));
    }),
  }),

  // ─── Central de Alertas e Histórico ─────────────────────────────────────────
  superPanel: router({
    overview: ownerProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const offlineBoundary = new Date(Date.now() - 30 * 60 * 1000);
      const ownerFilter = eq(devices.ownerId, ctx.user.id);
      const [expiring, offline, missingPhone, listErrors, recentActions] = await Promise.all([
        db.select({ id: devices.id, nomeServer: devices.nomeServer, dataExpiracao: devices.dataExpiracao, telefone: devices.telefone })
          .from(devices)
          .where(and(ownerFilter, sql`${devices.dataExpiracao} IS NOT NULL`, sql`${devices.dataExpiracao} >= CURDATE()`, sql`${devices.dataExpiracao} <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)`))
          .orderBy(devices.dataExpiracao)
          .limit(10),
        db.select({ id: devices.id, nomeServer: devices.nomeServer, mac: devices.mac, lastSeen: devices.lastSeen })
          .from(devices)
          .where(and(ownerFilter, sql`(${devices.lastSeen} IS NULL OR ${devices.lastSeen} < ${offlineBoundary})`))
          .orderBy(devices.lastSeen)
          .limit(10),
        db.select({ id: devices.id, nomeServer: devices.nomeServer, mac: devices.mac })
          .from(devices)
          .where(and(ownerFilter, sql`(${devices.telefone} IS NULL OR TRIM(${devices.telefone}) = '')`))
          .limit(10),
        db.select({ id: listHealthChecks.id, deviceId: listHealthChecks.deviceId, message: listHealthChecks.message, checkedAt: listHealthChecks.checkedAt })
          .from(listHealthChecks)
          .where(and(eq(listHealthChecks.ownerId, ctx.user.id), eq(listHealthChecks.status, "error")))
          .orderBy(desc(listHealthChecks.checkedAt))
          .limit(10),
        db.select().from(auditLogs)
          .where(eq(auditLogs.ownerId, ctx.user.id))
          .orderBy(desc(auditLogs.createdAt))
          .limit(12),
      ]);

      return {
        counts: {
          expiring: expiring.length,
          offline: offline.length,
          missingPhone: missingPhone.length,
          listErrors: listErrors.length,
        },
        expiring,
        offline,
        missingPhone,
        listErrors,
        recentActions,
      };
    }),

    auditLog: ownerProcedure
      .input(z.object({ limit: z.number().min(1).max(100).optional().default(50) }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return [];
        return db.select().from(auditLogs)
          .where(eq(auditLogs.ownerId, ctx.user.id))
          .orderBy(desc(auditLogs.createdAt))
          .limit(input.limit);
      }),

    diagnostics: ownerProcedure
      .input(z.object({ recentMinutes: z.number().min(5).max(240).optional().default(30) }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return [];
        const rows = await db.select({
          id: devices.id,
          nomeServer: devices.nomeServer,
          mac: devices.mac,
          app: devices.app,
          status: devices.status,
          lastSeen: devices.lastSeen,
          currentContent: devices.currentContent,
          dataExpiracao: devices.dataExpiracao,
        }).from(devices).where(eq(devices.ownerId, ctx.user.id)).orderBy(desc(devices.lastSeen));
        const listRows = await db.select({ deviceId: deviceUrls.deviceId }).from(deviceUrls).where(eq(deviceUrls.ativo, true));
        const listCount = new Map<number, number>();
        listRows.forEach((item) => listCount.set(item.deviceId, (listCount.get(item.deviceId) ?? 0) + 1));
        const boundary = Date.now() - input.recentMinutes * 60_000;

        return rows.map((row) => {
          const lastSeenMs = row.lastSeen ? new Date(row.lastSeen).getTime() : null;
          const connection = !lastSeenMs ? "never" : lastSeenMs >= boundary ? "online" : "offline";
          return { ...row, connection, listCount: listCount.get(row.id) ?? 0 };
        });
      }),
  }),

  // ─── Controle Financeiro ─────────────────────────────────────────────────────
  payments: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db.select({
        id: payments.id,
        deviceId: payments.deviceId,
        amount: payments.amount,
        status: payments.status,
        dueDate: payments.dueDate,
        paidAt: payments.paidAt,
        note: payments.note,
        proofReference: payments.proofReference,
        createdAt: payments.createdAt,
        deviceName: devices.nomeServer,
        deviceMac: devices.mac,
      }).from(payments).innerJoin(devices, eq(payments.deviceId, devices.id))
        .where(eq(payments.ownerId, ctx.user.id)).orderBy(desc(payments.createdAt));

      return rows.map((payment) => ({
        ...payment,
        status: getEffectivePaymentStatus(payment.status, payment.dueDate),
      }));
    }),

    report: protectedProcedure.input(z.object({
      start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    })).query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return buildFinancialReport([], input);
      const rows = await db.select().from(payments).where(eq(payments.ownerId, ctx.user.id));
      return buildFinancialReport(rows.map((payment) => ({
        ...payment,
        status: getEffectivePaymentStatus(payment.status, payment.dueDate),
      })), input);
    }),

    create: protectedProcedure.input(z.object({
      deviceId: z.number(),
      amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Informe um valor válido"),
      dueDate: z.string().optional(),
      note: z.string().max(1000).optional(),
      proofReference: z.string().max(2000).optional(),
    })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const device = await getDeviceById(input.deviceId, ctx.user.id);
      if (!device) throw new TRPCError({ code: "NOT_FOUND", message: "Cliente não encontrado." });
      const result = await db.insert(payments).values({
        ownerId: ctx.user.id,
        deviceId: input.deviceId,
        amount: input.amount,
        dueDate: input.dueDate ? dateOnlyForDatabase(input.dueDate) : null,
        note: input.note?.trim() || null,
        proofReference: input.proofReference?.trim() || null,
      });
      const id = Number((result as any)[0]?.insertId ?? (result as any).insertId);
      await recordAudit({ ownerId: ctx.user.id, actorUserId: ctx.user.id, entityType: "payment", entityId: id, action: "created", summary: `Cobrança de R$ ${input.amount} registrada para ${device.nomeServer}`, afterData: input });
      return { success: true, id };
    }),

    markPaid: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [payment] = await db.select().from(payments).where(and(eq(payments.id, input.id), eq(payments.ownerId, ctx.user.id))).limit(1);
      if (!payment) throw new TRPCError({ code: "NOT_FOUND", message: "Cobrança não encontrada." });
      await db.update(payments).set({ status: "paid", paidAt: new Date() }).where(eq(payments.id, input.id));
      const device = await getDeviceById(payment.deviceId, ctx.user.id);
      await recordAudit({ ownerId: ctx.user.id, actorUserId: ctx.user.id, entityType: "payment", entityId: input.id, action: "paid", summary: `Pagamento de R$ ${payment.amount} confirmado${device ? ` para ${device.nomeServer}` : ""}`, beforeData: payment, afterData: { status: "paid" } });
      return { success: true };
    }),

    attachProof: protectedProcedure.input(z.object({ id: z.number(), proofReference: z.string().trim().min(1).max(2000) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [payment] = await db.select().from(payments).where(and(eq(payments.id, input.id), eq(payments.ownerId, ctx.user.id))).limit(1);
      if (!payment) throw new TRPCError({ code: "NOT_FOUND", message: "Cobrança não encontrada." });
      await db.update(payments).set({ proofReference: input.proofReference }).where(eq(payments.id, input.id));
      await recordAudit({ ownerId: ctx.user.id, actorUserId: ctx.user.id, entityType: "payment", entityId: input.id, action: "proof_attached", summary: "Referência de comprovante adicionada à cobrança", afterData: { proofReference: "[registrado]" } });
      return { success: true };
    }),

    remove: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [payment] = await db.select().from(payments).where(and(eq(payments.id, input.id), eq(payments.ownerId, ctx.user.id))).limit(1);
      if (!payment) throw new TRPCError({ code: "NOT_FOUND", message: "Cobrança não encontrada." });
      await db.delete(payments).where(eq(payments.id, input.id));
      await recordAudit({ ownerId: ctx.user.id, actorUserId: ctx.user.id, entityType: "payment", entityId: input.id, action: "deleted", summary: `Cobrança de R$ ${payment.amount} removida`, beforeData: payment });
      return { success: true };
    }),
  }),

  // ─── Modelos do Chatbot ──────────────────────────────────────────────────────
  messageTemplates: router({
    list: ownerProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const existing = await db.select().from(messageTemplates).where(eq(messageTemplates.ownerId, ctx.user.id)).orderBy(desc(messageTemplates.updatedAt));
      if (existing.length > 0) return existing;
      await db.insert(messageTemplates).values([
        { ownerId: ctx.user.id, name: "Renovação", category: "renewal", content: "Olá {nome}! Seu acesso vence em {dias} dia(s), no dia {data}. Renove para continuar usando normalmente." },
        { ownerId: ctx.user.id, name: "Cobrança", category: "collection", content: "Olá {nome}! Identificamos uma pendência no seu acesso. Entre em contato para regularizar e manter o serviço ativo." },
        { ownerId: ctx.user.id, name: "Boas-vindas", category: "welcome", content: "Olá {nome}! Seu acesso foi cadastrado com sucesso. Se precisar de ajuda, fale conosco." },
        { ownerId: ctx.user.id, name: "Manutenção", category: "maintenance", content: "Olá {nome}! Estamos realizando uma manutenção para melhorar o serviço. Agradecemos a compreensão." },
      ]);
      return db.select().from(messageTemplates).where(eq(messageTemplates.ownerId, ctx.user.id)).orderBy(desc(messageTemplates.updatedAt));
    }),
    create: ownerProcedure.input(z.object({
      name: z.string().min(1).max(128),
      category: z.enum(["renewal", "collection", "welcome", "maintenance", "custom"]),
      content: z.string().min(1).max(2000),
    })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const template = normalizeMessageTemplate(input);
      const result = await db.insert(messageTemplates).values({ ownerId: ctx.user.id, ...template });
      const id = Number((result as any)[0]?.insertId ?? (result as any).insertId);
      await recordAudit({ ownerId: ctx.user.id, actorUserId: ctx.user.id, entityType: "message_template", entityId: id, action: "created", summary: `Modelo de mensagem ${template.name} criado` });
      return { success: true, id };
    }),
    update: ownerProcedure.input(z.object({
      id: z.number(),
      name: z.string().min(1).max(128),
      category: z.enum(["renewal", "collection", "welcome", "maintenance", "custom"]),
      content: z.string().min(1).max(2000),
    })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      const template = normalizeMessageTemplate(data);
      await db.update(messageTemplates).set(template).where(and(eq(messageTemplates.id, id), eq(messageTemplates.ownerId, ctx.user.id)));
      await recordAudit({ ownerId: ctx.user.id, actorUserId: ctx.user.id, entityType: "message_template", entityId: id, action: "updated", summary: `Modelo de mensagem ${template.name} atualizado` });
      return { success: true };
    }),
    remove: ownerProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(messageTemplates).where(and(eq(messageTemplates.id, input.id), eq(messageTemplates.ownerId, ctx.user.id)));
      await recordAudit({ ownerId: ctx.user.id, actorUserId: ctx.user.id, entityType: "message_template", entityId: input.id, action: "deleted", summary: "Modelo de mensagem removido" });
      return { success: true };
    }),
    applyToExpiration: ownerProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [template] = await db.select().from(messageTemplates).where(and(eq(messageTemplates.id, input.id), eq(messageTemplates.ownerId, ctx.user.id))).limit(1);
      if (!template) throw new TRPCError({ code: "NOT_FOUND", message: "Modelo não encontrado." });
      await db.insert(appSettings).values({ key: "chatbot_mensagem_vencimento", value: template.content })
        .onDuplicateKeyUpdate({ set: { value: template.content } });
      await recordAudit({ ownerId: ctx.user.id, actorUserId: ctx.user.id, entityType: "message_template", entityId: input.id, action: "applied", summary: `Modelo ${template.name} aplicado ao aviso de vencimento` });
      return { success: true, content: template.content };
    }),
  }),

  // ─── Controle de Sessões ─────────────────────────────────────────────────────
  sessions: router({
    list: protectedProcedure.input(z.object({ minutesAgo: z.number().min(5).max(1440).optional().default(30) })).query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db.select({
        id: devices.id,
        mac: devices.mac,
        nomeServer: devices.nomeServer,
        app: devices.app,
        status: devices.status,
        lastSeen: devices.lastSeen,
        currentContent: devices.currentContent,
      }).from(devices).where(eq(devices.ownerId, ctx.user.id));
      return buildSessionOverview(rows, new Date(), input.minutesAgo);
    }),
    setStatus: protectedProcedure.input(z.object({ id: z.number(), status: z.enum(["Liberado", "Bloqueado"]) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [device] = await db.select().from(devices).where(and(eq(devices.id, input.id), eq(devices.ownerId, ctx.user.id))).limit(1);
      if (!device) throw new TRPCError({ code: "NOT_FOUND", message: "Dispositivo não encontrado." });
      await db.update(devices).set({ status: input.status }).where(eq(devices.id, input.id));
      await recordAudit({ ownerId: ctx.user.id, actorUserId: ctx.user.id, entityType: "session", entityId: input.id, action: input.status === "Bloqueado" ? "blocked" : "released", summary: `Dispositivo ${device.nomeServer} ${input.status === "Bloqueado" ? "bloqueado" : "liberado"} pelo controle de sessões`, beforeData: { status: device.status }, afterData: { status: input.status } });
      return { success: true };
    }),
  }),

  // ─── Relatório Consolidado de Revendas ───────────────────────────────────────
  resellerReport: router({
    list: ownerProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const resellers = await db.select({ id: users.id, name: users.name, email: users.email, isActive: users.isActive, planValidade: users.planValidade, limiteDevices: users.limiteDevices })
        .from(users).where(eq(users.resellerId, ctx.user.id)).orderBy(desc(users.createdAt));
      if (resellers.length === 0) return [];
      const ids = resellers.map((reseller) => reseller.id);
      const [allDevices, allPayments] = await Promise.all([
        db.select({ id: devices.id, ownerId: devices.ownerId, status: devices.status, dataExpiracao: devices.dataExpiracao }).from(devices).where(inArray(devices.ownerId, ids)),
        db.select({ ownerId: payments.ownerId, amount: payments.amount, status: payments.status, dueDate: payments.dueDate }).from(payments).where(inArray(payments.ownerId, ids)),
      ]);
      const now = new Date();
      return resellers.map((reseller) => {
        const clients = allDevices.filter((device) => device.ownerId === reseller.id);
        const finance = summarizeResellerFinance(allPayments.filter((payment) => payment.ownerId === reseller.id), now);
        const expiringSoon = clients.filter((device) => device.dataExpiracao && (new Date(device.dataExpiracao).getTime() - now.getTime()) / 86_400_000 >= 0 && (new Date(device.dataExpiracao).getTime() - now.getTime()) / 86_400_000 <= 7).length;
        return {
          ...reseller,
          clientCount: clients.length,
          activeClients: clients.filter((device) => device.status === "Liberado").length,
          blockedClients: clients.filter((device) => device.status === "Bloqueado" || device.status === "Expirado").length,
          remainingDevices: Math.max(0, (reseller.limiteDevices ?? 0) - clients.length),
          expiringSoon,
          finance,
        };
      });
    }),
  }),

  // ─── Agenda de Renovação ─────────────────────────────────────────────────────
  renewals: router({
    list: protectedProcedure.input(z.object({ days: z.number().min(1).max(90).optional().default(30), status: z.enum(["all", "Liberado", "Bloqueado", "Expirado"]).optional().default("all") })).query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db.select({ id: devices.id, nomeServer: devices.nomeServer, mac: devices.mac, telefone: devices.telefone, dataExpiracao: devices.dataExpiracao, status: devices.status })
        .from(devices).where(and(eq(devices.ownerId, ctx.user.id), isNotNull(devices.dataExpiracao)));
      const agenda = buildRenewalAgenda(rows as any);
      return agenda.filter((item) => item.days <= input.days && (input.status === "all" || item.status === input.status));
    }),
  }),

  // ─── Central de Manutenção ───────────────────────────────────────────────────
  maintenance: router({
    overview: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { listErrors: 0, offline: 0, blocked: 0, actions: [] };
      const [ownedDevices, checks] = await Promise.all([
        db.select({ id: devices.id, nomeServer: devices.nomeServer, status: devices.status, lastSeen: devices.lastSeen }).from(devices).where(eq(devices.ownerId, ctx.user.id)),
        db.select({ deviceId: listHealthChecks.deviceId, deviceUrlId: listHealthChecks.deviceUrlId, status: listHealthChecks.status, message: listHealthChecks.message, checkedAt: listHealthChecks.checkedAt }).from(listHealthChecks).where(eq(listHealthChecks.ownerId, ctx.user.id)),
      ]);
      return buildMaintenanceOverview(ownedDevices, checks, new Date());
    }),
    tasks: router({
      list: protectedProcedure.query(async ({ ctx }) => {
        const db = await getDb();
        if (!db) return [];
        return db.select({ id: maintenanceTasks.id, deviceId: maintenanceTasks.deviceId, title: maintenanceTasks.title, description: maintenanceTasks.description, priority: maintenanceTasks.priority, status: maintenanceTasks.status, assignedToUserId: maintenanceTasks.assignedToUserId, dueAt: maintenanceTasks.dueAt, createdAt: maintenanceTasks.createdAt, updatedAt: maintenanceTasks.updatedAt, deviceName: devices.nomeServer, deviceMac: devices.mac })
          .from(maintenanceTasks).leftJoin(devices, eq(maintenanceTasks.deviceId, devices.id)).where(eq(maintenanceTasks.ownerId, ctx.user.id)).orderBy(desc(maintenanceTasks.updatedAt)).limit(100);
      }),
      create: protectedProcedure.input(z.object({ deviceId: z.number().positive().optional(), title: z.string().trim().min(3).max(255), description: z.string().max(3000).optional(), priority: z.enum(["low", "medium", "high", "critical"]).default("medium"), dueAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() })).mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        if (input.deviceId && !await getDeviceById(input.deviceId, ctx.user.id)) throw new TRPCError({ code: "NOT_FOUND", message: "Cliente não encontrado." });
        const result = await db.insert(maintenanceTasks).values({ ownerId: ctx.user.id, deviceId: input.deviceId ?? null, title: input.title.trim(), description: input.description?.trim() || null, priority: input.priority, assignedToUserId: ctx.user.id, dueAt: input.dueAt ? dateOnlyForDatabase(input.dueAt) : null });
        const id = Number((result as any)[0]?.insertId ?? (result as any).insertId);
        await db.insert(internalAlerts).values({ ownerId: ctx.user.id, targetUserId: ctx.user.id, type: input.priority === "critical" ? "critical" : input.priority === "high" ? "warning" : "info", title: "Nova tarefa de manutenção", content: input.title.trim() });
        await recordAudit({ ownerId: ctx.user.id, actorUserId: ctx.user.id, entityType: "maintenance_task", entityId: id, action: "created", summary: `Tarefa de manutenção criada: ${input.title.trim()}`, afterData: input });
        return { success: true, id };
      }),
      update: protectedProcedure.input(z.object({ id: z.number().positive(), status: z.enum(["open", "in_progress", "resolved", "cancelled"]).optional(), priority: z.enum(["low", "medium", "high", "critical"]).optional(), assignedToUserId: z.number().positive().nullable().optional() })).mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const task = (await db.select().from(maintenanceTasks).where(and(eq(maintenanceTasks.id, input.id), eq(maintenanceTasks.ownerId, ctx.user.id))).limit(1))[0];
        if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "Tarefa não encontrada." });
        const { id, ...data } = input;
        await db.update(maintenanceTasks).set(data).where(eq(maintenanceTasks.id, id));
        await recordAudit({ ownerId: ctx.user.id, actorUserId: ctx.user.id, entityType: "maintenance_task", entityId: id, action: "updated", summary: `Tarefa de manutenção atualizada: ${task.title}`, afterData: data });
        return { success: true };
      }),
      remove: protectedProcedure.input(z.object({ id: z.number().positive() })).mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const task = (await db.select().from(maintenanceTasks).where(and(eq(maintenanceTasks.id, input.id), eq(maintenanceTasks.ownerId, ctx.user.id))).limit(1))[0];
        if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "Tarefa não encontrada." });
        if (!['resolved', 'cancelled'].includes(task.status)) throw new TRPCError({ code: "BAD_REQUEST", message: "Conclua ou cancele a tarefa antes de apagá-la." });
        await db.delete(maintenanceTasks).where(eq(maintenanceTasks.id, input.id));
        return { success: true };
      }),
      clearFinished: protectedProcedure.mutation(async ({ ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.delete(maintenanceTasks).where(and(eq(maintenanceTasks.ownerId, ctx.user.id), inArray(maintenanceTasks.status, ["resolved", "cancelled"])));
        return { success: true };
      }),
    }),
  }),

  // ─── Atualizações do APK ─────────────────────────────────────────────────────
  apkUpdates: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { versions: { ouroPro: null, maximus: null }, devices: [] };
      const [deviceRows, settings] = await Promise.all([
        db.select({ id: devices.id, nomeServer: devices.nomeServer, app: devices.app, appVersion: devices.appVersion, telefone: devices.telefone, lastSeen: devices.lastSeen }).from(devices).where(eq(devices.ownerId, ctx.user.id)),
        db.select({ key: appSettings.key, value: appSettings.value }).from(appSettings).where(inArray(appSettings.key, ["apk_version", "gpcpro_apk_version"])),
      ]);
      const byKey = Object.fromEntries(settings.map((setting) => [setting.key, setting.value]));
      const versions = { ouroPro: byKey.apk_version ?? null, maximus: byKey.gpcpro_apk_version ?? null };
      return { versions, devices: buildApkUpdateOverview(deviceRows, versions) };
    }),
  }),

  // ─── Ficha 360° do Cliente ──────────────────────────────────────────────────
  customerProfile: router({
    get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const deviceResult = await db.select({
        id: devices.id, nomeServer: devices.nomeServer, mac: devices.mac, tipo: devices.tipo, app: devices.app, appVersion: devices.appVersion,
        status: devices.status, telefone: devices.telefone, valor: devices.valor, dataCadastro: devices.dataCadastro, dataExpiracao: devices.dataExpiracao,
        lastSeen: devices.lastSeen, currentContent: devices.currentContent, modoSelecao: devices.modoSelecao,
      }).from(devices).where(and(eq(devices.id, input.id), eq(devices.ownerId, ctx.user.id))).limit(1);
      const device = deviceResult[0];
      if (!device) throw new TRPCError({ code: "NOT_FOUND", message: "Cliente não encontrado." });
      const [lists, paymentRows, history, health, tags, notes] = await Promise.all([
        db.select({ id: deviceUrls.id, nome: deviceUrls.nome, modoSelecao: deviceUrls.modoSelecao, ordem: deviceUrls.ordem, ativo: deviceUrls.ativo }).from(deviceUrls).where(eq(deviceUrls.deviceId, input.id)).orderBy(deviceUrls.ordem),
        db.select({ id: payments.id, amount: payments.amount, status: payments.status, dueDate: payments.dueDate, paidAt: payments.paidAt, note: payments.note, proofReference: payments.proofReference, createdAt: payments.createdAt }).from(payments).where(and(eq(payments.ownerId, ctx.user.id), eq(payments.deviceId, input.id))).orderBy(desc(payments.createdAt)).limit(12),
        db.select({ id: auditLogs.id, action: auditLogs.action, summary: auditLogs.summary, createdAt: auditLogs.createdAt }).from(auditLogs).where(and(eq(auditLogs.ownerId, ctx.user.id), eq(auditLogs.entityId, input.id))).orderBy(desc(auditLogs.createdAt)).limit(12),
        db.select({ id: listHealthChecks.id, status: listHealthChecks.status, responseTimeMs: listHealthChecks.responseTimeMs, message: listHealthChecks.message, checkedAt: listHealthChecks.checkedAt }).from(listHealthChecks).where(and(eq(listHealthChecks.ownerId, ctx.user.id), eq(listHealthChecks.deviceId, input.id))).orderBy(desc(listHealthChecks.checkedAt)).limit(8),
        db.select({ id: customerTags.id, name: customerTags.name, color: customerTags.color }).from(deviceTags).innerJoin(customerTags, eq(deviceTags.tagId, customerTags.id)).where(eq(deviceTags.deviceId, input.id)),
        db.select({ id: customerNotes.id, content: customerNotes.content, authorUserId: customerNotes.authorUserId, createdAt: customerNotes.createdAt }).from(customerNotes).where(and(eq(customerNotes.ownerId, ctx.user.id), eq(customerNotes.deviceId, input.id))).orderBy(desc(customerNotes.createdAt)).limit(30),
      ]);
      return { device, connectionState: getConnectionState(device.lastSeen), lists, payments: paymentRows, history, health, tags, notes };
    }),
  }),

  customerOps: router({
    tags: router({
      list: protectedProcedure.query(async ({ ctx }) => {
        const db = await getDb();
        if (!db) return [];
        return db.select().from(customerTags).where(eq(customerTags.ownerId, ctx.user.id)).orderBy(customerTags.name);
      }),
      create: protectedProcedure.input(z.object({ name: z.string().trim().min(1).max(64), color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#D4A72C") })).mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const result = await db.insert(customerTags).values({ ownerId: ctx.user.id, name: input.name.trim(), color: input.color });
        const id = Number((result as any)[0]?.insertId ?? (result as any).insertId);
        await recordAudit({ ownerId: ctx.user.id, actorUserId: ctx.user.id, entityType: "customer_tag", entityId: id, action: "created", summary: `Etiqueta ${input.name.trim()} criada` });
        return { success: true, id };
      }),
      setForDevice: protectedProcedure.input(z.object({ deviceId: z.number().positive(), tagIds: z.array(z.number().positive()).max(20) })).mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const device = await getDeviceById(input.deviceId, ctx.user.id);
        if (!device) throw new TRPCError({ code: "NOT_FOUND", message: "Cliente não encontrado." });
        const validTags = input.tagIds.length ? await db.select({ id: customerTags.id }).from(customerTags).where(and(eq(customerTags.ownerId, ctx.user.id), inArray(customerTags.id, input.tagIds))) : [];
        if (validTags.length !== input.tagIds.length) throw new TRPCError({ code: "FORBIDDEN", message: "Uma ou mais etiquetas não pertencem ao seu painel." });
        await db.delete(deviceTags).where(eq(deviceTags.deviceId, input.deviceId));
        if (input.tagIds.length) await db.insert(deviceTags).values(input.tagIds.map((tagId) => ({ deviceId: input.deviceId, tagId })));
        await recordAudit({ ownerId: ctx.user.id, actorUserId: ctx.user.id, entityType: "device", entityId: input.deviceId, action: "tags_updated", summary: `Etiquetas do cliente ${device.nomeServer} atualizadas`, afterData: { tagIds: input.tagIds } });
        return { success: true };
      }),
    }),
    notes: router({
      create: protectedProcedure.input(z.object({ deviceId: z.number().positive(), content: z.string().trim().min(1).max(3000) })).mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const device = await getDeviceById(input.deviceId, ctx.user.id);
        if (!device) throw new TRPCError({ code: "NOT_FOUND", message: "Cliente não encontrado." });
        const result = await db.insert(customerNotes).values({ ownerId: ctx.user.id, deviceId: input.deviceId, authorUserId: ctx.user.id, content: input.content.trim() });
        const id = Number((result as any)[0]?.insertId ?? (result as any).insertId);
        await recordAudit({ ownerId: ctx.user.id, actorUserId: ctx.user.id, entityType: "device", entityId: input.deviceId, action: "note_created", summary: `Observação adicionada ao cliente ${device.nomeServer}` });
        return { success: true, id };
      }),
      remove: protectedProcedure.input(z.object({ id: z.number().positive() })).mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.delete(customerNotes).where(and(eq(customerNotes.id, input.id), eq(customerNotes.ownerId, ctx.user.id)));
        return { success: true };
      }),
    }),
    health: router({
      remove: protectedProcedure.input(z.object({ id: z.number().positive() })).mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.delete(listHealthChecks).where(and(eq(listHealthChecks.id, input.id), eq(listHealthChecks.ownerId, ctx.user.id)));
        return { success: true };
      }),
      clearForDevice: protectedProcedure.input(z.object({ deviceId: z.number().positive() })).mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        if (!await getDeviceById(input.deviceId, ctx.user.id)) throw new TRPCError({ code: "NOT_FOUND", message: "Cliente não encontrado." });
        await db.delete(listHealthChecks).where(and(eq(listHealthChecks.ownerId, ctx.user.id), eq(listHealthChecks.deviceId, input.deviceId)));
        return { success: true };
      }),
    }),
    history: router({
      remove: protectedProcedure.input(z.object({ id: z.number().positive(), deviceId: z.number().positive() })).mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.delete(auditLogs).where(and(eq(auditLogs.id, input.id), eq(auditLogs.ownerId, ctx.user.id), eq(auditLogs.entityId, input.deviceId)));
        return { success: true };
      }),
      clearForDevice: protectedProcedure.input(z.object({ deviceId: z.number().positive() })).mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        if (!await getDeviceById(input.deviceId, ctx.user.id)) throw new TRPCError({ code: "NOT_FOUND", message: "Cliente não encontrado." });
        await db.delete(auditLogs).where(and(eq(auditLogs.ownerId, ctx.user.id), eq(auditLogs.entityId, input.deviceId)));
        return { success: true };
      }),
    }),
  }),

  alerts: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(internalAlerts)
        .where(and(eq(internalAlerts.ownerId, ctx.user.id), or(sql`${internalAlerts.targetUserId} IS NULL`, eq(internalAlerts.targetUserId, ctx.user.id))))
        .orderBy(desc(internalAlerts.createdAt)).limit(100);
    }),
    markRead: protectedProcedure.input(z.object({ id: z.number().positive() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(internalAlerts).set({ isRead: true }).where(and(eq(internalAlerts.id, input.id), eq(internalAlerts.ownerId, ctx.user.id)));
      return { success: true };
    }),
    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(internalAlerts).set({ isRead: true }).where(and(eq(internalAlerts.ownerId, ctx.user.id), eq(internalAlerts.isRead, false)));
      return { success: true };
    }),
    remove: protectedProcedure.input(z.object({ id: z.number().positive() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(internalAlerts).where(and(eq(internalAlerts.id, input.id), eq(internalAlerts.ownerId, ctx.user.id)));
      return { success: true };
    }),
    clearAll: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(internalAlerts).where(eq(internalAlerts.ownerId, ctx.user.id));
      return { success: true };
    }),
  }),

  accessControl: router({
    policy: protectedProcedure.query(({ ctx }) => {
      const role = ctx.user.isOwner ? "Ultra Master" : (ctx.user.plano || "Revenda");
      const isOwner = Boolean(ctx.user.isOwner);
      return {
        role,
        scopes: [
          { area: "Clientes próprios", allowed: true, detail: "Cadastrar, editar, bloquear e administrar somente os próprios clientes." },
          { area: "Pagamentos próprios", allowed: true, detail: "Registrar cobranças e comprovantes dos próprios clientes." },
          { area: "Manutenção própria", allowed: true, detail: "Criar e acompanhar tarefas relacionadas ao próprio painel." },
          { area: "Clientes de outras revendas", allowed: isOwner, detail: isOwner ? "Acesso completo como proprietário." : "Dados isolados; sem visualização de outras revendas." },
          { area: "Segurança, backups e configurações do aplicativo", allowed: isOwner, detail: isOwner ? "Acesso exclusivo do proprietário." : "Área reservada ao Ultra Master." },
          { area: "Criar e bloquear revendas", allowed: isOwner, detail: isOwner ? "Pode administrar a hierarquia de revendas." : "Sem permissão de administração global." },
        ],
      };
    }),
  }),

  dataExports: router({
    clients: protectedProcedure.input(z.object({ search: z.string().optional() })).query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const allDevices = await db.select({
        id: devices.id, mac: devices.mac, nomeServer: devices.nomeServer, app: devices.app, appVersion: devices.appVersion,
        status: devices.status, telefone: devices.telefone, valor: devices.valor, dataCadastro: devices.dataCadastro, dataExpiracao: devices.dataExpiracao,
      }).from(devices).where(eq(devices.ownerId, ctx.user.id)).limit(5000);
      const search = input.search?.trim().toLowerCase();
      return search ? allDevices.filter((device) => `${device.nomeServer} ${device.mac} ${device.telefone ?? ""}`.toLowerCase().includes(search)) : allDevices;
    }),
  }),

  // ─── Monitor de Listas ──────────────────────────────────────────────────────
  listMonitor: router({
    list: ownerProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const [targets, checks] = await Promise.all([
        getListMonitorTargets(db, ctx.user.id),
        db.select().from(listHealthChecks).where(eq(listHealthChecks.ownerId, ctx.user.id)).orderBy(desc(listHealthChecks.checkedAt)),
      ]);
      const latestChecks = new Map<string, any>();
      checks.forEach((check: any) => {
        const key = `${check.deviceId}:${check.deviceUrlId ?? "principal"}`;
        if (!latestChecks.has(key)) latestChecks.set(key, check);
      });
      return targets.map((target) => ({ ...target, lastCheck: latestChecks.get(`${target.deviceId}:${target.deviceUrlId ?? "principal"}`) ?? null }));
    }),

    check: ownerProcedure.input(z.object({ deviceId: z.number(), deviceUrlId: z.number().nullable() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const targets = await getListMonitorTargets(db, ctx.user.id);
      const target = targets.find((item) => item.deviceId === input.deviceId && item.deviceUrlId === input.deviceUrlId);
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Lista não encontrada ou sem permissão." });
      return runListHealthCheck(db, ctx.user.id, ctx.user.id, target);
    }),

    checkAll: ownerProcedure.mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const targets = (await getListMonitorTargets(db, ctx.user.id)).slice(0, 30);
      const results = [];
      for (const target of targets) results.push(await runListHealthCheck(db, ctx.user.id, ctx.user.id, target));
      return { checked: results.length, success: results.filter((item) => item.status === "success").length, errors: results.filter((item) => item.status === "error").length };
    }),
  }),

  // ─── Device URLs (múltiplas listas por device) ────────────────────────────
  deviceUrls: router({
    list: protectedProcedure
      .input(z.object({ deviceId: z.number() }))
      .query(async ({ ctx, input }) => {
        // Verificar que o device pertence ao usuário
        const device = await getDeviceById(input.deviceId, ctx.user.id);
        if (!device) throw new TRPCError({ code: "NOT_FOUND", message: "Device não encontrado." });
        return getDeviceUrls(input.deviceId);
      }),

    add: protectedProcedure
      .input(z.object({
        deviceId: z.number(),
        nome: z.string().min(1).default("Lista"),
        modoSelecao: z.enum(["XTeamCode", "M3U8"]).default("XTeamCode"),
        urlM3u8: z.string().optional(),
        xtServer: z.string().optional(),
        xtUsername: z.string().optional(),
        xtPassword: z.string().optional(),
        ordem: z.number().optional().default(0),
      }))
      .mutation(async ({ ctx, input }) => {
        const device = await getDeviceById(input.deviceId, ctx.user.id);
        if (!device) throw new TRPCError({ code: "NOT_FOUND", message: "Device não encontrado." });
        await addDeviceUrl(input);
        await recordAudit({
          ownerId: ctx.user.id,
          actorUserId: ctx.user.id,
          entityType: "list",
          entityId: input.deviceId,
          action: "created",
          summary: `Lista ${input.nome} adicionada a ${device.nomeServer}`,
          afterData: input,
        });
        return { success: true };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        deviceId: z.number(),
        nome: z.string().optional(),
        modoSelecao: z.enum(["XTeamCode", "M3U8"]).optional(),
        urlM3u8: z.string().optional(),
        xtServer: z.string().optional(),
        xtUsername: z.string().optional(),
        xtPassword: z.string().optional(),
        ordem: z.number().optional(),
        ativo: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const device = await getDeviceById(input.deviceId, ctx.user.id);
        if (!device) throw new TRPCError({ code: "NOT_FOUND", message: "Device não encontrado." });
        const { id, deviceId: _, ...data } = input;
        await updateDeviceUrl(id, data);
        await recordAudit({
          ownerId: ctx.user.id,
          actorUserId: ctx.user.id,
          entityType: "list",
          entityId: id,
          action: "updated",
          summary: `Lista de ${device.nomeServer} atualizada`,
          afterData: data,
        });
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number(), deviceId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const device = await getDeviceById(input.deviceId, ctx.user.id);
        if (!device) throw new TRPCError({ code: "NOT_FOUND", message: "Device não encontrado." });
        await deleteDeviceUrl(input.id);
        await recordAudit({
          ownerId: ctx.user.id,
          actorUserId: ctx.user.id,
          entityType: "list",
          entityId: input.id,
          action: "deleted",
          summary: `Lista de ${device.nomeServer} removida`,
        });
        return { success: true };
      }),
  }),

  // ─── Revendas ─────────────────────────────────────────────────────────────
  revendas: router({
    list: protectedProcedure
      .input(z.object({
        search: z.string().optional().default(""),
        page: z.number().min(1).optional().default(1),
        pageSize: z.number().min(1).max(100).optional().default(50),
      }))
      .query(async ({ ctx, input }) => {
        return listRevendas(ctx.user.id, input);
      }),

    stats: protectedProcedure.query(async ({ ctx }) => {
      return getRevendaStats(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(8, "A senha inicial precisa ter no mínimo 8 caracteres."),
        plano: z.string().default("Revenda"),
        planValidade: z.string().optional(),
        limiteDevices: z.number().min(1).default(50),
        limiteRevendas: z.number().min(0).default(0),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verificar limite de revendas do usuário atual
        const planInfo = await getUserPlanInfo(ctx.user.id);
        const stats = await getRevendaStats(ctx.user.id);
        const limiteRevendas = planInfo?.limiteRevendas ?? 0;
        if (limiteRevendas > 0 && stats.totalRevendas >= limiteRevendas) {
          throw new TRPCError({ code: "FORBIDDEN", message: `Limite de ${limiteRevendas} revendas atingido.` });
        }
        const { hashPassword } = await import("./auth");
        const { password, ...revendaData } = input;
        let result: { id: number };
        try {
          result = await createRevenda({ resellerId: ctx.user.id, ...revendaData, passwordHash: await hashPassword(password) });
        } catch (error) {
          if (error instanceof Error && error.message.includes("Já existe uma conta")) {
            throw new TRPCError({ code: "CONFLICT", message: error.message });
          }
          throw error;
        }
        await recordAudit({
          ownerId: ctx.user.id,
          actorUserId: ctx.user.id,
          entityType: "reseller",
          entityId: result.id,
          action: "created",
          summary: `Revenda ${input.name} criada com limite de ${input.limiteDevices} dispositivos`,
          afterData: { ...revendaData, password: "[oculto]" },
        });
        return { success: true, id: result.id };
      }),

    update: protectedProcedure
      .input(revendaUpdateInputSchema)
      .mutation(async ({ ctx, input }) => {
        const { id, password, ...data } = input;
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });
        const current = (await db.select().from(users).where(and(eq(users.id, id), eq(users.resellerId, ctx.user.id))).limit(1))[0];
        if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Revenda não encontrada." });
        const passwordHash = password ? await (await import("./auth")).hashPassword(password) : undefined;
        await updateRevenda(id, ctx.user.id, { ...data, passwordHash });
        await recordAudit({
          ownerId: ctx.user.id,
          actorUserId: ctx.user.id,
          entityType: "reseller",
          entityId: id,
          action: password ? "password_changed" : "updated",
          summary: password ? `Senha da revenda ${current.name ?? current.email ?? id} alterada` : `Revenda ${current.name ?? current.email ?? id} atualizada`,
          beforeData: { name: current.name, email: current.email, plano: current.plano, limiteDevices: current.limiteDevices, limiteRevendas: current.limiteRevendas },
          afterData: { ...data, password: password ? "[oculto]" : undefined },
        });
        return { success: true };
      }),

    toggleBlock: protectedProcedure
      .input(z.object({ id: z.number(), block: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
        const target = await db.select({ id: users.id, name: users.name }).from(users)
          .where(and(eq(users.id, input.id), eq(users.resellerId, ctx.user.id))).limit(1);
        if (!target.length) throw new TRPCError({ code: "NOT_FOUND", message: "Revenda não encontrada." });
        const descendantIds: number[] = [];
        let parentIds = [input.id];
        while (parentIds.length > 0) {
          const children = await db.select({ id: users.id }).from(users).where(inArray(users.resellerId, parentIds));
          parentIds = children.map((child) => child.id).filter((id) => !descendantIds.includes(id));
          descendantIds.push(...parentIds);
        }
        const affectedOwnerIds = [input.id, ...descendantIds];
        const deviceStatus = input.block ? "Bloqueado" : "Liberado";
        await db.update(devices).set({ status: deviceStatus }).where(inArray(devices.ownerId, affectedOwnerIds));
        await db.update(users)
          .set({ isActive: !input.block })
          .where(inArray(users.id, affectedOwnerIds));
        await recordAudit({
          ownerId: ctx.user.id,
          actorUserId: ctx.user.id,
          entityType: "reseller",
          entityId: input.id,
          action: input.block ? "blocked" : "unblocked",
          summary: `Revenda ${target[0].name ?? input.id} ${input.block ? "bloqueada" : "liberada"} com ${descendantIds.length} sub-revenda(s)`,
        });
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (db) {
          // 1. Coletar todos os sub-usuários (revendas filhas) da revenda sendo deletada
          const subRevendas = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.resellerId, input.id));
          const subIds = subRevendas.map(r => r.id);

          // 2. Deletar devices diretos da revenda
          await db.delete(devices)
            .where(eq(devices.ownerId, input.id));

          // 3. Deletar devices de todas as sub-revendas (cascata)
          if (subIds.length > 0) {
            await db.delete(devices)
              .where(inArray(devices.ownerId, subIds));
            // Deletar sub-revendas
            await db.delete(users)
              .where(inArray(users.id, subIds));
          }
        }
        await deleteRevenda(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // ─── Apps ──────────────────────────────────────────────────────────────────
  apps: router({
    list: protectedProcedure.query(async () => {
      await seedApps();
      return listApps();
    }),
  }),

  // ─── Plan info ─────────────────────────────────────────────────────────────
  plan: router({
    info: protectedProcedure.query(async ({ ctx }) => {
      const isOwner = ctx.user.openId === ENV.ownerOpenId;
      if (isOwner) {
        // Buscar plano real do banco para mostrar o nome correto
        const dbPlan = await getUserPlanInfo(ctx.user.id);
        return {
          plano: dbPlan?.plano || "Ultra Master",
          planValidade: dbPlan?.planValidade ?? null,
          limiteDevices: 999999,
          limiteRevendas: 999999,
        };
      }
      return getUserPlanInfo(ctx.user.id);
    }),
  }),

  // ─── Configurações do App ─────────────────────────────────────────────────
  settings: router({
    // Endpoint PUBLICO para o app buscar configuracoes (sem autenticacao)
    getPublic: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return {};
      const rows = await db.select().from(appSettings);
      const result: Record<string, string> = {};
      for (const row of rows) {
        result[row.key] = row.value ?? "";
      }
      return result;
    }),

    getAll: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return {};
      const rows = await db.select().from(appSettings);
      const result: Record<string, string> = {};
      for (const row of rows) {
        result[row.key] = row.value ?? "";
      }
      return result;
    }),

    update: protectedProcedure
      .input(z.object({
        key: z.string().min(1),
        value: z.string(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.insert(appSettings)
          .values({ key: input.key, value: input.value })
          .onDuplicateKeyUpdate({ set: { value: input.value } });
        return { success: true };
      }),

    updateMany: protectedProcedure
      .input(z.record(z.string(), z.string()))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        for (const [key, value] of Object.entries(input)) {
          await db.insert(appSettings)
            .values({ key, value })
            .onDuplicateKeyUpdate({ set: { value } });
        }
        return { success: true };
      }),

    uploadImage: protectedProcedure
      .input(z.object({
        field: z.string().min(1),
        dataUrl: z.string().min(1),
        filename: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        const { storagePut } = await import("./storage");
        const match = input.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (!match) throw new TRPCError({ code: "BAD_REQUEST", message: "dataUrl inválido" });
        const [, mimeType, base64Data] = match;
        const buffer = Buffer.from(base64Data, "base64");
        const ext = input.filename.split(".").pop() ?? "png";
        const key = `app-images/${input.field}-${Date.now()}.${ext}`;
        const { url } = await storagePut(key, buffer, mimeType);
        return { url };
      }),

    getUploadUrl: protectedProcedure
      .input(z.object({
        field: z.string().min(1),
        filename: z.string().min(1),
        contentType: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        const forgeUrl = (ENV.forgeApiUrl ?? "").replace(/\/+$/, "");
        const forgeKey = ENV.forgeApiKey ?? "";
        if (!forgeUrl || !forgeKey) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Storage não configurado" });
        const ext = input.filename.split(".").pop() ?? "png";
        const hash = Math.random().toString(36).slice(2, 10);
        const key = `app-images/${input.field}-${Date.now()}-${hash}.${ext}`;
        const presignUrl = `${forgeUrl}/v1/storage/presign/put?path=${encodeURIComponent(key)}`;
        const resp = await fetch(presignUrl, { headers: { Authorization: `Bearer ${forgeKey}` } });
        if (!resp.ok) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao gerar URL de upload" });
        const { url: s3Url } = await resp.json() as { url: string };
        const publicUrl = `/manus-storage/${key}`;
        return { uploadUrl: s3Url, publicUrl, key };
      }),
  }),

  // ─── Configurações do Maximus Player ────────────────────────────────────────
  maximus: router({
    getSettings: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return null;
      const rows = await db.select().from(appSettings).where(
        sql`key LIKE 'maximus_%'`
      );
      const result: Record<string, any> = {};
      for (const row of rows) {
        const key = row.key.replace('maximus_', '');
        try {
          result[key] = JSON.parse(row.value ?? '{}');
        } catch {
          result[key] = row.value;
        }
      }
      return result;
    }),

    updateSettings: protectedProcedure
      .input(z.object({
        subuser: z.string().optional(),
        alwaysLogin: z.boolean().optional(),
        autoPlayLastChannel: z.boolean().optional(),
        autoRotate: z.boolean().optional(),
        currentPlan: z.string().optional(),
        imageRatio: z.string().optional(),
        bufferSize: z.string().optional(),
        retryAttempts: z.number().optional(),
        language: z.string().optional(),
        contactEmail: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        for (const [key, value] of Object.entries(input)) {
          if (value !== undefined) {
            const dbKey = `maximus_${key}`;
            const dbValue = typeof value === 'string' ? value : JSON.stringify(value);
            await db.insert(appSettings)
              .values({ key: dbKey, value: dbValue })
              .onDuplicateKeyUpdate({ set: { value: dbValue } });
          }
        }
        return { success: true };
      }),
  }),

  // ─── Admin: gerenciamento de usuários do sistema ───────────────────────────
  adminUsers: router({
    list: adminProcedure
      .input(z.object({
        search: z.string().optional().default(""),
        role: z.enum(["admin", "user", "all"]).optional().default("all"),
        limit: z.number().min(1).max(100).optional().default(50),
        offset: z.number().min(0).optional().default(0),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { data: [], total: 0 };
        const { like, or, and, eq, count, desc } = await import("drizzle-orm");
        const { users } = await import("../drizzle/schema");
        const conditions: any[] = [];
        if (input.search) {
          conditions.push(or(like(users.name, `%${input.search}%`), like(users.email, `%${input.search}%`))!);
        }
        if (input.role !== "all") {
          conditions.push(eq(users.role, input.role as "admin" | "user"));
        }
        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
        const [data, totalRows] = await Promise.all([
          db.select().from(users).where(whereClause).orderBy(desc(users.createdAt)).limit(input.limit).offset(input.offset),
          db.select({ count: count() }).from(users).where(whereClause),
        ]);
        return { data, total: totalRows[0]?.count ?? 0 };
      }),

    stats: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) return { total: 0, admins: 0, regularUsers: 0 };
      const { count, eq } = await import("drizzle-orm");
      const { users } = await import("../drizzle/schema");
      const [total, admins] = await Promise.all([
        db.select({ count: count() }).from(users),
        db.select({ count: count() }).from(users).where(eq(users.role, "admin")),
      ]);
      return { total: total[0]?.count ?? 0, admins: admins[0]?.count ?? 0, regularUsers: (total[0]?.count ?? 0) - (admins[0]?.count ?? 0) };
    }),

    updateRole: adminProcedure
      .input(z.object({ userId: z.number(), role: z.enum(["admin", "user"]) }))
      .mutation(async ({ ctx, input }) => {
        if (input.userId === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "Você não pode alterar sua própria função." });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.update(users).set({ role: input.role }).where(eq(users.id, input.userId));
        return { success: true };
      }),

     profile: protectedProcedure.query(({ ctx }) => ctx.user),
    updateProfile: protectedProcedure
      .input(z.object({
        telefone: z.string().optional(),
        avatarUrl: z.string().optional(),
        bannerUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await updateUserProfile(ctx.user.id, input);
        return { success: true };
      }),
    changeCredentials: protectedProcedure
      .input(z.object({
        name: z.string().min(2, "Nome deve ter ao menos 2 caracteres").optional(),
        email: z.string().email("E-mail inválido").optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const updateData: Record<string, unknown> = {};
        if (input.name) updateData.name = input.name;
        if (input.email) updateData.email = input.email;
        if (Object.keys(updateData).length === 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Nenhum dado para atualizar" });
        await db.update(users).set(updateData).where(eq(users.id, ctx.user.id));
        return { success: true };
      }),
  }),

  // ─── DNS Cadastradas ────────────────────────────────────────────────────
  dns: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(dnsEntries).where(eq(dnsEntries.ownerId, ctx.user.id));
    }),
    create: protectedProcedure
      .input(z.object({
        titulo: z.string().min(1, "Título obrigatório"),
        host: z.string().min(1, "Host obrigatório"),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        // Normalizar host: remover barra final
        const host = input.host.replace(/\/+$/, "");
        await db.insert(dnsEntries).values({
          ownerId: ctx.user.id,
          titulo: input.titulo,
          host,
          ativo: true,
        });
        return { success: true };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        titulo: z.string().min(1).optional(),
        host: z.string().min(1).optional(),
        ativo: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { id, ...data } = input;
        if (data.host) data.host = data.host.replace(/\/+$/, "");
        await db.update(dnsEntries).set(data).where(and(eq(dnsEntries.id, id), eq(dnsEntries.ownerId, ctx.user.id)));
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.delete(dnsEntries).where(and(eq(dnsEntries.id, input.id), eq(dnsEntries.ownerId, ctx.user.id)));
        return { success: true };
      }),
  }),

  // ─── Dispositivos Conectados ───────────────────────────────────────────────
  connected: router({
    list: protectedProcedure
      .input(z.object({
        minutesAgo: z.number().min(1).max(1440).optional().default(30),
      }))
      .query(async ({ ctx, input }) => {
        return getConnectedDevices(ctx.user.id, input.minutesAgo);
      }),
  }),

  // ─── Carousel (OuroPro App) ────────────────────────────────────────────────
  carousel: router({
    // Obter slides do carousel (público para o app)
    slides: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(carouselSlides)
        .where(eq(carouselSlides.ativo, true))
        .orderBy(carouselSlides.ordem);
    }),

    // Obter configurações do carousel (público para o app)
    config: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return null;
      const config = await db.select().from(carouselConfig).limit(1);
      return config[0] || null;
    }),

    // Admin: Listar todos os slides
    adminList: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(carouselSlides).orderBy(desc(carouselSlides.ordem));
    }),

    // Admin: Criar slide
    createSlide: adminProcedure
      .input(z.object({
        titulo: z.string().min(1),
        descricao: z.string().optional(),
        tipo: z.enum(["image", "video"]).default("image"),
        urlMedia: z.string().url(),
        ordem: z.number().optional().default(0),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.insert(carouselSlides).values(input);
        return { success: true };
      }),

    // Admin: Atualizar slide
    updateSlide: adminProcedure
      .input(z.object({
        id: z.number(),
        titulo: z.string().optional(),
        descricao: z.string().optional(),
        tipo: z.enum(["image", "video"]).optional(),
        urlMedia: z.string().url().optional(),
        ordem: z.number().optional(),
        ativo: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { id, ...data } = input;
        await db.update(carouselSlides).set(data).where(eq(carouselSlides.id, id));
        return { success: true };
      }),

    // Admin: Deletar slide
    deleteSlide: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.delete(carouselSlides).where(eq(carouselSlides.id, input.id));
        return { success: true };
      }),

    // Admin: Atualizar configurações
    updateConfig: adminProcedure
      .input(z.object({
        autoplay: z.boolean().optional(),
        autoplayInterval: z.number().optional(),
        impactPhrase: z.string().optional(),
        contactPhrase: z.string().optional(),
        legalNotice: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const existing = await db.select().from(carouselConfig).limit(1);
        if (existing.length > 0) {
          await db.update(carouselConfig).set(input).where(eq(carouselConfig.id, existing[0].id));
        } else {
          await db.insert(carouselConfig).values({ ...input, id: 1 });
        }
        return { success: true };
      }),
  }),

  suggestions: router({
    create: protectedProcedure
      .input(z.object({
        nome: z.string().min(1),
        telefone: z.string().optional(),
        email: z.string().email().optional(),
        sugestao: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.insert(suggestions).values({
          userId: ctx.user.id,
          ...input,
        });
        return { success: true };
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      
      // Admin vê todas, outros veem apenas suas
      const where = ctx.user.role === "admin" ? undefined : eq(suggestions.userId, ctx.user.id);
      const result = await db.select().from(suggestions).where(where).orderBy(desc(suggestions.criadoEm));
      return result;
    }),
  }),

  notices: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const result = await db.select().from(notices).where(and(
        eq(notices.ativo, true),
        sql`(${notices.targetOwnerId} IS NULL OR ${notices.targetOwnerId} = ${ctx.user.id})`,
      )).orderBy(desc(notices.criadoEm));
      return result;
    }),

    create: adminProcedure
      .input(z.object({
        titulo: z.string().min(1),
        conteudo: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.insert(notices).values({
          autorId: ctx.user.id,
          targetOwnerId: null,
          ...input,
        });
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.delete(notices).where(and(eq(notices.id, input.id), eq(notices.autorId, ctx.user.id)));
        return { success: true };
      }),
  }),

  // ─── Credenciais Locais (email/senha para revendas) ───────────────────────
  credentials: router({
    create: adminProcedure
      .input(z.object({
        userId: z.number(),
        email: z.string().email(),
        password: z.string().min(6),
      }))
      .mutation(async ({ input }) => {
        const crypto = await import('crypto');
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database connection failed' });
        
        // Verificar se o usuário existe
        const user = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
        if (!user.length) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Usuário não encontrado.' });
        }
        
        // Verificar se já existe credencial para este usuário
        const existing = await db.select().from(localCredentials).where(eq(localCredentials.userId, input.userId)).limit(1);
        if (existing.length) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Este usuário já possui credenciais locais.' });
        }
        
        // Gerar hash da senha
        const hashPassword = crypto.createHash('sha256').update(input.password).digest('hex');
        
        // Inserir credenciais
        await db.insert(localCredentials).values({
          userId: input.userId,
          email: input.email,
          passwordHash: hashPassword,
        });
        
        return { success: true, message: 'Credenciais criadas com sucesso!' };
      }),

    update: adminProcedure
      .input(z.object({
        userId: z.number(),
        email: z.string().email().optional(),
        password: z.string().min(6).optional(),
      }))
      .mutation(async ({ input }) => {
        const crypto = await import('crypto');
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database connection failed' });
        
        // Verificar se a credencial existe
        const existing = await db.select().from(localCredentials).where(eq(localCredentials.userId, input.userId)).limit(1);
        if (!existing.length) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Credenciais não encontradas.' });
        }
        
        const updateData: any = {};
        if (input.email) updateData.email = input.email;
        if (input.password) updateData.passwordHash = crypto.createHash('sha256').update(input.password).digest('hex');
        
        await db.update(localCredentials)
          .set(updateData)
          .where(eq(localCredentials.userId, input.userId));
        
        return { success: true, message: 'Credenciais atualizadas com sucesso!' };
      }),

    delete: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database connection failed' });
        
        await db.delete(localCredentials).where(eq(localCredentials.userId, input.userId));
        return { success: true, message: 'Credenciais removidas com sucesso!' };
      }),
   }),

  nuvix: router({
    getConfig: publicProcedure
      .input(z.object({ ownerId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database connection failed' });
        
        const config = await db.select().from(nuvixConfig).where(eq(nuvixConfig.ownerId, input.ownerId)).limit(1);
        return config[0] || null;
      }),
    
    updateConfig: protectedProcedure
      .input(z.object({
        dns1_nome: z.string().optional(),
        dns1_url: z.string().optional(),
        dns2_nome: z.string().optional(),
        dns2_url: z.string().optional(),
        dns3_nome: z.string().optional(),
        dns3_url: z.string().optional(),
        dns4_nome: z.string().optional(),
        dns4_url: z.string().optional(),
        dns5_nome: z.string().optional(),
        dns5_url: z.string().optional(),
        backgroundUrl: z.string().optional(),
        iconUrl: z.string().optional(),
        appName: z.string().optional(),
        buttonColor: z.string().optional(),
        buttonAddListColor: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database connection failed' });
        
        const existing = await db.select().from(nuvixConfig).where(eq(nuvixConfig.ownerId, ctx.user.id)).limit(1);
        
        if (existing.length) {
          await db.update(nuvixConfig)
            .set({ ...input, updatedAt: new Date() })
            .where(eq(nuvixConfig.ownerId, ctx.user.id));
        } else {
          await db.insert(nuvixConfig).values({
            ownerId: ctx.user.id,
            ...input,
          });
        }
        
        return { success: true, message: 'Configurações atualizadas!' };
      }),
  }),

  // Endpoint para atualizar canal/conteúdo assistido
  device: router({
    updateCurrentContent: publicProcedure
      .input(z.object({
        mac: z.string().min(1),
        currentContent: z.string().nullable(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database connection failed' });
        
        const device = await db.select().from(devices).where(eq(devices.mac, input.mac)).limit(1);
        if (!device.length) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Device não encontrado.' });
        }
        
        await db.update(devices)
          .set({ currentContent: input.currentContent })
          .where(eq(devices.mac, input.mac));
        
        return { success: true };
      }),
  }),

  // ─── Ranking de Apps ────────────────────────────────────────────────────
  ranking: router({
    appStats: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();  
      if (!db) return { ouropro: 0, maximus: 0, total: 0 };
      
      const result = await db.select({
        app: devices.app,
        count: sql`COUNT(*)`
      })
      .from(devices)
      .where(isNotNull(devices.app))
      .groupBy(devices.app);
      
      const counts = result.reduce((acc: any, row: any) => {
        const appName = row.app || 'Sem App';
        acc[appName] = Number(row.count) || 0;
        return acc;
      }, {});
      
      const ouropro = counts['OuroPro'] || 0;
      const maximus = counts['Maximus'] || 0;
      
      return {
        ouropro,
        maximus,
        total: ouropro + maximus
      };
    }),
  }),
});
export type AppRouter = typeof appRouter;
