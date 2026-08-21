import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { localCredentials, users } from "../drizzle/schema";

const state = vi.hoisted(() => ({ user: null as any, legacy: null as any, getDbMock: vi.fn() }));
vi.mock("./db", async (importOriginal) => ({ ...(await importOriginal<typeof import("./db")>()), getDb: state.getDbMock }));

import { appRouter } from "./routers";

function context(role: "admin" | "user", cookie = vi.fn()): TrpcContext {
  return { user: role === "admin" ? { id: 1, role: "admin", isActive: true, isOwner: true } as any : null, req: { headers: {} } as any, res: { cookie } as any } as TrpcContext;
}

describe("credentials.update — sincronização com login público", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.user = { id: 11, email: "revenda@example.com", passwordHash: "$2b$10$Ny6S5uZbG7zQSl39rSLwG.qKJoZAfg3ksoRUgrBkm0VxvtGypMg3W", isActive: true, isOwner: false };
    state.legacy = { id: 21, userId: 11, email: "revenda@example.com", passwordHash: "legado" };
    const selectChain = (rows: any[]) => ({ where: () => ({ limit: async () => rows }) });
    state.getDbMock.mockResolvedValue({
      select: () => ({ from: (table: unknown) => table === localCredentials ? selectChain([state.legacy]) : selectChain([state.user]) }),
      update: (table: unknown) => ({ set: (data: any) => ({ where: async () => { if (table === users) state.user = { ...state.user, ...data }; else state.legacy = { ...state.legacy, ...data }; } }) }),
    });
  });

  it("faz a senha atualizada por credenciais legadas funcionar no login local", async () => {
    await appRouter.createCaller(context("admin")).credentials.update({ userId: 11, password: "senha-unificada" });
    const cookie = vi.fn();
    const login = await appRouter.createCaller(context("user", cookie)).auth.loginLocal({ email: "revenda@example.com", password: "senha-unificada" });
    expect(login).toMatchObject({ success: true, user: { id: 11 } });
    expect(cookie).toHaveBeenCalled();
  });
});
