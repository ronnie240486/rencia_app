export type DnsTargetDevice = { id: number; urlM3u8?: string | null };
export type DnsTargetList = { deviceId: number; urlM3u8?: string | null; xtServer?: string | null };

export function normalizeDnsHost(value: string): string {
  return value.trim().replace(/\/+$/, "").toLowerCase();
}

export function urlUsesDnsHost(url: string | null | undefined, host: string): boolean {
  if (!url) return false;
  const normalizedUrl = url.trim().toLowerCase();
  const normalizedHost = normalizeDnsHost(host);
  return normalizedUrl === normalizedHost
    || normalizedUrl.startsWith(`${normalizedHost}/`)
    || normalizedUrl.startsWith(`${normalizedHost}?`);
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
