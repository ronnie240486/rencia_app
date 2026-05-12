import { and, count, desc, eq, gte, like, lt, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, apps, devices, deviceUrls, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Devices ────────────────────────────────────────────────────────────────

export async function listDevices(ownerId: number, opts: {
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const db = await getDb();
  if (!db) return { data: [], total: 0 };
  const { search = "", page = 1, pageSize = 50 } = opts;
  const offset = (page - 1) * pageSize;

  const conditions = [eq(devices.ownerId, ownerId)];
  if (search) {
    conditions.push(
      or(
        like(devices.mac, `%${search}%`),
        like(devices.nomeServer, `%${search}%`)
      )!
    );
  }

  const whereClause = and(...conditions);
  const [data, totalRows] = await Promise.all([
    db.select().from(devices).where(whereClause).orderBy(desc(devices.dataCadastro)).limit(pageSize).offset(offset),
    db.select({ count: count() }).from(devices).where(whereClause),
  ]);

  return { data, total: totalRows[0]?.count ?? 0 };
}

export async function getRecentDevices(ownerId: number, limit = 5) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(devices).where(eq(devices.ownerId, ownerId)).orderBy(desc(devices.dataCadastro)).limit(limit);
}

export async function createDevice(data: {
  ownerId: number;
  mac: string;
  nomeServer: string;
  tipo?: "Usuario" | "Revenda" | "UltraMaster" | "Master";
  modoSelecao?: "XTeamCode" | "M3U8";
  app?: string;
  urlM3u8?: string;
  urlEpg?: string;
  valor?: string;
  dataExpiracao?: string;
  telefone?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(devices).values({
    ownerId: data.ownerId,
    mac: data.mac,
    nomeServer: data.nomeServer,
    tipo: data.tipo ?? "Usuario",
    modoSelecao: data.modoSelecao ?? "XTeamCode",
    app: data.app ?? null,
    urlM3u8: data.urlM3u8 ?? null,
    urlEpg: data.urlEpg ?? null,
    valor: data.valor ?? null,
    dataExpiracao: data.dataExpiracao ? new Date(data.dataExpiracao) : null,
    telefone: data.telefone ?? null,
    status: "Liberado",
  });
  // Retornar o id do device recém-criado
  const insertId = (result as any)[0]?.insertId ?? (result as any).insertId;
  return { id: Number(insertId) };
}

export async function updateDevice(id: number, ownerId: number, data: Partial<{
  mac: string;
  nomeServer: string;
  tipo: "Usuario" | "Revenda" | "UltraMaster" | "Master";
  modoSelecao: "XTeamCode" | "M3U8";
  app: string;
  urlM3u8: string;
  urlEpg: string;
  valor: string;
  dataExpiracao: string;
  status: "Liberado" | "Bloqueado" | "Expirado";
  telefone: string;
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: Record<string, unknown> = {};
  if (data.mac !== undefined) updateData.mac = data.mac;
  if (data.nomeServer !== undefined) updateData.nomeServer = data.nomeServer;
  if (data.tipo !== undefined) updateData.tipo = data.tipo;
  if (data.modoSelecao !== undefined) updateData.modoSelecao = data.modoSelecao;
  if (data.app !== undefined) updateData.app = data.app;
  if (data.urlM3u8 !== undefined) updateData.urlM3u8 = data.urlM3u8;
  if (data.urlEpg !== undefined) updateData.urlEpg = data.urlEpg;
  if (data.valor !== undefined) updateData.valor = data.valor;
  if (data.dataExpiracao !== undefined) updateData.dataExpiracao = data.dataExpiracao ? new Date(data.dataExpiracao) : null;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.telefone !== undefined) updateData.telefone = data.telefone;
  if (Object.keys(updateData).length === 0) return;
  await db.update(devices).set(updateData).where(and(eq(devices.id, id), eq(devices.ownerId, ownerId)));
}

export async function deleteDevice(id: number, ownerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Deletar listas associadas primeiro
  await db.delete(deviceUrls).where(eq(deviceUrls.deviceId, id));
  await db.delete(devices).where(and(eq(devices.id, id), eq(devices.ownerId, ownerId)));
}

export async function deleteManyDevices(ids: number[], ownerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (ids.length === 0) return;
  const { inArray } = await import("drizzle-orm");
  // Deletar listas associadas primeiro
  await db.delete(deviceUrls).where(inArray(deviceUrls.deviceId, ids));
  await db.delete(devices).where(and(inArray(devices.id, ids), eq(devices.ownerId, ownerId)));
}

export async function deleteExpiredDevices(ownerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Buscar IDs dos expirados primeiro
  const expired = await db.select({ id: devices.id }).from(devices)
    .where(and(eq(devices.ownerId, ownerId), lt(devices.dataExpiracao, today)));
  if (expired.length > 0) {
    const { inArray } = await import("drizzle-orm");
    const ids = expired.map(e => e.id);
    await db.delete(deviceUrls).where(inArray(deviceUrls.deviceId, ids));
  }
  await db.delete(devices).where(and(eq(devices.ownerId, ownerId), lt(devices.dataExpiracao, today)));
}

export async function getDeviceStats(ownerId: number) {
  const db = await getDb();
  if (!db) return { total: 0, revendas: 0, ultraMasters: 0, masters: 0, receitaMensal: 0 };

  const [total, revendas, ultraMasters, masters, receita] = await Promise.all([
    db.select({ count: count() }).from(devices).where(eq(devices.ownerId, ownerId)),
    db.select({ count: count() }).from(devices).where(and(eq(devices.ownerId, ownerId), eq(devices.tipo, "Revenda"))),
    db.select({ count: count() }).from(devices).where(and(eq(devices.ownerId, ownerId), eq(devices.tipo, "UltraMaster"))),
    db.select({ count: count() }).from(devices).where(and(eq(devices.ownerId, ownerId), eq(devices.tipo, "Master"))),
    db.select({ total: sql<string>`COALESCE(SUM(valor), 0)` }).from(devices).where(and(eq(devices.ownerId, ownerId), gte(devices.dataCadastro, sql`DATE_FORMAT(NOW(), '%Y-%m-01')`))),
  ]);

  return {
    total: total[0]?.count ?? 0,
    revendas: revendas[0]?.count ?? 0,
    ultraMasters: ultraMasters[0]?.count ?? 0,
    masters: masters[0]?.count ?? 0,
    receitaMensal: parseFloat(receita[0]?.total ?? "0"),
  };
}

export async function getDeviceById(id: number, ownerId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(devices).where(and(eq(devices.id, id), eq(devices.ownerId, ownerId))).limit(1);
  return result[0];
}

// ─── Device URLs (múltiplas listas) ─────────────────────────────────────────

export async function getDeviceUrls(deviceId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(deviceUrls)
    .where(eq(deviceUrls.deviceId, deviceId))
    .orderBy(deviceUrls.ordem);
}

export async function addDeviceUrl(data: {
  deviceId: number;
  nome: string;
  modoSelecao: "XTeamCode" | "M3U8";
  urlM3u8?: string;
  xtServer?: string;
  xtUsername?: string;
  xtPassword?: string;
  ordem?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(deviceUrls).values({
    deviceId: data.deviceId,
    nome: data.nome,
    modoSelecao: data.modoSelecao,
    urlM3u8: data.urlM3u8 ?? null,
    xtServer: data.xtServer ?? null,
    xtUsername: data.xtUsername ?? null,
    xtPassword: data.xtPassword ?? null,
    ordem: data.ordem ?? 0,
    ativo: true,
  });
}

export async function updateDeviceUrl(id: number, data: Partial<{
  nome: string;
  modoSelecao: "XTeamCode" | "M3U8";
  urlM3u8: string;
  xtServer: string;
  xtUsername: string;
  xtPassword: string;
  ordem: number;
  ativo: boolean;
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: Record<string, unknown> = {};
  if (data.nome !== undefined) updateData.nome = data.nome;
  if (data.modoSelecao !== undefined) updateData.modoSelecao = data.modoSelecao;
  if (data.urlM3u8 !== undefined) updateData.urlM3u8 = data.urlM3u8;
  if (data.xtServer !== undefined) updateData.xtServer = data.xtServer;
  if (data.xtUsername !== undefined) updateData.xtUsername = data.xtUsername;
  if (data.xtPassword !== undefined) updateData.xtPassword = data.xtPassword;
  if (data.ordem !== undefined) updateData.ordem = data.ordem;
  if (data.ativo !== undefined) updateData.ativo = data.ativo;
  if (Object.keys(updateData).length === 0) return;
  await db.update(deviceUrls).set(updateData).where(eq(deviceUrls.id, id));
}

export async function deleteDeviceUrl(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(deviceUrls).where(eq(deviceUrls.id, id));
}

// ─── Revendas ────────────────────────────────────────────────────────────────

export async function listRevendas(resellerId: number, opts: {
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const db = await getDb();
  if (!db) return { data: [], total: 0 };
  const { search = "", page = 1, pageSize = 50 } = opts;
  const offset = (page - 1) * pageSize;

  const conditions = [eq(users.resellerId, resellerId)];
  if (search) {
    conditions.push(or(like(users.name, `%${search}%`), like(users.email, `%${search}%`))!);
  }
  const whereClause = and(...conditions);
  const [data, totalRows] = await Promise.all([
    db.select().from(users).where(whereClause).orderBy(desc(users.createdAt)).limit(pageSize).offset(offset),
    db.select({ count: count() }).from(users).where(whereClause),
  ]);
  return { data, total: totalRows[0]?.count ?? 0 };
}

export async function createRevenda(data: {
  resellerId: number;
  name: string;
  email?: string;
  plano: string;
  planValidade?: string;
  limiteDevices: number;
  limiteRevendas: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Criar usuário de revenda com openId único gerado
  const openId = `revenda_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await db.insert(users).values({
    openId,
    name: data.name,
    email: data.email ?? null,
    loginMethod: "manual",
    role: "user",
    plano: data.plano,
    planValidade: data.planValidade ? new Date(data.planValidade) : null,
    limiteDevices: data.limiteDevices,
    limiteRevendas: data.limiteRevendas,
    resellerId: data.resellerId,
    lastSignedIn: new Date(),
  });
}

export async function updateRevenda(id: number, resellerId: number, data: Partial<{
  name: string;
  email: string;
  plano: string;
  planValidade: string;
  limiteDevices: number;
  limiteRevendas: number;
  isActive: boolean;
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.plano !== undefined) updateData.plano = data.plano;
  if (data.planValidade !== undefined) updateData.planValidade = data.planValidade ? new Date(data.planValidade) : null;
  if (data.limiteDevices !== undefined) updateData.limiteDevices = data.limiteDevices;
  if (data.limiteRevendas !== undefined) updateData.limiteRevendas = data.limiteRevendas;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (Object.keys(updateData).length === 0) return;
  await db.update(users).set(updateData).where(and(eq(users.id, id), eq(users.resellerId, resellerId)));
}

export async function deleteRevenda(id: number, resellerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(users).where(and(eq(users.id, id), eq(users.resellerId, resellerId)));
}

export async function getRevendaStats(resellerId: number) {
  const db = await getDb();
  if (!db) return { totalRevendas: 0, totalDevices: 0 };
  const [revendasRows] = await Promise.all([
    db.select({ count: count() }).from(users).where(eq(users.resellerId, resellerId)),
  ]);
  // Total de devices dos meus revendedores
  const revendasList = await db.select({ id: users.id }).from(users).where(eq(users.resellerId, resellerId));
  let totalDevices = 0;
  if (revendasList.length > 0) {
    const { inArray } = await import("drizzle-orm");
    const ids = revendasList.map(r => r.id);
    const devRows = await db.select({ count: count() }).from(devices).where(inArray(devices.ownerId, ids));
    totalDevices = devRows[0]?.count ?? 0;
  }
  return {
    totalRevendas: revendasRows[0]?.count ?? 0,
    totalDevices,
  };
}

// ─── Apps ────────────────────────────────────────────────────────────────────

export async function listApps() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(apps).where(eq(apps.ativo, true)).orderBy(desc(apps.totalClientes));
}

export async function seedApps() {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select({ count: count() }).from(apps);
  if ((existing[0]?.count ?? 0) > 0) return;
  await db.insert(apps).values([
    { nome: "OURO REVENDA", totalClientes: 219789 },
    { nome: "VU REVENDA", totalClientes: 4868 },
    { nome: "TV ROKU -GPC PRO", totalClientes: 2841 },
    { nome: "ZONE X", totalClientes: 2774 },
    { nome: "UNI REVENDA", totalClientes: 2654 },
    { nome: "FACILITA", totalClientes: 2239 },
    { nome: "GPC PRO ANDROID", totalClientes: 521 },
  ]);
}

// ─── User plan info ───────────────────────────────────────────────────────────

export async function getUserPlanInfo(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select({
    plano: users.plano,
    planValidade: users.planValidade,
    limiteDevices: users.limiteDevices,
    limiteRevendas: users.limiteRevendas,
  }).from(users).where(eq(users.id, userId)).limit(1);
  return result[0] ?? null;
}

// ─── Dispositivos Conectados (lastSeen) ───────────────────────────────────────

/**
 * Retorna dispositivos que se conectaram nos últimos N minutos (padrão: 30 min).
 * Usado no Dashboard para mostrar quem está online no OuroPro.
 */
export async function getConnectedDevices(ownerId: number, minutesAgo = 30) {
  const db = await getDb();
  if (!db) return [];
  const cutoff = new Date(Date.now() - minutesAgo * 60 * 1000);
  const { gte } = await import("drizzle-orm");
  return db.select({
    id: devices.id,
    mac: devices.mac,
    nomeServer: devices.nomeServer,
    tipo: devices.tipo,
    status: devices.status,
    lastSeen: devices.lastSeen,
    dataExpiracao: devices.dataExpiracao,
    currentContent: devices.currentContent,
  }).from(devices)
    .where(and(eq(devices.ownerId, ownerId), gte(devices.lastSeen, cutoff)))
    .orderBy(desc(devices.lastSeen))
    .limit(50);
}

// ─── Profile Update ───────────────────────────────────────────────────────────

export async function updateUserProfile(userId: number, data: {
  telefone?: string;
  avatarUrl?: string;
  bannerUrl?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: Record<string, unknown> = {};
  if (data.telefone !== undefined) updateData.telefone = data.telefone;
  if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;
  if (data.bannerUrl !== undefined) updateData.bannerUrl = data.bannerUrl;
  if (Object.keys(updateData).length === 0) return;
  await db.update(users).set(updateData).where(eq(users.id, userId));
}
