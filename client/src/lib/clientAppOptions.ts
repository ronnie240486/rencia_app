import { MANAGED_APP_CATALOG } from "@shared/appCatalog";

export type ClientAppOption = {
  value: string;
  label: string;
  logoUrl?: string;
};

export const CLIENT_APP_OPTIONS: ClientAppOption[] = [
  { value: "OuroPro", label: "Ouro Pro", logoUrl: MANAGED_APP_CATALOG.ouropro.defaultLogoUrl },
  { value: "Maximus", label: "Maximus Player", logoUrl: MANAGED_APP_CATALOG.maximus.defaultLogoUrl },
  { value: "Ultra Player", label: "Fusion", logoUrl: MANAGED_APP_CATALOG.fusion.defaultLogoUrl },
  { value: "Prestige", label: "Prestige", logoUrl: MANAGED_APP_CATALOG.prestige.defaultLogoUrl },
  { value: "Optimus", label: "Optimus", logoUrl: MANAGED_APP_CATALOG.optimus.defaultLogoUrl },
  { value: "Império Play", label: "Império Play", logoUrl: MANAGED_APP_CATALOG.imperio.defaultLogoUrl },
  { value: "Infinitus", label: "Infinitus", logoUrl: MANAGED_APP_CATALOG.infinitus.defaultLogoUrl },
  { value: "Supremus", label: "Supremus", logoUrl: MANAGED_APP_CATALOG.supremus.defaultLogoUrl },
  { value: "Evolux", label: "Evolux", logoUrl: MANAGED_APP_CATALOG.evolux.defaultLogoUrl },
  { value: "Ominus", label: "Ominus", logoUrl: MANAGED_APP_CATALOG.ominus.defaultLogoUrl },
  { value: "Magnus", label: "Magnus", logoUrl: MANAGED_APP_CATALOG.magnus.defaultLogoUrl },
  { value: "Excellence", label: "Excellence", logoUrl: MANAGED_APP_CATALOG.excellence.defaultLogoUrl },
  { value: "Outro", label: "Outro aplicativo" },
];
