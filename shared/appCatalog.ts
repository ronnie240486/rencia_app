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
    defaultLogoUrl: "/manus-storage/fusion_80fa0de0.png",
  },
  maximus: {
    id: "maximus",
    displayName: "Maximus Player",
    settingsRoute: "/gpcpro",
    publicSlug: "maximus",
    deviceAliases: ["Maximus", "Maximus Player"],
    defaultLogoUrl: "/manus-storage/maximus-player_0f899c06.png",
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
    defaultLogoUrl: "/manus-storage/imperio-play_cf24839c.png",
  },
  infinitus: {
    id: "infinitus",
    displayName: "Infinitus",
    settingsRoute: "/aplicativos/infinitus",
    publicSlug: "infinitus",
    deviceAliases: ["Infinitus"],
    defaultLogoUrl: "/manus-storage/infinitus_eee744db.webp",
  },
  supremus: {
    id: "supremus",
    displayName: "Supremus",
    settingsRoute: "/aplicativos/supremus",
    publicSlug: "supremus",
    deviceAliases: ["Supremus"],
    defaultLogoUrl: "/manus-storage/supremus_9e4e9049.jpg",
  },
  evolux: {
    id: "evolux",
    displayName: "Evolux",
    settingsRoute: "/aplicativos/evolux",
    publicSlug: "evolux",
    deviceAliases: ["Evolux"],
    defaultLogoUrl: "/manus-storage/evolux_7ea8a0fc.png",
  },
  ominus: {
    id: "ominus",
    displayName: "Ominus",
    settingsRoute: "/aplicativos/ominus",
    publicSlug: "ominus",
    deviceAliases: ["Ominus"],
    defaultLogoUrl: "",
  },
  magnus: {
    id: "magnus",
    displayName: "Magnus",
    settingsRoute: "/aplicativos/magnus",
    publicSlug: "magnus",
    deviceAliases: ["Magnus", "Magnus TV"],
    defaultLogoUrl: "",
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
