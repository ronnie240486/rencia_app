type PlaylistWithId = { id: number };

/** Mantém todas as listas disponíveis, trazendo a reserva ativa para o início. */
export function prioritizeOuroProPlaylists<T extends PlaylistWithId>(
  playlists: readonly T[],
  activePlaylistId: number | null | undefined,
): T[] {
  const active = activePlaylistId
    ? playlists.find((playlist) => playlist.id === activePlaylistId)
    : undefined;
  return active ? [active, ...playlists.filter((playlist) => playlist.id !== active.id)] : [...playlists];
}
