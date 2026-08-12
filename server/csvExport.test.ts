import { describe, expect, it } from "vitest";
import { buildCsv } from "../shared/csv";

describe("exportação CSV", () => {
  it("escapa fórmulas e aspas para proteger planilhas", () => {
    const csv = buildCsv(["Nome", "Valor"], [["=SOMA(A1:A2)", 'Cliente "Teste"']]);
    expect(csv).toContain("'=SOMA(A1:A2)");
    expect(csv).toContain('"Cliente ""Teste"""');
  });
});
