export type PlaybackFailoverCandidate = { id: number | null; name: string };

/** Escolhe a lista seguinte sem repetir a lista que acabou de falhar. */
export function getNextPlaybackFailoverCandidate(candidates: PlaybackFailoverCandidate[], activeDeviceUrlId: number | null) {
  const currentIndex = candidates.findIndex((candidate) => candidate.id === activeDeviceUrlId);
  const safeCurrentIndex = currentIndex >= 0 ? currentIndex : 0;
  return candidates[safeCurrentIndex + 1] ?? null;
}

/** Payload compatível com polling e resposta direta dos APKs OuroPro. */
export function buildSwitchPlaylistPayload(listIndex: number, playlistUrl: string) {
  const safeIndex = Math.max(1, Math.trunc(listIndex));
  return {
    listIndex: safeIndex,
    list_index: safeIndex,
    playlist_index: safeIndex,
    playlist_number: safeIndex,
    next_playlist_number: safeIndex,
    playlist_url: playlistUrl,
    next_playlist_url: playlistUrl,
  };
}
