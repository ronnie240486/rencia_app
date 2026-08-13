import { describe, expect, it } from "vitest";
import { getVisibleNavigationGroups } from "./sidebarNavigation";

describe("organização da barra lateral", () => {
  const groups = [
    { items: [{ label: "Usuários" }, { label: "Ultra Player", ownerOnly: true }] },
    { items: [{ label: "Backups", ownerOnly: true }] },
  ];

  it("mantém o grupo prioritário e oculta grupos sem itens disponíveis", () => {
    expect(getVisibleNavigationGroups(groups, false, false)).toEqual([
      { items: [{ label: "Usuários" }] },
    ]);
  });

  it("exibe os itens exclusivos ao proprietário", () => {
    expect(getVisibleNavigationGroups(groups, true, true)).toHaveLength(2);
    expect(getVisibleNavigationGroups(groups, true, true)[0].items).toHaveLength(2);
  });
});
