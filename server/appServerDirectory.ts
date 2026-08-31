import type { ManagedAppId } from "../shared/appCatalog";

export const CURRENT_PANEL_ORIGIN = "https://renciaapp.manus.space";
export const FALLBACK_PANEL_ORIGIN = "https://renciaapp-production.up.railway.app";

export function appServerSettingKey(appId: ManagedAppId) {
  return `app_api_origin_${appId}`;
}

export function appServerFallbackSettingKey(appId: ManagedAppId) {
  return `app_api_fallback_origin_${appId}`;
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

export function buildAppServerDirectory(appId: ManagedAppId, appName: string, configuredOrigin?: string | null, configuredFallbackOrigin?: string | null) {
  const primaryOrigin = normalizeAppServerOrigin(configuredOrigin, CURRENT_PANEL_ORIGIN);
  const fallbackOrigin = normalizeAppServerOrigin(configuredFallbackOrigin, FALLBACK_PANEL_ORIGIN);
  const origins = [primaryOrigin, fallbackOrigin].filter((origin, index, all) => all.indexOf(origin) === index);
  const primaryPrefix = `${primaryOrigin}/api/v5/apps/${appId}`;
  return {
    app_id: appId,
    app_name: appName,
    api_origin: primaryOrigin,
    primary_api_origin: primaryOrigin,
    fallback_api_origin: fallbackOrigin,
    api_origins: origins,
    discovery_url: `${primaryPrefix}/discovery`,
    config_url: `${primaryPrefix}/config`,
    update_url: `${primaryPrefix}/update`,
    heartbeat_url: `${primaryOrigin}/api/v5/heartbeat`,
    migration_ready: Boolean(configuredOrigin?.trim() || configuredFallbackOrigin?.trim()),
  };
}
