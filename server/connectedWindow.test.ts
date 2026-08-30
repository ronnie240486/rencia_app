import { describe, expect, it } from "vitest";
import { CONNECTED_WINDOW_MS, CONNECTED_WINDOW_MINUTES, getConnectedQueryMinutes, isOnlineNow, isWithinConnectedWindow } from "./connectedWindow";

describe("janela de dispositivos conectados", () => {
  const now = new Date("2026-08-30T12:00:00.000Z").getTime();

  it("mantém a janela máxima de Assistindo para todos os filtros do painel", () => {
    expect([15, 30, 60, 120].map(getConnectedQueryMinutes)).toEqual([120, 120, 120, 120]);
  });

  it("mostra Online agora somente para atividade recente", () => {
    expect(isOnlineNow(new Date(now - 4 * 60_000), now)).toBe(true);
    expect(isOnlineNow(new Date(now - 5 * 60_000), now)).toBe(true);
    expect(isOnlineNow(new Date(now - 5 * 60_000 - 1), now)).toBe(false);
  });

  it("mantém o conteúdo visível por duas horas", () => {
    expect(CONNECTED_WINDOW_MINUTES).toBe(120);
    expect(isWithinConnectedWindow(new Date(now - 119 * 60_000), now)).toBe(true);
    expect(isWithinConnectedWindow(new Date(now - CONNECTED_WINDOW_MS), now)).toBe(true);
  });

  it("não mantém o conteúdo depois de duas horas", () => {
    expect(isWithinConnectedWindow(new Date(now - CONNECTED_WINDOW_MS - 1), now)).toBe(false);
  });

  it("ignora data ausente ou inválida", () => {
    expect(isWithinConnectedWindow(null, now)).toBe(false);
    expect(isWithinConnectedWindow("data inválida", now)).toBe(false);
  });
});
