import { describe, expect, it } from "vitest";
import { revendaUpdateInputSchema } from "./routers";

describe("revendaUpdateInputSchema", () => {
  it("aceita senha vazia ao atualizar somente os demais dados da revenda", () => {
    const result = revendaUpdateInputSchema.parse({
      id: 1,
      name: "Revenda Teste",
      password: "",
      limiteDevices: 50,
    });

    expect(result.password).toBe("");
    expect(result.limiteDevices).toBe(50);
  });

  it("aceita uma nova senha segura e rejeita senha curta", () => {
    expect(revendaUpdateInputSchema.parse({ id: 1, password: "senha-segura" }).password).toBe("senha-segura");
    expect(() => revendaUpdateInputSchema.parse({ id: 1, password: "1234567" })).toThrow();
  });
});
