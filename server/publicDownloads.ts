export type PublicAppSlug = "ouropro" | "ultra" | "maximus" | "prestige" | "optimus" | "imperio" | "infinitus" | "supremus" | "evolux" | "ominus" | "magnus" | "excellence" | "future";

export interface PublicDownloadApp {
  slug: PublicAppSlug;
  name: string;
  version: string;
  downloadUrl: string;
  isAvailable: boolean;
  downloaderCode: string;
  aftvUrl: string;
  logoUrl: string;
  accent: "gold" | "violet" | "sky" | "rose" | "emerald" | "orange" | "indigo" | "pink" | "cyan";
}

type Settings = Record<string, string | undefined>;

const FALLBACK_LOGOS: Record<PublicAppSlug, string> = {
  ouropro: "/manus-storage/ouropro_logo_c0c3caef.png",
  ultra: "/manus-storage/fusion-logo-20260827_e8316aa1.jpg",
  maximus: "/manus-storage/maximus-logo-20260827_4590e4b0.jpg",
  prestige: "/manus-storage/prestige-logo-20260827_603ddb54.png",
  optimus: "/manus-storage/optimus-logo-20260826_bbe6e127.jpg",
  imperio: "/manus-storage/imperio-logo-20260827_2545f412.jpg",
  infinitus: "/manus-storage/infinitus-logo-20260827_4434c640.jpg",
  supremus: "/manus-storage/supremus-logo-20260827_ff5b5921.jpg",
  evolux: "/manus-storage/evolux-logo-20260827_48de561d.jpg",
  ominus: "/manus-storage/ominus-logo-20260827_e24d6cd3.jpg",
  magnus: "/manus-storage/magnus-logo-20260827_850f6f6f.jpg",
  excellence: "/manus-storage/excellence-logo-20260827_31e22412.png",
  future: "/manus-storage/future-logo-20260827_1a714bae.jpg",
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

/** Constrói o catálogo público sem inventar links ou códigos que ainda não foram configurados. */
export function buildPublicDownloadApps(settings: Settings): PublicDownloadApp[] {
  const definitions: Array<Omit<PublicDownloadApp, "version" | "downloadUrl" | "isAvailable" | "downloaderCode" | "aftvUrl" | "logoUrl"> & {
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
    { slug: "supremus", name: "Supreme", accent: "pink", fallbackDownload: settings.supremus_apk_download_url, fallbackVersion: settings.supremus_apk_version, fallbackLogo: settings.supremus_logo_url },
    { slug: "evolux", name: "Evolux", accent: "cyan", fallbackDownload: settings.evolux_apk_download_url, fallbackVersion: settings.evolux_apk_version, fallbackLogo: settings.evolux_logo_url },
    { slug: "ominus", name: "Ominus", accent: "indigo", fallbackDownload: settings.ominus_apk_download_url, fallbackVersion: settings.ominus_apk_version, fallbackLogo: settings.ominus_logo_url },
    { slug: "magnus", name: "Magnus", accent: "orange", fallbackDownload: settings.magnus_apk_download_url, fallbackVersion: settings.magnus_apk_version, fallbackLogo: settings.magnus_logo_url },
    { slug: "excellence", name: "Excellence", accent: "violet", fallbackDownload: settings.excellence_apk_download_url, fallbackVersion: settings.excellence_apk_version, fallbackLogo: settings.excellence_logo_url },
    { slug: "future", name: "Future", accent: "cyan", fallbackDownload: settings.future_apk_download_url, fallbackVersion: settings.future_apk_version, fallbackLogo: settings.future_logo_url },
  ];

  return definitions.flatMap((definition) => {
    if (settings[`public_${definition.slug}_active`] === "false") return [];
    const configuredDownload = definition.slug === "ouropro"
      ? (settings.apk_download_url || settings[`public_${definition.slug}_download_url`])
      : (settings[`public_${definition.slug}_download_url`] || definition.fallbackDownload);
    const configuredVersion = definition.slug === "ouropro"
      ? (settings.apk_version || settings[`public_${definition.slug}_version`])
      : (settings[`public_${definition.slug}_version`] || definition.fallbackVersion);
    const downloadUrl = safePublicUrl(configuredDownload);
    return [{
      slug: definition.slug,
      name: definition.name,
      accent: definition.accent,
      version: (configuredVersion || "Versão atual").trim(),
      downloadUrl,
      isAvailable: Boolean(downloadUrl),
      downloaderCode: (settings[`public_${definition.slug}_downloader_code`] || "").trim(),
      aftvUrl: safePublicUrl(settings[`public_${definition.slug}_aftv_url`]),
      logoUrl: safePublicUrl(settings[`public_${definition.slug}_logo_url`] || definition.fallbackLogo) || FALLBACK_LOGOS[definition.slug],
    }];
  });
}
