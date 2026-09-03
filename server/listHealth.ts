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

export async function validateListUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { valid: false as const, message: "URL inválida" };
  }
  if (!/^https?:$/.test(url.protocol)) return { valid: false as const, message: "Apenas URLs HTTP ou HTTPS são permitidas" };
  if (url.username || url.password || isBlockedHost(url.hostname)) return { valid: false as const, message: "Endereço não permitido para verificação" };

  try {
    // Alguns domínios de IPTV ficam sem resposta no resolvedor; sem limite,
    // cada DNS bloqueia toda a resposta do guim.php e o APK fica carregando.
    const lookupTimeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("DNS lookup timeout")), 1_200));
    const addresses = await Promise.race([
      lookup(url.hostname, { all: true, verbatim: true }),
      lookupTimeout,
    ]);
    if (addresses.some(({ address }) => isBlockedHost(address))) return { valid: false as const, message: "Endereço interno não permitido" };
  } catch {
    return { valid: false as const, message: "Não foi possível resolver o servidor" };
  }

  return { valid: true as const, url: url.toString() };
}

async function retryWithPartialGet(url: string, startedAt: number, timeoutMs: number): Promise<ListHealthResult | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
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

export type ProbeListOptions = {
  timeoutMs?: number;
  retryTimeoutMs?: number;
  retryOnTimeout?: boolean;
};

export async function probeListUrl(value: string, options: ProbeListOptions = {}): Promise<ListHealthResult> {
  const validated = await validateListUrl(value);
  if (!validated.valid) return { status: "error", statusCode: null, responseTimeMs: null, message: validated.message, responseConfirmed: false };

  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? 7_000;
  const retryTimeoutMs = options.retryTimeoutMs ?? 10_000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();
  try {
    let response = await fetch(validated.url, { method: "HEAD", redirect: "manual", signal: controller.signal });
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
      await response.body?.cancel();
    }
    const responseTimeMs = Date.now() - startedAt;
    return classifyListHttpStatus(response.status, responseTimeMs);
  } catch (error) {
    const responseTimeMs = Date.now() - startedAt;
    if (error instanceof Error && error.name === "AbortError") {
      const retry = options.retryOnTimeout === false ? null : await retryWithPartialGet(validated.url, startedAt, retryTimeoutMs);
      return retry ?? classifyListTimeout(Date.now() - startedAt);
    }
    return { status: "error", statusCode: null, responseTimeMs, message: "Não foi possível conectar ao servidor", responseConfirmed: false };
  } finally {
    clearTimeout(timeout);
  }
}
