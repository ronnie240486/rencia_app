import { describe, expect, it } from "vitest";
import { normalizeVoiceSearchTranscript } from "./voiceSearch";

describe("normalização da busca por voz", () => {
  it("transforma doze caracteres de MAC em formato pesquisável", () => {
    expect(normalizeVoiceSearchTranscript("procurar A A B B C C D D E E F F")).toBe("AA:BB:CC:DD:EE:FF");
  });

  it("preserva uma busca por nome e remove o comando inicial", () => {
    expect(normalizeVoiceSearchTranscript("buscar Cliente Maria Silva")).toBe("Maria Silva");
  });

  it("normaliza números de telefone para a pesquisa", () => {
    expect(normalizeVoiceSearchTranscript("pesquisar 11 99999 8888")).toBe("11999998888");
  });
});
