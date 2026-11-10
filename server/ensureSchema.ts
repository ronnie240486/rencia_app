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
