import { describe, expect, it } from "vitest";
import { normalizeMacForStorage } from "./mac";

describe("normalizeMacForStorage", () => {
  it("padroniza letras, separadores e comprimento do MAC", () => {
    expect(normalizeMacForStorage("bd330093dc7a")).toBe("BD:33:00:93:DC:7A");
    expect(normalizeMacForStorage("bd-33-00-93-dc-7a")).toBe("BD:33:00:93:DC:7A");
  });

  it("rejeita MAC incompleto", () => {
    expect(normalizeMacForStorage("BD:33:00")).toBeNull();
  });
});
