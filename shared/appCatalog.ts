export type ManagedAppId = "ouropro" | "fusion" | "maximus" | "prestige" | "optimus" | "imperio" | "infinitus" | "supremus" | "evolux" | "ominus" | "magnus" | "excellence" | "nexus";

export const APP_CONFIGURATION_FEATURES = [
  "logo", "banner", "background", "message", "content_icons", "playlist", "mac_integration", "updates",
] as const;

export const MANAGED_APP_CATALOG = {
  ouropro: {
    id: "ouropro",
    displayName: "Ouro Pro",
    settingsRoute: "/settings",
    publicSlug: "ouropro",
    deviceAliases: ["OuroPro", "Ouro Pro"],
    defaultLogoUrl: "/manus-storage/ouropro_logo_c0c3caef.png",
  },
  fusion: {
    id: "fusion",
    displayName: "Fusion",
    settingsRoute: "/ultra-player",
    publicSlug: "ultra",
    deviceAliases: ["Ultra Player", "Fusion"],
    defaultLogoUrl: "/manus-storage/fusion-logo-20260827_e8316aa1.jpg",
  },
  maximus: {
    id: "maximus",
    displayName: "Maximus Player",
    settingsRoute: "/gpcpro",
    publicSlug: "maximus",
    deviceAliases: ["Maximus", "Maximus Player"],
    defaultLogoUrl: "/manus-storage/maximus-logo-20260827_4590e4b0.jpg",
  },
  prestige: {
    id: "prestige",
    displayName: "Prestige",
    settingsRoute: "/aplicativos/prestige",
    publicSlug: "prestige",
    deviceAliases: ["Prestige"],
    defaultLogoUrl: "/manus-storage/prestige_60f80d9e.jpg",
  },
  optimus: {
    id: "optimus",
    displayName: "Optimus",
    settingsRoute: "/aplicativos/optimus",
    publicSlug: "optimus",
    deviceAliases: ["Optimus"],
    defaultLogoUrl: "/manus-storage/optimus-logo-20260826_bbe6e127.jpg",
  },
  imperio: {
    id: "imperio",
    displayName: "Império Play",
    settingsRoute: "/aplicativos/imperio",
    publicSlug: "imperio",
    deviceAliases: ["Império Play", "Imperio Play"],
    defaultLogoUrl: "/manus-storage/imperio-logo-20260827_2545f412.jpg",
  },
  infinitus: {
    id: "infinitus",
    displayName: "Infinitus",
    settingsRoute: "/aplicativos/infinitus",
    publicSlug: "infinitus",
    deviceAliases: ["Infinitus"],
    defaultLogoUrl: "/manus-storage/infinitus-logo-20260827_4434c640.jpg",
  },
  supremus: {
    id: "supremus",
    displayName: "Supreme",
    settingsRoute: "/aplicativos/supremus",
    publicSlug: "supremus",
    deviceAliases: ["Supremus", "Supreme"],
    defaultLogoUrl: "/manus-storage/supremus-logo-20260827_ff5b5921.jpg",
  },
  evolux: {
    id: "evolux",
    displayName: "Evolux",
    settingsRoute: "/aplicativos/evolux",
    publicSlug: "evolux",
    deviceAliases: ["Evolux"],
    defaultLogoUrl: "/manus-storage/evolux-logo-20260827_48de561d.jpg",
  },
  ominus: {
    id: "ominus",
    displayName: "Ominus",
    settingsRoute: "/aplicativos/ominus",
    publicSlug: "ominus",
    deviceAliases: ["Ominus"],
    defaultLogoUrl: "/manus-storage/ominus-logo-20260827_e24d6cd3.jpg",
  },
  magnus: {
    id: "magnus",
    displayName: "Magnus",
    settingsRoute: "/aplicativos/magnus",
    publicSlug: "magnus",
    deviceAliases: ["Magnus", "Magnus TV"],
    defaultLogoUrl: "/manus-storage/magnus-logo-20260827_850f6f6f.jpg",
  },
  excellence: {
    id: "excellence",
    displayName: "Excellence",
    settingsRoute: "/aplicativos/excellence",
    publicSlug: "excellence",
    deviceAliases: ["Excellence"],
    defaultLogoUrl: "",
  },
  nexus: {
    id: "nexus",
    displayName: "Nexus",
    settingsRoute: "/aplicativos/nexus",
    publicSlug: "nexus",
    deviceAliases: ["Nexus", "Nexus Player"],
    defaultLogoUrl: "",
  },
} as const;

export const NEW_MANAGED_APP_IDS: ManagedAppId[] = ["prestige", "optimus", "imperio", "infinitus", "supremus", "evolux", "ominus", "magnus", "excellence", "nexus"];

export function isManagedAppId(value: string): value is ManagedAppId {
  return Object.prototype.hasOwnProperty.call(MANAGED_APP_CATALOG, value);
}

export function isFusionDeviceApp(value: string | null | undefined) {
  return MANAGED_APP_CATALOG.fusion.deviceAliases.includes((value || "").trim() as "Ultra Player" | "Fusion");
}
