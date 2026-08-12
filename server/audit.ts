import { auditLogs } from "../drizzle/schema";
import { getDb } from "./db";

type AuditInput = {
  ownerId: number;
  actorUserId: number;
  entityType: string;
  entityId?: number | null;
  action: string;
  summary: string;
  beforeData?: unknown;
  afterData?: unknown;
};

export function sanitizeAuditData(data: unknown) {
  if (data === undefined) return null;
  const text = JSON.stringify(data, (key, value) => /password|senha/i.test(key) ? "[oculto]" : value);
  return text.length > 8_000 ? `${text.slice(0, 8_000)}…` : text;
}

export async function recordAudit(input: AuditInput) {
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(auditLogs).values({
      ownerId: input.ownerId,
      actorUserId: input.actorUserId,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      action: input.action,
      summary: input.summary,
      beforeData: sanitizeAuditData(input.beforeData),
      afterData: sanitizeAuditData(input.afterData),
    });
  } catch (error) {
    console.error("[audit] Não foi possível gravar a ação:", error);
  }
}
