import { getDb } from "./db";
import { devices, notices } from "../drizzle/schema";
import { and, eq } from "drizzle-orm";
import { daysUntilDateOnly, formatDateOnlyPtBr } from "../shared/dateOnly";

export function isExpirationNoticeDue(dataExpiracao: string | Date, reference = new Date()): boolean {
  return daysUntilDateOnly(dataExpiracao, reference) === 1;
}

/**
 * Verifica se um usuário está próximo de vencer e manda aviso automático
 */
export async function checkAndSendExpirationNotice(deviceId: number, dataExpiracao?: string | null) {
  if (!dataExpiracao) return { created: false, reason: "no-expiration-date" as const };

  try {
    const db = await getDb();
    if (!db) return { created: false, reason: "database-unavailable" as const };

    const [device] = await db.select().from(devices).where(eq(devices.id, deviceId)).limit(1);
    if (!device) return { created: false, reason: "device-not-found" as const };

    const daysUntilExpire = daysUntilDateOnly(dataExpiracao);

    // Manda notificação SOMENTE quando faltar exatamente 1 dia
    if (isExpirationNoticeDue(dataExpiracao)) {
      const message = `⚠️ ${device.nomeServer} vence em 1 dia! Data: ${formatDateOnlyPtBr(dataExpiracao)}.`;

      const [existingNotice] = await db
        .select({ id: notices.id })
        .from(notices)
        .where(and(
          eq(notices.autorId, device.ownerId),
          eq(notices.titulo, "Aviso de Vencimento"),
          eq(notices.conteudo, message),
          eq(notices.ativo, true),
        ))
        .limit(1);

      if (existingNotice) {
        return { created: false, reason: "already-created" as const };
      }

      // Criar aviso
      await db.insert(notices).values({
        autorId: device.ownerId,
        titulo: "Aviso de Vencimento",
        conteudo: message,
        ativo: true,
      });

      console.log(`[Auto-Notification] Aviso criado para device ${deviceId}: ${message}`);
      return { created: true, reason: "expires-tomorrow" as const };
    }
    return { created: false, reason: "not-due-tomorrow" as const };
  } catch (error) {
    console.error("[Auto-Notification] Erro:", error);
    return { created: false, reason: "error" as const };
  }
}
