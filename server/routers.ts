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
import { eq, and, inArray, sql, desc, isNotNull, like, or, gt } from "drizzle-orm";
import { users, appSettings, devices, deviceUrls, dnsEntries, carouselSlides, carouselConfig, suggestions, notices, localCredentials, nuvixConfig, auditLogs, listHealthChecks, payments, messageTemplates, resellerBillings, customerTags, deviceTags, customerNotes, maintenanceTasks, internalAlerts, listFailoverSettings, listFailoverEvents, remoteDeviceCommands, appCredentials, resellerPermissions, appSessions, storeInvites, googleDriveBackupConnections, deviceAppLinks, iptvServers, iptvServerAlertLogs, iptvServerAlertSettings, iptvServerWhatsAppBusinessSettings } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { recordAudit } from "./audit";
import { dateOnlyForDatabase } from "../shared/dateOnly";
import { normalizeMacForStorage } from "../shared/mac";
import { getEnforcedDeviceLimit } from "./deviceLimit";
import { getEffectivePaymentStatus } from "./payments";
import { buildFinancialReport } from "./financialReport";
import { normalizeMessageTemplate } from "./messageTemplate";
import { buildSessionOverview } from "./sessionControl";
import { summarizeResellerDevicePerformance, summarizeResellerFinance } from "./resellerReport";
import { buildRenewalAgenda } from "./renewalAgenda";
import { buildMaintenanceOverview } from "./maintenanceCenter";
import { buildApkUpdateOverview, buildConfiguredAppVersions } from "./apkUpdates";
import { buildBulkMessageRecipients, normalizeBulkMessageDnsHost } from "./bulkMessages";
import { buildOperationHealthOverview } from "./operationHealth";
import { getConnectionState } from "./customerProfile";
import { hasConfirmedListFailure, probeListUrl } from "./listHealth";
import { lookupPlaylistExpiration } from "./playlistExpiration";
import { buildServerPilotOverview } from "./serverPilot";
import { bulkDeviceUpdateSchema } from "./deviceBulk";
import { autoBackupSettings, backupSnapshots, historyRetentionSettings } from "../drizzle/schema";
import { createBackupSnapshot, restoreBackupSnapshot, AUTO_BACKUP_CRON } from "./backupService";
import { createGoogleDriveAuthorizationUrl } from "./googleDriveBackup";
import { appServerSettingKey } from "./appServerDirectory";
import { createHeartbeatJob, deleteHeartbeatJob } from "./_core/heartbeat";
import { parse as parseCookie } from "cookie";
import { chooseLocalLoginAccount } from "./loginSelection";
import { addBillingMonths, getResellerBillingStatus } from "./resellerBilling";
import { cleanupOldOperationalHistory, HISTORY_RETENTION_CRON, HISTORY_RETENTION_DAYS } from "./historyRetention";
import { LIST_FAILOVER_CRON, recordFailoverRun, runListFailoverSweep } from "./listFailover";
import { commandExpiresAt, REMOTE_COMMAND_LABELS, REMOTE_COMMAND_TYPES, type RemoteCommandType } from "./remoteCommands";
import { buildDnsTargets, collectDnsTargetDeviceIds, normalizeDnsHost } from "./remoteCommandDns";
import { hashPassword } from "./auth";
import { normalizeResellerPermissions, parseResellerAccessPolicy, RESELLER_PERMISSION_KEYS, serializeResellerAccessPolicy } from "../shared/resellerPermissions";
import { createStoreInviteToken, hashStoreInviteToken, normalizeStoreInviteApps, serializeStoreInviteApps } from "./storeInvites";
import { isAppSettingVisibleToReseller } from "./appSettingsVisibility";
import { buildIptvServerAlertMessage, buildIptvServerWhatsAppUrl, daysUntilServerExpiration, IPTV_SERVER_ALERT_CRON, shouldAlertIptvServer } from "./iptvServerAlerts";
import { runIptvServerAlertSweep } from "./iptvServerAlertService";
import { prepareIptvServerWhatsAppBusiness } from "./iptvServerWhatsAppBusiness";

async function requireGrantedPanelPermission(db: any, user: any, permission: string) {
  if (user?.isOwner) return;
  const row = (await db.select({ permissions: resellerPermissions.permissions }).from(resellerPermissions)
    .where(eq(resellerPermissions.resellerId, user.id)).limit(1))[0];
  if (!parseResellerAccessPolicy(row?.permissions).permissions.includes(permission as any)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Esta ferramenta não foi liberada para sua conta." });
  }
}

function managedAppIdForValue(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toLocaleLowerCase("pt-BR");
  if (!normalized) return null;
  return Object.values(MANAGED_APP_CATALOG).find((app) => app.id === normalized || app.deviceAliases.some((alias) => alias.toLocaleLowerCase("pt-BR") === normalized))?.id ?? null;
}

async function getAllowedAppsForUser(db: any, user: any) {
  if (user?.isOwner) return null;
  const row = (await db.select({ permissions: resellerPermissions.permissions }).from(resellerPermissions)
    .where(eq(resellerPermissions.resellerId, user.id)).limit(1))[0];
  return parseResellerAccessPolicy(row?.permissions).allowedApps;
}

async function requireAllowedResellerApp(db: any, user: any, appValue: string | null | undefined) {
  const allowedApps = await getAllowedAppsForUser(db, user);
  if (allowedApps === null || !appValue?.trim()) return;
  const appId = managedAppIdForValue(appValue);
  if (!appId || !allowedApps.includes(appId)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Este aplicativo não está liberado para o seu plano. Fale com o proprietário do painel." });
  }
}

function managedAppIdForSettingsKey(key: string) {
  const normalized = key.trim().toLocaleLowerCase("pt-BR");
  const publicMatch = normalized.match(/^public_([a-z0-9]+)_/);
  if (publicMatch && isManagedAppId(publicMatch[1])) return publicMatch[1];
  const directMatch = Object.keys(MANAGED_APP_CATALOG).find((appId) => normalized.startsWith(`${appId}_`));
  if (directMatch && isManagedAppId(directMatch)) return directMatch;
  if (normalized.startsWith("ultra_")) return "fusion";
  if (normalized.startsWith("maximus_") || normalized.startsWith("gpcpro_")) return "maximus";
  if (normalized.startsWith("trial_") || normalized.startsWith("apk_") || normalized.startsWith("lock_")) return "ouropro";
  return null;
}

async function requireAllowedResellerSettings(db: any, user: any, keys: string[]) {
  const allowedApps = await getAllowedAppsForUser(db, user);
  if (allowedApps === null) return;
  const restrictedApp = keys.map(managedAppIdForSettingsKey).find((appId) => appId && !allowedApps.includes(appId));
  if (restrictedApp) throw new TRPCError({ code: "FORBIDDEN", message: "As configurações deste aplicativo não estão liberadas para o seu plano." });
}
import { isManagedAppId, MANAGED_APP_CATALOG, type ManagedAppId } from "../shared/appCatalog";
import { PENDING_LOGIN_MAC } from "./appLogin";

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

function buildXteamPlaylistUrl(server: string, username: string, password: string) {
  return `${server.replace(/\/$/, "")}/get.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&type=m3u_plus&output=ts`;
}

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

  appServerDirectory: router({
    get: ownerProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
      const rows = await db.select().from(appSettings);
      const settings = Object.fromEntries(rows.map((row) => [row.key, row.value ?? ""]));
      return {
        origins: Object.fromEntries(Object.entries(MANAGED_APP_CATALOG).map(([appId]) => [appId, settings[appServerSettingKey(appId as ManagedAppId)] || ""])),
      };
    }),
    update: ownerProcedure.input(z.object({ origins: z.record(z.string(), z.string().max(512)) })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
      for (const [candidateId, value] of Object.entries(input.origins)) {
        if (!isManagedAppId(candidateId)) continue;
        const trimmed = value.trim();
        if (trimmed) {
          try {
            const url = new URL(trimmed);
            if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("protocolo");
          } catch {
            throw new TRPCError({ code: "BAD_REQUEST", message: `O endereço de ${MANAGED_APP_CATALOG[candidateId].displayName} é inválido.` });
          }
        }
        const key = appServerSettingKey(candidateId);
        const existing = (await db.select({ id: appSettings.id }).from(appSettings).where(eq(appSettings.key, key)).limit(1))[0];
        if (existing) await db.update(appSettings).set({ value: trimmed }).where(eq(appSettings.id, existing.id));
        else await db.insert(appSettings).values({ key, value: trimmed });
      }
      return { saved: true };
    }),
  }),

  backups: router({
    overview: ownerProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { setting: null, snapshots: [], googleDrive: null };
      const setting = (await db.select().from(autoBackupSettings).where(eq(autoBackupSettings.ownerId, ctx.user.id)).limit(1))[0] ?? null;
      const snapshots = await db.select().from(backupSnapshots).where(eq(backupSnapshots.ownerId, ctx.user.id)).orderBy(desc(backupSnapshots.createdAt)).limit(30);
      const googleDrive = (await db.select({ folderName: googleDriveBackupConnections.folderName, status: googleDriveBackupConnections.status, lastSuccessAt: googleDriveBackupConnections.lastSuccessAt, lastError: googleDriveBackupConnections.lastError }).from(googleDriveBackupConnections).where(eq(googleDriveBackupConnections.ownerId, ctx.user.id)).limit(1))[0] ?? null;
      return { setting, snapshots, googleDrive };
    }),
    googleDriveAuthorizationUrl: ownerProcedure.input(z.object({ origin: z.string().url() })).mutation(({ ctx, input }) => {
      const origin = new URL(input.origin);
      if (origin.protocol !== "https:" && origin.protocol !== "http:") throw new TRPCError({ code: "BAD_REQUEST", message: "Endereço de retorno inválido." });
      return { url: createGoogleDriveAuthorizationUrl(ctx.user.id, origin.origin) };
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

  iptvServers: router({
    overview: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { servers: [], expiring: [], alerts: [], setting: null, whatsappBusiness: { status: "not_configured", enabled: false } };
      await requireGrantedPanelPermission(db, ctx.user, "server_management");
      const servers = await db.select().from(iptvServers).where(eq(iptvServers.ownerId, ctx.user.id)).orderBy(iptvServers.expiresAt);
      const alerts = await db.select().from(iptvServerAlertLogs).where(eq(iptvServerAlertLogs.ownerId, ctx.user.id)).orderBy(desc(iptvServerAlertLogs.createdAt)).limit(100);
      const setting = (await db.select().from(iptvServerAlertSettings).where(eq(iptvServerAlertSettings.ownerId, ctx.user.id)).limit(1))[0] ?? null;
      const whatsappBusiness = (await db.select().from(iptvServerWhatsAppBusinessSettings).where(eq(iptvServerWhatsAppBusinessSettings.ownerId, ctx.user.id)).limit(1))[0] ?? { status: "not_configured" as const, enabled: false };
      const now = new Date();
      const expiring = servers.filter((server) => shouldAlertIptvServer(server, now)).map((server) => ({
        ...server,
        daysUntilExpiration: daysUntilServerExpiration(server.expiresAt, now),
        message: buildIptvServerAlertMessage(server, now),
      }));
      return { servers, expiring, alerts, setting, whatsappBusiness };
    }),
    create: protectedProcedure.input(z.object({
      name: z.string().trim().min(2).max(255),
      server: z.string().trim().min(2).max(512),
      expiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data de vencimento inválida."),
      reminderDays: z.number().int().min(0).max(30).optional().default(3),
    })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
      await requireGrantedPanelPermission(db, ctx.user, "server_management");
      const result = await db.insert(iptvServers).values({
        ownerId: ctx.user.id,
        name: input.name,
        server: input.server,
        expiresAt: new Date(`${input.expiresAt}T00:00:00.000Z`),
        reminderDays: input.reminderDays,
      });
      await recordAudit({ ownerId: ctx.user.id, actorUserId: ctx.user.id, entityType: "iptv_server", entityId: Number(result[0].insertId), action: "created", summary: `Servidor IPTV ${input.name} cadastrado`, afterData: input });
      return { id: Number(result[0].insertId) };
    }),
    update: protectedProcedure.input(z.object({
      id: z.number().int().positive(),
      name: z.string().trim().min(2).max(255),
      server: z.string().trim().min(2).max(512),
      expiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      reminderDays: z.number().int().min(0).max(30),
      isActive: z.boolean(),
    })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
      await requireGrantedPanelPermission(db, ctx.user, "server_management");
      await db.update(iptvServers).set({
        name: input.name,
        server: input.server,
        expiresAt: new Date(`${input.expiresAt}T00:00:00.000Z`),
        reminderDays: input.reminderDays,
        isActive: input.isActive,
      }).where(and(eq(iptvServers.id, input.id), eq(iptvServers.ownerId, ctx.user.id)));
      await recordAudit({ ownerId: ctx.user.id, actorUserId: ctx.user.id, entityType: "iptv_server", entityId: input.id, action: "updated", summary: `Servidor IPTV ${input.name} atualizado`, afterData: input });
      return { success: true };
    }),
    remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
      await requireGrantedPanelPermission(db, ctx.user, "server_management");
      await db.delete(iptvServerAlertLogs).where(and(eq(iptvServerAlertLogs.serverId, input.id), eq(iptvServerAlertLogs.ownerId, ctx.user.id)));
      await db.delete(iptvServers).where(and(eq(iptvServers.id, input.id), eq(iptvServers.ownerId, ctx.user.id)));
      await recordAudit({ ownerId: ctx.user.id, actorUserId: ctx.user.id, entityType: "iptv_server", entityId: input.id, action: "deleted", summary: "Servidor IPTV removido" });
      return { success: true };
    }),
    prepareWhatsApp: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
      await requireGrantedPanelPermission(db, ctx.user, "server_management");
      const server = (await db.select().from(iptvServers).where(and(eq(iptvServers.id, input.id), eq(iptvServers.ownerId, ctx.user.id))).limit(1))[0];
      if (!server) throw new TRPCError({ code: "NOT_FOUND", message: "Servidor não encontrado." });
      const message = buildIptvServerAlertMessage(server);
      const alertDate = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
      const existing = (await db.select({ id: iptvServerAlertLogs.id }).from(iptvServerAlertLogs).where(and(
        eq(iptvServerAlertLogs.serverId, server.id), eq(iptvServerAlertLogs.alertDate, alertDate), eq(iptvServerAlertLogs.channel, "whatsapp_ready"),
      )).limit(1))[0];
      if (!existing) await db.insert(iptvServerAlertLogs).values({ serverId: server.id, ownerId: ctx.user.id, alertDate, channel: "whatsapp_ready", message });
      return { message, url: buildIptvServerWhatsAppUrl(message) };
    }),
    runAlertsNow: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
      await requireGrantedPanelPermission(db, ctx.user, "server_management");
      return runIptvServerAlertSweep(db, ctx.user.id);
    }),
    enableDailyAlerts: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
      await requireGrantedPanelPermission(db, ctx.user, "server_management");
      const setting = (await db.select().from(iptvServerAlertSettings).where(eq(iptvServerAlertSettings.ownerId, ctx.user.id)).limit(1))[0];
      if (setting?.scheduleCronTaskUid) {
        await db.update(iptvServerAlertSettings).set({ enabled: true }).where(eq(iptvServerAlertSettings.id, setting.id));
        return { enabled: true, existingSchedule: true };
      }
      const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
      if (!sessionToken) throw new TRPCError({ code: "UNAUTHORIZED", message: "Sua sessão expirou. Entre novamente para ativar os avisos." });
      const job = await createHeartbeatJob({
        name: `avisos-servidores-iptv-${ctx.user.id}`,
        cron: IPTV_SERVER_ALERT_CRON,
        path: "/api/scheduled/iptv-server-alerts",
        description: "Avisos diários de vencimento de servidores IPTV às 09:00 de Brasília",
      }, sessionToken);
      if (setting) await db.update(iptvServerAlertSettings).set({ enabled: true, scheduleCronTaskUid: job.taskUid }).where(eq(iptvServerAlertSettings.id, setting.id));
      else await db.insert(iptvServerAlertSettings).values({ ownerId: ctx.user.id, enabled: true, scheduleCronTaskUid: job.taskUid });
      return { enabled: true, existingSchedule: false, nextExecutionAt: job.nextExecutionAt ?? null };
    }),
    disableDailyAlerts: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
      await requireGrantedPanelPermission(db, ctx.user, "server_management");
      const setting = (await db.select().from(iptvServerAlertSettings).where(eq(iptvServerAlertSettings.ownerId, ctx.user.id)).limit(1))[0];
      const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
      if (setting?.scheduleCronTaskUid) await deleteHeartbeatJob(setting.scheduleCronTaskUid, sessionToken);
      if (setting) await db.update(iptvServerAlertSettings).set({ enabled: false, scheduleCronTaskUid: null }).where(eq(iptvServerAlertSettings.id, setting.id));
      return { enabled: false };
    }),
    prepareWhatsAppBusiness: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
      await requireGrantedPanelPermission(db, ctx.user, "server_management");
      const serverCount = (await db.select({ id: iptvServers.id }).from(iptvServers).where(eq(iptvServers.ownerId, ctx.user.id))).length;
      const preparation = prepareIptvServerWhatsAppBusiness(serverCount);
      const current = (await db.select().from(iptvServerWhatsAppBusinessSettings).where(eq(iptvServerWhatsAppBusinessSettings.ownerId, ctx.user.id)).limit(1))[0];
      if (current) await db.update(iptvServerWhatsAppBusinessSettings).set({ status: preparation.status, enabled: false }).where(eq(iptvServerWhatsAppBusinessSettings.id, current.id));
      else await db.insert(iptvServerWhatsAppBusinessSettings).values({ ownerId: ctx.user.id, status: preparation.status, enabled: false });
      return preparation;
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
    me: publicProcedure.query(async opts => {
      const user = opts.ctx.user;
      if (!user) return null;
      if (user.isOwner) return { ...user, grantedPermissions: RESELLER_PERMISSION_KEYS };
      const db = await getDb();
      if (!db) return { ...user, grantedPermissions: [] };
      const row = (await db.select({ permissions: resellerPermissions.permissions }).from(resellerPermissions)
        .where(eq(resellerPermissions.resellerId, user.id)).limit(1))[0];
      const policy = parseResellerAccessPolicy(row?.permissions);
      return { ...user, grantedPermissions: policy.permissions };
    }),
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

  resellerPermissions: router({
    get: protectedProcedure.input(z.object({ resellerId: z.number().positive() })).query(async ({ ctx, input }) => {
      if (!ctx.user.isOwner) throw new TRPCError({ code: "FORBIDDEN", message: "Somente o proprietário pode configurar permissões." });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const target = (await db.select({ id: users.id }).from(users).where(and(eq(users.id, input.resellerId), eq(users.resellerId, ctx.user.id))).limit(1))[0];
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Revenda não encontrada." });
      const row = (await db.select({ permissions: resellerPermissions.permissions }).from(resellerPermissions)
        .where(eq(resellerPermissions.resellerId, input.resellerId)).limit(1))[0];
      return { permissions: parseResellerAccessPolicy(row?.permissions).permissions };
    }),
    set: protectedProcedure.input(z.object({ resellerId: z.number().positive(), permissions: z.array(z.string()).max(RESELLER_PERMISSION_KEYS.length) })).mutation(async ({ ctx, input }) => {
      if (!ctx.user.isOwner) throw new TRPCError({ code: "FORBIDDEN", message: "Somente o proprietário pode configurar permissões." });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const target = (await db.select({ id: users.id }).from(users).where(and(eq(users.id, input.resellerId), eq(users.resellerId, ctx.user.id))).limit(1))[0];
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Revenda não encontrada." });
      const existing = (await db.select({ permissions: resellerPermissions.permissions }).from(resellerPermissions).where(eq(resellerPermissions.resellerId, input.resellerId)).limit(1))[0];
      const existingPolicy = parseResellerAccessPolicy(existing?.permissions);
      const permissions = normalizeResellerPermissions(input.permissions);
      const values = { resellerId: input.resellerId, permissions: serializeResellerAccessPolicy({ permissions, allowedApps: existingPolicy.allowedApps }), updatedBy: ctx.user.id };
      await db.insert(resellerPermissions).values(values).onDuplicateKeyUpdate({ set: { permissions: values.permissions, updatedBy: values.updatedBy } });
      await recordAudit({ ownerId: ctx.user.id, actorUserId: ctx.user.id, entityType: "reseller_permission", entityId: input.resellerId, action: "updated", summary: `Permissões da revenda atualizadas (${permissions.length} liberações).`, afterData: { permissions } });
      return { success: true, permissions };
    }),
  }),

  resellerAppAccess: router({
    me: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { allowedApps: Object.keys(MANAGED_APP_CATALOG), isRestricted: false };
      const allowedApps = await getAllowedAppsForUser(db, ctx.user);
      return { allowedApps: allowedApps ?? Object.keys(MANAGED_APP_CATALOG), isRestricted: allowedApps !== null };
    }),
    get: protectedProcedure.input(z.object({ resellerId: z.number().positive() })).query(async ({ ctx, input }) => {
      if (!ctx.user.isOwner) throw new TRPCError({ code: "FORBIDDEN", message: "Somente o proprietário pode definir os aplicativos de uma revenda." });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const target = (await db.select({ id: users.id }).from(users).where(and(eq(users.id, input.resellerId), eq(users.resellerId, ctx.user.id))).limit(1))[0];
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Revenda não encontrada." });
      const row = (await db.select({ permissions: resellerPermissions.permissions }).from(resellerPermissions).where(eq(resellerPermissions.resellerId, input.resellerId)).limit(1))[0];
      const policy = parseResellerAccessPolicy(row?.permissions);
      return { allowedApps: policy.allowedApps ?? Object.keys(MANAGED_APP_CATALOG), isLegacyAllApps: policy.allowedApps === null };
    }),
    set: protectedProcedure.input(z.object({ resellerId: z.number().positive(), allowedApps: z.array(z.string().refine(isManagedAppId, "Aplicativo inválido.")).max(Object.keys(MANAGED_APP_CATALOG).length) })).mutation(async ({ ctx, input }) => {
      if (!ctx.user.isOwner) throw new TRPCError({ code: "FORBIDDEN", message: "Somente o proprietário pode definir os aplicativos de uma revenda." });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const target = (await db.select({ id: users.id }).from(users).where(and(eq(users.id, input.resellerId), eq(users.resellerId, ctx.user.id))).limit(1))[0];
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Revenda não encontrada." });
      const row = (await db.select({ permissions: resellerPermissions.permissions }).from(resellerPermissions).where(eq(resellerPermissions.resellerId, input.resellerId)).limit(1))[0];
      const existingPolicy = parseResellerAccessPolicy(row?.permissions);
      const allowedApps = Array.from(new Set(input.allowedApps)) as ManagedAppId[];
      const values = { resellerId: input.resellerId, permissions: serializeResellerAccessPolicy({ permissions: existingPolicy.permissions, allowedApps }), updatedBy: ctx.user.id };
      await db.insert(resellerPermissions).values(values).onDuplicateKeyUpdate({ set: { permissions: values.permissions, updatedBy: values.updatedBy } });
      await recordAudit({ ownerId: ctx.user.id, actorUserId: ctx.user.id, entityType: "reseller_app_access", entityId: input.resellerId, action: "updated", summary: `Aplicativos da revenda atualizados (${allowedApps.length} liberados).`, afterData: { allowedApps } });
      return { success: true, allowedApps };
    }),
  }),

  storeInvites: router({
    list: ownerProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db.select().from(storeInvites).where(eq(storeInvites.ownerId, ctx.user.id)).orderBy(desc(storeInvites.createdAt));
      return rows.map((invite) => ({
        id: invite.id,
        recipientType: invite.recipientType,
        label: invite.label,
        resellerId: invite.resellerId,
        allowedApps: normalizeStoreInviteApps(invite.allowedApps),
        expiresAt: invite.expiresAt,
        revokedAt: invite.revokedAt,
        lastAccessedAt: invite.lastAccessedAt,
        createdAt: invite.createdAt,
      }));
    }),
    create: ownerProcedure.input(z.object({
      recipientType: z.enum(["revenda", "cliente"]),
      label: z.string().trim().min(2).max(100),
      resellerId: z.number().positive().optional(),
      allowedApps: z.array(z.string().refine(isManagedAppId, "Aplicativo inválido.")).min(1).max(Object.keys(MANAGED_APP_CATALOG).length),
      expiresAt: z.string().datetime().optional(),
    })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
      if (input.resellerId) {
        const reseller = (await db.select({ id: users.id }).from(users).where(and(eq(users.id, input.resellerId), eq(users.resellerId, ctx.user.id))).limit(1))[0];
        if (!reseller) throw new TRPCError({ code: "NOT_FOUND", message: "Revenda não encontrada." });
      }
      const expiresAt = input.expiresAt ? new Date(input.expiresAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) throw new TRPCError({ code: "BAD_REQUEST", message: "Escolha uma validade futura para o convite." });
      const token = createStoreInviteToken();
      const allowedApps = normalizeStoreInviteApps(input.allowedApps);
      const values = { ownerId: ctx.user.id, resellerId: input.resellerId ?? null, recipientType: input.recipientType, label: input.label, tokenHash: hashStoreInviteToken(token), allowedApps: serializeStoreInviteApps(allowedApps), expiresAt };
      const created = await db.insert(storeInvites).values(values);
      await recordAudit({ ownerId: ctx.user.id, actorUserId: ctx.user.id, entityType: "store_invite", action: "created", summary: `Convite de loja criado para ${input.label} (${allowedApps.length} aplicativo(s)).`, afterData: { recipientType: input.recipientType, label: input.label, allowedApps, expiresAt } });
      return { success: true, id: Number(created[0].insertId), token, allowedApps, expiresAt };
    }),
    revoke: ownerProcedure.input(z.object({ id: z.number().positive() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
      const result = await db.update(storeInvites).set({ revokedAt: new Date() }).where(and(eq(storeInvites.id, input.id), eq(storeInvites.ownerId, ctx.user.id)));
      if (!result[0]?.affectedRows) throw new TRPCError({ code: "NOT_FOUND", message: "Convite não encontrado." });
      await recordAudit({ ownerId: ctx.user.id, actorUserId: ctx.user.id, entityType: "store_invite", entityId: input.id, action: "revoked", summary: "Convite de loja revogado." });
      return { success: true };
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

    linkedApps: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
        const device = await getDeviceById(input.id, ctx.user.id);
        if (!device) throw new TRPCError({ code: "NOT_FOUND", message: "Device não encontrado." });
        const links = await db.select({ appId: deviceAppLinks.appId }).from(deviceAppLinks).where(eq(deviceAppLinks.deviceId, device.id));
        const primaryAppId = managedAppIdForValue(device.app);
        return Array.from(new Set([primaryAppId, ...links.map((link) => link.appId)].filter(Boolean))) as string[];
      }),

    setLinkedApps: protectedProcedure
      .input(z.object({ id: z.number(), appIds: z.array(z.string().trim().min(1)).max(Object.keys(MANAGED_APP_CATALOG).length) }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
        const device = await getDeviceById(input.id, ctx.user.id);
        if (!device) throw new TRPCError({ code: "NOT_FOUND", message: "Device não encontrado." });
        const appIds = Array.from(new Set(input.appIds.map((appId) => appId.toLowerCase())));
        if (appIds.some((appId) => !isManagedAppId(appId))) throw new TRPCError({ code: "BAD_REQUEST", message: "Um dos aplicativos informados é inválido." });
        for (const appId of appIds) await requireAllowedResellerApp(db, ctx.user, appId);
        const primaryAppId = managedAppIdForValue(device.app);
        const additionalAppIds = appIds.filter((appId) => appId !== primaryAppId);
        await db.delete(deviceAppLinks).where(eq(deviceAppLinks.deviceId, device.id));
        if (additionalAppIds.length) await db.insert(deviceAppLinks).values(additionalAppIds.map((appId) => ({ deviceId: device.id, appId })));
        await recordAudit({
          ownerId: ctx.user.id,
          actorUserId: ctx.user.id,
          entityType: "device",
          entityId: device.id,
          action: "apps_linked",
          summary: `Aplicativos vinculados ao cliente ${device.nomeServer}`,
          afterData: { appIds: primaryAppId ? [primaryAppId, ...additionalAppIds] : additionalAppIds },
        });
        return { success: true, appIds: primaryAppId ? [primaryAppId, ...additionalAppIds] : additionalAppIds };
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

    lookupExpiration: protectedProcedure
      .input(z.object({
        modoSelecao: z.enum(["XTeamCode", "M3U8"]),
        urlM3u8: z.string().optional(),
        xtServer: z.string().optional(),
        xtUsername: z.string().optional(),
        xtPassword: z.string().optional(),
      }))
      .mutation(async ({ input }) => lookupPlaylistExpiration(input)),

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
        maxConcurrentConnections: z.number().int().min(1).max(10).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
        await requireAllowedResellerApp(db, ctx.user, input.app);
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
        maxConcurrentConnections: z.number().int().min(1).max(10).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, mac, ...rest } = input;
        const normalizedMac = mac === undefined ? undefined : normalizeMacForStorage(mac);
        if (mac !== undefined && !normalizedMac) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "MAC inválido. Informe os 12 caracteres do aparelho." });
        }
        const data = { ...rest, ...(normalizedMac ? { mac: normalizedMac } : {}) };
        const device = await getDeviceById(id, ctx.user.id);
        if (!device) throw new TRPCError({ code: "NOT_FOUND", message: "Device não encontrado." });
        if (input.app !== undefined && input.app !== device.app) {
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
          await requireAllowedResellerApp(db, ctx.user, input.app);
        }
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
        
        const updatedDevice = await getDeviceById(id, ctx.user.id);
        return { success: true, device: updatedDevice };
      }),

    bulkUpdate: protectedProcedure
      .input(bulkDeviceUpdateSchema)
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const selectedDevices = await db.select().from(devices).where(and(eq(devices.ownerId, ctx.user.id), inArray(devices.id, input.ids)));
        if (selectedDevices.length !== input.ids.length) throw new TRPCError({ code: "NOT_FOUND", message: "Um ou mais clientes não foram encontrados." });
        if (input.app) await requireAllowedResellerApp(db, ctx.user, input.app);

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
    previewBulkSwapDns: protectedProcedure
      .input(z.object({ oldUrl: z.string().min(1) }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { like } = await import("drizzle-orm");
        let host = input.oldUrl;
        try { const parsed = new URL(input.oldUrl.endsWith("/") ? input.oldUrl : `${input.oldUrl}/`); host = `${parsed.protocol}//${parsed.host}`; } catch { /* mantém a entrada */ }
        const affected = await db.select({ id: devices.id, mac: devices.mac, nome: devices.nomeServer, ownerId: devices.ownerId }).from(devices).where(and(eq(devices.ownerId, ctx.user.id), like(devices.urlM3u8, `${host}%`)));
        return { count: affected.length, devices: affected.slice(0, 10), owners: new Set(affected.map((item) => item.ownerId)).size };
      }),
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

  // ─── Mapa de Saúde da Operação ───────────────────────────────────────────────
  operationHealth: router({
    overview: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await requireGrantedPanelPermission(db, ctx.user, "control_center");
      const [deviceRows, checkRows] = await Promise.all([
        db.select({ id: devices.id, nomeServer: devices.nomeServer, app: devices.app, urlM3u8: devices.urlM3u8, status: devices.status, lastSeen: devices.lastSeen, dataExpiracao: devices.dataExpiracao, telefone: devices.telefone }).from(devices).where(eq(devices.ownerId, ctx.user.id)),
        db.select({ deviceId: listHealthChecks.deviceId, status: listHealthChecks.status, responseTimeMs: listHealthChecks.responseTimeMs, checkedAt: listHealthChecks.checkedAt }).from(listHealthChecks).where(and(eq(listHealthChecks.ownerId, ctx.user.id), sql`${listHealthChecks.checkedAt} >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`)).orderBy(desc(listHealthChecks.checkedAt)).limit(500),
      ]);
      return buildOperationHealthOverview(deviceRows, checkRows);
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

  // ─── Mensagens em Massa por Grupo ────────────────────────────────────────────
  bulkMessages: router({
    filters: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { apps: [], dnsHosts: [] };
      await requireGrantedPanelPermission(db, ctx.user, "chatbot");
      const managedResellerIds = await getManagedResellerIds(db, ctx.user.id);
      const allowedOwnerIds = [ctx.user.id, ...managedResellerIds];
      const [rows, resellerRows] = await Promise.all([
        db.select({ app: devices.app, urlM3u8: devices.urlM3u8 }).from(devices).where(inArray(devices.ownerId, allowedOwnerIds)),
        managedResellerIds.length ? db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, managedResellerIds)) : Promise.resolve([]),
      ]);
      const apps = Array.from(new Set(rows.map((row) => row.app?.trim()).filter((value): value is string => Boolean(value)))).sort((a, b) => a.localeCompare(b, "pt-BR"));
      const dnsHosts = Array.from(new Set(rows.map((row) => normalizeBulkMessageDnsHost(row.urlM3u8)).filter(Boolean))).sort((a, b) => a.localeCompare(b, "pt-BR"));
      const resellers = resellerRows.map((row) => ({ id: row.id, name: row.name || `Revenda #${row.id}` })).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
      return { apps, dnsHosts, resellers };
    }),
    preview: protectedProcedure.input(z.object({
      app: z.string().max(100).optional(),
      dnsHost: z.string().max(512).optional(),
      resellerId: z.number().int().positive().optional(),
      expirationRange: z.enum(["all", "expired", "7", "30"]).default("all"),
      message: z.string().trim().min(1).max(2000),
    })).query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { recipients: [], total: 0 };
      await requireGrantedPanelPermission(db, ctx.user, "chatbot");
      const managedResellerIds = await getManagedResellerIds(db, ctx.user.id);
      const allowedOwnerIds = [ctx.user.id, ...managedResellerIds];
      if (input.resellerId && !allowedOwnerIds.includes(input.resellerId)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Esta revenda não faz parte do seu grupo." });
      }
      const rows = await db.select({
        id: devices.id,
        nomeServer: devices.nomeServer,
        mac: devices.mac,
        app: devices.app,
        telefone: devices.telefone,
        urlM3u8: devices.urlM3u8,
        dataExpiracao: devices.dataExpiracao,
      }).from(devices).where(inArray(devices.ownerId, input.resellerId ? [input.resellerId] : allowedOwnerIds));
      const recipients = buildBulkMessageRecipients(rows, input, input.message);
      return { recipients, total: recipients.length };
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
        maxConcurrentConnections: devices.maxConcurrentConnections,
      }).from(devices).where(eq(devices.ownerId, ctx.user.id));
      const now = new Date();
      const overview = buildSessionOverview(rows, now, input.minutesAgo);
      const deviceIds = rows.map((item) => item.id);
      const cutoff = new Date(now.getTime() - 150_000);
      const activeRows = deviceIds.length
        ? await db.select({ deviceId: appSessions.deviceId }).from(appSessions)
          .where(and(inArray(appSessions.deviceId, deviceIds), gt(appSessions.lastSeen, cutoff)))
        : [];
      const activeSessionsByDevice = new Map<number, number>();
      activeRows.forEach((item) => activeSessionsByDevice.set(item.deviceId, (activeSessionsByDevice.get(item.deviceId) ?? 0) + 1));
      return overview.map((item) => ({ ...item, activeSessions: activeSessionsByDevice.get(item.id) ?? 0 }));
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
        db.select({ id: devices.id, ownerId: devices.ownerId, app: devices.app, status: devices.status, dataExpiracao: devices.dataExpiracao, lastSeen: devices.lastSeen }).from(devices).where(inArray(devices.ownerId, ids)),
        db.select({ ownerId: payments.ownerId, amount: payments.amount, status: payments.status, dueDate: payments.dueDate }).from(payments).where(inArray(payments.ownerId, ids)),
      ]);
      const now = new Date();
      return resellers.map((reseller) => {
        const clients = allDevices.filter((device) => device.ownerId === reseller.id);
        const finance = summarizeResellerFinance(allPayments.filter((payment) => payment.ownerId === reseller.id), now);
        const performance = summarizeResellerDevicePerformance(clients, now);
        const expiringSoon = clients.filter((device) => device.dataExpiracao && (new Date(device.dataExpiracao).getTime() - now.getTime()) / 86_400_000 >= 0 && (new Date(device.dataExpiracao).getTime() - now.getTime()) / 86_400_000 <= 7).length;
        return {
          ...reseller,
          clientCount: clients.length,
          activeClients: clients.filter((device) => device.status === "Liberado").length,
          blockedClients: clients.filter((device) => device.status === "Bloqueado" || device.status === "Expirado").length,
          remainingDevices: Math.max(0, (reseller.limiteDevices ?? 0) - clients.length),
          expiringSoon,
          ...performance,
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
        await db.delete(maintenanceTasks).where(eq(maintenanceTasks.id, input.id));
        return { success: true };
      }),
      clearFinished: protectedProcedure.mutation(async ({ ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.delete(maintenanceTasks).where(and(eq(maintenanceTasks.ownerId, ctx.user.id), inArray(maintenanceTasks.status, ["resolved", "cancelled"])));
        return { success: true };
      }),
      clearAll: protectedProcedure.mutation(async ({ ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.delete(maintenanceTasks).where(eq(maintenanceTasks.ownerId, ctx.user.id));
        return { success: true };
      }),
    }),
  }),

  // ─── Atualizações do APK ─────────────────────────────────────────────────────
  apkUpdates: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { versions: {}, devices: [] };
      const [deviceRows, settings] = await Promise.all([
        db.select({ id: devices.id, nomeServer: devices.nomeServer, app: devices.app, appVersion: devices.appVersion, telefone: devices.telefone, lastSeen: devices.lastSeen }).from(devices).where(eq(devices.ownerId, ctx.user.id)),
        db.select({ key: appSettings.key, value: appSettings.value }).from(appSettings),
      ]);
      const byKey = Object.fromEntries(settings.map((setting) => [setting.key, setting.value]));
      const versions = buildConfiguredAppVersions(byKey);
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

  remoteCommands: router({
    dnsTargets: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const [dnsRows, ownerDevices] = await Promise.all([
        db.select({ id: dnsEntries.id, titulo: dnsEntries.titulo, grupo: dnsEntries.grupo, host: dnsEntries.host })
          .from(dnsEntries).where(and(eq(dnsEntries.ownerId, ctx.user.id), eq(dnsEntries.ativo, true))),
        db.select({ id: devices.id, urlM3u8: devices.urlM3u8 }).from(devices).where(eq(devices.ownerId, ctx.user.id)),
      ]);
      const deviceIds = ownerDevices.map(device => device.id);
      const extraLists = deviceIds.length
        ? await db.select({ deviceId: deviceUrls.deviceId, urlM3u8: deviceUrls.urlM3u8, xtServer: deviceUrls.xtServer })
          .from(deviceUrls).where(inArray(deviceUrls.deviceId, deviceIds))
        : [];
      return buildDnsTargets(ownerDevices, extraLists, dnsRows);
    }),
    allTargets: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { deviceCount: 0 };
      const ownerDevices = await db.select({ id: devices.id }).from(devices).where(eq(devices.ownerId, ctx.user.id));
      return { deviceCount: ownerDevices.length };
    }),
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select({
        id: remoteDeviceCommands.id,
        deviceId: remoteDeviceCommands.deviceId,
        command: remoteDeviceCommands.command,
        payload: remoteDeviceCommands.payload,
        status: remoteDeviceCommands.status,
        expiresAt: remoteDeviceCommands.expiresAt,
        deliveredAt: remoteDeviceCommands.deliveredAt,
        executedAt: remoteDeviceCommands.executedAt,
        resultMessage: remoteDeviceCommands.resultMessage,
        createdAt: remoteDeviceCommands.createdAt,
        deviceName: devices.nomeServer,
        deviceMac: devices.mac,
        deviceApp: devices.app,
      }).from(remoteDeviceCommands).leftJoin(devices, eq(remoteDeviceCommands.deviceId, devices.id))
        .where(eq(remoteDeviceCommands.ownerId, ctx.user.id)).orderBy(desc(remoteDeviceCommands.createdAt)).limit(100);
    }),
    send: protectedProcedure.input(z.object({
      deviceId: z.number().positive(),
      command: z.enum(REMOTE_COMMAND_TYPES),
      payload: z.object({
        listIndex: z.number().int().min(1).max(3).optional(),
        dns: z.string().trim().max(500).optional(),
        message: z.string().trim().max(500).optional(),
      }).default({}),
      expiresInMinutes: z.number().int().min(1).max(60).default(15),
    })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const device = await getDeviceById(input.deviceId, ctx.user.id);
      if (!device) throw new TRPCError({ code: "NOT_FOUND", message: "Cliente não encontrado." });
      if (input.command === "switch_playlist" && !input.payload.listIndex) throw new TRPCError({ code: "BAD_REQUEST", message: "Escolha a Lista 1, 2 ou 3." });
      if (input.command === "update_dns" && !input.payload.dns) throw new TRPCError({ code: "BAD_REQUEST", message: "Informe a nova DNS." });
      if (input.command === "show_message" && !input.payload.message) throw new TRPCError({ code: "BAD_REQUEST", message: "Escreva a mensagem que aparecerá no aparelho." });

      const expiresAt = commandExpiresAt(input.expiresInMinutes);
      const inserted = await db.insert(remoteDeviceCommands).values({
        ownerId: ctx.user.id,
        deviceId: input.deviceId,
        command: input.command,
        payload: JSON.stringify(input.payload),
        expiresAt,
      });
      const commandId = Number((inserted as any)[0]?.insertId ?? (inserted as any).insertId);
      await recordAudit({
        ownerId: ctx.user.id,
        actorUserId: ctx.user.id,
        entityType: "remote_command",
        entityId: commandId,
        action: "queued",
        summary: `${REMOTE_COMMAND_LABELS[input.command as RemoteCommandType]} enviado para ${device.nomeServer}.`,
        afterData: { deviceId: input.deviceId, command: input.command, payload: input.payload, expiresAt },
      });
      return { id: commandId, expiresAt };
    }),
    sendToDns: protectedProcedure.input(z.object({
      dnsHost: z.string().trim().min(1).max(255),
      command: z.enum(REMOTE_COMMAND_TYPES),
      payload: z.object({
        listIndex: z.number().int().min(1).max(3).optional(),
        dns: z.string().trim().max(500).optional(),
        message: z.string().trim().max(500).optional(),
      }).default({}),
      expiresInMinutes: z.number().int().min(1).max(60).default(15),
    })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (input.command === "switch_playlist" && !input.payload.listIndex) throw new TRPCError({ code: "BAD_REQUEST", message: "Escolha a Lista 1, 2 ou 3." });
      if (input.command === "update_dns" && !input.payload.dns) throw new TRPCError({ code: "BAD_REQUEST", message: "Informe a nova DNS." });
      if (input.command === "show_message" && !input.payload.message) throw new TRPCError({ code: "BAD_REQUEST", message: "Escreva a mensagem que aparecerá no aparelho." });

      const [configuredDns, ownerDevices] = await Promise.all([
        db.select({ titulo: dnsEntries.titulo, host: dnsEntries.host }).from(dnsEntries).where(and(eq(dnsEntries.ownerId, ctx.user.id), eq(dnsEntries.ativo, true))),
        db.select({ id: devices.id, urlM3u8: devices.urlM3u8 }).from(devices).where(eq(devices.ownerId, ctx.user.id)),
      ]);
      const deviceIds = ownerDevices.map(device => device.id);
      const extraLists = deviceIds.length
        ? await db.select({ deviceId: deviceUrls.deviceId, urlM3u8: deviceUrls.urlM3u8, xtServer: deviceUrls.xtServer })
          .from(deviceUrls).where(inArray(deviceUrls.deviceId, deviceIds))
        : [];
      const dnsHost = normalizeDnsHost(input.dnsHost);
      const dnsTarget = buildDnsTargets(ownerDevices, extraLists, configuredDns).find(target => target.host === dnsHost);
      if (!dnsTarget) throw new TRPCError({ code: "NOT_FOUND", message: "DNS não encontrada nas listas cadastradas." });
      const targetDeviceIds = collectDnsTargetDeviceIds(ownerDevices, extraLists, dnsHost);
      if (!targetDeviceIds.length) throw new TRPCError({ code: "NOT_FOUND", message: "Nenhum cliente usa esta DNS." });

      const expiresAt = commandExpiresAt(input.expiresInMinutes);
      await db.insert(remoteDeviceCommands).values(targetDeviceIds.map(deviceId => ({
        ownerId: ctx.user.id,
        deviceId,
        command: input.command,
        payload: JSON.stringify(input.payload),
        expiresAt,
      })));
      await recordAudit({
        ownerId: ctx.user.id,
        actorUserId: ctx.user.id,
        entityType: "remote_command",
        entityId: 0,
        action: "queued_by_dns",
        summary: `${REMOTE_COMMAND_LABELS[input.command as RemoteCommandType]} enviado para ${targetDeviceIds.length} cliente(s) da DNS ${dnsTarget.titulo}.`,
        afterData: { host: dnsHost, deviceIds: targetDeviceIds, command: input.command, payload: input.payload, expiresAt },
      });
      return { count: targetDeviceIds.length, expiresAt, dnsTitle: dnsTarget.titulo };
    }),
    sendToAll: protectedProcedure.input(z.object({
      command: z.enum(REMOTE_COMMAND_TYPES),
      payload: z.object({
        listIndex: z.number().int().min(1).max(3).optional(),
        dns: z.string().trim().max(500).optional(),
        message: z.string().trim().max(500).optional(),
      }).default({}),
      expiresInMinutes: z.number().int().min(1).max(60).default(15),
    })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (input.command === "switch_playlist" && !input.payload.listIndex) throw new TRPCError({ code: "BAD_REQUEST", message: "Escolha a Lista 1, 2 ou 3." });
      if (input.command === "update_dns" && !input.payload.dns) throw new TRPCError({ code: "BAD_REQUEST", message: "Informe a nova DNS." });
      if (input.command === "show_message" && !input.payload.message) throw new TRPCError({ code: "BAD_REQUEST", message: "Escreva a mensagem que aparecerá no aparelho." });
      const ownerDevices = await db.select({ id: devices.id }).from(devices).where(eq(devices.ownerId, ctx.user.id));
      if (!ownerDevices.length) throw new TRPCError({ code: "NOT_FOUND", message: "Não há MACs cadastrados para receber o comando." });
      const expiresAt = commandExpiresAt(input.expiresInMinutes);
      await db.insert(remoteDeviceCommands).values(ownerDevices.map(device => ({ ownerId: ctx.user.id, deviceId: device.id, command: input.command, payload: JSON.stringify(input.payload), expiresAt })));
      await recordAudit({ ownerId: ctx.user.id, actorUserId: ctx.user.id, entityType: "remote_command", entityId: 0, action: "queued_for_all", summary: `${REMOTE_COMMAND_LABELS[input.command as RemoteCommandType]} enviado para todos os ${ownerDevices.length} MACs cadastrados.`, afterData: { deviceIds: ownerDevices.map(device => device.id), command: input.command, payload: input.payload, expiresAt } });
      return { count: ownerDevices.length, expiresAt };
    }),
    cancel: protectedProcedure.input(z.object({ id: z.number().positive() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(remoteDeviceCommands).set({ status: "cancelled", resultMessage: "Cancelado pelo painel." })
        .where(and(eq(remoteDeviceCommands.id, input.id), eq(remoteDeviceCommands.ownerId, ctx.user.id), inArray(remoteDeviceCommands.status, ["queued", "delivered"])));
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number().positive() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(remoteDeviceCommands).where(and(
        eq(remoteDeviceCommands.id, input.id),
        eq(remoteDeviceCommands.ownerId, ctx.user.id),
        inArray(remoteDeviceCommands.status, ["executed", "failed", "expired", "cancelled"]),
      ));
      return { success: true };
    }),
    clearHistory: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(remoteDeviceCommands).where(and(
        eq(remoteDeviceCommands.ownerId, ctx.user.id),
        inArray(remoteDeviceCommands.status, ["executed", "failed", "expired", "cancelled"]),
      ));
      return { success: true };
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
      const recentChecks = new Map<string, any[]>();
      checks.forEach((check: any) => {
        const key = `${check.deviceId}:${check.deviceUrlId ?? "principal"}`;
        if (!latestChecks.has(key)) latestChecks.set(key, check);
        const history = recentChecks.get(key) ?? [];
        if (history.length < 2) history.push(check);
        recentChecks.set(key, history);
      });
      return targets.map((target) => {
        const key = `${target.deviceId}:${target.deviceUrlId ?? "principal"}`;
        const history = recentChecks.get(key) ?? [];
        return {
          ...target,
          lastCheck: latestChecks.get(key) ?? null,
          failureConfirmed: hasConfirmedListFailure(history),
        };
      });
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

    instabilityReport: ownerProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const checks = await db.select().from(listHealthChecks).where(eq(listHealthChecks.ownerId, ctx.user.id)).orderBy(desc(listHealthChecks.checkedAt)).limit(500);
      const grouped = new Map<string, { url: string; checks: number; errors: number; totalResponseMs: number; responseSamples: number; lastCheckedAt: Date | null }>();
      for (const check of checks) {
        const current = grouped.get(check.urlSnapshot) ?? { url: check.urlSnapshot, checks: 0, errors: 0, totalResponseMs: 0, responseSamples: 0, lastCheckedAt: null };
        current.checks += 1;
        if (check.status === "error") current.errors += 1;
        if (check.responseTimeMs !== null) { current.totalResponseMs += check.responseTimeMs; current.responseSamples += 1; }
        if (!current.lastCheckedAt || check.checkedAt > current.lastCheckedAt) current.lastCheckedAt = check.checkedAt;
        grouped.set(check.urlSnapshot, current);
      }
      return Array.from(grouped.values()).map((item) => ({ ...item, errorRate: item.checks ? Math.round((item.errors / item.checks) * 100) : 0, avgResponseMs: item.responseSamples ? Math.round(item.totalResponseMs / item.responseSamples) : null })).sort((a, b) => b.errorRate - a.errorRate || b.errors - a.errors);
    }),

    serverPilot: ownerProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const [targets, checks] = await Promise.all([
        getListMonitorTargets(db, ctx.user.id),
        db.select().from(listHealthChecks).where(eq(listHealthChecks.ownerId, ctx.user.id)).orderBy(desc(listHealthChecks.checkedAt)).limit(800),
      ]);
      return buildServerPilotOverview(targets, checks);
    }),

    testMacs: ownerProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { checked: 0, online: 0, offline: 0, items: [] };
      const rows = await db.select({ id: devices.id, nomeServer: devices.nomeServer, mac: devices.mac, status: devices.status, lastSeen: devices.lastSeen }).from(devices).where(eq(devices.ownerId, ctx.user.id)).orderBy(desc(devices.lastSeen)).limit(200);
      const now = Date.now();
      const items = rows.map((row) => ({ ...row, online: row.status === "Liberado" && !!row.lastSeen && now - new Date(row.lastSeen).getTime() <= 15 * 60_000 }));
      return { checked: items.length, online: items.filter((item) => item.online).length, offline: items.filter((item) => !item.online).length, items };
    }),
  }),

  listFailover: router({
    overview: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { setting: null, events: [] };
      const setting = (await db.select().from(listFailoverSettings).where(eq(listFailoverSettings.ownerId, ctx.user.id)).limit(1))[0] ?? null;
      const events = await db.select().from(listFailoverEvents).where(eq(listFailoverEvents.ownerId, ctx.user.id)).orderBy(desc(listFailoverEvents.createdAt)).limit(50);
      return { setting, events };
    }),
    runNow: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const setting = (await db.select().from(listFailoverSettings).where(eq(listFailoverSettings.ownerId, ctx.user.id)).limit(1))[0];
      const result = await runListFailoverSweep(db, ctx.user.id);
      if (setting) await recordFailoverRun(db, setting.id, result);
      return result;
    }),
    enable: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const current = (await db.select().from(listFailoverSettings).where(eq(listFailoverSettings.ownerId, ctx.user.id)).limit(1))[0];
      if (current?.scheduleCronTaskUid) {
        await db.update(listFailoverSettings).set({ enabled: true, intervalMinutes: 10, lastError: null }).where(eq(listFailoverSettings.id, current.id));
        return { enabled: true, existingSchedule: true };
      }
      const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
      if (!sessionToken) throw new TRPCError({ code: "UNAUTHORIZED", message: "Sua sessão expirou. Entre novamente para ativar o monitoramento." });
      const job = await createHeartbeatJob({ name: `monitor-listas-${ctx.user.id}`, cron: LIST_FAILOVER_CRON, path: "/api/scheduled/list-failover", description: "Monitoramento e troca automática de listas a cada 10 minutos" }, sessionToken);
      if (current) await db.update(listFailoverSettings).set({ enabled: true, intervalMinutes: 10, scheduleCronTaskUid: job.taskUid, lastError: null }).where(eq(listFailoverSettings.id, current.id));
      else await db.insert(listFailoverSettings).values({ ownerId: ctx.user.id, enabled: true, intervalMinutes: 10, scheduleCronTaskUid: job.taskUid });
      return { enabled: true, taskUid: job.taskUid };
    }),
    disable: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const setting = (await db.select().from(listFailoverSettings).where(eq(listFailoverSettings.ownerId, ctx.user.id)).limit(1))[0];
      if (!setting) return { enabled: false };
      if (setting.scheduleCronTaskUid) { try { await deleteHeartbeatJob(setting.scheduleCronTaskUid, parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? ""); } catch { /* manter registro local desativado */ } }
      await db.update(listFailoverSettings).set({ enabled: false, scheduleCronTaskUid: null }).where(eq(listFailoverSettings.id, setting.id));
      return { enabled: false };
    }),
  }),

  // ─── Credenciais de aplicativo (login/senha) ──────────────────────────────
  appCredentials: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select({
        id: appCredentials.id,
        username: appCredentials.username,
        appId: appCredentials.appId,
        dnsHost: appCredentials.dnsHost,
        active: appCredentials.active,
        firstAuthenticatedAt: appCredentials.firstAuthenticatedAt,
        lastAuthenticatedAt: appCredentials.lastAuthenticatedAt,
        createdAt: appCredentials.createdAt,
        deviceId: devices.id,
        nomeServer: devices.nomeServer,
        mac: devices.mac,
        status: devices.status,
        dataExpiracao: devices.dataExpiracao,
        telefone: devices.telefone,
        modoSelecao: devices.modoSelecao,
        urlM3u8: devices.urlM3u8,
      }).from(appCredentials)
        .innerJoin(devices, eq(appCredentials.deviceId, devices.id))
        .where(eq(appCredentials.ownerId, ctx.user.id))
        .orderBy(desc(appCredentials.createdAt));
    }),

    create: protectedProcedure.input(z.object({
      xtServer: z.string().trim().min(3).max(1024),
      xtUsername: z.string().trim().min(1).max(128),
      xtPassword: z.string().min(1).max(128),
      appId: z.string().trim().toLowerCase().refine(isManagedAppId, "Aplicativo inválido."),
      nomeServer: z.string().trim().min(1).max(255),
      tipo: z.enum(["Usuario", "Revenda", "UltraMaster", "Master"]).optional().default("Usuario"),
      urlEpg: z.string().trim().optional(),
      valor: z.string().trim().optional(),
      dataExpiracao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      status: z.enum(["Liberado", "Bloqueado", "Expirado"]).optional().default("Liberado"),
      telefone: z.string().trim().optional(),
      extraLists: z.array(z.object({
        nome: z.string().trim().min(1).max(128),
        modoSelecao: z.enum(["XTeamCode", "M3U8"]),
        urlM3u8: z.string().trim().optional(),
        xtServer: z.string().trim().optional(),
        xtUsername: z.string().trim().optional(),
        xtPassword: z.string().trim().optional(),
      })).max(4).optional().default([]),
    })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
      await requireAllowedResellerApp(db, ctx.user, input.appId);
      const username = input.xtUsername.trim();
      const alreadyExists = await db.select({ id: appCredentials.id }).from(appCredentials).where(eq(appCredentials.username, username)).limit(1);
      if (alreadyExists.length) throw new TRPCError({ code: "CONFLICT", message: "Este login já está cadastrado. Escolha outro." });

      const planInfo = await getUserPlanInfo(ctx.user.id);
      const stats = await getDeviceStats(ctx.user.id);
      if (!planInfo) throw new TRPCError({ code: "FORBIDDEN", message: "Plano da revenda não encontrado." });
      let limite: number;
      try { limite = getEnforcedDeviceLimit(planInfo.limiteDevices); }
      catch { throw new TRPCError({ code: "FORBIDDEN", message: "Limite de dispositivos inválido. Entre em contato com o administrador." }); }
      if (stats.total >= limite) throw new TRPCError({ code: "FORBIDDEN", message: `Limite de ${limite} devices atingido.` });

      const appDef = MANAGED_APP_CATALOG[input.appId as keyof typeof MANAGED_APP_CATALOG];
      const device = await createDevice({
        ownerId: ctx.user.id,
        mac: PENDING_LOGIN_MAC,
        accessMode: "LOGIN_PASSWORD",
        nomeServer: input.nomeServer,
        tipo: input.tipo,
        modoSelecao: "XTeamCode",
        app: appDef.deviceAliases[0],
        urlM3u8: buildXteamPlaylistUrl(input.xtServer.trim(), username, input.xtPassword),
        urlEpg: input.urlEpg || undefined,
        valor: input.valor || undefined,
        dataExpiracao: input.dataExpiracao,
        status: input.status,
        telefone: input.telefone || undefined,
      });

      try {
        await db.insert(appCredentials).values({
          ownerId: ctx.user.id,
          deviceId: device.id,
          appId: input.appId,
          dnsHost: input.xtServer.trim(),
          username,
          passwordHash: await hashPassword(input.xtPassword),
          active: input.status === "Liberado",
        });
        for (let index = 0; index < input.extraLists.length; index += 1) {
          const list = input.extraLists[index];
          await db.insert(deviceUrls).values({
            deviceId: device.id,
            nome: list.nome,
            modoSelecao: list.modoSelecao,
            urlM3u8: list.urlM3u8 || null,
            xtServer: list.xtServer || null,
            xtUsername: list.xtUsername || null,
            xtPassword: list.xtPassword || null,
            ordem: index + 1,
            ativo: true,
          });
        }
      } catch (error) {
        await deleteDevice(device.id, ctx.user.id);
        throw error;
      }

      await recordAudit({
        ownerId: ctx.user.id,
        actorUserId: ctx.user.id,
        entityType: "app_credential",
        entityId: device.id,
        action: "created",
        summary: `Credencial ${username} criada para ${input.nomeServer}`,
        afterData: { username, appId: input.appId, deviceId: device.id, status: input.status },
      });
      return { success: true, deviceId: device.id, username };
    }),

    update: protectedProcedure.input(z.object({
      id: z.number().int().positive(),
      active: z.boolean().optional(),
      status: z.enum(["Liberado", "Bloqueado", "Expirado"]).optional(),
      dataExpiracao: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")]).optional(),
    }).strict()).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
      const credential = (await db.select().from(appCredentials).where(and(eq(appCredentials.id, input.id), eq(appCredentials.ownerId, ctx.user.id))).limit(1))[0];
      if (!credential) throw new TRPCError({ code: "NOT_FOUND", message: "Credencial não encontrada." });

      const credentialUpdate: Record<string, unknown> = {};
      if (input.active !== undefined) credentialUpdate.active = input.active;
      if (Object.keys(credentialUpdate).length) await db.update(appCredentials).set(credentialUpdate).where(eq(appCredentials.id, credential.id));

      const deviceUpdate: Record<string, unknown> = {};
      if (input.status !== undefined) deviceUpdate.status = input.status;
      if (input.dataExpiracao !== undefined) deviceUpdate.dataExpiracao = input.dataExpiracao ? dateOnlyForDatabase(input.dataExpiracao) : null;
      if (Object.keys(deviceUpdate).length) await db.update(devices).set(deviceUpdate).where(and(eq(devices.id, credential.deviceId), eq(devices.ownerId, ctx.user.id)));
      return { success: true };
    }),

    remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
      const credential = (await db.select().from(appCredentials).where(and(eq(appCredentials.id, input.id), eq(appCredentials.ownerId, ctx.user.id))).limit(1))[0];
      if (!credential) throw new TRPCError({ code: "NOT_FOUND", message: "Credencial não encontrada." });
      await db.delete(appCredentials).where(eq(appCredentials.id, credential.id));
      await db.update(devices).set({ accessMode: "MAC" }).where(and(eq(devices.id, credential.deviceId), eq(devices.ownerId, ctx.user.id)));
      await recordAudit({ ownerId: ctx.user.id, actorUserId: ctx.user.id, entityType: "app_credential", entityId: credential.deviceId, action: "deleted", summary: `Credencial ${credential.username} removida; o cadastro do cliente foi preservado.` });
      return { success: true };
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

    copyTargets: protectedProcedure
      .input(z.object({ deviceId: z.number() }))
      .query(async ({ ctx, input }) => {
        const device = await getDeviceById(input.deviceId, ctx.user.id);
        if (!device) throw new TRPCError({ code: "NOT_FOUND", message: "Device não encontrado." });
        const db = await getDb();
        if (!db) return [];
        return db.select({ id: devices.id, nomeServer: devices.nomeServer, mac: devices.mac }).from(devices).where(and(eq(devices.ownerId, ctx.user.id), sql`${devices.id} <> ${input.deviceId}`)).orderBy(desc(devices.createdAt)).limit(100);
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

    duplicateToDevices: protectedProcedure
      .input(z.object({ sourceId: z.number(), sourceDeviceId: z.number(), targetDeviceIds: z.array(z.number()).min(1).max(100) }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const sourceDevice = await getDeviceById(input.sourceDeviceId, ctx.user.id);
        if (!sourceDevice) throw new TRPCError({ code: "NOT_FOUND", message: "Cliente de origem não encontrado." });
        const source = (await db.select().from(deviceUrls).where(and(eq(deviceUrls.id, input.sourceId), eq(deviceUrls.deviceId, input.sourceDeviceId))).limit(1))[0];
        if (!source) throw new TRPCError({ code: "NOT_FOUND", message: "Lista de origem não encontrada." });
        const targets = await db.select({ id: devices.id }).from(devices).where(and(eq(devices.ownerId, ctx.user.id), inArray(devices.id, input.targetDeviceIds.filter((id) => id !== input.sourceDeviceId))));
        for (const target of targets) {
          const countResult = await db.select({ count: sql<number>`count(*)` }).from(deviceUrls).where(eq(deviceUrls.deviceId, target.id));
          await db.insert(deviceUrls).values({ deviceId: target.id, nome: source.nome, modoSelecao: source.modoSelecao, urlM3u8: source.urlM3u8, xtServer: source.xtServer, xtUsername: source.xtUsername, xtPassword: source.xtPassword, ordem: Number(countResult[0]?.count ?? 0), ativo: source.ativo });
        }
        await recordAudit({ ownerId: ctx.user.id, actorUserId: ctx.user.id, entityType: "list", entityId: input.sourceId, action: "duplicated", summary: `Lista ${source.nome} copiada para ${targets.length} cliente(s)`, afterData: { targetDeviceIds: targets.map((target) => target.id) } });
        return { copied: targets.length };
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
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });
        // Verificar limite de revendas do usuário atual
        const planInfo = await getUserPlanInfo(ctx.user.id);
        const stats = await getRevendaStats(ctx.user.id);
        const limiteRevendas = planInfo?.limiteRevendas ?? 0;
        if (limiteRevendas > 0 && stats.totalRevendas >= limiteRevendas) {
          throw new TRPCError({ code: "FORBIDDEN", message: `Limite de ${limiteRevendas} revendas atingido.` });
        }
        const { hashPassword, comparePassword } = await import("./auth");
        const { password, ...revendaData } = input;
        const passwordHash = await hashPassword(password);
        let result: { id: number };
        try {
          result = await createRevenda({ resellerId: ctx.user.id, ...revendaData, passwordHash });
        } catch (error) {
          if (error instanceof Error && error.message.includes("Já existe uma conta")) {
            throw new TRPCError({ code: "CONFLICT", message: error.message });
          }
          throw error;
        }
        const created = (await db.select({ passwordHash: users.passwordHash }).from(users)
          .where(and(eq(users.id, result.id), eq(users.resellerId, ctx.user.id))).limit(1))[0];
        if (!created?.passwordHash || !(await comparePassword(password, created.passwordHash))) {
          // Nunca confirma a criação enquanto a mesma senha não puder autenticar.
          await db.update(users).set({ passwordHash }).where(and(eq(users.id, result.id), eq(users.resellerId, ctx.user.id)));
          const repaired = (await db.select({ passwordHash: users.passwordHash }).from(users)
            .where(and(eq(users.id, result.id), eq(users.resellerId, ctx.user.id))).limit(1))[0];
          if (!repaired?.passwordHash || !(await comparePassword(password, repaired.passwordHash))) {
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível confirmar a senha da nova revenda. Tente novamente." });
          }
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
        return { success: true, id: result.id, loginReady: true };
      }),

    update: protectedProcedure
      .input(revendaUpdateInputSchema)
      .mutation(async ({ ctx, input }) => {
        const { id, password, ...data } = input;
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });
        const current = (await db.select().from(users).where(and(eq(users.id, id), eq(users.resellerId, ctx.user.id))).limit(1))[0];
        if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Revenda não encontrada." });
        const { hashPassword, comparePassword } = await import("./auth");
        const passwordHash = password ? await hashPassword(password) : undefined;
        // Redefinir senha é uma ação explícita de liberação de acesso. Mantemos o
        // bloqueio apenas se o proprietário também enviar isActive=false.
        const updateData = {
          ...data,
          passwordHash,
          ...(password && data.isActive !== false ? { isActive: true } : {}),
        };
        await updateRevenda(id, ctx.user.id, updateData);
        if (password && passwordHash) {
          const persisted = (await db.select({ passwordHash: users.passwordHash }).from(users)
            .where(and(eq(users.id, id), eq(users.resellerId, ctx.user.id))).limit(1))[0];
          if (!persisted?.passwordHash || !(await comparePassword(password, persisted.passwordHash))) {
            await db.update(users).set({ passwordHash }).where(and(eq(users.id, id), eq(users.resellerId, ctx.user.id)));
            const repaired = (await db.select({ passwordHash: users.passwordHash }).from(users)
              .where(and(eq(users.id, id), eq(users.resellerId, ctx.user.id))).limit(1))[0];
            if (!repaired?.passwordHash || !(await comparePassword(password, repaired.passwordHash))) {
              throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível confirmar a nova senha. Tente novamente." });
            }
          }
        }
        await recordAudit({
          ownerId: ctx.user.id,
          actorUserId: ctx.user.id,
          entityType: "reseller",
          entityId: id,
          action: password ? "password_changed" : "updated",
          summary: password ? `Senha da revenda ${current.name ?? current.email ?? id} alterada` : `Revenda ${current.name ?? current.email ?? id} atualizada`,
          beforeData: { name: current.name, email: current.email, plano: current.plano, limiteDevices: current.limiteDevices, limiteRevendas: current.limiteRevendas },
          afterData: { ...updateData, password: password ? "[oculto]" : undefined },
        });
        return { success: true, loginReady: Boolean(password) };
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

    getAll: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return {};
      const rows = await db.select().from(appSettings);
      const allowedApps = await getAllowedAppsForUser(db, ctx.user);
      const result: Record<string, string> = {};
      for (const row of rows) {
        const appId = managedAppIdForSettingsKey(row.key);
        if (!isAppSettingVisibleToReseller(allowedApps, appId)) continue;
        result[row.key] = row.value ?? "";
      }
      return result;
    }),

    update: protectedProcedure
      .input(z.object({
        key: z.string().min(1),
        value: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await requireGrantedPanelPermission(db, ctx.user, "app_settings");
        await requireAllowedResellerSettings(db, ctx.user, [input.key]);
        await db.insert(appSettings)
          .values({ key: input.key, value: input.value })
          .onDuplicateKeyUpdate({ set: { value: input.value } });
        return { success: true };
      }),

    updateMany: protectedProcedure
      .input(z.record(z.string(), z.string()))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await requireGrantedPanelPermission(db, ctx.user, "app_settings");
        await requireAllowedResellerSettings(db, ctx.user, Object.keys(input));
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
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await requireGrantedPanelPermission(db, ctx.user, "app_settings");
        await requireAllowedResellerSettings(db, ctx.user, [input.field]);
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
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
        await requireGrantedPanelPermission(db, ctx.user, "app_settings");
        await requireAllowedResellerSettings(db, ctx.user, [input.field]);
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
      await requireGrantedPanelPermission(db, ctx.user, "app_settings");
      await requireAllowedResellerApp(db, ctx.user, "maximus");
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
        qualidade: z.string().optional(),
        legendas: z.string().optional(),
        audioTrack: z.string().optional(),
        mostAssistidos: z.boolean().optional(),
        recentementeVisto: z.boolean().optional(),
        canalAtual: z.string().optional(),
        apkUpdateUrl: z.string().url().or(z.literal("")).optional(),
        apkVersion: z.string().max(80).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        await requireGrantedPanelPermission(db, ctx.user, "app_settings");
        await requireAllowedResellerApp(db, ctx.user, "maximus");
        
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
        grupo: z.string().trim().min(1).max(128).optional().default("Padrão"),
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
          grupo: input.grupo,
          host,
          ativo: true,
        });
        return { success: true };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        titulo: z.string().min(1).optional(),
        grupo: z.string().trim().min(1).max(128).optional(),
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
    applyGroupToDevices: protectedProcedure
      .input(z.object({ grupo: z.string().min(1), targetDnsId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const entries = await db.select().from(dnsEntries).where(and(eq(dnsEntries.ownerId, ctx.user.id), eq(dnsEntries.grupo, input.grupo)));
        const target = entries.find((entry) => entry.id === input.targetDnsId);
        if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "DNS de destino não encontrada no grupo." });
        const sourceHosts = entries.filter((entry) => entry.id !== target.id).map((entry) => entry.host.replace(/\/+$/, ""));
        const rows = await db.select({ id: devices.id, urlM3u8: devices.urlM3u8 }).from(devices).where(eq(devices.ownerId, ctx.user.id));
        let updated = 0;
        for (const row of rows) {
          if (!row.urlM3u8) continue;
          const source = sourceHosts.find((host) => row.urlM3u8?.startsWith(host));
          if (!source) continue;
          await db.update(devices).set({ urlM3u8: `${target.host.replace(/\/+$/, "")}${row.urlM3u8.slice(source.length)}` }).where(eq(devices.id, row.id));
          updated += 1;
        }
        await recordAudit({ ownerId: ctx.user.id, actorUserId: ctx.user.id, entityType: "dns_group", entityId: target.id, action: "applied", summary: `DNS ${target.titulo} aplicada a ${updated} cliente(s) do grupo ${input.grupo}` });
        return { updated };
      }),
    groupHealth: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const { listHealthChecks } = await import("../drizzle/schema");
      const entries = await db.select().from(dnsEntries).where(eq(dnsEntries.ownerId, ctx.user.id));
      const checks = await db.select().from(listHealthChecks).where(eq(listHealthChecks.ownerId, ctx.user.id));
      const groups = new Map<string, { group: string; total: number; errors: number; latestAt: Date | null }>();
      for (const entry of entries) {
        const key = entry.grupo || "Padrão";
        const related = checks.filter((check: any) => check.urlSnapshot.startsWith(entry.host.replace(/\/+$/, "")));
        const current = groups.get(key) || { group: key, total: 0, errors: 0, latestAt: null };
        current.total += related.length;
        current.errors += related.filter((check: any) => check.status === "error").length;
        for (const check of related) if (!current.latestAt || new Date(check.checkedAt) > current.latestAt) current.latestAt = new Date(check.checkedAt);
        groups.set(key, current);
      }
      return Array.from(groups.values()).map((item) => ({ ...item, health: item.total === 0 ? "unknown" : item.errors / item.total >= 0.5 ? "critical" : item.errors > 0 ? "attention" : "healthy" }));
    }),
    listServerBlocks: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const { serverMaintenanceBlocks } = await import("../drizzle/schema");
      return db.select().from(serverMaintenanceBlocks).where(eq(serverMaintenanceBlocks.ownerId, ctx.user.id));
    }),
    setServerBlock: protectedProcedure
      .input(z.object({ host: z.string().min(3), reason: z.string().max(500).optional(), active: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { serverMaintenanceBlocks } = await import("../drizzle/schema");
        const host = input.host.replace(/\/+$/, "");
        const existing = (await db.select().from(serverMaintenanceBlocks).where(and(eq(serverMaintenanceBlocks.ownerId, ctx.user.id), eq(serverMaintenanceBlocks.host, host))).limit(1))[0];
        if (existing) await db.update(serverMaintenanceBlocks).set({ active: input.active, reason: input.reason ?? existing.reason }).where(eq(serverMaintenanceBlocks.id, existing.id));
        else await db.insert(serverMaintenanceBlocks).values({ ownerId: ctx.user.id, host, reason: input.reason, active: input.active });
        return { success: true };
      }),
    createMaintenanceNotice: ownerProcedure
      .input(z.object({ grupo: z.string().min(1), titulo: z.string().min(3).max(255), conteudo: z.string().min(3).max(3000), startsAt: z.date().optional(), endsAt: z.date().optional() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const entries = await db.select({ host: dnsEntries.host }).from(dnsEntries).where(and(eq(dnsEntries.ownerId, ctx.user.id), eq(dnsEntries.grupo, input.grupo)));
        const hosts = entries.map((entry) => entry.host.replace(/\/+$/, ""));
        if (!hosts.length) throw new TRPCError({ code: "NOT_FOUND", message: "Nenhuma DNS encontrada neste grupo." });
        const devicesInGroup = await db.select({ ownerId: devices.ownerId, urlM3u8: devices.urlM3u8 }).from(devices).where(eq(devices.ownerId, ctx.user.id));
        const targets = Array.from(new Set(devicesInGroup.filter((device) => !!device.urlM3u8 && hosts.some((host) => device.urlM3u8!.startsWith(host))).map((device) => device.ownerId)));
        if (!targets.length) targets.push(ctx.user.id);
        await db.insert(notices).values(targets.map((targetOwnerId) => ({ autorId: ctx.user.id, targetOwnerId, titulo: input.titulo, conteudo: input.conteudo, ativo: true, startsAt: input.startsAt, endsAt: input.endsAt })));
        await recordAudit({ ownerId: ctx.user.id, actorUserId: ctx.user.id, entityType: "maintenance_notice", entityId: 0, action: "created", summary: `Aviso de manutenção enviado ao grupo ${input.grupo} para ${targets.length} painel(is)` });
        return { sent: targets.length };
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
      const expiringDevices = await db.select({ id: devices.id, dataExpiracao: devices.dataExpiracao })
        .from(devices)
        .where(and(eq(devices.ownerId, ctx.user.id), sql`${devices.dataExpiracao} IS NOT NULL`));
      const { checkAndSendExpirationNotice } = await import("./autoNotifications");
      await Promise.all(expiringDevices.map((device) =>
        checkAndSendExpirationNotice(device.id, device.dataExpiracao).catch((error) =>
          console.error("[notices.list] Aviso de vencimento:", error),
        ),
      ));
      const result = await db.select().from(notices).where(and(
        eq(notices.ativo, true),
        sql`(${notices.targetOwnerId} IS NULL OR ${notices.targetOwnerId} = ${ctx.user.id})`,
        sql`(${notices.startsAt} IS NULL OR ${notices.startsAt} <= NOW())`,
        sql`(${notices.endsAt} IS NULL OR ${notices.endsAt} > NOW())`,
      )).orderBy(desc(notices.criadoEm));
      return result;
    }),

    create: adminProcedure
      .input(z.object({
        titulo: z.string().min(1),
        conteudo: z.string().min(1),
        startsAt: z.date().optional(),
        endsAt: z.date().optional(),
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
        
        // A mesma senha bcrypt precisa servir para o login público e o registro legado.
        const passwordHash = await hashPassword(input.password);
        
        // Inserir credenciais
        await db.insert(localCredentials).values({
          userId: input.userId,
          email: input.email,
          passwordHash,
        });
        await db.update(users).set({ passwordHash }).where(eq(users.id, input.userId));
        
        return { success: true, message: 'Credenciais criadas com sucesso!' };
      }),

    update: adminProcedure
      .input(z.object({
        userId: z.number(),
        email: z.string().email().optional(),
        password: z.string().min(6).optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database connection failed' });
        
        // Verificar se a credencial existe
        const existing = await db.select().from(localCredentials).where(eq(localCredentials.userId, input.userId)).limit(1);
        if (!existing.length) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Credenciais não encontradas.' });
        }
        
        const updateData: any = {};
        if (input.email) updateData.email = input.email;
        if (input.password) updateData.passwordHash = await hashPassword(input.password);
        
        await db.update(localCredentials)
          .set(updateData)
          .where(eq(localCredentials.userId, input.userId));
        if (input.password) {
          await db.update(users).set({ passwordHash: updateData.passwordHash }).where(eq(users.id, input.userId));
        }
        
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
      if (!db) return { ouropro: 0, maximus: 0, ultra: 0, prestige: 0, optimus: 0, imperio: 0, infinitus: 0, supremus: 0, evolux: 0, ominus: 0, magnus: 0, excellence: 0, future: 0, nexus: 0, total: 0 };
      
      const result = await db.select({
        app: devices.app,
        count: sql`COUNT(*)`
      })
      .from(devices)
      .where(and(eq(devices.ownerId, ctx.user.id), isNotNull(devices.app)))
      .groupBy(devices.app);

      const linkedResult = await db.select({
        appId: deviceAppLinks.appId,
        count: sql`COUNT(*)`,
      })
        .from(deviceAppLinks)
        .innerJoin(devices, eq(deviceAppLinks.deviceId, devices.id))
        .where(eq(devices.ownerId, ctx.user.id))
        .groupBy(deviceAppLinks.appId);
      
      const counts = result.reduce((acc: any, row: any) => {
        const appName = row.app || 'Sem App';
        acc[appName] = Number(row.count) || 0;
        return acc;
      }, {});
      const linkedCounts = linkedResult.reduce((acc: Record<string, number>, row: any) => {
        acc[row.appId] = Number(row.count) || 0;
        return acc;
      }, {});
      
      const ouropro = (counts['OuroPro'] || 0) + (counts['Ouro Pro'] || 0) + (linkedCounts.ouropro || 0);
      const maximus = (counts['Maximus'] || 0) + (counts['Maximus Player'] || 0) + (linkedCounts.maximus || 0);
      const ultra = (counts['Ultra Player'] || 0) + (counts['Fusion'] || 0) + (linkedCounts.fusion || 0);
      const prestige = (counts['Prestige'] || 0) + (linkedCounts.prestige || 0);
      const optimus = (counts['Optimus'] || 0) + (linkedCounts.optimus || 0);
      const imperio = (counts['Império Play'] || 0) + (counts['Imperio Play'] || 0) + (linkedCounts.imperio || 0);
      const infinitus = (counts['Infinitus'] || 0) + (linkedCounts.infinitus || 0);
      const supremus = (counts['Supremus'] || 0) + (counts['Supreme'] || 0) + (linkedCounts.supremus || 0);
      const evolux = (counts['Evolux'] || 0) + (linkedCounts.evolux || 0);
      const ominus = (counts['Ominus'] || 0) + (linkedCounts.ominus || 0);
      const magnus = (counts['Magnus'] || 0) + (counts['Magnus TV'] || 0) + (linkedCounts.magnus || 0);
      const excellence = (counts['Excellence'] || 0) + (linkedCounts.excellence || 0);
      const future = (counts['Future'] || 0) + (counts['Future Player'] || 0) + (linkedCounts.future || 0);
      const nexus = (counts['Nexus'] || 0) + (counts['Nexus Player'] || 0) + (linkedCounts.nexus || 0);
      
      return {
        ouropro,
        maximus,
        ultra,
        prestige,
        optimus,
        imperio,
        infinitus,
        supremus,
        evolux,
        ominus,
        magnus,
        excellence,
        future,
        nexus,
        total: ouropro + maximus + ultra + prestige + optimus + imperio + infinitus + supremus + evolux + ominus + magnus + excellence + future + nexus
      };
    }),
  }),
});
export type AppRouter = typeof appRouter;
