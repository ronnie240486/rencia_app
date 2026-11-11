import { and, asc, eq, isNull } from "drizzle-orm";
import { desc } from "drizzle-orm";
import { devices, deviceUrls, dnsEntries, listFailoverEvents, listFailoverSettings, listHealthChecks, serverMaintenanceBlocks } from "../drizzle/schema";
import { orderDnsFailoverEntries, pickWorkingDns, replaceDnsHost, sanitizeUrlForProbe, selectDnsProfileEntries } from "./dnsFailover";
import { hasConfirmedListFailure, isConfirmedListResponse, probeListUrl } from "./listHealth";
import { syncConfirmedListFailureAlert } from "./listFailureAlerts";

/** O menor intervalo permitido pela plataforma é um minuto. */
export const LIST_FAILOVER_CRON = "0 * * * * *";
/** Mantém o failover sequencial rápido sem considerar resposta lenta como lista válida. */
export const LIST_FAILOVER_PROBE_TIMEOUT_MS = 1_250;
// Quantos clientes a varredura testa ao mesmo tempo (o resto espera na fila).
export const LIST_FAILOVER_CONCURRENCY = 6;

type Candidate = { id: number | null; name: string; url: string; profile?: string | null };

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

// Anti-enchente: a varredura roda todo minuto para todos os clientes. Gravar um "sucesso" por teste lotava
// o banco (milhares de linhas/hora) e travava o painel. Sucesso repetido é gravado no máximo a cada 10 min;
// erro e a virada de erro para sucesso sempre são gravados (a troca de lista depende deles).
const lastHealthWrite = new Map<string, { status: string; at: number }>();
const SUCCESS_WRITE_EVERY_MS = 10 * 60_000;

async function mapWithLimit<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const item = items[next++];
      try { await worker(item); } catch (error) { console.error("[list-failover] erro em um cliente:", error); }
    }
  }));
}

async function recordAutomaticListHealthCheck(db: any, ownerId: number, device: any, candidate: Candidate, result: any) {
  const key = `${device.id}|${candidate.id ?? "main"}|${candidate.url}`;
  const previous = lastHealthWrite.get(key);
  const now = Date.now();
  const skipWrite = result.status === "success" && previous?.status === "success" && now - previous.at < SUCCESS_WRITE_EVERY_MS;
  if (!skipWrite) lastHealthWrite.set(key, { status: result.status, at: now });
  if (skipWrite) return;
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

// Registra no histórico do Monitor de Listas. Falha ao gravar nunca pode derrubar a varredura.
export async function logFailoverEvent(db: any, ownerId: number, deviceId: number, fromDeviceUrlId: number | null, toDeviceUrlId: number | null, reason: string) {
  try {
    await db.insert(listFailoverEvents).values({ ownerId, deviceId, fromDeviceUrlId, toDeviceUrlId, reason: reason.slice(0, 480) });
  } catch (error) {
    console.error("[ListFailover] não foi possível gravar o histórico:", error);
  }
}

// Evita encher o histórico com a mesma mensagem a cada minuto.
async function logFailoverEventOnce(db: any, ownerId: number, deviceId: number, reason: string, withinMinutes = 30) {
  try {
    const [last] = await db.select().from(listFailoverEvents).where(and(eq(listFailoverEvents.ownerId, ownerId), eq(listFailoverEvents.deviceId, deviceId))).orderBy(desc(listFailoverEvents.createdAt)).limit(1);
    if (last && last.reason === reason.slice(0, 480) && Date.now() - new Date(last.createdAt).getTime() < withinMinutes * 60_000) return;
  } catch { /* segue e tenta gravar */ }
  await logFailoverEvent(db, ownerId, deviceId, null, null, reason);
}

export async function runListFailoverSweep(db: any, ownerId: number) {
  const deviceRows = await db.select().from(devices).where(and(eq(devices.ownerId, ownerId), eq(devices.listFailoverEnabled, true)));
  const blocks = await db.select({ host: serverMaintenanceBlocks.host }).from(serverMaintenanceBlocks).where(and(eq(serverMaintenanceBlocks.ownerId, ownerId), eq(serverMaintenanceBlocks.active, true)));
  const blockedHosts = blocks.map((block: { host: string }) => block.host.replace(/\/+$/, ""));
  let checked = 0;
  let switched = 0;

  await mapWithLimit(deviceRows, LIST_FAILOVER_CONCURRENCY, async (device: any) => {
    const extras = await db.select().from(deviceUrls).where(and(eq(deviceUrls.deviceId, device.id), eq(deviceUrls.ativo, true))).orderBy(asc(deviceUrls.ordem));
    const candidates: Candidate[] = [
      ...(device.urlM3u8 ? [{ id: null, name: "Lista 1", url: device.urlM3u8, profile: device.nomeServidor ?? null }] : []),
      ...extras.map((list: any): Candidate => ({ id: list.id as number, name: list.nome || `Lista ${list.ordem + 2}`, url: (list.urlM3u8 || list.xtServer || "").trim(), profile: list.nomeServidor ?? null })).filter((candidate: Candidate) => Boolean(candidate.url)),
    ].filter((candidate) => !blockedHosts.some((host: string) => candidate.url.startsWith(host)));
    if (!candidates.length) return;

    const ordered = orderFailoverCandidates(candidates, device.activeDeviceUrlId ?? null);
    const current = ordered[0];
    const primary = candidates[0];
    if (current.id !== primary.id) {
      const primaryResult = await probeListUrl(primary.url, { requireM3uContent: true, timeoutMs: LIST_FAILOVER_PROBE_TIMEOUT_MS });
      checked += 1;
      await recordAutomaticListHealthCheck(db, ownerId, device, primary, primaryResult);
      // A Lista 1 só volta quando uma resposta 2xx/3xx confirma que ela realmente voltou.
      if (isConfirmedListResponse(primaryResult)) {
        await db.update(devices).set({ activeDeviceUrlId: primary.id }).where(eq(devices.id, device.id));
        await logFailoverEvent(db, ownerId, device.id, current.id, primary.id, `${primary.name} voltou a responder (testada pelo painel); lista principal reativada.`);
        switched += 1;
        return;
      }
    }
    const currentResult = await probeListUrl(current.url, { requireM3uContent: true, timeoutMs: LIST_FAILOVER_PROBE_TIMEOUT_MS });
    checked += 1;
    await recordAutomaticListHealthCheck(db, ownerId, device, current, currentResult);
    // Só 2xx/3xx confirma que a DNS atual entrega a lista. Respostas 401/403,
    // embora provem que o host respondeu, devem permitir testar DNS alternativas.
    if (isConfirmedListResponse(currentResult)) return;
    // Antes de mudar de playlist, o painel testa em paralelo todas as DNS do mesmo perfil.
    const profileDns = await db.select({ host: dnsEntries.host, grupo: dnsEntries.grupo, ativo: dnsEntries.ativo }).from(dnsEntries).where(eq(dnsEntries.ownerId, ownerId));
    // Cada lista usa o próprio perfil; lista sem perfil descobre o grupo pelo host dela.
    const sameProfile = selectDnsProfileEntries(current.url, profileDns, current.profile);
    let dnsProfileExhausted = false;
    if (sameProfile.length > 1) {
      const probes: Array<{ host: string; status: "success" | "error" }> = [];
      const currentHost = sameProfile.find((entry) => current.url.startsWith(entry.host.replace(/\/+$/, "")))?.host;
      for (const entry of orderDnsFailoverEntries(current.url, sameProfile)) {
        if (currentHost && entry.host.replace(/\/+$/, "") === currentHost.replace(/\/+$/, "")) continue;
        const result = await probeListUrl(replaceDnsHost(current.url, entry.host), { requireM3uContent: true, timeoutMs: LIST_FAILOVER_PROBE_TIMEOUT_MS });
        probes.push({ host: entry.host, status: isConfirmedListResponse(result) ? "success" : "error" });
        if (isConfirmedListResponse(result)) break;
      }
      const workingHost = pickWorkingDns(probes);
      if (workingHost && !current.url.startsWith(workingHost.replace(/\/+$/, ""))) {
        const updatedUrl = replaceDnsHost(current.url, workingHost);
        if (current.id === null) await db.update(devices).set({ urlM3u8: updatedUrl }).where(eq(devices.id, device.id));
        else await db.update(deviceUrls).set({ urlM3u8: updatedUrl }).where(eq(deviceUrls.id, current.id));
        await logFailoverEvent(db, ownerId, device.id, current.id, current.id, `DNS de ${current.name} trocada: ${workingHost.replace(/^https?:\/\//, "")} passou no teste e a lista foi atualizada (mesma lista, outra DNS).`);
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
    for (const candidate of ordered.filter((item) => item.id !== current.id)) {
      const result = await probeListUrl(candidate.url, { requireM3uContent: true, timeoutMs: LIST_FAILOVER_PROBE_TIMEOUT_MS });
      checked += 1;
      await recordAutomaticListHealthCheck(db, ownerId, device, candidate, result);
      if (isConfirmedListResponse(result)) { replacement = candidate; break; }
    }
    if (!replacement || replacement.id === current.id) {
      await logFailoverEventOnce(db, ownerId, device.id, `${current.name} está fora do ar e nenhuma outra lista respondeu ao teste; nada foi trocado.`);
      return;
    }
    await db.update(devices).set({ activeDeviceUrlId: replacement.id }).where(eq(devices.id, device.id));
    await logFailoverEvent(db, ownerId, device.id, current.id, replacement.id, `${current.name} falhou; ${replacement.name} passou no teste automático e foi ativada.`);
    switched += 1;
  });
  return { checked, switched };
}

export async function recordFailoverRun(db: any, settingId: number, result: { checked: number; switched: number }) {
  await db.update(listFailoverSettings).set({ lastRunAt: new Date(), lastStatus: "success", lastError: null }).where(eq(listFailoverSettings.id, settingId));
  return result;
}
