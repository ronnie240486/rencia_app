import { MANAGED_APP_CATALOG } from "../shared/appCatalog";

export type ApkDevice = { id: number; nomeServer: string; app: string | null; appVersion: string | null; telefone: string | null; lastSeen: Date | null };
export type ApkVersionMap = Record<string, string | null | undefined>;

export function compareVersions(first: string, second: string) {
  const a = first.split(/[^0-9]+/).filter(Boolean).map(Number);
  const b = second.split(/[^0-9]+/).filter(Boolean).map(Number);
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

export function buildConfiguredAppVersions(settings: Record<string, string | null | undefined>): ApkVersionMap {
  const configured: ApkVersionMap = {};
  for (const app of Object.values(MANAGED_APP_CATALOG)) {
    const id = app.id;
    const legacyVersionKey = id === "ouropro" ? "apk_version" : id === "fusion" ? "ultra_apk_version" : id === "maximus" ? "gpcpro_apk_version" : null;
    configured[id] = settings[`${id}_apk_version`] ?? (legacyVersionKey ? settings[legacyVersionKey] : null) ?? null;
  }
  return configured;
}

function getAppId(app: string | null) {
  const normalized = (app ?? "").trim().toLocaleLowerCase("pt-BR");
  return Object.values(MANAGED_APP_CATALOG).find((entry) => entry.deviceAliases.some((alias) => alias.toLocaleLowerCase("pt-BR") === normalized))?.id ?? null;
}

export function getConfiguredVersion(app: string | null, versions: ApkVersionMap) {
  const appId = getAppId(app);
  if (!appId) return null;
  // Mantém a leitura do formato anterior enquanto os clientes atualizam.
  if (appId === "ouropro") return versions.ouropro ?? versions.ouroPro ?? null;
  if (appId === "maximus") return versions.maximus ?? null;
  return versions[appId] ?? null;
}

export function buildApkUpdateOverview(devices: ApkDevice[], versions: ApkVersionMap) {
  return devices.map((device) => {
    const latestVersion = getConfiguredVersion(device.app, versions);
    const outdated = !!latestVersion && !!device.appVersion && compareVersions(device.appVersion, latestVersion) < 0;
    const phone = (device.telefone ?? "").replace(/\D/g, "");
    const message = `Olá ${device.nomeServer}, há uma nova versão do ${device.app || "aplicativo"} disponível (${latestVersion || "versão atual"}). Atualize o aplicativo para continuar com as melhorias.`;
    return { ...device, latestVersion, outdated, waUrl: phone && outdated ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : null };
  }).sort((a, b) => Number(b.outdated) - Number(a.outdated) || a.nomeServer.localeCompare(b.nomeServer));
}
