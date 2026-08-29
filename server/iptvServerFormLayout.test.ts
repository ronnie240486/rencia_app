import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const formSource = readFileSync(resolve(process.cwd(), "client/src/pages/IptvServers.tsx"), "utf8");

describe("formulário móvel de servidores IPTV", () => {
  it("usa uma página nativa com cabeçalho e ações fixas", () => {
    expect(formSource).toContain('className="mx-auto min-h-full max-w-lg bg-background"');
    expect(formSource).toContain("sticky top-0 z-20");
    expect(formSource).toContain("sticky bottom-0 border-t bg-background");
    expect(formSource).not.toContain("<DialogContent");
  });

  it("não volta a exibir o campo duplicado de lista", () => {
    expect(formSource).not.toContain('htmlFor="server-playlist"');
  });
});
