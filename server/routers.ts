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
import { eq, and, inArray, sql, desc, asc } from "drizzle-orm";
import { users, appSettings, devices, deviceUrls, dnsEntries, carouselSlides, carouselConfig, suggestions, notices } from "../drizzle/schema";
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
        tipo: z.enum(["Usuario", "Revenda", "Master"]).optional().default("Usuario"),
        modoSelecao: z.enum(["XTeamCode", "M3U8"]).optional().default("XTeamCode"),
        app: z.string().optional(),
        appType: z.enum(["OuroPro", "InteractivePro"]).optional().default("OuroPro"),
        urlM3u8: z.string().optional(),
        urlEpg: z.string().optional(),
        valor: z.string().optional(),
        dataExpiracao: z.string().optional(),
        telefone: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const planInfo = await getUserPlanInfo(ctx.user.id);
        const stats = await getDeviceStats(ctx.user.id);
        const limite = planInfo?.limiteDevices ?? 999;
        if (stats.total >= limite) {
          throw new TRPCError({ code: "FORBIDDEN", message: `Limite de ${limite} devices atingido.` });
        }
        const result = await createDevice({ ownerId: ctx.user.id, ...input });
        return { success: true, id: result.id };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        mac: z.string().optional(),
        nomeServer: z.string().optional(),
        tipo: z.enum(["Usuario", "Revenda", "Master"]).optional(),
        modoSelecao: z.enum(["XTeamCode", "M3U8"]).optional(),
        app: z.string().optional(),
        appType: z.enum(["OuroPro", "InteractivePro"]).optional(),
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

    toggleBlock: protectedProcedure
      .input(z.object({ id: z.number(), block: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
        // Coletar sub-revendas para cascata
        const subRevendas = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.resellerId, input.id));
        const subIds = subRevendas.map(r => r.id);
        const deviceStatus = input.block ? "Bloqueado" : "Liberado";
        // Bloquear/desbloquear devices diretos
        await db.update(devices)
          .set({ status: deviceStatus })
          .where(eq(devices.ownerId, input.id));
        // Cascata: sub-revendas
        if (subIds.length > 0) {
          await db.update(devices)
            .set({ status: deviceStatus })
            .where(inArray(devices.ownerId, subIds));
          await db.update(users)
            .set({ isActive: !input.block })
            .where(inArray(users.id, subIds));
        }
        // Atualizar a própria revenda
        await db.update(users)
          .set({ isActive: !input.block })
          .where(and(eq(users.id, input.id), eq(users.resellerId, ctx.user.id)));
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

          // 2. Bloquear devices diretos da revenda
          await db.update(devices)
            .set({ status: "Bloqueado" })
            .where(eq(devices.ownerId, input.id));

          // 3. Bloquear devices de todas as sub-revendas (cascata)
          if (subIds.length > 0) {
            await db.update(devices)
              .set({ status: "Bloqueado" })
              .where(inArray(devices.ownerId, subIds));
            // Marcar sub-revendas como inativas
            await db.update(users)
              .set({ isActive: false })
              .where(inArray(users.id, subIds));
          }

          // 4. Marcar a própria revenda como inativa antes de deletar
          await db.update(users)
            .set({ isActive: false })
            .where(and(eq(users.id, input.id), eq(users.resellerId, ctx.user.id)));
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
    list: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const result = await db.select().from(notices).where(eq(notices.ativo, true)).orderBy(desc(notices.criadoEm));
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
          ...input,
        });
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.delete(notices).where(eq(notices.id, input.id));
        return { success: true };
      }),
  }),

  interactive: router({
    getConfig: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const schema = await import("../drizzle/schema");
      const interactiveConfig = (schema as any).interactiveConfig;
      const configs = await db.select().from(interactiveConfig).where(eq(interactiveConfig.ownerId, ctx.user.id)).limit(1);
      const config = configs[0];
      return config || { ownerId: ctx.user.id, appName: "InteractivePro", autoplayInterval: 5000 };
    }),

    updateConfig: protectedProcedure
      .input(z.object({
        backgroundUrl: z.string().optional(),
        appName: z.string().optional(),
        appLogo: z.string().optional(),
        autoplayInterval: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const schema = await import("../drizzle/schema");
        const interactiveConfig = (schema as any).interactiveConfig;
        const existings = await db.select().from(interactiveConfig).where(eq(interactiveConfig.ownerId, ctx.user.id)).limit(1);
        const existing = existings[0];
        if (existing) {
          const updateData: Record<string, unknown> = {};
          if (input.backgroundUrl !== undefined) updateData.backgroundUrl = input.backgroundUrl;
          if (input.appName !== undefined) updateData.appName = input.appName;
          if (input.appLogo !== undefined) updateData.appLogo = input.appLogo;
          if (input.autoplayInterval !== undefined) updateData.autoplayInterval = input.autoplayInterval;
          if (Object.keys(updateData).length > 0) {
            await db.update(interactiveConfig).set(updateData).where(eq(interactiveConfig.ownerId, ctx.user.id));
          }
        } else {
          await db.insert(interactiveConfig).values({
            ownerId: ctx.user.id,
            backgroundUrl: input.backgroundUrl,
            appName: input.appName || "InteractivePro",
            appLogo: input.appLogo,
            autoplayInterval: input.autoplayInterval || 5000,
          });
        }
        return { success: true };
      }),

    getBanners: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const schema = await import("../drizzle/schema");
      const interactiveBanners = (schema as any).interactiveBanners;
      return db.select().from(interactiveBanners)
        .where(and(eq(interactiveBanners.ownerId, ctx.user.id), eq(interactiveBanners.ativo, true)))
        .orderBy(asc(interactiveBanners.ordem));
    }),

    createBanner: protectedProcedure
      .input(z.object({
        titulo: z.string().min(1),
        descricao: z.string().optional(),
        tipo: z.enum(["image", "video"]),
        urlMedia: z.string().url(),
        duracao: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const schema = await import("../drizzle/schema");
        const interactiveBanners = (schema as any).interactiveBanners;
        await db.insert(interactiveBanners).values({
          ownerId: ctx.user.id,
          titulo: input.titulo,
          descricao: input.descricao,
          tipo: input.tipo,
          urlMedia: input.urlMedia,
          duracao: input.duracao || 5,
          ordem: 0,
          ativo: true,
        });
        return { success: true };
      }),

    updateBanner: protectedProcedure
      .input(z.object({
        id: z.number(),
        titulo: z.string().optional(),
        descricao: z.string().optional(),
        tipo: z.enum(["image", "video"]).optional(),
        urlMedia: z.string().url().optional(),
        duracao: z.number().optional(),
        ativo: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return { success: true };
      }),

    deleteBanner: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const schema = await import("../drizzle/schema");
        const interactiveBanners = (schema as any).interactiveBanners;
        await db.delete(interactiveBanners)
          .where(and(eq(interactiveBanners.id, input.id), eq(interactiveBanners.ownerId, ctx.user.id)));
        return { success: true };
      }),
  }),

  contentSuggestions: router({
    list: protectedProcedure
      .input(z.object({
        tipo: z.enum(["filme", "serie", "novela", "desenho"]).optional(),
      }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const schema = await import("../drizzle/schema");
        const contentSuggestions = (schema as any).contentSuggestions;
        const results = await db.select().from(contentSuggestions)
          .where(and(eq(contentSuggestions.ownerId, ctx.user.id), eq(contentSuggestions.ativo, true)))
          .orderBy(asc(contentSuggestions.ordem));
        return results;
      }),

    create: protectedProcedure
      .input(z.object({
        tipo: z.enum(["filme", "serie", "novela", "desenho"]),
        titulo: z.string().min(1),
        descricao: z.string().optional(),
        urlCapa: z.string().url().optional(),
        urlTrailer: z.string().url().optional(),
        genero: z.string().optional(),
        ano: z.number().optional(),
        classificacao: z.string().optional(),
        duracao: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const schema = await import("../drizzle/schema");
        const contentSuggestions = (schema as any).contentSuggestions;
        await db.insert(contentSuggestions).values({
          ownerId: ctx.user.id,
          ...input,
        });
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const schema = await import("../drizzle/schema");
        const contentSuggestions = (schema as any).contentSuggestions;
        await db.delete(contentSuggestions)
          .where(and(eq(contentSuggestions.id, input.id), eq(contentSuggestions.ownerId, ctx.user.id)));
        return { success: true };
      }),
  }),

  appIntro: router({
    getConfig: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const schema = await import("../drizzle/schema");
      const appIntroConfig = (schema as any).appIntroConfig;
      const configs = await db.select().from(appIntroConfig)
        .where(eq(appIntroConfig.ownerId, ctx.user.id)).limit(1);
      return configs[0] || { ownerId: ctx.user.id, duracao: 3000, habilitado: true };
    }),

    updateConfig: protectedProcedure
      .input(z.object({
        logoUrl: z.string().optional(),
        soundUrl: z.string().optional(),
        duracao: z.number().optional(),
        habilitado: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const schema = await import("../drizzle/schema");
        const appIntroConfig = (schema as any).appIntroConfig;
        const existings = await db.select().from(appIntroConfig)
          .where(eq(appIntroConfig.ownerId, ctx.user.id)).limit(1);
        const existing = existings[0];
        if (existing) {
          const updateData: Record<string, unknown> = {};
          if (input.logoUrl !== undefined) updateData.logoUrl = input.logoUrl;
          if (input.soundUrl !== undefined) updateData.soundUrl = input.soundUrl;
          if (input.duracao !== undefined) updateData.duracao = input.duracao;
          if (input.habilitado !== undefined) updateData.habilitado = input.habilitado;
          if (Object.keys(updateData).length > 0) {
            await db.update(appIntroConfig).set(updateData).where(eq(appIntroConfig.ownerId, ctx.user.id));
          }
        } else {
          await db.insert(appIntroConfig).values({
            ownerId: ctx.user.id,
            logoUrl: input.logoUrl,
            soundUrl: input.soundUrl,
            duracao: input.duracao || 3000,
            habilitado: input.habilitado !== false,
          });
        }
        return { success: true };
      }),
  }),

  // ─── Ads/Banners para APK ──────────────────────────────────────────
  ads: router({
    adsOne: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return new Response("Database not available", { status: 500 });
      
      const banners = await db.select().from(carouselSlides).limit(15);
      const config = await db.select().from(carouselConfig).limit(1);
      
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Filmes Sugeridos</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { width: 100%; height: 100vh; overflow: hidden; background: #000; }
    #slider-container { width: 100%; height: 100%; position: relative; }
    .slide {
      width: 100%;
      height: 100%;
      position: absolute;
      background-size: cover;
      background-position: center;
      opacity: 0;
      transition: opacity 1s ease-in-out;
    }
    .slide.active { opacity: 1; }
    .logo { width: 50%; height: auto; position: absolute; top: 50%; left: 25%; transform: translateY(-50%); }
    .footer-banner {
      position: absolute;
      bottom: 0;
      width: 100%;
      height: 60px;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: bold;
      color: #fff;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
  </style>
</head>
<body>
  <div id="slider-container">
    <div id="slide1" class="slide active"></div>
    <div id="slide2" class="slide"></div>
  </div>
  <div class="footer-banner">FILMES SUGERIDOS</div>
  <script>
    const banners = ${JSON.stringify(banners)};
    const interval = ${config[0]?.autoplayInterval || 8000};
    let currentIndex = 0;
    
    function updateSlide() {
      if (banners.length === 0) return;
      const banner = banners[currentIndex];
      const nextSlide = document.getElementById('slide' + (currentIndex % 2 === 0 ? 2 : 1));
      if (banner.imageUrl) {
        nextSlide.style.backgroundImage = 'url(' + banner.imageUrl + ')';
      }
      nextSlide.classList.add('active');
      setTimeout(() => {
        document.getElementById('slide' + ((currentIndex + 1) % 2 === 0 ? 2 : 1)).classList.remove('active');
      }, 1000);
      currentIndex = (currentIndex + 1) % banners.length;
    }
    
    updateSlide();
    setInterval(updateSlide, interval);
  </script>
</body>
</html>
      `;
      return new Response(html, { headers: { "Content-Type": "text/html" } });
    }),
  }),
});

export type AppRouter = typeof appRouter;
