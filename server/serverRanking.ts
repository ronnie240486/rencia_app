export type ServerRankingDevice = {
  id: number;
  nomeServidor: string | null;
  nomeServer: string;
  mac: string | null;
  app: string | null;
  status: string;
  dataExpiracao: Date | string | null;
};

export function normalizeServerRankingName(value: string | null | undefined) {
  const name = value?.trim();
  return name ? name : null;
}

function rankingKey(name: string) {
  return name.toLocaleLowerCase("pt-BR");
}

export function buildServerRanking(rows: ServerRankingDevice[]) {
  const groups = new Map<string, { name: string; clientCount: number }>();
  for (const row of rows) {
    const name = normalizeServerRankingName(row.nomeServidor);
    if (!name) continue;
    const key = rankingKey(name);
    const current = groups.get(key) ?? { name, clientCount: 0 };
    current.clientCount += 1;
    groups.set(key, current);
  }
  return Array.from(groups.values()).sort((a, b) => b.clientCount - a.clientCount || a.name.localeCompare(b.name, "pt-BR"));
}

export function getServerRankingClients(rows: ServerRankingDevice[], selectedServer: string) {
  const key = rankingKey(selectedServer.trim());
  return rows
    .filter((row) => {
      const name = normalizeServerRankingName(row.nomeServidor);
      return name !== null && rankingKey(name) === key;
    })
    .sort((a, b) => a.nomeServer.localeCompare(b.nomeServer, "pt-BR"));
}
