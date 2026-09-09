import { describe, expect, it } from "vitest";
import { normalizeListMonitorHistoryUrl } from "./listMonitorHistory";

describe("limpeza do histórico do Monitor de Listas", () => {
  it("limpa somente a URL exata solicitada, preservando parâmetros da playlist", () => {
    expect(normalizeListMonitorHistoryUrl("  http://clipper.lat/get.php?username=970726&password=segredo  "))
      .toBe("http://clipper.lat/get.php?username=970726&password=segredo");
  });
});
