import { describe, expect, it } from "vitest";
import { getAllPlaybackFailoverCandidates, getNextPlaybackFailoverCandidate } from "./playbackFailover";

describe("failover imediato de reprodução", () => {
  const candidates = [{ id: null, name: "Lista 1" }, { id: 22, name: "Lista 2" }, { id: 23, name: "Lista 3" }];

  it("troca Lista 1 por Lista 2 quando a reprodução reporta erro", () => {
    expect(getNextPlaybackFailoverCandidate(candidates, null)).toMatchObject({ id: 22 });
  });

  it("troca Lista 2 por Lista 3 quando a reserva ativa falha", () => {
    expect(getNextPlaybackFailoverCandidate(candidates, 22)).toMatchObject({ id: 23 });
  });

  it("não tenta trocar quando não existe outra lista", () => {
    expect(getNextPlaybackFailoverCandidate(candidates, 23)).toBeNull();
  });

  it("lista 1 caída permite escolher a lista 2 ou outra saudável", () => {
    expect(getAllPlaybackFailoverCandidates(candidates, null).map((candidate) => candidate.id)).toEqual([22, 23]);
  });

  it("lista 2 caída também permite voltar para a lista 1", () => {
    expect(getAllPlaybackFailoverCandidates(candidates, 22).map((candidate) => candidate.id)).toEqual([null, 23]);
  });
});
