import { describe, expect, it } from "vitest";
import { buildXtreamMetadataUrl, lookupPlaylistExpiration, parseProviderExpiration } from "./playlistExpiration";

describe("consulta de validade de lista", () => {
  it("monta player_api a partir dos dados XTeam", () => {
    expect(buildXtreamMetadataUrl({
      modoSelecao: "XTeamCode",
      xtServer: "http://painel.exemplo.com:8080/",
      xtUsername: "cliente teste",
      xtPassword: "senha&segura",
    })).toBe("http://painel.exemplo.com:8080/player_api.php?username=cliente%20teste&password=senha%26segura");
  });

  it("extrai as credenciais de uma M3U e monta player_api", () => {
    expect(buildXtreamMetadataUrl({
      modoSelecao: "M3U8",
      urlM3u8: "https://lista.exemplo.com/get.php?username=cliente&password=123&type=m3u_plus",
    })).toBe("https://lista.exemplo.com/player_api.php?username=cliente&password=123");
  });

  it("interpreta exp_date Unix, ISO e data simples", () => {
    expect(parseProviderExpiration("2026-12-31")).toBe("2026-12-31");
    expect(parseProviderExpiration("1798675200")).toBe("2026-12-31");
    expect(parseProviderExpiration("2026-12-31T15:00:00Z")).toBe("2026-12-31");
  });

  it("interpreta datas brasileiras com barra ou hífen", () => {
    expect(parseProviderExpiration("31/08/2026")).toBe("2026-08-31");
    expect(parseProviderExpiration("31-08-2026")).toBe("2026-08-31");
  });

  it("encontra a validade em parâmetro da URL quando o provedor não expõe API", async () => {
    await expect(lookupPlaylistExpiration({ modoSelecao: "M3U8", urlM3u8: "https://lista.exemplo.com/list.m3u?expires=31%2F08%2F2026" }, async () => new Response(""))).resolves.toMatchObject({
      found: true,
      expirationDate: "2026-08-31",
      source: "playlist-body",
    });
  });

  it("encontra validade em texto simples retornado pela lista", async () => {
    await expect(lookupPlaylistExpiration({ modoSelecao: "M3U8", urlM3u8: "https://example.com/list.m3u" }, async () => new Response("Expira em: 31/08/2026", { status: 200 }))).resolves.toMatchObject({
      found: true,
      expirationDate: "2026-08-31",
      source: "playlist-body",
    });
  });

  it("não inventa uma validade quando o provedor não informou data", () => {
    expect(parseProviderExpiration(null)).toBeNull();
    expect(parseProviderExpiration("0")).toBeNull();
    expect(parseProviderExpiration("sem data")).toBeNull();
  });
});
