/**
 * Trata o conteúdo recebido do APK sem apagar o último programa mostrado.
 * Um heartbeat vazio apenas confirma que o aparelho permanece conectado.
 */
export function normalizeHeartbeatContent(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const content = value.trim();
  return content ? content.slice(0, 500) : undefined;
}

/** Aceita os nomes de campo usados pelas versões atuais e anteriores dos APKs. */
export function readHeartbeatContent(payload: Record<string, unknown> | null | undefined): string | undefined {
  if (!payload) return undefined;
  return normalizeHeartbeatContent(payload.content ?? payload.current_content ?? payload.currentContent);
}

/**
 * BUG corrigido: "Assistindo" ficava preso pra sempre no último canal
 * reportado, mesmo com o aparelho recém-aberto e nada tocando -- porque
 * normalizeHeartbeatContent trata vazio/omitido como "sem novidade,
 * mantenha o que já tem" (documentado acima) e nenhum app tinha como
 * dizer "eu sei que está vazio, é de propósito, limpa".
 *
 * Não dá pra reaproveitar string vazia pra esse "limpar de propósito":
 * mudar esse comportamento quebraria o contrato atual, que outros
 * apps/versões antigas já usam contando que heartbeat sem conteúdo
 * preserva o último valor. Por isso a sentinela é um valor reservado à
 * parte -- só limpa quando o APK manda ela explicitamente.
 */
export const HEARTBEAT_IDLE_SENTINEL = "__idle__";

/** true quando o APK avisou explicitamente que parou de tocar algo. */
export function isHeartbeatIdleSignal(value: unknown): boolean {
  return typeof value === "string" && value.trim().toLowerCase() === HEARTBEAT_IDLE_SENTINEL;
}
