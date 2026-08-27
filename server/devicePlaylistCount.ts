export function countDevicePlaylists(primaryUrl: string | null | undefined, extraListCount: number) {
  const primaryCount = primaryUrl?.trim() ? 1 : 0;
  return primaryCount + Math.max(0, Math.trunc(extraListCount) || 0);
}
