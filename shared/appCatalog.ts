export type ManagedAppId = "ouropro" | "fusion" | "maximus";

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
} as const;

export function isFusionDeviceApp(value: string | null | undefined) {
  return MANAGED_APP_CATALOG.fusion.deviceAliases.includes((value || "").trim() as "Ultra Player" | "Fusion");
}
