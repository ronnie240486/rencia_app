import { eq, or } from "drizzle-orm";
import { deviceMacs, devices } from "../drizzle/schema";
import { normalizeMacForStorage } from "../shared/mac";
import { managedAppIdForValue } from "../shared/appCatalog";

/** Encontra o cadastro e informa qual APK está associado ao MAC encontrado. */
export async function findDeviceMatchByAnyMac(db: any, rawMac: string) {
  const mac = normalizeMacForStorage(rawMac);
  if (!mac) return null;

  const primary = await db.select().from(devices)
    .where(or(eq(devices.mac, mac), eq(devices.mac, mac.toLowerCase())))
    .limit(1);
  if (primary[0]) return { device: primary[0], appId: primary[0].app ?? null, primary: true };

  const alias = await db.select({ deviceId: deviceMacs.deviceId, appId: deviceMacs.appId })
    .from(deviceMacs)
    .where(eq(deviceMacs.mac, mac))
    .limit(1);
  if (!alias[0]) return null;

  const linked = await db.select().from(devices)
    .where(eq(devices.id, alias[0].deviceId))
    .limit(1);
  return linked[0] ? { device: linked[0], appId: alias[0].appId ?? managedAppIdForValue(linked[0].app) ?? null, primary: false } : null;
}

/** Encontra o cadastro principal pelo MAC original ou por um MAC adicional. */
export async function findDeviceByAnyMac(db: any, rawMac: string) {
  const match = await findDeviceMatchByAnyMac(db, rawMac);
  return match?.device ?? null;
}

/** Encontra o cadastro e garante que ele pertence ao proprietário informado. */
export async function findOwnedDeviceByAnyMac(db: any, rawMac: string, ownerId: number) {
  const device = await findDeviceByAnyMac(db, rawMac);
  return device && device.ownerId === ownerId ? device : null;
}

/** Retorna todos os MACs do cadastro em formato canônico, para respostas do APK. */
export function canonicalMac(rawMac: string | null | undefined) {
  return rawMac ? normalizeMacForStorage(rawMac) : null;
}

