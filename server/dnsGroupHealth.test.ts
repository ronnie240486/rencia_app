import { describe, expect, it } from "vitest";
import { getDnsGroupCurrentHealth } from "./dnsGroupHealth";

describe("saúde atual de grupos DNS", () => {
  it("fica saudável quando Hosts atualmente respondem, mesmo com falhas antigas", () => {
    expect(getDnsGroupCurrentHealth(["success"])).toBe("healthy");
    expect(getDnsGroupCurrentHealth(["success", "unknown"])).toBe("healthy");
    // A tela usa este resultado atual e não a contagem de falhas antigas do histórico.
    expect(getDnsGroupCurrentHealth(["success", "success"])).not.toBe("attention");
  });

  it("mantém alerta somente para falha atual e crítico quando todos falharam agora", () => {
    expect(getDnsGroupCurrentHealth(["success", "error"])).toBe("attention");
    expect(getDnsGroupCurrentHealth(["error", "error"])).toBe("critical");
    expect(getDnsGroupCurrentHealth(["unknown"])).toBe("unknown");
  });
});
