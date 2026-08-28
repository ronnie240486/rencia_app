export type PortableBackupTable = { table: string; records: number; restores: boolean; note?: string };

/** O inventário permite importar os dados em outro sistema sem depender de IDs internos do painel. */
export function buildPortableBackupManifest(data: Record<string, unknown>) {
  const tables: PortableBackupTable[] = Object.entries(data)
    .filter((entry): entry is [string, unknown[]] => Array.isArray(entry[1]))
    .map(([table, value]) => ({ table, records: value.length, restores: true }));
  return {
    format: "rencia-portable-database-v1",
    instructions: "As listas estão vinculadas ao MAC em deviceUrls. Importe usuários e dispositivos antes das listas e das configurações vinculadas.",
    tables,
    excludedSecrets: ["tokens OAuth do Google Drive", "URLs assinadas temporárias de arquivos"],
  };
}
