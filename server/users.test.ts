import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db module with updated function names
vi.mock("./db", () => ({
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(undefined),
  getDb: vi.fn().mockResolvedValue(null),
  listDevices: vi.fn().mockResolvedValue({ data: [], total: 0 }),
  getRecentDevices: vi.fn().mockResolvedValue([]),
  createDevice: vi.fn().mockResolvedValue(undefined),
  updateDevice: vi.fn().mockResolvedValue(undefined),
  deleteDevice: vi.fn().mockResolvedValue(undefined),
  deleteManyDevices: vi.fn().mockResolvedValue(undefined),
  deleteExpiredDevices: vi.fn().mockResolvedValue(undefined),
  getDeviceStats: vi.fn().mockResolvedValue({ total: 0, revendas: 0, ultraMasters: 0, masters: 0, receitaMensal: 0 }),
  getDeviceById: vi.fn().mockResolvedValue(undefined),
  listApps: vi.fn().mockResolvedValue([]),
  seedApps: vi.fn().mockResolvedValue(undefined),
  getUserPlanInfo: vi.fn().mockResolvedValue({ plano: "Revenda", planValidade: null, limiteDevices: 999 }),
}));

function createAdminContext(userId = 1): TrpcContext {
  return {
    user: {
      id: userId,
      openId: "admin-user",
      name: "Admin User",
      email: "admin@example.com",
      role: "admin",
      loginMethod: "manus",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createUserContext(): TrpcContext {
  return {
    user: {
      id: 99,
      openId: "regular-user",
      name: "Regular User",
      email: "user@example.com",
      role: "user",
      loginMethod: "manus",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("adminUsers.profile", () => {
  it("returns profile for authenticated user", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.adminUsers.profile();
    expect(result?.name).toBe("Admin User");
    expect(result?.role).toBe("admin");
  });

  it("throws UNAUTHORIZED for unauthenticated user", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.adminUsers.profile()).rejects.toThrow();
  });
});

describe("adminUsers.updateRole", () => {
  it("throws BAD_REQUEST when admin tries to change own role", async () => {
    const ctx = createAdminContext(2);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.adminUsers.updateRole({ userId: 2, role: "user" })).rejects.toThrow("não pode alterar");
  });

  it("throws FORBIDDEN for non-admin", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.adminUsers.updateRole({ userId: 1, role: "user" })).rejects.toThrow("Acesso restrito");
  });
});

describe("devices.stats", () => {
  it("returns stats for authenticated user", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.devices.stats();
    expect(result.total).toBe(0);
    expect(result.revendas).toBe(0);
  });
});

describe("devices.list", () => {
  it("returns device list for authenticated user", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.devices.list({});
    expect(result.total).toBe(0);
    expect(result.data).toHaveLength(0);
  });
});

describe("plan.info", () => {
  it("returns plan info for authenticated user", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.plan.info();
    expect(result?.plano).toBe("Revenda");
    expect(result?.limiteDevices).toBe(999);
  });
});

describe("auth.logout", () => {
  it("clears session cookie and returns success", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
  });
});
