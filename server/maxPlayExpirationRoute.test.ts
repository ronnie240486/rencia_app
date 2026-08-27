import express, { type Express } from "express";
import type { Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appSettings, devices, deviceUrls } from "../drizzle/schema";

const database = {
  select: vi.fn(),
  update: vi.fn(() => ({ set: () => ({ where: async () => undefined }) })),
};

vi.mock("./db", () => ({ getDb: vi.fn(async () => database) }));

import { registerApiRoutes } from "./apiRoutes";

function queryResult<T>(rows: T[]) {
  const query = {
    where: () => query,
    limit: async () => rows,
    orderBy: async () => rows,
    then: (resolve: (value: T[]) => unknown, reject?: (reason: unknown) => unknown) => Promise.resolve(rows).then(resolve, reject),
  };
  return query;
}

function prepareMaxPlayDatabase() {
  const device = {
    id: 77, ownerId: 1, mac: "6A:55:E2:DB:C3:4A", app: "Maximus", nomeServer: "Max Play", status: "Liberado" as const,
    dataExpiracao: "2026-08-20", urlM3u8: "https://dns.exemplo.com/get.php?username=x&password=y", modoSelecao: "M3U8" as const,
    activeDeviceUrlId: null, urlEpg: null, tipo: "Usuario" as const, valor: null, dataCadastro: new Date(), createdAt: new Date(), updatedAt: new Date(), lastSeen: null,
    currentContent: null, telefone: null, forceShowChannel: false, listFailoverEnabled: true, maxConcurrentConnections: 1, accessMode: "MAC" as const,
  };
  database.select.mockImplementation(() => ({ from: (table: unknown) => {
    if (table === devices) return queryResult([device]);
    if (table === appSettings) return queryResult([]);
    if (table === deviceUrls) return queryResult([]);
    return queryResult([]);
  } }));
  return device;
}

async function startRoute(app: Express) {
  const server = await new Promise<Server>((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Porta de teste inválida");
  return { server, url: `http://127.0.0.1:${address.port}` };
}

describe("GET /api/v5/check_mac.php — vencimento Max Play", () => {
  let server: Server | null = null;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-20T14:00:00-03:00"));
    database.select.mockReset();
    database.update.mockClear();
  });

  afterEach(async () => {
    if (server) await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()));
    server = null;
    vi.useRealTimers();
  });

  it("entrega o modal de vencimento hoje pela resposta que o Max Play consulta", async () => {
    prepareMaxPlayDatabase();
    const app = express(); app.use(express.json()); registerApiRoutes(app);
    const running = await startRoute(app); server = running.server;
    const response = await fetch(`${running.url}/api/v5/check_mac.php?mac=6A%3A55%3AE2%3ADB%3AC3%3A4A`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      registered: true,
      status: "Liberado",
      expire_date: "2026-08-20",
      expiration_state: "expires_today",
      expiration_show_modal: true,
      expiration_modal_title: "Seu acesso vence hoje",
    });
    expect(body.expiration_modal_message).toContain("Renove para evitar interrupção");
  });

  it("entrega o modal quando faltam quatro dias para vencer", async () => {
    const device = prepareMaxPlayDatabase();
    device.dataExpiracao = "2026-08-24";
    const app = express(); app.use(express.json()); registerApiRoutes(app);
    const running = await startRoute(app); server = running.server;
    const response = await fetch(`${running.url}/api/v5/check_mac.php?mac=6A%3A55%3AE2%3ADB%3AC3%3A4A`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      registered: true,
      expiration_state: "upcoming",
      expiration_show_modal: true,
      show_expiration_modal: true,
      expiration_modal_title: "Seu acesso vence em 4 dias",
    });
  });
});
