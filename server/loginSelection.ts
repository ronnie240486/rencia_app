export type LocalLoginCandidate = {
  id: number;
  resellerId: number | null;
};

/**
 * When legacy data contains duplicate e-mails, the managed reseller account is
 * authoritative. This prevents an obsolete standalone account from bypassing
 * the status and limit configured by the panel owner.
 */
export function chooseLocalLoginAccount<T extends LocalLoginCandidate>(candidates: T[]): T | undefined {
  return [...candidates].sort((left, right) => {
    const leftIsManagedReseller = left.resellerId !== null;
    const rightIsManagedReseller = right.resellerId !== null;
    if (leftIsManagedReseller !== rightIsManagedReseller) {
      return leftIsManagedReseller ? -1 : 1;
    }
    return right.id - left.id;
  })[0];
}
