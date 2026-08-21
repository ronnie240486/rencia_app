export type ResellerPortalCandidate = {
  id: number;
  resellerId: number | null;
  isActive: boolean;
  isOwner: boolean;
};

/** Apenas contas ativas subordinadas a um proprietário podem abrir o portal de revenda. */
export function canAccessResellerPortal(user: ResellerPortalCandidate | null | undefined) {
  return Boolean(user && user.isActive && !user.isOwner && user.resellerId !== null);
}

/** Mantém a seleção determinística quando houver registros antigos com o mesmo e-mail. */
export function chooseResellerPortalAccount<T extends ResellerPortalCandidate>(candidates: T[]) {
  return [...candidates]
    .filter(canAccessResellerPortal)
    .sort((left, right) => right.id - left.id)[0];
}
