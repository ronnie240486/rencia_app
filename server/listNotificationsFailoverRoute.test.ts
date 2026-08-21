import express, { type Express } from "express";
import type { Server } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  failover: null as Record<string, unknown> | null,
}));

vi.mock("./db", () => ({ getDb: vi.fn(async () => ({}) ) }));
vi.mock("./apkListNotifications", () => ({
  getListNotificationsForMac: vi.fn(async () => ({
    registered: true,
    device: { mac: "AA:BB:CC:DD:EE:FF" },
    notifications: [],
    failover: state.failover,
    expiration: { expiration_state: "none" },
  })),
  acknowledgeListNotificationForMac: vi.fn(async () => ({ ok: true })),
}));

import { registerApiRoutes } from "./apiRoutes";

async function startRoute(app: Express) {
  const server = await new Promise<Server>((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Porta de teste inválida");
  return { server, url: `http://127.0.0.1:${address.port}` };
}

describe("GET /api/v5/list-notifications", () => {
  let server: Server | null = null;

  afterEach(async () => {
    if (server) await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()));
    server = null;
  });

  it("entrega backup_active quando a Lista 2 assume", async () => {
    state.failover = { failover_active: true, failover_state: "backup_active", active_list_number: 2, playlist_sync_required: true, playlist_sync_mode: "background" };
    const app = express(); app.use(express.json()); registerApiRoutes(app);
    const running = await startRoute(app); server = running.server;
    const response = await fetch(`${running.url}/api/v5/list-notifications?mac=AA:BB:CC:DD:EE:FF`);
    expect(await response.json()).toMatchObject({ success: true, failover_state: "backup_active", active_list_number: 2, playlist_sync_required: true });
  });

  it("entrega primary_restored quando a Lista 1 volta", async () => {
    state.failover = { failover_active: false, failover_state: "primary_restored", active_list_number: 1, playlist_sync_required: true, playlist_sync_mode: "background" };
    const app = express(); app.use(express.json()); registerApiRoutes(app);
    const running = await startRoute(app); server = running.server;
    const response = await fetch(`${running.url}/api/v5/list-notifications?mac=AA:BB:CC:DD:EE:FF`);
    expect(await response.json()).toMatchObject({ success: true, failover_state: "primary_restored", active_list_number: 1, playlist_sync_required: true });
  });
});
