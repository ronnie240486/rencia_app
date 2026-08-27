import { beforeEach, describe, expect, it, vi } from "vitest";

let groupedRows: Array<{ app: string; count: number }> = [];
const database = {
  select: vi.fn(() => ({
    from: () => ({
      where: () => ({
        groupBy: async () => groupedRows,
      }),
    }),
  })),
};

vi.mock("./db", () => ({
  getDb: vi.fn(async () => database),
  createDevice: vi.fn(), deleteDevice: vi.fn(), deleteManyDevices: vi.fn(), deleteExpiredDevices: vi.fn(),
  getDeviceById: vi.fn(), getDeviceStats: vi.fn(), getRecentDevices: vi.fn(), getUserPlanInfo: vi.fn(),
  listApps: vi.fn(), listDevices: vi.fn(), seedApps: vi.fn(), updateDevice: vi.fn(), upsertUser: vi.fn(),
  getDeviceUrls: vi.fn(), addDeviceUrl: vi.fn(), updateDeviceUrl: vi.fn(), deleteDeviceUrl: vi.fn(),
  listRevendas: vi.fn(), createRevenda: vi.fn(), updateRevenda: vi.fn(), deleteRevenda: vi.fn(), getRevendaStats: vi.fn(),
  getConnectedDevices: vi.fn(), updateUserProfile: vi.fn(),
}));
vi.mock("./audit", () => ({ recordAudit: vi.fn(async () => undefined) }));

import { appRouter } from "./routers";

const context = {
  user: { id: 1, openId: "owner", name: "Owner", email: "owner@example.com", loginMethod: "email_password", role: "admin", isOwner: true, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), lastLoginDate: "2026-08-20", isActive: true, telefone: null, avatarUrl: null, bannerUrl: null, app: null, plano: "UltraMaster", planValidade: null, limiteDevices: 999, resellerId: null, limiteRevendas: 0, senhaRevenda: null },
  req: { headers: {} }, res: {},
} as any;

describe("ranking.appStats", () => {
  beforeEach(() => {
    groupedRows = [];
    vi.clearAllMocks();
  });

  it("separa Ominus e Magnus, somando também o alias Magnus TV", async () => {
    groupedRows = [
      { app: "Ominus", count: 2 },
      { app: "Magnus", count: 3 },
      { app: "Magnus TV", count: 1 },
    ];

    const result = await appRouter.createCaller(context).ranking.appStats();

    expect(result).toMatchObject({ ominus: 2, magnus: 4, total: 6 });
  });
});
