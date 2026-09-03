import { describe, expect, it } from "vitest";
import { buildGenericAppConfig, findDeviceForManagedApp } from "./genericAppConfig";

describe("configuração dos novos aplicativos", () => {
  it("constrói uma resposta segura com imagens, atualização e listas", () => {
    const config = buildGenericAppConfig("prestige", "Prestige", {
      prestige_logo_url: "https://cdn.example/logo.png",
      prestige_apk_version: "2.0.0",
      prestige_message_title: "Bem-vindo",
    }, ["https://lista.example/a", ""], "https://iptv-epg.org/files/epg-br.xml");
    expect(config).toMatchObject({ app_id: "prestige", app_name: "Prestige", logo_url: "https://cdn.example/logo.png", apk_version: "2.0.0", message_title: "Bem-vindo", playlist_urls: ["https://lista.example/a"], urlEpg: "https://iptv-epg.org/files/epg-br.xml" });
    expect(config.icons.movies).toBe("");
  });

  it("seleciona o cadastro do app solicitado quando o MAC aparece em mais de um aplicativo", () => {
    const device = findDeviceForManagedApp([
      { id: 1, app: "OuroPro" },
      { id: 2, app: "Optimus" },
    ], ["Optimus"]);
    expect(device).toEqual({ id: 2, app: "Optimus" });
  });

  it("mantém Future na rota genérica com configuração isolada", () => {
    const config = buildGenericAppConfig("future", "Future", {
      future_logo_url: "/manus-storage/future-logo-20260827_1a714bae.jpg",
      future_apk_version: "1.0.0",
    }, ["https://lista.example/future"]);
    const device = findDeviceForManagedApp([{ id: 3, app: "Future" }, { id: 4, app: "OuroPro" }], ["Future", "Future Player"]);
    expect(config).toMatchObject({ app_id: "future", app_name: "Future", apk_version: "1.0.0" });
    expect(device).toEqual({ id: 3, app: "Future" });
  });
});
