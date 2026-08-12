import { describe, expect, it } from "vitest";
import { summarizeResellerFinance } from "./resellerReport";

describe("relatório de revendas", () => {
  it("separa corretamente valores recebidos, pendentes e atrasados", () => {
    const report = summarizeResellerFinance([
      { amount: "50.00", status: "paid", dueDate: "2026-08-01" },
      { amount: "30.00", status: "pending", dueDate: "2026-08-30" },
      { amount: "20.00", status: "pending", dueDate: "2026-08-01" },
    ], new Date("2026-08-12T12:00:00Z"));
    expect(report).toEqual({ total: 100, received: 50, pending: 30, overdue: 20 });
  });
});
