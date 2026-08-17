import { describe, expect, it } from "vitest";
import { isPanelTestName, normalizeCompletedTest, normalizeTestCustomerName } from "./maximusTestRegistration";

describe("registro de testes do Maximus", () => {
  it("identifica o cliente de teste sem repetir o sufixo", () => {
    expect(normalizeTestCustomerName("Maria")).toBe("Maria (teste)");
    expect(normalizeTestCustomerName("Maria (teste)")).toBe("Maria (teste)");
  });

  it("normaliza MAC e telefone do resultado recebido", () => {
    expect(normalizeCompletedTest({ mac: "aabb.ccdd-eeff", name: "João", phone: "+55 (11) 99999-0000" })).toEqual({
      mac: "AA:BB:CC:DD:EE:FF",
      name: "João (teste)",
      phone: "5511999990000",
    });
  });

  it("reconhece cadastros que podem ser atualizados sem duplicação", () => {
    expect(isPanelTestName("Cliente (teste)")).toBe(true);
    expect(isPanelTestName("Cliente real")).toBe(false);
  });
});
