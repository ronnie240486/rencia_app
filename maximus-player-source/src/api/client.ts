// InteractivePlayer / OuroPro backend client.
//
// The IPTV panel (`renciaapp.manus.space`) and the Xtream Codes servers
// (extracted from the check_mac response) block cross-origin browser
// requests and sometimes return a different response shape depending on the
// caller's `User-Agent`. We therefore route every JSON call through the
// FastAPI `/api/iptv-proxy` on our own backend — same code path works in the
// web preview, Expo Go and the final APK, and we always get the mobile
// response format regardless of the target platform.

const PROXY_BASE = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/iptv-proxy`;

const PANEL_BASE = 'https://renciaapp.manus.space/api/v5';

const commonHeaders: Record<string, string> = {
  Accept: 'application/json, text/plain, */*',
};

/** Wraps an upstream IPTV URL through the FastAPI proxy. */
export function proxied(url: string): string {
  return `${PROXY_BASE}?url=${encodeURIComponent(url)}`;
}

async function safeJson<T>(res: Response): Promise<T | null> {
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) return null;
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export type Playlist = {
  name: string;
  url: string;
  type?: string;
};

export type MacStatus = {
  authorized: boolean;
  registered: boolean;
  mac: string;
  status?: string;
  expire_date?: string | null;
  playlists?: Playlist[];
  logo_url?: string;
  bg_url?: string;
  banner_url?: string;
  app_name?: string;
  whatsapp_url?: string;
  reseller_contact?: string;
  reseller_whatsapp?: string;
  version?: string;
  apk_link?: string;
  message?: string;
  server_name?: string;
  tipo?: string;
  raw?: Record<string, unknown>;
};

export type PlaybackFailoverResponse = {
  success: boolean;
  switch_applied?: boolean;
  message?: string;
  error?: string;
  active_list_name?: string;
  active_list_number?: number;
  playlist_sync_required?: boolean;
};

/**
 * Normalizes any of the response shapes the panel emits to a single
 * `MacStatus`. Fields observed so far (mobile UA):
 *   found, status, allowed, mac_registered, mac, nomeServer, tipo, app,
 *   urlM3u8, urlEpg, modoSelecao, dataExpiracao, dataCadastro
 * And the alternate (non-mobile) shape:
 *   success, registered, playlists[], logo_url, bg_url, app_name, ...
 */
function normalize(json: any, macFallback: string): MacStatus {
  if (!json || typeof json !== 'object') {
    return { authorized: false, registered: false, mac: macFallback };
  }

  const registered =
    json.mac_registered === true ||
    json.registered === true ||
    json.registered === 1 ||
    json.registered === '1' ||
    json.found === true;

  const allowed =
    json.allowed === true ||
    (json.success !== false && registered);

  // Playlists — support both `playlists[]` and single `urlM3u8`.
  let playlists: Playlist[] | undefined;
  if (Array.isArray(json.playlists) && json.playlists.length > 0) {
    playlists = json.playlists.map((p: any) => ({
      name: p.name || p.playlist_name || 'Playlist',
      url: p.url || p.playlist_url || '',
      type: p.type,
    })).filter((p: Playlist) => !!p.url);
  } else if (typeof json.urlM3u8 === 'string' && json.urlM3u8) {
    playlists = [{ name: json.nomeServer || 'Playlist', url: json.urlM3u8, type: 'm3u_plus' }];
  }

  return {
    authorized: !!(registered && allowed),
    registered: !!registered,
    mac: json.mac || macFallback,
    status: json.status,
    expire_date: json.dataExpiracao || json.expire_date || null,
    playlists,
    logo_url: json.logo_url,
    bg_url: json.bg_url,
    banner_url: json.banner_url,
    app_name: json.app_name || json.app,
    whatsapp_url: json.whatsapp_url,
    reseller_contact: json.reseller_contact,
    reseller_whatsapp: json.reseller_whatsapp,
    version: json.version,
    apk_link: json.apk_link,
    message: json.error || json.message || json.mensagem,
    server_name: json.nomeServer,
    tipo: json.tipo,
    raw: json,
  };
}

export async function checkMac(mac: string): Promise<MacStatus> {
  const upstream = `${PANEL_BASE}/check_mac.php?mac=${encodeURIComponent(mac)}`;
  try {
    const res = await fetch(proxied(upstream), { headers: commonHeaders });
    const json = await safeJson<any>(res);
    if (!json) return { authorized: false, registered: false, mac, message: 'Resposta inválida.' };
    return normalize(json, mac);
  } catch {
    return { authorized: false, registered: false, mac, message: 'Falha de conexão.' };
  }
}

export async function checkExpire(mac: string): Promise<{ expired: boolean; expire_date?: string | null }> {
  const upstream = `${PANEL_BASE}/check_expire.php?mac=${encodeURIComponent(mac)}`;
  try {
    const res = await fetch(proxied(upstream), { headers: commonHeaders });
    const json = await safeJson<any>(res);
    if (!json) return { expired: true };
    return { expired: !!json.expired, expire_date: json.expire_date };
  } catch {
    return { expired: true };
  }
}

/** Reporta erro nativo do player para o painel ativar uma lista reserva sem esperar o cron. */
export async function reportPlaybackFailure(mac: string): Promise<PlaybackFailoverResponse> {
  try {
    const res = await fetch(`${PANEL_BASE}/playback-failure`, {
      method: 'POST',
      headers: { ...commonHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ mac }),
    });
    const json = await safeJson<PlaybackFailoverResponse>(res);
    return json ?? { success: false, error: 'Resposta inválida do painel.' };
  } catch {
    return { success: false, error: 'Não foi possível avisar o painel sobre a falha.' };
  }
}
