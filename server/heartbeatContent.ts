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

export type HeartbeatContentDecision =
  | { action: "keep" }
  | { action: "set"; content: string }
  | { action: "clear" };

/**
 * Ponto único de decisão do que fazer com currentContent num heartbeat.
 * Existe pra nunca mais repetir o bug já cometido aqui: checar
 * normalizeHeartbeatContent(valor) e isHeartbeatIdleSignal(valor) como
 * dois `if` separados na rota -- a sentinela "__idle__" É uma string não-
 * vazia, então normalizeHeartbeatContent("__idle__") volta "__idle__"
 * (verdadeiro) e o `if (currentContent)` ganhava na frente do `else if`
 * da sentinela, gravando o texto literal "__idle__" no painel em vez de
 * limpar. A sentinela tem que ser resolvida ANTES de normalizar, sempre
 * pelo mesmo lugar -- por isso essa função concentra as duas checagens.
 */
export function resolveHeartbeatContentUpdate(value: unknown): HeartbeatContentDecision {
  if (isHeartbeatIdleSignal(value)) return { action: "clear" };
  const content = normalizeHeartbeatContent(value);
  return content ? { action: "set", content } : { action: "keep" };
}
