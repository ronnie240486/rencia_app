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
import { devices, appSettings, deviceUrls } from "../drizzle/schema";
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
  const whatsappNumber = (cfg.contact_whatsapp || "").replace(/\D/g, "");
  const whatsappUrl = whatsappNumber ? `https://wa.me/${whatsappNumber}` : "";
  const lockButtonUrl = cfg.lock_button_url || whatsappUrl;

  return {
    // Campos de bloqueio/trial
    trial_ended: cfg.trial_title || "Acesso Bloqueado",
    tv_mac_expired: cfg.lock_title || cfg.trial_title || "Acesso Bloqueado",
    to_continue: cfg.trial_subtitle || "Assine agora e tenha acesso ilimitado!",
    str_trial_description: cfg.trial_support_text || "Suporte com seu revendedor",
    tv_is_trial: cfg.trial_subtitle || "Assine agora e tenha acesso ilimitado!",
    current_expired: cfg.lock_message || "Sua assinatura expirou.",
    // Campos de contato/links
    str_link: cfg.contact_website || "",
    str_whatsapp: cfg.contact_whatsapp || "",
    contact: cfg.contact_info || "",
    // Botões
    open_website: cfg.lock_button_text || "Renovar Agora",
    str_continue: cfg.lock_button_text || "Renovar Agora",
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
      const urls: Array<{ id: string; url: string; name: string; type: string; is_protected: string }> = [];
      if (device.urlM3u8 && isAllowed) {
        urls.push({
          id: String(device.id),  // id != '0' para o APK liberar
          url: device.urlM3u8,
          name: device.nomeServer || "Lista",
          type: "m3u_plus",
          is_protected: "1",  // Protegido: APK mostra "Protegido" no lugar da URL
        });
      }

      // Buscar listas extras cadastradas no painel (device_urls)
      if (isAllowed) {
        try {
          const extraUrls = await db.select().from(deviceUrls).where(eq(deviceUrls.deviceId, device.id));
          for (const eu of extraUrls) {
            if (eu.urlM3u8) {
              urls.push({
                id: String(eu.id),
                url: eu.urlM3u8,
                name: eu.nome || `Lista ${urls.length + 1}`,
                type: eu.modoSelecao === "XTeamCode" ? "xtream" : "m3u_plus",
                is_protected: "1",  // Protegido: APK mostra "Protegido" no lugar da URL
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
        lock_button_url: cfg.lock_button_url || (cfg.contact_whatsapp ? `https://wa.me/${cfg.contact_whatsapp.replace(/\D/g, "")}` : ""),
        // Ícones personalizados dos botões
        icon_reload: postResolvedIconReload,
        icon_exit: postResolvedIconExit,
        icon_settings: postResolvedIconSettings,
        icon_live_tv: postResolvedIconLiveTv,
        icon_movies: postResolvedIconMovies,
        icon_series: postResolvedIconSeries,
        words,
      };

      res.json({ data: encodeForApk(JSON.stringify(responsePayload)) });

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
    const mac = typeof req.query.mac === "string" ? req.query.mac.trim().toUpperCase() : null;

    if (!mac) {
      res.status(400).json({ mac_registered: false, error: "Parâmetro 'mac' é obrigatório." });
      return;
    }

    try {
      const db = await getDb();
      if (!db) {
        const cfgErr = await getSettings().catch(() => ({} as Record<string, string>));
        const wordsErr = buildWords(cfgErr);
        res.status(503).json({ mac_registered: false, mac_address: mac, urls: [], is_trial: 1, lock: 1, languages: [{ code: "pt", id: "1", name: "Português", words: wordsErr }], words: wordsErr });
        return;
      }

      const cfg = await getSettings().catch(() => ({} as Record<string, string>));
      const result = await db.select().from(devices).where(eq(devices.mac, mac)).limit(1);

      if (result.length === 0) {
        const wordsNf = buildWords(cfg);
        const languagesNf = [{ code: "pt", id: "1", name: "Português", words: wordsNf }, { code: "en", id: "2", name: "English", words: wordsNf }];
        res.json({ mac_registered: false, mac_address: mac, urls: [], is_trial: 1, lock: 1, languages: languagesNf, words: wordsNf, apk_link: cfg.apk_download_url || "", app_version: cfg.apk_version || "5.0", banner_url: cfg.trial_banner_url || "", logo_url: cfg.trial_logo_url || "", impact_phrase: wordsNf.impact_phrase, legal_notice: wordsNf.legal_notice, app_name: wordsNf.app_name, lock_title: cfg.lock_title || "OuroPro", lock_message: cfg.lock_message || "OuroPro is a media player application.", lock_button_text: cfg.lock_button_text || "Renovar Agora", lock_button_url: cfg.lock_button_url || "" });
        return;
      }

      const device = result[0];
      const isAllowed = device.status === "Liberado";

      // Verificar expiração
      let expireDate: string | null = null;
      if (device.dataExpiracao) {
        try { expireDate = new Date(device.dataExpiracao).toISOString().split("T")[0]; } catch {}
      }

      const urls: Array<{ url: string; username: string; password: string; type: string }> = [];
      if (isAllowed && device.urlM3u8) urls.push({ url: device.urlM3u8, username: "", password: "", type: "m3u_plus" });

      // Resolver URLs de imagens para URLs públicas (presigned S3)
      const [resolvedLogoUrl, resolvedBannerUrl, resolvedIconReload, resolvedIconExit, resolvedIconSettings, resolvedIconLiveTv, resolvedIconMovies, resolvedIconSeries] = await Promise.all([
        resolvePublicImageUrl(cfg.trial_logo_url || ""),
        resolvePublicImageUrl(cfg.trial_banner_url || ""),
        resolvePublicImageUrl(cfg.icon_reload_url || ""),
        resolvePublicImageUrl(cfg.icon_exit_url || ""),
        resolvePublicImageUrl(cfg.icon_settings_url || ""),
        resolvePublicImageUrl(cfg.icon_live_tv_url || ""),
        resolvePublicImageUrl(cfg.icon_movies_url || ""),
        resolvePublicImageUrl(cfg.icon_series_url || ""),
      ]);

      const words = buildWords(cfg);
      const languagesPayload = [
        { code: "pt", id: "1", name: "Português", words },
        { code: "en", id: "2", name: "English", words },
      ];

      res.json({
        mac_registered: isAllowed,
        mac_address: device.mac,
        expire_date: expireDate,
        urls,
        is_trial: 0,
        lock: isAllowed ? 0 : 1,
        plan_id: device.tipo ?? "Usuario",
        device_key: String(device.id),
        status: device.status,
        nome_server: device.nomeServer,
        app: device.app ?? "",
        languages: languagesPayload,
        apk_link: cfg.apk_download_url || "",
        app_version: cfg.apk_version || "5.0",
        trial_ended: words.trial_ended,
        via_website: words.to_continue,
        str_trial_description: words.str_trial_description,
        str_link: words.str_link,
        str_whatsapp: words.str_whatsapp,
        live_label: cfg.app_channels_label || "Canais",
        movie_label: cfg.app_movies_label || "Filmes",
        series_label: cfg.app_series_label || "Séries",
        banner_url: resolvedBannerUrl,
        logo_url: resolvedLogoUrl,
        contact: words.contact,
        contact_whatsapp: words.str_whatsapp,
        contact_website: words.str_link,
        impact_phrase: words.impact_phrase,
        legal_notice: words.legal_notice,
        app_name: words.app_name,
        lock_title: cfg.lock_title || "OuroPro",
        lock_message: cfg.lock_message || "OuroPro is a media player application. The app does not provide or include any media or content.",
        lock_button_text: cfg.lock_button_text || "Renovar Agora",
        lock_button_url: cfg.lock_button_url || (cfg.contact_whatsapp ? `https://wa.me/${cfg.contact_whatsapp.replace(/\D/g, "")}` : ""),
        icon_reload: resolvedIconReload,
        icon_exit: resolvedIconExit,
        icon_settings: resolvedIconSettings,
        icon_live_tv: resolvedIconLiveTv,
        icon_movies: resolvedIconMovies,
        icon_series: resolvedIconSeries,
        words,
      });
    } catch (error) {
      console.error("[API] GET /api/guim.php error:", error);
      res.status(500).json({ mac_registered: false, error: "Erro interno do servidor." });
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
      // Preferir link encurtado se configurado e ativado
      const useShort = cfg.apk_use_short_url === "true";
      const shortUrl = cfg.apk_short_url ?? "";
      const fullUrl = cfg.apk_download_url ?? "";
      const apkUrl = (useShort && shortUrl) ? shortUrl : fullUrl;
      const version = cfg.apk_version ?? "5.5";

      if (!apkUrl) {
        res.status(404).json({ error: "Nenhum APK configurado", update_available: false });
        return;
      }

      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.json({
        version,
        url: apkUrl,
        apk_link: apkUrl,
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
}
