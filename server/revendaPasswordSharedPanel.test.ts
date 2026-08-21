import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { users } from "../drizzle/schema";
import { hashPassword } from "./auth";

const state = vi.hoisted(() => ({ reseller: null as any, getDbMock: vi.fn(), updateRevendaMock: vi.fn(), recordAuditMock: vi.fn() }));

vi.mock("./db", async (importOriginal) => ({ ...(await importOriginal<typeof import("./db")>()), getDb: state.getDbMock, updateRevenda: state.updateRevendaMock }));
vi.mock("./audit", () => ({ recordAudit: state.recordAuditMock }));

import { appRouter } from "./routers";

function ownerContext(): TrpcContext {
  return { user: { id: 1, openId: "owner", name: "Dono", email: "dono@example.com", role: "user", isActive: true, isOwner: true } as any, req: { headers: {} } as any, res: { cookie: vi.fn() } as any };
}

function publicContext(cookie: ReturnType<typeof vi.fn>): TrpcContext {
  return { user: null, req: { headers: {} } as any, res: { cookie } as any } as TrpcContext;
}

describe("integração: Revendas.update → login local do mesmo painel", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    state.reseller = { id: 11, resellerId: 1, name: "Revenda", email: "revenda@example.com", passwordHash: await hashPassword("senha-antiga"), isActive: true, isOwner: false, plano: "Revenda", limiteDevices: 50, limiteRevendas: 0 };
    state.getDbMock.mockResolvedValue({ select: () => ({ from: () => ({ where: () => ({ limit: async () => [state.reseller] }) }) }) });
    state.updateRevendaMock.mockImplementation(async (_id: number, _ownerId: number, data: { passwordHash?: string }) => { if (data.passwordHash) state.reseller.passwordHash = data.passwordHash; });
    state.recordAuditMock.mockResolvedValue(undefined);
  });

  it("aceita no painel público a nova senha definida pelo proprietário em Revendas", async () => {
    await appRouter.createCaller(ownerContext()).revendas.update({ id: 11, password: "senha-nova-segura" });
    const cookie = vi.fn();
    const result = await appRouter.createCaller(publicContext(cookie)).auth.loginLocal({ email: "revenda@example.com", password: "senha-nova-segura" });
    expect(result).toMatchObject({ success: true, user: { id: 11, email: "revenda@example.com" } });
    expect(cookie).toHaveBeenCalled();
  });
});
