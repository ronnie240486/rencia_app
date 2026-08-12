import { describe, expect, it } from "vitest";

function uniqueTargets(sourceDeviceId: number, targetDeviceIds: number[]) {
  return [...new Set(targetDeviceIds)].filter((id) => id !== sourceDeviceId);
}

describe("cópia de listas", () => {
  it("remove a origem e duplicidades dos clientes de destino", () => {
    expect(uniqueTargets(4, [4, 9, 9, 12])).toEqual([9, 12]);
  });
});
