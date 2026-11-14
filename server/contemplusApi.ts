import type { Express, Request, Response } from "express";
import { asc, eq } from "drizzle-orm";
import { getDb } from "./db";
import { devices, deviceMacs, deviceUrls } from "../drizzle/schema";
import { findDeviceMatchByAnyMac } from "./deviceMacLookup";
import { normalizeMacAddress } from "./ultraPlayerConfig";
import { resolveHeartbeatContentUpdate } from "./heartbeatContent";

/**
 * Compatibilidade do APK Contemplus (base NUVIX YouCine) com o painel.
 * O app conversa com "<painel>/apps/contemplus/api.php?action=..." e espera
 * usuário/senha Xtream + lista de DNS. Aqui tudo é derivado do cadastro do
 * MAC no próprio painel (mesma fonte do /api/v5/apps/:appId/config).
 */
export type XtreamAccess = { server: string; username: string; password: string };

/** Extrai servidor/usuário/senha de uma URL Xtream/M3U (get.php, player_api.php, /live/u/p/). */
export function parseXtreamAccess(rawUrl: string | null | undefined): XtreamAccess | null {
  const raw = (rawUrl || "").trim();
  if (!raw) return null;
  let url: URL;
  try { url = new URL(/^https?:\/\//i.test(raw) ? raw : `http://${raw}`); } catch { return null; }
  const server = `${url.protocol}//${url.host}`;
  let username = url.searchParams.get("username") || "";
  let password = url.searchParams.get("password") || "";
  if (!username || !password) {
    const parts = url.pathname.split("/").filter(Boolean);
    const idx = parts.findIndex((p) => ["live", "movie", "series", "playlist", "get"].includes(p.toLowerCase()));
    if (idx >= 0 && parts.length >= idx + 3) { username = parts[idx + 1]; password = parts[idx + 2]; }
  }
  if (!username || !password) return null;
  return { server, username: decodeURIComponent(username), password: decodeURIComponent(password) };
}

function expiryText(date: unknown): string {
  if (!date) return "";
  const text = String(date);
  return text.length >= 10 ? text.slice(0, 10) : text;
}

function isExpired(device: { status: string; dataExpiracao?: unknown }): boolean {
  if (device.status !== "Liberado") return true;
  if (!device.dataExpiracao) return false;
  const end = new Date(`${expiryText(device.dataExpiracao)}T23:59:59`);
  return !Number.isNaN(end.getTime()) && end.getTime() < Date.now();
}

const ALL_TABS = { canais: 1, filmes: 1, series: 1, kids: 1, anime: 1, novelas: 1, novidades: 1, futebol: 1 };

export function registerContemplusApi(app: Express, getSettings: () => Promise<Record<string, string>>) {
  const handler = async (req: Request, res: Response) => {
    res.setHeader("Cache-Control", "no-store");
    const input: Record<string, unknown> = { ...(req.query as Record<string, unknown>), ...((req.body as Record<string, unknown>) || {}) };
    const action = String(input.action || "").trim().toLowerCase();
    const mac = normalizeMacAddress(String(input.mac || ""));
    const ts = Math.floor(Date.now() / 1000);
    try {
      if (action === "get_tabs_visibility") { res.json({ success: true, tabs_visibility: ALL_TABS, ts }); return; }
      if (!mac) { res.json({ success: false, active: false, ready: false, waiting: true, reason: "invalid_mac", message: "MAC inválido." }); return; }
      const db = await getDb();
      if (!db) { res.status(503).json({ success: false, message: "Banco de dados indisponível." }); return; }
      const settings = await getSettings();
      const text = (key: string, fallback = "") => settings[`contemplus_${key}`] || fallback;

      const match = await findDeviceMatchByAnyMac(db, mac);
      const device = match?.device ?? null;
      const linkedApp = match?.appId?.toLowerCase() ?? null;
      const registered = Boolean(device) && (!linkedApp || linkedApp === "contemplus");

      let access: XtreamAccess | null = null;
      let servers: string[] = [];
      if (registered && device) {
        const extras = await db.select({ url: deviceUrls.urlM3u8, server: deviceUrls.xtServer, user: deviceUrls.xtUsername, pass: deviceUrls.xtPassword })
          .from(deviceUrls).where(eq(deviceUrls.deviceId, device.id)).orderBy(asc(deviceUrls.ordem));
        access = parseXtreamAccess(device.urlM3u8);
        if (!access) {
          for (const extra of extras) {
            access = parseXtreamAccess(extra.url) || (extra.server && extra.user && extra.pass ? parseXtreamAccess(extra.server) && { server: parseXtreamAccess(extra.server)!.server, username: extra.user, password: extra.pass } : null);
            if (access) break;
          }
        }
        if (access) {
          servers = [access.server];
          for (const extra of extras) {
            const other = parseXtreamAccess(extra.url);
            if (other && other.username === access.username && !servers.includes(other.server)) servers.push(other.server);
          }
        }
      }
      const expired = device ? isExpired(device) : true;
      const ready = Boolean(registered && device && access && !expired);
      const baseInfo = {
        username: access?.username || "",
        password: access?.password || "",
        expiry_date: device ? expiryText(device.dataExpiracao) : "",
        account_type: "Premium",
        profile_limit: 1,
      };
      const notReady = !registered
        ? { reason: "mac_not_registered", message: "Este MAC ainda não está cadastrado." }
        : expired
          ? { reason: "expired", message: "Acesso bloqueado ou expirado. Fale com o suporte." }
          : { reason: "no_list", message: "Nenhuma lista configurada para este MAC." };

      if (registered && device && action !== "get_config") {
        // Marca atividade (online) — presence_ping também grava o conteúdo.
        const patch: Record<string, unknown> = { lastSeen: new Date(), lastActiveAppId: "contemplus" };
        if (action === "presence_ping") {
          const title = String(input.content_title || "").trim();
          const decision = resolveHeartbeatContentUpdate(title || "__idle__");
          if (decision.action === "set") patch.currentContent = decision.content;
          else if (decision.action === "clear") patch.currentContent = null;
        }
        if (!match?.primary && match?.aliasMacId) {
          await db.update(deviceMacs).set(patch).where(eq(deviceMacs.id, match.aliasMacId));
        } else {
          await db.update(devices).set(patch).where(eq(devices.id, device.id));
        }
      }

      switch (action) {
        case "presence_ping":
          res.json({ success: registered });
          return;
        case "check_mac":
          res.json({ active: ready, dns: servers[0] || "", ...baseInfo, ...(ready ? { message: "ok" } : { message: notReady.message }), success: ready });
          return;
        case "client_auto_login":
          res.json(ready
            ? { success: true, ready: true, waiting: false, ...baseInfo, message: "Conta liberada!" }
            : { success: false, ready: false, waiting: true, username: "", password: "", ...notReady });
          return;
        case "client_login": {
          const user = String(input.username || "").trim();
          const pass = String(input.password || "").trim();
          const okLogin = ready && user === baseInfo.username && pass === baseInfo.password;
          res.json(okLogin
            ? { success: true, active: true, ...baseInfo, message: "ok" }
            : { success: false, active: false, reason: ready ? "invalid_credentials" : notReady.reason, message: ready ? "Usuário ou senha inválidos." : notReady.message });
          return;
        }
        case "get_config":
          if (registered && device) {
            await db.update(devices).set({ lastSeen: new Date(), lastActiveAppId: "contemplus" }).where(eq(devices.id, device.id));
          }
          res.json({
            status: "success",
            ts,
            login_type: "MAC",
            access_code: mac,
            dns: servers,
            app_name: text("app_name", "Contemplus"),
            app_logo: text("logo_url"),
            app_background: text("background_url"),
            login_background: text("background_url"),
            splash_background: text("background_url"),
            message_global: text("message_text"),
            support_message: text("support_message"),
            support_whatsapp: text("support_whatsapp"),
            tabs_visibility: ALL_TABS,
            login_trial: { enabled: 0, days: 0, profiles: 1 },
          });
          return;
        case "get_tabs_visibility":
          res.json({ success: true, tabs_visibility: ALL_TABS, ts });
          return;
        case "get_purchase_key":
          res.json({ success: false, status: "unavailable", message: "Indisponível." });
          return;
        case "request_trial":
          res.json({ success: false, message: "Teste não disponível neste aplicativo." });
          return;
        case "get_content_requests":
          res.json({ success: true, requests: [], items: [] });
          return;
        case "create_content_request":
          res.json({ success: false, message: "Pedidos de conteúdo não estão disponíveis." });
          return;
        default:
          res.json({ success: false, message: "Ação não suportada." });
      }
    } catch (error) {
      console.error("[API] contemplus api.php", error);
      res.status(500).json({ success: false, message: "Erro interno." });
    }
  };
  app.all("/apps/contemplus/api.php", handler);
  app.all("/apps/contemplus/api", handler);
}
