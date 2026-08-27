import { formatDateOnlyPtBr } from "../shared/dateOnly";

export type BulkMessageDevice = {
  id: number;
  nomeServer: string;
  mac: string;
  app: string | null;
  telefone: string | null;
  urlM3u8: string | null;
  dataExpiracao: Date | string | null;
};

export type BulkMessageFilters = {
  app?: string;
  dnsHost?: string;
  resellerId?: number;
  expirationRange?: "all" | "expired" | "7" | "30";
};

function startOfDay(value: Date) {
  const day = new Date(value);
  day.setHours(0, 0, 0, 0);
  return day;
}

export function normalizeBulkMessageDnsHost(url: string | null | undefined) {
  const value = (url ?? "").trim();
  if (!value) return "";
  try {
    const parsed = new URL(value);
    return `${parsed.protocol}//${parsed.host}`.toLowerCase();
  } catch {
    return value.replace(/\/+$/, "").toLowerCase();
  }
}

function isInExpirationRange(value: Date | string | null, range: BulkMessageFilters["expirationRange"], now: Date) {
  if (!range || range === "all") return true;
  if (!value) return false;
  const expiration = startOfDay(new Date(value));
  if (Number.isNaN(expiration.getTime())) return false;
  const today = startOfDay(now);
  if (range === "expired") return expiration < today;
  const limit = new Date(today);
  limit.setDate(limit.getDate() + Number(range));
  return expiration >= today && expiration <= limit;
}

function daysUntil(value: Date | string | null, now: Date) {
  if (!value) return null;
  const expiration = startOfDay(new Date(value));
  if (Number.isNaN(expiration.getTime())) return null;
  return Math.round((expiration.getTime() - startOfDay(now).getTime()) / 86_400_000);
}

export function buildBulkMessageRecipients(devices: BulkMessageDevice[], filters: BulkMessageFilters, template: string, now = new Date()) {
  const app = (filters.app ?? "").trim().toLocaleLowerCase("pt-BR");
  const dnsHost = (filters.dnsHost ?? "").trim().toLocaleLowerCase("pt-BR");
  return devices
    .filter((device) => !app || (device.app ?? "").trim().toLocaleLowerCase("pt-BR") === app)
    .filter((device) => !dnsHost || normalizeBulkMessageDnsHost(device.urlM3u8) === dnsHost)
    .filter((device) => isInExpirationRange(device.dataExpiracao, filters.expirationRange, now))
    .map((device) => {
      const phone = (device.telefone ?? "").replace(/\D/g, "");
      if (phone.length < 8) return null;
      const days = daysUntil(device.dataExpiracao, now);
      const message = template
        .replace(/\{nome\}/gi, device.nomeServer || "Cliente")
        .replace(/\{mac\}/gi, device.mac || "")
        .replace(/\{app\}/gi, device.app || "aplicativo")
        .replace(/\{dias\}/gi, days === null ? "" : String(days))
        .replace(/\{data\}/gi, device.dataExpiracao ? formatDateOnlyPtBr(device.dataExpiracao) : "");
      return {
        id: device.id,
        nome: device.nomeServer,
        app: device.app || "Não informado",
        telefone: device.telefone,
        vencimento: device.dataExpiracao ? formatDateOnlyPtBr(device.dataExpiracao) : "—",
        waUrl: `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
      };
    })
    .filter((recipient): recipient is NonNullable<typeof recipient> => recipient !== null)
    .sort((first, second) => first.nome.localeCompare(second.nome, "pt-BR"));
}
