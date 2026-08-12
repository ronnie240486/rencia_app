import { describe, expect, it } from "vitest";
import { normalizeMessageTemplate } from "./messageTemplate";

describe("modelos de mensagem", () => {
  it("preserva placeholders e normaliza o conteúdo salvo", () => {
    expect(normalizeMessageTemplate({ name: "  Renovação  ", category: "renewal", content: "Olá {nome}!\r\nVence em {dias} dia(s): {data}.  " }))
      .toEqual({ name: "Renovação", category: "renewal", content: "Olá {nome}!\nVence em {dias} dia(s): {data}." });
  });

  it("rejeita modelos sem nome ou conteúdo", () => {
    expect(() => normalizeMessageTemplate({ name: "", category: "custom", content: "Teste" })).toThrow("obrigatórios");
    expect(() => normalizeMessageTemplate({ name: "Teste", category: "custom", content: "  " })).toThrow("obrigatórios");
  });
});
