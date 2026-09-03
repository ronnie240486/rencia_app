export type DnsFailoverEntry = { host: string; grupo?: string | null; ativo?: boolean };

function normalizeHost(host: string | null | undefined) {
  return (host ?? "").trim().replace(/\/+$/, "");
}

function matchesHost(url: string, host: string) {
  const normalizedHost = normalizeHost(host);
  if (!normalizedHost) return false;
  if (url.startsWith(normalizedHost)) return true;
  try {
    return new URL(url).origin === new URL(normalizedHost).origin;
  } catch {
    return false;
  }
}

export function selectDnsProfileEntries(primaryUrl: string | null | undefined, entries: DnsFailoverEntry[]) {
  const primary = primaryUrl?.trim() || "";
  const matched = entries.find((entry) => matchesHost(primary, entry.host));
  if (!matched) return [];
  const group = matched.grupo || "Padrão";
  return entries.filter((entry) => (entry.grupo || "Padrão") === group);
}

export function replaceDnsHost(primaryUrl: string, host: string) {
  const normalizedHost = normalizeHost(host);
  if (!normalizedHost) return primaryUrl;
  if (primaryUrl.startsWith(normalizedHost)) return primaryUrl;
  try {
    const current = new URL(primaryUrl);
    const alternate = new URL(normalizedHost);
    current.protocol = alternate.protocol;
    current.host = alternate.host;
    return current.toString();
  } catch {
    return primaryUrl;
  }
}

export type DnsProbeResult = { host: string; status: "success" | "error" | "pending" };

/** Escolhe a primeira DNS que respondeu, respeitando a prioridade do perfil. */
export function pickWorkingDns(probes: DnsProbeResult[]) {
  return probes.find((probe) => probe.status === "success")?.host ?? null;
}

export function buildDnsFailoverUrls(primaryUrl: string | null | undefined, entries: DnsFailoverEntry[]) {
  const primary = primaryUrl?.trim() || "";
  if (!primary) return [];
  const activeEntries = entries.filter((entry) => entry.ativo !== false && entry.host?.trim());
  const candidates = activeEntries.map((entry) => {
    const host = normalizeHost(entry.host);
    if (primary.startsWith(host)) return `${host}${primary.slice(host.length)}`;
    return replaceDnsHost(primary, host) === primary && !primary.startsWith(host) ? host : replaceDnsHost(primary, host)
  });
  return Array.from(new Set([primary, ...candidates].filter(Boolean)));
}
