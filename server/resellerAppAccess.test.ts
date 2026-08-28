import { describe, expect, it } from "vitest";
import { parseResellerAccessPolicy, serializeResellerAccessPolicy } from "../shared/resellerPermissions";

describe("aplicativos liberados por revenda", () => {
  it("mantém permissões legadas sem bloquear aplicativos existentes", () => {
    expect(parseResellerAccessPolicy('["app_settings"]').allowedApps).toBeNull();
  });

  it("mantém permissões e aplicativos ao salvar a nova política", () => {
    const saved = serializeResellerAccessPolicy({ permissions: ["app_settings"], allowedApps: ["future", "ouropro"] });
    expect(parseResellerAccessPolicy(saved)).toEqual({ permissions: ["app_settings"], allowedApps: ["future", "ouropro"] });
  });

  it("ignora aplicativos inválidos recebidos em dados antigos", () => {
    expect(parseResellerAccessPolicy({ permissions: [], allowedApps: ["future", "nao-existe"] }).allowedApps).toEqual(["future"]);
  });

  it("mantém as permissões de navegação junto dos aplicativos liberados", () => {
    const policy = parseResellerAccessPolicy(JSON.stringify({
      permissions: ["app_distribution", "app_settings"],
      allowedApps: ["ouropro", "future"],
    }));

    expect(policy.permissions).toEqual(["app_distribution", "app_settings"]);
    expect(policy.allowedApps).toEqual(["ouropro", "future"]);
  });
});
