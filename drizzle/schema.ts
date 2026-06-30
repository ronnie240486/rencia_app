import { boolean, decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar, date } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  lastLoginDate: date("lastLoginDate").default(sql`CURDATE()`).notNull(), // Data do último login para logout automático diário
  isActive: boolean("isActive").default(true).notNull(),
  telefone: varchar("telefone", { length: 32 }),
  avatarUrl: text("avatarUrl"),
  bannerUrl: text("bannerUrl"),
  // Plan info
  plano: varchar("plano", { length: 64 }).default("Revenda"),
  planValidade: date("planValidade"),
  limiteDevices: int("limiteDevices").default(999),
  // Hierarquia de revendas: quem criou este usuário/revendedor
  resellerId: int("resellerId"),
  // Limite de revendas que este usuário pode criar
  limiteRevendas: int("limiteRevendas").default(0),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const devices = mysqlTable("devices", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  mac: varchar("mac", { length: 64 }).notNull().unique(),
  nomeServer: varchar("nomeServer", { length: 255 }).notNull(),
  tipo: mysqlEnum("tipo", ["Usuario", "Revenda", "Master"]).default("Usuario").notNull(),
  modoSelecao: mysqlEnum("modoSelecao", ["XTeamCode", "M3U8"]).default("XTeamCode").notNull(),
  app: varchar("app", { length: 128 }),
  appType: mysqlEnum("appType", ["OuroPro", "InteractivePro"]).default("OuroPro").notNull(),
  urlM3u8: text("urlM3u8"),
  urlEpg: text("urlEpg"),
  valor: decimal("valor", { precision: 10, scale: 2 }),
  status: mysqlEnum("status", ["Liberado", "Bloqueado", "Expirado"]).default("Liberado").notNull(),
  dataCadastro: timestamp("dataCadastro").defaultNow().notNull(),
  dataExpiracao: date("dataExpiracao"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSeen: timestamp("lastSeen"),
  currentContent: text("currentContent"), // canal/série/filme que está assistindo
  telefone: varchar("telefone", { length: 32 }),
});

export type Device = typeof devices.$inferSelect;
export type InsertDevice = typeof devices.$inferInsert;

// Múltiplas listas (URLs) por dispositivo
export const deviceUrls = mysqlTable("device_urls", {
  id: int("id").autoincrement().primaryKey(),
  deviceId: int("deviceId").notNull(),
  nome: varchar("nome", { length: 128 }).notNull().default("Lista 1"),
  modoSelecao: mysqlEnum("modoSelecao", ["XTeamCode", "M3U8"]).default("XTeamCode").notNull(),
  urlM3u8: text("urlM3u8"),
  // Campos XteamCode separados
  xtServer: text("xtServer"),
  xtUsername: varchar("xtUsername", { length: 255 }),
  xtPassword: varchar("xtPassword", { length: 255 }),
  ordem: int("ordem").default(0).notNull(),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DeviceUrl = typeof deviceUrls.$inferSelect;
export type InsertDeviceUrl = typeof deviceUrls.$inferInsert;

export const apps = mysqlTable("apps", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 128 }).notNull(),
  iconeUrl: text("iconeUrl"),
  totalClientes: int("totalClientes").default(0).notNull(),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type App = typeof apps.$inferSelect;
export type InsertApp = typeof apps.$inferInsert;

// Configurações globais do app (tela Trial, textos, imagens)
export const appSettings = mysqlTable("app_settings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 128 }).notNull().unique(),
  value: text("value"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AppSetting = typeof appSettings.$inferSelect;
export type InsertAppSetting = typeof appSettings.$inferInsert;

// Tabela de DNS cadastradas pelo revendedor
export const dnsEntries = mysqlTable("dns_entries", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  titulo: varchar("titulo", { length: 128 }).notNull(),
  host: varchar("host", { length: 512 }).notNull(), // Ex: http://servidor.com ou http://servidor.com:8080
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type DnsEntry = typeof dnsEntries.$inferSelect;
export type InsertDnsEntry = typeof dnsEntries.$inferInsert;

// Carousel de imagens/vídeos para o app OuroPro
export const carouselSlides = mysqlTable("carousel_slides", {
  id: int("id").autoincrement().primaryKey(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  descricao: text("descricao"),
  tipo: mysqlEnum("tipo", ["image", "video"]).default("image").notNull(),
  urlMedia: text("urlMedia").notNull(), // URL da imagem ou vídeo
  ordem: int("ordem").default(0).notNull(),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CarouselSlide = typeof carouselSlides.$inferSelect;
export type InsertCarouselSlide = typeof carouselSlides.$inferInsert;

// Configurações do carousel (intervalo de auto-play, etc)
export const carouselConfig = mysqlTable("carousel_config", {
  id: int("id").autoincrement().primaryKey(),
  autoplay: boolean("autoplay").default(true).notNull(),
  autoplayInterval: int("autoplayInterval").default(5000).notNull(), // em milissegundos
  impactPhrase: text("impactPhrase").default("O melhor IPTV sempre"),
  contactPhrase: text("contactPhrase").default("Contate seu revenda"),
  legalNotice: text("legalNotice").default("OuroPro is a media player application. The app does not provide or include any media or content."),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CarouselConfig = typeof carouselConfig.$inferSelect;
export type InsertCarouselConfig = typeof carouselConfig.$inferInsert;

// Sugestões de melhorias de master/revenda
export const suggestions = mysqlTable("suggestions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  telefone: varchar("telefone", { length: 32 }),
  email: varchar("email", { length: 320 }),
  sugestao: text("sugestao").notNull(),
  status: mysqlEnum("status", ["novo", "lido", "respondido"]).default("novo").notNull(),
  resposta: text("resposta"),
  criadoEm: timestamp("criadoEm").defaultNow().notNull(),
  respondidoEm: timestamp("respondidoEm"),
});

export type Suggestion = typeof suggestions.$inferSelect;
export type InsertSuggestion = typeof suggestions.$inferInsert;

// Avisos do ultra master para todos os master/revenda
export const notices = mysqlTable("notices", {
  id: int("id").autoincrement().primaryKey(),
  autorId: int("autorId").notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  conteudo: text("conteudo").notNull(),
  ativo: boolean("ativo").default(true).notNull(),
  criadoEm: timestamp("criadoEm").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizadoEm").defaultNow().onUpdateNow().notNull(),
});

export type Notice = typeof notices.$inferSelect;
export type InsertNotice = typeof notices.$inferInsert;

// Configurações do InteractivePro (app alternativo com banners dinâmicos)
export const interactiveConfig = mysqlTable("interactive_config", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  backgroundUrl: text("backgroundUrl"), // Imagem de fundo personalizável
  appName: varchar("appName", { length: 128 }).default("InteractivePro").notNull(),
  appLogo: text("appLogo"), // Logo customizado
  autoplayInterval: int("autoplayInterval").default(5000).notNull(), // Intervalo de carousel em ms
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type InteractiveConfig = typeof interactiveConfig.$inferSelect;
export type InsertInteractiveConfig = typeof interactiveConfig.$inferInsert;

// Banners do carousel para InteractivePro
export const interactiveBanners = mysqlTable("interactive_banners", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  descricao: text("descricao"),
  tipo: mysqlEnum("tipo", ["image", "video"]).default("image").notNull(),
  urlMedia: text("urlMedia").notNull(), // URL da imagem ou vídeo
  duracao: int("duracao").default(5).notNull(), // Duração em segundos (para vídeos)
  ordem: int("ordem").default(0).notNull(),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type InteractiveBanner = typeof interactiveBanners.$inferSelect;
export type InsertInteractiveBanner = typeof interactiveBanners.$inferInsert;

// Sugestões de Conteúdo para InteractivePro
export const contentSuggestions = mysqlTable("content_suggestions", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  tipo: mysqlEnum("tipo", ["filme", "serie", "novela", "desenho"]).notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  descricao: text("descricao"),
  urlCapa: text("urlCapa"), // URL da imagem de capa
  urlTrailer: text("urlTrailer"), // URL do trailer
  genero: varchar("genero", { length: 128 }),
  ano: int("ano"),
  classificacao: varchar("classificacao", { length: 32 }), // Ex: 12+, 16+, 18+
  duracao: int("duracao"), // Em minutos
  ativo: boolean("ativo").default(true).notNull(),
  ordem: int("ordem").default(0).notNull(), // Para ordenação na exibição
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ContentSuggestion = typeof contentSuggestions.$inferSelect;
export type InsertContentSuggestion = typeof contentSuggestions.$inferInsert;

// Logo animado com som para introdução
export const appIntroConfig = mysqlTable("app_intro_config", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  logoUrl: text("logoUrl"), // URL do logo animado
  soundUrl: text("soundUrl"), // URL do som
  duracao: int("duracao").default(3000).notNull(), // Duração em ms
  habilitado: boolean("habilitado").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AppIntroConfig = typeof appIntroConfig.$inferSelect;
export type InsertAppIntroConfig = typeof appIntroConfig.$inferInsert;
