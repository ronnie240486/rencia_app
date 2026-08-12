import { describe, expect, it } from "vitest";
import { bulkDeviceUpdateSchema } from "./deviceBulk";

describe("alterações em massa de clientes", () => {
  it("aceita bloqueio de clientes selecionados", () => {
    expect(bulkDeviceUpdateSchema.parse({ ids: [1, 2], status: "Bloqueado" })).toMatchObject({ ids: [1, 2], status: "Bloqueado" });
  });

  it("rejeita uma ação em massa sem alteração definida", () => {
    expect(() => bulkDeviceUpdateSchema.parse({ ids: [1] })).toThrow("Escolha pelo menos uma configuração");
  });
});
