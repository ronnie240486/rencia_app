import { describe, expect, it } from "vitest";
import { appServerFallbackSettingKey, appServerSettingKey, buildAppServerDirectory, FALLBACK_PANEL_ORIGIN, normalizeAppServerOrigin } from "./appServerDirectory";

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

  it("oferece Manus e Railway quando nenhum fallback personalizado foi salvo", () => {
    const directory = buildAppServerDirectory("excellence", "Excellence");
    expect(directory).toMatchObject({
      primary_api_origin: "https://renciaapp.manus.space",
      fallback_api_origin: FALLBACK_PANEL_ORIGIN,
      api_origins: ["https://renciaapp.manus.space", FALLBACK_PANEL_ORIGIN],
    });
  });

  it("normaliza o fallback personalizado e remove duplicação quando os endereços são iguais", () => {
    const directory = buildAppServerDirectory("future", "Future", "https://appplus.top/api", "https://backup.appplus.top/api");
    expect(directory.primary_api_origin).toBe("https://appplus.top");
    expect(directory.fallback_api_origin).toBe("https://backup.appplus.top");
    expect(directory.api_origins).toEqual(["https://appplus.top", "https://backup.appplus.top"]);
  });

  it("rejeita valores que não sejam uma URL HTTP(S)", () => {
    expect(normalizeAppServerOrigin("javascript:alert(1)")).toBe("https://renciaapp.manus.space");
  });

  it("usa chaves exclusivas sem reaproveitar URLs operacionais dos aplicativos", () => {
    expect(appServerSettingKey("maximus")).toBe("app_api_origin_maximus");
    expect(appServerSettingKey("fusion")).toBe("app_api_origin_fusion");
    expect(appServerSettingKey("future")).toBe("app_api_origin_future");
    expect(appServerFallbackSettingKey("future")).toBe("app_api_fallback_origin_future");
  });
});
