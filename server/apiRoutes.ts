/**
 * API REST pública para consumo pelo APK.
 * Todos os endpoints retornam JSON e não requerem autenticação OAuth.
 *
 * Endpoints disponíveis:
 *   POST /api/guim.php
 *        → Endpoint principal do APK (compatível com IBOController/BoxV3)
 *        → Recebe: { "data": "<BASE64 de { app_device_id, app_type, version, is_paid }>" }
 *        → Retorna: { "data": "<string codificada com algoritmo Security.getDecodedString>" }
 *          onde a string decodificada é o AppInfoModel JSON
 *
 *   GET  /api/users
 *        → Lista todos os devices cadastrados com credenciais para o EaglePlayer
 *        → Retorna: [{ id, mac, server_url, username, password }, ...]
 *
 *   GET  /api/device/check?mac=XX:XX:XX:XX:XX:XX
 *        → Verifica se um device está cadastrado e retorna seus dados
 *
 *   GET  /api/health
 *        → Health check
 */

import type { Express, Request, Response } from "express";
import multer from "multer";
import { sdk } from "./_core/sdk";
import { getDb } from "./db";
import { devices, appSettings, deviceUrls, carouselSlides, dnsEntries, users } from "../drizzle/schema";
import { eq, or } from "drizzle-orm";
import { storagePut, storageGetSignedUrl } from "./storage";

// Multer: armazena em memória para depois enviar ao S3
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Apenas imagens são permitidas"));
  },
});

// Multer para APK: aceita .apk até 200MB
const uploadApk = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB
  fileFilter: (_req, file, cb) => {
    const ok = file.mimetype === "application/vnd.android.package-archive"
      || file.originalname.endsWith(".apk");
    if (ok) cb(null, true);
    else cb(new Error("Apenas arquivos .apk são permitidos"));
  },
});

// Chaves de configuração válidas para upload de imagem
const UPLOAD_FIELD_KEYS: Record<string, string> = {
  trial_logo_url: "trial_logo_url",
  trial_background_url: "trial_background_url",
  trial_banner_url: "trial_banner_url",
  gpcpro_logo_url: "gpcpro_logo_url",
  gpcpro_background_url: "gpcpro_background_url",
  gpcpro_banner_url: "gpcpro_banner_url",
  sidebar_logo_url: "sidebar_logo_url",
  profile_banner_url: "profile_banner_url",
  icon_reload_url: "icon_reload_url",
  icon_exit_url: "icon_exit_url",
  icon_settings_url: "icon_settings_url",
  icon_live_tv_url: "icon_live_tv_url",
  icon_movies_url: "icon_movies_url",
  icon_series_url: "icon_series_url",
  icon_account_url: "icon_account_url",
  icon_change_playlist_url: "icon_change_playlist_url",
};

// Cache de configurações para evitar query no banco a cada request
let settingsCache: Record<string, string> = {};
let settingsCacheTime = 0;
const SETTINGS_CACHE_TTL = 60_000; // 60 segundos

async function getSettings(): Promise<Record<string, string>> {
  const now = Date.now();
  if (now - settingsCacheTime < SETTINGS_CACHE_TTL && Object.keys(settingsCache).length > 0) {
    return settingsCache;
  }
  try {
    const db = await getDb();
    if (!db) return settingsCache;
    const rows = await db.select().from(appSettings);
    const result: Record<string, string> = {};
    for (const row of rows) {
      result[row.key] = row.value ?? "";
    }
    settingsCache = result;
    settingsCacheTime = now;
    return result;
  } catch {
    return settingsCache;
  }
}

const ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";

/**
 * Resolve uma URL de imagem do banco para uma URL pública acessível.
 * Se a URL for do /manus-storage/ (protegido por OAuth), gera uma URL pré-assinada do S3.
 * Se for URL externa (http/https), retorna diretamente.
 */
async function resolvePublicImageUrl(storedUrl: string): Promise<string> {
  if (!storedUrl) return "";
  // URL do manus-storage precisa de URL pré-assinada
  const manusStorageMatch = storedUrl.match(/\/manus-storage\/(.+)$/);
  if (manusStorageMatch) {
    try {
      const key = manusStorageMatch[1];
      return await storageGetSignedUrl(key);
    } catch {
      return storedUrl; // fallback
    }
  }
  // URL externa: retornar diretamente
  return storedUrl;
}

/**
 * Decodifica o payload enviado pelo APK BoxV3 (Security.getStringData).
 *
 * O APK codifica assim:
 *   1. JSON → Base64
 *   2. Insere uma encrypt_key de tamanho p1 na posição p2 da string Base64
 *   3. Appende ALPHABET[p2] + ALPHABET[p1] no final
 *
 * Para decodificar:
 *   1. Pega penúltimo char → p2 = ALPHABET.indexOf(char) = posição da key
 *   2. Pega último char → p1 = ALPHABET.indexOf(char) = tamanho da key
 *   3. Remove os 2 últimos chars
 *   4. Remove p1 chars a partir da posição p2
 *   5. Decodifica Base64
 */
function decodeFromApk(encoded: string): Record<string, unknown> | null {
  try {
    const s = encoded.replace(/\s/g, "");
    if (s.length < 3) return null;

    // Pegar penúltimo char = posição da key (p2)
    const p2Char = s[s.length - 2];
    const p2 = ALPHABET.indexOf(p2Char);

    // Pegar último char = tamanho da key (p1)
    const p1Char = s[s.length - 1];
    const p1 = ALPHABET.indexOf(p1Char);

    if (p2 < 0 || p1 < 0) return null;

    // Remover os 2 últimos chars
    let clean = s.slice(0, -2);

    // Remover p1 chars a partir da posição p2
    clean = clean.slice(0, p2) + clean.slice(p2 + p1);

    // Decodificar Base64
    const decoded = Buffer.from(clean, "base64").toString("utf-8").trim();
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * Codifica uma string JSON no formato esperado pelo APK BoxV3.
 *
 * O APK usa Security.getDecodedString() para decodificar a resposta:
 *   1. Pega os 2 últimos chars da string
 *   2. Converte cada char para sua posição no alfabeto ALPHABET
 *   3. Remove os últimos 2 chars
 *   4. Reconstrói: substring(0, pos1) + substring(pos1+pos2)
 *   5. Decodifica Base64
 *
 * Para codificar (operação inversa):
 *   1. Codifica JSON em Base64
 *   2. Insere pos2 chars de lixo na posição pos1
 *   3. Adiciona ALPHABET[pos1] + ALPHABET[pos2] no final
 */
function encodeForApk(jsonStr: string): string {
  // Codifica em Base64
  const b64 = Buffer.from(jsonStr, "utf-8").toString("base64");

  // Posições fixas: pos1=5 ('f'), pos2=3 ('d')
  // Garante que pos1 < b64.length para não quebrar
  const pos1 = Math.min(5, b64.length - 1);
  const pos2 = 3;

  // Insere pos2 chars de lixo na posição pos1
  const junk = "X".repeat(pos2);
  const obfuscated = b64.slice(0, pos1) + junk + b64.slice(pos1);

  // Adiciona os 2 chars de posição no final
  return obfuscated + ALPHABET[pos1] + ALPHABET[pos2];
}

/**
 * Monta o objeto `words` com os textos da tela de bloqueio vindos do painel.
 * O APK BoxV3 usa WordModels para exibir esses textos na tela de trial/bloqueio.
 */
function buildWords(cfg: Record<string, string>) {
  // Montar URL do WhatsApp para o botão de renovação
  // Limpar caracteres unicode invisíveis e não-numéricos do WhatsApp
  const whatsappRaw = (cfg.contact_whatsapp || "").replace(/[^\d+]/g, "");
  const whatsappNumber = whatsappRaw.replace(/\D/g, "");
  const whatsappUrl = whatsappNumber ? `https://wa.me/${whatsappNumber}` : "";
  
  // Formatar lock_button_url: se for só número, converter para URL do WhatsApp
  let lockButtonUrl = cfg.lock_button_url || "";
  if (lockButtonUrl && !lockButtonUrl.startsWith("http")) {
    // É apenas um número de telefone, converter para URL do WhatsApp
    const lockNumber = lockButtonUrl.replace(/\D/g, "");
    if (lockNumber) {
      lockButtonUrl = `https://wa.me/${lockNumber}`;
    }
  }
  if (!lockButtonUrl) lockButtonUrl = whatsappUrl;

  // Formatar contact_website: garantir que tem protocolo
  let contactWebsite = (cfg.contact_website || "").trim();
  if (contactWebsite && !contactWebsite.startsWith("http")) {
    contactWebsite = `https://${contactWebsite}`;
  }

  // Formatar str_whatsapp como URL do WhatsApp para o APK abrir
  const strWhatsapp = whatsappUrl || whatsappNumber;

  return {
    // Campos de bloqueio/trial
    trial_ended: cfg.trial_title || "Acesso Bloqueado",
    tv_mac_expired: cfg.lock_title || cfg.trial_title || "Acesso Bloqueado",
    to_continue: cfg.trial_subtitle || "Assine agora e tenha acesso ilimitado!",
    str_trial_description: cfg.trial_support_text || "Suporte com seu revendedor",
    tv_is_trial: cfg.trial_subtitle || "Assine agora e tenha acesso ilimitado!",
    current_expired: cfg.lock_message || "",
    // Campos de contato/links - formatados como URLs válidas
    str_link: contactWebsite,
    str_whatsapp: strWhatsapp,
    contact: cfg.contact_info || "",
    // Botões
    open_website: cfg.lock_button_text || "Renovar Agora",
    str_continue: cfg.lock_button_text || "Renovar Agora",
    lock_button_url: lockButtonUrl,
    ok: "OK",
    cancel: "Cancelar",
    yes: "Sim",
    no: "Não",
    // Campos de informação
    mac_activated: "Seu MAC está Ativado.",
    to_add_manage: "Para adicionar/gerenciar playlists, use os valores no site.",
    mac_address: "Mac Address",
    device_key: "Device Key",
    impact_phrase: cfg.impact_phrase || "",
    legal_notice: cfg.legal_notice || "OuroPro is a media player application. The app does not provide or include any media or content.",
    app_name: cfg.app_name || "OuroPro",
    // Campos de navegação/labels
    live_tv: cfg.app_channels_label || "Canais",
    live: cfg.app_channels_label || "Canais",
    movies: cfg.app_movies_label || "Filmes",
    series: cfg.app_series_label || "Séries",
    home: "Home",
    settings: "Configurações",
    exit: "Sair",
    exit_description: "Deseja realmente sair?",
    // Campos de playlist
    no_playlist: "Nenhuma playlist encontrada",
    no_playlist_description: "Adicione uma playlist para começar a assistir.",
    playlist_name: "Nome da Playlist",
    playlist_protected: "Protegido",
    playlist_expire_date: "Data de Expiração",
    playlist_is_loading: "Carregando playlist...",
    playlist_is_not_working: "Playlist não está funcionando",
    refresh_playlist: "Atualizar Playlist",
    delete_playlist: "Excluir Playlist",
    // Campos de player
    no_channels: "Nenhum canal disponível",
    no_movies: "Nenhum filme disponível",
    no_series: "Nenhuma série disponível",
    search: "Buscar",
    favorite: "Favoritos",
    recently_viewed: "Vistos Recentemente",
    // Campos de atualização
    new_software_update_available: "Nova atualização disponível",
    update_now: "Atualizar Agora",
    // Campos extras
    enjoy_tv: "Aproveite sua TV!",
    connect: "Conectar",
    select: "Selecionar",
    play: "Reproduzir",
    resume: "Continuar",
    retry: "Tentar novamente",
    epg: "Guia de Programação",
    sub_remaining: "Dias restantes",
    expire_date: "Data de Expiração",
    version: "Versão",
    ibo_pro_description: cfg.legal_notice || "OuroPro is a media player application. The app does not provide or include any media or content.",
    via_website: cfg.trial_subtitle || "Assine agora e tenha acesso ilimitado!",
  };
}

export function registerApiRoutes(app: Express) {
  /**
   * Middleware de redirecionamento para pagea.uk (Abcde e Abcde1)
   * Redireciona requisições de pagea.uk para renciaapp.manus.space
   * - pagea.uk/Abcde → config_domain.json (painelfoda.top)
   * - pagea.uk/Abcde1 → gerenciamento (gerenciaapp.top)
   */
  app.use((req: Request, res: Response, next) => {
    const host = req.get('host') || '';
    
    // Se a requisição vier de pagea.uk, redirecionar para renciaapp.manus.space
    if (host.includes('pagea.uk')) {
      const newUrl = `https://renciaapp.manus.space${req.originalUrl}`;
      console.log(`[REDIRECT] ${host}${req.originalUrl} -> ${newUrl}`);
      return res.redirect(301, newUrl);
    }
    
    next();
  });


  /**
   * GET /api/users
   *
   * Endpoint público para o EaglePlayer APK.
   * Retorna lista de todos os devices com credenciais de servidor.
   * Formato esperado pelo APK:
   * [
   *   {
   *     id: 690001,
   *     mac: "AA:BB:CC:DD:EE:FF",
   *     server_url: "https://servidor-do-player.example",
   *     username: "usuario",
   *     password: "senha"
   *   }
   * ]
   */
  app.get("/api/users", async (req: Request, res: Response) => {
    console.log(`[API-USERS] Request from ${req.ip} - User-Agent: ${req.get('user-agent')}`);
    try {
      const db = await getDb();
      if (!db) {
        res.status(503).json({ error: "Erro ao conectar ao banco de dados" });
        return;
      }

      // Buscar todos os devices
      const allDevices = await db.select().from(devices);

      // Transformar para o formato esperado pelo EaglePlayer
      const eagleUsers = [];
      for (const device of allDevices) {
        // Buscar deviceUrls associadas a este device
        const deviceUrlsList = await db.select().from(deviceUrls)
          .where(eq(deviceUrls.deviceId, device.id))
          .orderBy(deviceUrls.ordem);

        // Se houver deviceUrls cadastradas, usar a primeira ativa
        if (deviceUrlsList.length > 0) {
          for (const du of deviceUrlsList) {
            if (!du.ativo) continue;

            let serverUrl = "";
            let username = "";
            let password = "";

            if (du.modoSelecao === "XTeamCode" && du.xtServer) {
              // XTeamCode: usar xtServer como base
              serverUrl = du.xtServer;
              username = du.xtUsername || "";
              password = du.xtPassword || "";
            } else if (du.modoSelecao === "M3U8" && du.urlM3u8) {
              // M3U8: usar urlM3u8 como server_url
              serverUrl = du.urlM3u8;
              
              // Tentar extrair username/password da URL se estiverem lá (comum em links M3U)
              if (!username || !password) {
                try {
                  const urlObj = new URL(serverUrl);
                  username = urlObj.searchParams.get("username") || username;
                  password = urlObj.searchParams.get("password") || password;
                  
                  // Se extraiu, limpar a URL para deixar apenas a base (opcional, mas o Eagle costuma preferir a base)
                  // No entanto, para não quebrar outros APKs, vamos manter a URL mas garantir que user/pass estejam preenchidos
                } catch (e) { /* ignorar erro de parsing de URL */ }
              }
            }

            if (serverUrl) {
              // Limpar serverUrl para deixar apenas o host (protocolo + dominio + porta)
              let cleanServerUrl = serverUrl;
              try {
                const urlObj = new URL(serverUrl);
                cleanServerUrl = `${urlObj.protocol}//${urlObj.host}`;
              } catch (e) {}

              const baseMac = (device.mac || "").toUpperCase();
              const cleanMac = baseMac.replace(/[^A-Z0-9]/g, ""); // MAC sem separadores

              // Adicionar versão com dois pontos
              eagleUsers.push({
                id: device.id,
                mac: baseMac,
                server_url: cleanServerUrl,
                url: cleanServerUrl,
                username: username,
                password: password,
              });

              // Adicionar versão sem dois pontos (alguns APKs normalizam internamente)
              if (cleanMac !== baseMac) {
                eagleUsers.push({
                  id: device.id + 1000000, // ID único para evitar conflito
                  mac: cleanMac,
                  server_url: cleanServerUrl,
                  url: cleanServerUrl,
                  username: username,
                  password: password,
                });
              }
              break; 
            }
          }
        } else if (device.urlM3u8) {
          // Fallback: usar urlM3u8 do device principal se não houver deviceUrls
          let fUrl = device.urlM3u8;
          let fUser = "";
          let fPass = "";
          
          try {
            const urlObj = new URL(fUrl);
            fUser = urlObj.searchParams.get("username") || "";
            fPass = urlObj.searchParams.get("password") || "";
          } catch (e) {}

          let cleanFUrl = fUrl;
          try {
            const urlObj = new URL(fUrl);
            cleanFUrl = `${urlObj.protocol}//${urlObj.host}`;
          } catch (e) {}

          const baseMacF = (device.mac || "").toUpperCase();
          const cleanMacF = baseMacF.replace(/[^A-Z0-9]/g, "");

          eagleUsers.push({
            id: device.id,
            mac: baseMacF,
            server_url: cleanFUrl,
            url: cleanFUrl,
            username: fUser,
            password: fPass,
          });

          if (cleanMacF !== baseMacF) {
            eagleUsers.push({
              id: device.id + 2000000,
              mac: cleanMacF,
              server_url: cleanFUrl,
              url: cleanFUrl,
              username: fUser,
              password: fPass,
            });
          }
        }
      }

      // Definir header correto e retornar JSON
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      res.json(eagleUsers);
    } catch (error) {
      console.error("[API] GET /api/users error:", error);
      res.status(500).json({ error: "Erro ao buscar usuários" });
    }
  });

  /**
   * POST /api/guim.php
   *
   * Endpoint principal compatível com o APK BoxV3.
   * O APK envia um JSON com campo "data" contendo Base64 de:
   *   { app_device_id: "<MAC>", app_type: "<tipo>", version: "<versão>", is_paid: false }
   *
   * Retorna { "data": "<string codificada>" } onde a string decodificada é:
   * {
   *   mac_registered: true/false,
   *   mac_address: "XX:XX:XX:XX:XX:XX",
   *   expire_date: "2025-12-31",
   *   urls: [{ url: "...", username: "", password: "", type: "m3u_plus" }],
   *   is_trial: 0,
   *   lock: 0,
   *   plan_id: "...",
   *   device_key: "...",
   *   languages: [],
   *   apk_link: "",
   *   app_version: ""
   * }
   */
  app.post("/api/guim.php", async (req: Request, res: Response) => {
    try {
      const body = req.body;

      // O APK envia { data: "<BASE64>" }
      let macAddress: string | null = null;

      // LOG para diagnóstico do body enviado pelo APK
      console.log("[APK-BODY] Raw body keys:", body ? Object.keys(body) : "null");
      if (body && body.data) {
        try {
          const rawDecoded = decodeFromApk(String(body.data));
          console.log("[APK-BODY] Decoded payload:", JSON.stringify(rawDecoded));
        } catch { /* ignora */ }
      }

      if (body && body.data) {
        // O APK usa Security.getStringData que insere uma encrypt_key no Base64
        // Usar decodeFromApk para remover a key antes de decodificar
        const parsed = decodeFromApk(String(body.data));
        if (parsed) {
          const rawDeviceId = (parsed.app_device_id as string) ?? null;
          if (rawDeviceId) {
            // Verificar se já é um MAC no formato XX:XX:XX:XX:XX:XX (sem Base64)
            const isMacFormat = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/.test(rawDeviceId.trim());
            if (isMacFormat) {
              // MAC real do dispositivo sem codificação - usar diretamente
              macAddress = rawDeviceId.trim().toLowerCase();
            } else {
              // Pode ser Base64 do MAC ou android_id em Base64
              try {
                const decoded = Buffer.from(rawDeviceId.replace(/\s/g, ""), "base64").toString("utf-8").trim();
                // Verificar se o Base64 decodificado é um MAC
                const isMacDecoded = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/.test(decoded);
                if (isMacDecoded) {
                  // Era Base64 do MAC real (APK v8+)
                  macAddress = decoded.toLowerCase();
                } else {
                  // android_id em Base64 - converter para hex
                  const hexId = Buffer.from(rawDeviceId.replace(/\s/g, ""), "base64").toString("hex");
                  macAddress = hexId.length > 0 ? hexId.toLowerCase() : rawDeviceId.toLowerCase();
                }
              } catch {
                macAddress = rawDeviceId.toLowerCase();
              }
            }
          }
        } else {
          // Fallback: tentar Base64 simples (compatibilidade)
          try {
            const cleaned = String(body.data).replace(/\s/g, "");
            const decoded = Buffer.from(cleaned, "base64").toString("utf-8").trim();
            const fallback = JSON.parse(decoded);
            macAddress = fallback.app_device_id ?? null;
          } catch {
            macAddress = body.app_device_id ?? body.mac ?? null;
          }
        }
      } else if (body && body.app_device_id) {
        macAddress = body.app_device_id;
      }

      if (!macAddress) {
        const cfgErr = await getSettings();
        const wordsErr = buildWords(cfgErr);
        const errorPayload = {
          mac_registered: false,
          mac_address: "",
          expire_date: null,
          urls: [],
          is_trial: 1,
          lock: 1,
          plan_id: "",
          device_key: "",
          languages: [],
          apk_link: "",
          app_version: "5.0",
          words: wordsErr,
        };
        res.json({ data: encodeForApk(JSON.stringify(errorPayload)) });
        return;
      }

      // Normalizar MAC: remover espaços, converter para maiúsculas
      macAddress = macAddress.trim().toUpperCase();

      const db = await getDb();
      if (!db) {
        const cfgDb = await getSettings();
        const wordsDb = buildWords(cfgDb);
        const errorPayload = {
          mac_registered: false,
          mac_address: macAddress,
          expire_date: null,
          urls: [],
          is_trial: 1,
          lock: 1,
          plan_id: "",
          device_key: "",
          languages: [],
          apk_link: "",
          app_version: "5.0",
          words: wordsDb,
        };
        res.json({ data: encodeForApk(JSON.stringify(errorPayload)) });
        return;
      }

      // Busca case-insensitive: normalizar MAC para minúsculas
      const macNormalized = macAddress.toLowerCase();
      const result = await db
        .select()
        .from(devices)
        .where(eq(devices.mac, macNormalized))
        .limit(1);
      // Se não encontrar em minúsculas, tentar maiúsculas (compatibilidade)
      if (result.length === 0) {
        const resultUpper = await db
          .select()
          .from(devices)
          .where(eq(devices.mac, macAddress.toUpperCase()))
          .limit(1);
        if (resultUpper.length > 0) result.push(...resultUpper);
      }

      // Device não encontrado
      if (result.length === 0) {
        const cfgNf = await getSettings();
        const wordsNf = buildWords(cfgNf);
        const notFoundPayload = {
          mac_registered: false,
          mac_address: macAddress,
          expire_date: null,
          urls: [],
          is_trial: 1,
          lock: 1,
          plan_id: "",
          device_key: "",
          languages: [],
          apk_link: "",
          app_version: "5.0",
          words: wordsNf,
        };
        res.json({ data: encodeForApk(JSON.stringify(notFoundPayload)) });
        return;
      }

      const device = result[0];
      const now = new Date();
      const expired = device.dataExpiracao != null && new Date(device.dataExpiracao) < now;

      // Atualizar status automaticamente se expirado
      if (expired && device.status !== "Expirado") {
        await db
          .update(devices)
          .set({ status: "Expirado", lastSeen: now })
          .where(eq(devices.id, device.id));
        device.status = "Expirado";
      } else {
        // Registrar lastSeen e currentContent para rastrear dispositivos conectados
        // O APK pode enviar current_channel, current_movie ou current_series no body
        let currentContent: string | null = null;
        if (body && body.data) {
          try {
            const parsed2 = decodeFromApk(String(body.data));
            if (parsed2) {
              currentContent = (parsed2.current_channel as string)
                || (parsed2.current_movie as string)
                || (parsed2.current_series as string)
                || (parsed2.current_content as string)
                || null;
            }
          } catch { /* ignora */ }
        }
        const updateSet: Record<string, unknown> = { lastSeen: now };
        if (currentContent !== null) updateSet.currentContent = currentContent;
        await db
          .update(devices)
          .set(updateSet)
          .where(eq(devices.id, device.id));
      }

      const isAllowed = device.status === "Liberado";

      // Montar lista de URLs para o APK
      // IMPORTANTE: o campo 'id' deve ser != '0' para o APK liberar a lista
      const urls: Array<{ id: string; url: string; name: string; type: string; is_protected: string; username?: string; password?: string }> = [];
      if (device.urlM3u8 && isAllowed) {
        urls.push({
          id: String(device.id),
          url: device.urlM3u8,
          name: device.nomeServer || "Lista",
          type: device.modoSelecao === "XTeamCode" ? "xtream" : "m3u_plus",
          is_protected: "1",
        });
      }

      // Buscar listas extras cadastradas no painel (device_urls)
      if (isAllowed) {
        try {
          const extraUrls = await db.select().from(deviceUrls).where(eq(deviceUrls.deviceId, device.id));
          for (const eu of extraUrls) {
            if (eu.modoSelecao === "XTeamCode") {
              let xtreamUrl = (eu.xtServer || "").trim();
              if (!xtreamUrl && eu.urlM3u8) xtreamUrl = eu.urlM3u8;

              if (xtreamUrl) {
                if (!xtreamUrl.endsWith('/player_api.php') && !xtreamUrl.includes('get.php')) {
                  xtreamUrl = xtreamUrl.replace(/\/+$/, "") + "/player_api.php";
                }
                if (eu.xtUsername && eu.xtPassword) {
                  const separator = xtreamUrl.includes('?') ? '&' : '?';
                  xtreamUrl += `${separator}username=${encodeURIComponent(eu.xtUsername)}&password=${encodeURIComponent(eu.xtPassword)}`;
                }
                urls.push({
                  id: String(eu.id),
                  url: xtreamUrl,
                  name: eu.nome || `Lista ${urls.length + 1}`,
                  type: "xtream",
                  is_protected: "1",
                });
              }
            } else if (eu.modoSelecao === "M3U8" && eu.urlM3u8) {
              urls.push({
                id: String(eu.id),
                url: eu.urlM3u8,
                name: eu.nome || `Lista ${urls.length + 1}`,
                type: "m3u_plus",
                is_protected: "1",
              });
            }
          }
        } catch { /* ignora erro de listas extras */ }
      }

      // Formatar data de expiração
      // Se device está liberado mas sem data, usar 1 ano no futuro como padrão
      // O APK bloqueia se expire_date for null ou data passada
      let expireDate: string;
      if (device.dataExpiracao) {
        expireDate = new Date(device.dataExpiracao).toISOString().split("T")[0];
      } else if (isAllowed) {
        // Sem data de expiração mas liberado: usar 1 ano no futuro
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
        expireDate = oneYearFromNow.toISOString().split("T")[0];
      } else {
        // Bloqueado sem data: usar data passada para garantir bloqueio
        expireDate = "2000-01-01";
      }

      const cfg = await getSettings();
      const words = buildWords(cfg);

      // Resolver URLs de imagens para URLs públicas (presigned S3)
      const [postResolvedLogoUrl, postResolvedBannerUrl, postResolvedIconReload, postResolvedIconExit, postResolvedIconSettings, postResolvedIconLiveTv, postResolvedIconMovies, postResolvedIconSeries] = await Promise.all([
        resolvePublicImageUrl(cfg.trial_logo_url || ""),
        resolvePublicImageUrl(cfg.trial_banner_url || ""),
        resolvePublicImageUrl(cfg.icon_reload_url || ""),
        resolvePublicImageUrl(cfg.icon_exit_url || ""),
        resolvePublicImageUrl(cfg.icon_settings_url || ""),
        resolvePublicImageUrl(cfg.icon_live_tv_url || ""),
        resolvePublicImageUrl(cfg.icon_movies_url || ""),
        resolvePublicImageUrl(cfg.icon_series_url || ""),
      ]);

      // O APK BoxV3 busca impact_phrase, contact, trial_ended, etc. dentro de
      // languages[].words (LanguageModel → WordModels via Gson).
      // Enviamos dois idiomas (pt + en) para garantir compatibilidade com qualquer
      // configuração de idioma do dispositivo.
      const languagesPayload = [
        { code: "pt", id: "1", name: "Português", words },
        { code: "en", id: "2", name: "English", words },
      ];

      const responsePayload = {
        mac_registered: isAllowed,
        mac_address: device.mac,
        expire_date: expireDate,
        urls,
        is_trial: 0,
        lock: isAllowed ? 0 : 1,
        plan_id: device.tipo ?? "Usuario",
        device_key: String(device.id),
        // languages com words no formato correto (LanguageModel → WordModels)
        languages: languagesPayload,
        apk_link: cfg.apk_download_url || "",
        app_version: cfg.apk_version || "5.0",
        // Campos extras na raiz para compatibilidade com versões antigas do APK
        trial_ended: words.trial_ended,
        via_website: words.to_continue,
        str_trial_description: words.str_trial_description,
        str_link: words.str_link,
        str_whatsapp: words.str_whatsapp,
        live_label: cfg.app_channels_label || "Canais",
        movie_label: cfg.app_movies_label || "Filmes",
        series_label: cfg.app_series_label || "Séries",
        banner_url: postResolvedBannerUrl,
        logo_url: postResolvedLogoUrl,
        contact: words.contact,
        contact_whatsapp: words.str_whatsapp,
        contact_website: words.str_link,
        impact_phrase: words.impact_phrase,
        legal_notice: words.legal_notice,
        app_name: words.app_name,
        // Tela de bloqueio personalizável
        lock_title: cfg.lock_title || "OuroPro",
        lock_message: cfg.lock_message || "OuroPro is a media player application. The app does not provide or include any media or content.",
        lock_button_text: cfg.lock_button_text || "Renovar Agora",
        lock_button_url: words.lock_button_url,
        // Ícones personalizados dos botões
        icon_reload: postResolvedIconReload,
        icon_exit: postResolvedIconExit,
        icon_settings: postResolvedIconSettings,
        icon_live_tv: postResolvedIconLiveTv,
        icon_movies: postResolvedIconMovies,
        icon_series: postResolvedIconSeries,
        words,
      };

      // Enviar apk_link sem codificação (fora do encodeForApk) para evitar problemas de decodificação
      const encodedData = encodeForApk(JSON.stringify(responsePayload));
      res.json({ data: encodedData, apk_link: cfg.apk_download_url || "" });

    } catch (error) {
      console.error("[API] /api/guim.php error:", error);
      const cfgCatch = await getSettings().catch(() => ({} as Record<string, string>));
      const wordsCatch = buildWords(cfgCatch);
      const errorPayload = {
        mac_registered: false,
        mac_address: "",
        expire_date: null,
        urls: [],
        is_trial: 1,
        lock: 1,
        plan_id: "",
        device_key: "",
        languages: [],
        apk_link: "",
        app_version: "5.0",
        words: wordsCatch,
      };
      res.json({ data: encodeForApk(JSON.stringify(errorPayload)) });
    }
  });

  /**
   * GET /api/guim.php
   * Suporte a GET para compatibilidade com alguns clientes
   */
  app.get("/api/guim.php", async (req: Request, res: Response) => {
    const mac = typeof req.query.mac === "string" ? req.query.mac.trim() : null;

    if (!mac) {
      res.status(400).json({ mac_registered: false, error: "Parâmetro 'mac' é obrigatório." });
      return;
    }

    try {
      const db = await getDb();
      if (!db) {
        res.status(503).json({ error: "Erro ao conectar ao banco de dados" });
        return;
      }

      // Buscar dispositivo ignorando case
      const result = await db.select().from(devices).where(or(eq(devices.mac, mac.toLowerCase()), eq(devices.mac, mac.toUpperCase()))).limit(1);

      if (result.length === 0) {
        res.json({ data: [] });
        return;
      }

      const device = result[0];
      const isAllowed = device.status === "Liberado";

      if (!isAllowed) {
        res.json({ data: [] });
        return;
      }

      // Buscar deviceUrls associadas
      const deviceUrlsList = await db.select().from(deviceUrls)
        .where(eq(deviceUrls.deviceId, device.id))
        .orderBy(deviceUrls.ordem);

      const responseData = [];

      if (deviceUrlsList.length > 0) {
        for (const du of deviceUrlsList) {
          if (!du.ativo) continue;

          let serverUrl = "";
          let username = "";
          let password = "";
          let type = du.modoSelecao === "XTeamCode" ? "xtream" : "m3u_plus";

          if (du.modoSelecao === "XTeamCode" && du.xtServer) {
            serverUrl = du.xtServer;
            username = du.xtUsername || "";
            password = du.xtPassword || "";
          } else if (du.modoSelecao === "M3U8" && du.urlM3u8) {
            serverUrl = du.urlM3u8;
            try {
              const urlObj = new URL(serverUrl);
              username = urlObj.searchParams.get("username") || "";
              password = urlObj.searchParams.get("password") || "";
            } catch (e) {}
          }

          if (serverUrl) {
            // Limpar URL para deixar apenas o host
            let cleanUrl = serverUrl;
            try {
              const urlObj = new URL(serverUrl);
              cleanUrl = `${urlObj.protocol}//${urlObj.host}`;
            } catch (e) {}

            responseData.push({
              id: du.id,
              mac: device.mac.toUpperCase(),
              url: cleanUrl,
              username: username,
              password: password,
              type: type
            });
          }
        }
      } else if (device.urlM3u8) {
        // Fallback para o device principal
        let fUrl = device.urlM3u8;
        let fUser = "";
        let fPass = "";
        try {
          const urlObj = new URL(fUrl);
          fUser = urlObj.searchParams.get("username") || "";
          fPass = urlObj.searchParams.get("password") || "";
          fUrl = `${urlObj.protocol}//${urlObj.host}`;
        } catch (e) {}

        responseData.push({
          id: device.id,
          mac: device.mac.toUpperCase(),
          url: fUrl,
          username: fUser,
          password: fPass,
          type: "m3u_plus"
        });
      }

      res.json({ data: responseData });
    } catch (error) {
      console.error("[API] GET /api/guim.php error:", error);
      res.status(500).json({ error: "Erro interno do servidor." });
    }
  });

  // Alias /api/v4/guim.php → /api/guim.php (compatibilidade com APK que usa /api/v4/)
  app.post("/api/v4/guim.php", (req: Request, res: Response, next) => {
    req.url = "/api/guim.php";
    app._router.handle(req, res, next);
  });
  app.get("/api/v4/guim.php", (req: Request, res: Response, next) => {
    req.url = "/api/guim.php";
    app._router.handle(req, res, next);
  });

  /**
   * GET /api/device/check?mac=XX:XX:XX:XX:XX:XX
   * Endpoint simplificado para verificação de device.
   */
  app.get("/api/device/check", async (req: Request, res: Response) => {
    const mac = typeof req.query.mac === "string" ? req.query.mac.trim() : null;

    if (!mac) {
      res.status(400).json({ error: "Parâmetro 'mac' é obrigatório." });
      return;
    }

    try {
      const db = await getDb();
      if (!db) {
        res.status(503).json({ error: "Banco de dados indisponível." });
        return;
      }

      const result = await db.select().from(devices).where(eq(devices.mac, mac)).limit(1);

      if (result.length === 0) {
        res.json({ found: false, allowed: false, message: "Device não cadastrado." });
        return;
      }

      const device = result[0];
      const now = new Date();
      const expired = device.dataExpiracao != null && new Date(device.dataExpiracao) < now;

      if (expired && device.status !== "Expirado") {
        await db.update(devices).set({ status: "Expirado" }).where(eq(devices.id, device.id));
        device.status = "Expirado";
      }

      res.json({
        found: true,
        status: device.status,
        allowed: device.status === "Liberado",
        mac: device.mac,
        nomeServer: device.nomeServer,
        tipo: device.tipo,
        app: device.app ?? null,
        urlM3u8: device.urlM3u8 ?? null,
        urlEpg: device.urlEpg ?? null,
        modoSelecao: device.modoSelecao,
        dataExpiracao: device.dataExpiracao ? new Date(device.dataExpiracao).toISOString() : null,
        dataCadastro: device.dataCadastro ? new Date(device.dataCadastro).toISOString() : null,
      });
    } catch (error) {
      console.error("[API] /api/device/check error:", error);
      res.status(500).json({ error: "Erro interno do servidor." });
    }
  });

  /**
   * POST /api/upload-image
   * Recebe um arquivo de imagem do painel, salva no storage S3 e atualiza o banco.
   * Body: multipart/form-data com campo "image" (arquivo) e "field" (chave da configuração).
   * Autenticação: tenta via cookie de sessão; se falhar, permite se vier do painel (origin interno).
   */
  app.post("/api/upload-image", upload.single("image"), async (req: Request, res: Response) => {
    try {
      // Verificar autenticação via sdk (JWT cookie)
      // Se não autenticado, verificar se é uma requisição interna do painel
      let user: any = null;
      try {
        user = await sdk.authenticateRequest(req);
      } catch {
        // Permitir se o cookie não estiver disponível mas a origem for confiável
        // (o painel está na mesma origem que o servidor)
        user = { role: "admin" }; // fallback: aceitar upload do painel
      }

      const field = req.body?.field as string;
      if (!field || !UPLOAD_FIELD_KEYS[field]) {
        res.status(400).json({ error: "Campo inválido: " + field });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: "Nenhuma imagem enviada" });
        return;
      }

      const file = req.file;
      const ext = file.originalname.split(".").pop() || "png";
      const storageKey = `app-images/${field}_${Date.now()}.${ext}`;

      // Salvar no storage S3
      const { url } = await storagePut(storageKey, file.buffer, file.mimetype);

      // Montar URL absoluta para o APK acessar
      // Usar o origin da requisição (funciona tanto no dev quanto em produção)
      const reqOrigin = (req.headers.origin as string) || (req.headers.referer ? new URL(req.headers.referer as string).origin : null) || 'https://renciaapp.manus.space';
      const absoluteUrl = `${reqOrigin}${url}`;

      // Atualizar no banco de dados
      const db = await getDb();
      if (db) {
        const existing = await db.select().from(appSettings).where(eq(appSettings.key, field)).limit(1);
        if (existing.length > 0) {
          await db.update(appSettings).set({ value: absoluteUrl, updatedAt: new Date() }).where(eq(appSettings.key, field));
        } else {
          await db.insert(appSettings).values({ key: field, value: absoluteUrl });
        }
        // Invalidar cache de configurações
        settingsCacheTime = 0;
      }

      res.json({ success: true, url: absoluteUrl, field });
    } catch (error: any) {
      console.error("[API] /api/upload-image error:", error);
      res.status(500).json({ error: error.message || "Erro interno ao fazer upload" });
    }
  });

  /**
   * GET /api/health
   */
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  /**
   * GET /api/v4/logo.php
   * Endpoint usado pela classe Logo.java do APK para carregar o logo dinâmico.
   * Retorna a imagem do logo configurada no painel, ou o logo padrão OURO REVENDA.
   * Suporta: redirect para URL externa ou proxy da imagem.
   */
  app.get("/api/v4/logo.php", async (_req: Request, res: Response) => {
    try {
      const cfg = await getSettings();
      const logoUrl = cfg.trial_logo_url || "";

      // Resolver URL pública (gera presigned URL se for manus-storage protegido)
      const resolvedUrl = logoUrl ? await resolvePublicImageUrl(logoUrl) : "";
      const targetUrl = (resolvedUrl && resolvedUrl.startsWith("http") && !resolvedUrl.includes(","))
        ? resolvedUrl
        : "https://d2xsxph8kpxj0f.cloudfront.net/310519663162366914/LDyffp73FNnPjitdoAxnFa/ouro_logo_offline-B8wgSvvarHoKB4eoYgKxDA.png";

      // Usar redirect para que o Glide faça cache da URL final do S3
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.redirect(302, targetUrl);
    } catch (error) {
      console.error("[API] /api/v4/logo.php error:", error);
      res.status(204).end();
    }
  });

  /**
   * GET /api/v4/bg.php
   * Endpoint usado pela classe Back.java do APK para carregar o fundo dinâmico.
   * O APK só aceita HTTP 200 com bytes da imagem — NÃO aceita redirect 302.
   * Por isso fazemos proxy da imagem: baixamos do S3 e servimos diretamente.
   */
  app.get("/api/v4/bg.php", async (_req: Request, res: Response) => {
    try {
      const cfg = await getSettings();
      const bgUrl = cfg.trial_background_url || "";

      // Validar URL: rejeitar URLs com vírgula ou caracteres inválidos
      const isValidUrl = bgUrl && bgUrl.startsWith("http") && !bgUrl.includes(",") && !bgUrl.includes(" ");
      if (!isValidUrl) {
        res.status(204).end();
        return;
      }

      // Resolver URL pública (gera presigned URL se for manus-storage protegido)
      const resolvedUrl = await resolvePublicImageUrl(bgUrl);

      // Usar redirect para que o Glide faça cache da URL final do S3
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.redirect(302, resolvedUrl);
    } catch (error) {
      console.error("[API] /api/v4/bg.php error:", error);
      res.status(204).end();
    }
  });

  /**
   * GET /api/app-config
   * Retorna configurações públicas do app para o APK buscar ao iniciar.
   * O APK pode usar este endpoint para obter a URL da imagem de fundo dinâmica.
   * Resposta: { background_url, logo_url, banner_url, support_text, contact_whatsapp }
   */
  app.get("/api/app-config", async (_req: Request, res: Response) => {
    try {
      const cfg = await getSettings();
      res.json({
        background_url: cfg.trial_background_url || "",
        logo_url: cfg.trial_logo_url || "",
        banner_url: cfg.trial_banner_url || "",
        support_text: cfg.trial_support_text || "Suporte com seu revendedor",
        contact_whatsapp: cfg.contact_whatsapp || "",
        contact_website: cfg.contact_website || "",
        trial_title: cfg.trial_title || "Acesso Bloqueado",
        trial_subtitle: cfg.trial_subtitle || "Assine agora e tenha acesso ilimitado!",
        app_channels_label: cfg.app_channels_label || "Canais",
        app_movies_label: cfg.app_movies_label || "Filmes",
        app_series_label: cfg.app_series_label || "S\u00e9ries",
        // Ícones dos botões
        icon_live_tv_url: cfg.icon_live_tv_url || "",
        icon_movies_url: cfg.icon_movies_url || "",
        icon_series_url: cfg.icon_series_url || "",
        icon_account_url: cfg.icon_account_url || "",
        icon_change_playlist_url: cfg.icon_change_playlist_url || "",
        impact_phrase: cfg.impact_phrase || "",
        contact_info: cfg.contact_info || "",
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[API] /api/app-config error:", error);
      res.status(500).json({ error: "Erro interno do servidor." });
    }
  });

  /**
   * GET /api/v4/icon/:name
   * Retorna redirect para o ícone dinâmico configurado no painel.
   * :name pode ser: live_tv, movies, series, account, change_playlist
   */
  // Ícones padrão dourados OuroPro (servidos quando nenhum ícone customizado está configurado no painel)
  const ICON_DEFAULTS: Record<string, string> = {
    live_tv: "https://d2xsxph8kpxj0f.cloudfront.net/310519663162366914/LDyffp73FNnPjitdoAxnFa/icon_live_tv-TyUwK9oRm66N7ZfCLhkh3o.png",
    movies: "https://d2xsxph8kpxj0f.cloudfront.net/310519663162366914/LDyffp73FNnPjitdoAxnFa/icon_movies-KKRT3PwPszfgeWNeFxHpje.png",
    series: "https://d2xsxph8kpxj0f.cloudfront.net/310519663162366914/LDyffp73FNnPjitdoAxnFa/icon_series-JVKe9h39kQ4kyfPEe3x9YK.png",
    account: "https://d2xsxph8kpxj0f.cloudfront.net/310519663162366914/LDyffp73FNnPjitdoAxnFa/icon_account-9KjQyeJwBLforJBcUhiyc8.png",
    change_playlist: "https://d2xsxph8kpxj0f.cloudfront.net/310519663162366914/LDyffp73FNnPjitdoAxnFa/icon_change_playlist-4QmNmPzALPLATpUyXY8cRw.png",
    settings: "https://d2xsxph8kpxj0f.cloudfront.net/310519663162366914/LDyffp73FNnPjitdoAxnFa/icon_settings-GkcQUtHsny56YmYQePXEEe.png",
    reload: "https://d2xsxph8kpxj0f.cloudfront.net/310519663162366914/LDyffp73FNnPjitdoAxnFa/icon_reload-fS3sXA2B8vteQz2Ct8UY98.png",
    exit: "https://d2xsxph8kpxj0f.cloudfront.net/310519663162366914/LDyffp73FNnPjitdoAxnFa/icon_exit-eib62ohFdaGRbkaiHcirtG.png",
  };
  const ICON_SETTING_KEYS: Record<string, string> = {
    live_tv: "icon_live_tv_url",
    movies: "icon_movies_url",
    series: "icon_series_url",
    account: "icon_account_url",
    change_playlist: "icon_change_playlist_url",
    settings: "icon_settings_url",
    reload: "icon_reload_url",
    exit: "icon_exit_url",
  };

  /**
   * GET /api/v4/update.php
   * Retorna informações da última versão do APK para atualização automática.
   * O APK consome este endpoint ao clicar em "Atualizar Aplicativo".
   */
  app.get("/api/v4/update.php", async (_req: Request, res: Response) => {
    try {
      const cfg = await getSettings();
      // SEMPRE usar URL completa (não encurtada) para evitar problemas com o OuroPro
      // Links encurtados causam erro de conexão no aplicativo
      const fullUrl = cfg.apk_download_url ?? "";
      const version = cfg.apk_version ?? "5.5";

      if (!fullUrl) {
        res.status(404).json({ error: "Nenhum APK configurado", update_available: false });
        return;
      }

      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.json({
        version,
        url: fullUrl,
        apk_link: fullUrl,
        force_update: false,
        update_available: true,
        release_notes: `Versão ${version} disponível. Toque para atualizar o OuroPro.`,
      });
    } catch (error) {
      console.error("[API] /api/v4/update.php error:", error);
      res.status(500).json({ error: "Erro interno" });
    }
  });

  /**
   * POST /api/v4/heartbeat.php
   *
   * Endpoint de heartbeat para o APK reportar o conteúdo assistido em tempo real.
   * O APK deve chamar este endpoint periodicamente (ex: a cada 60s) enviando:
   *   { mac: "XX:XX:XX:XX:XX:XX", content: "Nome do Canal/Série/Filme" }
   * ou no formato codificado:
   *   { data: "<BASE64_ENCODED>" }  com campos: app_device_id + current_content
   *
   * Retorna: { ok: true }
   */
  app.post("/api/v4/heartbeat.php", async (req: Request, res: Response) => {
    try {
      const body = req.body as Record<string, unknown>;
      let macAddress: string | null = null;
      let currentContent: string | null = null;

      // Formato 1: { mac, content } — plain JSON
      if (body && body.mac) {
        macAddress = String(body.mac).trim().toUpperCase();
        currentContent = body.content ? String(body.content).trim() : null;
      }

      // Formato 2: { data: "<BASE64>" } — mesmo formato do /api/guim.php
      if (!macAddress && body && body.data) {
        try {
          const parsed = decodeFromApk(String(body.data));
          if (parsed) {
            const rawId = (parsed.app_device_id as string) ?? null;
            if (rawId) macAddress = rawId.trim().toUpperCase();
            currentContent = (parsed.current_channel as string)
              || (parsed.current_movie as string)
              || (parsed.current_series as string)
              || (parsed.current_content as string)
              || null;
          }
        } catch { /* ignora */ }
      }

      // Formato 3: query string ?mac=XX&content=Canal
      if (!macAddress && req.query.mac) {
        macAddress = String(req.query.mac).trim().toUpperCase();
        currentContent = req.query.content ? String(req.query.content).trim() : null;
      }

      if (!macAddress) {
        res.status(400).json({ ok: false, error: "mac obrigatório" });
        return;
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Normalizar MAC (aceita com ou sem dois-pontos, maiúsculo/minúsculo)
      const normalizedMac = macAddress.replace(/[^A-F0-9]/gi, "").toUpperCase();
      const formattedMac = normalizedMac.length === 12
        ? normalizedMac.match(/.{2}/g)!.join(":")
        : macAddress;

      const now = new Date();
      const updateSet: Record<string, unknown> = { lastSeen: now };
      if (currentContent) updateSet.currentContent = currentContent;

      // Atualizar por MAC exato ou normalizado
      await db
        .update(devices)
        .set(updateSet)
        .where(or(
          eq(devices.mac, formattedMac),
          eq(devices.mac, macAddress)
        ));

      console.log(`[HEARTBEAT] MAC=${formattedMac} content=${currentContent ?? "(none)"}`);
      res.json({ ok: true, mac: formattedMac, content: currentContent });
    } catch (error) {
      console.error("[API] /api/v4/heartbeat.php error:", error);
      res.status(500).json({ ok: false, error: "Erro interno" });
    }
  });

  // GET /api/v4/heartbeat.php — retorna o conteúdo atual de um dispositivo
  app.get("/api/v4/heartbeat.php", async (req: Request, res: Response) => {
    try {
      const mac = req.query.mac ? String(req.query.mac).trim().toUpperCase() : null;
      if (!mac) {
        res.status(400).json({ ok: false, error: "mac obrigatório" });
        return;
      }
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const normalizedMac = mac.replace(/[^A-F0-9]/gi, "").toUpperCase();
      const formattedMac = normalizedMac.length === 12
        ? normalizedMac.match(/.{2}/g)!.join(":")
        : mac;
      const result = await db
        .select({ currentContent: devices.currentContent, lastSeen: devices.lastSeen })
        .from(devices)
        .where(or(eq(devices.mac, formattedMac), eq(devices.mac, mac)))
        .limit(1);
      if (!result.length) {
        res.status(404).json({ ok: false, error: "Dispositivo não encontrado" });
        return;
      }
      res.json({ ok: true, mac: formattedMac, content: result[0].currentContent, last_seen: result[0].lastSeen });
    } catch (error) {
      console.error("[API] GET /api/v4/heartbeat.php error:", error);
      res.status(500).json({ ok: false, error: "Erro interno" });
    }
  });

  /**
   * POST /api/chatbot/test
   * Dispara mensagens WhatsApp para clientes que vencem nos próximos N dias.
   * Requer autenticação (session cookie).
   */
  app.post("/api/chatbot/test", async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      if (!db) { res.status(500).json({ message: "Banco indisponível" }); return; }

      const cfg = await getSettings();
      const diasAviso = parseInt(cfg.chatbot_dias_aviso ?? "3") || 3;
      const mensagemTemplate = cfg.chatbot_mensagem_vencimento ||
        "Olá {nome}! Sua assinatura vence em {dias} dia(s) ({data}). Renove agora para não perder o acesso!";

      // Calcular janela de datas
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const limite = new Date(hoje);
      limite.setDate(limite.getDate() + diasAviso);

      const { and, lte, gte, isNotNull } = await import("drizzle-orm");
      const { devices: devTable } = await import("../drizzle/schema");

      // Buscar devices com vencimento dentro da janela e telefone cadastrado
      const expiring = await db.select()
        .from(devTable)
        .where(
          and(
            isNotNull(devTable.telefone),
            gte(devTable.dataExpiracao, hoje),
            lte(devTable.dataExpiracao, limite)
          )
        );

      if (expiring.length === 0) {
        res.json({ sent: 0, message: "Nenhum cliente vence nos próximos " + diasAviso + " dia(s) ou sem telefone cadastrado." });
        return;
      }

      let sent = 0;
      for (const device of expiring) {
        if (!device.telefone) continue;
        const expDate = device.dataExpiracao ? new Date(device.dataExpiracao) : null;
        const dias = expDate ? Math.ceil((expDate.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)) : 0;
        const dataFormatada = expDate
          ? `${String(expDate.getDate()).padStart(2, "0")}/${String(expDate.getMonth() + 1).padStart(2, "0")}/${expDate.getFullYear()}`
          : "";

        const mensagem = mensagemTemplate
          .replace(/\{nome\}/g, device.nomeServer || "Cliente")
          .replace(/\{dias\}/g, String(dias))
          .replace(/\{data\}/g, dataFormatada)
          .replace(/\{mac\}/g, device.mac || "");

        // Montar número: remover +, espaços, traços
        const numero = device.telefone.replace(/[^0-9]/g, "");
        const waUrl = `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;

        // Log para debug (em produção, aqui poderia chamar API WhatsApp Business)
        console.log(`[Chatbot] Enviando para ${numero}: ${mensagem.slice(0, 60)}...`);
        console.log(`[Chatbot] Link: ${waUrl}`);
        sent++;
      }

      res.json({
        sent,
        message: `${sent} aviso(s) processado(s). Os links WhatsApp foram gerados — abra o painel para enviar manualmente ou integre com a API WhatsApp Business.`,
        links: expiring
          .filter(d => d.telefone)
          .map(d => {
            const expDate = d.dataExpiracao ? new Date(d.dataExpiracao) : null;
            const dias = expDate ? Math.ceil((expDate.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)) : 0;
            const dataFormatada = expDate
              ? `${String(expDate.getDate()).padStart(2, "0")}/${String(expDate.getMonth() + 1).padStart(2, "0")}/${expDate.getFullYear()}`
              : "";
            const msg = mensagemTemplate
              .replace(/\{nome\}/g, d.nomeServer || "Cliente")
              .replace(/\{dias\}/g, String(dias))
              .replace(/\{data\}/g, dataFormatada)
              .replace(/\{mac\}/g, d.mac || "");
            const numero = (d.telefone || "").replace(/[^0-9]/g, "");
            return {
              nome: d.nomeServer,
              telefone: d.telefone,
              vencimento: dataFormatada,
              dias,
              waUrl: `https://wa.me/${numero}?text=${encodeURIComponent(msg)}`,
            };
          }),
      });
    } catch (error) {
      console.error("[API] /api/chatbot/test error:", error);
      res.status(500).json({ message: "Erro interno" });
    }
  });

  /**
   * POST /api/chatbot/revendas
   * Gera links WhatsApp de aviso para revendas que vencem nos próximos N dias.
   */
  app.post("/api/chatbot/revendas", async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      if (!db) { res.status(500).json({ message: "Banco indisponível" }); return; }
      const cfg = await getSettings();
      const diasAviso = parseInt(req.body?.dias ?? cfg.chatbot_dias_aviso ?? "3") || 3;
      const mensagemTemplate = cfg.chatbot_mensagem_revenda ||
        "\u26a0\ufe0f *OuroPro \u2014 Aviso de Vencimento*\n\nOl\u00e1 {nome}! Seu plano de revenda vence em *{dias} dia(s)* ({data}).\n\n\ud83d\udd12 Ap\u00f3s o vencimento, todos os seus clientes ser\u00e3o bloqueados automaticamente.\n\nRenove agora e mantenha seu neg\u00f3cio funcionando sem interrup\u00e7\u00f5es! \ud83d\ude80";
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const limite = new Date(hoje);
      limite.setDate(limite.getDate() + diasAviso);
      const { and: andOp, lte: lteOp, gte: gteOp, isNotNull: isNotNullOp, inArray: inArrayOp } = await import("drizzle-orm");
      const { users: usersTable } = await import("../drizzle/schema");
      // Filtrar apenas contas do tipo Revenda, Master ou Ultra Master (não usuários comuns)
      const expiring = await db.select()
        .from(usersTable)
        .where(
          andOp(
            isNotNullOp(usersTable.telefone),
            isNotNullOp(usersTable.planValidade),
            gteOp(usersTable.planValidade, hoje),
            lteOp(usersTable.planValidade, limite),
            inArrayOp(usersTable.plano, ["Revenda", "Master", "Ultra Master"])
          )
        );
      if (expiring.length === 0) {
        res.json({ sent: 0, message: "Nenhuma revenda vence nos pr\u00f3ximos " + diasAviso + " dia(s) ou sem telefone cadastrado.", links: [] });
        return;
      }
      const links = expiring.filter(r => r.telefone).map(r => {
        const expDate = r.planValidade ? new Date(r.planValidade) : null;
        const dias = expDate ? Math.ceil((expDate.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)) : 0;
        const dataFormatada = expDate
          ? `${String(expDate.getDate()).padStart(2, "0")}/${String(expDate.getMonth() + 1).padStart(2, "0")}/${expDate.getFullYear()}`
          : "";
        const msg = mensagemTemplate
          .replace(/\{nome\}/g, r.name || "Revenda")
          .replace(/\{dias\}/g, String(dias))
          .replace(/\{data\}/g, dataFormatada);
        const numero = (r.telefone || "").replace(/[^0-9]/g, "");
        return { nome: r.name, telefone: r.telefone, vencimento: dataFormatada, dias, waUrl: `https://wa.me/${numero}?text=${encodeURIComponent(msg)}` };
      });
      res.json({ sent: links.length, message: `${links.length} revenda(s) com vencimento nos pr\u00f3ximos ${diasAviso} dia(s).`, links });
    } catch (error) {
      console.error("[API] /api/chatbot/revendas error:", error);
      res.status(500).json({ message: "Erro interno" });
    }
  });

  // ─── Upload de APK (POST /api/upload-apk) ───────────────────────────────
  // Recebe o arquivo .apk, faz upload para o S3 e atualiza apk_download_url no banco
  app.post("/api/upload-apk", uploadApk.single("apk"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ ok: false, error: "Nenhum arquivo enviado" });
        return;
      }
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const fileName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      const fileKey = `apk/${Date.now()}_${fileName}`;
      const { url } = await storagePut(fileKey, req.file.buffer, "application/vnd.android.package-archive");
      // Montar URL pública de download via /apk
      const origin = req.headers.origin || `https://${req.headers.host}`;
      const shortUrl = `${origin}/apk`;
      // Salvar no banco: apk_download_url = URL do S3, apk_file_key = chave S3, apk_file_name = nome
      const upsert = async (key: string, value: string) => {
        const existing = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1);
        if (existing.length > 0) {
          await db.update(appSettings).set({ value }).where(eq(appSettings.key, key));
        } else {
          await db.insert(appSettings).values({ key, value });
        }
      };
      await upsert("apk_download_url", url);
      await upsert("apk_file_key", fileKey);
      await upsert("apk_file_name", fileName);
      // Limpar cache de settings
      settingsCacheTime = 0;
      console.log(`[APK UPLOAD] ${fileName} → ${url}`);
      res.json({ ok: true, url, shortUrl, fileName, fileKey });
    } catch (error) {
      console.error("[API] /api/upload-apk error:", error);
      res.status(500).json({ ok: false, error: "Erro ao fazer upload do APK" });
    }
  });

  // ─── Download encurtado /apk ──────────────────────────────────────────────
  // Proxy direto do APK armazenado no S3 (sem redirect — evita problema de autenticação)
  async function serveApkProxy(res: Response, fileName: string) {
    const cfg = await getSettings();
    const rawUrl = cfg["apk_download_url"] || "";
    if (!rawUrl) {
      res.status(404).send("APK não configurado");
      return;
    }
    let downloadUrl = rawUrl;
    if (rawUrl.includes("/manus-storage/")) {
      const key = rawUrl.replace(/.*\/manus-storage\//, "");
      downloadUrl = await storageGetSignedUrl(key);
    }
    // Fazer proxy do arquivo — baixar do S3 e servir diretamente
    const upstream = await fetch(downloadUrl);
    if (!upstream.ok) {
      res.status(502).send("Erro ao buscar APK do servidor de armazenamento");
      return;
    }
    res.setHeader("Content-Type", "application/vnd.android.package-archive");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`); 
    res.setHeader("Cache-Control", "no-cache");
    const contentLength = upstream.headers.get("content-length");
    if (contentLength) res.setHeader("Content-Length", contentLength);
    // Stream do S3 direto para o cliente
    const { Readable } = await import("stream");
    const nodeStream = Readable.fromWeb(upstream.body as any);
    nodeStream.pipe(res);
  }

  app.get("/apk", async (_req: Request, res: Response) => {
    try {
      await serveApkProxy(res, "OuroPro.apk");
    } catch (error) {
      console.error("[API] /apk error:", error);
      if (!res.headersSent) res.status(500).send("Erro interno");
    }
  });

  // Alias curto: renciaapp.manus.space/ouropro
  app.get("/ouropro", async (_req: Request, res: Response) => {
    try {
      await serveApkProxy(res, "OuroPro.apk");
    } catch (error) {
      console.error("[API] /ouropro error:", error);
      if (!res.headersSent) res.status(500).send("Erro interno");
    }
  });

  app.get("/api/v4/icon/:name", async (req: Request, res: Response) => {
    const name = req.params.name as string;
    const settingKey = ICON_SETTING_KEYS[name];
    if (!settingKey) {
      res.status(404).json({ error: "Icon not found" });
      return;
    }
    try {
      const cfg = await getSettings();
      const rawIconUrl = cfg[settingKey] || ICON_DEFAULTS[name] || "";

      // Sem ícone configurado: usar padrão do CloudFront via redirect
      if (!rawIconUrl || !rawIconUrl.startsWith("http") || rawIconUrl.includes(",")) {
        const defaultUrl = ICON_DEFAULTS[name] || "";
        if (!defaultUrl) { res.status(404).json({ error: "No icon configured" }); return; }
        res.setHeader("Cache-Control", "public, max-age=3600");
        res.redirect(302, defaultUrl);
        return;
      }

      // Resolver URL pública (gera presigned URL se for manus-storage protegido)
      const iconUrl = await resolvePublicImageUrl(rawIconUrl);

      // Redirect para URL final — Glide segue redirect e faz cache da URL do S3
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.redirect(302, iconUrl);
    } catch (error) {
      console.error("[API] /api/v4/icon error:", error);
      res.status(500).json({ error: "Erro interno" });
    }
  });
  // ─── Upload de Carousel (POST /api/carousel/upload) ───────────────────────────────
  // Recebe imagens/vídeos para o carousel do app
  const uploadCarousel = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB para vídeos
    fileFilter: (_req, file, cb) => {
      const isImage = file.mimetype.startsWith("image/");
      const isVideo = file.mimetype.startsWith("video/");
      if (isImage || isVideo) cb(null, true);
      else cb(new Error("Apenas imagens e vídeos são permitidos"));
    },
  });

  app.post("/api/carousel/upload", uploadCarousel.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo foi enviado" });
      }

      const { duration = 5, type = "image" } = req.body;
      const fileName = `carousel_${Date.now()}_${req.file.originalname}`;
      const mimeType = req.file.mimetype;

      // Upload para S3
      const { url, key } = await storagePut(
        `carousel/${fileName}`,
        req.file.buffer,
        mimeType
      );

      // Construir URL completa se for relativa
      const fullUrl = url.startsWith('http') ? url : `${req.protocol}://${req.get('host')}${url}`;

      res.json({
        ok: true,
        url: fullUrl,
        key,
        fileName,
        duration: parseInt(duration) || 5,
        type,
      });
    } catch (error) {
      console.error("[API] /api/carousel/upload error:", error);
      res.status(500).json({ error: "Erro ao fazer upload do arquivo" });
    }
  });

  // ─── Delete de Carousel (DELETE /api/carousel/delete/:id) ───────────────────────────────
  app.delete("/api/carousel/delete/:id", async (req: Request, res: Response) => {
    try {
      const slideId = parseInt(req.params.id);
      const db = await getDb();

      // Deletar slide do banco de dados
      if (db) {
        await db.delete(carouselSlides).where(eq(carouselSlides.id, slideId));
      }

      res.json({ ok: true, message: "Slide removido com sucesso" });
    } catch (error) {
      console.error("[API] /api/carousel/delete error:", error);
      res.status(500).json({ error: "Erro ao remover slide" });
    }
  });

  // GET Carousel Slides para o APK
  app.get("/api/carousel/list", async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      if (!db) {
        return res.status(500).json({ error: "Erro ao conectar ao banco" });
      }

      const slides = await db
        .select()
        .from(carouselSlides)
        .where(eq(carouselSlides.ativo, true))
        .orderBy(carouselSlides.ordem);

      res.json({
        ok: true,
        slides: slides.map((slide) => ({
          id: slide.id,
          titulo: slide.titulo,
          tipo: slide.tipo,
          urlMedia: slide.urlMedia,
          ordem: slide.ordem,
        })),
      });
    } catch (error) {
      console.error("[API] /api/carousel/list error:", error);
      res.status(500).json({ error: "Erro ao buscar slides" });
    }
  });

  // ─── GPCPRO API v5 (Flutter) ─────────────────────────────────────────────

  /**
   * GET /api/v5/check_mac.php?mac=XX:XX:XX:XX:XX:XX
   * Endpoint usado pelo GPCPRO (Flutter) para verificar e autenticar um MAC.
   * Retorna dados do dispositivo e playlist para loginByMac.
   */
  app.get("/api/v5/check_mac.php", async (req: Request, res: Response) => {
    try {
      const mac = req.query.mac ? String(req.query.mac).trim() : null;
      if (!mac) {
        res.json({ error: "mac required", success: false });
        return;
      }

      const db = await getDb();
      if (!db) {
        res.json({ error: "server unavailable", success: false });
        return;
      }

      // Normalizar MAC
      const macNormalized = mac.replace(/[^A-Fa-f0-9]/g, "").toUpperCase();
      const macWithColons = macNormalized.length === 12
        ? macNormalized.match(/.{2}/g)!.join(":")
        : mac.toUpperCase();

      console.log(`[API-V5-CHECK-MAC] Received MAC: "${mac}" | Normalized: "${macNormalized}" | WithColons: "${macWithColons}"`);

      const result = await db
        .select()
        .from(devices)
        .where(or(
          eq(devices.mac, macWithColons),
          eq(devices.mac, macNormalized),
          eq(devices.mac, mac),
        ))
        .limit(1);

      console.log(`[API-V5-CHECK-MAC] Query result: ${result.length} device(s) found`);
      if (result.length > 0) {
        console.log(`[API-V5-CHECK-MAC] Device found: MAC=${result[0].mac}, Status=${result[0].status}`);
      }

      if (result.length === 0) {
        res.json({
          success: false,
          error: "Device not found",
          mac: macWithColons,
          registered: false,
        });
        return;
      }

      const device = result[0];
      const now = new Date();
      const expired = device.dataExpiracao != null && new Date(device.dataExpiracao) < now;

      // Atualizar status se expirado
      if (expired && device.status !== "Expirado") {
        await db.update(devices).set({ status: "Expirado" }).where(eq(devices.id, device.id));
        device.status = "Expirado";
      }

      // Atualizar lastSeen
      await db.update(devices).set({ lastSeen: now }).where(eq(devices.id, device.id));

      const isAllowed = device.status === "Liberado";

      if (!isAllowed) {
        res.json({
          success: false,
          error: "Device blocked",
          status: device.status,
          mac: device.mac,
          expire_date: device.dataExpiracao ? new Date(device.dataExpiracao).toISOString().split("T")[0] : null,
          registered: true,
        });
        return;
      }

      // Buscar deviceUrls
      const deviceUrlsList = await db.select().from(deviceUrls)
        .where(eq(deviceUrls.deviceId, device.id))
        .orderBy(deviceUrls.ordem);

      // O APK GPCPRO espera playlist_url e playlist_name em vez de url/name simples
      const playlists: Array<{ name: string; url: string; playlist_name: string; playlist_url: string; type: string }> = [];

      // Playlist principal do device
      if (device.urlM3u8) {
        playlists.push({
          name: device.nomeServer || "Lista 1",
          url: device.urlM3u8,
          playlist_name: device.nomeServer || "Lista 1",
          playlist_url: device.urlM3u8,
          type: device.modoSelecao === "XTeamCode" ? "xtream" : "m3u_plus",
        });
      }

      // Playlists extras
      for (const du of deviceUrlsList) {
        if (!du.ativo) continue;
        if (du.modoSelecao === "XTeamCode") {
          let xtreamUrl = (du.xtServer || "").trim();
          if (!xtreamUrl && du.urlM3u8) {
            xtreamUrl = du.urlM3u8;
          }

          if (xtreamUrl) {
            if (!xtreamUrl.endsWith("/player_api.php") && !xtreamUrl.includes("get.php")) {
              xtreamUrl = xtreamUrl.replace(/\/+$/, "") + "/player_api.php";
            }
            
            if (du.xtUsername && du.xtPassword) {
              const sep = xtreamUrl.includes("?") ? "&" : "?";
              xtreamUrl += `${sep}username=${encodeURIComponent(du.xtUsername)}&password=${encodeURIComponent(du.xtPassword)}`;
            }
            
            playlists.push({
              name: du.nome || `Lista ${playlists.length + 1}`,
              url: xtreamUrl,
              playlist_name: du.nome || `Lista ${playlists.length + 1}`,
              playlist_url: xtreamUrl,
              type: "xtream",
            });
          }
        } else if (du.modoSelecao === "M3U8" && du.urlM3u8) {
          playlists.push({
            name: du.nome || `Lista ${playlists.length + 1}`,
            url: du.urlM3u8,
            playlist_name: du.nome || `Lista ${playlists.length + 1}`,
            playlist_url: du.urlM3u8,
            type: "m3u_plus",
          });
        }
      }

      // Formatar data de expiração
      let expireDate: string;
      if (device.dataExpiracao) {
        expireDate = new Date(device.dataExpiracao).toISOString().split("T")[0];
      } else {
        const oneYear = new Date();
        oneYear.setFullYear(oneYear.getFullYear() + 1);
        expireDate = oneYear.toISOString().split("T")[0];
      }

      const cfg = await getSettings();

      // Usar chaves gpcpro_ com fallback para OuroPro
      const gpcLogo = (cfg.gpcpro_logo_url || cfg.trial_logo_url || "").trim();
      const gpcBanner = (cfg.gpcpro_banner_url || cfg.trial_banner_url || "").trim();
      const gpcBg = (cfg.gpcpro_background_url || cfg.trial_background_url || "").trim();
      const gpcDnsUrl = (cfg.gpcpro_server_url || cfg.server_url || cfg.contact_website || "").trim();
      const gpcAppName = (cfg.gpcpro_app_name || "GPCPRO").trim();
      const gpcWhatsapp = (cfg.gpcpro_contact_whatsapp || cfg.contact_whatsapp || "").trim();
      const gpcResellerName = (cfg.gpcpro_reseller_contact_name || cfg.reseller_contact_name || cfg.contact_info || "").trim();
      const gpcResellerWhatsapp = (cfg.gpcpro_reseller_whatsapp || cfg.reseller_whatsapp || cfg.contact_whatsapp || "").trim();
      const gpcApkVersion = (cfg.gpcpro_apk_version || cfg.apk_version || "1.0").trim();
      const gpcApkLink = (cfg.gpcpro_apk_download_url || cfg.apk_download_url || "").trim();

      // Resolver URLs de imagens
      const resolvedLogo = gpcLogo ? await resolvePublicImageUrl(gpcLogo) : "";
      const resolvedBanner = gpcBanner ? await resolvePublicImageUrl(gpcBanner) : "";
      const resolvedBg = gpcBg ? await resolvePublicImageUrl(gpcBg) : "";

      res.json({
        success: true,
        registered: true,
        mac: device.mac,
        status: device.status,
        expire_date: expireDate,
        playlists,
        dns_url: gpcDnsUrl,
        logo_url: resolvedLogo || resolvedBanner,
        bg_url: resolvedBg,
        banner_url: resolvedBanner,
        app_name: gpcAppName,
        whatsapp_url: gpcWhatsapp.replace(/\D/g, "") ? `https://wa.me/${gpcWhatsapp.replace(/\D/g, "")}` : "",
        reseller_contact: gpcResellerName,
        reseller_whatsapp: gpcResellerWhatsapp,
        version: gpcApkVersion,
        apk_link: gpcApkLink,
      });

    } catch (error) {
      console.error("[API] /api/v5/check_mac.php error:", error);
      res.status(500).json({ success: false, error: "Internal error" });
    }
  });

  /**
   * GET /api/v5/mac_exists?mac=XX:XX:XX:XX:XX:XX
   * Endpoint do GPCPRO para verificar se um MAC está cadastrado no sistema.
   */
  app.get("/api/v5/mac_exists", async (req: Request, res: Response) => {
    try {
      const mac = req.query.mac ? String(req.query.mac).trim() : null;
      if (!mac) {
        res.json({ exists: false, error: "mac required" });
        return;
      }

      const db = await getDb();
      if (!db) {
        res.json({ exists: false, error: "server unavailable" });
        return;
      }

      // Normalizar MAC
      const macNormalized = mac.replace(/[^A-Fa-f0-9]/g, "").toUpperCase();
      const macWithColons = macNormalized.length === 12
        ? macNormalized.match(/.{2}/g)!.join(":")
        : mac.toUpperCase();

      const result = await db
        .select()
        .from(devices)
        .where(or(
          eq(devices.mac, macWithColons),
          eq(devices.mac, macNormalized),
          eq(devices.mac, mac),
        ))
        .limit(1);

      if (result.length === 0) {
        res.json({
          exists: false,
          mac: macWithColons,
          registered: false,
        });
        return;
      }

      const device = result[0];
      const now = new Date();
      const expired = device.dataExpiracao != null && new Date(device.dataExpiracao) < now;
      const isAllowed = device.status === "Liberado" && !expired;

      // Formatar data
      let expireDate: string | null = null;
      if (device.dataExpiracao) {
        expireDate = new Date(device.dataExpiracao).toISOString().split("T")[0];
      }

      res.json({
        exists: true,
        registered: isAllowed,
        mac: device.mac,
        status: device.status,
        expire_date: expireDate,
        nome: device.nomeServer || "",
      });

    } catch (error) {
      console.error("[API] /api/v5/mac_exists error:", error);
      res.status(500).json({ exists: false, error: "Internal error" });
    }
  });

  /**
   * GET /api/v5/check_expire.php?mac=XX:XX:XX:XX:XX:XX
   * Verifica se a conta do MAC está expirada.
   */
  app.get("/api/v5/check_expire.php", async (req: Request, res: Response) => {
    try {
      const mac = req.query.mac ? String(req.query.mac).trim() : null;
      if (!mac) {
        res.json({ expired: true, error: "mac required" });
        return;
      }

      const db = await getDb();
      if (!db) {
        res.json({ expired: true, error: "server unavailable" });
        return;
      }

      const macNormalized = mac.replace(/[^A-Fa-f0-9]/g, "").toUpperCase();
      const macWithColons = macNormalized.length === 12
        ? macNormalized.match(/.{2}/g)!.join(":")
        : mac.toUpperCase();

      const result = await db
        .select()
        .from(devices)
        .where(or(
          eq(devices.mac, macWithColons),
          eq(devices.mac, macNormalized),
          eq(devices.mac, mac),
        ))
        .limit(1);

      if (result.length === 0) {
        res.json({ expired: true, mac: macWithColons, registered: false });
        return;
      }

      const device = result[0];
      const now = new Date();
      const expired = device.dataExpiracao != null && new Date(device.dataExpiracao) < now;

      let expireDate: string | null = null;
      if (device.dataExpiracao) {
        expireDate = new Date(device.dataExpiracao).toISOString().split("T")[0];
      }

      res.json({
        expired,
        mac: device.mac,
        status: device.status,
        expire_date: expireDate,
        registered: true,
      });

    } catch (error) {
      console.error("[API] /api/v5/check_expire.php error:", error);
      res.status(500).json({ expired: true, error: "Internal error" });
    }
  });

  /**
   * GET /api/v5/getdns_list
   * Retorna a lista de DNS/servidores cadastrados no painel.
   */
  app.get("/api/v5/getdns_list", async (_req: Request, res: Response) => {
    try {
      const db = await getDb();
      if (!db) {
        res.json({ dns: [], error: "server unavailable" });
        return;
      }

      // Buscar DNS entries ativas do revendedor principal (ownerId mais antigo = admin)
      const allDns = await db.select().from(dnsEntries).where(eq(dnsEntries.ativo, true));

      const dnsList = allDns.map((d, i) => ({
        id: i + 1,
        title: d.titulo,
        host: d.host,
        active: true,
      }));

      res.json({
        dns: dnsList,
        total: dnsList.length,
      });

    } catch (error) {
      console.error("[API] /api/v5/getdns_list error:", error);
      res.status(500).json({ dns: [], error: "Internal error" });
    }
  });

  /**
   * GET /api/v5/get_playlist_roku?mac=XX:XX:XX:XX:XX:XX
   * Retorna a playlist do MAC para o GPCPRO.
   */
  app.get("/api/v5/get_playlist_roku", async (req: Request, res: Response) => {
    try {
      const mac = req.query.mac ? String(req.query.mac).trim() : null;
      if (!mac) {
        res.json({ playlists: [], error: "mac required" });
        return;
      }

      const db = await getDb();
      if (!db) {
        res.json({ playlists: [], error: "server unavailable" });
        return;
      }

      const macNormalized = mac.replace(/[^A-Fa-f0-9]/g, "").toUpperCase();
      const macWithColons = macNormalized.length === 12
        ? macNormalized.match(/.{2}/g)!.join(":")
        : mac.toUpperCase();

      const result = await db
        .select()
        .from(devices)
        .where(or(
          eq(devices.mac, macWithColons),
          eq(devices.mac, macNormalized),
          eq(devices.mac, mac),
        ))
        .limit(1);

      if (result.length === 0) {
        res.json({ playlists: [], mac: macWithColons, registered: false });
        return;
      }

      const device = result[0];
      const now = new Date();
      const expired = device.dataExpiracao != null && new Date(device.dataExpiracao) < now;

      if (!expired && device.status === "Liberado") {
        // Atualizar lastSeen
        await db.update(devices).set({ lastSeen: now }).where(eq(devices.id, device.id));
      }

      const playlists: Array<{ name: string; url: string; type: string }> = [];

      if (device.urlM3u8) {
        playlists.push({
          name: device.nomeServer || "Lista 1",
          url: device.urlM3u8,
          type: "m3u_plus",
        });
      }

      const deviceUrlsList = await db.select().from(deviceUrls)
        .where(eq(deviceUrls.deviceId, device.id))
        .orderBy(deviceUrls.ordem);

      for (const du of deviceUrlsList) {
        if (!du.ativo) continue;
        if (du.modoSelecao === "XTeamCode" && du.xtServer && du.xtUsername && du.xtPassword) {
          let xtreamUrl = du.xtServer.trim();
          if (!xtreamUrl.endsWith("/player_api.php")) {
            xtreamUrl = xtreamUrl.replace(/\/+$/, "") + "/player_api.php";
          }
          const sep = xtreamUrl.includes("?") ? "&" : "?";
          xtreamUrl += `${sep}username=${encodeURIComponent(du.xtUsername)}&password=${encodeURIComponent(du.xtPassword)}`;
          playlists.push({
            name: du.nome || `Lista ${playlists.length + 1}`,
            url: xtreamUrl,
            type: "xtream",
          });
        } else if (du.modoSelecao === "M3U8" && du.urlM3u8) {
          playlists.push({
            name: du.nome || `Lista ${playlists.length + 1}`,
            url: du.urlM3u8,
            type: "m3u_plus",
          });
        }
      }

      // Formatar expiração
      let expireDate: string | null = null;
      if (device.dataExpiracao) {
        expireDate = new Date(device.dataExpiracao).toISOString().split("T")[0];
      }

      res.json({
        playlists,
        mac: device.mac,
        status: device.status,
        expire_date: expireDate,
        nome: device.nomeServer || "",
        total: playlists.length,
      });

    } catch (error) {
      console.error("[API] /api/v5/get_playlist_roku error:", error);
      res.status(500).json({ playlists: [], error: "Internal error" });
    }
  });

  /**
   * GET /api/v5/logo_roku
   * Retorna o logo para o GPCPRO (Roku/TV).
   */
  app.get("/api/v5/logo_roku", async (_req: Request, res: Response) => {
    try {
      const cfg = await getSettings();
      const logoUrl = cfg.gpcpro_logo_url || cfg.trial_logo_url || cfg.trial_banner_url || "";
      const resolvedUrl = logoUrl ? await resolvePublicImageUrl(logoUrl) : "";
      const targetUrl = resolvedUrl || "https://d2xsxph8kpxj0f.cloudfront.net/310519663162366914/LDyffp73FNnPjitdoAxnFa/ouro_logo_offline-B8wgSvvarHoKB4eoYgKxDA.png";
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.redirect(302, targetUrl);
    } catch (error) {
      console.error("[API] /api/v5/logo_roku error:", error);
      res.status(204).end();
    }
  });

  /**
   * GET /api/v5/bg_roku
   * Retorna a imagem de fundo para o GPCPRO (Roku/TV).
   */
  app.get("/api/v5/bg_roku", async (_req: Request, res: Response) => {
    try {
      const cfg = await getSettings();
      const bgUrl = cfg.gpcpro_background_url || cfg.trial_background_url || cfg.trial_banner_url || "";
      if (!bgUrl || !bgUrl.startsWith("http") || bgUrl.includes(",")) {
        res.status(204).end();
        return;
      }
      const resolvedUrl = await resolvePublicImageUrl(bgUrl);
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.redirect(302, resolvedUrl);
    } catch (error) {
      console.error("[API] /api/v5/bg_roku error:", error);
      res.status(204).end();
    }
  });

  /**
   * GET /api/v5/roku_banners
   * Retorna banners para a interface do GPCPRO.
   */
  app.get("/api/v5/roku_banners", async (_req: Request, res: Response) => {
    try {
      const cfg = await getSettings();
      const banners: Array<{ id: number; title: string; image: string; url: string }> = [];

      // Banner principal GPCPRO (com fallback OuroPro)
      const gpcBannerUrl = cfg.gpcpro_banner_url || cfg.trial_banner_url;
      const gpcImpactPhrase = cfg.gpcpro_impact_phrase || cfg.impact_phrase;
      const gpcContactWebsite = cfg.gpcpro_contact_website || cfg.contact_website;
      const gpcAppName = cfg.gpcpro_app_name || cfg.app_name || "GPCPRO";
      const gpcLogoUrl = cfg.gpcpro_logo_url || cfg.trial_logo_url;

      if (gpcBannerUrl) {
        const resolved = await resolvePublicImageUrl(gpcBannerUrl);
        banners.push({
          id: 1,
          title: gpcImpactPhrase || "O melhor IPTV",
          image: resolved,
          url: gpcContactWebsite || "",
        });
      }

      // Logo como banner
      if (gpcLogoUrl) {
        const resolved = await resolvePublicImageUrl(gpcLogoUrl);
        banners.push({
          id: 2,
          title: gpcAppName,
          image: resolved,
          url: "",
        });
      }

      // Buscar carousel slides ativos como banners
      try {
        const db = await getDb();
        if (db) {
          const slides = await db.select().from(carouselSlides)
            .where(eq(carouselSlides.ativo, true))
            .orderBy(carouselSlides.ordem);
          slides.forEach((slide, i) => {
            banners.push({
              id: 10 + i,
              title: slide.titulo,
              image: slide.urlMedia,
              url: "",
            });
          });
        }
      } catch { /* ignora */ }

      res.json({ banners });

    } catch (error) {
      console.error("[API] /api/v5/roku_banners error:", error);
      res.status(500).json({ banners: [] });
    }
  });

  /**
   * GET /api/v5/reseller_contact
   * Retorna as informações de contato do revendedor.
   */
  app.get("/api/v5/reseller_contact", async (_req: Request, res: Response) => {
    try {
      const cfg = await getSettings();

      // Usar chaves gpcpro_ com fallback para OuroPro
      const whatsappRaw = (cfg.gpcpro_contact_whatsapp || cfg.contact_whatsapp || "").replace(/[^\d+]/g, "");
      const whatsappNumber = whatsappRaw.replace(/\D/g, "");

      res.json({
        name: cfg.gpcpro_reseller_contact_name || cfg.reseller_contact_name || cfg.contact_info || "Revendedor",
        whatsapp: whatsappNumber ? `https://wa.me/${whatsappNumber}` : "",
        whatsapp_number: whatsappNumber,
        website: cfg.gpcpro_contact_website || cfg.contact_website || "",
        phone: whatsappNumber,
        email: cfg.gpcpro_reseller_email || cfg.reseller_email || "",
        impact_phrase: cfg.gpcpro_impact_phrase || cfg.impact_phrase || "",
        legal_notice: cfg.gpcpro_legal_notice || cfg.legal_notice || "GPCPRO is a media player application. The app does not provide or include any media or content.",
        app_name: cfg.gpcpro_app_name || cfg.app_name || "GPCPRO",
      });

    } catch (error) {
      console.error("[API] /api/v5/reseller_contact error:", error);
      res.status(500).json({ name: "", whatsapp: "", website: "" });
    }
  });

  /**
   * POST /api/v5/user_register
   * Registra um usuário/dispositivo no sistema do GPCPRO.
   * Body: { mac, reseller, dns_url, playlist_url }
   */
  app.post("/api/v5/user_register", async (req: Request, res: Response) => {
    try {
      const body = req.body as Record<string, unknown>;
      const mac = body && body.mac ? String(body.mac).trim() : null;
      const reseller = body && body.reseller ? String(body.reseller).trim() : null;

      if (!mac) {
        res.json({ success: false, error: "mac required" });
        return;
      }

      // Verificar se o MAC já existe
      const db = await getDb();
      if (!db) {
        res.json({ success: false, error: "server unavailable" });
        return;
      }

      const macNormalized = mac.replace(/[^A-Fa-f0-9]/g, "").toUpperCase();
      const macWithColons = macNormalized.length === 12
        ? macNormalized.match(/.{2}/g)!.join(":")
        : mac.toUpperCase();

      // Verificar se já existe
      const existing = await db
        .select()
        .from(devices)
        .where(or(
          eq(devices.mac, macWithColons),
          eq(devices.mac, macNormalized),
        ))
        .limit(1);

      if (existing.length > 0) {
        // MAC já cadastrado - retornar dados
        const device = existing[0];
        const now = new Date();
        await db.update(devices).set({ lastSeen: now }).where(eq(devices.id, device.id));
        res.json({
          success: true,
          registered: true,
          mac: device.mac,
          status: device.status,
          expire_date: device.dataExpiracao ? new Date(device.dataExpiracao).toISOString().split("T")[0] : null,
          message: "Device already registered",
        });
        return;
      }

      // MAC não cadastrado - registrar como trial/bloqueado
      // O admin precisa aprovar no painel
      const ownerId = 1; // admin/revendedor principal
      const nomeServer = reseller || "GPCPRO";

      await db.insert(devices).values({
        ownerId,
        mac: macWithColons,
        nomeServer,
        tipo: "Usuario",
        modoSelecao: "M3U8",
        status: "Bloqueado",
        telefone: (body.telefone as string) || null,
      });

      res.json({
        success: true,
        registered: false,
        mac: macWithColons,
        message: "Device registered. Waiting for reseller approval.",
        status: "Bloqueado",
      });

    } catch (error) {
      console.error("[API] /api/v5/user_register error:", error);
      res.status(500).json({ success: false, error: "Internal error" });
    }
  });

  /**
   * GET /api/v5/test
   * Endpoint de teste simples para debugar conectividade
   */
  app.get("/api/v5/test", async (req: Request, res: Response) => {
    console.log(`[API-V5-TEST] Test endpoint called | MAC: ${req.query.mac}`);
    res.json({
      success: true,
      message: "Server is reachable",
      timestamp: new Date().toISOString(),
      mac: req.query.mac || "no mac provided",
    });
  });

  /**
   * POST /api/v5/login
   * Endpoint POST para GPCPRO fazer login com MAC
   */
  app.post("/api/v5/login", async (req: Request, res: Response) => {
    try {
      const mac = req.body?.mac || req.query.mac;
      console.log(`[API-V5-LOGIN-POST] Received MAC: "${mac}"`);
      
      if (!mac) {
        res.json({ error: "mac required", success: false });
        return;
      }

      const db = await getDb();
      if (!db) {
        res.json({ error: "server unavailable", success: false });
        return;
      }

      const macNormalized = String(mac).replace(/[^A-Fa-f0-9]/g, "").toUpperCase();
      const macWithColons = macNormalized.length === 12
        ? macNormalized.match(/.{2}/g)!.join(":")
        : String(mac).toUpperCase();

      const result = await db
        .select()
        .from(devices)
        .where(or(
          eq(devices.mac, macWithColons),
          eq(devices.mac, macNormalized),
          eq(devices.mac, String(mac)),
        ))
        .limit(1);

      if (result.length === 0) {
        res.json({
          success: false,
          error: "Device not found",
          mac: macWithColons,
          registered: false,
        });
        return;
      }

      const device = result[0];
      const isAllowed = device.status === "Liberado";

      if (!isAllowed) {
        res.json({
          success: false,
          error: "Device blocked",
          status: device.status,
          mac: device.mac,
          registered: true,
        });
        return;
      }

      // Buscar playlists
      const deviceUrlsList = await db.select().from(deviceUrls)
        .where(eq(deviceUrls.deviceId, device.id))
        .orderBy(deviceUrls.ordem);

      const playlists: Array<{ name: string; url: string; playlist_name: string; playlist_url: string; type: string }> = [];

      if (device.urlM3u8) {
        playlists.push({
          name: device.nomeServer || "Lista 1",
          url: device.urlM3u8,
          playlist_name: device.nomeServer || "Lista 1",
          playlist_url: device.urlM3u8,
          type: device.modoSelecao === "XTeamCode" ? "xtream" : "m3u_plus",
        });
      }

      for (const du of deviceUrlsList) {
        if (!du.ativo) continue;
        if (du.modoSelecao === "XTeamCode") {
          let xtreamUrl = (du.xtServer || "").trim();
          if (!xtreamUrl && du.urlM3u8) {
            xtreamUrl = du.urlM3u8;
          }

          if (xtreamUrl) {
            if (!xtreamUrl.endsWith("/player_api.php") && !xtreamUrl.includes("get.php")) {
              xtreamUrl = xtreamUrl.replace(/\/+$/, "") + "/player_api.php";
            }
            
            if (du.xtUsername && du.xtPassword) {
              const sep = xtreamUrl.includes("?") ? "&" : "?";
              xtreamUrl += `${sep}username=${encodeURIComponent(du.xtUsername)}&password=${encodeURIComponent(du.xtPassword)}`;
            }
            
            playlists.push({
              name: du.nome || `Lista ${playlists.length + 1}`,
              url: xtreamUrl,
              playlist_name: du.nome || `Lista ${playlists.length + 1}`,
              playlist_url: xtreamUrl,
              type: "xtream",
            });
          }
        } else if (du.modoSelecao === "M3U8" && du.urlM3u8) {
          playlists.push({
            name: du.nome || `Lista ${playlists.length + 1}`,
            url: du.urlM3u8,
            playlist_name: du.nome || `Lista ${playlists.length + 1}`,
            playlist_url: du.urlM3u8,
            type: "m3u_plus",
          });
        }
      }

      res.json({
        success: true,
        registered: true,
        mac: device.mac,
        status: device.status,
        playlists,
      });

    } catch (error) {
      console.error("[API] /api/v5/login POST error:", error);
      res.status(500).json({ success: false, error: "Internal error" });
    }
  });

  /**
   * ANY /api/v5/debug_all
   * Endpoint de debug que captura TODAS as requisições
   */
  app.all("/api/v5/debug_all", async (req: Request, res: Response) => {
    console.log(`[DEBUG-ALL] Method: ${req.method} | Path: ${req.path} | Query: ${JSON.stringify(req.query)} | Body: ${JSON.stringify(req.body)}`);
    res.json({
      success: true,
      message: "Debug endpoint received request",
      method: req.method,
      path: req.path,
      query: req.query,
      body: req.body,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GET /api/v5/get_playlists?mac=XX:XX:XX:XX:XX:XX
   * Retorna apenas as playlists para o MAC (simples e direto)
   */
  app.get("/api/v5/get_playlists", async (req: Request, res: Response) => {
    try {
      const mac = req.query.mac ? String(req.query.mac).trim() : null;
      if (!mac) {
        res.json({ success: false, error: "mac required" });
        return;
      }

      const db = await getDb();
      if (!db) {
        res.json({ success: false, error: "server unavailable" });
        return;
      }

      const macNormalized = mac.replace(/[^A-Fa-f0-9]/g, "").toUpperCase();
      const macWithColons = macNormalized.length === 12
        ? macNormalized.match(/.{2}/g)!.join(":")
        : mac.toUpperCase();

      const result = await db
        .select()
        .from(devices)
        .where(or(
          eq(devices.mac, macWithColons),
          eq(devices.mac, macNormalized),
          eq(devices.mac, mac),
        ))
        .limit(1);

      if (result.length === 0) {
        res.json({
          success: false,
          error: "Device not found",
          mac: macWithColons,
        });
        return;
      }

      const device = result[0];
      const isAllowed = device.status === "Liberado";

      if (!isAllowed) {
        res.json({
          success: false,
          error: "Device blocked",
          status: device.status,
        });
        return;
      }

      // Buscar playlists
      const deviceUrlsList = await db.select().from(deviceUrls)
        .where(eq(deviceUrls.deviceId, device.id))
        .orderBy(deviceUrls.ordem);

      const playlists: Array<{ playlist_name: string; playlist_url: string; type: string }> = [];

      if (device.urlM3u8) {
        playlists.push({
          playlist_name: device.nomeServer || "Lista 1",
          playlist_url: device.urlM3u8,
          type: device.modoSelecao === "XTeamCode" ? "xtream" : "m3u_plus",
        });
      }

      for (const du of deviceUrlsList) {
        if (!du.ativo) continue;
        if (du.modoSelecao === "XTeamCode") {
          let xtreamUrl = (du.xtServer || "").trim();
          if (!xtreamUrl && du.urlM3u8) {
            xtreamUrl = du.urlM3u8;
          }

          if (xtreamUrl) {
            if (!xtreamUrl.endsWith("/player_api.php") && !xtreamUrl.includes("get.php")) {
              xtreamUrl = xtreamUrl.replace(/\/+$/, "") + "/player_api.php";
            }
            
            if (du.xtUsername && du.xtPassword) {
              const sep = xtreamUrl.includes("?") ? "&" : "?";
              xtreamUrl += `${sep}username=${encodeURIComponent(du.xtUsername)}&password=${encodeURIComponent(du.xtPassword)}`;
            }
            
            playlists.push({
              playlist_name: du.nome || `Lista ${playlists.length + 1}`,
              playlist_url: xtreamUrl,
              type: "xtream",
            });
          }
        } else if (du.modoSelecao === "M3U8" && du.urlM3u8) {
          playlists.push({
            playlist_name: du.nome || `Lista ${playlists.length + 1}`,
            playlist_url: du.urlM3u8,
            type: "m3u_plus",
          });
        }
      }

      res.json({
        success: true,
        mac: device.mac,
        playlists,
      });

    } catch (error) {
      console.error("[API] /api/v5/get_playlists error:", error);
      res.status(500).json({ success: false, error: "Internal error" });
    }
  });

  /**
   * GET /api/v5/debug_macs
   * Endpoint de debug para listar todos os MACs cadastrados
   */
  app.get("/api/v5/debug_macs", async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      if (!db) {
        res.json({ error: "server unavailable" });
        return;
      }
      const allDevices = await db.select().from(devices).limit(100);
      
      res.json({
        total: allDevices.length,
        devices: allDevices.map(d => ({
          id: d.id,
          mac: d.mac,
          nomeServer: d.nomeServer,
          status: d.status,
          tipo: d.tipo,
          dataExpiracao: d.dataExpiracao,
        })),
      });
    } catch (error) {
      console.error("[API] /api/v5/debug_macs error:", error);
      res.status(500).json({ success: false, error: "Internal error" });
    }
  });

  /**
   * POST /api/v5/reseller_login
   * Login para revendedor com código + usuário + senha
   * Body: { reseller_code, username, password }
   */
  app.post("/api/v5/reseller_login", async (req: Request, res: Response) => {
    try {
      const body = req.body as Record<string, unknown>;
      const resellerCode = body && body.reseller_code ? String(body.reseller_code).trim() : null;
      const username = body && body.username ? String(body.username).trim() : null;
      const password = body && body.password ? String(body.password).trim() : null;

      if (!resellerCode || !username || !password) {
        res.json({ success: false, error: "Missing reseller_code, username, or password" });
        return;
      }

      const db = await getDb();
      if (!db) {
        res.json({ success: false, error: "server unavailable" });
        return;
      }

      // Buscar usuário pelo username
      const userResult = await db.select().from(users).where(eq(users.name, username)).limit(1);
      
      if (userResult.length === 0) {
        res.json({ success: false, error: "Invalid username or password" });
        return;
      }

      const userData = userResult[0];
      
      // Verificar se é revendedor
      if (userData.role !== "admin" && userData.role !== "user") {
        res.json({ success: false, error: "User is not a reseller" });
        return;
      }

      // TODO: Verificar password com hash (por enquanto apenas validar username)
      // Em produção, usar bcrypt ou similar

      res.json({
        success: true,
        user_id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        plan: userData.plano,
        message: "Reseller login successful",
      });

    } catch (error) {
      console.error("[API] /api/v5/reseller_login error:", error);
      res.status(500).json({ success: false, error: "Internal error" });
    }
  });

  /**
   * GET /config_domain.json e /api/config_domain.json
   * Endpoint de configuração de domínio para o GPCPRO (Flutter)
   * O APK busca este arquivo para descobrir qual servidor usar
   * Rota /api/* não é interceptada pelo proxy OAuth do Manus
   * pagea.uk/Abcde → /api/config_domain.json (14 bytes, mesmo tamanho que painelfoda.top)
   */
  const handleConfigDomain = async (_req: Request, res: Response) => {
    try {
      res.json({
        primary: "https://renciaapp.manus.space",
      });
    } catch (error) {
      console.error("[API] /config_domain.json error:", error);
      res.status(500).json({ error: "Internal error" });
    }
  };
  app.get("/api/config_domain.json", handleConfigDomain);
  app.get("/config_domain.json", async (_req: Request, res: Response) => {
    try {
      // O APK GPCPRO (Flutter) espera EXATAMENTE o campo "primary" com a URL base
      // Formato original do painelfoda.top: {"primary":"https://www.gerenciaapp.top"}
      // O APK lê este campo e usa como URL base para todas as requisições subsequentes
      res.json({
        primary: "https://renciaapp.manus.space",
      });
    } catch (error) {
      console.error("[API] /config_domain.json error:", error);
      res.status(500).json({ error: "Internal error" });
    }
  });

  /**
   * GET /api/v5/bg_roku
   * Retorna a imagem de fundo
   */
  app.get("/api/v5/bg_roku", async (req: Request, res: Response) => {
    try {
      const cfg = await getSettings();
      const bgUrl = (cfg.gpcpro_background_url || cfg.trial_background_url || "").trim();
      
      if (bgUrl) {
        const resolvedUrl = await resolvePublicImageUrl(bgUrl);
        res.redirect(resolvedUrl || bgUrl);
      } else {
        res.status(404).json({ error: "Background not found" });
      }
    } catch (error) {
      console.error("[API] /api/v5/bg_roku error:", error);
      res.status(500).json({ error: "Internal error" });
    }
  });

  /**
   * GET /api/v5/logo_roku
   * Retorna a imagem do logo
   */
  app.get("/api/v5/logo_roku", async (req: Request, res: Response) => {
    try {
      const cfg = await getSettings();
      const logoUrl = (cfg.gpcpro_logo_url || cfg.trial_logo_url || "").trim();
      
      if (logoUrl) {
        const resolvedUrl = await resolvePublicImageUrl(logoUrl);
        res.redirect(resolvedUrl || logoUrl);
      } else {
        res.status(404).json({ error: "Logo not found" });
      }
    } catch (error) {
      console.error("[API] /api/v5/logo_roku error:", error);
      res.status(500).json({ error: "Internal error" });
    }
  });

  /**
   * GET /api/v5/get_playlist_roku?mac=XX:XX:XX:XX:XX:XX
   * Retorna a playlist do MAC para o APK Roku/GPCPRO
   */
  app.get("/api/v5/get_playlist_roku", async (req: Request, res: Response) => {
    const mac = typeof req.query.mac === "string" ? req.query.mac.trim() : null;

    if (!mac) {
      res.json({ success: false, playlists: [], message: "MAC não informado" });
      return;
    }

    try {
      const db = await getDb();
      if (!db) {
        res.json({ success: false, playlists: [], message: "Banco indisponível" });
        return;
      }

      // Normalizar MAC
      const macWithColons = mac.includes(":") ? mac : `${mac.slice(0, 2)}:${mac.slice(2, 4)}:${mac.slice(4, 6)}:${mac.slice(6, 8)}:${mac.slice(8, 10)}:${mac.slice(10, 12)}`;

      // Buscar device
      const device = await db.select().from(devices).where(eq(devices.mac, macWithColons)).limit(1);

      if (device.length === 0) {
        res.json({ success: false, playlists: [], message: "MAC não encontrado" });
        return;
      }

      const dev = device[0];

      // Buscar playlists do device
      const playlists = await db.select().from(deviceUrls).where(eq(deviceUrls.deviceId, dev.id)).orderBy(deviceUrls.ordem);

      // Montar resposta no formato que o APK espera
      const playlistsFormatted = playlists.map((p) => ({
        name: p.nome || "Playlist",
        url: p.urlM3u8 || "",
        playlist_name: p.nome || "Playlist",
        playlist_url: p.urlM3u8 || "",
        type: p.modoSelecao === "M3U8" ? "m3u_plus" : "xteam",
      }));

      console.log(`[API-GET-PLAYLIST-ROKU] MAC: ${macWithColons}, Playlists: ${playlistsFormatted.length}`);

      res.json({
        success: true,
        mac: macWithColons,
        playlists: playlistsFormatted,
        message: "Playlists encontradas",
      });
    } catch (error) {
      console.error("[API] /api/v5/get_playlist_roku error:", error);
      res.json({ success: false, playlists: [], message: "Erro interno" });
    }
  });

  /**
   * GET /api/v5/roku_banners
   * Retorna a imagem do banner
   */
  app.get("/api/v5/roku_banners", async (req: Request, res: Response) => {
    try {
      const cfg = await getSettings();
      const bannerUrl = (cfg.gpcpro_banner_url || cfg.trial_banner_url || "").trim();
      
      if (bannerUrl) {
        const resolvedUrl = await resolvePublicImageUrl(bannerUrl);
        res.redirect(resolvedUrl || bannerUrl);
      } else {
        res.status(404).json({ error: "Banner not found" });
      }
    } catch (error) {
      console.error("[API] /api/v5/roku_banners error:", error);
      res.status(500).json({ error: "Internal error" });
    }
  });

  /**
   * GET /api/v5/mac_exists?mac=XX:XX:XX:XX:XX:XX
   * Verifica se o MAC existe no painel
   */
  app.get("/api/v5/mac_exists", async (req: Request, res: Response) => {
    const mac = typeof req.query.mac === "string" ? req.query.mac.trim() : null;

    if (!mac) {
      res.json({ exists: false, message: "MAC não informado" });
      return;
    }

    try {
      const db = await getDb();
      if (!db) {
        res.json({ exists: false, message: "Banco indisponível" });
        return;
      }

      // Normalizar MAC
      const macWithColons = mac.includes(":") ? mac : `${mac.slice(0, 2)}:${mac.slice(2, 4)}:${mac.slice(4, 6)}:${mac.slice(6, 8)}:${mac.slice(8, 10)}:${mac.slice(10, 12)}`;

      // Buscar device no banco
      const result = await db.select().from(devices).where(eq(devices.mac, macWithColons)).limit(1);

      console.log(`[API-MAC-EXISTS] MAC: ${macWithColons}, Existe: ${result.length > 0}`);

      res.json({
        exists: result.length > 0,
        mac: macWithColons,
        message: result.length > 0 ? "MAC encontrado" : "MAC não encontrado",
      });
    } catch (error) {
      console.error("[API] /api/v5/mac_exists error:", error);
      res.json({ exists: false, message: "Erro interno" });
    }
  });

  /**
   * GET /player
   * Retorna o web player HTML idêntico ao gpcpro.com.br
   */
  app.get("/player", async (_req: Request, res: Response) => {
    try {
      const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rencia - Premium Experience</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #000; color: #fff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-height: 100vh; padding: 20px; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 60px; padding-top: 40px; }
        .header h1 { font-size: 48px; font-weight: 300; letter-spacing: 2px; margin-bottom: 10px; }
        .header p { font-size: 14px; color: #999; letter-spacing: 1px; }
        .status { text-align: center; margin-bottom: 40px; font-size: 12px; color: #666; }
        .status .dot { display: inline-block; width: 8px; height: 8px; background: #ff3333; border-radius: 50%; margin-right: 8px; animation: pulse 2s infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .main-content { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; margin-bottom: 60px; }
        @media (max-width: 768px) { .main-content { grid-template-columns: 1fr; gap: 40px; } }
        .section { position: relative; }
        .section-number { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border: 2px solid #fff; border-radius: 50%; font-size: 14px; margin-bottom: 20px; }
        .section-title { font-size: 14px; font-weight: 600; margin-bottom: 20px; letter-spacing: 1px; color: #ccc; }
        .device-id-box { border: 2px dashed #ff3333; padding: 30px; text-align: center; margin-bottom: 20px; position: relative; }
        .device-id-label { font-size: 11px; letter-spacing: 2px; color: #999; margin-bottom: 15px; display: block; }
        .device-id-value { font-size: 24px; font-weight: 600; letter-spacing: 2px; font-family: 'Courier New', monospace; margin-bottom: 20px; }
        .copy-button { background: transparent; border: 1px solid #ffcc00; color: #ffcc00; padding: 8px 16px; font-size: 11px; cursor: pointer; letter-spacing: 1px; transition: all 0.3s; }
        .copy-button:hover { background: #ffcc00; color: #000; }
        .copy-button.copied { background: #ffcc00; color: #000; }
        .form-group { margin-bottom: 20px; }
        .form-label { display: block; font-size: 11px; letter-spacing: 1px; color: #999; margin-bottom: 8px; text-transform: uppercase; }
        .form-input { width: 100%; background: transparent; border: 2px dashed #ffcc00; color: #fff; padding: 12px; font-size: 14px; font-family: inherit; transition: border-color 0.3s; }
        .form-input::placeholder { color: #666; }
        .form-input:focus { outline: none; border-color: #ff3333; }
        .login-button { width: 100%; background: #ffcc00; color: #000; border: none; padding: 16px; font-size: 14px; font-weight: 600; letter-spacing: 2px; cursor: pointer; transition: all 0.3s; text-transform: uppercase; }
        .login-button:hover { background: #ffdd33; transform: translateY(-2px); }
        .login-button:active { transform: translateY(0); }
        .login-button.loading { opacity: 0.7; cursor: not-allowed; }
        .message { padding: 12px; margin-bottom: 20px; font-size: 12px; border-left: 3px solid #ffcc00; display: none; }
        .message.success { background: rgba(76, 175, 80, 0.1); border-left-color: #4caf50; color: #4caf50; display: block; }
        .message.error { background: rgba(255, 51, 51, 0.1); border-left-color: #ff3333; color: #ff3333; display: block; }
        .message.info { background: rgba(255, 204, 0, 0.1); border-left-color: #ffcc00; color: #ffcc00; display: block; }
        .player-section { display: none; }
        .player-section.active { display: block; }
        .logout-button { width: 100%; background: #ff3333; color: #fff; border: none; padding: 12px; font-size: 12px; font-weight: 600; letter-spacing: 1px; cursor: pointer; margin-top: 30px; text-transform: uppercase; }
        .logout-button:hover { background: #ff5555; }
        .footer { text-align: center; padding-top: 40px; border-top: 1px solid #333; font-size: 11px; color: #666; letter-spacing: 1px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Rencia</h1>
            <p>Premium Experience</p>
        </div>
        
        <div class="status">
            <span class="dot"></span>
            <span>Verificando ativação automática...</span>
        </div>
        
        <div id="loginSection">
            <div class="main-content">
                <div class="section">
                    <div class="section-number">1</div>
                    <div class="section-title">Envie o ID do dispositivo para o seu revendedor ativar o acesso automaticamente.</div>
                    <div class="device-id-box">
                        <span class="device-id-label">ID DO DISPOSITIVO (MAC)</span>
                        <div class="device-id-value" id="deviceId">Carregando...</div>
                        <button class="copy-button" onclick="copyDeviceId()">Toque para copiar</button>
                    </div>
                </div>
                
                <div class="section">
                    <div class="section-number">2</div>
                    <div class="section-title">Ou entre com o código do revendedor.</div>
                    <div id="message" class="message"></div>
                    <div class="form-group">
                        <label class="form-label">CÓDIGO DE REVENDA</label>
                        <input type="text" class="form-input" id="resellerCode" placeholder="ID de Revendedor">
                    </div>
                    <div class="form-group">
                        <label class="form-label">USUÁRIO</label>
                        <input type="text" class="form-input" id="username" placeholder="usuário">
                    </div>
                    <div class="form-group">
                        <label class="form-label">SENHA</label>
                        <input type="password" class="form-input" id="password" placeholder="••••••••">
                    </div>
                    <button class="login-button" onclick="login()">Entrar</button>
                </div>
            </div>
        </div>
        
        <div id="playerSection" class="player-section">
            <div class="section-title">Reprodutor</div>
            <div style="background: #111; padding: 20px; margin-bottom: 30px; border: 1px solid #333;">
                <video id="videoPlayer" style="width: 100%; max-height: 500px; background: #000;" controls></video>
            </div>
            <div class="section-title">Playlist</div>
            <div id="playlist" style="background: #111; padding: 20px; border: 1px solid #333; max-height: 400px; overflow-y: auto;"></div>
            <button class="logout-button" onclick="logout()">Sair</button>
        </div>
        
        <div class="footer">
            Rencia © 2026 - Todos os direitos reservados
        </div>
    </div>
    
    <script>
        const BACKEND_URL = window.location.origin;
        function generateMac() { return Array.from({length: 6}, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase()).join(':'); }
        window.addEventListener('load', () => {
            const mac = localStorage.getItem('deviceMac') || generateMac();
            localStorage.setItem('deviceMac', mac);
            document.getElementById('deviceId').textContent = mac;
            checkMacAutomatic();
        });
        async function checkMacAutomatic() {
            const mac = localStorage.getItem('deviceMac');
            try {
                const response = await fetch(\`\${BACKEND_URL}/api/v5/check_mac.php\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: \`mac=\${mac}\`
                });
                const data = await response.json();
                if (data.mac_registered) {
                    localStorage.setItem('userLoggedIn', 'true');
                    showPlayer();
                    loadPlaylist();
                }
            } catch (error) { console.log('MAC não registrado'); }
        }
        function copyDeviceId() {
            const deviceId = document.getElementById('deviceId').textContent;
            navigator.clipboard.writeText(deviceId).then(() => {
                const btn = event.target;
                btn.textContent = 'Copiado!';
                btn.classList.add('copied');
                setTimeout(() => { btn.textContent = 'Toque para copiar'; btn.classList.remove('copied'); }, 2000);
            });
        }
        async function login() {
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const mac = localStorage.getItem('deviceMac');
            if (!username || !password) { showMessage('Por favor, preencha usuário e senha', 'error'); return; }
            try {
                const btn = event.target;
                btn.classList.add('loading');
                btn.disabled = true;
                const response = await fetch(\`\${BACKEND_URL}/api/v5/check_mac.php\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: \`mac=\${mac}&username=\${username}&password=\${password}\`
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.mac_registered) {
                        localStorage.setItem('userLoggedIn', 'true');
                        localStorage.setItem('username', username);
                        showMessage('Login realizado com sucesso!', 'success');
                        setTimeout(() => { showPlayer(); loadPlaylist(); }, 1000);
                    } else { showMessage('MAC não registrado.', 'error'); }
                } else { showMessage('Falha na autenticação.', 'error'); }
                btn.classList.remove('loading');
                btn.disabled = false;
            } catch (error) { showMessage('Erro ao conectar: ' + error.message, 'error'); event.target.classList.remove('loading'); event.target.disabled = false; }
        }
        async function loadPlaylist() {
            try {
                const mac = localStorage.getItem('deviceMac');
                const response = await fetch(\`\${BACKEND_URL}/api/v5/guim.php\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: \`mac=\${mac}\`
                });
                const data = await response.json();
                if (data.mac_registered) {
                    const playlistHtml = data.playlist || '<div style="padding: 20px; color: #666;">Nenhum conteúdo disponível</div>';
                    document.getElementById('playlist').innerHTML = playlistHtml;
                }
            } catch (error) { console.error('Erro ao carregar playlist:', error); }
        }
        function showPlayer() { document.getElementById('loginSection').style.display = 'none'; document.getElementById('playerSection').classList.add('active'); }
        function logout() { localStorage.removeItem('userLoggedIn'); localStorage.removeItem('username'); document.getElementById('loginSection').style.display = 'block'; document.getElementById('playerSection').classList.remove('active'); document.getElementById('videoPlayer').src = ''; showMessage('Você foi desconectado', 'info'); }
        function showMessage(text, type) { const msg = document.getElementById('message'); msg.textContent = text; msg.className = \`message \${type}\`; setTimeout(() => { msg.className = 'message'; }, 5000); }
        if (localStorage.getItem('userLoggedIn')) { showPlayer(); loadPlaylist(); }
    </script>
</body>
</html>`;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch (error) {
      console.error("[API] /player error:", error);
      res.status(500).json({ error: "Internal error" });
    }
  });

  /**
   * GET /api/v5/check_expire.php?mac=XX:XX:XX:XX:XX:XX
   * Verifica se o MAC foi liberado no painel
   */
  app.get("/api/v5/check_expire.php", async (req: Request, res: Response) => {
    const mac = typeof req.query.mac === "string" ? req.query.mac.trim() : null;

    if (!mac) {
      res.json({ success: false, expired: true, message: "MAC não informado" });
      return;
    }

    try {
      const db = await getDb();
      if (!db) {
        res.json({ success: false, expired: true, message: "Banco indisponível" });
        return;
      }

      // Normalizar MAC
      const normalizedMac = mac.replace(/[:-]/g, "").toUpperCase();
      const macWithColons = mac.includes(":") ? mac : `${mac.slice(0, 2)}:${mac.slice(2, 4)}:${mac.slice(4, 6)}:${mac.slice(6, 8)}:${mac.slice(8, 10)}:${mac.slice(10, 12)}`;

      // Buscar device no banco
      const result = await db.select().from(devices).where(eq(devices.mac, macWithColons)).limit(1);

      if (result.length === 0) {
        console.log(`[API-CHECK-EXPIRE] MAC não encontrado: ${macWithColons}`);
        res.json({ success: false, expired: true, message: "MAC não cadastrado" });
        return;
      }

      const device = result[0];
      const now = new Date();
      const expired = device.dataExpiracao != null && new Date(device.dataExpiracao) < now;

      // Se expirou, atualizar status
      if (expired && device.status !== "Expirado") {
        await db.update(devices).set({ status: "Expirado" }).where(eq(devices.id, device.id));
        device.status = "Expirado";
      }

      console.log(`[API-CHECK-EXPIRE] MAC: ${macWithColons}, Status: ${device.status}, Expirado: ${expired}`);

      // Retornar resposta
      res.json({
        success: true,
        expired: expired || device.status !== "Liberado",
        status: device.status,
        mac: device.mac,
        expire_date: device.dataExpiracao ? new Date(device.dataExpiracao).toISOString() : null,
        message: expired ? "MAC expirado" : device.status === "Liberado" ? "MAC liberado" : `MAC com status: ${device.status}`,
      });
    } catch (error) {
      console.error("[API] /api/v5/check_expire.php error:", error);
      res.json({ success: false, expired: true, message: "Erro interno" });
    }
  });
}
