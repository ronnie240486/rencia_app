import { isManagedAppId, MANAGED_APP_CATALOG } from "../shared/appCatalog";

export type GenericAppSettings = Record<string, string | undefined>;

export type AppBoundDevice = { app: string | null };

/**
 * Um mesmo aparelho pode permanecer cadastrado em mais de um aplicativo.
 * A rota do APK deve usar o cadastro correspondente ao app que fez a consulta,
 * e não simplesmente o primeiro MAC encontrado.
 */
export function findDeviceForManagedApp<T extends AppBoundDevice>(devices: T[], aliases: readonly string[]): T | undefined {
  const normalizedAliases = new Set(aliases.map(alias => alias.trim().toLocaleLowerCase("pt-BR")));
  return devices.find(device => normalizedAliases.has((device.app || "").trim().toLocaleLowerCase("pt-BR")));
}

export function buildGenericAppConfig(appId: string, displayName: string, settings: GenericAppSettings, playlistUrls: string[], urlEpg = "") {
  const prefix = `${appId}_`;
  const text = (suffix: string, fallback = "") => settings[`${prefix}${suffix}`] || fallback;
  const defaultLogoUrl = isManagedAppId(appId) ? MANAGED_APP_CATALOG[appId].defaultLogoUrl : "";
  return {
    app_id: appId,
    app_name: text("app_name", displayName),
    impact_phrase: text("impact_phrase"),
    message_title: text("message_title"),
    message_text: text("message_text"),
    server_api_url: text("server_api_url"),
    apk_download_url: text("apk_download_url"),
    apk_version: text("apk_version"),
    block_title: text("block_title"),
    block_message: text("block_message"),
    renew_button_text: text("renew_button_text"),
    renew_button_url: text("renew_button_url"),
    reseller_email: text("reseller_email"),
    logo_url: text("logo_url", defaultLogoUrl),
    banner_url: text("banner_url"),
    background_url: text("background_url"),
    message_image_url: text("message_image_url"),
    icons: {
      live_tv: text("icon_live_tv_url"),
      movies: text("icon_movies_url"),
      series: text("icon_series_url"),
    },
    player: {
      auto_play_last_channel: text("auto_play_last_channel", "true") === "true",
      auto_rotate: text("auto_rotate", "false") === "true",
      current_plan: text("current_plan", "Premium"),
      quality: text("quality", "1080p"),
      subtitles: text("subtitles", "Português"),
      audio_track: text("audio_track", "Português"),
      image_ratio: text("image_ratio", "16:9"),
      buffer_size: text("buffer_size", "Médio"),
      retry_attempts: Number(text("retry_attempts", "3")) || 3,
      show_most_watched: text("show_most_watched", "true") === "true",
      show_recently_watched: text("show_recently_watched", "true") === "true",
      language: text("language", "pt-BR"),
      contact_email: text("contact_email"),
    },
    playlist_urls: playlistUrls.filter(Boolean),
    urlEpg: urlEpg || "",
  };
}
