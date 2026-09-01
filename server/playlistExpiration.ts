import { validateListUrl } from "./listHealth";

export type PlaylistExpirationInput = {
  modoSelecao: "XTeamCode" | "M3U8";
  urlM3u8?: string;
  xtServer?: string;
  xtUsername?: string;
  xtPassword?: string;
};

export type PlaylistExpirationLookup = {
  found: boolean;
  expirationDate: string | null;
  source: "xtream-player-api" | "playlist-header" | "playlist-body" | "none";
  message: string;
};

type SafeFetch = (input: string, init?: RequestInit) => Promise<Response>;

function formatDateOnly(date: Date) {
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function isValidDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** Aceita timestamp Unix, ISO, YYYY-MM-DD, DD/MM/YYYY e datas usuais retornadas por provedores IPTV. */
export function parseProviderExpiration(value: unknown): string | null {
  if (value === null || value === undefined || value === "" || value === "0") return null;
  const raw = String(value).trim().replace(/^['"]|['"]$/g, "");
  if (!raw || raw === "0" || raw.toLowerCase() === "null") return null;

  if (/^\d{10,13}$/.test(raw)) {
    const numeric = Number(raw);
    return formatDateOnly(new Date(raw.length === 10 ? numeric * 1000 : numeric));
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return isValidDateOnly(raw) ? raw : null;

  const brazilian = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:\s|T|$)/);
  if (brazilian) {
    const [, day, month, year] = brazilian;
    const normalized = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    return isValidDateOnly(normalized) ? normalized : null;
  }

  const parsed = new Date(raw.replace(" ", "T"));
  return formatDateOnly(parsed);
}

function getM3uCredentials(urlValue: string) {
  try {
    const url = new URL(urlValue);
    const username = url.searchParams.get("username") ?? url.searchParams.get("user");
    const password = url.searchParams.get("password") ?? url.searchParams.get("pass");
    return username && password ? { username, password, origin: url.origin } : null;
  } catch {
    return null;
  }
}

export function buildXtreamMetadataUrl(input: PlaylistExpirationInput): string | null {
  let server = "";
  let username = "";
  let password = "";

  if (input.modoSelecao === "XTeamCode") {
    server = input.xtServer?.trim() ?? "";
    username = input.xtUsername?.trim() ?? "";
    password = input.xtPassword?.trim() ?? "";
  } else if (input.urlM3u8?.trim()) {
    const credentials = getM3uCredentials(input.urlM3u8.trim());
    if (credentials) {
      server = credentials.origin;
      username = credentials.username;
      password = credentials.password;
    }
  }

  if (!server || !username || !password) return null;
  const base = server.replace(/\/(?:get|player_api)\.php(?:\?.*)?$/i, "").replace(/\/+$/, "");
  return `${base}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
}

const EXPIRATION_KEYS = [
  "exp_date", "expiration_date", "expires_at", "expiry_date", "expirationDate", "expire_date",
  "expires", "expires_on", "expiresOn", "valid_until", "validUntil", "validade", "data_expiracao",
];

function expirationFromPayload(payload: unknown, depth = 0): string | null {
  if (!payload || typeof payload !== "object" || depth > 3) return null;
  const record = payload as Record<string, unknown>;
  for (const key of EXPIRATION_KEYS) {
    const parsed = parseProviderExpiration(record[key]);
    if (parsed) return parsed;
  }
  for (const key of ["user_info", "user", "account", "data", "result", "info", "metadata"]) {
    const nested = expirationFromPayload(record[key], depth + 1);
    if (nested) return nested;
  }
  return null;
}

function expirationFromText(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = expirationFromPayload(JSON.parse(trimmed));
      if (parsed) return parsed;
    } catch {
      // Continua com a leitura textual para respostas JSON incompletas.
    }
  }

  const keyPattern = new RegExp(`(?:${EXPIRATION_KEYS.join("|")})\\s*[=:]\\s*["']?([^"'\\s,&<>]+)`, "i");
  const keyed = text.match(keyPattern);
  if (keyed) {
    const parsed = parseProviderExpiration(keyed[1]);
    if (parsed) return parsed;
  }

  const natural = text.match(/(?:expira(?:\u00e7\u00e3o|[c\u00e7][a\u00e3]o)?|validade|valid until|expires?)[^0-9]{0,24}(\d{1,2}[\/-]\d{1,2}[\/-]\d{4}|\d{4}-\d{2}-\d{2})/i);
  return natural ? parseProviderExpiration(natural[1]) : null;
}

function expirationFromUrl(urlValue: string) {
  try {
    const url = new URL(urlValue);
    for (const key of EXPIRATION_KEYS) {
      const parsed = parseProviderExpiration(url.searchParams.get(key));
      if (parsed) return parsed;
    }
  } catch {
    // URL já será validada pela consulta principal.
  }
  return null;
}

function success(expirationDate: string, source: PlaylistExpirationLookup["source"]): PlaylistExpirationLookup {
  return {
    found: true,
    expirationDate,
    source,
    message: `Validade encontrada: ${expirationDate.split("-").reverse().join("/")}.`,
  };
}

/**
 * Consulta metadados do provedor sem gravar nada. A gravação só acontece quando o
 * formulário decide usar uma data válida encontrada pela consulta.
 */
export async function lookupPlaylistExpiration(
  input: PlaylistExpirationInput,
  fetcher: SafeFetch = fetch,
): Promise<PlaylistExpirationLookup> {
  const metadataUrl = buildXtreamMetadataUrl(input);
  if (metadataUrl) {
    const validated = await validateListUrl(metadataUrl);
    if (!validated.valid) return { found: false, expirationDate: null, source: "none", message: validated.message };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    try {
      const response = await fetcher(validated.url, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: { Accept: "application/json", "User-Agent": "RenciaExpiryLookup/1.0" },
      });
      if (response.ok) {
        const expirationDate = expirationFromPayload(await response.json().catch(() => null));
        if (expirationDate) return success(expirationDate, "xtream-player-api");
      }
    } catch {
      // A consulta alternativa da URL original abaixo preserva a data manual em caso de falha.
    } finally {
      clearTimeout(timeout);
    }
  }

  const playlistUrl = input.urlM3u8?.trim();
  if (!playlistUrl) {
    return { found: false, expirationDate: null, source: "none", message: "Informe uma lista com URL ou dados XTeam para consultar a validade." };
  }
  const urlExpiration = expirationFromUrl(playlistUrl);
  if (urlExpiration) return success(urlExpiration, "playlist-body");

  const validatedPlaylist = await validateListUrl(playlistUrl);
  if (!validatedPlaylist.valid) return { found: false, expirationDate: null, source: "none", message: validatedPlaylist.message };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetcher(validatedPlaylist.url, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: { Range: "bytes=0-32767", Accept: "application/x-mpegURL, application/vnd.apple.mpegurl, application/json, text/plain, */*", "User-Agent": "RenciaExpiryLookup/1.0" },
    });
    if (!response.ok) return { found: false, expirationDate: null, source: "none", message: "O provedor não liberou a consulta da validade." };

    const headerExpiration = parseProviderExpiration(
      response.headers.get("x-expire-date") ?? response.headers.get("x-expiration-date") ?? response.headers.get("expires") ?? response.headers.get("expiry-date"),
    );
    if (headerExpiration) return success(headerExpiration, "playlist-header");

    const bodyExpiration = expirationFromText(await response.text());
    if (bodyExpiration) return success(bodyExpiration, "playlist-body");
    return { found: false, expirationDate: null, source: "none", message: "O provedor respondeu, mas não informou uma data de validade utilizável." };
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return { found: false, expirationDate: null, source: "none", message: timedOut ? "A consulta demorou demais; a data manual foi preservada." : "Não foi possível consultar a validade; a data manual foi preservada." };
  } finally {
    clearTimeout(timeout);
  }
}
