import { lookup } from "node:dns/promises";

export type ListHealthResult = {
  status: "success" | "error" | "pending";
  statusCode: number | null;
  responseTimeMs: number | null;
  message: string;
  /** HTTP 2xx/3xx confirma disponibilidade; 401/403 apenas prova que o host respondeu. */
  responseConfirmed: boolean;
};

/**
 * Alguns provedores bloqueiam HEAD/GET automatizado com 401/403, mesmo quando
 * a lista funciona no APK autenticado. Isso confirma que o servidor respondeu;
 * portanto não deve iniciar failover nem gerar alerta de lista fora.
 */
export function classifyListHttpStatus(statusCode: number, responseTimeMs: number): ListHealthResult {
  if (statusCode >= 200 && statusCode < 400) return { status: "success", statusCode, responseTimeMs, message: "Lista disponível", responseConfirmed: true };
  if (statusCode === 401 || statusCode === 403) return { status: "success", statusCode, responseTimeMs, message: `Servidor protegido (HTTP ${statusCode}); não é falha de lista`, responseConfirmed: false };
  return { status: "error", statusCode, responseTimeMs, message: `Servidor respondeu HTTP ${statusCode}`, responseConfirmed: false };
}

/** Um timeout sozinho não prova que a lista caiu; ele permanece em observação. */
export function classifyListTimeout(responseTimeMs: number): ListHealthResult {
  return { status: "pending", statusCode: null, responseTimeMs, message: "Servidor demorou para responder; mantendo em observação", responseConfirmed: false };
}

/** Uma resposta protegida não é falha, mas também não basta para restaurar a Lista 1. */
export function isConfirmedListResponse(result: ListHealthResult) {
  return result.status === "success" && result.responseConfirmed;
}

/** Uma resposta isolada não deve assustar o operador nem acionar a troca de lista. */
export function hasConfirmedListFailure(recentChecks: Array<{ status: string }>) {
  return recentChecks.length >= 2 && recentChecks[0]?.status === "error" && recentChecks[1]?.status === "error";
}

function isPrivateIpv4(address: string) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) return false;
  const [a, b] = parts;
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

function isBlockedHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host === "::1" || host.startsWith("fe80:") || isPrivateIpv4(host);
}

export async function validateListUrl(value: string, options: { allowCredentials?: boolean } = {}) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { valid: false as const, message: "URL inválida" };
  }
  if (!/^https?:$/.test(url.protocol)) return { valid: false as const, message: "Apenas URLs HTTP ou HTTPS são permitidas" };
  if ((!options.allowCredentials && (url.username || url.password)) || isBlockedHost(url.hostname)) return { valid: false as const, message: "Endereço não permitido para verificação" };

  try {
    const addresses = await lookup(url.hostname, { all: true, verbatim: true });
    if (addresses.some(({ address }) => isBlockedHost(address))) return { valid: false as const, message: "Endereço interno não permitido" };
  } catch {
    return { valid: false as const, message: "Não foi possível resolver o servidor" };
  }

  return { valid: true as const, url: url.toString() };
}

async function retryWithPartialGet(url: string, startedAt: number): Promise<ListHealthResult | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: {
        Range: "bytes=0-1023",
        Accept: "application/x-mpegURL, application/vnd.apple.mpegurl, text/plain, */*",
        "User-Agent": "Mozilla/5.0 (compatible; RenciaListMonitor/1.0)",
      },
    });
    await response.body?.cancel();
    const result = classifyListHttpStatus(response.status, Date.now() - startedAt);
    return result.status === "success" ? { ...result, message: "Lista disponível após resposta lenta" } : result;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export type ProbeListOptions = { requireM3uContent?: boolean; timeoutMs?: number };

export function hasUsableM3uContent(value: string) {
  const sample = value.slice(0, 64 * 1024).toLowerCase();
  return sample.includes("#extm3u") || sample.includes("#extinf:") || (sample.includes("#ext-x-targetduration") && sample.includes("#ext-x-media"));
}

export function isLikelyM3uUrl(value: string) {
  try {
    const url = new URL(value);
    return /\/get\.php$/i.test(url.pathname) || /m3u/i.test(url.pathname) || /(?:^|&)type=m3u/i.test(url.search);
  } catch {
    return false;
  }
}

function looksLikeM3uContent(value: string) {
  return hasUsableM3uContent(value);
}

export async function probeListUrl(value: string, options: ProbeListOptions = {}): Promise<ListHealthResult> {
  const requireM3uContent = options.requireM3uContent === true;
  const validated = await validateListUrl(value, { allowCredentials: requireM3uContent });
  if (!validated.valid) return { status: "error", statusCode: null, responseTimeMs: null, message: validated.message, responseConfirmed: false };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 7_000);
  const startedAt = Date.now();
  try {
    let response = requireM3uContent
      ? await fetch(validated.url, { method: "GET", redirect: "manual", signal: controller.signal, headers: { Range: "bytes=0-65535", Accept: "application/x-mpegURL, application/vnd.apple.mpegurl, text/plain, */*", "User-Agent": "Mozilla/5.0 (compatible; RenciaListMonitor/1.0)" } })
      : await fetch(validated.url, { method: "HEAD", redirect: "manual", signal: controller.signal });
    if ([401, 403, 405, 501].includes(response.status)) {
      response = await fetch(validated.url, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          Range: "bytes=0-1023",
          Accept: "application/x-mpegURL, application/vnd.apple.mpegurl, text/plain, */*",
          "User-Agent": "Mozilla/5.0 (compatible; RenciaListMonitor/1.0)",
        },
      });
      if (!requireM3uContent) await response.body?.cancel();
    }
    const responseTimeMs = Date.now() - startedAt;
    const result = classifyListHttpStatus(response.status, responseTimeMs);
    if (requireM3uContent && result.responseConfirmed) {
      const body = await response.text();
      if (!looksLikeM3uContent(body)) {
        const retryResponse = await fetch(validated.url, { method: "GET", redirect: "manual", signal: controller.signal, headers: { Accept: "application/x-mpegURL, application/vnd.apple.mpegurl, text/plain, */*", "User-Agent": "Mozilla/5.0 (compatible; RenciaListMonitor/1.0)" } });
        const retryBody = await retryResponse.text();
        const retryResult = classifyListHttpStatus(retryResponse.status, Date.now() - startedAt);
        if (retryResult.responseConfirmed && looksLikeM3uContent(retryBody)) return retryResult;
        return { ...result, status: "pending", responseConfirmed: false, message: "Servidor respondeu, mas o conteúdo M3U não pôde ser confirmado" };
      }
    }
    return result;
  } catch (error) {
    const responseTimeMs = Date.now() - startedAt;
    if (error instanceof Error && error.name === "AbortError") {
      const retry = await retryWithPartialGet(validated.url, startedAt);
      return retry ?? classifyListTimeout(Date.now() - startedAt);
    }
    return { status: "error", statusCode: null, responseTimeMs, message: "Não foi possível conectar ao servidor", responseConfirmed: false };
  } finally {
    clearTimeout(timeout);
  }
}
