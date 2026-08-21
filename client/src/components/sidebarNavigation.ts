export interface AccessControlledNavItem {
  adminOnly?: boolean;
  ownerOnly?: boolean;
  permissionKey?: string;
}

export interface NavigationGroup<T extends AccessControlledNavItem> {
  items: T[];
}

/** Todos os grupos começam fechados e só expandem quando o usuário interage. */
export const INITIAL_OPEN_NAV_GROUPS: string[] = [];

/** Rotas que pertencem exclusivamente ao proprietário do painel. */
export const OWNER_ONLY_ROUTE_PREFIXES = [
  "/settings", "/app-settings", "/configuracoes", "/revendas", "/credenciais-app",
  "/busca", "/monitor-listas", "/diagnostico", "/chatbot", "/central", "/seguranca",
  "/permissoes", "/avisos", "/backups", "/cobrancas-revendas", "/relatorio-revendas",
  "/loja-painel", "/ranking-apps", "/atualizacoes", "/carousel", "/panel-functions",
  "/gpcpro", "/maximus", "/ultra-player", "/nuvix-config", "/aplicativos/",
];

export function isOwnerOnlyRoute(path: string) {
  return OWNER_ONLY_ROUTE_PREFIXES.some(prefix => path === prefix || path.startsWith(prefix.endsWith("/") ? prefix : `${prefix}/`));
}

/** Mantém apenas itens e grupos disponíveis para o perfil autenticado. */
export function getVisibleNavigationGroups<
  T extends AccessControlledNavItem,
  G extends NavigationGroup<T>,
>(
  groups: G[],
  isAdmin: boolean,
  isOwner: boolean,
  grantedPermissions: string[] = [],
): G[] {
  return groups
    .map(group => ({
      ...group,
      items: group.items.filter(item => {
        if (item.adminOnly && !isAdmin) return false;
        if (item.ownerOnly && !isOwner && (!item.permissionKey || !grantedPermissions.includes(item.permissionKey))) return false;
        return true;
      }),
    }) as G)
    .filter(group => group.items.length > 0);
}
