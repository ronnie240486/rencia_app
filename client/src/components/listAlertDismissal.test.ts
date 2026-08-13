import { describe, expect, it } from "vitest";
import { getActiveConfirmedListAlerts } from "./listAlertDismissal";

describe("fechamento de alerta técnico confirmado", () => {
  const alert = { id: 25, isRead: false, type: "critical", title: "Falha confirmada de lista: Lista 1" };

  it("consolida os alertas ativos e remove os já dispensados do resumo", () => {
    const secondAlert = { id: 26, isRead: false, type: "critical", title: "Falha confirmada de lista: Lista 2" };
    expect(getActiveConfirmedListAlerts([alert, secondAlert], [])).toHaveLength(2);
    expect(getActiveConfirmedListAlerts([alert, secondAlert], [25])).toEqual([secondAlert]);
  });
});
