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
