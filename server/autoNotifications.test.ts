import { describe, expect, it } from "vitest";
import { buildPanelExpirationNotice } from "./autoNotifications";

describe("buildPanelExpirationNotice", () => {
  const reference = new Date("2026-08-15T12:00:00Z");

  it("cria aviso para cliente que vence amanhã", () => {
    expect(buildPanelExpirationNotice({ nomeServer: "Cliente A", dataExpiracao: "2026-08-16", status: "Liberado" }, reference)).toMatchObject({
      title: "Aviso de Vencimento",
      reason: "expires-tomorrow",
    });
  });

  it("cria aviso para vencimento hoje e acesso vencido", () => {
    expect(buildPanelExpirationNotice({ nomeServer: "Cliente B", dataExpiracao: "2026-08-15", status: "Liberado" }, reference)?.reason).toBe("expires-today");
    expect(buildPanelExpirationNotice({ nomeServer: "Cliente C", dataExpiracao: "2026-08-14", status: "Expirado" }, reference)?.reason).toBe("expired");
  });
});
