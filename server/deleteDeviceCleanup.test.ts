import { beforeEach, describe, expect, it, vi } from "vitest";
import { appCredentials, auditLogs, customerNotes, deviceListNotificationReceipts, deviceTags, devices, deviceUrls, listFailoverEvents, listHealthChecks, maintenanceTasks, notices, payments, remoteDeviceCommands } from "../drizzle/schema";

const state = vi.hoisted(() => ({ deleteMock: vi.fn(), selectMock: vi.fn() }));

vi.mock("drizzle-orm/mysql2", () => ({
  drizzle: vi.fn(() => ({ delete: state.deleteMock, select: state.selectMock })),
}));

import { deleteDevice } from "./db";

describe("deleteDevice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = "mysql://test";
    let selectCall = 0;
    state.selectMock.mockImplementation(() => {
      const call = selectCall++;
      return {
        from: vi.fn(() => ({
          where: vi.fn(() => call === 0
            ? { limit: vi.fn().mockResolvedValue([{ id: 91, mac: "AA:BB:CC:DD:EE:FF" }]) }
            : [{ id: 91 }, { id: 92 }]),
        })),
      };
    });
    state.deleteMock.mockImplementation(() => ({ where: vi.fn().mockResolvedValue(undefined) }));
  });

  it("remove registros dependentes e todas as duplicatas do mesmo MAC antes de liberá-lo", async () => {
    await deleteDevice(91, 7);

    const removedTables = state.deleteMock.mock.calls.map(([table]) => table);
    expect(removedTables).toEqual(expect.arrayContaining([
      appCredentials,
      deviceListNotificationReceipts,
      remoteDeviceCommands,
      listHealthChecks,
      listFailoverEvents,
      payments,
      deviceTags,
      customerNotes,
      maintenanceTasks,
      notices,
      auditLogs,
      deviceUrls,
    ]));
    expect(removedTables).toHaveLength(13);
    expect(state.selectMock).toHaveBeenCalledTimes(2);
    expect(removedTables.at(-1)).toBe(devices);
  });
});
