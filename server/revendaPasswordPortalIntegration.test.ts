import express from "express";
import type { Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { users } from "../drizzle/schema";
import { hashPassword } from "./auth";

const state = vi.hoisted(() => ({
  reseller: null as any,
  getDbMock: vi.fn(),
  updateRevendaMock: vi.fn(),
  recordAuditMock: vi.fn(),
  createSessionTokenMock: vi.fn(),
}));

vi.mock("./db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./db")>()),
  getDb: state.getDbMock,
  updateRevenda: state.updateRevendaMock,
}));
vi.mock("./audit", () => ({ recordAudit: state.recordAuditMock }));
vi.mock("./_core/sdk", () => ({ sdk: { createSessionToken: state.createSessionTokenMock, verifySession: vi.fn() } }));

import { appRouter } from "./routers";
import { registerApiRoutes } from "./apiRoutes";

function ownerContext(): TrpcContext {
  return { user: { id: 1, openId: "owner", name: "Dono", email: "dono@example.com", role: "user", isActive: true, isOwner: true } as any, req: {} as any, res: {} as any };
}

async function start(app: express.Express) {
  const server = await new Promise<Server>((resolve) => { const instance = app.listen(0, () => resolve(instance)); });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Porta inválida");
  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
}

describe("integração: revendas.update → Portal da Revenda", () => {
  let server: Server | null = null;

  beforeEach(async () => {
    vi.clearAllMocks();
    state.reseller = { id: 11, openId: "revenda_11", resellerId: 1, name: "Revenda", email: "revenda@example.com", passwordHash: await hashPassword("senha-antiga"), isActive: true, isOwner: false, plano: "Revenda", limiteDevices: 50, limiteRevendas: 0 };
    state.getDbMock.mockResolvedValue({
      select: () => ({ from: (table: unknown) => ({ where: () => ({ limit: async () => table === users ? [state.reseller] : [] }) }) }),
    });
    state.updateRevendaMock.mockImplementation(async (_id: number, _ownerId: number, data: { passwordHash?: string }) => { if (data.passwordHash) state.reseller.passwordHash = data.passwordHash; });
    state.recordAuditMock.mockResolvedValue(undefined);
    state.createSessionTokenMock.mockResolvedValue("portal-session-token");
  });

  afterEach(async () => { if (server) await new Promise<void>((resolve) => server!.close(() => resolve())); server = null; });

  it("permite entrar no portal com a nova senha salva pelo painel", async () => {
    const caller = appRouter.createCaller(ownerContext());
    await caller.revendas.update({ id: 11, password: "senha-nova-segura" });

    const app = express(); app.use(express.json()); registerApiRoutes(app);
    const running = await start(app); server = running.server;
    const login = await fetch(`${running.baseUrl}/api/reseller-portal/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "revenda@example.com", password: "senha-nova-segura" }) });

    expect(login.status).toBe(200);
    expect(await login.json()).toMatchObject({ success: true, token: "portal-session-token", user: { email: "revenda@example.com" } });
  });
});
