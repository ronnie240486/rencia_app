import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const { getDbMock, updateRevendaMock, hashPasswordMock, recordAuditMock } = vi.hoisted(() => ({
  getDbMock: vi.fn(),
  updateRevendaMock: vi.fn(),
  hashPasswordMock: vi.fn(),
  recordAuditMock: vi.fn(),
}));

vi.mock("./db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./db")>()),
  getDb: getDbMock,
  updateRevenda: updateRevendaMock,
}));
vi.mock("./auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./auth")>()),
  hashPassword: hashPasswordMock,
}));
vi.mock("./audit", () => ({ recordAudit: recordAuditMock }));

import { appRouter } from "./routers";

function createOwnerContext(): TrpcContext {
  return {
    user: { id: 1, openId: "owner", name: "Dono", email: "dono@example.com", role: "user", isActive: true, isOwner: true, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() } as any,
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("revendas.update — troca de senha", () => {
  beforeEach(() => vi.clearAllMocks());

  it("gera hash e grava a nova senha da revenda pelo fluxo do painel", async () => {
    const current = { id: 11, resellerId: 1, name: "Revenda", email: "revenda@example.com", plano: "Revenda", limiteDevices: 50, limiteRevendas: 0 };
    getDbMock.mockResolvedValue({
      select: () => ({ from: () => ({ where: () => ({ limit: async () => [current] }) }) }),
    });
    hashPasswordMock.mockResolvedValue("bcrypt-hash-da-nova-senha");
    updateRevendaMock.mockResolvedValue(undefined);
    recordAuditMock.mockResolvedValue(undefined);

    const caller = appRouter.createCaller(createOwnerContext());
    const result = await caller.revendas.update({ id: 11, password: "senha-nova-segura" });

    expect(result).toEqual({ success: true });
    expect(hashPasswordMock).toHaveBeenCalledWith("senha-nova-segura");
    expect(updateRevendaMock).toHaveBeenCalledWith(11, 1, { passwordHash: "bcrypt-hash-da-nova-senha" });
    expect(recordAuditMock).toHaveBeenCalledWith(expect.objectContaining({ action: "password_changed", entityId: 11 }));
  });
});
