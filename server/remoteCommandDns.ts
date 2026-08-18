export type DnsTargetDevice = { id: number; urlM3u8?: string | null };
export type DnsTargetList = { deviceId: number; urlM3u8?: string | null; xtServer?: string | null };
export type ConfiguredDnsTarget = { titulo: string; host: string };

export function normalizeDnsHost(value: string): string {
  const raw = value.trim().replace(/\/+$/, "");
  if (!raw) return "";
  try {
    const parsed = new URL(raw.includes("://") ? raw : `https://${raw}`);
    return parsed.host.toLowerCase();
  } catch {
    return raw.replace(/^https?:\/\//i, "").split(/[/?#]/)[0].toLowerCase();
  }
}

export function urlUsesDnsHost(url: string | null | undefined, host: string): boolean {
  if (!url) return false;
  return normalizeDnsHost(url) === normalizeDnsHost(host);
}

/** Retorna uma vez cada aparelho que usa a DNS na Lista 1, 2, 3 ou em Xtream. */
export function collectDnsTargetDeviceIds(
  devices: DnsTargetDevice[],
  lists: DnsTargetList[],
  host: string,
): number[] {
  const targetIds = new Set<number>();
  for (const device of devices) {
    if (urlUsesDnsHost(device.urlM3u8, host)) targetIds.add(device.id);
  }
  for (const list of lists) {
    if (urlUsesDnsHost(list.urlM3u8, host) || urlUsesDnsHost(list.xtServer, host)) {
      targetIds.add(list.deviceId);
    }
  }
  return Array.from(targetIds);
}

/** Agrupa todas as DNS encontradas nas listas do cliente, incluindo Lista 1, 2, 3 e Xtream. */
export function buildDnsTargets(
  devices: DnsTargetDevice[],
  lists: DnsTargetList[],
  configuredDns: ConfiguredDnsTarget[] = [],
): Array<{ host: string; titulo: string; deviceCount: number }> {
  const labels = new Map<string, string>();
  for (const entry of configuredDns) {
    const host = normalizeDnsHost(entry.host);
    if (host) labels.set(host, entry.titulo || host);
  }
  const allHosts = new Set<string>(labels.keys());
  for (const device of devices) {
    const host = normalizeDnsHost(device.urlM3u8 || "");
    if (host) allHosts.add(host);
  }
  for (const list of lists) {
    const m3uHost = normalizeDnsHost(list.urlM3u8 || "");
    const xtreamHost = normalizeDnsHost(list.xtServer || "");
    if (m3uHost) allHosts.add(m3uHost);
    if (xtreamHost) allHosts.add(xtreamHost);
  }
  return Array.from(allHosts).map(host => ({
    host,
    titulo: labels.get(host) || host,
    deviceCount: collectDnsTargetDeviceIds(devices, lists, host).length,
  })).sort((left, right) => left.titulo.localeCompare(right.titulo, "pt-BR"));
}
