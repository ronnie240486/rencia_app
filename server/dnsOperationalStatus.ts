export type DnsOperationalDevice = {
  urlM3u8: string | null;
  status: string | null;
  lastSeen: Date | number | null;
};

export function isDnsOperationalInApk(device: DnsOperationalDevice, host: string, now = Date.now(), windowMinutes = 120) {
  if (device.status !== "Liberado" || !device.urlM3u8 || !device.lastSeen) return false;
  if (!device.urlM3u8.startsWith(host.replace(/\/+$/, ""))) return false;
  const seenAt = device.lastSeen instanceof Date ? device.lastSeen.getTime() : new Date(device.lastSeen).getTime();
  return Number.isFinite(seenAt) && now - seenAt >= 0 && now - seenAt <= windowMinutes * 60 * 1000;
}

export function hasActiveDeviceUsingDns(devices: DnsOperationalDevice[], host: string, now = Date.now()) {
  return devices.some((device) => isDnsOperationalInApk(device, host, now));
}

export function dnsOperationalMessage() {
  return "Funcionando no APK: cliente ativo usando esta DNS";
}
