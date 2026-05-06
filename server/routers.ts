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
} from "./db";
import { eq, and, inArray } from "drizzle-orm";
import { users, appSettings, devices, deviceUrls } from "../drizzle/schema";
import { ENV } from "./_core/env";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a administradores." });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
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
      }))
      .mutation(async ({ ctx, input }) => {
        const planInfo = await getUserPlanInfo(ctx.user.id);
        const stats = await getDeviceStats(ctx.user.id);
        const limite = planInfo?.limiteDevices ?? 999;
        if (stats.total >= limite) {
          throw new TRPCError({ code: "FORBIDDEN", message: `Limite de ${limite} devices atingido.` });
        }
        await createDevice({ ownerId: ctx.user.id, ...input });
        return { success: true };
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
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        const device = await getDeviceById(id, ctx.user.id);
        if (!device) throw new TRPCError({ code: "NOT_FOUND", message: "Device não encontrado." });
        await updateDevice(id, ctx.user.id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const device = await getDeviceById(input.id, ctx.user.id);
        if (!device) throw new TRPCError({ code: "NOT_FOUND", message: "Device não encontrado." });
        await deleteDevice(input.id, ctx.user.id);
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
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number(), deviceId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const device = await getDeviceById(input.deviceId, ctx.user.id);
        if (!device) throw new TRPCError({ code: "NOT_FOUND", message: "Device não encontrado." });
        await deleteDeviceUrl(input.id);
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
        email: z.string().email().optional(),
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
        await createRevenda({ resellerId: ctx.user.id, ...input });
        return { success: true };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        email: z.string().optional(),
        plano: z.string().optional(),
        planValidade: z.string().optional(),
        limiteDevices: z.number().optional(),
        limiteRevendas: z.number().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await updateRevenda(id, ctx.user.id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
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
        return {
          plano: "Criador / Desenvolvedor ★",
          planValidade: null,
          limiteDevices: 999999,
          limiteRevendas: 999999,
        };
      }
      return getUserPlanInfo(ctx.user.id);
    }),
  }),

  // ─── Configurações do App ─────────────────────────────────────────────────
  settings: router({
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
  }),
});

export type AppRouter = typeof appRouter;
