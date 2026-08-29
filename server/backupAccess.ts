export type BackupRestoreAccount = {
  isOwner: boolean;
  role: "user" | "admin";
} | null | undefined;

/** Um backup completo só pode restaurar dados na conta proprietária da nova instalação. */
export function canRestoreCompleteBackup(account: BackupRestoreAccount) {
  return Boolean(account?.isOwner && account.role === "admin");
}

export const BACKUP_RESTORE_OWNER_MESSAGE =
  "O backup completo deve ser restaurado pela conta Proprietário/Admin do painel novo. Revendas usam somente os próprios clientes e não podem receber os dados de todas as contas.";
