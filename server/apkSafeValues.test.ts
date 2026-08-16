import { describe, expect, it } from "vitest";
import { safeApkText } from "./apkSafeValues";

describe("safeApkText", () => {
  it("converte null e undefined em texto vazio", () => {
    expect(safeApkText(null)).toBe("");
    expect(safeApkText(undefined)).toBe("");
  });

  it("preserva textos e converte valores simples sem expor null", () => {
    expect(safeApkText("SportTV HD")).toBe("SportTV HD");
    expect(safeApkText(42)).toBe("42");
  });
});
