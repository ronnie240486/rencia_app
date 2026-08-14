import { describe, expect, it } from "vitest";
import { isDeviceListNotificationTitle } from "./apkListNotifications";

describe("notificações de lista para APK", () => {
  it("aceita somente alertas de lista pertencentes ao aparelho", () => {
    expect(isDeviceListNotificationTitle("Falha confirmada de lista: Lista 1 · Bruno #42", 42)).toBe(true);
    expect(isDeviceListNotificationTitle("Lista recuperada: Lista 1 · Bruno #42", 42)).toBe(true);
    expect(isDeviceListNotificationTitle("Falha confirmada de lista: Lista 1 · Bruno #42", 9)).toBe(false);
  });

  it("ignora alertas que não são eventos técnicos de listas", () => {
    expect(isDeviceListNotificationTitle("Nova tarefa de manutenção", 42)).toBe(false);
  });
});
