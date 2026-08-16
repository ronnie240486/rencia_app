import { getDb } from "./db";
import { devices, notices } from "../drizzle/schema";
import { and, eq, inArray } from "drizzle-orm";
import { daysUntilDateOnly, formatDateOnlyPtBr } from "../shared/dateOnly";

export function isExpirationNoticeDue(dataExpiracao: string | Date, reference = new Date()): boolean {
  return daysUntilDateOnly(dataExpiracao, reference) === 1;
}

export function buildPanelExpirationNotice(device: { nomeServer: string | null; dataExpiracao: string | Date | null; status: string }, reference = new Date()) {
  if (!device.dataExpiracao) return null;
  const daysUntilExpire = daysUntilDateOnly(device.dataExpiracao, reference);
  const date = formatDateOnlyPtBr(device.dataExpiracao);
  const name = device.nomeServer?.trim() || "Cliente";

  if (daysUntilExpire === 1) {
    return {
      title: "Aviso de Vencimento",
      content: `${name} vence amanhã (${date}).`,
      reason: "expires-tomorrow" as const,
    };
  }
  if (daysUntilExpire === 0) {
    return {
      title: "Vencimento Hoje",
      content: `${name} vence hoje (${date}).`,
      reason: "expires-today" as const,
    };
  }
  if (daysUntilExpire < 0 || device.status === "Expirado") {
    return {
      title: "Acesso Vencido",
      content: `${name} está com acesso vencido desde ${date}.`,
      reason: "expired" as const,
    };
  }
  return null;
}

type ActiveExpirationNotice = { id: number; titulo: string; conteudo: string };

/** Mantém somente o aviso correspondente à data de vencimento atual do aparelho. */
export function getStaleExpirationNoticeIds(
  activeNotices: ActiveExpirationNotice[],
  currentNotice: { title: string; content: string } | null,
) {
  return activeNotices
    .filter((notice) => !currentNotice || notice.titulo !== currentNotice.title || notice.conteudo !== currentNotice.content)
    .map((notice) => notice.id);
}

/**
 * Verifica se um usuário está próximo de vencer e manda aviso automático
 */
export async function checkAndSendExpirationNotice(deviceId: number, dataExpiracao?: string | Date | null) {
  if (!dataExpiracao) return { created: false, reason: "no-expiration-date" as const };

  try {
    const db = await getDb();
    if (!db) return { created: false, reason: "database-unavailable" as const };

    const [device] = await db.select().from(devices).where(eq(devices.id, deviceId)).limit(1);
    if (!device) return { created: false, reason: "device-not-found" as const };

    const notice = buildPanelExpirationNotice(device);
    const activeNotices = await db
      .select({ id: notices.id, titulo: notices.titulo, conteudo: notices.conteudo })
      .from(notices)
      .where(and(
        eq(notices.targetDeviceId, device.id),
        eq(notices.ativo, true),
      ));

    const staleNoticeIds = getStaleExpirationNoticeIds(activeNotices, notice);
    if (staleNoticeIds.length > 0) {
      await db.update(notices)
        .set({ ativo: false, endsAt: new Date() })
        .where(inArray(notices.id, staleNoticeIds));
    }

    if (notice) {
      const existingNotice = activeNotices.find((item) => item.titulo === notice.title && item.conteudo === notice.content);

      if (existingNotice) {
        return { created: false, reason: "already-created" as const };
      }

      // Criar aviso
      await db.insert(notices).values({
        autorId: device.ownerId,
        targetOwnerId: device.ownerId,
        targetDeviceId: device.id,
        titulo: notice.title,
        conteudo: notice.content,
        ativo: true,
      });

      console.log(`[Auto-Notification] Aviso criado para device ${deviceId}: ${notice.content}`);
      return { created: true, reason: notice.reason };
    }
    return { created: false, reason: "not-due" as const };
  } catch (error) {
    console.error("[Auto-Notification] Erro:", error);
    return { created: false, reason: "error" as const };
  }
}
