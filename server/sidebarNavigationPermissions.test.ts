import { describe, expect, it } from "vitest";
import { getVisibleNavigationGroups, INITIAL_OPEN_NAV_GROUPS, isOwnerOnlyRoute } from "../client/src/components/sidebarNavigation";

describe("organização da barra lateral", () => {
  const groups = [
    { items: [{ label: "Usuários" }, { label: "Ultra Player", ownerOnly: true }] },
    { items: [{ label: "Backups", ownerOnly: true }] },
  ];

  it("inicia todos os grupos fechados", () => {
    expect(INITIAL_OPEN_NAV_GROUPS).toEqual([]);
  });

  it("mantém o grupo prioritário e oculta grupos sem itens disponíveis", () => {
    expect(getVisibleNavigationGroups(groups, false, false)).toEqual([
      { items: [{ label: "Usuários" }] },
    ]);
  });

  it("exibe os itens exclusivos ao proprietário", () => {
    expect(getVisibleNavigationGroups(groups, true, true)).toHaveLength(2);
    expect(getVisibleNavigationGroups(groups, true, true)[0].items).toHaveLength(2);
  });

  it("libera somente o item exclusivo autorizado para a revenda escolhida", () => {
    const permissionGroups = [{ items: [{ label: "Usuários" }, { label: "Backups", ownerOnly: true, permissionKey: "backups" }, { label: "Segurança", ownerOnly: true, permissionKey: "security" }] }];
    expect(getVisibleNavigationGroups(permissionGroups, false, false, ["backups"])[0].items.map(item => item.label)).toEqual(["Usuários", "Backups"]);
  });

  it("identifica rotas administrativas que uma revenda não pode abrir manualmente", () => {
    expect(isOwnerOnlyRoute("/settings")).toBe(true);
    expect(isOwnerOnlyRoute("/aplicativos/optimus")).toBe(true);
    expect(isOwnerOnlyRoute("/users")).toBe(false);
    expect(isOwnerOnlyRoute("/dns")).toBe(false);
  });
});
