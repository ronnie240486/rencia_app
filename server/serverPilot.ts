export type ServerPilotTarget = {
  deviceId: number;
  deviceName: string;
  listName: string;
  url: string;
};

export type ServerPilotCheck = {
  deviceId: number;
  urlSnapshot: string;
  status: string;
  checkedAt?: Date | string | null;
};

function serverKey(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.host.toLowerCase();
  } catch {
    return "servidor inválido";
  }
}

function targetKey(deviceId: number, url: string) {
  return `${deviceId}:${url}`;
}

/**
 * Consolida a saúde por host sem assumir que uma credencial isolada representa
 * todo o servidor. Uma falha geral exige dois dispositivos diferentes, cada um
 * com duas falhas consecutivas na própria lista.
 */
export function buildServerPilotOverview(targets: ServerPilotTarget[], checks: ServerPilotCheck[]) {
  const latestByTarget = new Map<string, ServerPilotCheck>();
  const recentByTarget = new Map<string, ServerPilotCheck[]>();

  for (const check of checks) {
    const key = targetKey(check.deviceId, check.urlSnapshot);
    if (!latestByTarget.has(key)) latestByTarget.set(key, check);
    const history = recentByTarget.get(key) ?? [];
    if (history.length < 2) history.push(check);
    recentByTarget.set(key, history);
  }

  const grouped = new Map<string, {
    host: string;
    targets: ServerPilotTarget[];
    affectedDevices: Set<number>;
    confirmedDevices: Set<number>;
    observingDevices: Set<number>;
  }>();

  for (const target of targets) {
    const host = serverKey(target.url);
    const group = grouped.get(host) ?? {
      host,
      targets: [],
      affectedDevices: new Set<number>(),
      confirmedDevices: new Set<number>(),
      observingDevices: new Set<number>(),
    };
    group.targets.push(target);
    group.affectedDevices.add(target.deviceId);

    const history = recentByTarget.get(targetKey(target.deviceId, target.url)) ?? [];
    const latest = latestByTarget.get(targetKey(target.deviceId, target.url));
    const targetFailed = history.length >= 2 && history[0]?.status === "error" && history[1]?.status === "error";
    if (targetFailed) group.confirmedDevices.add(target.deviceId);
    else if (latest?.status === "error" || latest?.status === "pending") group.observingDevices.add(target.deviceId);
    grouped.set(host, group);
  }

  return Array.from(grouped.values()).map((group) => {
    const critical = group.confirmedDevices.size >= 2;
    const observing = !critical && (group.confirmedDevices.size > 0 || group.observingDevices.size > 0);
    return {
      host: group.host,
      state: critical ? "critical" as const : observing ? "observing" as const : "healthy" as const,
      totalLists: group.targets.length,
      affectedDevices: group.affectedDevices.size,
      confirmedDevices: group.confirmedDevices.size,
      observingDevices: group.observingDevices.size,
      canCoordinateFailover: critical,
      examples: group.targets.slice(0, 3).map((target) => ({ deviceId: target.deviceId, deviceName: target.deviceName, listName: target.listName })),
    };
  }).sort((a, b) => {
    const rank = { critical: 0, observing: 1, healthy: 2 };
    return rank[a.state] - rank[b.state] || b.affectedDevices - a.affectedDevices;
  });
}
