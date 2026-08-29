import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const formSource = readFileSync(resolve(process.cwd(), "client/src/pages/IptvServers.tsx"), "utf8");

describe("formulário móvel de servidores IPTV", () => {
  it("mantém a área de campos rolável e as ações fixas", () => {
    expect(formSource).toContain("max-h-[calc(100dvh-1rem)]");
    expect(formSource).toContain("flex-1 overflow-y-auto overscroll-contain");
    expect(formSource).toContain("shrink-0 border-t bg-background");
  });

  it("não volta a exibir o campo duplicado de lista", () => {
    expect(formSource).not.toContain('htmlFor="server-playlist"');
  });
});
