export type PublicAppSlug = "ouropro" | "ultra" | "maximus";

export interface PublicDownloadApp {
  slug: PublicAppSlug;
  name: string;
  version: string;
  downloadUrl: string;
  logoUrl: string;
  accent: "gold" | "violet" | "sky";
}

type Settings = Record<string, string | undefined>;

const FALLBACK_LOGOS: Record<PublicAppSlug, string> = {
  ouropro: "/manus-storage/ouropro_logo_c0c3caef.png",
  ultra: "/manus-storage/ultra-player-logo_efd734bc.png",
  maximus: "",
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
      name: "OuroPro",
      accent: "gold",
      fallbackDownload: settings.apk_download_url,
      fallbackVersion: settings.apk_version,
      fallbackLogo: settings.trial_logo_url,
    },
    {
      slug: "ultra",
      name: "Ultra Player",
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
