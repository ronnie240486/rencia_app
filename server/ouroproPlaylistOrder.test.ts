import { describe, expect, it } from "vitest";
import { prioritizeOuroProPlaylists } from "./ouroproPlaylistOrder";

const playlists = [
  { id: 11, nome: "Epic" },
  { id: 12, nome: "Club" },
  { id: 13, nome: "Union" },
  { id: 14, nome: "Anb" },
];

describe("prioritizeOuroProPlaylists", () => {
  it("mantém todas as listas cadastradas quando não há failover", () => {
    expect(prioritizeOuroProPlaylists(playlists, null).map((playlist) => playlist.id)).toEqual([11, 12, 13, 14]);
  });

  it("prioriza a lista de failover sem ocultar as outras listas", () => {
    expect(prioritizeOuroProPlaylists(playlists, 13).map((playlist) => playlist.id)).toEqual([13, 11, 12, 14]);
  });

  it("mantém todas as listas quando a referência de failover não existe", () => {
    expect(prioritizeOuroProPlaylists(playlists, 99).map((playlist) => playlist.id)).toEqual([11, 12, 13, 14]);
  });
});
