import { describe, expect, it } from "vitest";
import { countDevicePlaylists } from "./devicePlaylistCount";

describe("contagem de playlists do cliente", () => {
  it("inclui a lista principal e as listas adicionais", () => {
    expect(countDevicePlaylists("https://servidor.exemplo/lista", 3)).toBe(4);
  });

  it("não inventa uma lista principal quando ela não está cadastrada", () => {
    expect(countDevicePlaylists(null, 2)).toBe(2);
  });
});
