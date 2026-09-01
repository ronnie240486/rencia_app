export type SessionCandidate = {
  id: number;
  mac: string | null;
  nomeServer: string;
  app: string | null;
  status: "Liberado" | "Bloqueado" | "Expirado";
  lastSeen: Date | null;
  currentContent: string | null;
  maxConcurrentConnections: number;
};

export function buildSessionOverview(rows: SessionCandidate[], now = new Date(), minutesWindow = 30) {
  const cutoff = now.getTime() - minutesWindow * 60 * 1000;
  const macCounts = new Map<string, number>();
  rows.forEach((row) => {
    const key = (row.mac ?? `NO_MAC:${row.id}`).trim().toUpperCase();
    macCounts.set(key, (macCounts.get(key) ?? 0) + 1);
  });
  return rows.map((row) => {
    const active = !!row.lastSeen && row.lastSeen.getTime() >= cutoff;
    const repeatedMacCount = macCounts.get((row.mac ?? `NO_MAC:${row.id}`).trim().toUpperCase()) ?? 1;
    return {
      ...row,
      active,
      repeatedMacCount,
      risk: active && repeatedMacCount > 1 ? "suspicious" as const : active ? "normal" as const : "inactive" as const,
    };
  }).sort((first, second) => {
    const riskRank = { suspicious: 0, normal: 1, inactive: 2 };
    return riskRank[first.risk] - riskRank[second.risk] || Number(second.lastSeen ?? 0) - Number(first.lastSeen ?? 0);
  });
}
