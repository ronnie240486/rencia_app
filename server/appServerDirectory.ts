import type { ManagedAppId } from "../shared/appCatalog";

export const CURRENT_PANEL_ORIGIN = "https://renciaapp.manus.space";

export function appServerSettingKey(appId: ManagedAppId) {
  return `app_api_origin_${appId}`;
}

function withoutTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

/** Aceita somente uma origem HTTP(S), removendo /api para evitar rotas duplicadas. */
export function normalizeAppServerOrigin(value: string | null | undefined, fallback = CURRENT_PANEL_ORIGIN) {
  const candidate = value?.trim();
  if (!candidate) return fallback;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" && url.protocol !== "http:") return fallback;
    return withoutTrailingSlash(url.origin);
  } catch {
    return fallback;
  }
}

export function buildAppServerDirectory(appId: ManagedAppId, appName: string, configuredOrigin?: string | null) {
  const origin = normalizeAppServerOrigin(configuredOrigin);
  const prefix = `${origin}/api/v5/apps/${appId}`;
  return {
    app_id: appId,
    app_name: appName,
    api_origin: origin,
    discovery_url: `${prefix}/discovery`,
    config_url: `${prefix}/config`,
    update_url: `${prefix}/update`,
    heartbeat_url: `${origin}/api/v5/heartbeat`,
    migration_ready: Boolean(configuredOrigin?.trim()),
  };
}
