export type RenewalCandidate = { id: number; nomeServer: string; mac: string; telefone: string | null; dataExpiracao: Date | string; status: "Liberado" | "Bloqueado" | "Expirado" };

function utcStart(value: Date) { return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()); }

export function buildRenewalAgenda(rows: RenewalCandidate[], now = new Date()) {
  const today = utcStart(now);
  return rows.map((row) => {
    const expiration = new Date(row.dataExpiracao);
    const days = Math.round((utcStart(expiration) - today) / 86_400_000);
    const bucket = days < 0 ? "expired" : days === 0 ? "today" : days === 1 ? "tomorrow" : "upcoming";
    const cleanPhone = (row.telefone ?? "").replace(/\D/g, "");
    const message = `Olá ${row.nomeServer}, seu acesso vence ${days === 0 ? "hoje" : days === 1 ? "amanhã" : `em ${days} dias`} (${expiration.toLocaleDateString("pt-BR", { timeZone: "UTC" })}). Entre em contato para renovar.`;
    return { ...row, days, bucket, message, waUrl: cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}` : null };
  }).sort((a, b) => a.days - b.days || a.nomeServer.localeCompare(b.nomeServer));
}
