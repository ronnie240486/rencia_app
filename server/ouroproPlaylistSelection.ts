export type OuroProExtraPlaylist = {
  id: number;
  ativo: boolean;
  ordem?: number | null;
};

export type OuroProPlaylistSelection<T extends OuroProExtraPlaylist> =
  | { source: "primary" }
  | { source: "extra"; playlist: T }
  | null;

/**
 * O OuroPro deve carregar somente uma origem de conteúdo por vez. Isso evita
 * misturar Lista 1 com reservas e duplicar séries, EPG e sinopses.
 */
export function selectOuroProPlaylist<T extends OuroProExtraPlaylist>(
  hasPrimary: boolean,
  extraPlaylists: readonly T[],
  activeExtraId: number | null | undefined,
): OuroProPlaylistSelection<T> {
  const activeExtras = extraPlaylists
    .filter((playlist) => playlist.ativo)
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
  const selectedExtra = activeExtraId
    ? activeExtras.find((playlist) => playlist.id === activeExtraId)
    : undefined;

  if (selectedExtra) return { source: "extra", playlist: selectedExtra };
  if (hasPrimary) return { source: "primary" };
  if (activeExtras[0]) return { source: "extra", playlist: activeExtras[0] };
  return null;
}
