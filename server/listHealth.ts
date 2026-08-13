import { lookup } from "node:dns/promises";

export type ListHealthResult = {
  status: "success" | "error";
  statusCode: number | null;
  responseTimeMs: number | null;
  message: string;
};

/**
 * Alguns provedores bloqueiam HEAD/GET automatizado com 401/403, mesmo quando
 * a lista funciona no APK autenticado. Isso confirma que o servidor respondeu;
 * portanto não deve iniciar failover nem gerar alerta de lista fora.
 */
export function classifyListHttpStatus(statusCode: number, responseTimeMs: number): ListHealthResult {
  if (statusCode >= 200 && statusCode < 400) return { status: "success", statusCode, responseTimeMs, message: "Lista disponível" };
  if (statusCode === 401 || statusCode === 403) return { status: "success", statusCode, responseTimeMs, message: `Servidor protegido (HTTP ${statusCode}); não é falha de lista` };
  return { status: "error", statusCode, responseTimeMs, message: `Servidor respondeu HTTP ${statusCode}` };
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
    const addresses = await lookup(url.hostname, { all: true, verbatim: true });
    if (addresses.some(({ address }) => isBlockedHost(address))) return { valid: false as const, message: "Endereço interno não permitido" };
  } catch {
    return { valid: false as const, message: "Não foi possível resolver o servidor" };
  }

  return { valid: true as const, url: url.toString() };
}

export async function probeListUrl(value: string): Promise<ListHealthResult> {
  const validated = await validateListUrl(value);
  if (!validated.valid) return { status: "error", statusCode: null, responseTimeMs: null, message: validated.message };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7_000);
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
    const message = error instanceof Error && error.name === "AbortError" ? "Tempo limite de 7 segundos excedido" : "Não foi possível conectar ao servidor";
    return { status: "error", statusCode: null, responseTimeMs: Date.now() - startedAt, message };
  } finally {
    clearTimeout(timeout);
  }
}
