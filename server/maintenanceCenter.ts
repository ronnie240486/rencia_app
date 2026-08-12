export type MaintenanceDevice = { id: number; nomeServer: string; status: "Liberado" | "Bloqueado" | "Expirado"; lastSeen: Date | null };
export type MaintenanceList = { deviceId: number; deviceUrlId: number | null; status: "success" | "error" | "pending"; message: string | null; checkedAt: Date };

export function buildMaintenanceOverview(devices: MaintenanceDevice[], checks: MaintenanceList[], now = new Date()) {
  const latest = new Map<string, MaintenanceList>();
  checks.sort((a, b) => b.checkedAt.getTime() - a.checkedAt.getTime()).forEach((check) => {
    const key = `${check.deviceId}:${check.deviceUrlId ?? "principal"}`;
    if (!latest.has(key)) latest.set(key, check);
  });
  const latestChecks = Array.from(latest.values());
  const offlineCutoff = now.getTime() - 24 * 60 * 60 * 1000;
  const actions = [
    ...latestChecks.filter((check) => check.status === "error").map((check) => ({ id: `list-${check.deviceId}-${check.deviceUrlId ?? "main"}`, priority: "critical" as const, type: "Lista indisponível", message: check.message || "A lista não respondeu à última verificação.", deviceId: check.deviceId })),
    ...devices.filter((device) => device.status === "Liberado" && (!device.lastSeen || device.lastSeen.getTime() < offlineCutoff)).map((device) => ({ id: `offline-${device.id}`, priority: "high" as const, type: "Dispositivo offline", message: `${device.nomeServer} está sem conexão há mais de 24 horas.`, deviceId: device.id })),
    ...devices.filter((device) => device.status === "Bloqueado" || device.status === "Expirado").map((device) => ({ id: `access-${device.id}`, priority: "normal" as const, type: "Acesso bloqueado", message: `${device.nomeServer} está com status ${device.status}.`, deviceId: device.id })),
  ];
  const ranks = { critical: 0, high: 1, normal: 2 };
  return { listErrors: latestChecks.filter((check) => check.status === "error").length, offline: devices.filter((device) => device.status === "Liberado" && (!device.lastSeen || device.lastSeen.getTime() < offlineCutoff)).length, blocked: devices.filter((device) => device.status === "Bloqueado" || device.status === "Expirado").length, actions: actions.sort((a, b) => ranks[a.priority] - ranks[b.priority]) };
}
