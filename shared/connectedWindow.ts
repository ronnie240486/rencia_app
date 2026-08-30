export const CONNECTED_WINDOW_MINUTES = 120;
export const CONNECTED_WINDOW_MS = CONNECTED_WINDOW_MINUTES * 60_000;

export function getConnectedQueryMinutes(selectedMinutes: number) {
  return Math.max(selectedMinutes, CONNECTED_WINDOW_MINUTES);
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
