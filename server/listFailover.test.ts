import { describe, expect, it } from "vitest";
import { orderFailoverCandidates } from "./listFailover";

describe("troca automática de listas", () => {
  it("prioriza a lista atualmente selecionada e preserva as demais como reserva", () => {
    const result = orderFailoverCandidates([
      { id: null, name: "Lista 1" },
      { id: 22, name: "Lista 2" },
      { id: 23, name: "Lista 3" },
    ], 22);
    expect(result.map((item) => item.id)).toEqual([22, null, 23]);
  });

  it("mantém a Lista 1 como prioridade quando não há lista reserva selecionada", () => {
    const result = orderFailoverCandidates([{ id: null }, { id: 22 }, { id: 23 }], null);
    expect(result.map((item) => item.id)).toEqual([null, 22, 23]);
  });
});
