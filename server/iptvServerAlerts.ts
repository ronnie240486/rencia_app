export const IPTV_SERVER_ALERT_CRON = "0 0 12 * * *";

export type IptvServerAlertCandidate = {
  id: number;
  personName?: string;
  personPhone?: string;
  name: string;
  server: string;
  expiresAt: Date | string;
  reminderDays: number;
  isActive: boolean;
};

function asDateOnly(value: Date | string) {
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

export function daysUntilServerExpiration(expiresAt: Date | string, now = new Date()) {
  const target = new Date(`${asDateOnly(expiresAt)}T00:00:00.000Z`).getTime();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((target - today) / 86_400_000);
}

export function buildIptvServerAlertMessage(server: Pick<IptvServerAlertCandidate, "personName" | "name" | "server" | "expiresAt">, now = new Date()) {
  const date = new Date(`${asDateOnly(server.expiresAt)}T00:00:00.000Z`).toLocaleDateString("pt-BR", { timeZone: "UTC" });
  const greeting = server.personName?.trim() ? `Olá, ${server.personName.trim()}! ` : "Olá! ";
  return `${greeting}Passando para avisar que seu vencimento é no dia ${date}. Para evitar interrupções, fale conosco para renovar. Obrigado!`;
}

export function shouldAlertIptvServer(server: IptvServerAlertCandidate, now = new Date()) {
  return server.isActive && daysUntilServerExpiration(server.expiresAt, now) <= Math.max(0, server.reminderDays);
}

export function normalizeIptvServerWhatsAppPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  const withCountryCode = digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
  return withCountryCode.length >= 12 && withCountryCode.length <= 15 ? withCountryCode : null;
}

export function buildIptvServerWhatsAppUrl(phone: string, message: string) {
  const normalizedPhone = normalizeIptvServerWhatsAppPhone(phone);
  if (!normalizedPhone) return null;
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}
