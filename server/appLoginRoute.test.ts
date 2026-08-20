import express, { type Express } from "express";
import type { Server } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import { appCredentials, appSettings, devices, deviceUrls } from "../drizzle/schema";

const database = {
  select: vi.fn(),
  update: vi.fn(),
};

vi.mock("./db", () => ({ getDb: vi.fn(async () => database) }));
vi.mock("./auth", () => ({ comparePassword: vi.fn(async (password: string) => password === "senha-correta") }));

import { registerApiRoutes } from "./apiRoutes";

function queryResult(rows: unknown[]) {
  const query = {
    where: () => query,
    limit: async () => rows,
    orderBy: async () => rows,
    then: (resolve: (value: unknown[]) => unknown, reject?: (reason: unknown) => unknown) => Promise.resolve(rows).then(resolve, reject),
  };
  return query;
}

function prepareDatabase(input: { appId?: string; passwordHash?: string; mac?: string; active?: boolean; dnsHost?: string | null }) {
  const credential = {
    id: 8, ownerId: 1, deviceId: 55, appId: input.appId ?? "optimus", dnsHost: input.dnsHost === undefined ? "https://dns.exemplo.com" : input.dnsHost, username: "cliente.teste", passwordHash: input.passwordHash ?? "hash", active: input.active ?? true,
    firstAuthenticatedAt: null, lastAuthenticatedAt: null, createdAt: new Date(), updatedAt: new Date(),
  };
  const device = {
    id: 55, ownerId: 1, mac: input.mac ?? "LOGIN:PENDENTE", accessMode: "LOGIN_PASSWORD", nomeServer: "Cliente Teste", tipo: "Usuario" as const, modoSelecao: "M3U8" as const,
    app: "Optimus", urlM3u8: "https://dns.exemplo.com/get.php?username=a&password=b", urlEpg: null, valor: null, status: "Liberado" as const,
    dataCadastro: new Date(), dataExpiracao: "2026-12-31", createdAt: new Date(), updatedAt: new Date(), lastSeen: null, currentContent: null, telefone: null,
    forceShowChannel: false, activeDeviceUrlId: null, listFailoverEnabled: true, maxConcurrentConnections: 1,
  };
  const queues = [[credential], [device], [], [{ key: "optimus_app_name", value: "Optimus" }]];
  database.select.mockImplementation(() => ({ from: (table: unknown) => {
    const rows = table === appSettings ? queues.pop() ?? [] : queues.shift() ?? [];
    return queryResult(rows);
  } }));
  database.update.mockImplementation(() => ({ set: (values: unknown) => ({ where: async () => values }) }));
  return { credential, device };
}

async function startRoute(app: Express) {
  const server = await new Promise<Server>((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Porta de teste inválida");
  return { server, url: `http://127.0.0.1:${address.port}` };
}

describe("POST /api/v5/app-login", () => {
  let server: Server | null = null;

  afterEach(async () => {
    database.select.mockReset();
    database.update.mockReset();
    if (server) await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()));
    server = null;
  });

  it("autentica, retorna listas e vincula o primeiro MAC do APK", async () => {
    prepareDatabase({});
    const app = express();
    app.use(express.json());
    registerApiRoutes(app);
    const running = await startRoute(app); server = running.server;
    const response = await fetch(`${running.url}/api/v5/app-login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "cliente.teste", password: "senha-correta", appId: "optimus", mac: "aabbccddeeff" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ authenticated: true, allowed: true, mac: "AA:BB:CC:DD:EE:FF", dns_host: "https://dns.exemplo.com", playlist_url: "https://dns.exemplo.com/get.php?username=a&password=b" });
    expect(database.update).toHaveBeenCalledTimes(2);
  });

  it("rejeita senha incorreta e aplicativo diferente da credencial", async () => {
    prepareDatabase({});
    const app = express(); app.use(express.json()); registerApiRoutes(app);
    const running = await startRoute(app); server = running.server;
    const wrongPassword = await fetch(`${running.url}/api/v5/app-login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "cliente.teste", password: "senha-errada", appId: "optimus" }) });
    expect(wrongPassword.status).toBe(401);

    prepareDatabase({ appId: "evolux" });
    const wrongApp = await fetch(`${running.url}/api/v5/app-login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "cliente.teste", password: "senha-correta", appId: "optimus" }) });
    expect(wrongApp.status).toBe(401);
  });

  it("impede que um login já vinculado seja usado em outro MAC", async () => {
    prepareDatabase({ mac: "AA:BB:CC:DD:EE:FF" });
    const app = express(); app.use(express.json()); registerApiRoutes(app);
    const running = await startRoute(app); server = running.server;
    const response = await fetch(`${running.url}/api/v5/app-login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "cliente.teste", password: "senha-correta", appId: "optimus", mac: "11:22:33:44:55:66" }) });
    const body = await response.json();
    expect(response.status).toBe(409);
    expect(body.allowed).toBe(false);
  });

  it("rejeita uma credencial antiga que não possui DNS XTeam", async () => {
    prepareDatabase({ dnsHost: null });
    const app = express(); app.use(express.json()); registerApiRoutes(app);
    const running = await startRoute(app); server = running.server;
    const response = await fetch(`${running.url}/api/v5/app-login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "cliente.teste", password: "senha-correta", appId: "optimus" }) });
    expect(response.status).toBe(403);
  });
});
