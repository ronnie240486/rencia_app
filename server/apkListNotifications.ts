import { and, desc, eq, like, or } from "drizzle-orm";
import { deviceListNotificationReceipts, devices, internalAlerts } from "../drizzle/schema";
import { LIST_FAILURE_ALERT_PREFIX, LIST_RECOVERY_ALERT_PREFIX } from "./listFailureAlerts";
import { normalizeMacAddress } from "./ultraPlayerConfig";

export type ApkListNotificationStatus = "failure" | "recovered";

export function isDeviceListNotificationTitle(title: string, deviceId: number) {
  return title.startsWith(LIST_FAILURE_ALERT_PREFIX) || title.startsWith(LIST_RECOVERY_ALERT_PREFIX)
    ? title.endsWith(`#${deviceId}`)
    : false;
}

function mapNotification(alert: any, acknowledgedAlertIds: Set<number>) {
  const status: ApkListNotificationStatus = alert.type === "critical" ? "failure" : "recovered";
  return {
    id: alert.id,
    status,
    severity: alert.type,
    title: alert.title,
    message: alert.content,
    created_at: alert.createdAt instanceof Date ? alert.createdAt.toISOString() : String(alert.createdAt),
    acknowledged: acknowledgedAlertIds.has(alert.id),
  };
}

async function findDeviceByMac(db: any, macInput: string) {
  const mac = normalizeMacAddress(macInput);
  if (!mac) return null;
  return (await db.select().from(devices)
    .where(or(eq(devices.mac, mac), eq(devices.mac, mac.toLowerCase())))
    .limit(1))[0] ?? null;
}

/** Retorna somente alertas confirmados da lista vinculada ao MAC informado. */
export async function getListNotificationsForMac(db: any, macInput: string) {
  const device = await findDeviceByMac(db, macInput);
  if (!device) return { registered: false, device: null, notifications: [] as any[] };

  const rows = await db.select().from(internalAlerts)
    .where(and(
      eq(internalAlerts.ownerId, device.ownerId),
      or(
        like(internalAlerts.title, `${LIST_FAILURE_ALERT_PREFIX}%#${device.id}`),
        like(internalAlerts.title, `${LIST_RECOVERY_ALERT_PREFIX}%#${device.id}`),
      ),
    ))
    .orderBy(desc(internalAlerts.createdAt), desc(internalAlerts.id))
    .limit(20);
  const ownAlerts = rows.filter((alert: any) => isDeviceListNotificationTitle(alert.title, device.id));
  const receipts = ownAlerts.length === 0 ? [] : await db.select().from(deviceListNotificationReceipts)
    .where(eq(deviceListNotificationReceipts.deviceId, device.id));
  const acknowledgedAlertIds = new Set<number>(receipts.map((receipt: any) => Number(receipt.alertId)));

  return {
    registered: true,
    device,
    notifications: ownAlerts.map((alert: any) => mapNotification(alert, acknowledgedAlertIds)),
  };
}

/** Confirma a leitura no aparelho sem ocultar o alerta original do painel. */
export async function acknowledgeListNotificationForMac(db: any, macInput: string, alertId: number) {
  const device = await findDeviceByMac(db, macInput);
  if (!device) return { ok: false, error: "MAC não cadastrado" };
  const alert = (await db.select().from(internalAlerts)
    .where(and(eq(internalAlerts.id, alertId), eq(internalAlerts.ownerId, device.ownerId)))
    .limit(1))[0];
  if (!alert || !isDeviceListNotificationTitle(alert.title, device.id)) {
    return { ok: false, error: "Aviso não pertence a este aparelho" };
  }
  const receipt = (await db.select().from(deviceListNotificationReceipts)
    .where(and(eq(deviceListNotificationReceipts.deviceId, device.id), eq(deviceListNotificationReceipts.alertId, alertId)))
    .limit(1))[0];
  if (!receipt) {
    await db.insert(deviceListNotificationReceipts).values({ deviceId: device.id, alertId });
  }
  return { ok: true };
}
