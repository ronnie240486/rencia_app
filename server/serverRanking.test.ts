import { describe, expect, it } from "vitest";
import { buildServerRanking, getServerRankingClients } from "./serverRanking";

const rows = [
  { id: 1, nomeServidor: "Club", nomeServer: "Ronie", mac: "AA", app: "Future", status: "Liberado", dataExpiracao: null },
  { id: 2, nomeServidor: " club ", nomeServer: "Ana", mac: "BB", app: "OuroPro", status: "Liberado", dataExpiracao: null },
  { id: 3, nomeServidor: "Epic", nomeServer: "Bruno", mac: "CC", app: "Evolux", status: "Bloqueado", dataExpiracao: null },
  { id: 4, nomeServidor: null, nomeServer: "Sem perfil", mac: "DD", app: null, status: "Liberado", dataExpiracao: null },
];

describe("ranking de servidores", () => {
  it("agrupa perfis equivalentes e ignora clientes sem perfil de servidor", () => {
    expect(buildServerRanking(rows)).toEqual([
      { name: "Club", clientCount: 2 },
      { name: "Epic", clientCount: 1 },
    ]);
  });

  it("retorna somente os clientes do servidor escolhido", () => {
    expect(getServerRankingClients(rows, "CLUB").map((row) => row.nomeServer)).toEqual(["Ana", "Ronie"]);
  });
});
