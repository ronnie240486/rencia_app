export function getConnectionState(lastSeen: Date | null, now = new Date()) {
  if (!lastSeen) return "offline" as const;
  return now.getTime() - lastSeen.getTime() <= 30 * 60 * 1000 ? "online" as const : "offline" as const;
}
