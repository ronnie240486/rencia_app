export type ManagedAppId = "ouropro" | "fusion" | "maximus" | "prestige" | "optimus" | "imperio" | "infinitus" | "supremus" | "evolux";

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
  },
  fusion: {
    id: "fusion",
    displayName: "Fusion",
    settingsRoute: "/ultra-player",
    publicSlug: "ultra",
    deviceAliases: ["Ultra Player", "Fusion"],
  },
  maximus: {
    id: "maximus",
    displayName: "Maximus Player",
    settingsRoute: "/gpcpro",
    publicSlug: "maximus",
    deviceAliases: ["Maximus", "Maximus Player"],
  },
  prestige: {
    id: "prestige",
    displayName: "Prestige",
    settingsRoute: "/aplicativos/prestige",
    publicSlug: "prestige",
    deviceAliases: ["Prestige"],
  },
  optimus: {
    id: "optimus",
    displayName: "Optimus",
    settingsRoute: "/aplicativos/optimus",
    publicSlug: "optimus",
    deviceAliases: ["Optimus"],
  },
  imperio: {
    id: "imperio",
    displayName: "Império Play",
    settingsRoute: "/aplicativos/imperio",
    publicSlug: "imperio",
    deviceAliases: ["Império Play", "Imperio Play"],
  },
  infinitus: {
    id: "infinitus",
    displayName: "Infinitus",
    settingsRoute: "/aplicativos/infinitus",
    publicSlug: "infinitus",
    deviceAliases: ["Infinitus"],
  },
  supremus: {
    id: "supremus",
    displayName: "Supremus",
    settingsRoute: "/aplicativos/supremus",
    publicSlug: "supremus",
    deviceAliases: ["Supremus"],
  },
  evolux: {
    id: "evolux",
    displayName: "Evolux",
    settingsRoute: "/aplicativos/evolux",
    publicSlug: "evolux",
    deviceAliases: ["Evolux"],
  },
} as const;

export const NEW_MANAGED_APP_IDS: ManagedAppId[] = ["prestige", "optimus", "imperio", "infinitus", "supremus", "evolux"];

export function isManagedAppId(value: string): value is ManagedAppId {
  return Object.prototype.hasOwnProperty.call(MANAGED_APP_CATALOG, value);
}

export function isFusionDeviceApp(value: string | null | undefined) {
  return MANAGED_APP_CATALOG.fusion.deviceAliases.includes((value || "").trim() as "Ultra Player" | "Fusion");
}
