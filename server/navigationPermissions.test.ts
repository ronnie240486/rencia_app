import { describe, expect, it } from "vitest";
import { getVisibleNavigationGroups, isOwnerOnlyRoute } from "../client/src/components/sidebarNavigation";

describe("permissões de navegação do painel compartilhado", () => {
  it("oculta ferramentas do proprietário para uma revenda", () => {
    const groups = [{ items: [{ label: "Clientes" }, { label: "Aplicativos", ownerOnly: true }] }];
    expect(getVisibleNavigationGroups(groups, false, false)[0].items).toEqual([{ label: "Clientes" }]);
  });

  it("bloqueia rotas exclusivas do proprietário e mantém as operacionais disponíveis", () => {
    expect(isOwnerOnlyRoute("/settings")).toBe(true);
    expect(isOwnerOnlyRoute("/aplicativos/evolux")).toBe(true);
    expect(isOwnerOnlyRoute("/users")).toBe(false);
    expect(isOwnerOnlyRoute("/dns")).toBe(false);
    expect(isOwnerOnlyRoute("/pagamentos")).toBe(false);
  });
});
