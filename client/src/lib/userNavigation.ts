export type UsersNavigationState = {
  search: string;
  page: number;
};

const defaultUsersNavigation: UsersNavigationState = { search: "", page: 1 };
const USERS_NAVIGATION_STORAGE_KEY = "rencia:users-navigation";
const DEVICE_LISTS_ORIGIN_KEY_PREFIX = "rencia:device-lists-origin:";

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

function getStorage() {
  if (typeof window === "undefined") return null;
  return window.sessionStorage;
}

function hasNavigationContext(state: UsersNavigationState) {
  return Boolean(state.search) || state.page > 1;
}

/** Guarda a busca durante a mesma sessão do painel, inclusive entre telas diferentes. */
export function rememberUsersNavigation(state: UsersNavigationState) {
  getStorage()?.setItem(USERS_NAVIGATION_STORAGE_KEY, JSON.stringify(state));
}

export function getRememberedUsersNavigation(): UsersNavigationState {
  try {
    const raw = getStorage()?.getItem(USERS_NAVIGATION_STORAGE_KEY);
    if (!raw) return defaultUsersNavigation;
    const parsed = JSON.parse(raw) as Partial<UsersNavigationState>;
    return { search: typeof parsed.search === "string" ? parsed.search.trim() : "", page: normalizePage(String(parsed.page ?? 1)) };
  } catch {
    return defaultUsersNavigation;
  }
}

/** Usa a URL quando disponível e a memória da sessão como proteção para retornos de celular. */
export function resolveUsersNavigation(location: string | undefined, remembered = getRememberedUsersNavigation()): UsersNavigationState {
  const fromUrl = getUsersNavigationState(location);
  return hasNavigationContext(fromUrl) ? fromUrl : remembered;
}

/** Marca que Listas foi aberta a partir de Editar para que o botão voltar não caia na lista de MACs. */
export function rememberListsEditOrigin(deviceId: number, state: UsersNavigationState) {
  rememberUsersNavigation(state);
  getStorage()?.setItem(`${DEVICE_LISTS_ORIGIN_KEY_PREFIX}${deviceId}`, "edit");
}

function hasRememberedListsEditOrigin(deviceId: number) {
  return getStorage()?.getItem(`${DEVICE_LISTS_ORIGIN_KEY_PREFIX}${deviceId}`) === "edit";
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

export function getListsReturnHref(deviceId: number, location: string | undefined, remembered = getRememberedUsersNavigation()) {
  const query = location?.split("?")[1] ?? "";
  const params = new URLSearchParams(query);
  const state = resolveUsersNavigation(location, remembered);
  return params.get("returnTo") === "edit" || hasRememberedListsEditOrigin(deviceId) ? buildUserEditHref(deviceId, state) : buildUsersHref(state);
}

export function getListsReturnLabel(deviceId: number, location: string | undefined) {
  return new URLSearchParams(location?.split("?")[1] ?? "").get("returnTo") === "edit" || hasRememberedListsEditOrigin(deviceId)
    ? "Voltar para Editar usuário"
    : "Voltar para Usuários";
}
