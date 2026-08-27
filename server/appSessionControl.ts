import { and, eq, lt } from "drizzle-orm";
import { appSessions } from "../drizzle/schema";
import { getDb } from "./db";

/** APKs devem renovar a sessão pelo heartbeat antes deste período terminar. */
export const APK_SESSION_TTL_MS = 150_000;

export type ApkSessionDecision = {
  allowed: boolean;
  activeSessions: number;
  maximum: number;
  isExistingSession: boolean;
};

export function normalizeApkSessionKey(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return /^[A-Za-z0-9._:-]{8,128}$/.test(normalized) ? normalized : null;
}

export function evaluateApkSession(activeSessionKeys: string[], sessionKey: string, maximum: number): ApkSessionDecision {
  const uniqueKeys = Array.from(new Set(activeSessionKeys));
  const isExistingSession = uniqueKeys.includes(sessionKey);
  const normalizedMaximum = Math.max(1, Math.min(10, Number.isFinite(maximum) ? maximum : 1));

  if (isExistingSession) {
    return { allowed: true, activeSessions: uniqueKeys.length, maximum: normalizedMaximum, isExistingSession: true };
  }
  if (uniqueKeys.length >= normalizedMaximum) {
    return { allowed: false, activeSessions: uniqueKeys.length, maximum: normalizedMaximum, isExistingSession: false };
  }
  return { allowed: true, activeSessions: uniqueKeys.length + 1, maximum: normalizedMaximum, isExistingSession: false };
}

export async function registerApkSession(input: {
  deviceId: number;
  appId: string | null;
  sessionKey: string;
  maximum: number;
  now?: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Banco indisponível para registrar sessão.");

  const now = input.now ?? new Date();
  const expiry = new Date(now.getTime() - APK_SESSION_TTL_MS);
  await db.delete(appSessions).where(and(eq(appSessions.deviceId, input.deviceId), lt(appSessions.lastSeen, expiry)));

  const current = await db.select({ sessionKey: appSessions.sessionKey })
    .from(appSessions)
    .where(eq(appSessions.deviceId, input.deviceId));
  const decision = evaluateApkSession(current.map((item) => item.sessionKey), input.sessionKey, input.maximum);
  if (!decision.allowed) return decision;

  if (decision.isExistingSession) {
    await db.update(appSessions)
      .set({ lastSeen: now, appId: input.appId })
      .where(and(eq(appSessions.deviceId, input.deviceId), eq(appSessions.sessionKey, input.sessionKey)));
  } else {
    await db.insert(appSessions).values({ deviceId: input.deviceId, sessionKey: input.sessionKey, appId: input.appId, lastSeen: now });
  }
  return decision;
}

export async function endApkSession(deviceId: number, sessionKey: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco indisponível para encerrar sessão.");
  await db.delete(appSessions).where(and(eq(appSessions.deviceId, deviceId), eq(appSessions.sessionKey, sessionKey)));
}
