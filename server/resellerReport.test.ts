import { describe, expect, it } from "vitest";
import { buildResellerClientDetails, summarizeResellerDevicePerformance, summarizeResellerFinance } from "./resellerReport";

describe("relatório de revendas", () => {
  it("separa corretamente valores recebidos, pendentes e atrasados", () => {
    const report = summarizeResellerFinance([
      { amount: "50.00", status: "paid", dueDate: "2026-08-01" },
      { amount: "30.00", status: "pending", dueDate: "2026-08-30" },
      { amount: "20.00", status: "pending", dueDate: "2026-08-01" },
    ], new Date("2026-08-12T12:00:00Z"));
    expect(report).toEqual({ total: 100, received: 50, pending: 30, overdue: 20 });
  });

  it("mantém os detalhes do cadastro associados à revenda correta", () => {
    const details = buildResellerClientDetails(
      [{ id: 7, name: "Revenda Teste", email: "teste@example.com" }],
      [{ id: 21, ownerId: 7, clientName: "Cliente A", serverName: "Servidor Epic", app: "Future", mac: "AA:BB:CC:DD:EE:FF", phone: "5535999999999", status: "Liberado", expiresAt: "2026-09-30", lastSeen: null, value: "30.00" }],
    );
    expect(details[0]).toMatchObject({ resellerName: "Revenda Teste", resellerEmail: "teste@example.com", clientName: "Cliente A", serverName: "Servidor Epic", app: "Future" });
  });

  it("separa cadastro, ativação confirmada por heartbeat e clientes online", () => {
    const report = summarizeResellerDevicePerformance([
      { app: "Future", status: "Liberado", lastSeen: new Date("2026-08-25T11:55:00.000Z") },
      { app: "Future", status: "Liberado", lastSeen: new Date("2026-08-24T11:55:00.000Z") },
      { app: "OuroPro", status: "Liberado", lastSeen: null },
    ], new Date("2026-08-25T12:00:00.000Z"));
    expect(report.apkActivatedClients).toBe(2);
    expect(report.onlineClients).toBe(1);
    expect(report.appBreakdown).toEqual([
      { app: "Future", clients: 2, activated: 2, online: 1 },
      { app: "OuroPro", clients: 1, activated: 0, online: 0 },
    ]);
  });
});
