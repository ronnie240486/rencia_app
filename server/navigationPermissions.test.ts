import { describe, expect, it } from "vitest";
import { getVisibleNavigationGroups, isOwnerOnlyRoute, OWNER_ONLY_ROUTE_PREFIXES } from "../client/src/components/sidebarNavigation";

describe("permissões de navegação do painel compartilhado", () => {
  it("oculta ferramentas do proprietário para uma revenda", () => {
    const groups = [{ items: [{ label: "Clientes" }, { label: "Aplicativos", ownerOnly: true }] }];
    expect(getVisibleNavigationGroups(groups, false, false)[0].items).toEqual([{ label: "Clientes" }]);
  });

  it("bloqueia rotas exclusivas do proprietário e mantém as operacionais disponíveis", () => {
    OWNER_ONLY_ROUTE_PREFIXES.forEach(path => expect(isOwnerOnlyRoute(path)).toBe(true));
    ["/aplicativos/prestige", "/aplicativos/optimus", "/aplicativos/imperio", "/aplicativos/infinitus", "/aplicativos/supremus", "/aplicativos/evolux"].forEach(path => expect(isOwnerOnlyRoute(path)).toBe(true));
    ["/users", "/users/create", "/dns", "/pagamentos", "/relatorios", "/manutencao", "/agenda-renovacao"].forEach(path => expect(isOwnerOnlyRoute(path)).toBe(false));
  });
});
