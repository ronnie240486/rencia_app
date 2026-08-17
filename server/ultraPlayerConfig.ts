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
  const config = {
    app_name: settings.ultra_app_name === "Ultra Player" ? "Fusion" : (settings.ultra_app_name || "Fusion"),
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
  // Mantém os nomes padronizados e também devolve aliases ultra_ para APKs
  // que já usam os nomes de configuração do painel.
  return {
    ...config,
    ultra_app_name: config.app_name,
    ultra_impact_phrase: config.impact_phrase,
    ultra_message_title: config.message_title,
    ultra_message_text: config.message_text,
    ultra_server_api_url: config.server_api_url,
    ultra_apk_download_url: config.apk_download_url,
    ultra_apk_version: config.apk_version,
    ultra_logo_url: config.logo_url,
    ultra_banner_url: config.banner_url,
    ultra_background_url: config.background_url,
    ultra_message_image_url: config.message_image_url,
    ultra_icon_live_tv_url: config.icons.live_tv,
    ultra_icon_movies_url: config.icons.movies,
    ultra_icon_series_url: config.icons.series,
  };
}
