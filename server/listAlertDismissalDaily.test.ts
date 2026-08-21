import { describe, expect, it } from "vitest";
import { currentListAlertDay, getActiveConfirmedListAlerts, hasPresentedListAlertSummary, listAlertSummaryStorageKey, parseDismissedListAlertIds } from "../client/src/components/listAlertDismissal";

describe("fechamento de alerta técnico confirmado", () => {
  const alert = { id: 25, isRead: false, type: "critical", title: "Falha confirmada de lista: Lista 1" };

  it("consolida os alertas ativos e remove os já dispensados do resumo", () => {
    const secondAlert = { id: 26, isRead: false, type: "critical", title: "Falha confirmada de lista: Lista 2" };
    expect(getActiveConfirmedListAlerts([alert, secondAlert], [])).toHaveLength(2);
    expect(getActiveConfirmedListAlerts([alert, secondAlert], [25])).toEqual([secondAlert]);
  });

  it("recupera somente identificadores válidos já reconhecidos na sessão", () => {
    expect(parseDismissedListAlertIds("[25, 25, 0, \"26\", 31]")).toEqual([25, 31]);
    expect(parseDismissedListAlertIds("conteúdo inválido")).toEqual([]);
  });

  it("apresenta o resumo apenas uma vez no mesmo dia", () => {
    const day = currentListAlertDay(new Date(2026, 7, 21));
    expect(hasPresentedListAlertSummary(null, day)).toBe(false);
    expect(hasPresentedListAlertSummary(day, day)).toBe(true);
    expect(hasPresentedListAlertSummary("2026-08-20", day)).toBe(false);
    expect(listAlertSummaryStorageKey(42)).toContain("42");
  });
});
