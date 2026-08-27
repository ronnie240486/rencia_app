import { describe, expect, it } from "vitest";
import { APP_CONFIGURATION_FEATURES, isFusionDeviceApp, MANAGED_APP_CATALOG } from "./appCatalog";

describe("catálogo de aplicativos do painel", () => {
  it("mantém Fusion compatível com clientes antigos Ultra Player", () => {
    expect(isFusionDeviceApp("Ultra Player")).toBe(true);
    expect(isFusionDeviceApp("Fusion")).toBe(true);
  });

  it("expõe os recursos comuns para novos aplicativos", () => {
    expect(MANAGED_APP_CATALOG.fusion.displayName).toBe("Fusion");
    expect(APP_CONFIGURATION_FEATURES).toContain("updates");
    expect(MANAGED_APP_CATALOG.infinitus.defaultLogoUrl).toBe("/manus-storage/infinitus-logo-20260827_4434c640.jpg");
    expect(MANAGED_APP_CATALOG.ominus.defaultLogoUrl).toBe("/manus-storage/ominus-logo-20260827_e24d6cd3.jpg");
    expect(MANAGED_APP_CATALOG.magnus.defaultLogoUrl).toBe("/manus-storage/magnus-logo-20260827_850f6f6f.jpg");
    expect(MANAGED_APP_CATALOG.evolux.defaultLogoUrl).toBe("/manus-storage/evolux-logo-20260827_48de561d.jpg");
    expect(MANAGED_APP_CATALOG.maximus.defaultLogoUrl).toBe("/manus-storage/maximus-logo-20260827_4590e4b0.jpg");
    expect(MANAGED_APP_CATALOG.excellence.defaultLogoUrl).toBe("/manus-storage/excellence-logo-20260827_31e22412.png");
    expect(MANAGED_APP_CATALOG.prestige.defaultLogoUrl).toBe("/manus-storage/prestige-logo-20260827_603ddb54.png");
  });

  it("inclui as novas famílias sem quebrar Evolux e Nexus existentes", async () => {
    const { NEW_MANAGED_APP_IDS } = await import("./appCatalog");
    expect(NEW_MANAGED_APP_IDS).toEqual(["prestige", "optimus", "imperio", "infinitus", "supremus", "evolux", "ominus", "magnus", "excellence", "nexus"]);
    expect(MANAGED_APP_CATALOG.ominus.settingsRoute).toBe("/aplicativos/ominus");
    expect(MANAGED_APP_CATALOG.magnus.deviceAliases).toContain("Magnus TV");
    expect(MANAGED_APP_CATALOG.excellence.displayName).toBe("Excellence");
    expect(MANAGED_APP_CATALOG.evolux.displayName).toBe("Evolux");
    expect(MANAGED_APP_CATALOG.nexus.deviceAliases).toContain("Nexus");
  });
});
