import { describe, expect, it } from "vitest";
import { buildGenericAppConfig } from "./genericAppConfig";

describe("configuração dos novos aplicativos", () => {
  it("constrói uma resposta segura com imagens, atualização e listas", () => {
    const config = buildGenericAppConfig("prestige", "Prestige", {
      prestige_logo_url: "https://cdn.example/logo.png",
      prestige_apk_version: "2.0.0",
      prestige_message_title: "Bem-vindo",
    }, ["https://lista.example/a", ""]);
    expect(config).toMatchObject({ app_id: "prestige", app_name: "Prestige", logo_url: "https://cdn.example/logo.png", apk_version: "2.0.0", message_title: "Bem-vindo", playlist_urls: ["https://lista.example/a"] });
    expect(config.icons.movies).toBe("");
  });
});
