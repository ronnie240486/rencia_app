import { describe, expect, it } from "vitest";
import { buildApkUpdateOverview, compareVersions } from "./apkUpdates";

describe("atualizações de APK", () => {
  it("compara versões numéricas sem comparar texto", () => {
    expect(compareVersions("1.10.0", "1.9.9")).toBeGreaterThan(0);
    expect(compareVersions("2.0", "2.0.0")).toBe(0);
  });
  it("marca somente versões inferiores como desatualizadas", () => {
    const [oldDevice, currentDevice] = buildApkUpdateOverview([
      { id: 1, nomeServer: "TV", app: "OuroPro", appVersion: "5.0", telefone: "5511999", lastSeen: null },
      { id: 2, nomeServer: "Celular", app: "OuroPro", appVersion: "5.5", telefone: null, lastSeen: null },
    ], { ouroPro: "5.5", maximus: "1.0" });
    expect(oldDevice.outdated).toBe(true);
    expect(oldDevice.waUrl).toContain("wa.me/5511999");
    expect(currentDevice.outdated).toBe(false);
  });
});
