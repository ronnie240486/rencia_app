import { describe, expect, it } from "vitest";
import { getMaximusTestApiUrl, maximusTestConfiguration } from "./maximusTestApi";

describe("configuração da API de teste do Maximus", () => {
  it("entrega a URL cadastrada nos campos compatível e explícito", () => {
    const config = maximusTestConfiguration({ gpcpro_server_url: " https://teste.exemplo/api " });
    expect(config).toEqual({ dns_url: "https://teste.exemplo/api", test_api_url: "https://teste.exemplo/api" });
  });

  it("mantém os fallbacks históricos quando a URL própria não foi cadastrada", () => {
    expect(getMaximusTestApiUrl({ server_url: "https://fallback.exemplo" })).toBe("https://fallback.exemplo");
  });
});
