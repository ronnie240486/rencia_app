import { describe, expect, it, vi } from "vitest";
import { classifyListHttpStatus, classifyListTimeout, hasConfirmedListFailure, hasUsableM3uContent, isConfirmedListResponse, isLikelyM3uUrl, probeListUrl, validateListUrl } from "./listHealth";

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
      responseConfirmed: false,
    });
    expect(classifyListHttpStatus(500, 77).status).toBe("error");
  });

  it("não usa HTTP 403 protegido para confirmar que a Lista 1 pode ser restaurada", () => {
    expect(isConfirmedListResponse(classifyListHttpStatus(403, 50))).toBe(false);
    expect(isConfirmedListResponse(classifyListHttpStatus(200, 50))).toBe(true);
  });

  it("só confirma falha depois de dois erros consecutivos", () => {
    expect(hasConfirmedListFailure([{ status: "error" }])).toBe(false);
    expect(hasConfirmedListFailure([{ status: "error" }, { status: "success" }])).toBe(false);
    expect(hasConfirmedListFailure([{ status: "error" }, { status: "error" }])).toBe(true);
  });

  it("reconhece conteúdo M3U e rejeita resposta HTTP sem playlist", () => {
    expect(hasUsableM3uContent("#EXTM3U\\n#EXTINF:-1,Canal\\nhttps://stream.example/live")).toBe(true);
    expect(hasUsableM3uContent("User account is incorrect")).toBe(false);
    expect(isLikelyM3uUrl("http://server.example/get.php?type=m3u_plus")).toBe(true);
    expect(isLikelyM3uUrl("http://server.example/player_api.php")).toBe(false);
  });

  it("exige conteúdo M3U no probe autenticado mesmo com HTTP 200", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response("conta inválida", { status: 200 }));
    await expect(probeListUrl("https://example.com/get.php?username=u&password=p&type=m3u_plus", { requireM3uContent: true, timeoutMs: 1000 }))
      .resolves.toMatchObject({ status: "pending", responseConfirmed: false, message: "Servidor respondeu, mas o conteúdo M3U não pôde ser confirmado" });
    fetchMock.mockReset()
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response("#EXTM3U\\n#EXTINF:-1,Canal\\nhttps://stream.example/live", { status: 200 }));
    await expect(probeListUrl("https://example.com/get.php?username=u&password=p&type=m3u_plus", { requireM3uContent: true, timeoutMs: 1000 }))
      .resolves.toMatchObject({ status: "success", responseConfirmed: true });
    fetchMock.mockRestore();
  });

  it("mantém timeout como observação, sem confirmar lista fora", () => {
    expect(classifyListTimeout(17002)).toMatchObject({ status: "pending", responseTimeMs: 17002 });
    expect(hasConfirmedListFailure([{ status: "pending" }, { status: "error" }])).toBe(false);
  });

  it("reconhece que o Host respondeu mesmo quando a rota raiz não é uma M3U", () => {
    expect(classifyListHttpStatus(404, 10).statusCode).toBe(404);
    expect(classifyListHttpStatus(404, 10).responseConfirmed).toBe(false);
    expect(classifyListHttpStatus(403, 10).status).toBe("success");
  });

  it("mantém HTTP 5xx como falha do Host", () => {
    expect(classifyListHttpStatus(500, 10).status).toBe("error");
    expect(classifyListHttpStatus(500, 10).responseConfirmed).toBe(false);
  });
});
