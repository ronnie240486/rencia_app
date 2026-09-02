export const MONTHLY_REVENUE_CRON = "5 0 1 * *";

export type MonthlyRevenueDevice = {
  id: number;
  nomeServer: string | null;
  valor: string | number | null;
  status: string;
  dataCadastro: Date | string | null;
  dataExpiracao: Date | string | null;
  playlistCount?: number | null;
};

export type MonthlyRevenueServer = {
  id: number;
  nome: string;
  valor: string | number | null;
  paymentStatus: string;
  createdAt: Date | string | null;
};

export type MonthlyRevenueReport = {
  periodStart: string;
  periodEnd: string;
  revenue: number;
  deviceRevenue: number;
  serverRevenue: number;
  clientCount: number;
  newClientCount: number;
  activeClientCount: number;
  expiredClientCount: number;
  playlistCount: number;
  paidServerCount: number;
  serverCount: number;
  generatedAt: string;
};

function money(value: string | number | null | undefined) {
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value ?? "0").replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function dateOnly(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

export function previousMonthPeriod(now = new Date()) {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  return { periodStart: start.toISOString().slice(0, 10), periodEnd: end.toISOString().slice(0, 10) };
}

export function buildMonthlyRevenueReport(
  period: { periodStart: string; periodEnd: string },
  devices: MonthlyRevenueDevice[],
  servers: MonthlyRevenueServer[],
  generatedAt = new Date(),
): MonthlyRevenueReport {
  const newDevices = devices.filter((device) => {
    const created = dateOnly(device.dataCadastro);
    return Boolean(created && created >= period.periodStart && created <= period.periodEnd);
  });
  const deviceRevenue = newDevices.reduce((total, device) => total + money(device.valor), 0);
  const serverRows = servers.filter((server) => {
    const created = dateOnly(server.createdAt);
    return Boolean(created && created >= period.periodStart && created <= period.periodEnd);
  });
  const serverRevenue = serverRows.reduce((total, server) => total + money(server.valor), 0);
  const activeClientCount = newDevices.filter((device) => device.status === "Liberado").length;
  const expiredClientCount = newDevices.filter((device) => device.status === "Expirado").length;
  const playlistCount = newDevices.reduce((total, device) => total + Math.max(0, Number(device.playlistCount ?? 0)), 0);
  const paidServerCount = serverRows.filter((server) => server.paymentStatus === "paid").length;
  return {
    ...period,
    revenue: Number((deviceRevenue + serverRevenue).toFixed(2)),
    deviceRevenue: Number(deviceRevenue.toFixed(2)),
    serverRevenue: Number(serverRevenue.toFixed(2)),
    clientCount: newDevices.length,
    newClientCount: newDevices.length,
    activeClientCount,
    expiredClientCount,
    playlistCount,
    paidServerCount,
    serverCount: serverRows.length,
    generatedAt: generatedAt.toISOString(),
  };
}

export function formatMonthlyRevenueMessage(report: MonthlyRevenueReport) {
  const moneyText = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }).replace(/\u00a0/g, " ");
  return [
    `Fechamento mensal — ${report.periodStart.slice(0, 7)}`,
    `Receita total: ${moneyText(report.revenue)}`,
    `Receita de clientes: ${moneyText(report.deviceRevenue)}`,
    `Receita de servidores: ${moneyText(report.serverRevenue)}`,
    `Clientes cadastrados no mês: ${report.newClientCount}`,
    `Clientes liberados: ${report.activeClientCount}`,
    `Clientes expirados: ${report.expiredClientCount}`,
    `Playlists cadastradas: ${report.playlistCount}`,
    `Servidores pagos: ${report.paidServerCount}`,
    `Servidores cadastrados: ${report.serverCount}`,
  ].join("\n");
}
