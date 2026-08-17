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
  });
});
