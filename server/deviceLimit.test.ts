import { describe, expect, it } from "vitest";
import { getEnforcedDeviceLimit } from "./deviceLimit";

describe("getEnforcedDeviceLimit", () => {
  it("mantém o limite configurado de uma revenda", () => {
    expect(getEnforcedDeviceLimit(50)).toBe(50);
    expect(getEnforcedDeviceLimit("50")).toBe(50);
  });

  it("não transforma ausência de limite em 999", () => {
    expect(() => getEnforcedDeviceLimit(undefined)).toThrow("Limite de dispositivos inválido");
    expect(() => getEnforcedDeviceLimit(0)).toThrow("Limite de dispositivos inválido");
  });
});
