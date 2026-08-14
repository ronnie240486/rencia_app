/** Normaliza um MAC para o formato AA:BB:CC:DD:EE:FF usado pelo painel. */
export function normalizeMacForStorage(value: string): string | null {
  const digits = value.replace(/[^0-9a-fA-F]/g, "").toUpperCase();
  if (digits.length !== 12) return null;
  return digits.match(/.{2}/g)?.join(":") ?? null;
}
