import { describe, expect, it } from "vitest";
import { shouldAutoOpenTechnicalAlertSummary } from "../client/src/components/technicalAlertSummary";

describe("resumo de falhas técnicas", () => {
  it("não abre automaticamente e deixa a consulta disponível somente na Central de Alertas", () => {
    expect(shouldAutoOpenTechnicalAlertSummary()).toBe(false);
  });
});
