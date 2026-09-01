import { describe, expect, it } from "vitest";
import { addIptvServerRevenue, parseIptvServerValue } from "./iptvServerRevenue";

describe("receita de servidores IPTV", () => {
  it("converte valores decimais e brasileiros sem perder centavos", () => {
    expect(parseIptvServerValue("30.00")).toBe(30);
    expect(parseIptvServerValue("30,50")).toBe(30.5);
    expect(parseIptvServerValue(null)).toBe(0);
  });

  it("soma o valor pago dos servidores à receita existente", () => {
    expect(addIptvServerRevenue(100, "30.00")).toBe(130);
    expect(addIptvServerRevenue(100.1, "29,90")).toBe(130);
  });

  it("não transforma valores inválidos ou negativos em receita", () => {
    expect(parseIptvServerValue("abc")).toBe(0);
    expect(parseIptvServerValue(-10)).toBe(0);
  });
});
