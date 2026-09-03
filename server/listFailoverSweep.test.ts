import { beforeEach, describe, expect, it, vi } from "vitest";
import { devices, deviceUrls, dnsEntries, listFailoverEvents, listHealthChecks, serverMaintenanceBlocks } from "../drizzle/schema";

const state = vi.hoisted(() => ({
  probe: vi.fn(),
  updates: [] as Record<string, unknown>[],
  events: [] as Record<string, unknown>[],
  health: [] as Record<string, unknown>[],
}));

vi.mock("./listHealth", () => ({
  probeListUrl: state.probe,
  hasConfirmedListFailure: (checks: Array<{ status: string }>) => checks.length === 2 && checks.every((check) => check.status === "error"),
  isConfirmedListResponse: (result: { status: string; responseConfirmed?: boolean }) => result.status === "success" && result.responseConfirmed === true,
}));

vi.mock("./listFailureAlerts", () => ({ syncConfirmedListFailureAlert: vi.fn().mockResolvedValue(undefined) }));

import { runListFailoverSweep } from "./listFailover";
import { buildApkFailoverStatus } from "./apkListNotifications";

type DeviceState = { id: number; ownerId: number; nomeServer: string; urlM3u8: string; activeDeviceUrlId: number | null; listFailoverEnabled: boolean };

function createDb(device: DeviceState, dns: Array<{ host: string; grupo: string; ativo: boolean }> = []) {
  const primaryHealth = [{ status: "error" }, { status: "error" }];
  const backup = { id: 22, nome: "Lista 2", ordem: 0, ativo: true, modoSelecao: "M3U8", urlM3u8: "https://backup.example/list.m3u" };
  return {
    select: () => ({
      from: (table: unknown) => ({
        where: () => {
          if (table === devices) return Promise.resolve([device]);
          if (table === serverMaintenanceBlocks) return Promise.resolve([]);
          if (table === deviceUrls) return { orderBy: () => Promise.resolve([backup]) };
          if (table === dnsEntries) return Promise.resolve(dns);
          if (table === listHealthChecks) return { orderBy: () => ({ limit: () => Promise.resolve(primaryHealth) }) };
          if (table === listFailoverEvents) return { orderBy: () => ({ limit: () => Promise.resolve([]) }) };
          return Promise.resolve([]);
        },
      }),
    }),
    insert: (table: unknown) => ({ values: (value: Record<string, unknown>) => {
      if (table === listHealthChecks) state.health.push(value);
      if (table === listFailoverEvents) state.events.push(value);
      return Promise.resolve(undefined);
    } }),
    update: () => ({ set: (value: Record<string, unknown>) => ({ where: () => { state.updates.push(value); return Promise.resolve(undefined); } }) }),
  };
}

describe("varredura de failover", () => {
  beforeEach(() => {
    state.probe.mockReset();
    state.updates.length = 0;
    state.events.length = 0;
    state.health.length = 0;
  });

  it("ativa a Lista 2 depois de falha confirmada da Lista 1 e gera payload backup_active", async () => {
    state.probe.mockResolvedValueOnce({ status: "error", responseConfirmed: true, statusCode: 503, responseTimeMs: 0, message: "indisponível" })
      .mockResolvedValueOnce({ status: "success", responseConfirmed: true, statusCode: 200, responseTimeMs: 10, message: "ok" });
    const device: DeviceState = { id: 10, ownerId: 1, nomeServer: "Cliente", urlM3u8: "https://primary.example/list.m3u", activeDeviceUrlId: null, listFailoverEnabled: true };

    const result = await runListFailoverSweep(createDb(device), 1);
    expect(result.switched).toBe(1);
    expect(state.updates).toContainEqual({ activeDeviceUrlId: 22 });
    const payload = buildApkFailoverStatus({ activeDeviceUrlId: 22 }, [{ id: 22, nome: "Lista 2", ordem: 0 }], { id: 1, fromDeviceUrlId: null, toDeviceUrlId: 22, createdAt: new Date() });
    expect(payload).toMatchObject({ failover_state: "backup_active", active_list_number: 2, playlist_sync_required: true });
  });

  it("troca imediatamente para a Lista 2 quando todas as DNS do perfil falham", async () => {
    state.probe.mockImplementation(async (url: string) => url.includes("club")
      ? { status: "error", responseConfirmed: false, statusCode: 503, responseTimeMs: 5, message: "indisponível" }
      : { status: "success", responseConfirmed: true, statusCode: 200, responseTimeMs: 5, message: "ok" });
    const device: DeviceState = { id: 10, ownerId: 1, nomeServer: "Cliente", urlM3u8: "https://dns1.club.test/list.m3u", activeDeviceUrlId: null, listFailoverEnabled: true };

    const result = await runListFailoverSweep(createDb(device, [
      { host: "https://dns1.club.test", grupo: "Club", ativo: true },
      { host: "https://dns2.club.test", grupo: "Club", ativo: true },
    ]), 1);

    expect(result.switched).toBe(1);
    expect(state.updates).toContainEqual({ activeDeviceUrlId: 22 });
  });

  it("restaura a Lista 1 quando ela volta e gera payload primary_restored", async () => {
    state.probe.mockResolvedValueOnce({ status: "success", responseConfirmed: true, statusCode: 200, responseTimeMs: 10, message: "ok" });
    const device: DeviceState = { id: 10, ownerId: 1, nomeServer: "Cliente", urlM3u8: "https://primary.example/list.m3u", activeDeviceUrlId: 22, listFailoverEnabled: true };

    const result = await runListFailoverSweep(createDb(device), 1);
    expect(result.switched).toBe(1);
    expect(state.updates).toContainEqual({ activeDeviceUrlId: null });
    const payload = buildApkFailoverStatus({ activeDeviceUrlId: null }, [{ id: 22, nome: "Lista 2", ordem: 0 }], { id: 2, fromDeviceUrlId: 22, toDeviceUrlId: null, createdAt: new Date() });
    expect(payload).toMatchObject({ failover_state: "primary_restored", active_list_number: 1, playlist_sync_required: true });
  });
});
