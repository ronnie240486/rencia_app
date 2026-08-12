import { describe, expect, it } from "vitest";
import { getEffectivePaymentStatus } from "./payments";

describe("controle de pagamentos", () => {
  const reference = new Date("2026-08-12T12:00:00.000Z");

  it("marca pendências anteriores como atrasadas", () => {
    expect(getEffectivePaymentStatus("pending", "2026-08-11", reference)).toBe("overdue");
  });

  it("mantém pagamento de hoje como pendente e pago como pago", () => {
    expect(getEffectivePaymentStatus("pending", "2026-08-12", reference)).toBe("pending");
    expect(getEffectivePaymentStatus("paid", "2026-08-01", reference)).toBe("paid");
  });
});
