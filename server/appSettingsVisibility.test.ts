import { describe, expect, it } from "vitest";
import { isAppSettingVisibleToReseller } from "./appSettingsVisibility";

describe("isAppSettingVisibleToReseller", () => {
  it("mantém configurações globais de layout visíveis para a revenda", () => {
    expect(isAppSettingVisibleToReseller(["ouropro"], null)).toBe(true);
  });

  it("mantém apenas as configurações de aplicativos liberados", () => {
    expect(isAppSettingVisibleToReseller(["ouropro"], "ouropro")).toBe(true);
    expect(isAppSettingVisibleToReseller(["ouropro"], "future")).toBe(false);
  });
});
