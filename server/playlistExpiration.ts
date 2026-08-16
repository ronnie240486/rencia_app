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

/** Aceita timestamp Unix, ISO, YYYY-MM-DD e datas usuais retornadas por provedores IPTV. */
export function parseProviderExpiration(value: unknown): string | null {
  if (value === null || value === undefined || value === "" || value === "0") return null;
  const raw = String(value).trim();
  if (!raw) return null;

  if (/^\d{10,13}$/.test(raw)) {
    const numeric = Number(raw);
    return formatDateOnly(new Date(raw.length === 10 ? numeric * 1000 : numeric));
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

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

function expirationFromPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const userInfo = record.user_info && typeof record.user_info === "object"
    ? record.user_info as Record<string, unknown>
    : record;
  return parseProviderExpiration(
    userInfo.exp_date ?? userInfo.expiration_date ?? userInfo.expires_at ?? userInfo.expiry_date,
  );
}

function expirationFromText(text: string) {
  const match = text.match(/(?:exp_date|expiration_date|expires_at|expiry_date)\s*[=:]\s*["']?([^"'\s,&<]+)/i);
  return match ? parseProviderExpiration(match[1]) : null;
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
