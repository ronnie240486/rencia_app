import { getDb } from "./db";
import { users, notices, nuvixConfig } from "../drizzle/schema";
import { eq, and, lte, gte } from "drizzle-orm";

/**
 * Verifica se um usuário está próximo de vencer e manda aviso automático
 */
export async function checkAndSendExpirationNotice(userId: number, planValidade?: string | null) {
  if (!planValidade) return;

  try {
    const db = await getDb();
    if (!db) return;

    // Buscar usuário
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user.length) return;

    const resellerId = user[0].resellerId || userId;

    // Calcular dias até vencer
    const expireDate = new Date(planValidade);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expireDate.setHours(0, 0, 0, 0);

    const daysUntilExpire = Math.ceil((expireDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Manda notificação SOMENTE quando faltar exatamente 1 dia
    if (daysUntilExpire === 1) {
      const message = `⚠️ Seu acesso vence em 1 dia! Data: ${planValidade}`;

      // Criar aviso
      await db.insert(notices).values({
        autorId: resellerId,
        titulo: "Aviso de Vencimento",
        conteudo: message,
        ativo: true,
      });

      console.log(`[Auto-Notification] Aviso enviado para usuário ${userId}: ${message}`);
    }
  } catch (error) {
    console.error("[Auto-Notification] Erro:", error);
  }
}
