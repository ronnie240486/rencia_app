import express, { type Express } from "express";
import type { Server } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import { deviceUrls, devices, users } from "../drizzle/schema";

const { selectMock, comparePasswordMock, verifySessionMock, createSessionTokenMock } = vi.hoisted(() => ({
  selectMock: vi.fn(),
  comparePasswordMock: vi.fn(),
  verifySessionMock: vi.fn(),
  createSessionTokenMock: vi.fn(),
}));

vi.mock("./db", () => ({ getDb: vi.fn(async () => ({ select: selectMock })) }));
vi.mock("./auth", () => ({ comparePassword: comparePasswordMock }));
vi.mock("./_core/sdk", () => ({ sdk: { verifySession: verifySessionMock, createSessionToken: createSessionTokenMock } }));

import { registerApiRoutes } from "./apiRoutes";

function rows<T>(value: T[]) {
  const chain = {
    where: () => chain,
    limit: async () => value,
    orderBy: async () => value,
    then: (resolve: (result: T[]) => unknown, reject?: (reason: unknown) => unknown) => Promise.resolve(value).then(resolve, reject),
  };
  return chain;
}

async function start(app: Express) {
  const server = await new Promise<Server>((resolve) => { const instance = app.listen(0, () => resolve(instance)); });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Porta inválida");
  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
}

describe("portal de revendas — rotas HTTP", () => {
  let server: Server | null = null;
  const reseller = { id: 11, openId: "revenda_11", name: "Revenda Teste", email: "revenda@example.com", passwordHash: "hash", resellerId: 1, isActive: true, isOwner: false, plano: "Revenda", limiteDevices: 50 };

  afterEach(async () => {
    if (server) await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()));
    server = null; vi.clearAllMocks();
  });

  it("autentica uma revenda ativa e permite consultar somente sua sessão", async () => {
    selectMock.mockImplementation(() => ({ from: (table: unknown) => table === users ? rows([reseller]) : rows([]) }));
    comparePasswordMock.mockResolvedValue(true);
    createSessionTokenMock.mockResolvedValue("portal-token");
    verifySessionMock.mockResolvedValue({ openId: "revenda_11", appId: "app", name: "Revenda Teste" });
    const app = express(); app.use(express.json()); registerApiRoutes(app);
    const running = await start(app); server = running.server;

    const login = await fetch(`${running.baseUrl}/api/reseller-portal/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: reseller.email, password: "senha123" }) });
    expect(login.status).toBe(200);
    expect(await login.json()).toMatchObject({ success: true, token: "portal-token", user: { email: reseller.email, limite_devices: 50 } });

    const me = await fetch(`${running.baseUrl}/api/reseller-portal/me`, { method: "POST", headers: { Authorization: "Bearer portal-token" } });
    expect(me.status).toBe(200);
    expect(await me.json()).toMatchObject({ success: true, user: { name: "Revenda Teste", email: reseller.email } });
  });

  it("rejeita token inválido sem revelar dados administrativos", async () => {
    verifySessionMock.mockResolvedValue(null);
    const app = express(); app.use(express.json()); registerApiRoutes(app);
    const running = await start(app); server = running.server;
    const response = await fetch(`${running.baseUrl}/api/reseller-portal/clients`, { method: "POST", headers: { Authorization: "Bearer inválido" } });
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ success: false, error: "Sessão de revenda inválida." });
  });

  it("lista somente os clientes vinculados à revenda autenticada", async () => {
    const ownClient = { id: 101, ownerId: 11, nomeServer: "Cliente da revenda", mac: "AA:BB:CC:DD:EE:FF", app: "maximus", status: "Liberado", dataExpiracao: null, telefone: null, createdAt: new Date() };
    selectMock.mockImplementation(() => ({
      from: (table: unknown) => table === users ? rows([reseller]) : table === devices ? rows([ownClient]) : table === deviceUrls ? rows([{ id: 501 }]) : rows([]),
    }));
    verifySessionMock.mockResolvedValue({ openId: "revenda_11", appId: "app", name: "Revenda Teste" });
    const app = express(); app.use(express.json()); registerApiRoutes(app);
    const running = await start(app); server = running.server;

    const response = await fetch(`${running.baseUrl}/api/reseller-portal/clients`, { method: "POST", headers: { Authorization: "Bearer portal-token" } });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, clients: [{ id: 101, nomeServer: "Cliente da revenda", extra_list_count: 1 }] });
  });
});
