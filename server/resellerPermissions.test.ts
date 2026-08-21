import { describe, expect, it } from "vitest";
import { normalizeResellerPermissions, permissionForRoute } from "../shared/resellerPermissions";
import { OWNER_ONLY_ROUTE_PREFIXES } from "../client/src/components/sidebarNavigation";

describe("permissões individuais de revenda", () => {
  it("mantém somente permissões válidas e sem duplicação", () => {
    expect(normalizeResellerPermissions(["backups", "backups", "invalida", 4])).toEqual(["backups"]);
  });

  it("identifica a permissão exigida por uma rota exclusiva", () => {
    expect(permissionForRoute("/aplicativos/optimus")).toBe("app_settings");
    expect(permissionForRoute("/backups")).toBe("backups");
    expect(permissionForRoute("/users")).toBeNull();
  });

  it("cobre cada rota exclusiva do proprietário com uma permissão liberável", () => {
    expect(OWNER_ONLY_ROUTE_PREFIXES.filter(route => !permissionForRoute(route))).toEqual([]);
  });
});
