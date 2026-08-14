export type PlaybackFailoverCandidate = { id: number | null; name: string };

/** Escolhe a lista seguinte sem repetir a lista que acabou de falhar. */
export function getNextPlaybackFailoverCandidate(candidates: PlaybackFailoverCandidate[], activeDeviceUrlId: number | null) {
  const currentIndex = candidates.findIndex((candidate) => candidate.id === activeDeviceUrlId);
  const safeCurrentIndex = currentIndex >= 0 ? currentIndex : 0;
  return candidates[safeCurrentIndex + 1] ?? null;
}
