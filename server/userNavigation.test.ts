import { describe, expect, it } from "vitest";
import { buildDeviceListsHref, buildUserEditHref, buildUsersHref, getListsReturnHref, getListsReturnLabel, getUsersNavigationState } from "../client/src/lib/userNavigation";

describe("navegação preservada entre usuários, edição e listas", () => {
  it("mantém busca e página ao abrir a edição e voltar após salvar", () => {
    const state = getUsersNavigationState("/users?search=Roni&page=2");
    expect(state).toEqual({ search: "Roni", page: 2 });
    expect(buildUserEditHref(42, state)).toBe("/users/42/edit?search=Roni&page=2");
    expect(buildUsersHref(state)).toBe("/users?search=Roni&page=2");
  });

  it("faz a tela de Listas voltar à edição quando foi aberta a partir dela", () => {
    const listHref = buildDeviceListsHref(42, { search: "Roni", page: 2 });
    expect(listHref).toBe("/users/42/lists?returnTo=edit&search=Roni&page=2");
    expect(getListsReturnHref(42, listHref)).toBe("/users/42/edit?search=Roni&page=2");
    expect(getListsReturnLabel(listHref)).toBe("Voltar para Editar usuário");
  });

  it("mantém o retorno padrão para Usuários quando Listas foi aberta sem origem de edição", () => {
    expect(getListsReturnHref(42, "/users/42/lists")).toBe("/users");
    expect(getListsReturnLabel("/users/42/lists")).toBe("Voltar para Usuários");
  });
});
