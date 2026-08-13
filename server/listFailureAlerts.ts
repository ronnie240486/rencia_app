import { and, desc, eq, isNull } from "drizzle-orm";
import { internalAlerts, listHealthChecks } from "../drizzle/schema";

type HealthStatus = "success" | "error" | "pending";
type AlertType = "info" | "warning" | "critical" | "success" | null;

export type ListAlertTarget = {
  deviceId: number;
  deviceUrlId: number | null;
  deviceName: string;
  listName: string;
  url: string;
  message: string;
  status: HealthStatus;
};

export const LIST_FAILURE_ALERT_PREFIX = "Falha confirmada de lista";

export function listAlertTitle(target: Pick<ListAlertTarget, "deviceId" | "listName" | "deviceName">) {
  return `${LIST_FAILURE_ALERT_PREFIX}: ${target.listName} · ${target.deviceName} #${target.deviceId}`;
}

export function resolveListAlertTransition(recentStatuses: HealthStatus[], latestAlertType: AlertType): "failure" | "recovery" | null {
  const [current, previous] = recentStatuses;
  if (current === "error" && previous === "error" && latestAlertType !== "critical") return "failure";
  if (current === "success" && latestAlertType === "critical") return "recovery";
  return null;
}

/**
 * Cria alertas somente após duas falhas técnicas seguidas da mesma URL.
 * A ausência de reprodução do cliente nunca entra neste cálculo.
 */
export async function syncConfirmedListFailureAlert(db: any, ownerId: number, target: ListAlertTarget) {
  const targetCondition = target.deviceUrlId === null
    ? isNull(listHealthChecks.deviceUrlId)
    : eq(listHealthChecks.deviceUrlId, target.deviceUrlId);
  const checks = await db.select({ status: listHealthChecks.status })
    .from(listHealthChecks)
    .where(and(
      eq(listHealthChecks.ownerId, ownerId),
      eq(listHealthChecks.deviceId, target.deviceId),
      targetCondition,
      eq(listHealthChecks.urlSnapshot, target.url),
    ))
    .orderBy(desc(listHealthChecks.checkedAt), desc(listHealthChecks.id))
    .limit(2);

  const title = listAlertTitle(target);
  const previousAlert = (await db.select({ type: internalAlerts.type })
    .from(internalAlerts)
    .where(and(eq(internalAlerts.ownerId, ownerId), eq(internalAlerts.title, title)))
    .orderBy(desc(internalAlerts.createdAt), desc(internalAlerts.id))
    .limit(1))[0];
  const transition = resolveListAlertTransition(
    checks.map((check: { status: HealthStatus }) => check.status),
    previousAlert?.type ?? null,
  );

  if (transition === "failure") {
    await db.insert(internalAlerts).values({
      ownerId,
      targetUserId: ownerId,
      type: "critical",
      title,
      content: `Falha técnica confirmada em dois testes consecutivos: ${target.message}. Cliente afetado: ${target.deviceName}. Abra o Monitor de Listas para testar novamente ou aplicar uma lista alternativa.`,
    });
  }

  if (transition === "recovery") {
    await db.insert(internalAlerts).values({
      ownerId,
      targetUserId: ownerId,
      type: "success",
      title,
      content: `Lista recuperada: o servidor voltou a responder ao teste técnico. Cliente monitorado: ${target.deviceName}.`,
    });
  }

  return transition;
}
