export type ConfirmedListAlert = { id: number; isRead: boolean; type: string; title: string };

export const DISMISSED_LIST_ALERTS_SESSION_KEY = "rencia.dismissed-confirmed-list-alerts";
export const LIST_ALERT_SUMMARY_PRESENTED_DAILY_KEY = "rencia.confirmed-list-alert-summary-presented";

export function listAlertSummaryStorageKey(userId?: number) {
  return `${LIST_ALERT_SUMMARY_PRESENTED_DAILY_KEY}.${userId ?? "anonymous"}`;
}

export function currentListAlertDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Lê com segurança os alertas já reconhecidos durante a sessão atual do painel. */
export function parseDismissedListAlertIds(value: string | null): number[] {
  if (!value) return [];
  try {
    const ids = JSON.parse(value);
    if (!Array.isArray(ids)) return [];
    return Array.from(new Set(ids.filter((id): id is number => Number.isInteger(id) && id > 0)));
  } catch {
    return [];
  }
}

export function hasPresentedListAlertSummary(value: string | null, today = currentListAlertDay()) {
  return value === today;
}

export function getActiveConfirmedListAlerts(
  alerts: ConfirmedListAlert[] | undefined,
  dismissedAlertIds: number[],
) {
  return (alerts ?? []).filter(alert =>
    !dismissedAlertIds.includes(alert.id)
    && !alert.isRead
    && alert.type === "critical"
    && alert.title.startsWith("Falha confirmada de lista:"),
  );
}
