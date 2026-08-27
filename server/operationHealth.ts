import { MANAGED_APP_CATALOG } from "../shared/appCatalog";

export type OperationHealthStatus = "healthy" | "attention" | "critical" | "unknown";

export type OperationHealthDevice = {
  id: number;
  nomeServer: string;
  app: string | null;
  urlM3u8: string | null;
  status: string;
  lastSeen: Date | string | null;
  dataExpiracao: Date | string | null;
  telefone: string | null;
};

export type OperationListCheck = {
  deviceId: number;
  status: "success" | "error" | "pending";
  responseTimeMs: number | null;
  checkedAt: Date | string;
};

type HealthItem = { label: string; detail: string; status: OperationHealthStatus; href: string };
type Recommendation = { title: string; detail: string; priority: "Alta" | "Média" | "Baixa"; href: string; actionLabel: string };

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function publicServerLabel(url: string | null | undefined) {
  if (!url) return "Servidor não informado";
  try {
    const parsed = new URL(url);
    return parsed.host.toLowerCase();
  } catch {
    return "Servidor não identificado";
  }
}

function publicAppLabel(app: string | null | undefined) {
  const value = (app ?? "").trim();
  if (!value) return "Aplicativo não informado";
  const match = Object.values(MANAGED_APP_CATALOG).find((item) => item.deviceAliases.some((alias) => alias.toLocaleLowerCase("pt-BR") === value.toLocaleLowerCase("pt-BR")));
  return match?.displayName ?? value;
}

function getLatestChecks(checks: OperationListCheck[]) {
  const latest = new Map<number, OperationListCheck>();
  for (const check of checks) {
    const current = latest.get(check.deviceId);
    if (!current || new Date(check.checkedAt).getTime() > new Date(current.checkedAt).getTime()) latest.set(check.deviceId, check);
  }
  return latest;
}

function aggregateStatus({ errors, slow, offline, total }: { errors: number; slow: number; offline: number; total: number }): OperationHealthStatus {
  if (errors > 0) return "critical";
  if (slow > 0 || offline > 0) return "attention";
  return total > 0 ? "healthy" : "unknown";
}

export function buildOperationHealthOverview(devices: OperationHealthDevice[], checks: OperationListCheck[], now = new Date()) {
  const latestChecks = getLatestChecks(checks);
  const offlineBoundary = now.getTime() - 30 * 60_000;
  const expiresSoonBoundary = new Date(startOfDay(now));
  expiresSoonBoundary.setDate(expiresSoonBoundary.getDate() + 7);
  const expiring = devices.filter((device) => {
    if (!device.dataExpiracao) return false;
    const expiration = startOfDay(new Date(device.dataExpiracao));
    return !Number.isNaN(expiration.getTime()) && expiration >= startOfDay(now) && expiration <= expiresSoonBoundary;
  });
  const offline = devices.filter((device) => !device.lastSeen || new Date(device.lastSeen).getTime() < offlineBoundary);
  const missingPhone = devices.filter((device) => !(device.telefone ?? "").trim());
  const listErrors = devices.filter((device) => latestChecks.get(device.id)?.status === "error");

  const apps = new Map<string, OperationHealthDevice[]>();
  const servers = new Map<string, OperationHealthDevice[]>();
  devices.forEach((device) => {
    const app = publicAppLabel(device.app);
    apps.set(app, [...(apps.get(app) ?? []), device]);
    const server = publicServerLabel(device.urlM3u8);
    servers.set(server, [...(servers.get(server) ?? []), device]);
  });
  const summarize = (groups: Map<string, OperationHealthDevice[]>, href: string): HealthItem[] => Array.from(groups.entries()).map(([label, group]) => {
    const details = group.map((device) => latestChecks.get(device.id));
    const errors = details.filter((check) => check?.status === "error").length;
    const slow = details.filter((check) => check?.status === "success" && (check.responseTimeMs ?? 0) >= 5_000).length;
    const groupOffline = group.filter((device) => !device.lastSeen || new Date(device.lastSeen).getTime() < offlineBoundary).length;
    const status = aggregateStatus({ errors, slow, offline: groupOffline, total: group.length });
    const detail = errors > 0 ? `${errors} falha(s) confirmada(s)` : slow > 0 ? `${slow} lista(s) lenta(s)` : groupOffline > 0 ? `${groupOffline} aparelho(s) sem conexão recente` : `${group.length} cliente(s) sem falha recente`;
    return { label, detail, status, href };
  }).sort((a, b) => (a.status === "critical" ? -1 : b.status === "critical" ? 1 : a.label.localeCompare(b.label, "pt-BR")));

  const latestListItems: HealthItem[] = devices.map((device) => {
    const check = latestChecks.get(device.id);
    const status: OperationHealthStatus = check?.status === "error" ? "critical" : check?.status === "pending" ? "attention" : check?.status === "success" ? (check.responseTimeMs ?? 0) >= 5_000 ? "attention" : "healthy" : "unknown";
    const detail = check?.status === "error" ? "Falha confirmada na última verificação" : check?.status === "success" ? `${check.responseTimeMs ?? 0} ms na última verificação` : check?.status === "pending" ? "Verificação pendente" : "Ainda não verificada";
    return { label: `Lista de ${device.nomeServer}`, detail, status, href: "/monitor-listas" };
  }).filter((item) => item.status === "critical" || item.status === "attention").slice(0, 12);

  const recommendations: Recommendation[] = [];
  if (listErrors.length) recommendations.push({ title: "Conferir listas com falha confirmada", detail: `${listErrors.length} lista(s) precisam de atenção. O painel não fará nenhuma troca sozinho nesta tela.`, priority: "Alta", href: "/monitor-listas", actionLabel: "Abrir monitor" });
  if (offline.length) recommendations.push({ title: "Verificar aparelhos sem conexão recente", detail: `${offline.length} aparelho(s) não enviaram atividade nos últimos 30 minutos.`, priority: "Média", href: "/diagnostico", actionLabel: "Abrir diagnóstico" });
  if (expiring.length) recommendations.push({ title: "Preparar avisos de vencimento", detail: `${expiring.length} cliente(s) vencem nos próximos sete dias.`, priority: "Média", href: "/chatbot", actionLabel: "Abrir avisos" });
  if (missingPhone.length) recommendations.push({ title: "Completar telefones de contato", detail: `${missingPhone.length} cliente(s) não podem receber aviso por WhatsApp até ter telefone cadastrado.`, priority: "Baixa", href: "/users", actionLabel: "Abrir clientes" });
  if (!recommendations.length) recommendations.push({ title: "Operação sem pendências confirmadas", detail: "Não há falha de lista, vencimento próximo, ausência recente de conexão ou telefone pendente neste momento.", priority: "Baixa", href: "/central", actionLabel: "Abrir Central" });

  const appHealth = summarize(apps, "/atualizacoes");
  const serverHealth = summarize(servers, "/monitor-listas");
  const clusters = [...appHealth, ...serverHealth];
  return {
    generatedAt: now,
    summary: { healthy: clusters.filter((item) => item.status === "healthy").length, attention: clusters.filter((item) => item.status === "attention").length, critical: clusters.filter((item) => item.status === "critical").length, devices: devices.length },
    counts: { expiring: expiring.length, offline: offline.length, missingPhone: missingPhone.length, listErrors: listErrors.length },
    apps: appHealth,
    servers: serverHealth,
    lists: latestListItems,
    recommendations,
  };
}
