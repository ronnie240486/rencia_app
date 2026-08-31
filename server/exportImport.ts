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
  ultraPlayerConfig,
  appCredentials,
  messageTemplates,
  resellerPermissions,
  apps,
  storeInvites,
  appSessions,
  auditLogs,
  payments,
  customerTags,
  deviceTags,
  customerNotes,
  maintenanceTasks,
  internalAlerts,
  deviceListNotificationReceipts,
  remoteDeviceCommands,
  resellerBillings,
  listHealthChecks,
  listFailoverSettings,
  listFailoverEvents,
  serverMaintenanceBlocks,
  autoBackupSettings,
  historyRetentionSettings,
} from "../drizzle/schema";
import { eq, inArray } from "drizzle-orm";
import { buildPortableBackupManifest } from "./portableBackupManifest";

export type PortableDeviceUrl = Record<string, any> & {
  backupDeviceId?: number;
  deviceMac?: string;
};

export function isSupportedBackupVersion(version: unknown) {
  return ['2.0.0', '3.0.0', '4.0.0'].includes(String(version));
}
function reviveDates<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => reviveDates(item)) as unknown as T;
  if (value && typeof value === "object") {
    const out: any = {};
    for (const [key, val] of Object.entries(value as any)) {
      out[key] = reviveDates(val);
    }
    return out;
  }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(value)) {
    return new Date(value) as unknown as T;
  }
  return value;
}

/** Converte o formato antigo por ID para entradas portáteis vinculadas ao MAC. */
export function normalizeBackupDeviceUrls(rawUrls: unknown, backupDevices: any[] = []): PortableDeviceUrl[] {
  const deviceMacById = new Map(backupDevices.map((device) => [Number(device.id), device.mac]));
  if (Array.isArray(rawUrls)) return rawUrls as PortableDeviceUrl[];
  if (!rawUrls || typeof rawUrls !== "object") return [];
  const entries: PortableDeviceUrl[] = [];
  for (const [backupDeviceId, urls] of Object.entries(rawUrls as Record<string, unknown>)) {
    if (!Array.isArray(urls)) continue;
    for (const url of urls) {
      entries.push({ ...(url as Record<string, any>), backupDeviceId: Number(backupDeviceId), deviceMac: deviceMacById.get(Number(backupDeviceId)) });
    }
  }
  return entries;
}

/** Mantém a restauração principal mesmo se uma tabela opcional não existir no destino. */
export async function importOptionalSection(label: string, action: () => Promise<void>, warnings: string[]) {
  try {
    await action();
  } catch (error) {
    console.warn(`[Import] ${label} não foi restaurado nesta instalação:`, error);
    warnings.push(label);
  }
}

export async function exportBackup(ownerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  try {
    const selectOwnerRows = async (table: any, label: string): Promise<any[]> => {
      try { return await db.select().from(table).where(eq(table.ownerId, ownerId)); }
      catch (error) { console.error(`[Export] Error fetching ${label}:`, error); return []; }
    };
    const selectDeviceRows = async (table: any, label: string, ownerDeviceIds: Set<number>): Promise<any[]> => {
      try {
        const rows = await db.select().from(table);
        return rows.filter((row: any) => ownerDeviceIds.has(Number(row.deviceId)));
      } catch (error) { console.error(`[Export] Error fetching ${label}:`, error); return []; }
    };

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
    let allUltraPlayerConfig: any[] = [];
    let allAppCredentials: any[] = [];
    let allMessageTemplates: any[] = [];
    let allResellerPermissions: any[] = [];
    let allApps: any[] = [];
    let ownerStoreInvites: any[] = [];
    let ownerAuditLogs: any[] = [];
    let ownerPayments: any[] = [];
    let ownerCustomerTags: any[] = [];
    let ownerDeviceTags: any[] = [];
    let ownerCustomerNotes: any[] = [];
    let ownerMaintenanceTasks: any[] = [];
    let ownerInternalAlerts: any[] = [];
    let ownerDeviceNotificationReceipts: any[] = [];
    let ownerRemoteDeviceCommands: any[] = [];
    let ownerResellerBillings: any[] = [];
    let ownerListHealthChecks: any[] = [];
    let ownerListFailoverSettings: any[] = [];
    let ownerListFailoverEvents: any[] = [];
    let ownerServerMaintenanceBlocks: any[] = [];
    let ownerAutoBackupSettings: any[] = [];
    let ownerHistoryRetentionSettings: any[] = [];
    let ownerAppSessions: any[] = [];

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
    try { allUltraPlayerConfig = await db.select().from(ultraPlayerConfig).where(eq(ultraPlayerConfig.ownerId, ownerId)); } catch (e) { console.error('[Export] Error fetching ultraPlayerConfig:', e); }
    try { allAppCredentials = await db.select().from(appCredentials).where(eq(appCredentials.ownerId, ownerId)); } catch (e) { console.error('[Export] Error fetching appCredentials:', e); }
    try { allMessageTemplates = await db.select().from(messageTemplates).where(eq(messageTemplates.ownerId, ownerId)); } catch (e) { console.error('[Export] Error fetching messageTemplates:', e); }
    try { allResellerPermissions = await db.select().from(resellerPermissions); } catch (e) { console.error('[Export] Error fetching resellerPermissions:', e); }
    try { allApps = await db.select().from(apps); } catch (e) { console.error('[Export] Error fetching apps:', e); }

    const ownerDeviceIds = new Set(ownerDevices.map((device) => Number(device.id)));
    ownerStoreInvites = await selectOwnerRows(storeInvites, "storeInvites");
    ownerAuditLogs = await selectOwnerRows(auditLogs, "auditLogs");
    ownerPayments = await selectOwnerRows(payments, "payments");
    ownerCustomerTags = await selectOwnerRows(customerTags, "customerTags");
    ownerCustomerNotes = await selectOwnerRows(customerNotes, "customerNotes");
    ownerMaintenanceTasks = await selectOwnerRows(maintenanceTasks, "maintenanceTasks");
    ownerInternalAlerts = await selectOwnerRows(internalAlerts, "internalAlerts");
    ownerRemoteDeviceCommands = await selectOwnerRows(remoteDeviceCommands, "remoteDeviceCommands");
    ownerResellerBillings = await selectOwnerRows(resellerBillings, "resellerBillings");
    ownerListHealthChecks = await selectOwnerRows(listHealthChecks, "listHealthChecks");
    ownerListFailoverSettings = await selectOwnerRows(listFailoverSettings, "listFailoverSettings");
    ownerListFailoverEvents = await selectOwnerRows(listFailoverEvents, "listFailoverEvents");
    ownerServerMaintenanceBlocks = await selectOwnerRows(serverMaintenanceBlocks, "serverMaintenanceBlocks");
    ownerAutoBackupSettings = await selectOwnerRows(autoBackupSettings, "autoBackupSettings");
    ownerHistoryRetentionSettings = await selectOwnerRows(historyRetentionSettings, "historyRetentionSettings");
    ownerAppSessions = await selectDeviceRows(appSessions, "appSessions", ownerDeviceIds);
    ownerDeviceTags = await selectDeviceRows(deviceTags, "deviceTags", ownerDeviceIds);
    ownerDeviceNotificationReceipts = await selectDeviceRows(deviceListNotificationReceipts, "deviceListNotificationReceipts", ownerDeviceIds);

    console.log('[Export] Data fetched - devices:', ownerDevices.length, 'users:', allUsers.length);

    // Buscar device URLs para cada device
    const portableDeviceUrls: PortableDeviceUrl[] = [];
    try {
      for (const device of ownerDevices) {
        try {
          const urls = await db.select().from(deviceUrls).where(eq(deviceUrls.deviceId, device.id));
          portableDeviceUrls.push(...urls.map((url) => ({ ...url, backupDeviceId: device.id, deviceMac: device.mac })));
        } catch (e) {
          console.error('[Export] Error fetching deviceUrls for device', device.id, ':', e);
        }
      }
    } catch (e) {
      console.error('[Export] Error in deviceUrls loop:', e);
    }

    const portableData = {
      owner: owner[0] || null,
      users: allUsers,
      devices: ownerDevices,
      deviceUrls: portableDeviceUrls,
      dns: ownerDns,
      nuvixConfig: ownerNuvixConfig,
      playerCredentials: ownerPlayerCredentials,
      appSettings: allAppSettings,
      carouselSlides: allCarouselSlides,
      carouselConfig: allCarouselConfig,
      suggestions: allSuggestions,
      notices: allNotices,
      localCredentials: allLocalCredentials,
      ultraPlayerConfig: allUltraPlayerConfig,
      appCredentials: allAppCredentials,
      messageTemplates: allMessageTemplates,
      resellerPermissions: allResellerPermissions,
      apps: allApps,
      storeInvites: ownerStoreInvites,
      appSessions: ownerAppSessions,
      auditLogs: ownerAuditLogs,
      payments: ownerPayments,
      customerTags: ownerCustomerTags,
      deviceTags: ownerDeviceTags,
      customerNotes: ownerCustomerNotes,
      maintenanceTasks: ownerMaintenanceTasks,
      internalAlerts: ownerInternalAlerts,
      deviceListNotificationReceipts: ownerDeviceNotificationReceipts,
      remoteDeviceCommands: ownerRemoteDeviceCommands,
      resellerBillings: ownerResellerBillings,
      listHealthChecks: ownerListHealthChecks,
      listFailoverSettings: ownerListFailoverSettings,
      listFailoverEvents: ownerListFailoverEvents,
      serverMaintenanceBlocks: ownerServerMaintenanceBlocks,
      autoBackupSettings: ownerAutoBackupSettings,
      historyRetentionSettings: ownerHistoryRetentionSettings,
    };

    return {
      version: "4.0.0",
      exportDate: new Date().toISOString(),
      ownerId,
      manifest: buildPortableBackupManifest(portableData),
      data: portableData,
    };
  } catch (error) {
    console.error("[Export] Error exporting backup:", error);
    throw error;
  }
}

export function normalizeImportMac(mac: unknown): string {
  return String(mac ?? "").replace(/[^a-fA-F0-9]/g, "").toUpperCase();
}

/**
 * Converte o backup completo atual no contrato usado pelos painéis antigos.
 * O formato 2.0 mantém clientes, MACs, listas, DNS e configurações básicas.
 */
export function buildLegacyV2Backup(fullBackup: any) {
  const sourceData = fullBackup?.data ?? {};
  const sourceDevices = (Array.isArray(sourceData.devices) ? sourceData.devices : []).map((device: any) => {
    const {
      id, ownerId, mac, nomeServer, tipo, modoSelecao, app, urlM3u8, urlEpg, valor, status,
      dataCadastro, dataExpiracao, createdAt, updatedAt, lastSeen, currentContent, telefone,
    } = device;
    return {
      id, ownerId, mac, nomeServer, tipo, modoSelecao, app, urlM3u8, urlEpg, valor, status,
      dataCadastro, dataExpiracao, createdAt, updatedAt, lastSeen, currentContent, telefone,
    };
  });
  const sourceDeviceIdByMac = new Map(sourceDevices.map((device: any) => [normalizeImportMac(device.mac), device.id]));
  const legacyDeviceUrls: Record<number, any[]> = {};

  for (const url of normalizeBackupDeviceUrls(sourceData.deviceUrls, sourceDevices)) {
    const sourceDeviceId = Number(url.backupDeviceId ?? sourceDeviceIdByMac.get(normalizeImportMac(url.deviceMac)) ?? url.deviceId);
    if (!sourceDeviceId) continue;
    const { backupDeviceId, deviceMac, ...legacyUrl } = url;
    legacyDeviceUrls[sourceDeviceId] ??= [];
    legacyDeviceUrls[sourceDeviceId].push({ ...legacyUrl, deviceId: sourceDeviceId });
  }

  return {
    version: "2.0.0",
    exportDate: fullBackup?.exportDate ?? new Date().toISOString(),
    ownerId: fullBackup?.ownerId,
    data: {
      owner: sourceData.owner ?? null,
      users: Array.isArray(sourceData.users) ? sourceData.users : [],
      devices: sourceDevices,
      deviceUrls: legacyDeviceUrls,
      dns: Array.isArray(sourceData.dns) ? sourceData.dns : [],
      nuvixConfig: Array.isArray(sourceData.nuvixConfig) ? sourceData.nuvixConfig : [],
      playerCredentials: Array.isArray(sourceData.playerCredentials) ? sourceData.playerCredentials : [],
      appSettings: Array.isArray(sourceData.appSettings) ? sourceData.appSettings : [],
      carouselSlides: Array.isArray(sourceData.carouselSlides) ? sourceData.carouselSlides : [],
      carouselConfig: Array.isArray(sourceData.carouselConfig) ? sourceData.carouselConfig : [],
      suggestions: Array.isArray(sourceData.suggestions) ? sourceData.suggestions : [],
      notices: Array.isArray(sourceData.notices) ? sourceData.notices : [],
    },
  };
}

export async function exportLegacyV2Backup(ownerId: number) {
  return buildLegacyV2Backup(await exportBackup(ownerId));
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
  if (!isSupportedBackupVersion(backup?.version)) throw new Error("Versão de backup incompatível.");
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
    if (!isSupportedBackupVersion(backup.version)) {
      throw new Error("Versão de backup incompatível.");
    }
    backup.data = reviveDates(backup.data);

    const sourceUsers = Array.isArray(backup.data?.users) ? backup.data.users : [];
    const sourceUserIdMap = new Map<number, number>();
    const optionalImportWarnings: string[] = [];

    // Importar usuários sem reaproveitar IDs internos. Os vínculos são refeitos
    // em seguida por e-mail/openId, que não mudam ao restaurar em outro banco.
    if (backup.data?.users && Array.isArray(backup.data.users)) {
      for (const user of backup.data.users) {
        const { id, resellerId, ...userData } = user;
        try {
          // Tentar inserir ou atualizar
          await db.insert(users).values({ ...userData, resellerId: null }).onDuplicateKeyUpdate({ set: { ...userData, resellerId: null } });
        } catch (err) {
          console.warn(`[Import] Erro ao importar usuário ${user.email}:`, err);
        }
      }
    }

    const restoredUsers = await db.select({ id: users.id, email: users.email, openId: users.openId }).from(users);
    for (const sourceUser of sourceUsers) {
      const restored = restoredUsers.find((user) =>
        (sourceUser.openId && user.openId === sourceUser.openId) ||
        (sourceUser.email && user.email?.toLowerCase() === String(sourceUser.email).toLowerCase()),
      );
      if (restored) sourceUserIdMap.set(Number(sourceUser.id), restored.id);
    }
    for (const sourceUser of sourceUsers) {
      const targetUserId = sourceUserIdMap.get(Number(sourceUser.id));
      const targetResellerId = sourceUserIdMap.get(Number(sourceUser.resellerId));
      if (targetUserId && sourceUser.resellerId != null && targetResellerId) {
        await db.update(users).set({ resellerId: targetResellerId }).where(eq(users.id, targetUserId));
      }
    }

    // Importar dispositivos (evita duplicar pelo MAC, já que não existe índice único nessa coluna)
    if (backup.data?.devices && Array.isArray(backup.data.devices)) {
      const existingDevices = await db.select({ id: devices.id, mac: devices.mac }).from(devices).where(eq(devices.ownerId, ownerId));
      const existingByMac = new Map(existingDevices.map((d) => [normalizeImportMac(d.mac), d.id]));
      for (const device of backup.data.devices) {
        const { id, ...deviceData } = device;
        try {
          const existingId = existingByMac.get(normalizeImportMac(device.mac));
          if (existingId) {
                       await db.update(devices).set({ ...deviceData, ownerId }).where(eq(devices.id, existingId));
          } else {
            const [result] = await db.insert(devices).values({ ...deviceData, ownerId });
            const newId = (result as any).insertId;
            if (newId) existingByMac.set(normalizeImportMac(device.mac), Number(newId));
          }
        } catch (err) {
          console.warn(`[Import] Erro ao importar device ${device.mac}:`, err);
        }
      }
    }

    // Importar listas pelo MAC, nunca pelo ID antigo do dispositivo. Assim uma
    // restauração em outro banco mantém cada lista no cliente correto.
    const targetDevices = await db.select({ id: devices.id, mac: devices.mac }).from(devices).where(eq(devices.ownerId, ownerId));
    const targetDeviceByMac = new Map(targetDevices.map((device) => [normalizeImportMac(device.mac), device.id]));
    const targetDeviceIdBySourceId = new Map<number, number>();
    for (const sourceDevice of backup.data?.devices ?? []) {
      const targetDeviceId = targetDeviceByMac.get(normalizeImportMac(sourceDevice.mac));
      if (targetDeviceId) targetDeviceIdBySourceId.set(Number(sourceDevice.id), targetDeviceId);
    }
    const incomingUrls = normalizeBackupDeviceUrls(backup.data?.deviceUrls, backup.data?.devices ?? []);
    for (const url of incomingUrls) {
      const targetDeviceId = targetDeviceByMac.get(normalizeImportMac(url.deviceMac));
      if (!targetDeviceId) {
        console.warn(`[Import] Lista ignorada: MAC de origem não encontrado (${url.deviceMac ?? "sem MAC"}).`);
        continue;
      }
      const { id, deviceId, backupDeviceId, deviceMac, ...urlData } = url;
      try {
        const existingUrls = await db.select().from(deviceUrls).where(eq(deviceUrls.deviceId, targetDeviceId));
        const existing = existingUrls.find((item) => item.nome === urlData.nome && item.ordem === urlData.ordem);
        if (existing) await db.update(deviceUrls).set(urlData).where(eq(deviceUrls.id, existing.id));
        else await db.insert(deviceUrls).values({ ...urlData, deviceId: targetDeviceId });
      } catch (err) {
        console.warn(`[Import] Erro ao importar lista:`, err);
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
        const { id, userId, ...credData } = cred;
        const targetUserId = sourceUserIdMap.get(Number(userId));
        if (!targetUserId) continue;
        try {
          await db.insert(localCredentials).values({ ...credData, userId: targetUserId }).onDuplicateKeyUpdate({ set: { ...credData, userId: targetUserId } });
        } catch (err) {
          console.warn(`[Import] Erro ao importar Local Credential:`, err);
        }
      }
    }

    await importOptionalSection("Configurações do Ultra Player", async () => {
      if (!Array.isArray(backup.data?.ultraPlayerConfig)) return;
      for (const config of backup.data.ultraPlayerConfig) {
        const { id, ownerId: _ownerId, ...configData } = config;
        await db.insert(ultraPlayerConfig).values({ ...configData, ownerId }).onDuplicateKeyUpdate({ set: configData });
      }
    }, optionalImportWarnings);
    await importOptionalSection("Credenciais dos aplicativos", async () => {
      if (!Array.isArray(backup.data?.appCredentials)) return;
      for (const credential of backup.data.appCredentials) {
        const { id, ownerId: _ownerId, deviceId, ...credentialData } = credential;
        const targetDeviceId = targetDeviceIdBySourceId.get(Number(deviceId));
        if (!targetDeviceId) continue;
        await db.insert(appCredentials).values({ ...credentialData, ownerId, deviceId: targetDeviceId }).onDuplicateKeyUpdate({ set: { ...credentialData, ownerId, deviceId: targetDeviceId } });
      }
    }, optionalImportWarnings);
    await importOptionalSection("Modelos de mensagens", async () => {
      if (!Array.isArray(backup.data?.messageTemplates)) return;
      for (const template of backup.data.messageTemplates) {
        const { id, ownerId: _ownerId, ...templateData } = template;
        await db.insert(messageTemplates).values({ ...templateData, ownerId });
      }
    }, optionalImportWarnings);
    await importOptionalSection("Permissões de revendas", async () => {
      if (!Array.isArray(backup.data?.resellerPermissions)) return;
      for (const permission of backup.data.resellerPermissions) {
        const { id, resellerId, updatedBy, ...permissionData } = permission;
        const targetResellerId = sourceUserIdMap.get(Number(resellerId));
        const targetUpdatedBy = sourceUserIdMap.get(Number(updatedBy)) ?? ownerId;
        if (!targetResellerId) continue;
        await db.insert(resellerPermissions).values({ ...permissionData, resellerId: targetResellerId, updatedBy: targetUpdatedBy }).onDuplicateKeyUpdate({ set: { ...permissionData, updatedBy: targetUpdatedBy } });
      }
    }, optionalImportWarnings);
    await importOptionalSection("Catálogo de aplicativos", async () => {
      if (!Array.isArray(backup.data?.apps)) return;
      for (const app of backup.data.apps) {
        const { id, ...appData } = app;
        await db.insert(apps).values(appData);
      }
    }, optionalImportWarnings);

    return {
      success: true,
      message: optionalImportWarnings.length
        ? "Backup principal importado. Alguns recursos opcionais precisam de atualização no painel de destino."
        : "Backup importado com sucesso",
      optionalImportWarnings,
    };
  } catch (error) {
    console.error("[Import] Erro ao importar backup:", error);
    throw error;
  }
}
