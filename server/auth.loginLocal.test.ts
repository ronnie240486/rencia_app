import { describe, expect, it, beforeEach, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as authModule from "./auth";
import * as dbModule from "./db";

// Mock modules
vi.mock("./auth");
vi.mock("./db");

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      cookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("auth.loginLocal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should reject login for non-existent user", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // Mock database to return empty result
    vi.mocked(dbModule.getDb).mockResolvedValue({
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([]),
          }),
        }),
      }),
    } as any);

    try {
      await caller.auth.loginLocal({
        email: "nonexistent@example.com",
        password: "password123",
      });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.message).toContain("Email ou senha inválidos");
    }
  });

  it("should reject login for inactive user", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const inactiveUser = {
      id: 1,
      email: "inactive@example.com",
      passwordHash: "hashedpassword",
      isActive: false,
      role: "user",
      name: "Inactive User",
      openId: "openid123",
      loginMethod: "local",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };

    // Mock database to return inactive user
    vi.mocked(dbModule.getDb).mockResolvedValue({
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([inactiveUser]),
          }),
        }),
      }),
    } as any);

    try {
      await caller.auth.loginLocal({
        email: "inactive@example.com",
        password: "password123",
      });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.message).toContain("Usuário inativo ou deletado");
    }
  });

  it("should reject login with incorrect password", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const activeUser = {
      id: 1,
      email: "active@example.com",
      passwordHash: "hashedpassword",
      isActive: true,
      role: "user",
      name: "Active User",
      openId: "openid123",
      loginMethod: "local",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };

    // Mock database to return active user
    vi.mocked(dbModule.getDb).mockResolvedValue({
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([activeUser]),
          }),
        }),
      }),
    } as any);

    // Mock comparePassword to return false
    vi.mocked(authModule.comparePassword).mockResolvedValue(false as any);

    try {
      await caller.auth.loginLocal({
        email: "active@example.com",
        password: "wrongpassword",
      });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.message).toContain("Email ou senha inválidos");
    }
  });

  it("should successfully login active user with correct password", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const activeUser = {
      id: 1,
      email: "active@example.com",
      passwordHash: "hashedpassword",
      isActive: true,
      role: "user",
      name: "Active User",
      openId: "openid123",
      loginMethod: "local",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };

    // Mock database to return active user
    vi.mocked(dbModule.getDb).mockResolvedValue({
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([activeUser]),
          }),
        }),
      }),
    } as any);

    // Mock comparePassword to return true
    vi.mocked(authModule.comparePassword).mockResolvedValue(true as any);

    const result = await caller.auth.loginLocal({
      email: "active@example.com",
      password: "correctpassword",
    });

    expect(result.success).toBe(true);
    expect(result.user.email).toBe("active@example.com");
    expect(result.user.isActive).toBe(true);
    expect(ctx.res.cookie).toHaveBeenCalled();
  });
});
