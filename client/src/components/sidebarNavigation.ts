export interface AccessControlledNavItem {
  adminOnly?: boolean;
  ownerOnly?: boolean;
}

export interface NavigationGroup<T extends AccessControlledNavItem> {
  items: T[];
}

/** Todos os grupos começam fechados e só expandem quando o usuário interage. */
export const INITIAL_OPEN_NAV_GROUPS: string[] = [];

/** Mantém apenas itens e grupos disponíveis para o perfil autenticado. */
export function getVisibleNavigationGroups<
  T extends AccessControlledNavItem,
  G extends NavigationGroup<T>,
>(
  groups: G[],
  isAdmin: boolean,
  isOwner: boolean,
): G[] {
  return groups
    .map(group => ({
      ...group,
      items: group.items.filter(item => {
        if (item.adminOnly && !isAdmin) return false;
        if (item.ownerOnly && !isOwner) return false;
        return true;
      }),
    }) as G)
    .filter(group => group.items.length > 0);
}
