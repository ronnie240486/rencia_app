export type GenericAppSettings = Record<string, string | undefined>;

export function buildGenericAppConfig(appId: string, displayName: string, settings: GenericAppSettings, playlistUrls: string[]) {
  const prefix = `${appId}_`;
  const text = (suffix: string, fallback = "") => settings[`${prefix}${suffix}`] || fallback;
  return {
    app_id: appId,
    app_name: text("app_name", displayName),
    impact_phrase: text("impact_phrase"),
    message_title: text("message_title"),
    message_text: text("message_text"),
    server_api_url: text("server_api_url"),
    apk_download_url: text("apk_download_url"),
    apk_version: text("apk_version"),
    logo_url: text("logo_url"),
    banner_url: text("banner_url"),
    background_url: text("background_url"),
    message_image_url: text("message_image_url"),
    icons: {
      live_tv: text("icon_live_tv_url"),
      movies: text("icon_movies_url"),
      series: text("icon_series_url"),
    },
    playlist_urls: playlistUrls.filter(Boolean),
  };
}
