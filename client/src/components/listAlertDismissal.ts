export type ConfirmedListAlert = { id: number; isRead: boolean; type: string; title: string };

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
