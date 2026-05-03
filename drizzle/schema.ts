import { boolean, decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar, date } from "drizzle-orm/mysql-core";

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
  isActive: boolean("isActive").default(true).notNull(),
  // Plan info
  plano: varchar("plano", { length: 64 }).default("Revenda"),
  planValidade: date("planValidade"),
  limiteDevices: int("limiteDevices").default(999),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const devices = mysqlTable("devices", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  mac: varchar("mac", { length: 64 }).notNull(),
  nomeServer: varchar("nomeServer", { length: 255 }).notNull(),
  tipo: mysqlEnum("tipo", ["Usuario", "Revenda", "UltraMaster", "Master"]).default("Usuario").notNull(),
  modoSelecao: mysqlEnum("modoSelecao", ["XTeamCode", "M3U8"]).default("XTeamCode").notNull(),
  app: varchar("app", { length: 128 }),
  urlM3u8: text("urlM3u8"),
  urlEpg: text("urlEpg"),
  valor: decimal("valor", { precision: 10, scale: 2 }),
  status: mysqlEnum("status", ["Liberado", "Bloqueado", "Expirado"]).default("Liberado").notNull(),
  dataCadastro: timestamp("dataCadastro").defaultNow().notNull(),
  dataExpiracao: date("dataExpiracao"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Device = typeof devices.$inferSelect;
export type InsertDevice = typeof devices.$inferInsert;

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
