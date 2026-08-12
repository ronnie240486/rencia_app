import { describe, expect, it } from "vitest";
import { validateListUrl } from "./listHealth";

describe("validação segura de URL de lista", () => {
  it("rejeita destinos internos e protocolos não suportados", async () => {
    await expect(validateListUrl("http://127.0.0.1:3000/lista")).resolves.toMatchObject({ valid: false });
    await expect(validateListUrl("http://192.168.1.1/lista")).resolves.toMatchObject({ valid: false });
    await expect(validateListUrl("file:///etc/passwd")).resolves.toMatchObject({ valid: false });
  });

  it("rejeita URL malformada antes de qualquer conexão", async () => {
    await expect(validateListUrl("nao-e-url")).resolves.toMatchObject({ valid: false, message: "URL inválida" });
  });
});
