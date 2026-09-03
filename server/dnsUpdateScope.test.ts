import { describe, expect, it } from "vitest";
import { requireExplicitDeviceIds } from "./dnsUpdateScope";

describe("escopo da troca de DNS", () => {
  it("rejeita lista vazia e nunca cria escopo global", () => {
    expect(() => requireExplicitDeviceIds([])).toThrow("Selecione ao menos um cliente.");
  });

  it("remove duplicados e mantém somente IDs explícitos e válidos", () => {
    expect(requireExplicitDeviceIds([12, 12, 0, -4, 27])).toEqual([12, 27]);
  });
});
