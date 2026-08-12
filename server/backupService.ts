import { and, desc, eq, inArray } from "drizzle-orm";
import { autoBackupSettings, backupSnapshots } from "../drizzle/schema";
import { getDb } from "./db";
import { exportBackup, importBackup } from "./exportImport";
import { storageGetSignedUrl, storagePut } from "./storage";

export const AUTO_BACKUP_CRON = "0 0 6 * * *"; // 03:00 no horário de Brasília (UTC-3)
const RETENTION_LIMIT = 30;

export function backupRunKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function snapshotIdsToRemove(ids: number[]) {
  return ids.slice(RETENTION_LIMIT);
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
    const stored = await storagePut(`backups/${ownerId}/backup-${runKey ?? now.toISOString().replace(/[:.]/g, "-")}.json`, content, "application/json");
    const result = await db.insert(backupSnapshots).values({
      ownerId,
      storageKey: stored.key,
      storageUrl: stored.url,
      fileSize: Buffer.byteLength(content, "utf8"),
      type,
      runKey,
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

export async function restoreBackupSnapshot(ownerId: number, snapshotId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const snapshot = (await db.select().from(backupSnapshots).where(and(eq(backupSnapshots.id, snapshotId), eq(backupSnapshots.ownerId, ownerId))).limit(1))[0];
  if (!snapshot) throw new Error("Backup não encontrado");
  const signedUrl = await storageGetSignedUrl(snapshot.storageKey);
  const response = await fetch(signedUrl);
  if (!response.ok) throw new Error("Não foi possível baixar o backup");
  return importBackup(ownerId, await response.json());
}
