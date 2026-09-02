import { describe, expect, it } from "vitest";
import { buildMonthlyRevenueReport, formatMonthlyRevenueMessage, previousMonthPeriod } from "./monthlyRevenue";

describe("fechamento mensal da receita", () => {
  it("calcula somente os registros criados no período e separa clientes de servidores", () => {
    const report = buildMonthlyRevenueReport(
      { periodStart: "2026-08-01", periodEnd: "2026-08-31" },
      [
        { id: 1, nomeServer: "Ana", valor: "30.00", status: "Liberado", dataCadastro: "2026-08-03", dataExpiracao: "2026-09-03", playlistCount: 2 },
        { id: 2, nomeServer: "Antigo", valor: "90.00", status: "Expirado", dataCadastro: "2026-07-31", dataExpiracao: "2026-08-01", playlistCount: 1 },
      ],
      [{ id: 7, nome: "Servidor A", valor: "20.00", paymentStatus: "paid", createdAt: "2026-08-10" }],
      new Date("2026-09-01T00:00:00Z"),
    );
    expect(report).toMatchObject({ revenue: 50, deviceRevenue: 30, serverRevenue: 20, clientCount: 1, newClientCount: 1, activeClientCount: 1, playlistCount: 2, paidServerCount: 1, serverCount: 1 });
  });

  it("gera mensagem pronta sem incluir dados sensíveis", () => {
    const report = buildMonthlyRevenueReport({ periodStart: "2026-08-01", periodEnd: "2026-08-31" }, [], [], new Date("2026-09-01T00:00:00Z"));
    const message = formatMonthlyRevenueMessage(report);
    expect(message).toContain("Fechamento mensal — 2026-08");
    expect(message).toContain("Receita total: R$ 0,00");
    expect(message).not.toContain("senha");
  });

  it("calcula o mês anterior no primeiro dia do mês", () => {
    expect(previousMonthPeriod(new Date("2026-09-01T12:00:00Z"))).toEqual({ periodStart: "2026-08-01", periodEnd: "2026-08-31" });
  });
});
