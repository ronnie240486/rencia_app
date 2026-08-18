import { and, asc, desc, eq, inArray, lt, or } from "drizzle-orm";
import { devices, remoteDeviceCommands } from "../drizzle/schema";
import { normalizeMacAddress } from "./ultraPlayerConfig";

export const REMOTE_COMMAND_TYPES = ["refresh_playlist", "switch_playlist", "update_dns", "show_message", "restart_player", "sync_access"] as const;
export const REMOTE_COMMAND_STATUSES = ["queued", "delivered", "executed", "failed", "expired", "cancelled"] as const;
export type RemoteCommandType = typeof REMOTE_COMMAND_TYPES[number];
export type RemoteCommandStatus = typeof REMOTE_COMMAND_STATUSES[number];

export const REMOTE_COMMAND_LABELS: Record<RemoteCommandType, string> = {
  refresh_playlist: "Atualizar lista",
  switch_playlist: "Trocar lista",
  update_dns: "Atualizar DNS",
  show_message: "Exibir aviso",
  restart_player: "Reiniciar player",
  sync_access: "Sincronizar bloqueio/liberação",
};

export function parseRemotePayload(payload: string | null) {
  if (!payload) return {};
  try {
    const parsed = JSON.parse(payload);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function commandExpiresAt(minutes = 15, now = new Date()) {
  return new Date(now.getTime() + minutes * 60_000);
}

export function mapRemoteCommand(command: any) {
  return {
    id: command.id,
    type: command.command as RemoteCommandType,
    label: REMOTE_COMMAND_LABELS[command.command as RemoteCommandType],
    payload: parseRemotePayload(command.payload),
    status: command.status as RemoteCommandStatus,
    expires_at: command.expiresAt?.toISOString?.() ?? command.expiresAt,
    created_at: command.createdAt?.toISOString?.() ?? command.createdAt,
  };
}

/** Seleciona o cadastro ligado à ordem, mesmo se existir mais de um registro para o mesmo MAC. */
export function selectDeviceForRemoteCommand<T extends { id: number }>(candidates: T[], command: { deviceId: number } | null | undefined): T | null {
  if (!candidates.length) return null;
  if (!command) return candidates[0];
  return candidates.find((device) => device.id === command.deviceId) ?? candidates[0];
}

export async function expireRemoteCommands(db: any, now = new Date(), deviceId?: number) {
  const conditions = [inArray(remoteDeviceCommands.status, ["queued", "delivered"]), lt(remoteDeviceCommands.expiresAt, now)];
  if (deviceId) conditions.push(eq(remoteDeviceCommands.deviceId, deviceId));
  await db.update(remoteDeviceCommands).set({ status: "expired", resultMessage: "Comando expirou antes da confirmação do aparelho." }).where(and(...conditions));
}

/** Retorna sempre o primeiro comando pendente para que o APK consiga processar em ordem. */
export async function claimRemoteCommandForMac(db: any, macInput: string) {
  const mac = normalizeMacAddress(macInput);
  if (!mac) return { registered: false, command: null };
  const candidateDevices = await db.select().from(devices)
    .where(or(eq(devices.mac, mac), eq(devices.mac, mac.toLowerCase())))
    .orderBy(desc(devices.updatedAt), desc(devices.id));
  if (!candidateDevices.length) return { registered: false, command: null };

  const now = new Date();
  await Promise.all(candidateDevices.map((device: { id: number }) => expireRemoteCommands(db, now, device.id)));
  const command = (await db.select().from(remoteDeviceCommands)
    .where(and(
      inArray(remoteDeviceCommands.deviceId, candidateDevices.map((device: { id: number }) => device.id)),
      inArray(remoteDeviceCommands.status, ["queued", "delivered"]),
    ))
    .orderBy(asc(remoteDeviceCommands.createdAt), asc(remoteDeviceCommands.id))
    .limit(1))[0];
  const device = selectDeviceForRemoteCommand(candidateDevices, command);
  if (!command || !device) return { registered: true, device: candidateDevices[0], command: null };
  if (command.status === "queued") {
    await db.update(remoteDeviceCommands).set({ status: "delivered", deliveredAt: now }).where(eq(remoteDeviceCommands.id, command.id));
    command.status = "delivered";
    command.deliveredAt = now;
  }
  return { registered: true, device, command: mapRemoteCommand(command) };
}

export async function acknowledgeRemoteCommand(db: any, macInput: string, commandId: number, status: "executed" | "failed", resultMessage?: string) {
  const mac = normalizeMacAddress(macInput);
  if (!mac) return { ok: false, error: "MAC inválido" };
  const candidateDevices = await db.select().from(devices)
    .where(or(eq(devices.mac, mac), eq(devices.mac, mac.toLowerCase())))
    .orderBy(desc(devices.updatedAt), desc(devices.id));
  if (!candidateDevices.length) return { ok: false, error: "Dispositivo não encontrado" };

  const command = (await db.select().from(remoteDeviceCommands)
    .where(and(eq(remoteDeviceCommands.id, commandId), inArray(remoteDeviceCommands.deviceId, candidateDevices.map((device: { id: number }) => device.id))))
    .limit(1))[0];
  if (!command) return { ok: false, error: "Comando não encontrado para este aparelho" };
  if (!["queued", "delivered"].includes(command.status)) return { ok: false, error: `Comando já está ${command.status}` };

  await db.update(remoteDeviceCommands).set({
    status,
    executedAt: new Date(),
    resultMessage: resultMessage?.trim().slice(0, 500) || (status === "executed" ? "Executado pelo aparelho." : "O aparelho não conseguiu executar o comando."),
  }).where(eq(remoteDeviceCommands.id, command.id));
  return { ok: true };
}
