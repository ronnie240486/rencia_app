import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db module
vi.mock("./db", () => ({
  getAllUsers: vi.fn().mockResolvedValue({
    users: [
      {
        id: 1,
        openId: "user-1",
        name: "Alice Admin",
        email: "alice@example.com",
        role: "admin",
        loginMethod: "manus",
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
        lastSignedIn: new Date("2024-06-01"),
      },
      {
        id: 2,
        openId: "user-2",
        name: "Bob User",
        email: "bob@example.com",
        role: "user",
        loginMethod: "manus",
        createdAt: new Date("2024-02-01"),
        updatedAt: new Date("2024-02-01"),
        lastSignedIn: new Date("2024-06-02"),
      },
    ],
    total: 2,
  }),
  getUserStats: vi.fn().mockResolvedValue({
    total: 2,
    admins: 1,
    regularUsers: 1,
  }),
  updateUserRole: vi.fn().mockResolvedValue(undefined),
  getUserById: vi.fn().mockResolvedValue({
    id: 2,
    openId: "user-2",
    name: "Bob User",
    email: "bob@example.com",
    role: "user",
    loginMethod: "manus",
    createdAt: new Date("2024-02-01"),
    updatedAt: new Date("2024-02-01"),
    lastSignedIn: new Date("2024-06-02"),
  }),
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

describe("users.list", () => {
  it("returns users list for admin", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.users.list({});
    expect(result.total).toBe(2);
    expect(result.users).toHaveLength(2);
  });

  it("throws FORBIDDEN for non-admin user", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.users.list({})).rejects.toThrow("Acesso restrito");
  });
});

describe("users.stats", () => {
  it("returns stats for admin", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.users.stats();
    expect(result.total).toBe(2);
    expect(result.admins).toBe(1);
    expect(result.regularUsers).toBe(1);
  });

  it("throws FORBIDDEN for non-admin", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.users.stats()).rejects.toThrow("Acesso restrito");
  });
});

describe("users.updateRole", () => {
  it("allows admin to update another user's role", async () => {
    const ctx = createAdminContext(1);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.users.updateRole({ userId: 2, role: "admin" });
    expect(result.success).toBe(true);
  });

  it("throws BAD_REQUEST when admin tries to change own role", async () => {
    const ctx = createAdminContext(2);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.users.updateRole({ userId: 2, role: "user" })).rejects.toThrow("não pode alterar");
  });

  it("throws FORBIDDEN for non-admin", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.users.updateRole({ userId: 1, role: "user" })).rejects.toThrow("Acesso restrito");
  });
});

describe("users.profile", () => {
  it("returns profile for authenticated user", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.users.profile();
    expect(result?.name).toBe("Admin User");
    expect(result?.role).toBe("admin");
  });

  it("returns null for unauthenticated user", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.users.profile()).rejects.toThrow("login");
  });
});
