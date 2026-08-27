import { boolean, decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar, date } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  passwordHash: text("passwordHash"),
  loginMethod: varchar("loginMethod", { length: 64 }).default("email_password"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  lastLoginDate: date("lastLoginDate").default(sql`CURDATE()`).notNull(), // Data do último login para logout automático diário
  isActive: boolean("isActive").default(true).notNull(),
  telefone: varchar("telefone", { length: 32 }),
  avatarUrl: text("avatarUrl"),
  bannerUrl: text("bannerUrl"),
  // App que o usuário usa
  app: varchar("app", { length: 128 }),
  // Plan info
  plano: varchar("plano", { length: 64 }).default("Revenda"),
  planValidade: date("planValidade"),
  limiteDevices: int("limiteDevices").default(999),
  // Hierarquia de revendas: quem criou este usuário/revendedor
  resellerId: int("resellerId"),
  // Limite de revendas que este usuário pode criar
  limiteRevendas: int("limiteRevendas").default(0),
  // Senha de revenda (apenas para revendas)
  senhaRevenda: text("senhaRevenda"),
  // Marca se é o dono/proprietário do sistema
  isOwner: boolean("isOwner").default(false).notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Ferramentas adicionais liberadas individualmente pelo proprietário para um Master ou Revenda.
export const resellerPermissions = mysqlTable("reseller_permissions", {
  id: int("id").autoincrement().primaryKey(),
  resellerId: int("resellerId").notNull().unique(),
  permissions: text("permissions").notNull(),
  updatedBy: int("updatedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ResellerPermission = typeof resellerPermissions.$inferSelect;

export const devices = mysqlTable("devices", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  mac: varchar("mac", { length: 64 }).notNull(),
  accessMode: mysqlEnum("accessMode", ["MAC", "LOGIN_PASSWORD"]).default("MAC").notNull(),
  nomeServer: varchar("nomeServer", { length: 255 }).notNull(),
  tipo: mysqlEnum("tipo", ["Usuario", "Revenda", "UltraMaster", "Master"]).default("Usuario").notNull(),
  modoSelecao: mysqlEnum("modoSelecao", ["XTeamCode", "M3U8"]).default("XTeamCode").notNull(),
  app: varchar("app", { length: 128 }),
  appVersion: varchar("appVersion", { length: 64 }),
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
  forceShowChannel: boolean("forceShowChannel").default(false).notNull(), // força envio do canal mesmo sem Device Type = TV
  activeDeviceUrlId: int("activeDeviceUrlId"), // null = lista principal legada; id = lista extra priorizada
  listFailoverEnabled: boolean("listFailoverEnabled").default(true).notNull(),
  maxConcurrentConnections: int("maxConcurrentConnections").default(1).notNull(),
});

export type Device = typeof devices.$inferSelect;
export type InsertDevice = typeof devices.$inferInsert;

// Sessões ativas dos APKs. São removidas após inatividade para não alterar cadastros existentes.
export const appSessions = mysqlTable("app_sessions", {
  id: int("id").autoincrement().primaryKey(),
  deviceId: int("deviceId").notNull(),
  sessionKey: varchar("sessionKey", { length: 128 }).notNull().unique(),
  appId: varchar("appId", { length: 64 }),
  lastSeen: timestamp("lastSeen").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AppSession = typeof appSessions.$inferSelect;

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

// Configurações exclusivas do Ultra Player, separadas do OuroPro e Maximus
export const ultraPlayerConfig = mysqlTable("ultra_player_config", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull().unique(),
  appName: varchar("appName", { length: 128 }).default("Ultra Player").notNull(),
  bannerUrl: text("bannerUrl"),
  backgroundUrl: text("backgroundUrl"),
  logoUrl: text("logoUrl"),
  iconsJson: text("iconsJson"),
  welcomeMessage: text("welcomeMessage"),
  maintenanceMessage: text("maintenanceMessage"),
  serverApiUrl: text("serverApiUrl"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type UltraPlayerConfig = typeof ultraPlayerConfig.$inferSelect;

// Tabela de DNS cadastradas pelo revendedor
export const dnsEntries = mysqlTable("dns_entries", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  titulo: varchar("titulo", { length: 128 }).notNull(),
  grupo: varchar("grupo", { length: 128 }).default("Padrão").notNull(),
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

// Credenciais locais para login com email/senha (sem OAuth)
export const localCredentials = mysqlTable("local_credentials", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LocalCredential = typeof localCredentials.$inferSelect;
export type InsertLocalCredential = typeof localCredentials.$inferInsert;

// Avisos do ultra master para todos os master/revenda
export const notices = mysqlTable("notices", {
  id: int("id").autoincrement().primaryKey(),
  autorId: int("autorId").notNull(),
  targetOwnerId: int("targetOwnerId"),
  targetDeviceId: int("targetDeviceId"),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  conteudo: text("conteudo").notNull(),
  ativo: boolean("ativo").default(true).notNull(),
  startsAt: timestamp("startsAt"),
  endsAt: timestamp("endsAt"),
  criadoEm: timestamp("criadoEm").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizadoEm").defaultNow().onUpdateNow().notNull(),
});

export type Notice = typeof notices.$inferSelect;
export type InsertNotice = typeof notices.$inferInsert;

// Modelos reutilizáveis de mensagens do Chatbot
export const messageTemplates = mysqlTable("message_templates", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  category: mysqlEnum("category", ["renewal", "collection", "welcome", "maintenance", "custom"]).default("custom").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MessageTemplate = typeof messageTemplates.$inferSelect;
export type InsertMessageTemplate = typeof messageTemplates.$inferInsert;

// Histórico auditável das principais ações realizadas no painel
export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  actorUserId: int("actorUserId").notNull(),
  entityType: varchar("entityType", { length: 64 }).notNull(),
  entityId: int("entityId"),
  action: varchar("action", { length: 64 }).notNull(),
  summary: varchar("summary", { length: 500 }).notNull(),
  beforeData: text("beforeData"),
  afterData: text("afterData"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// Controle financeiro por cliente/dispositivo
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  deviceId: int("deviceId").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["pending", "paid", "overdue"]).default("pending").notNull(),
  dueDate: date("dueDate"),
  paidAt: timestamp("paidAt"),
  note: text("note"),
  proofReference: text("proofReference"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

// Etiquetas organizacionais aplicadas aos clientes de cada painel
export const customerTags = mysqlTable("customer_tags", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  name: varchar("name", { length: 64 }).notNull(),
  color: varchar("color", { length: 7 }).default("#D4A72C").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const deviceTags = mysqlTable("device_tags", {
  id: int("id").autoincrement().primaryKey(),
  deviceId: int("deviceId").notNull(),
  tagId: int("tagId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Observações internas por cliente, sem exposição nas rotas dos aplicativos
export const customerNotes = mysqlTable("customer_notes", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  deviceId: int("deviceId").notNull(),
  authorUserId: int("authorUserId").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Fila de tarefas e ocorrências de manutenção do painel
export const maintenanceTasks = mysqlTable("maintenance_tasks", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  deviceId: int("deviceId"),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  priority: mysqlEnum("priority", ["low", "medium", "high", "critical"]).default("medium").notNull(),
  status: mysqlEnum("status", ["open", "in_progress", "resolved", "cancelled"]).default("open").notNull(),
  assignedToUserId: int("assignedToUserId"),
  dueAt: date("dueAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Alertas internos do painel para eventos operacionais e de segurança
export const internalAlerts = mysqlTable("internal_alerts", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  targetUserId: int("targetUserId"),
  type: mysqlEnum("type", ["info", "warning", "critical", "success"]).default("info").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Confirmações do próprio APK. Não alteram a leitura do alerta no painel da revenda.
export const deviceListNotificationReceipts = mysqlTable("device_list_notification_receipts", {
  id: int("id").autoincrement().primaryKey(),
  deviceId: int("deviceId").notNull(),
  alertId: int("alertId").notNull(),
  acknowledgedAt: timestamp("acknowledgedAt").defaultNow().notNull(),
});

// Fila de ações enviadas pelo painel e executadas pelo APK quando o aparelho faz heartbeat.
export const remoteDeviceCommands = mysqlTable("remote_device_commands", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  deviceId: int("deviceId").notNull(),
  command: mysqlEnum("command", ["refresh_playlist", "switch_playlist", "update_dns", "show_message", "restart_player", "sync_access"]).notNull(),
  payload: text("payload"),
  status: mysqlEnum("status", ["queued", "delivered", "executed", "failed", "expired", "cancelled"]).default("queued").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  deliveredAt: timestamp("deliveredAt"),
  executedAt: timestamp("executedAt"),
  resultMessage: varchar("resultMessage", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RemoteDeviceCommand = typeof remoteDeviceCommands.$inferSelect;
export type InsertRemoteDeviceCommand = typeof remoteDeviceCommands.$inferInsert;

// Cobranças de assinatura das revendas, separadas das cobranças dos clientes finais
export const resellerBillings = mysqlTable("reseller_billings", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  resellerId: int("resellerId").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["pending", "paid", "overdue"]).default("pending").notNull(),
  dueDate: date("dueDate").notNull(),
  paidAt: timestamp("paidAt"),
  recurrenceMonths: int("recurrenceMonths").default(1).notNull(),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ResellerBilling = typeof resellerBillings.$inferSelect;
export type InsertResellerBilling = typeof resellerBillings.$inferInsert;

// Resultado da última verificação de disponibilidade de cada lista
export const listHealthChecks = mysqlTable("list_health_checks", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  deviceId: int("deviceId").notNull(),
  deviceUrlId: int("deviceUrlId"),
  urlSnapshot: text("urlSnapshot").notNull(),
  status: mysqlEnum("status", ["success", "error", "pending"]).default("pending").notNull(),
  statusCode: int("statusCode"),
  responseTimeMs: int("responseTimeMs"),
  message: varchar("message", { length: 500 }),
  checkedAt: timestamp("checkedAt").defaultNow().notNull(),
});

export type ListHealthCheck = typeof listHealthChecks.$inferSelect;
export type InsertListHealthCheck = typeof listHealthChecks.$inferInsert;

// Preferências e histórico do monitoramento automático de listas
export const listFailoverSettings = mysqlTable("list_failover_settings", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull().unique(),
  enabled: boolean("enabled").default(false).notNull(),
  intervalMinutes: int("intervalMinutes").default(10).notNull(),
  scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }),
  lastRunAt: timestamp("lastRunAt"),
  lastStatus: mysqlEnum("lastStatus", ["success", "error", "never"]).default("never").notNull(),
  lastError: varchar("lastError", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const listFailoverEvents = mysqlTable("list_failover_events", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  deviceId: int("deviceId").notNull(),
  fromDeviceUrlId: int("fromDeviceUrlId"),
  toDeviceUrlId: int("toDeviceUrlId"),
  reason: varchar("reason", { length: 500 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const serverMaintenanceBlocks = mysqlTable("server_maintenance_blocks", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  host: varchar("host", { length: 500 }).notNull(),
  reason: varchar("reason", { length: 500 }),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Histórico de backups completos armazenados fora do banco principal
export const backupSnapshots = mysqlTable("backup_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  storageKey: text("storageKey").notNull(),
  storageUrl: text("storageUrl").notNull(),
  fileSize: int("fileSize").notNull(),
  type: mysqlEnum("type", ["automatic", "manual"]).default("automatic").notNull(),
  runKey: varchar("runKey", { length: 10 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BackupSnapshot = typeof backupSnapshots.$inferSelect;
export type InsertBackupSnapshot = typeof backupSnapshots.$inferInsert;

// Uma configuração de rotina automática por proprietário
export const autoBackupSettings = mysqlTable("auto_backup_settings", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  enabled: boolean("enabled").default(false).notNull(),
  runTime: varchar("runTime", { length: 5 }).default("03:00").notNull(),
  scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }),
  lastRunAt: timestamp("lastRunAt"),
  lastStatus: mysqlEnum("lastStatus", ["success", "error", "never"]).default("never").notNull(),
  lastError: varchar("lastError", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AutoBackupSetting = typeof autoBackupSettings.$inferSelect;
export type InsertAutoBackupSetting = typeof autoBackupSettings.$inferInsert;

// Configuração da retenção automática dos históricos operacionais do painel
export const historyRetentionSettings = mysqlTable("history_retention_settings", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  enabled: boolean("enabled").default(false).notNull(),
  retentionDays: int("retentionDays").default(3).notNull(),
  scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }),
  lastRunAt: timestamp("lastRunAt"),
  lastStatus: mysqlEnum("lastStatus", ["success", "error", "never"]).default("never").notNull(),
  lastError: varchar("lastError", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type HistoryRetentionSetting = typeof historyRetentionSettings.$inferSelect;

// Tabela de configurações do APK NuvixXC6
export const nuvixConfig = mysqlTable("nuvix_config", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  // DNS (até 5)
  dns1_nome: varchar("dns1_nome", { length: 128 }),
  dns1_url: text("dns1_url"),
  dns2_nome: varchar("dns2_nome", { length: 128 }),
  dns2_url: text("dns2_url"),
  dns3_nome: varchar("dns3_nome", { length: 128 }),
  dns3_url: text("dns3_url"),
  dns4_nome: varchar("dns4_nome", { length: 128 }),
  dns4_url: text("dns4_url"),
  dns5_nome: varchar("dns5_nome", { length: 128 }),
  dns5_url: text("dns5_url"),
  // Imagem de fundo
  backgroundUrl: text("backgroundUrl"),
  // Ícone customizado
  iconUrl: text("iconUrl"),
  // Nome do app
  appName: varchar("appName", { length: 128 }).default("NUVIX"),
  // Cor dos botões (hex)
  buttonColor: varchar("buttonColor", { length: 7 }).default("#000000"),
  // Cor do botão "Adicionar Lista" (hex)
  buttonAddListColor: varchar("buttonAddListColor", { length: 7 }).default("#16a34a"), // Verde padrão
  // URL da API do Observador de IPTV para testes automáticos
  observadorApiUrl: text("observadorApiUrl"),
  // Dias antes do vencimento para enviar aviso automático
  daysBeforeExpireWarning: int("daysBeforeExpireWarning").default(1).notNull(),
  // Ativo/Inativo
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NuvixConfig = typeof nuvixConfig.$inferSelect;
export type InsertNuvixConfig = typeof nuvixConfig.$inferInsert;

// Credenciais para APKs de player (username/password para autenticação)
export const playerCredentials = mysqlTable("player_credentials", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  username: varchar("username", { length: 128 }).notNull(),
  password: varchar("password", { length: 128 }).notNull(),
  descricao: varchar("descricao", { length: 255 }), // Ex: "InteractivePlayer", "OuroPro", etc
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PlayerCredential = typeof playerCredentials.$inferSelect;
export type InsertPlayerCredential = typeof playerCredentials.$inferInsert;

// Credencial de acesso vinculada a um cliente do painel. A lista, validade,
// status e recursos de failover continuam no dispositivo associado, para que
// o modo login/senha tenha exatamente as mesmas proteções do modo por MAC.
export const appCredentials = mysqlTable("app_credentials", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  deviceId: int("deviceId").notNull().unique(),
  appId: varchar("appId", { length: 64 }).notNull(),
  dnsHost: text("dnsHost"),
  username: varchar("username", { length: 128 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  active: boolean("active").default(true).notNull(),
  firstAuthenticatedAt: timestamp("firstAuthenticatedAt"),
  lastAuthenticatedAt: timestamp("lastAuthenticatedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AppCredential = typeof appCredentials.$inferSelect;
export type InsertAppCredential = typeof appCredentials.$inferInsert;
