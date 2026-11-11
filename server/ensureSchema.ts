import { sql } from "drizzle-orm";
import { getDb } from "./db";

/**
 * Garante as colunas novas mesmo que o script de migração do Railway não tenha rodado.
 * Sem a coluna `device_urls.nomeServidor` a consulta das listas falha e a tela
 * "Listas" mostra só a Lista Principal, sem os botões de editar/reserva.
 */
const ADDITIVE_STATEMENTS = [
  "ALTER TABLE `device_urls` ADD COLUMN `nomeServidor` varchar(255) NULL",
];

// Índices que faltavam: sem eles cada tela que lê list_health_checks varria a tabela inteira.
// Rodam em segundo plano (depois que o servidor sobe) para não atrasar o boot.
const INDEX_STATEMENTS = [
  "CREATE INDEX `idx_lhc_owner_checked` ON `list_health_checks` (`ownerId`, `checkedAt`)",
  "CREATE INDEX `idx_lhc_device_checked` ON `list_health_checks` (`deviceId`, `checkedAt`)",
  "CREATE INDEX `idx_lfe_owner_created` ON `list_failover_events` (`ownerId`, `createdAt`)",
];

export async function ensureOperationalIndexes() {
  const db = await getDb();
  if (!db) return;
  for (const statement of INDEX_STATEMENTS) {
    try {
      await db.execute(sql.raw(statement));
      console.log(`[schema] índice criado: ${statement}`);
    } catch (error: any) {
      const text = `${error?.code ?? ""} ${error?.message ?? ""} ${error?.cause?.code ?? ""} ${error?.cause?.message ?? ""}`;
      if (/ER_DUP_KEYNAME|Duplicate key name/i.test(text)) continue;
      console.error(`[schema] índice não criado "${statement}":`, text.trim());
    }
  }
}

export async function ensureAdditiveSchema() {
  const db = await getDb();
  if (!db) return;
  for (const statement of ADDITIVE_STATEMENTS) {
    try {
      await db.execute(sql.raw(statement));
      console.log(`[schema] aplicado: ${statement}`);
    } catch (error: any) {
      const text = `${error?.code ?? ""} ${error?.message ?? ""} ${error?.cause?.code ?? ""} ${error?.cause?.message ?? ""}`;
      if (/ER_DUP_FIELDNAME|Duplicate column/i.test(text)) continue; // já existe
      console.error(`[schema] não foi possível aplicar "${statement}":`, text.trim());
    }
  }
}
