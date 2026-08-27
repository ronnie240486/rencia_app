import { describe, expect, it } from "vitest";
import { buildOperationHealthOverview } from "./operationHealth";

describe("mapa de saúde da operação", () => {
  it("prioriza somente falhas confirmadas e gera atalhos sem alterar dados", () => {
    const report = buildOperationHealthOverview([
      { id: 1, nomeServer: "Cliente A", app: "OuroPro", urlM3u8: "https://srv-a.example/get.php?username=secret", status: "Liberado", lastSeen: new Date("2026-08-27T11:55:00"), dataExpiracao: new Date("2026-09-01"), telefone: "11999999999" },
      { id: 2, nomeServer: "Cliente B", app: "Fusion", urlM3u8: "https://srv-b.example/lista", status: "Liberado", lastSeen: null, dataExpiracao: null, telefone: null },
    ], [{ deviceId: 1, status: "error", responseTimeMs: null, checkedAt: new Date("2026-08-27T11:58:00") }], new Date("2026-08-27T12:00:00"));

    expect(report.counts).toMatchObject({ expiring: 1, offline: 1, missingPhone: 1, listErrors: 1 });
    expect(report.servers[0]).toMatchObject({ label: "srv-a.example", status: "critical" });
    expect(report.recommendations[0]).toMatchObject({ priority: "Alta", href: "/monitor-listas" });
    expect(report.lists[0]?.detail).not.toContain("secret");
  });
});
