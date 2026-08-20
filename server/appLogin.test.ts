import { describe, expect, it } from "vitest";
import { PENDING_LOGIN_MAC, isLoginAccessAllowed, resolveLoginMacBinding } from "./appLogin";

describe("app login access", () => {
  it("autoriza credencial ativa, cliente liberado e sem validade vencida", () => {
    expect(isLoginAccessAllowed({ credentialActive: true, deviceStatus: "Liberado", expirationDate: "2026-12-31" }, new Date("2026-08-20T12:00:00Z"))).toBe(true);
  });

  it("bloqueia credencial desativada, dispositivo bloqueado e validade vencida", () => {
    const now = new Date("2026-08-20T12:00:00Z");
    expect(isLoginAccessAllowed({ credentialActive: false, deviceStatus: "Liberado", expirationDate: null }, now)).toBe(false);
    expect(isLoginAccessAllowed({ credentialActive: true, deviceStatus: "Bloqueado", expirationDate: null }, now)).toBe(false);
    expect(isLoginAccessAllowed({ credentialActive: true, deviceStatus: "Liberado", expirationDate: "2026-08-19" }, now)).toBe(false);
  });

  it("vincula o primeiro MAC válido e impede a troca silenciosa de aparelho", () => {
    const firstBinding = resolveLoginMacBinding(PENDING_LOGIN_MAC, "aabbccddeeff");
    expect(firstBinding).toMatchObject({ accepted: true, mac: "AA:BB:CC:DD:EE:FF", shouldPersist: true });

    const sameDevice = resolveLoginMacBinding("AA:BB:CC:DD:EE:FF", "aa-bb-cc-dd-ee-ff");
    expect(sameDevice).toMatchObject({ accepted: true, shouldPersist: false });

    const anotherDevice = resolveLoginMacBinding("AA:BB:CC:DD:EE:FF", "11:22:33:44:55:66");
    expect(anotherDevice).toMatchObject({ accepted: false, shouldPersist: false });
  });
});
