/**
 * Garante que respostas usadas por APKs nunca exponham `null` como texto na tela.
 */
export function safeApkText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return typeof value === "string" ? value : String(value);
}
