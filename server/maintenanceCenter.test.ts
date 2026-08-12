import { describe, expect, it } from "vitest";
import { buildMaintenanceOverview } from "./maintenanceCenter";

describe("central de manutenção", () => {
  it("prioriza falha de lista antes de dispositivo offline e bloqueado", () => {
    const result = buildMaintenanceOverview([
      { id: 1, nomeServer: "TV", status: "Liberado", lastSeen: new Date("2026-08-10T00:00:00Z") },
      { id: 2, nomeServer: "Celular", status: "Bloqueado", lastSeen: new Date("2026-08-12T11:00:00Z") },
    ], [{ deviceId: 1, deviceUrlId: null, status: "error", message: "Timeout", checkedAt: new Date("2026-08-12T10:00:00Z") }], new Date("2026-08-12T12:00:00Z"));
    expect(result).toMatchObject({ listErrors: 1, offline: 1, blocked: 1 });
    expect(result.actions.map((item) => item.priority)).toEqual(["critical", "high", "normal"]);
  });
});
