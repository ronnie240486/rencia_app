import { describe, expect, it } from "vitest";
import { selectOuroProPlaylist } from "./ouroproPlaylistSelection";

const backups = [
  { id: 11, ativo: true, ordem: 0 },
  { id: 12, ativo: true, ordem: 1 },
];

describe("selectOuroProPlaylist", () => {
  it("mantém somente a lista principal quando não há failover ativo", () => {
    expect(selectOuroProPlaylist(true, backups, null)).toEqual({ source: "primary" });
  });

  it("entrega somente a lista de reserva escolhida pelo failover", () => {
    expect(selectOuroProPlaylist(true, backups, 12)).toEqual({ source: "extra", playlist: backups[1] });
  });

  it("volta para a lista principal quando a referência de reserva não é válida", () => {
    expect(selectOuroProPlaylist(true, backups, 999)).toEqual({ source: "primary" });
  });

  it("usa a primeira reserva ativa quando não existe lista principal", () => {
    expect(selectOuroProPlaylist(false, backups, null)).toEqual({ source: "extra", playlist: backups[0] });
  });
});
