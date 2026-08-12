import { describe, expect, it } from "vitest";
import { buildFinancialReport } from "./financialReport";

describe("relatório financeiro", () => {
  it("separa recebido, pendente e atrasado dentro do período", () => {
    const report = buildFinancialReport([
      { amount: "30.00", status: "paid", createdAt: new Date("2026-08-01T12:00:00Z"), paidAt: new Date("2026-08-02T12:00:00Z") },
      { amount: "25.00", status: "pending", createdAt: new Date("2026-08-03T12:00:00Z") },
      { amount: "40.00", status: "overdue", createdAt: new Date("2026-08-04T12:00:00Z") },
    ], { start: "2026-08-01", end: "2026-08-31" });
    expect(report).toMatchObject({ billed: 95, received: 30, pending: 25, overdue: 40, paymentCount: 3 });
  });

  it("considera recebimento pela data de pagamento", () => {
    const report = buildFinancialReport([
      { amount: "30.00", status: "paid", createdAt: new Date("2026-07-31T12:00:00Z"), paidAt: new Date("2026-08-01T12:00:00Z") },
    ], { start: "2026-08-01", end: "2026-08-31" });
    expect(report.billed).toBe(0);
    expect(report.received).toBe(30);
  });
});
