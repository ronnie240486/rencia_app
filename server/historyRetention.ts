import { and, eq, inArray, lt } from "drizzle-orm";
import { auditLogs, historyRetentionSettings, internalAlerts, listHealthChecks, maintenanceTasks } from "../drizzle/schema";
import { getDb } from "./db";

export const HISTORY_RETENTION_DAYS = 3;
export const HISTORY_RETENTION_CRON = "0 0 6 * * *"; // diariamente às 03:00 em Brasília, mantendo somente 3 dias

export function retentionCutoff(now = new Date(), days = HISTORY_RETENTION_DAYS) {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

function deletedRows(result: unknown): number {
  const raw = result as any;
  return Number(raw?.[0]?.affectedRows ?? raw?.affectedRows ?? 0);
}

export async function cleanupOldOperationalHistory(ownerId: number, now = new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const cutoff = retentionCutoff(now);
  try {
    const [audit, alerts, healthChecks, completedTasks] = await Promise.all([
      db.delete(auditLogs).where(and(eq(auditLogs.ownerId, ownerId), lt(auditLogs.createdAt, cutoff))),
      db.delete(internalAlerts).where(and(eq(internalAlerts.ownerId, ownerId), lt(internalAlerts.createdAt, cutoff))),
      db.delete(listHealthChecks).where(and(eq(listHealthChecks.ownerId, ownerId), lt(listHealthChecks.checkedAt, cutoff))),
      db.delete(maintenanceTasks).where(and(eq(maintenanceTasks.ownerId, ownerId), inArray(maintenanceTasks.status, ["resolved", "cancelled"]), lt(maintenanceTasks.updatedAt, cutoff))),
    ]);
    const counts = { auditLogs: deletedRows(audit), alerts: deletedRows(alerts), healthChecks: deletedRows(healthChecks), completedTasks: deletedRows(completedTasks) };
    await db.update(historyRetentionSettings).set({ lastRunAt: now, lastStatus: "success", lastError: null }).where(eq(historyRetentionSettings.ownerId, ownerId));
    return { cutoff, counts };
  } catch (error) {
    await db.update(historyRetentionSettings).set({ lastRunAt: now, lastStatus: "error", lastError: String(error).slice(0, 500) }).where(eq(historyRetentionSettings.ownerId, ownerId));
    throw error;
  }
}
