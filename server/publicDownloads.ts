export type PublicAppSlug = "ouropro" | "ultra" | "maximus" | "prestige" | "optimus" | "imperio" | "infinitus" | "supremus" | "evolux";

export interface PublicDownloadApp {
  slug: PublicAppSlug;
  name: string;
  version: string;
  downloadUrl: string;
  logoUrl: string;
  accent: "gold" | "violet" | "sky" | "rose" | "emerald" | "orange" | "indigo" | "pink" | "cyan";
}

type Settings = Record<string, string | undefined>;

const FALLBACK_LOGOS: Record<PublicAppSlug, string> = {
  ouropro: "/manus-storage/ouropro_logo_c0c3caef.png",
  ultra: "/manus-storage/fusion_80fa0de0.png",
  maximus: "/manus-storage/maximus-player_0f899c06.png",
  prestige: "/manus-storage/prestige_60f80d9e.jpg",
  optimus: "/manus-storage/optimus_7d8289c6.png",
  imperio: "/manus-storage/imperio-play_a4070253.jpg",
  infinitus: "/manus-storage/infinitus_eee744db.webp",
  supremus: "/manus-storage/supremus_9e4e9049.jpg",
  evolux: "/manus-storage/evolux_7ea8a0fc.png",
};

function safePublicUrl(value: string | undefined): string {
  const url = (value || "").trim();
  if (!url) return "";
  if (url.startsWith("/")) return url;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? url : "";
  } catch {
    return "";
  }
}

/** Constrói somente os aplicativos que podem ser exibidos sem autenticação. */
export function buildPublicDownloadApps(settings: Settings): PublicDownloadApp[] {
  const definitions: Array<Omit<PublicDownloadApp, "version" | "downloadUrl" | "logoUrl"> & {
    fallbackDownload?: string;
    fallbackVersion?: string;
    fallbackLogo?: string;
  }> = [
    {
      slug: "ouropro",
      name: "Ouro Pro",
      accent: "gold",
      fallbackDownload: settings.apk_download_url,
      fallbackVersion: settings.apk_version,
      fallbackLogo: settings.trial_logo_url,
    },
    {
      slug: "ultra",
      name: "Fusion",
      accent: "violet",
      fallbackDownload: settings.ultra_apk_download_url,
      fallbackVersion: settings.ultra_apk_version,
      fallbackLogo: settings.ultra_logo_url,
    },
    {
      slug: "maximus",
      name: "Maximus Player",
      accent: "sky",
      fallbackDownload: settings.maximus_download_url || settings.gpcpro_apk_download_url,
      fallbackVersion: settings.maximus_version || settings.gpcpro_apk_version,
      fallbackLogo: settings.maximus_logo_url,
    },
    { slug: "prestige", name: "Prestige", accent: "rose", fallbackDownload: settings.prestige_apk_download_url, fallbackVersion: settings.prestige_apk_version, fallbackLogo: settings.prestige_logo_url },
    { slug: "optimus", name: "Optimus", accent: "emerald", fallbackDownload: settings.optimus_apk_download_url, fallbackVersion: settings.optimus_apk_version, fallbackLogo: settings.optimus_logo_url },
    { slug: "imperio", name: "Império Play", accent: "orange", fallbackDownload: settings.imperio_apk_download_url, fallbackVersion: settings.imperio_apk_version, fallbackLogo: settings.imperio_logo_url },
    { slug: "infinitus", name: "Infinitus", accent: "indigo", fallbackDownload: settings.infinitus_apk_download_url, fallbackVersion: settings.infinitus_apk_version, fallbackLogo: settings.infinitus_logo_url },
    { slug: "supremus", name: "Supremus", accent: "pink", fallbackDownload: settings.supremus_apk_download_url, fallbackVersion: settings.supremus_apk_version, fallbackLogo: settings.supremus_logo_url },
    { slug: "evolux", name: "Evolux", accent: "cyan", fallbackDownload: settings.evolux_apk_download_url, fallbackVersion: settings.evolux_apk_version, fallbackLogo: settings.evolux_logo_url },
  ];

  return definitions.flatMap((definition) => {
    if (settings[`public_${definition.slug}_active`] === "false") return [];
    const downloadUrl = safePublicUrl(settings[`public_${definition.slug}_download_url`] || definition.fallbackDownload);
    if (!downloadUrl) return [];
    return [{
      slug: definition.slug,
      name: definition.name,
      accent: definition.accent,
      version: (settings[`public_${definition.slug}_version`] || definition.fallbackVersion || "Versão atual").trim(),
      downloadUrl,
      logoUrl: safePublicUrl(settings[`public_${definition.slug}_logo_url`] || definition.fallbackLogo) || FALLBACK_LOGOS[definition.slug],
    }];
  });
}
