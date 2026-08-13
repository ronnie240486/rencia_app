import { describe, expect, it } from "vitest";
import { shouldOpenConfirmedListAlert } from "./listAlertDismissal";

describe("fechamento de alerta técnico confirmado", () => {
  const alert = { id: 25, isRead: false, type: "critical", title: "Falha confirmada de lista: Lista 1" };

  it("não reabre o modal com o cache antigo após o usuário marcar como lido", () => {
    expect(shouldOpenConfirmedListAlert(alert, null, [])).toBe(true);
    expect(shouldOpenConfirmedListAlert(alert, null, [25])).toBe(false);
  });
});
