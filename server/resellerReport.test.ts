import { describe, expect, it } from "vitest";
import { summarizeResellerDevicePerformance, summarizeResellerFinance } from "./resellerReport";

describe("relatório de revendas", () => {
  it("separa corretamente valores recebidos, pendentes e atrasados", () => {
    const report = summarizeResellerFinance([
      { amount: "50.00", status: "paid", dueDate: "2026-08-01" },
      { amount: "30.00", status: "pending", dueDate: "2026-08-30" },
      { amount: "20.00", status: "pending", dueDate: "2026-08-01" },
    ], new Date("2026-08-12T12:00:00Z"));
    expect(report).toEqual({ total: 100, received: 50, pending: 30, overdue: 20 });
  });

  it("separa cadastro, ativação confirmada por heartbeat e clientes online", () => {
    const report = summarizeResellerDevicePerformance([
      { app: "Nexus", status: "Liberado", lastSeen: new Date("2026-08-25T11:55:00.000Z") },
      { app: "Nexus", status: "Liberado", lastSeen: new Date("2026-08-24T11:55:00.000Z") },
      { app: "OuroPro", status: "Liberado", lastSeen: null },
    ], new Date("2026-08-25T12:00:00.000Z"));
    expect(report.apkActivatedClients).toBe(2);
    expect(report.onlineClients).toBe(1);
    expect(report.appBreakdown).toEqual([
      { app: "Nexus", clients: 2, activated: 2, online: 1 },
      { app: "OuroPro", clients: 1, activated: 0, online: 0 },
    ]);
  });
});
