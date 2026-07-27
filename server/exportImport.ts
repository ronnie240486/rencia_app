import { getDb } from "./db";
import { devices, dnsEntries } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export async function exportBackup(ownerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const [ownerDevices, ownerDns] = await Promise.all([
    db.select().from(devices).where(eq(devices.ownerId, ownerId)),
    db.select().from(dnsEntries).where(eq(dnsEntries.ownerId, ownerId)),
  ]);

  return {
    version: "1.0.0",
    exportDate: new Date().toISOString(),
    ownerId,
    data: {
      devices: ownerDevices,
      dns: ownerDns,
    },
  };
}

export async function importBackup(ownerId: number, backup: any) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  try {
    // Validar versão
    if (backup.version !== "1.0.0") {
      throw new Error("Versão de backup incompatível");
    }

    // Importar dispositivos
    if (backup.data?.devices && Array.isArray(backup.data.devices)) {
      for (const device of backup.data.devices) {
        const { id, ...deviceData } = device;
        // Verificar se já existe
        const existing = await db.select().from(devices)
          .where(eq(devices.id, id));
        
        if (existing.length > 0) {
          // Atualizar
          await db.update(devices)
            .set(deviceData)
            .where(eq(devices.id, id));
        } else {
          // Inserir
          await db.insert(devices).values({
            ...deviceData,
            ownerId,
          });
        }
      }
    }

    // Importar DNS
    if (backup.data?.dns && Array.isArray(backup.data.dns)) {
      for (const dns of backup.data.dns) {
        const { id, ...dnsData } = dns;
        const existing = await db.select().from(dnsEntries)
          .where(eq(dnsEntries.id, id));
        
        if (existing.length > 0) {
          await db.update(dnsEntries)
            .set(dnsData)
            .where(eq(dnsEntries.id, id));
        } else {
          await db.insert(dnsEntries).values({
            ...dnsData,
            ownerId,
          });
        }
      }
    }

    return { success: true, message: "Backup importado com sucesso" };
  } catch (error) {
    console.error("Erro ao importar backup:", error);
    throw error;
  }
}
