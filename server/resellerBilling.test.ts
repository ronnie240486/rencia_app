import { describe, expect, it } from "vitest";
import { addBillingMonths, getResellerBillingStatus } from "./resellerBilling";

describe("cobrança recorrente de revendas", () => {
  it("marca uma cobrança pendente vencida como atrasada sem alterar uma cobrança paga", () => {
    expect(getResellerBillingStatus("pending", "2026-08-01", new Date("2026-08-12T12:00:00Z"))).toBe("overdue");
    expect(getResellerBillingStatus("paid", "2026-08-01", new Date("2026-08-12T12:00:00Z"))).toBe("paid");
  });

  it("gera o próximo vencimento preservando o último dia possível do mês", () => {
    expect(addBillingMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addBillingMonths("2026-12-15", 1)).toBe("2027-01-15");
  });
});
