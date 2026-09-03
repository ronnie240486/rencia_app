import { describe, expect, it } from "vitest";
import { buildPlaylistAccessFields } from "./playlistAccess";

describe("contrato de acesso à playlist M3U", () => {
  it("preserva protocolo, porta e extrai credenciais sem reencodar a URL", () => {
    expect(buildPlaylistAccessFields("http://brcam.pro:8080/get.php?username=cliente%40teste&password=abc%2B123&type=m3u_plus&output=ts")).toEqual({
      serverUrl: "http://brcam.pro:8080",
      username: "cliente@teste",
      password: "abc+123",
    });
  });

  it("não converte HTTP para HTTPS durante a separação dos campos", () => {
    expect(buildPlaylistAccessFields("http://ronie35.ufcfan.org/get.php?username=u&password=p&type=m3u_plus&output=ts").serverUrl).toBe("http://ronie35.ufcfan.org");
  });
});
