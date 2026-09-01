import { describe, expect, it } from "vitest";
import { deviceMacs, devices } from "../drizzle/schema";
import { findDeviceByAnyMac } from "./deviceMacLookup";

function fakeDb(primaryRows: unknown[], aliasRows: unknown[], linkedRows: unknown[]) {
  let queryNumber = 0;
  return {
    select: () => ({
      from: (_table: unknown) => {
        queryNumber += 1;
        const rows = queryNumber === 1 ? primaryRows : queryNumber === 2 ? aliasRows : linkedRows;
        return { where: () => ({ limit: async () => rows }) };
      },
    }),
  };
}

describe("findDeviceByAnyMac", () => {
  it("mantém a resolução do MAC principal com ou sem separadores", async () => {
    const device = { id: 12, mac: "AA:BB:CC:DD:EE:FF", ownerId: 1 };
    await expect(findDeviceByAnyMac(fakeDb([device], [], []), "aabbccddeeff")).resolves.toEqual(device);
  });

  it("resolve um MAC adicional para o cadastro principal sem duplicar o cliente", async () => {
    const device = { id: 12, mac: "AA:BB:CC:DD:EE:FF", ownerId: 1 };
    await expect(findDeviceByAnyMac(fakeDb([], [{ deviceId: 12 }], [device]), "11:22:33:44:55:66")).resolves.toEqual(device);
  });

  it("retorna nulo para MAC inválido ou não cadastrado", async () => {
    await expect(findDeviceByAnyMac(fakeDb([], [], []), "invalido")).resolves.toBeNull();
    await expect(findDeviceByAnyMac(fakeDb([], [], []), "11:22:33:44:55:66")).resolves.toBeNull();
  });
});
