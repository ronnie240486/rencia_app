import { describe, expect, it } from "vitest";
import { buildServerPilotOverview } from "./serverPilot";

describe("Piloto Automático por Servidor", () => {
  const targets = [
    { deviceId: 1, deviceName: "Ana", listName: "Lista 1", url: "https://central.exemplo.com/get.php?u=ana" },
    { deviceId: 2, deviceName: "Bruno", listName: "Lista 1", url: "https://central.exemplo.com/get.php?u=bruno" },
    { deviceId: 3, deviceName: "Caio", listName: "Lista 1", url: "https://outra.exemplo.com/get.php?u=caio" },
  ];

  it("só confirma falha geral com dois dispositivos e duas falhas por lista", () => {
    const overview = buildServerPilotOverview(targets, [
      { deviceId: 1, urlSnapshot: targets[0].url, status: "error" },
      { deviceId: 1, urlSnapshot: targets[0].url, status: "error" },
      { deviceId: 2, urlSnapshot: targets[1].url, status: "error" },
      { deviceId: 2, urlSnapshot: targets[1].url, status: "error" },
    ]);
    expect(overview[0]).toMatchObject({ host: "central.exemplo.com", state: "critical", confirmedDevices: 2, canCoordinateFailover: true });
  });

  it("mantém uma falha isolada apenas em observação", () => {
    const overview = buildServerPilotOverview(targets, [
      { deviceId: 1, urlSnapshot: targets[0].url, status: "error" },
      { deviceId: 1, urlSnapshot: targets[0].url, status: "error" },
    ]);
    expect(overview[0]).toMatchObject({ host: "central.exemplo.com", state: "observing", canCoordinateFailover: false });
  });
});
