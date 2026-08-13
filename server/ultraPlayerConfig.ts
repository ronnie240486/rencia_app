export type UltraSettings = Record<string, string | undefined>;

export interface UltraImageUrls {
  logoUrl?: string;
  bannerUrl?: string;
  backgroundUrl?: string;
  messageImageUrl?: string;
  liveTvIconUrl?: string;
  moviesIconUrl?: string;
  seriesIconUrl?: string;
}

/** Normaliza MACs com ou sem separadores para AA:BB:CC:DD:EE:FF. */
export function normalizeMacAddress(value: string): string | null {
  const compact = value.trim().toUpperCase().replace(/[^0-9A-F]/g, "");
  if (!/^[0-9A-F]{12}$/.test(compact)) return null;
  return compact.match(/.{2}/g)!.join(":");
}

/** Converte as chaves administrativas em um contrato estável para o APK. */
export function buildUltraPlayerConfig(settings: UltraSettings, images: UltraImageUrls = {}) {
  return {
    app_name: settings.ultra_app_name || "Ultra Player",
    impact_phrase: settings.ultra_impact_phrase || "",
    message_title: settings.ultra_message_title || "",
    message_text: settings.ultra_message_text || "",
    server_api_url: settings.ultra_server_api_url || "",
    apk_download_url: settings.ultra_apk_download_url || "",
    apk_version: settings.ultra_apk_version || "",
    logo_url: images.logoUrl ?? settings.ultra_logo_url ?? "",
    banner_url: images.bannerUrl ?? settings.ultra_banner_url ?? "",
    background_url: images.backgroundUrl ?? settings.ultra_background_url ?? "",
    message_image_url: images.messageImageUrl ?? settings.ultra_message_image_url ?? "",
    icons: {
      live_tv: images.liveTvIconUrl ?? settings.ultra_icon_live_tv_url ?? "",
      movies: images.moviesIconUrl ?? settings.ultra_icon_movies_url ?? "",
      series: images.seriesIconUrl ?? settings.ultra_icon_series_url ?? "",
    },
  };
}
