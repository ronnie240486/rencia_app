import { describe, expect, it } from "vitest";
import { buildUltraPlayerConfig, normalizeMacAddress } from "./ultraPlayerConfig";

describe("configuração pública do Ultra Player", () => {
  it("normaliza MACs em formatos aceitos", () => {
    expect(normalizeMacAddress("aa-bb-cc-dd-ee-ff")).toBe("AA:BB:CC:DD:EE:FF");
    expect(normalizeMacAddress("aabbccddeeff")).toBe("AA:BB:CC:DD:EE:FF");
    expect(normalizeMacAddress("mac inválido")).toBeNull();
  });

  it("expõe as imagens e ícones configurados no contrato do APK", () => {
    const config = buildUltraPlayerConfig({
      ultra_app_name: "Meu Ultra",
      ultra_server_api_url: "https://api.exemplo.com",
      ultra_message_title: "Aviso",
      ultra_icon_movies_url: "https://cdn.exemplo.com/filmes.png",
    }, { logoUrl: "https://cdn.exemplo.com/logo.png" });

    expect(config.app_name).toBe("Meu Ultra");
    expect(config.server_api_url).toBe("https://api.exemplo.com");
    expect(config.message_title).toBe("Aviso");
    expect(config.logo_url).toBe("https://cdn.exemplo.com/logo.png");
    expect(config.icons.movies).toBe("https://cdn.exemplo.com/filmes.png");
  });
});
