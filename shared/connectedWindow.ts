export const CONNECTED_WINDOW_MINUTES = 120;
export const CONNECTED_WINDOW_MS = CONNECTED_WINDOW_MINUTES * 60_000;
export const ONLINE_NOW_MINUTES = 5;
export const ONLINE_NOW_MS = ONLINE_NOW_MINUTES * 60_000;

export type ConnectedFilter = number | "online";

export function getConnectedQueryMinutes(selectedFilter: ConnectedFilter) {
  // O filtro escolhido vale de verdade: 15 min mostra só quem apareceu nos últimos 15 min.
  return selectedFilter === "online" ? ONLINE_NOW_MINUTES : selectedFilter;
}

export function isOnlineNow(lastSeen: Date | string | null | undefined, now = Date.now()) {
  return isWithinConnectedWindow(lastSeen, now, ONLINE_NOW_MS);
}

export function isWithinConnectedWindow(
  lastSeen: Date | string | null | undefined,
  now = Date.now(),
  windowMs = CONNECTED_WINDOW_MS,
) {
  if (!lastSeen) return false;
  const timestamp = new Date(lastSeen).getTime();
  if (!Number.isFinite(timestamp)) return false;
  return now - timestamp <= windowMs;
}
