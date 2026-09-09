export type DnsCurrentHealth = "healthy" | "attention" | "critical" | "unknown";

/** O selo do grupo representa somente o último estado conhecido de cada Host. */
export function getDnsGroupCurrentHealth(statuses: string[]): DnsCurrentHealth {
  if (statuses.length === 0 || statuses.every((status) => status === "unknown")) return "unknown";
  const currentErrors = statuses.filter((status) => status === "error").length;
  if (currentErrors === statuses.length) return "critical";
  if (currentErrors > 0) return "attention";
  return "healthy";
}
