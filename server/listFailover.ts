import { and, asc, eq, isNull } from "drizzle-orm";
import { desc } from "drizzle-orm";
import { devices, deviceUrls, dnsEntries, listFailoverEvents, listFailoverSettings, listHealthChecks, serverMaintenanceBlocks } from "../drizzle/schema";
import { pickWorkingDns, replaceDnsHost, sanitizeUrlForProbe, selectDnsProfileEntries } from "./dnsFailover";
import { hasConfirmedListFailure, isConfirmedListResponse, probeListUrl } from "./listHealth";
import { syncConfirmedListFailureAlert } from "./listFailureAlerts";

export const LIST_FAILOVER_CRON = "0 */10 * * * *";

type Candidate = { id: number | null; name: string; url: string };

/** A troca só pode ocorrer depois de dois erros técnicos seguidos na mesma lista. */
async function hasConfirmedFailoverFailure(db: any, ownerId: number, deviceId: number, candidate: Candidate) {
  const candidateCondition = candidate.id === null
    ? isNull(listHealthChecks.deviceUrlId)
    : eq(listHealthChecks.deviceUrlId, candidate.id);
  const recentChecks = await db.select({ status: listHealthChecks.status })
    .from(listHealthChecks)
    .where(and(
      eq(listHealthChecks.ownerId, ownerId),
      eq(listHealthChecks.deviceId, deviceId),
      candidateCondition,
      eq(listHealthChecks.urlSnapshot, candidate.url),
    ))
    .orderBy(desc(listHealthChecks.checkedAt), desc(listHealthChecks.id))
    .limit(2);
  return hasConfirmedListFailure(recentChecks);
}

async function recordAutomaticListHealthCheck(db: any, ownerId: number, device: any, candidate: Candidate, result: any) {
  await db.insert(listHealthChecks).values({ ownerId, deviceId: device.id, deviceUrlId: candidate.id, urlSnapshot: candidate.url, status: result.status, statusCode: result.statusCode, responseTimeMs: result.responseTimeMs, message: result.message });
  // HTTP 401/403 significa apenas que o servidor protegeu a requisição automática.
  // Não deve fechar uma falha confirmada nem gerar recuperação no painel.
  if (result.status === "success" && !result.responseConfirmed) return;
  await syncConfirmedListFailureAlert(db, ownerId, { deviceId: device.id, deviceUrlId: candidate.id, deviceName: device.nomeServer, listName: candidate.name, url: candidate.url, status: result.status, message: result.message });
}

export function orderFailoverCandidates<T extends { id: number | null }>(candidates: T[], activeId: number | null) {
  const active = candidates.find((candidate) => candidate.id === activeId);
  return active ? [active, ...candidates.filter((candidate) => candidate !== active)] : candidates;
}

export async function runListFailoverSweep(db: any, ownerId: number) {
  const deviceRows = await db.select().from(devices).where(and(eq(devices.ownerId, ownerId), eq(devices.listFailoverEnabled, true)));
  const blocks = await db.select({ host: serverMaintenanceBlocks.host }).from(serverMaintenanceBlocks).where(and(eq(serverMaintenanceBlocks.ownerId, ownerId), eq(serverMaintenanceBlocks.active, true)));
  const blockedHosts = blocks.map((block: { host: string }) => block.host.replace(/\/+$/, ""));
  let checked = 0;
  let switched = 0;

  await Promise.all(deviceRows.map(async (device: any) => {
    const extras = await db.select().from(deviceUrls).where(and(eq(deviceUrls.deviceId, device.id), eq(deviceUrls.ativo, true))).orderBy(asc(deviceUrls.ordem));
    const candidates: Candidate[] = [
      ...(device.urlM3u8 ? [{ id: null, name: "Lista 1", url: device.urlM3u8 }] : []),
      ...extras.map((list: any): Candidate => ({ id: list.id as number, name: list.nome || `Lista ${list.ordem + 2}`, url: (list.urlM3u8 || list.xtServer || "").trim() })).filter((candidate: Candidate) => Boolean(candidate.url)),
    ].filter((candidate) => !blockedHosts.some((host: string) => candidate.url.startsWith(host)));
    if (!candidates.length) return;

    const ordered = orderFailoverCandidates(candidates, device.activeDeviceUrlId ?? null);
    const current = ordered[0];
    const primary = candidates[0];
    if (current.id !== primary.id) {
      const primaryResult = await probeListUrl(primary.url);
      checked += 1;
      await recordAutomaticListHealthCheck(db, ownerId, device, primary, primaryResult);
      // A Lista 1 só volta quando uma resposta 2xx/3xx confirma que ela realmente voltou.
      if (isConfirmedListResponse(primaryResult)) {
        await db.update(devices).set({ activeDeviceUrlId: primary.id }).where(eq(devices.id, device.id));
        await db.insert(listFailoverEvents).values({ ownerId, deviceId: device.id, fromDeviceUrlId: current.id, toDeviceUrlId: primary.id, reason: "Lista 1 recuperada e confirmada no monitoramento automático." });
        switched += 1;
        return;
      }
    }
    const currentResult = await probeListUrl(current.url);
    checked += 1;
    await recordAutomaticListHealthCheck(db, ownerId, device, current, currentResult);
    // Só 2xx/3xx confirma que a DNS atual entrega a lista. Respostas 401/403,
    // embora provem que o host respondeu, devem permitir testar DNS alternativas.
    if (isConfirmedListResponse(currentResult)) return;
    // Antes de mudar de playlist, o painel testa em paralelo todas as DNS do mesmo perfil.
    const profileDns = await db.select({ host: dnsEntries.host, grupo: dnsEntries.grupo, ativo: dnsEntries.ativo }).from(dnsEntries).where(eq(dnsEntries.ownerId, ownerId));
    const sameProfile = selectDnsProfileEntries(current.url, profileDns, device.nomeServidor);
    let dnsProfileExhausted = false;
    if (sameProfile.length > 1) {
      const probes = await Promise.all(sameProfile.filter((entry) => entry.ativo !== false).map(async (entry) => {
        const result = await probeListUrl(sanitizeUrlForProbe(replaceDnsHost(current.url, entry.host)));
        // 401/403 provam que o host está alcançável; o APK pode aceitar a
        // mesma credencial mesmo quando o monitor não recebe 2xx/3xx.
        return { host: entry.host, status: result.status === "success" ? "success" as const : "error" as const };
      }));
      const currentHost = sameProfile.find((entry) => current.url.startsWith(entry.host.replace(/\/+$/, "")))?.host;
      const alternativeProbes = currentHost
        ? probes.filter((probe) => probe.host.replace(/\/+$/, "") !== currentHost.replace(/\/+$/, ""))
        : probes;
      const workingHost = pickWorkingDns(alternativeProbes);
      if (workingHost && !current.url.startsWith(workingHost.replace(/\/+$/, ""))) {
        const updatedUrl = replaceDnsHost(current.url, workingHost);
        if (current.id === null) await db.update(devices).set({ urlM3u8: updatedUrl }).where(eq(devices.id, device.id));
        else await db.update(deviceUrls).set({ urlM3u8: updatedUrl }).where(eq(deviceUrls.id, current.id));
        return;
      }
      if (workingHost) return;
      // Todas as DNS do perfil foram testadas e falharam nesta mesma varredura.
      // Nesse caso a troca de playlist é imediata; não esperar um segundo ciclo.
      dnsProfileExhausted = true;
    }
    // Sem perfil com múltiplas DNS, mantém a proteção contra falso positivo isolado.
    if (!dnsProfileExhausted && !(await hasConfirmedFailoverFailure(db, ownerId, device.id, current))) return;

    let replacement: Candidate | null = null;
    for (const candidate of ordered.slice(1)) {
      const result = await probeListUrl(candidate.url);
      checked += 1;
      await recordAutomaticListHealthCheck(db, ownerId, device, candidate, result);
      if (isConfirmedListResponse(result)) { replacement = candidate; break; }
    }
    if (!replacement || replacement.id === current.id) return;
    const lastEvent = (await db.select().from(listFailoverEvents).where(and(eq(listFailoverEvents.ownerId, ownerId), eq(listFailoverEvents.deviceId, device.id))).orderBy(desc(listFailoverEvents.createdAt)).limit(1))[0];
    if (lastEvent && Date.now() - new Date(lastEvent.createdAt).getTime() < 30 * 60 * 1000) return;

    await db.update(devices).set({ activeDeviceUrlId: replacement.id }).where(eq(devices.id, device.id));
    await db.insert(listFailoverEvents).values({ ownerId, deviceId: device.id, fromDeviceUrlId: current.id, toDeviceUrlId: replacement.id, reason: `${current.name} falhou; ${replacement.name} passou no teste automático.` });
    switched += 1;
  }));
  return { checked, switched };
}

export async function recordFailoverRun(db: any, settingId: number, result: { checked: number; switched: number }) {
  await db.update(listFailoverSettings).set({ lastRunAt: new Date(), lastStatus: "success", lastError: null }).where(eq(listFailoverSettings.id, settingId));
  return result;
}
