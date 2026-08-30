export const CONNECTED_WINDOW_MINUTES = 120;
export const CONNECTED_WINDOW_MS = CONNECTED_WINDOW_MINUTES * 60_000;
export const ONLINE_NOW_MINUTES = 5;
export const ONLINE_NOW_MS = ONLINE_NOW_MINUTES * 60_000;

export type ConnectedFilter = number | "online";

export function getConnectedQueryMinutes(selectedFilter: ConnectedFilter) {
  return selectedFilter === "online"
    ? ONLINE_NOW_MINUTES
    : Math.max(selectedFilter, CONNECTED_WINDOW_MINUTES);
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
