import { and, asc, desc, eq, like, or } from "drizzle-orm";
import { deviceListNotificationReceipts, devices, deviceUrls, internalAlerts, listFailoverEvents } from "../drizzle/schema";
import { daysUntilDateOnly, formatDateOnlyPtBr, toDateOnly } from "../shared/dateOnly";
import { LIST_FAILURE_ALERT_PREFIX, LIST_RECOVERY_ALERT_PREFIX } from "./listFailureAlerts";
import { safeApkText } from "./apkSafeValues";
import { normalizeMacAddress } from "./ultraPlayerConfig";

export type ApkListNotificationStatus = "failure" | "recovered";
export type ApkFailoverState = "primary" | "backup_active" | "primary_restored";
export type ApkExpirationState = "none" | "upcoming" | "expires_tomorrow" | "expires_today" | "expired";

type FailoverList = { id: number; nome: string | null; ordem: number; ativo?: boolean };
type FailoverEvent = { id: number; fromDeviceUrlId: number | null; toDeviceUrlId: number | null; createdAt: Date | string } | null;
type ExpirationDevice = { dataExpiracao: Date | string | null; status: string };

/** Cria o aviso simples de vencimento exibido pelo APK, sem textos operacionais do painel. */
export function buildApkExpirationNotice(device: ExpirationDevice, reference = new Date()) {
  const expirationDate = toDateOnly(device.dataExpiracao);
  if (!expirationDate) {
    return {
      expiration_date: "",
      expiration_display: "",
      days_remaining: 0,
      expiration_state: "none" as ApkExpirationState,
      show_modal: false,
      modal_key: "",
      modal_title: "",
      modal_message: "",
    };
  }

  const daysRemaining = daysUntilDateOnly(expirationDate, reference);
  const state: ApkExpirationState = device.status === "Expirado" || daysRemaining < 0
    ? "expired"
    : daysRemaining === 0 ? "expires_today"
      : daysRemaining === 1 ? "expires_tomorrow" : "upcoming";
  const showModal = state === "expired" || state === "expires_today" || state === "expires_tomorrow";
  const expirationDisplay = formatDateOnlyPtBr(expirationDate);
  const modalTitle = state === "expired"
    ? "Seu acesso venceu"
    : state === "expires_today" ? "Seu acesso vence hoje"
      : state === "expires_tomorrow" ? "Seu acesso vence amanhã" : "";
  const modalMessage = state === "expired"
    ? `Seu acesso venceu em ${expirationDisplay}. Procure seu revendedor para renovar.`
    : state === "expires_today" ? `Seu acesso vence hoje (${expirationDisplay}). Renove para evitar interrupção.`
      : state === "expires_tomorrow" ? `Seu acesso vence amanhã (${expirationDisplay}). Renove para evitar interrupção.` : "";

  return {
    expiration_date: expirationDate,
    expiration_display: expirationDisplay,
    days_remaining: daysRemaining,
    expiration_state: state,
    show_modal: showModal,
    modal_key: showModal ? `expiration:${expirationDate}:${state}` : "",
    modal_title: modalTitle,
    modal_message: modalMessage,
  };
}

/**
 * Cria o estado que o APK usa para atualizar a lista automaticamente e avisar o cliente.
 * O `transition_id` é estável: o APK deve guardá-lo localmente e só executar a atualização uma vez por transição.
 */
export function buildApkFailoverStatus(device: { activeDeviceUrlId: number | null }, extraLists: FailoverList[], latestEvent: FailoverEvent) {
  const activeExtraIndex = device.activeDeviceUrlId
    ? extraLists.findIndex((list) => list.id === device.activeDeviceUrlId)
    : -1;
  const activeExtra = activeExtraIndex >= 0 ? extraLists[activeExtraIndex] : null;
  const activeListNumber = activeExtra ? activeExtraIndex + 2 : 1;
  const activeListName = safeApkText(activeExtra?.nome).trim() || `Lista ${activeListNumber}`;
  const primaryWasRestored = !activeExtra
    && Boolean(latestEvent && latestEvent.fromDeviceUrlId !== null && latestEvent.toDeviceUrlId === null);
  const state: ApkFailoverState = activeExtra
    ? "backup_active"
    : primaryWasRestored ? "primary_restored" : "primary";
  const transitionId = latestEvent?.id ?? null;
  const changedAt = latestEvent
    ? (latestEvent.createdAt instanceof Date ? latestEvent.createdAt.toISOString() : String(latestEvent.createdAt))
    : "";

  if (state === "backup_active") {
    return {
      failover_active: true,
      failover_state: state,
      active_list_name: activeListName,
      active_list_number: activeListNumber,
      playlist_sync_required: true,
      playlist_sync_mode: "background",
      playlist_sync_message: `A Lista 1 apresentou problema e você foi mudado automaticamente para ${activeListName}. Assim que normalizar, sua lista principal voltará automaticamente.`,
      reload_required: false,
      reload_message: "",
      failover_transition_id: transitionId,
      changed_at: changedAt,
    };
  }

  if (state === "primary_restored") {
    return {
      failover_active: false,
      failover_state: state,
      active_list_name: "Lista 1",
      active_list_number: 1,
      playlist_sync_required: true,
      playlist_sync_mode: "background",
      playlist_sync_message: "A Lista 1 voltou ao normal e foi restaurada automaticamente.",
      reload_required: false,
      reload_message: "",
      failover_transition_id: transitionId,
      changed_at: changedAt,
    };
  }

  return {
    failover_active: false,
    failover_state: state,
    active_list_name: "Lista 1",
    active_list_number: 1,
    playlist_sync_required: false,
    playlist_sync_mode: "",
    playlist_sync_message: "",
    reload_required: false,
    reload_message: "",
    failover_transition_id: transitionId,
    changed_at: changedAt,
  };
}

export function isDeviceListNotificationTitle(title: string, deviceId: number) {
  return title.startsWith(LIST_FAILURE_ALERT_PREFIX) || title.startsWith(LIST_RECOVERY_ALERT_PREFIX)
    ? title.endsWith(`#${deviceId}`)
    : false;
}

/** O cliente nunca recebe instruções internas do painel nem detalhes técnicos da operação. */
export function getClientFacingListMessage(status: ApkListNotificationStatus) {
  return status === "failure"
    ? "Detectamos uma instabilidade temporária na sua lista. Você não precisa fazer nada; se necessário, uma lista de reserva será ativada automaticamente."
    : "Sua lista voltou a funcionar normalmente.";
}

function mapNotification(alert: any, acknowledgedAlertIds: Set<number>) {
  const status: ApkListNotificationStatus = alert.type === "critical" ? "failure" : "recovered";
  return {
    id: alert.id,
    status,
    severity: alert.type,
    title: status === "failure" ? "Aviso sobre sua lista" : "Lista normalizada",
    message: getClientFacingListMessage(status),
    created_at: safeApkText(alert.createdAt instanceof Date ? alert.createdAt.toISOString() : alert.createdAt),
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
  const extraLists = await db.select().from(deviceUrls)
    .where(and(eq(deviceUrls.deviceId, device.id), eq(deviceUrls.ativo, true)))
    .orderBy(asc(deviceUrls.ordem), asc(deviceUrls.id));
  const latestFailoverEvent = (await db.select().from(listFailoverEvents)
    .where(and(eq(listFailoverEvents.ownerId, device.ownerId), eq(listFailoverEvents.deviceId, device.id)))
    .orderBy(desc(listFailoverEvents.createdAt), desc(listFailoverEvents.id))
    .limit(1))[0] ?? null;

  return {
    registered: true,
    device,
    notifications: ownAlerts.map((alert: any) => mapNotification(alert, acknowledgedAlertIds)),
    failover: buildApkFailoverStatus(device, extraLists, latestFailoverEvent),
    expiration: buildApkExpirationNotice(device),
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
