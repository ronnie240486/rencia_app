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
