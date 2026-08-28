import { describe, expect, it } from "vitest";
import { appServerSettingKey, buildAppServerDirectory, normalizeAppServerOrigin } from "./appServerDirectory";

describe("central de endereço dos aplicativos", () => {
  it("mantém o domínio atual quando não há domínio novo configurado", () => {
    expect(normalizeAppServerOrigin("")).toBe("https://renciaapp.manus.space");
  });

  it("aceita um domínio próprio e constrói as rotas compatíveis", () => {
    const directory = buildAppServerDirectory("future", "Future", "https://appplus.top/api");
    expect(directory).toMatchObject({
      api_origin: "https://appplus.top",
      discovery_url: "https://appplus.top/api/v5/apps/future/discovery",
      config_url: "https://appplus.top/api/v5/apps/future/config",
      update_url: "https://appplus.top/api/v5/apps/future/update",
      heartbeat_url: "https://appplus.top/api/v5/heartbeat",
      migration_ready: true,
    });
  });

  it("rejeita valores que não sejam uma URL HTTP(S)", () => {
    expect(normalizeAppServerOrigin("javascript:alert(1)")).toBe("https://renciaapp.manus.space");
  });

  it("usa chaves exclusivas sem reaproveitar URLs operacionais dos aplicativos", () => {
    expect(appServerSettingKey("maximus")).toBe("app_api_origin_maximus");
    expect(appServerSettingKey("fusion")).toBe("app_api_origin_fusion");
    expect(appServerSettingKey("future")).toBe("app_api_origin_future");
  });
});
