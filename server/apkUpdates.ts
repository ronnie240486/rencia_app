export type ApkDevice = { id: number; nomeServer: string; app: string | null; appVersion: string | null; telefone: string | null; lastSeen: Date | null };

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

export function getConfiguredVersion(app: string | null, versions: { ouroPro: string | null; maximus: string | null }) {
  const name = (app ?? "").toLowerCase();
  return name.includes("maximus") ? versions.maximus : name.includes("ouro") ? versions.ouroPro : null;
}

export function buildApkUpdateOverview(devices: ApkDevice[], versions: { ouroPro: string | null; maximus: string | null }) {
  return devices.map((device) => {
    const latestVersion = getConfiguredVersion(device.app, versions);
    const outdated = !!latestVersion && !!device.appVersion && compareVersions(device.appVersion, latestVersion) < 0;
    const phone = (device.telefone ?? "").replace(/\D/g, "");
    const message = `Olá ${device.nomeServer}, há uma nova versão do ${device.app || "aplicativo"} disponível (${latestVersion || "versão atual"}). Atualize o aplicativo para continuar com as melhorias.`;
    return { ...device, latestVersion, outdated, waUrl: phone && outdated ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : null };
  }).sort((a, b) => Number(b.outdated) - Number(a.outdated) || a.nomeServer.localeCompare(b.nomeServer));
}
