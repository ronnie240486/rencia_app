import { describe, expect, it } from "vitest";
import { dateOnlyForDatabase, daysUntilDateOnly, formatDateOnlyPtBr, toDateOnly } from "./dateOnly";

describe("datas de vencimento sem fuso horário", () => {
  it("preserva o dia escolhido no calendário", () => {
    expect(toDateOnly("2026-08-12")).toBe("2026-08-12");
    expect(toDateOnly("2026-08-12T00:00:00.000Z")).toBe("2026-08-12");
  });

  it("salva a data ao meio-dia local sem avançar ou recuar o dia", () => {
    const saved = dateOnlyForDatabase("2026-08-12");
    expect(saved.getFullYear()).toBe(2026);
    expect(saved.getMonth()).toBe(7);
    expect(saved.getDate()).toBe(12);
    expect(saved.getHours()).toBe(12);
  });

  it("formata a mesma data para o padrão brasileiro", () => {
    expect(formatDateOnlyPtBr("2026-08-12")).toBe("12/08/2026");
  });

  it("reconhece exatamente um dia antes do vencimento", () => {
    expect(daysUntilDateOnly("2026-08-12", new Date(2026, 7, 11, 9))).toBe(1);
    expect(daysUntilDateOnly("2026-08-12", new Date(2026, 7, 12, 9))).toBe(0);
  });
});
