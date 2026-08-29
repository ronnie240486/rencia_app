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
} from "../drizzle/schema";
import { eq } from "drizzle-orm";

export async function exportBackup(ownerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  try {
    // Buscar o dono para incluir no backup
    const owner = await db.select().from(users).where(eq(users.id, ownerId));

    // Buscar todos os dados relacionados ao dono
    const [
      ownerDevices,
      ownerDns,
      ownerNuvixConfig,
      ownerPlayerCredentials,
      allUsers,
      allAppSettings,
      allCarouselSlides,
      allCarouselConfig,
      allSuggestions,
      allNotices,
    ] = await Promise.all([
      db.select().from(devices).where(eq(devices.ownerId, ownerId)),
      db.select().from(dnsEntries).where(eq(dnsEntries.ownerId, ownerId)),
      db.select().from(nuvixConfig).where(eq(nuvixConfig.ownerId, ownerId)),
      db.select().from(playerCredentials).where(eq(playerCredentials.ownerId, ownerId)),
      db.select().from(users), // Todos os usuários
      db.select().from(appSettings), // Todas as configurações
      db.select().from(carouselSlides), // Todos os slides
      db.select().from(carouselConfig), // Configuração do carousel
      db.select().from(suggestions), // Todas as sugestões
      db.select().from(notices), // Todos os avisos
    ]);

    // Buscar device URLs para cada device
    const deviceUrlsMap: Record<number, typeof deviceUrls.$inferSelect[]> = {};
    for (const device of ownerDevices) {
      const urls = await db.select().from(deviceUrls).where(eq(deviceUrls.deviceId, device.id));
      deviceUrlsMap[device.id] = urls;
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
      },
    };
  } catch (error) {
    console.error("[Export] Error exporting backup:", error);
    throw error;
  }
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

    return { success: true, message: "Backup importado com sucesso" };
  } catch (error) {
    console.error("[Import] Erro ao importar backup:", error);
    throw error;
  }
}
