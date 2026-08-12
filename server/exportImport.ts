import { getDb } from "./db";
import {
  devices,
  dnsEntries,
  users,
  deviceUrls,
  appSettings,
  carouselSlides,
  carouselConfig,
  suggestions,
  notices,
  nuvixConfig,
  playerCredentials,
  localCredentials,
} from "../drizzle/schema";
import { eq } from "drizzle-orm";

export async function exportBackup(ownerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  try {
    // Buscar o dono para incluir no backup
    const owner = await db.select().from(users).where(eq(users.id, ownerId));
    console.log('[Export] Owner:', owner.length > 0 ? 'found' : 'not found');

    // Buscar todos os dados relacionados ao dono - com try-catch individual para cada query
    let ownerDevices: any[] = [];
    let ownerDns: any[] = [];
    let ownerNuvixConfig: any[] = [];
    let ownerPlayerCredentials: any[] = [];
    let allUsers: any[] = [];
    let allAppSettings: any[] = [];
    let allCarouselSlides: any[] = [];
    let allCarouselConfig: any[] = [];
    let allSuggestions: any[] = [];
    let allNotices: any[] = [];
    let allLocalCredentials: any[] = [];

    try { ownerDevices = await db.select().from(devices).where(eq(devices.ownerId, ownerId)); } catch (e) { console.error('[Export] Error fetching devices:', e); }
    try { ownerDns = await db.select().from(dnsEntries).where(eq(dnsEntries.ownerId, ownerId)); } catch (e) { console.error('[Export] Error fetching dnsEntries:', e); }
    try { ownerNuvixConfig = await db.select().from(nuvixConfig).where(eq(nuvixConfig.ownerId, ownerId)); } catch (e) { console.error('[Export] Error fetching nuvixConfig:', e); }
    try { ownerPlayerCredentials = await db.select().from(playerCredentials).where(eq(playerCredentials.ownerId, ownerId)); } catch (e) { console.error('[Export] Error fetching playerCredentials:', e); }
    try { allUsers = await db.select().from(users); } catch (e) { console.error('[Export] Error fetching users:', e); }
    try { allAppSettings = await db.select().from(appSettings); } catch (e) { console.error('[Export] Error fetching appSettings:', e); }
    try { allCarouselSlides = await db.select().from(carouselSlides); } catch (e) { console.error('[Export] Error fetching carouselSlides:', e); }
    try { allCarouselConfig = await db.select().from(carouselConfig); } catch (e) { console.error('[Export] Error fetching carouselConfig:', e); }
    try { allSuggestions = await db.select().from(suggestions); } catch (e) { console.error('[Export] Error fetching suggestions:', e); }
    try { allNotices = await db.select().from(notices); } catch (e) { console.error('[Export] Error fetching notices:', e); }
    try { allLocalCredentials = await db.select().from(localCredentials); } catch (e) { console.error('[Export] Error fetching localCredentials:', e); }

    console.log('[Export] Data fetched - devices:', ownerDevices.length, 'users:', allUsers.length);

    // Buscar device URLs para cada device
    const deviceUrlsMap: Record<number, typeof deviceUrls.$inferSelect[]> = {};
    try {
      for (const device of ownerDevices) {
        try {
          const urls = await db.select().from(deviceUrls).where(eq(deviceUrls.deviceId, device.id));
          deviceUrlsMap[device.id] = urls;
        } catch (e) {
          console.error('[Export] Error fetching deviceUrls for device', device.id, ':', e);
        }
      }
    } catch (e) {
      console.error('[Export] Error in deviceUrls loop:', e);
    }

    return {
      version: "2.0.0",
      exportDate: new Date().toISOString(),
      ownerId,
      data: {
        owner: owner[0] || null,
        users: allUsers,
        devices: ownerDevices,
        deviceUrls: deviceUrlsMap,
        dns: ownerDns,
        nuvixConfig: ownerNuvixConfig,
        playerCredentials: ownerPlayerCredentials,
        appSettings: allAppSettings,
        carouselSlides: allCarouselSlides,
        carouselConfig: allCarouselConfig,
        suggestions: allSuggestions,
        notices: allNotices,
        localCredentials: allLocalCredentials,
      },
    };
  } catch (error) {
    console.error("[Export] Error exporting backup:", error);
    throw error;
  }
}

export function normalizeImportMac(mac: unknown): string {
  return String(mac ?? "").replace(/[^a-fA-F0-9]/g, "").toUpperCase();
}

export function analyzeImportDevices(incoming: any[], existing: Array<{ id: number; mac: string; nomeServer: string | null }>) {
  const existingByMac = new Map(existing.map((device) => [normalizeImportMac(device.mac), device]));
  const seen = new Set<string>();
  const duplicateInFile: any[] = [];
  const existingMatches: any[] = [];
  const newDevices: any[] = [];
  const invalidDevices: any[] = [];
  for (const device of incoming) {
    const mac = normalizeImportMac(device?.mac);
    if (!mac || mac.length !== 12) { invalidDevices.push({ nomeServer: device?.nomeServer ?? "Sem nome", mac: device?.mac ?? null }); continue; }
    if (seen.has(mac)) { duplicateInFile.push({ nomeServer: device?.nomeServer ?? "Sem nome", mac: device?.mac }); continue; }
    seen.add(mac);
    const found = existingByMac.get(mac);
    if (found) existingMatches.push({ mac: device?.mac, importName: device?.nomeServer ?? "Sem nome", currentName: found.nomeServer, currentId: found.id });
    else newDevices.push({ nomeServer: device?.nomeServer ?? "Sem nome", mac: device?.mac });
  }
  return { newDevices, existingMatches, duplicateInFile, invalidDevices };
}

export async function previewBackupImport(ownerId: number, backup: any) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  if (backup?.version !== "2.0.0") throw new Error("Versão de backup incompatível. Esperado: 2.0.0");
  const incoming = Array.isArray(backup?.data?.devices) ? backup.data.devices : [];
  const existing = await db.select({ id: devices.id, mac: devices.mac, nomeServer: devices.nomeServer }).from(devices).where(eq(devices.ownerId, ownerId));
  const { newDevices, existingMatches, duplicateInFile, invalidDevices } = analyzeImportDevices(incoming, existing);
  return {
    valid: invalidDevices.length === 0,
    summary: { importedDevices: incoming.length, newDevices: newDevices.length, existingMatches: existingMatches.length, duplicateInFile: duplicateInFile.length, invalidDevices: invalidDevices.length },
    newDevices: newDevices.slice(0, 20), existingMatches: existingMatches.slice(0, 20), duplicateInFile: duplicateInFile.slice(0, 20), invalidDevices: invalidDevices.slice(0, 20),
  };
}

export async function importBackup(ownerId: number, backup: any) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  try {
    // Validar versão
    if (backup.version !== "2.0.0") {
      throw new Error("Versão de backup incompatível. Esperado: 2.0.0");
    }

    // Importar usuários
    if (backup.data?.users && Array.isArray(backup.data.users)) {
      for (const user of backup.data.users) {
        const { id, ...userData } = user;
        try {
          // Tentar inserir ou atualizar
          await db.insert(users).values(userData).onDuplicateKeyUpdate({ set: userData });
        } catch (err) {
          console.warn(`[Import] Erro ao importar usuário ${user.email}:`, err);
        }
      }
    }

    // Importar dispositivos
    if (backup.data?.devices && Array.isArray(backup.data.devices)) {
      for (const device of backup.data.devices) {
        const { id, ...deviceData } = device;
        try {
          await db.insert(devices).values({ ...deviceData, ownerId }).onDuplicateKeyUpdate({ set: deviceData });
        } catch (err) {
          console.warn(`[Import] Erro ao importar device ${device.mac}:`, err);
        }
      }
    }

    // Importar device URLs
    if (backup.data?.deviceUrls && typeof backup.data.deviceUrls === "object") {
      for (const [deviceIdStr, urls] of Object.entries(backup.data.deviceUrls)) {
        if (Array.isArray(urls)) {
          for (const url of urls) {
            const { id, ...urlData } = url;
            try {
              await db.insert(deviceUrls).values(urlData).onDuplicateKeyUpdate({ set: urlData });
            } catch (err) {
              console.warn(`[Import] Erro ao importar device URL:`, err);
            }
          }
        }
      }
    }

    // Importar DNS
    if (backup.data?.dns && Array.isArray(backup.data.dns)) {
      for (const dns of backup.data.dns) {
        const { id, ...dnsData } = dns;
        try {
          await db.insert(dnsEntries).values({ ...dnsData, ownerId }).onDuplicateKeyUpdate({ set: dnsData });
        } catch (err) {
          console.warn(`[Import] Erro ao importar DNS:`, err);
        }
      }
    }

    // Importar Nuvix Config
    if (backup.data?.nuvixConfig && Array.isArray(backup.data.nuvixConfig)) {
      for (const config of backup.data.nuvixConfig) {
        const { id, ...configData } = config;
        try {
          await db.insert(nuvixConfig).values({ ...configData, ownerId }).onDuplicateKeyUpdate({ set: configData });
        } catch (err) {
          console.warn(`[Import] Erro ao importar Nuvix Config:`, err);
        }
      }
    }

    // Importar Player Credentials
    if (backup.data?.playerCredentials && Array.isArray(backup.data.playerCredentials)) {
      for (const cred of backup.data.playerCredentials) {
        const { id, ...credData } = cred;
        try {
          await db.insert(playerCredentials).values({ ...credData, ownerId }).onDuplicateKeyUpdate({ set: credData });
        } catch (err) {
          console.warn(`[Import] Erro ao importar Player Credentials:`, err);
        }
      }
    }

    // Importar App Settings
    if (backup.data?.appSettings && Array.isArray(backup.data.appSettings)) {
      for (const setting of backup.data.appSettings) {
        const { id, ...settingData } = setting;
        try {
          await db.insert(appSettings).values(settingData).onDuplicateKeyUpdate({ set: settingData });
        } catch (err) {
          console.warn(`[Import] Erro ao importar App Setting:`, err);
        }
      }
    }

    // Importar Carousel Slides
    if (backup.data?.carouselSlides && Array.isArray(backup.data.carouselSlides)) {
      for (const slide of backup.data.carouselSlides) {
        const { id, ...slideData } = slide;
        try {
          await db.insert(carouselSlides).values(slideData).onDuplicateKeyUpdate({ set: slideData });
        } catch (err) {
          console.warn(`[Import] Erro ao importar Carousel Slide:`, err);
        }
      }
    }

    // Importar Carousel Config
    if (backup.data?.carouselConfig && Array.isArray(backup.data.carouselConfig)) {
      for (const config of backup.data.carouselConfig) {
        const { id, ...configData } = config;
        try {
          await db.insert(carouselConfig).values(configData).onDuplicateKeyUpdate({ set: configData });
        } catch (err) {
          console.warn(`[Import] Erro ao importar Carousel Config:`, err);
        }
      }
    }

    // Importar Suggestions
    if (backup.data?.suggestions && Array.isArray(backup.data.suggestions)) {
      for (const suggestion of backup.data.suggestions) {
        const { id, ...suggestionData } = suggestion;
        try {
          await db.insert(suggestions).values(suggestionData).onDuplicateKeyUpdate({ set: suggestionData });
        } catch (err) {
          console.warn(`[Import] Erro ao importar Suggestion:`, err);
        }
      }
    }

    // Importar Notices
    if (backup.data?.notices && Array.isArray(backup.data.notices)) {
      for (const notice of backup.data.notices) {
        const { id, ...noticeData } = notice;
        try {
          await db.insert(notices).values(noticeData).onDuplicateKeyUpdate({ set: noticeData });
        } catch (err) {
          console.warn(`[Import] Erro ao importar Notice:`, err);
        }
      }
    }

    // Importar Local Credentials
    if (backup.data?.localCredentials && Array.isArray(backup.data.localCredentials)) {
      for (const cred of backup.data.localCredentials) {
        const { id, ...credData } = cred;
        try {
          await db.insert(localCredentials).values(credData).onDuplicateKeyUpdate({ set: credData });
        } catch (err) {
          console.warn(`[Import] Erro ao importar Local Credential:`, err);
        }
      }
    }

    return { success: true, message: "Backup importado com sucesso" };
  } catch (error) {
    console.error("[Import] Erro ao importar backup:", error);
    throw error;
  }
}
