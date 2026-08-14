import { describe, expect, it } from "vitest";
import { classifyListHttpStatus, classifyListTimeout, hasConfirmedListFailure, validateListUrl } from "./listHealth";

describe("validação segura de URL de lista", () => {
  it("rejeita destinos internos e protocolos não suportados", async () => {
    await expect(validateListUrl("http://127.0.0.1:3000/lista")).resolves.toMatchObject({ valid: false });
    await expect(validateListUrl("http://192.168.1.1/lista")).resolves.toMatchObject({ valid: false });
    await expect(validateListUrl("file:///etc/passwd")).resolves.toMatchObject({ valid: false });
  });

  it("rejeita URL malformada antes de qualquer conexão", async () => {
    await expect(validateListUrl("nao-e-url")).resolves.toMatchObject({ valid: false, message: "URL inválida" });
  });

  it("não trata HTTP 403 de proteção do servidor como lista indisponível", () => {
    expect(classifyListHttpStatus(403, 77)).toEqual({
      status: "success",
      statusCode: 403,
      responseTimeMs: 77,
      message: "Servidor protegido (HTTP 403); não é falha de lista",
    });
    expect(classifyListHttpStatus(500, 77).status).toBe("error");
  });

  it("só confirma falha depois de dois erros consecutivos", () => {
    expect(hasConfirmedListFailure([{ status: "error" }])).toBe(false);
    expect(hasConfirmedListFailure([{ status: "error" }, { status: "success" }])).toBe(false);
    expect(hasConfirmedListFailure([{ status: "error" }, { status: "error" }])).toBe(true);
  });

  it("mantém timeout como observação, sem confirmar lista fora", () => {
    expect(classifyListTimeout(17002)).toMatchObject({ status: "pending", responseTimeMs: 17002 });
    expect(hasConfirmedListFailure([{ status: "pending" }, { status: "error" }])).toBe(false);
  });
});
