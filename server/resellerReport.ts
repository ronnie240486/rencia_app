export type ResellerFinancialRow = { amount: string | number; status: "pending" | "paid" | "overdue"; dueDate: Date | string | null };
export type ResellerDeviceMetricRow = { app: string | null; status: string; lastSeen: Date | string | null };

function timestamp(value: Date | string | null) {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

/** Métricas baseadas em cadastro e heartbeat real, sem contabilizar clique como download. */
export function summarizeResellerDevicePerformance(rows: ResellerDeviceMetricRow[], now = new Date(), onlineWindowMinutes = 15) {
  const onlineAfter = now.getTime() - onlineWindowMinutes * 60_000;
  const apps = new Map<string, { app: string; clients: number; activated: number; online: number }>();
  let activatedClients = 0;
  let onlineClients = 0;

  for (const row of rows) {
    const app = row.app?.trim() || "Sem aplicativo";
    const metric = apps.get(app) ?? { app, clients: 0, activated: 0, online: 0 };
    metric.clients += 1;
    const lastSeen = timestamp(row.lastSeen);
    if (lastSeen !== null) {
      activatedClients += 1;
      metric.activated += 1;
      if (lastSeen >= onlineAfter) {
        onlineClients += 1;
        metric.online += 1;
      }
    }
    apps.set(app, metric);
  }

  return {
    apkActivatedClients: activatedClients,
    onlineClients,
    appBreakdown: Array.from(apps.values()).sort((a, b) => b.activated - a.activated || b.clients - a.clients || a.app.localeCompare(b.app, "pt-BR")),
  };
}

export function summarizeResellerFinance(rows: ResellerFinancialRow[], now = new Date()) {
  return rows.reduce((summary, row) => {
    const amount = Number(row.amount) || 0;
    const due = row.dueDate ? new Date(row.dueDate) : null;
    const overdue = row.status === "overdue" || (row.status === "pending" && !!due && due.getTime() < now.getTime());
    summary.total += amount;
    if (row.status === "paid") summary.received += amount;
    else if (overdue) summary.overdue += amount;
    else summary.pending += amount;
    return summary;
  }, { total: 0, received: 0, pending: 0, overdue: 0 });
}
