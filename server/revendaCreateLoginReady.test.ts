import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { hashPassword } from "./auth";

const state = vi.hoisted(() => ({ getDbMock: vi.fn(), createRevendaMock: vi.fn(), getPlanMock: vi.fn(), getStatsMock: vi.fn(), recordAuditMock: vi.fn(), storedHash: "" }));

vi.mock("./db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./db")>()),
  getDb: state.getDbMock,
  createRevenda: state.createRevendaMock,
  getUserPlanInfo: state.getPlanMock,
  getRevendaStats: state.getStatsMock,
}));
vi.mock("./audit", () => ({ recordAudit: state.recordAuditMock }));

import { appRouter } from "./routers";

function ownerContext(): TrpcContext {
  return { user: { id: 1, openId: "owner", name: "Dono", email: "dono@example.com", role: "user", isActive: true, isOwner: true } as any, req: {} as any, res: {} as any };
}

describe("revendas.create — senha pronta para login", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    state.storedHash = await hashPassword("senha-inicial");
    state.getPlanMock.mockResolvedValue({ limiteRevendas: 0 });
    state.getStatsMock.mockResolvedValue({ totalRevendas: 0 });
    state.createRevendaMock.mockResolvedValue({ id: 41 });
    state.recordAuditMock.mockResolvedValue(undefined);
    state.getDbMock.mockResolvedValue({
      select: () => ({ from: () => ({ where: () => ({ limit: async () => [{ passwordHash: state.storedHash }] }) }) }),
      update: () => ({ set: (data: { passwordHash: string }) => ({ where: async () => { state.storedHash = data.passwordHash; } }) }),
    });
  });

  it("retorna loginReady somente depois de confirmar a senha criada", async () => {
    const result = await appRouter.createCaller(ownerContext()).revendas.create({ name: "Nova revenda", email: "nova@example.com", password: "senha-inicial", plano: "Revenda", limiteDevices: 50, limiteRevendas: 0 });
    expect(result).toEqual({ success: true, id: 41, loginReady: true });
    expect(state.createRevendaMock).toHaveBeenCalledWith(expect.objectContaining({ passwordHash: expect.any(String) }));
  });

  it("repara o hash gravado antes de confirmar a criação", async () => {
    state.storedHash = await hashPassword("senha-errada");
    const result = await appRouter.createCaller(ownerContext()).revendas.create({ name: "Nova revenda", email: "nova@example.com", password: "senha-inicial", plano: "Revenda", limiteDevices: 50, limiteRevendas: 0 });
    expect(result.loginReady).toBe(true);
    expect(state.storedHash).not.toBe(await hashPassword("senha-inicial"));
  });
});
