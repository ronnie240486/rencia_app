import { and, eq, getTableColumns, inArray, lt, or, sql } from "drizzle-orm";
import {
  appCredentials, customerNotes, deviceAppLinks, deviceListNotificationReceipts, deviceMacs, deviceTags,
  devices, deviceUrls, listFailoverEvents, listHealthChecks, maintenanceTasks, notices, payments,
} from "../drizzle/schema";
import { dateOnlyForDatabase } from "../shared/dateOnly";
import { deleteDevice, getDb } from "./db";

/**
 * Lixeira de clientes.
 *
 * Antes de qualquer exclusão, o cliente inteiro (cadastro + as listas extras, MACs adicionais,
 * apps vinculados, credenciais, pagamentos, tags, notas, etc.) é guardado como um "retrato" JSON na
 * tabela `deleted_devices`. Restaurar recoloca tudo com os MESMOS ids, então nada fica solto.
 * A tabela é criada sozinha na primeira vez que for usada (CREATE TABLE IF NOT EXISTS).
 */

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

// Tabelas ligadas ao cliente: [chave no retrato, tabela, coluna que aponta pro cliente]
const RELATED: Array<[string, any, any]> = [
  ["deviceUrls", deviceUrls, deviceUrls.deviceId],
  ["deviceMacs", deviceMacs, deviceMacs.deviceId],
  ["deviceAppLinks", deviceAppLinks, deviceAppLinks.deviceId],
  ["appCredentials", appCredentials, appCredentials.deviceId],
  ["deviceListNotificationReceipts", deviceListNotificationReceipts, deviceListNotificationReceipts.deviceId],
  ["listHealthChecks", listHealthChecks, listHealthChecks.deviceId],
  ["listFailoverEvents", listFailoverEvents, listFailoverEvents.deviceId],
  ["payments", payments, payments.deviceId],
  ["deviceTags", deviceTags, deviceTags.deviceId],
  ["customerNotes", customerNotes, customerNotes.deviceId],
  ["maintenanceTasks", maintenanceTasks, maintenanceTasks.deviceId],
  ["notices", notices, notices.targetDeviceId],
];

let tableReady = false;

async function ensureTrashTable(db: Db) {
  if (tableReady) return;
  await db.execute(sql.raw(
    "CREATE TABLE IF NOT EXISTS `deleted_devices` (" +
    "`id` int AUTO_INCREMENT PRIMARY KEY," +
    "`ownerId` int NOT NULL," +
    "`originalDeviceId` int NOT NULL," +
    "`nomeServer` varchar(255) NOT NULL," +
    "`mac` varchar(64) NULL," +
    "`app` varchar(128) NULL," +
    "`status` varchar(16) NULL," +
    "`dataExpiracao` varchar(10) NULL," +
    "`urlsCount` int NOT NULL DEFAULT 0," +
    "`snapshot` longtext NOT NULL," +
    "`deletedAtIso` varchar(32) NOT NULL," +
    "KEY `deleted_devices_owner_idx` (`ownerId`)" +
    ")",
  ));
  tableReady = true;
}

function normalizeMac(mac: string | null | undefined) {
  return (mac ?? "").trim().toUpperCase().replace(/-/g, ":");
}

function dateOnly(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function reviveRow(columns: Record<string, any>, row: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const column = columns[key];
    if (!column) continue;
    if (value === null || value === undefined) { out[key] = null; continue; }
    // Coluna só-data (vencimento): grava ao meio-dia UTC, igual ao resto do painel, pra não voltar um dia.
    if (column.columnType === "MySqlDate" && typeof value === "string") out[key] = dateOnlyForDatabase(value);
    else if (column.dataType === "date" && typeof value === "string") out[key] = new Date(value);
    else if (column.dataType === "bigint" && typeof value === "string") out[key] = BigInt(value);
    else out[key] = value;
  }
  return out;
}

async function insertRows(db: Db, table: any, rows: Array<Record<string, unknown>> | undefined) {
  if (!rows?.length) return;
  const columns = getTableColumns(table) as Record<string, any>;
  const revived = rows.map((row) => reviveRow(columns, row));
  const noop = sql.raw(`\`${columns.id.name}\` = \`${columns.id.name}\``);
  for (let i = 0; i < revived.length; i += 100) {
    // ON DUPLICATE KEY ... = ele mesmo: se a linha já existir, ela é mantida sem erro.
    await (db.insert(table).values(revived.slice(i, i + 100) as any) as any).onDuplicateKeyUpdate({ set: { id: noop } });
  }
}

/** Guarda na lixeira os clientes que vão ser apagados. Se não conseguir guardar, lança erro (e nada deve ser apagado). */
export async function moveDevicesToTrash(ownerId: number, deviceIds: number[]): Promise<number> {
  if (!deviceIds.length) return 0;
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");
  try {
    await ensureTrashTable(db);
    const requested = await db.select().from(devices).where(and(eq(devices.ownerId, ownerId), inArray(devices.id, deviceIds)));
    if (!requested.length) return 0;
    // Mesmo critério da exclusão: cadastros com o mesmo MAC saem juntos.
    const macs = Array.from(new Set(requested.map((d) => normalizeMac(d.mac)).filter(Boolean)));
    const group = macs.length
      ? await db.select().from(devices).where(or(
          inArray(devices.id, requested.map((d) => d.id)),
          inArray(sql`UPPER(REPLACE(${devices.mac}, '-', ':'))`, macs),
        ))
      : requested;
    const byKey = new Map<string, typeof group>();
    for (const device of group) {
      const key = normalizeMac(device.mac) || `id:${device.id}`;
      byKey.set(key, [...(byKey.get(key) ?? []), device]);
    }
    const requestedIds = new Set(requested.map((d) => d.id));
    // Maior id de cliente neste momento: quem tiver id maior que isso foi criado DEPOIS da exclusão
    // (mais confiável que comparar horários, que dependem do fuso do banco).
    const [maxRows] = (await db.execute(sql`SELECT COALESCE(MAX(id), 0) AS m FROM devices`)) as any;
    const maxDeviceId = Number((maxRows as any[])[0]?.m ?? 0);
    let saved = 0;
    for (const members of Array.from(byKey.values())) {
      const ids = members.map((d) => d.id);
      const related: Record<string, unknown[]> = {};
      for (const [key, table, column] of RELATED) {
        related[key] = await db.select().from(table).where(inArray(column, ids));
      }
      const primary = members.find((d) => requestedIds.has(d.id)) ?? members[0];
      const urlsCount = (related.deviceUrls?.length ?? 0) + members.filter((d) => d.urlM3u8).length;
      const snapshot = JSON.stringify({ devices: members, related, maxDeviceId }, (_key, value) => typeof value === "bigint" ? value.toString() : value);
      await db.execute(sql`INSERT INTO deleted_devices (ownerId, originalDeviceId, nomeServer, mac, app, status, dataExpiracao, urlsCount, snapshot, deletedAtIso)
        VALUES (${ownerId}, ${primary.id}, ${primary.nomeServer}, ${primary.mac ?? null}, ${primary.app ?? null}, ${primary.status ?? null}, ${dateOnly(primary.dataExpiracao)}, ${urlsCount}, ${snapshot}, ${new Date().toISOString()})`);
      saved += 1;
    }
    return saved;
  } catch (error) {
    console.error("[Lixeira] Falha ao guardar cliente antes de excluir:", error);
    throw new Error("Não foi possível guardar o cliente na lixeira. Nada foi apagado.");
  }
}

/** Ids dos clientes com vencimento passado (mesmo critério do botão "Deletar Expirados"). */
export async function listExpiredDeviceIds(ownerId: number): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const rows = await db.select({ id: devices.id }).from(devices).where(and(eq(devices.ownerId, ownerId), lt(devices.dataExpiracao, today)));
  return rows.map((row) => row.id);
}

export async function listDeletedDevices(ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  await ensureTrashTable(db);
  const [rows] = (await db.execute(sql`SELECT id, originalDeviceId, nomeServer, mac, app, status, dataExpiracao, urlsCount, deletedAtIso
    FROM deleted_devices WHERE ownerId = ${ownerId} ORDER BY id DESC LIMIT 300`)) as any;
  return (rows as any[]).map((row) => ({
    id: Number(row.id),
    originalDeviceId: Number(row.originalDeviceId),
    nomeServer: String(row.nomeServer),
    mac: (row.mac ?? null) as string | null,
    app: (row.app ?? null) as string | null,
    status: (row.status ?? null) as string | null,
    dataExpiracao: (row.dataExpiracao ?? null) as string | null,
    urlsCount: Number(row.urlsCount ?? 0),
    deletedAt: String(row.deletedAtIso),
  }));
}

/** Restaura o cliente com tudo que tinha. Se o mesmo MAC foi recriado depois (ex.: teste), o cadastro novo é trocado pelo restaurado. */
export async function restoreDeletedDevice(trashId: number, ownerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");
  await ensureTrashTable(db);
  const [found] = (await db.execute(sql`SELECT id, nomeServer, snapshot FROM deleted_devices WHERE id = ${trashId} AND ownerId = ${ownerId} LIMIT 1`)) as any;
  const entry = (found as any[])[0];
  if (!entry) throw new Error("Cliente não encontrado na lixeira.");
  const snapshot = JSON.parse(String(entry.snapshot)) as { devices: Array<Record<string, any>>; related: Record<string, Array<Record<string, any>>>; maxDeviceId?: number };
  const maxIdAtDelete = Number(snapshot.maxDeviceId ?? Number.MAX_SAFE_INTEGER);
  const snapshotIds = snapshot.devices.map((d) => Number(d.id));

  const idClash = await db.select({ id: devices.id }).from(devices).where(inArray(devices.id, snapshotIds));
  if (idClash.length) throw new Error("Este cliente já está cadastrado de novo no painel (mesmo código interno).");

  const allMacs = Array.from(new Set([
    ...snapshot.devices.map((d) => normalizeMac(d.mac)),
    ...(snapshot.related.deviceMacs ?? []).map((m) => normalizeMac(m.mac)),
  ].filter(Boolean)));

  let replaced = 0;
  if (allMacs.length) {
    const toReplace = new Map<number, number>(); // deviceId -> ownerId
    const clashDevices = await db.select().from(devices).where(inArray(sql`UPPER(REPLACE(${devices.mac}, '-', ':'))`, allMacs));
    const clashExtra = await db.select().from(deviceMacs).where(inArray(sql`UPPER(REPLACE(${deviceMacs.mac}, '-', ':'))`, allMacs));
    const candidates = [...clashDevices];
    for (const extra of clashExtra) {
      const owner = (await db.select().from(devices).where(eq(devices.id, extra.deviceId)).limit(1))[0];
      if (owner) candidates.push(owner);
      else await db.delete(deviceMacs).where(eq(deviceMacs.id, extra.id)); // MAC órfão de cliente que não existe mais
    }
    for (const device of candidates) {
      const createdAfterDelete = device.id > maxIdAtDelete;
      if (!createdAfterDelete) {
        throw new Error(`O MAC já pertence a outro cliente (${device.nomeServer}) cadastrado antes da exclusão. Não dá pra restaurar sem conflito.`);
      }
      toReplace.set(device.id, device.ownerId);
    }
    for (const [deviceId, deviceOwner] of Array.from(toReplace.entries())) {
      await deleteDevice(deviceId, deviceOwner);
      replaced += 1;
    }
  }

  await insertRows(db, devices, snapshot.devices);
  for (const [key, table] of RELATED) await insertRows(db, table, snapshot.related[key]);
  await db.execute(sql`DELETE FROM deleted_devices WHERE id = ${trashId} AND ownerId = ${ownerId}`);

  const lists = (snapshot.related.deviceUrls?.length ?? 0) + snapshot.devices.filter((d) => d.urlM3u8).length;
  return { restoredDeviceId: snapshotIds[0], nomeServer: String(entry.nomeServer), lists, replaced };
}

/** Apaga de vez da lixeira (um item, ou tudo quando não passa id). */
export async function purgeDeletedDevices(ownerId: number, trashId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");
  await ensureTrashTable(db);
  if (trashId) await db.execute(sql`DELETE FROM deleted_devices WHERE id = ${trashId} AND ownerId = ${ownerId}`);
  else await db.execute(sql`DELETE FROM deleted_devices WHERE ownerId = ${ownerId}`);
}
