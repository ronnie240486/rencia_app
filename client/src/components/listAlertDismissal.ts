export type ConfirmedListAlert = { id: number; isRead: boolean; type: string; title: string };

export function shouldOpenConfirmedListAlert(
  alert: ConfirmedListAlert | undefined,
  openedAlertId: number | null,
  dismissedAlertIds: number[],
) {
  return Boolean(
    alert
    && openedAlertId === null
    && !dismissedAlertIds.includes(alert.id)
    && !alert.isRead
    && alert.type === "critical"
    && alert.title.startsWith("Falha confirmada de lista:"),
  );
}
