import { and, asc, count, desc, eq, gte, inArray, like, lt, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { appCredentials, apps, auditLogs, customerNotes, deviceAppLinks, deviceListNotificationReceipts, deviceMacs, deviceTags, devices, deviceUrls, InsertUser, iptvServers, listFailoverEvents, listHealthChecks, localCredentials, maintenanceTasks, notices, payments, remoteDeviceCommands, users } from "../drizzle/schema";
import { ENV } from './_core/env';
import { dateOnlyForDatabase } from "../shared/dateOnly";
import { normalizeMacForStorage } from "../shared/mac";
import { isManagedAppId, managedAppIdForValue } from "../shared/appCatalog";
import { countDevicePlaylists } from "./devicePlaylistCount";
import { CONNECTED_WINDOW_MINUTES } from "./connectedWindow";
import { addIptvServerRevenue, parseIptvServerValue } from "./iptvServerRevenue";

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

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
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
    const normalizedPhoneSearch = search.replace(/\D/g, "");
    const searchConditions = [
      like(devices.mac, `%${search}%`),
      like(devices.nomeServer, `%${search}%`),
      like(devices.nomeServidor, `%${search}%`),
      like(devices.telefone, `%${search}%`),
    ];
    if (normalizedPhoneSearch.length >= 8) {
      searchConditions.push(sql`REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(${devices.telefone}, ''), ' ', ''), '(', ''), ')', ''), '-', ''), '+', '') LIKE ${`%${normalizedPhoneSearch}%`}` as never);
    }
    conditions.push(
      or(...searchConditions)!
    );
  }

  const whereClause = and(...conditions);
  const [data, totalRows] = await Promise.all([
    db.select().from(devices).where(whereClause).orderBy(desc(devices.dataCadastro)).limit(pageSize).offset(offset),
    db.select({ count: count() }).from(devices).where(whereClause),
  ]);

  const playlistRows = data.length === 0 ? [] : await db
    .select({ deviceId: deviceUrls.deviceId, count: count() })
    .from(deviceUrls)
    .where(inArray(deviceUrls.deviceId, data.map((device) => device.id)))
    .groupBy(deviceUrls.deviceId);
  const playlistCountByDevice = new Map(playlistRows.map((item) => [item.deviceId, Number(item.count)]));
  const deviceIds = data.map((device) => device.id);
  const [linkedAppRows, macRows] = await Promise.all([
    data.length === 0 ? Promise.resolve([]) : db
      .select({ deviceId: deviceAppLinks.deviceId, appId: deviceAppLinks.appId })
      .from(deviceAppLinks)
      .where(inArray(deviceAppLinks.deviceId, deviceIds)),
    data.length === 0 ? Promise.resolve([]) : db
      .select({ deviceId: deviceMacs.deviceId, id: deviceMacs.id, mac: deviceMacs.mac, appId: deviceMacs.appId, createdAt: deviceMacs.createdAt })
      .from(deviceMacs)
      .where(inArray(deviceMacs.deviceId, deviceIds))
      .orderBy(asc(deviceMacs.createdAt), asc(deviceMacs.id)),
  ]);
  const linkedAppsByDevice = new Map<number, string[]>();
  for (const row of linkedAppRows) {
    const current = linkedAppsByDevice.get(row.deviceId) ?? [];
    current.push(row.appId);
    linkedAppsByDevice.set(row.deviceId, current);
  }
  const macsByDevice = new Map<number, Array<{ id: number; mac: string; appId: string | null; createdAt: Date | null; primary: boolean }>>();
  for (const row of macRows) {
    const current = macsByDevice.get(row.deviceId) ?? [];
    current.push({ ...row, primary: false });
    macsByDevice.set(row.deviceId, current);
  }

  return {
    data: data.map((device) => ({
      ...device,
      playlistCount: countDevicePlaylists(device.urlM3u8, playlistCountByDevice.get(device.id) ?? 0),
      linkedAppIds: linkedAppsByDevice.get(device.id) ?? [],
      macs: [
        ...(device.mac ? [{ id: 0, mac: device.mac, appId: device.app, createdAt: null, primary: true }] : []),
        ...(macsByDevice.get(device.id) ?? []),
      ],
    })),
    total: totalRows[0]?.count ?? 0,
  };
}

export async function getRecentDevices(ownerId: number, limit = 5) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(devices).where(eq(devices.ownerId, ownerId)).orderBy(desc(devices.dataCadastro)).limit(limit);
}

export async function createDevice(data: {
  ownerId: number;
  mac: string | null | undefined;
  accessMode?: "MAC" | "LOGIN_PASSWORD";
  nomeServer: string;
  nomeServidor?: string | null;
  tipo?: "Usuario" | "Revenda" | "UltraMaster" | "Master";
  modoSelecao?: "XTeamCode" | "M3U8";
  app?: string;
  urlM3u8?: string;
  urlEpg?: string;
  valor?: string;
  dataExpiracao?: string;
  telefone?: string;
  status?: "Liberado" | "Bloqueado" | "Expirado";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(devices).values({
    ownerId: data.ownerId,
    mac: data.mac ?? null,
    accessMode: data.accessMode ?? "MAC",
    nomeServer: data.nomeServer,
    nomeServidor: data.nomeServidor?.trim() || null,
    tipo: data.tipo ?? "Usuario",
    modoSelecao: data.modoSelecao ?? "M3U8",
    app: data.app ?? null,
    urlM3u8: data.urlM3u8 ?? null,
    urlEpg: data.urlEpg ?? null,
    valor: data.valor ?? null,
    dataExpiracao: data.dataExpiracao ? dateOnlyForDatabase(data.dataExpiracao) : null,
    telefone: data.telefone ?? null,
    status: data.status ?? "Liberado",
  });
  // Retornar o id do device recém-criado
  const insertId = (result as any)[0]?.insertId ?? (result as any).insertId;
  return { id: Number(insertId) };
}

export async function listDeviceMacs(deviceId: number, ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  const owned = await db.select({ id: devices.id }).from(devices).where(and(eq(devices.id, deviceId), eq(devices.ownerId, ownerId))).limit(1);
  if (!owned.length) return [];
  const aliases = await db.select({ id: deviceMacs.id, mac: deviceMacs.mac, appId: deviceMacs.appId, createdAt: deviceMacs.createdAt })
    .from(deviceMacs).where(eq(deviceMacs.deviceId, deviceId)).orderBy(asc(deviceMacs.createdAt), asc(deviceMacs.id));
  const primary = await db.select({ mac: devices.mac, app: devices.app }).from(devices).where(eq(devices.id, deviceId)).limit(1);
  const primaryAppId = managedAppIdForValue(primary[0]?.app);
  return [
    ...(primary[0]?.mac ? [{ id: 0, mac: primary[0].mac, appId: primaryAppId ?? primary[0].app, createdAt: null as Date | null, primary: true }] : []),
    ...aliases.map((alias) => ({ ...alias, appId: alias.appId ?? primaryAppId, primary: false })),
  ];
}

export async function addDeviceMac(deviceId: number, ownerId: number, rawMac: string, appId?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const mac = normalizeMacForStorage(rawMac);
  if (!mac) throw new Error("MAC inválido. Informe 12 caracteres hexadecimais.");
  const normalizedAppId = appId?.trim().toLowerCase() || null;
  if (normalizedAppId && !isManagedAppId(normalizedAppId)) throw new Error("APK inválido para este MAC.");
  const owned = await db.select({ id: devices.id, mac: devices.mac }).from(devices)
    .where(and(eq(devices.id, deviceId), eq(devices.ownerId, ownerId))).limit(1);
  if (!owned.length) throw new Error("Cliente não encontrado.");
  if (owned[0].mac && normalizeMacForStorage(owned[0].mac) === mac) return { id: 0, mac, primary: true };
  const existing = await db.select({ id: deviceMacs.id, deviceId: deviceMacs.deviceId, appId: deviceMacs.appId }).from(deviceMacs).where(eq(deviceMacs.mac, mac)).limit(1);
  if (existing.length) {
    if (existing[0].deviceId === deviceId) {
      if (normalizedAppId && existing[0].appId !== normalizedAppId) await db.update(deviceMacs).set({ appId: normalizedAppId }).where(eq(deviceMacs.id, existing[0].id));
      return { id: existing[0].id, mac, appId: normalizedAppId || existing[0].appId, primary: false };
    }
    throw new Error("Este MAC já está vinculado a outro cliente.");
  }
  if (!owned[0].mac) {
    await db.update(devices).set({ mac }).where(eq(devices.id, deviceId));
    return { id: 0, mac, primary: true };
  }
  const result = await db.insert(deviceMacs).values({ deviceId, mac, appId: normalizedAppId });
  return { id: Number((result as any)[0]?.insertId ?? (result as any).insertId), mac, primary: false };
}

export async function updateDeviceMac(deviceId: number, ownerId: number, macId: number, rawMac: string, appId?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (macId <= 0) throw new Error("O MAC principal deve ser editado no formulário principal.");
  const mac = normalizeMacForStorage(rawMac);
  if (!mac) throw new Error("MAC inválido. Informe 12 caracteres hexadecimais.");
  const normalizedAppId = appId?.trim().toLowerCase() || null;
  if (!normalizedAppId || !isManagedAppId(normalizedAppId)) throw new Error("Escolha um APK válido para este MAC.");
  const owned = await db.select({ id: devices.id, mac: devices.mac }).from(devices)
    .where(and(eq(devices.id, deviceId), eq(devices.ownerId, ownerId))).limit(1);
  if (!owned.length) throw new Error("Cliente não encontrado.");
  if (owned[0].mac && normalizeMacForStorage(owned[0].mac) === mac) throw new Error("Este MAC é o principal deste cliente.");
  const [deviceConflict, aliasConflict] = await Promise.all([
    db.select({ id: devices.id }).from(devices).where(and(eq(devices.mac, mac), sql`${devices.id} <> ${deviceId}`)).limit(1),
    db.select({ id: deviceMacs.id, deviceId: deviceMacs.deviceId }).from(deviceMacs).where(and(eq(deviceMacs.mac, mac), sql`${deviceMacs.id} <> ${macId}`)).limit(1),
  ]);
  if (deviceConflict.length || (aliasConflict.length && aliasConflict[0].deviceId !== deviceId)) throw new Error("Este MAC já está vinculado a outro cliente.");
  const result = await db.update(deviceMacs).set({ mac, appId: normalizedAppId }).where(and(eq(deviceMacs.id, macId), eq(deviceMacs.deviceId, deviceId)));
  const affectedRows = Number((result as any)[0]?.affectedRows ?? (result as any).affectedRows ?? 0);
  if (affectedRows === 0) throw new Error("MAC secundário não encontrado.");
  return { success: true, id: macId, mac, appId: normalizedAppId, primary: false };
}

export async function removeDeviceMac(deviceId: number, ownerId: number, macId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const owned = await db.select({ id: devices.id }).from(devices).where(and(eq(devices.id, deviceId), eq(devices.ownerId, ownerId))).limit(1);
  if (!owned.length) throw new Error("Cliente não encontrado.");
  if (macId === 0) throw new Error("O MAC principal não pode ser removido por esta ação.");
  const result = await db.delete(deviceMacs).where(and(eq(deviceMacs.id, macId), eq(deviceMacs.deviceId, deviceId)));
  const affectedRows = Number((result as any)[0]?.affectedRows ?? (result as any).affectedRows ?? 0);
  if (affectedRows === 0) throw new Error("MAC secundário não encontrado ou já foi removido.");
  return { success: true, deletedId: macId };
}

export async function updateDevice(id: number, ownerId: number, data: Partial<{
  mac?: string | null;
  accessMode: "MAC" | "LOGIN_PASSWORD";
  nomeServer: string;
  nomeServidor?: string | null;
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
  if (data.mac !== undefined) {
    const requestedMac = data.mac?.trim() ?? "";
    const normalizedMac = requestedMac ? normalizeMacForStorage(requestedMac) : null;
    if (requestedMac && !normalizedMac) throw new Error("MAC inválido. Informe 12 caracteres hexadecimais.");
    const current = await db.select({ mac: devices.mac }).from(devices)
      .where(and(eq(devices.id, id), eq(devices.ownerId, ownerId))).limit(1);
    if (!current.length) throw new Error("Cliente não encontrado.");
    const currentMac = current[0].mac ? normalizeMacForStorage(current[0].mac) : null;
    if (normalizedMac && normalizedMac !== currentMac) {
      const [deviceConflict, aliasConflict] = await Promise.all([
        db.select({ id: devices.id }).from(devices).where(and(eq(devices.mac, normalizedMac), sql`${devices.id} <> ${id}`)).limit(1),
        db.select({ id: deviceMacs.id, deviceId: deviceMacs.deviceId }).from(deviceMacs).where(eq(deviceMacs.mac, normalizedMac)).limit(1),
      ]);
      if (deviceConflict.length || (aliasConflict.length && aliasConflict[0].deviceId !== id)) {
        throw new Error("Este MAC já está vinculado a outro cliente.");
      }
      if (aliasConflict.length && aliasConflict[0].deviceId === id) {
        await db.delete(deviceMacs).where(eq(deviceMacs.id, aliasConflict[0].id));
      }
      if (currentMac && currentMac !== normalizedMac) {
        const oldAlias = await db.select({ id: deviceMacs.id }).from(deviceMacs)
          .where(and(eq(deviceMacs.deviceId, id), eq(deviceMacs.mac, currentMac))).limit(1);
        if (!oldAlias.length) await db.insert(deviceMacs).values({ deviceId: id, mac: currentMac });
      }
    }
    updateData.mac = normalizedMac;
  }
  if (data.accessMode !== undefined) updateData.accessMode = data.accessMode;
  if (data.nomeServer !== undefined) updateData.nomeServer = data.nomeServer;
  if (data.nomeServidor !== undefined) updateData.nomeServidor = data.nomeServidor?.trim() || null;
  if (data.tipo !== undefined) updateData.tipo = data.tipo;
  if (data.modoSelecao !== undefined) updateData.modoSelecao = data.modoSelecao;
  if (data.app !== undefined) updateData.app = data.app;
  if (data.urlM3u8 !== undefined) updateData.urlM3u8 = data.urlM3u8;
  if (data.urlEpg !== undefined) updateData.urlEpg = data.urlEpg;
  if (data.valor !== undefined) updateData.valor = data.valor;
  if (data.dataExpiracao !== undefined) updateData.dataExpiracao = data.dataExpiracao ? dateOnlyForDatabase(data.dataExpiracao) : null;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.telefone !== undefined) updateData.telefone = data.telefone;
  if (Object.keys(updateData).length === 0) return;
  await db.update(devices).set(updateData).where(and(eq(devices.id, id), eq(devices.ownerId, ownerId)));
}

export async function deleteDevice(id: number, ownerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const owned = await db.select({ id: devices.id, mac: devices.mac }).from(devices).where(and(eq(devices.id, id), eq(devices.ownerId, ownerId))).limit(1);
  if (!owned.length) return;
  const deviceIds = owned[0].mac
    ? (await db.select({ id: devices.id }).from(devices).where(sql`UPPER(REPLACE(${devices.mac}, '-', ':')) = ${owned[0].mac.trim().toUpperCase()}`)).map((device) => device.id)
    : [id];
  await deleteDeviceReferences(db, deviceIds);
  await db.delete(devices).where(inArray(devices.id, deviceIds));
}

export async function deleteManyDevices(ids: number[], ownerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (ids.length === 0) return;
  const owned = await db.select({ id: devices.id, mac: devices.mac }).from(devices).where(and(inArray(devices.id, ids), eq(devices.ownerId, ownerId)));
  if (!owned.length) return;
  const ownedWithMac = owned.filter((device): device is typeof device & { mac: string } => Boolean(device.mac));
  const normalizedMacs = Array.from(new Set(ownedWithMac.map((device) => device.mac.trim().toUpperCase())));
  const allDuplicates = normalizedMacs.length
    ? await db.select({ id: devices.id }).from(devices).where(inArray(sql`UPPER(REPLACE(${devices.mac}, '-', ':'))`, normalizedMacs))
    : [];
  const deviceIds = Array.from(new Set([...allDuplicates.map((device) => device.id), ...owned.map((device) => device.id)]));
  await deleteDeviceReferences(db, deviceIds);
  await db.delete(devices).where(inArray(devices.id, deviceIds));
}

/** Remove todos os rastros operacionais de dispositivos antes de liberar os MACs. */
async function deleteDeviceReferences(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, deviceIds: number[]) {
  await db.delete(deviceAppLinks).where(inArray(deviceAppLinks.deviceId, deviceIds));
  await db.delete(appCredentials).where(inArray(appCredentials.deviceId, deviceIds));
  await db.delete(deviceListNotificationReceipts).where(inArray(deviceListNotificationReceipts.deviceId, deviceIds));
  await db.delete(remoteDeviceCommands).where(inArray(remoteDeviceCommands.deviceId, deviceIds));
  await db.delete(listHealthChecks).where(inArray(listHealthChecks.deviceId, deviceIds));
  await db.delete(listFailoverEvents).where(inArray(listFailoverEvents.deviceId, deviceIds));
  await db.delete(payments).where(inArray(payments.deviceId, deviceIds));
  await db.delete(deviceTags).where(inArray(deviceTags.deviceId, deviceIds));
  await db.delete(customerNotes).where(inArray(customerNotes.deviceId, deviceIds));
  await db.delete(maintenanceTasks).where(inArray(maintenanceTasks.deviceId, deviceIds));
  await db.delete(notices).where(inArray(notices.targetDeviceId, deviceIds));
  await db.delete(auditLogs).where(and(eq(auditLogs.entityType, "device"), inArray(auditLogs.entityId, deviceIds)));
  await db.delete(deviceUrls).where(inArray(deviceUrls.deviceId, deviceIds));
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

  const [total, revendas, ultraMasters, masters, receita, receitaServidores] = await Promise.all([
    db.select({ count: count() }).from(devices).where(eq(devices.ownerId, ownerId)),
    db.select({ count: count() }).from(devices).where(and(eq(devices.ownerId, ownerId), eq(devices.tipo, "Revenda"))),
    db.select({ count: count() }).from(devices).where(and(eq(devices.ownerId, ownerId), eq(devices.tipo, "UltraMaster"))),
    db.select({ count: count() }).from(devices).where(and(eq(devices.ownerId, ownerId), eq(devices.tipo, "Master"))),
    db.select({ total: sql<string>`COALESCE(SUM(CAST(valor AS DECIMAL(10,2))), 0)` }).from(devices).where(and(eq(devices.ownerId, ownerId), or(eq(devices.status, 'Liberado'), eq(devices.status, 'Expirado')))),
    db.select({ total: sql<string>`COALESCE(SUM(CAST(valor AS DECIMAL(10,2))), 0)` }).from(iptvServers).where(eq(iptvServers.ownerId, ownerId)),
  ]);

  return {
    total: total[0]?.count ?? 0,
    revendas: revendas[0]?.count ?? 0,
    ultraMasters: ultraMasters[0]?.count ?? 0,
    masters: masters[0]?.count ?? 0,
    receitaMensal: addIptvServerRevenue(parseIptvServerValue(receita[0]?.total), receitaServidores[0]?.total),
    receitaServidores: parseIptvServerValue(receitaServidores[0]?.total),
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
  // Adicionar contagem de devices (clientes) por revenda
  const revendaIds = data.map(r => r.id);
  let deviceCounts: Record<number, number> = {};
  if (revendaIds.length > 0) {
    const { inArray: inArr } = await import("drizzle-orm");
    const counts = await db.select({ ownerId: devices.ownerId, cnt: count() })
      .from(devices)
      .where(inArr(devices.ownerId, revendaIds))
      .groupBy(devices.ownerId);
    for (const row of counts) {
      deviceCounts[row.ownerId] = row.cnt;
    }
  }
  const dataWithCounts = data.map(r => ({ ...r, clientCount: deviceCounts[r.id] ?? 0 }));
  return { data: dataWithCounts, total: totalRows[0]?.count ?? 0 };
}

export async function createRevenda(data: {
  resellerId: number;
  name: string;
  email: string;
  passwordHash: string;
  plano: string;
  planValidade?: string;
  limiteDevices: number;
  limiteRevendas: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const email = data.email.trim().toLowerCase();
  const existing = await db.select({ id: users.id })
    .from(users)
    .where(sql`LOWER(${users.email}) = ${email}`)
    .limit(1);
  if (existing.length > 0) {
    throw new Error("Já existe uma conta cadastrada com este e-mail.");
  }
  // Criar usuário de revenda com openId único gerado
  const openId = `revenda_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const result = await db.insert(users).values({
    openId,
    name: data.name,
    email,
    passwordHash: data.passwordHash,
    loginMethod: "manual",
    role: "user",
    isActive: true,
    plano: data.plano,
    planValidade: data.planValidade ? dateOnlyForDatabase(data.planValidade) : null,
    limiteDevices: data.limiteDevices,
    limiteRevendas: data.limiteRevendas,
    resellerId: data.resellerId,
    lastSignedIn: new Date(),
  });
  
  const revendaId = Number((result as any).insertId);
  return { id: revendaId };
}

export async function updateRevenda(id: number, resellerId: number, data: Partial<{
  name: string;
  email: string;
  plano: string;
  planValidade: string;
  limiteDevices: number;
  limiteRevendas: number;
  isActive: boolean;
  passwordHash: string;
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.plano !== undefined) updateData.plano = data.plano;
  if (data.planValidade !== undefined) updateData.planValidade = data.planValidade ? dateOnlyForDatabase(data.planValidade) : null;
  if (data.limiteDevices !== undefined) updateData.limiteDevices = data.limiteDevices;
  if (data.limiteRevendas !== undefined) updateData.limiteRevendas = data.limiteRevendas;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.passwordHash !== undefined) updateData.passwordHash = data.passwordHash;
  if (Object.keys(updateData).length === 0) return;
  await db.update(users).set(updateData).where(and(eq(users.id, id), eq(users.resellerId, resellerId)));
}

export async function deleteRevenda(id: number, resellerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(localCredentials).where(eq(localCredentials.userId, id));
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
  const row = result[0] ?? null;
  if (!row) return null;
  // Ultra Master tem limite ilimitado
  if (row.plano === 'Ultra Master') {
    return { ...row, limiteDevices: 999999, limiteRevendas: 999999 };
  }
  return row;
}

// ─── Dispositivos Conectados (lastSeen) ───────────────────────────────────────

/**
 * Retorna dispositivos que tiveram atividade dentro da janela escolhida no painel.
 * Registros fixados manualmente não são tratados como atividade atual.
 */
export async function getConnectedDevices(ownerId: number, minutesAgo = CONNECTED_WINDOW_MINUTES) {
  const db = await getDb();
  if (!db) return [];
  const cutoff = new Date(Date.now() - minutesAgo * 60 * 1000);
  const { gte } = await import("drizzle-orm");
  return db.select({
    id: devices.id,
    mac: devices.mac,
    nomeServer: devices.nomeServer,
    app: devices.app,
    lastActiveAppId: devices.lastActiveAppId,
    tipo: devices.tipo,
    status: devices.status,
    lastSeen: devices.lastSeen,
    dataExpiracao: devices.dataExpiracao,
    currentContent: devices.currentContent,
    forceShowChannel: devices.forceShowChannel,
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
