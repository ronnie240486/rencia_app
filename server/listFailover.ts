import { and, asc, eq } from "drizzle-orm";
import { devices, deviceUrls, listFailoverEvents, listFailoverSettings, listHealthChecks } from "../drizzle/schema";
import { probeListUrl } from "./listHealth";

export const LIST_FAILOVER_CRON = "0 */10 * * * *";

type Candidate = { id: number | null; name: string; url: string };

export function orderFailoverCandidates<T extends { id: number | null }>(candidates: T[], activeId: number | null) {
  const active = candidates.find((candidate) => candidate.id === activeId);
  return active ? [active, ...candidates.filter((candidate) => candidate !== active)] : candidates;
}

export async function runListFailoverSweep(db: any, ownerId: number) {
  const deviceRows = await db.select().from(devices).where(and(eq(devices.ownerId, ownerId), eq(devices.listFailoverEnabled, true)));
  let checked = 0;
  let switched = 0;

  for (const device of deviceRows) {
    const extras = await db.select().from(deviceUrls).where(and(eq(deviceUrls.deviceId, device.id), eq(deviceUrls.ativo, true))).orderBy(asc(deviceUrls.ordem));
    const candidates: Candidate[] = [
      ...(device.urlM3u8 ? [{ id: null, name: "Lista 1", url: device.urlM3u8 }] : []),
      ...extras.map((list: any): Candidate => ({ id: list.id as number, name: list.nome || `Lista ${list.ordem + 2}`, url: (list.urlM3u8 || list.xtServer || "").trim() })).filter((candidate: Candidate) => Boolean(candidate.url)),
    ];
    if (!candidates.length) continue;

    const ordered = orderFailoverCandidates(candidates, device.activeDeviceUrlId ?? null);
    const current = ordered[0];
    const currentResult = await probeListUrl(current.url);
    checked += 1;
    await db.insert(listHealthChecks).values({ ownerId, deviceId: device.id, deviceUrlId: current.id, urlSnapshot: current.url, status: currentResult.status, statusCode: currentResult.statusCode, responseTimeMs: currentResult.responseTimeMs, message: currentResult.message });
    if (currentResult.status === "success") continue;

    let replacement: Candidate | null = null;
    for (const candidate of ordered.slice(1)) {
      const result = await probeListUrl(candidate.url);
      checked += 1;
      await db.insert(listHealthChecks).values({ ownerId, deviceId: device.id, deviceUrlId: candidate.id, urlSnapshot: candidate.url, status: result.status, statusCode: result.statusCode, responseTimeMs: result.responseTimeMs, message: result.message });
      if (result.status === "success") { replacement = candidate; break; }
    }
    if (!replacement || replacement.id === current.id) continue;

    await db.update(devices).set({ activeDeviceUrlId: replacement.id }).where(eq(devices.id, device.id));
    await db.insert(listFailoverEvents).values({ ownerId, deviceId: device.id, fromDeviceUrlId: current.id, toDeviceUrlId: replacement.id, reason: `${current.name} falhou; ${replacement.name} passou no teste automático.` });
    switched += 1;
  }
  return { checked, switched };
}

export async function recordFailoverRun(db: any, settingId: number, result: { checked: number; switched: number }) {
  await db.update(listFailoverSettings).set({ lastRunAt: new Date(), lastStatus: "success", lastError: null }).where(eq(listFailoverSettings.id, settingId));
  return result;
}
