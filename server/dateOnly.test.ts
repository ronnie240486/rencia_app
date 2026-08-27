import { describe, expect, it } from "vitest";
import { dateOnlyForDatabase, daysUntilDateOnly, formatDateOnlyPtBr, toDateOnly } from "../shared/dateOnly";
import { isExpirationNoticeDue } from "./autoNotifications";

describe("datas de vencimento sem deslocamento de fuso", () => {
  it("mantém a data escolhida no calendário", () => {
    expect(toDateOnly("2026-08-12")).toBe("2026-08-12");
    expect(toDateOnly("2026-08-12T00:00:00.000Z")).toBe("2026-08-12");
    expect(toDateOnly(new Date("2026-08-13T00:00:00.000Z"))).toBe("2026-08-13");
  });

  it("prepara a data para salvar sem retroceder o dia", () => {
    const saved = dateOnlyForDatabase("2026-08-12");
    expect(saved.getUTCFullYear()).toBe(2026);
    expect(saved.getUTCMonth()).toBe(7);
    expect(saved.getUTCDate()).toBe(12);
    expect(saved.getUTCHours()).toBe(12);
  });

  it("exibe 12/08 quando a data cadastrada é 12/08", () => {
    expect(formatDateOnlyPtBr("2026-08-12")).toBe("12/08/2026");
  });

  it("identifica exatamente um dia antes do vencimento", () => {
    expect(daysUntilDateOnly("2026-08-12", new Date(2026, 7, 11, 9))).toBe(1);
    expect(daysUntilDateOnly("2026-08-12", new Date(2026, 7, 12, 9))).toBe(0);
  });

  it("libera o aviso automático nos sete dias anteriores ao vencimento", () => {
    expect(isExpirationNoticeDue("2026-08-12", new Date(2026, 7, 11, 9))).toBe(true);
    expect(isExpirationNoticeDue("2026-08-12", new Date(2026, 7, 10, 9))).toBe(true);
    expect(isExpirationNoticeDue("2026-08-12", new Date(2026, 7, 5, 9))).toBe(true);
    expect(isExpirationNoticeDue("2026-08-12", new Date(2026, 7, 4, 9))).toBe(false);
    expect(isExpirationNoticeDue("2026-08-12", new Date(2026, 7, 12, 9))).toBe(true);
  });
});
