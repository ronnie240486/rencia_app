import { describe, expect, it } from "vitest";
import { buildApkFailoverStatus, isDeviceListNotificationTitle } from "./apkListNotifications";

describe("notificações de lista para APK", () => {
  it("aceita somente alertas de lista pertencentes ao aparelho", () => {
    expect(isDeviceListNotificationTitle("Falha confirmada de lista: Lista 1 · Bruno #42", 42)).toBe(true);
    expect(isDeviceListNotificationTitle("Lista recuperada: Lista 1 · Bruno #42", 42)).toBe(true);
    expect(isDeviceListNotificationTitle("Falha confirmada de lista: Lista 1 · Bruno #42", 9)).toBe(false);
  });

  it("ignora alertas que não são eventos técnicos de listas", () => {
    expect(isDeviceListNotificationTitle("Nova tarefa de manutenção", 42)).toBe(false);
  });

  it("informa quando uma lista de reserva foi ativada automaticamente", () => {
    const status = buildApkFailoverStatus(
      { activeDeviceUrlId: 22 },
      [{ id: 22, nome: "Lista 2 · Backup", ordem: 0 }],
      { id: 91, fromDeviceUrlId: null, toDeviceUrlId: 22, createdAt: new Date("2026-08-14T12:00:00.000Z") },
    );

    expect(status).toMatchObject({
      failover_active: true,
      failover_state: "backup_active",
      active_list_name: "Lista 2 · Backup",
      active_list_number: 2,
      reload_required: true,
      failover_transition_id: 91,
    });
    expect(status.reload_message).toContain("Feche e abra o aplicativo");
  });

  it("informa que a Lista 1 foi restaurada após a recuperação", () => {
    const status = buildApkFailoverStatus(
      { activeDeviceUrlId: null },
      [{ id: 22, nome: "Lista 2", ordem: 0 }],
      { id: 92, fromDeviceUrlId: 22, toDeviceUrlId: null, createdAt: new Date("2026-08-14T12:10:00.000Z") },
    );

    expect(status).toMatchObject({
      failover_active: false,
      failover_state: "primary_restored",
      active_list_name: "Lista 1",
      active_list_number: 1,
      reload_required: true,
      failover_transition_id: 92,
    });
    expect(status.reload_message).toContain("Lista 1 foi restaurada automaticamente");
  });
});
