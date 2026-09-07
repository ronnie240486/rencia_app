export type UsersNavigationState = {
  search: string;
  page: number;
};

const defaultUsersNavigation: UsersNavigationState = { search: "", page: 1 };

function normalizePage(value: string | null) {
  const page = Number(value ?? 1);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function buildQuery(state: UsersNavigationState, includeReturnTo = false) {
  const params = new URLSearchParams();
  const search = state.search.trim();
  if (includeReturnTo) params.set("returnTo", "edit");
  if (search) params.set("search", search);
  if (state.page > 1) params.set("page", String(state.page));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function getUsersNavigationState(location: string | undefined): UsersNavigationState {
  const query = location?.split("?")[1] ?? "";
  const params = new URLSearchParams(query);
  return { search: params.get("search")?.trim() ?? "", page: normalizePage(params.get("page")) };
}

export function buildUsersHref(state: UsersNavigationState = defaultUsersNavigation) {
  return `/users${buildQuery(state)}`;
}

export function buildUserEditHref(deviceId: number, state: UsersNavigationState = defaultUsersNavigation) {
  return `/users/${deviceId}/edit${buildQuery(state)}`;
}

export function buildDeviceListsHref(deviceId: number, state: UsersNavigationState = defaultUsersNavigation) {
  return `/users/${deviceId}/lists${buildQuery(state, true)}`;
}

export function getListsReturnHref(deviceId: number, location: string | undefined) {
  const query = location?.split("?")[1] ?? "";
  const params = new URLSearchParams(query);
  const state: UsersNavigationState = { search: params.get("search")?.trim() ?? "", page: normalizePage(params.get("page")) };
  return params.get("returnTo") === "edit" ? buildUserEditHref(deviceId, state) : buildUsersHref(state);
}

export function getListsReturnLabel(location: string | undefined) {
  return new URLSearchParams(location?.split("?")[1] ?? "").get("returnTo") === "edit"
    ? "Voltar para Editar usuário"
    : "Voltar para Usuários";
}
