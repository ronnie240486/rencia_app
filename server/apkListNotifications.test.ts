import { describe, expect, it } from "vitest";
import { buildApkExpirationNotice, buildApkExpirationResponseFields, buildApkFailoverStatus, getClientFacingListMessage, isDeviceListNotificationTitle } from "./apkListNotifications";

describe("notificações de lista para APK", () => {
  it("aceita somente alertas de lista pertencentes ao aparelho", () => {
    expect(isDeviceListNotificationTitle("Falha confirmada de lista: Lista 1 · Bruno #42", 42)).toBe(true);
    expect(isDeviceListNotificationTitle("Lista recuperada: Lista 1 · Bruno #42", 42)).toBe(true);
    expect(isDeviceListNotificationTitle("Falha confirmada de lista: Lista 1 · Bruno #42", 9)).toBe(false);
  });

  it("ignora alertas que não são eventos técnicos de listas", () => {
    expect(isDeviceListNotificationTitle("Nova tarefa de manutenção", 42)).toBe(false);
  });

  it("nunca expõe instruções internas do painel ao cliente", () => {
    expect(getClientFacingListMessage("failure")).toContain("Você não precisa fazer nada");
    expect(getClientFacingListMessage("failure")).not.toContain("Monitor de Listas");
    expect(getClientFacingListMessage("recovered")).toBe("Sua lista voltou a funcionar normalmente.");
  });

  it("prepara o modal de vencimento até sete dias antes da renovação", () => {
    const tomorrow = buildApkExpirationNotice(
      { dataExpiracao: "2026-08-15", status: "Liberado" },
      new Date(2026, 7, 14, 10),
    );
    expect(tomorrow).toMatchObject({
      expiration_display: "15/08/2026",
      days_remaining: 1,
      expiration_state: "expires_tomorrow",
      show_modal: true,
      modal_title: "Seu acesso vence amanhã",
    });
    expect(tomorrow.modal_message).toContain("Renove para evitar interrupção");

    const upcoming = buildApkExpirationNotice(
      { dataExpiracao: "2026-08-20", status: "Liberado" },
      new Date(2026, 7, 14, 10),
    );
    expect(upcoming).toMatchObject({
      expiration_state: "upcoming",
      days_remaining: 6,
      show_modal: true,
      modal_title: "Seu acesso vence em 6 dias",
    });
    expect(upcoming.modal_message).toContain("20/08/2026");
  });

  it("mostra aviso de acesso vencido para a data já expirada", () => {
    const expired = buildApkExpirationNotice(
      { dataExpiracao: "2026-08-10", status: "Expirado" },
      new Date(2026, 7, 14, 10),
    );
    expect(expired).toMatchObject({ expiration_state: "expired", show_modal: true, modal_title: "Seu acesso venceu" });
    expect(expired.modal_message).toContain("10/08/2026");
  });

  it("expõe campos planos compatíveis para a resposta principal do Max Play", () => {
    const expiration = buildApkExpirationNotice(
      { dataExpiracao: "2026-08-15", status: "Liberado" },
      new Date(2026, 7, 15, 10),
    );
    const fields = buildApkExpirationResponseFields(expiration);
    expect(fields).toMatchObject({
      expiration_state: "expires_today",
      expiration_show_modal: true,
      expiration_modal_title: "Seu acesso vence hoje",
    });
    expect(fields.expiration_modal_message).toContain("Renove para evitar interrupção");
    expect(fields.show_expiration_modal).toBe(true);
  });

  it("informa quando uma lista de reserva foi ativada automaticamente", () => {
    const status = buildApkFailoverStatus(
      { activeDeviceUrlId: 22, urlM3u8: "https://principal.example/lista.m3u" },
      [{ id: 22, nome: "Lista 2 · Backup", ordem: 0, urlM3u8: "https://reserva.example/lista.m3u" }],
      { id: 91, fromDeviceUrlId: null, toDeviceUrlId: 22, createdAt: new Date("2026-08-14T12:00:00.000Z") },
    );

    expect(status).toMatchObject({
      failover_active: true,
      failover_state: "backup_active",
      active_list_name: "Lista 2 · Backup",
      active_list_number: 2,
      playlist_sync_required: true,
      playlist_sync_mode: "background",
      action: "switch_playlist",
      command: "switch_playlist",
      change_playlist: true,
      list_index: 2,
      next_playlist_url: "https://reserva.example/lista.m3u",
      reload_required: false,
      failover_transition_id: 91,
    });
    expect(status.playlist_sync_message).toContain("foi mudado automaticamente para Lista 2 · Backup");
  });

  it("informa que a Lista 1 foi restaurada após a recuperação", () => {
    const status = buildApkFailoverStatus(
      { activeDeviceUrlId: null, urlM3u8: "https://principal.example/lista.m3u" },
      [{ id: 22, nome: "Lista 2", ordem: 0 }],
      { id: 92, fromDeviceUrlId: 22, toDeviceUrlId: null, createdAt: new Date("2026-08-14T12:10:00.000Z") },
    );

    expect(status).toMatchObject({
      failover_active: false,
      failover_state: "primary_restored",
      active_list_number: 1,
      action: "switch_playlist",
      command: "switch_playlist",
      change_playlist: true,
      restore_primary: true,
      list_index: 1,
      next_playlist_url: "https://principal.example/lista.m3u",
      active_list_name: "Lista 1",
      playlist_sync_required: true,
      playlist_sync_mode: "background",
      reload_required: false,
      failover_transition_id: 92,
    });
    expect(status.playlist_sync_message).toContain("Lista 1 voltou ao normal");
  });

  it("não envia texto null ao aplicativo quando não há aviso nem troca de lista", () => {
    const expiration = buildApkExpirationNotice(
      { dataExpiracao: null, status: "Liberado" },
      new Date(2026, 7, 14, 10),
    );
    const failover = buildApkFailoverStatus({ activeDeviceUrlId: null }, [], null);

    expect(expiration).toMatchObject({
      show_modal: false,
      modal_key: "",
      modal_title: "",
      modal_message: "",
    });
    expect(failover).toMatchObject({
      playlist_sync_required: false,
      playlist_sync_mode: "",
      playlist_sync_message: "",
      reload_message: "",
      changed_at: "",
    });
  });
});
