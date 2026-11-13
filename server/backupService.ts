import { and, desc, eq, inArray } from "drizzle-orm";
import { autoBackupSettings, backupSnapshots } from "../drizzle/schema";
import { getDb } from "./db";
import { exportBackup, importBackup } from "./exportImport";
import { gzipSync, gunzipSync } from "zlib";
import { storageGetSignedUrl, storagePutBackup } from "./storage";
import { uploadGoogleDriveBackup } from "./googleDriveBackup";

export const AUTO_BACKUP_CRON = "0 0 6 * * *"; // 03:00 no horário de Brasília (UTC-3)
const RETENTION_LIMIT = 30;

export function backupRunKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function snapshotIdsToRemove(ids: number[]) {
  return ids.slice(RETENTION_LIMIT);
}

export function backupDownloadFilename(createdAt: Date | string) {
  return `rencia-backup-${new Date(createdAt).toISOString().replace(/[:.]/g, "-")}.json`;
}

export async function createBackupSnapshot(ownerId: number, type: "automatic" | "manual", now = new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const runKey = type === "automatic" ? backupRunKey(now) : null;

  if (runKey) {
    const existing = await db.select().from(backupSnapshots)
      .where(and(eq(backupSnapshots.ownerId, ownerId), eq(backupSnapshots.runKey, runKey))).limit(1);
    if (existing[0]) return { snapshot: existing[0], alreadyExists: true };
  }

  try {
    const backup = await exportBackup(ownerId);
    const content = JSON.stringify(backup);
    const filename = `backup-${runKey ?? now.toISOString().replace(/[:.]/g, "-")}.json`;
    // O backup completo pode passar de dezenas de MB em JSON; compactado cai ~10x e cabe no Cloudinary gratuito.
    const compressed = gzipSync(Buffer.from(content, "utf8"), { level: 9 });
    const stored = await storeBackupFile(`backups/${ownerId}/${filename}.gz`, compressed);
    const googleDrive = await uploadGoogleDriveBackup(ownerId, filename, content);
    const result = await db.insert(backupSnapshots).values({
      ownerId,
      storageKey: stored.key,
      storageUrl: stored.url,
      fileSize: compressed.byteLength,
      type,
      runKey,
      googleDriveFileId: googleDrive.fileId,
      googleDriveUrl: googleDrive.url,
      googleDriveStatus: googleDrive.status,
      googleDriveError: googleDrive.error,
    });
    const snapshotId = Number((result as any)[0]?.insertId ?? 0);
    const snapshot = (await db.select().from(backupSnapshots).where(eq(backupSnapshots.id, snapshotId)).limit(1))[0];
    const snapshots = await db.select({ id: backupSnapshots.id }).from(backupSnapshots)
      .where(eq(backupSnapshots.ownerId, ownerId)).orderBy(desc(backupSnapshots.createdAt));
    const oldIds = snapshotIdsToRemove(snapshots.map((item) => item.id));
    if (oldIds.length) await db.delete(backupSnapshots).where(inArray(backupSnapshots.id, oldIds));
    await db.update(autoBackupSettings).set({ lastRunAt: now, lastStatus: "success", lastError: null }).where(eq(autoBackupSettings.ownerId, ownerId));
    return { snapshot, alreadyExists: false };
  } catch (error) {
    await db.update(autoBackupSettings).set({ lastRunAt: now, lastStatus: "error", lastError: String(error).slice(0, 500) }).where(eq(autoBackupSettings.ownerId, ownerId));
    throw error;
  }
}

const MULTIPART_PREFIX = "multi:";
const PART_BYTES = 8 * 1024 * 1024; // abaixo dos 10 MB do Cloudinary gratuito

/** Guarda o backup inteiro; se ainda for grande demais depois de compactado, divide em partes de 8 MB. */
async function storeBackupFile(key: string, data: Buffer) {
  if (data.byteLength <= PART_BYTES) return storagePutBackup(key, data, "application/gzip");
  const keys: string[] = [];
  const urls: string[] = [];
  for (let start = 0, index = 1; start < data.byteLength; start += PART_BYTES, index += 1) {
    const part = await storagePutBackup(`${key}.part${index}`, data.subarray(start, start + PART_BYTES), "application/octet-stream");
    keys.push(part.key);
    urls.push(part.url);
  }
  return { key: MULTIPART_PREFIX + JSON.stringify(keys), url: MULTIPART_PREFIX + JSON.stringify(urls) };
}

async function fetchStoredBytes(url: string, key: string) {
  const target = /^https?:\/\//i.test(url) ? url : await storageGetSignedUrl(key);
  const response = await fetch(target);
  if (!response.ok) throw new Error("Não foi possível baixar o arquivo do backup");
  return Buffer.from(await response.arrayBuffer());
}

/** Lê o arquivo do backup (Cloudinary, disco ou Forge) e descompacta se estiver em gzip (backups novos). */
async function readSnapshotBytes(snapshot: { storageKey: string; storageUrl: string }) {
  let raw: Buffer;
  if (snapshot.storageUrl.startsWith(MULTIPART_PREFIX)) {
    const urls = JSON.parse(snapshot.storageUrl.slice(MULTIPART_PREFIX.length)) as string[];
    const keys = snapshot.storageKey.startsWith(MULTIPART_PREFIX) ? (JSON.parse(snapshot.storageKey.slice(MULTIPART_PREFIX.length)) as string[]) : [];
    const parts: Buffer[] = [];
    for (let i = 0; i < urls.length; i += 1) parts.push(await fetchStoredBytes(urls[i], keys[i] ?? ""));
    raw = Buffer.concat(parts);
  } else {
    raw = await fetchStoredBytes(snapshot.storageUrl, snapshot.storageKey);
  }
  return raw.length > 2 && raw[0] === 0x1f && raw[1] === 0x8b ? gunzipSync(raw) : raw;
}

export async function restoreBackupSnapshot(ownerId: number, snapshotId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const snapshot = (await db.select().from(backupSnapshots).where(and(eq(backupSnapshots.id, snapshotId), eq(backupSnapshots.ownerId, ownerId))).limit(1))[0];
  if (!snapshot) throw new Error("Backup não encontrado");
  const bytes = await readSnapshotBytes(snapshot);
  return importBackup(ownerId, JSON.parse(bytes.toString("utf8")));
}

/** Retorna os bytes do backup para a rota autenticada enviar como anexo de download. */
export async function getBackupDownload(ownerId: number, snapshotId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const snapshot = (await db.select().from(backupSnapshots).where(and(eq(backupSnapshots.id, snapshotId), eq(backupSnapshots.ownerId, ownerId))).limit(1))[0];
  if (!snapshot) throw new Error("Backup não encontrado");
  return { filename: backupDownloadFilename(snapshot.createdAt), content: await readSnapshotBytes(snapshot) };
}

/** Somente para testes. */
export const __test = {
  storeBackupFile,
  fetchMulti: (snapshot: { key: string; url: string }) => readSnapshotBytes({ storageKey: snapshot.key, storageUrl: snapshot.url }),
};
