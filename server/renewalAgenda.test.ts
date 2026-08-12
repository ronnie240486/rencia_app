import { describe, expect, it } from "vitest";
import { buildRenewalAgenda } from "./renewalAgenda";

describe("agenda de renovação", () => {
  it("classifica vencimentos de hoje, amanhã, próximos e expirados", () => {
    const result = buildRenewalAgenda([
      { id: 1, nomeServer: "Hoje", telefone: "5511999", dataExpiracao: "2026-08-12", status: "Liberado" },
      { id: 2, nomeServer: "Amanhã", telefone: null, dataExpiracao: "2026-08-13", status: "Liberado" },
      { id: 3, nomeServer: "Próximo", telefone: null, dataExpiracao: "2026-08-19", status: "Liberado" },
      { id: 4, nomeServer: "Expirado", telefone: null, dataExpiracao: "2026-08-11", status: "Expirado" },
    ], new Date("2026-08-12T12:00:00Z"));
    expect(result.map((item) => item.bucket)).toEqual(["expired", "today", "tomorrow", "upcoming"]);
    expect(result.find((item) => item.id === 1)?.waUrl).toContain("wa.me/5511999");
  });
});
