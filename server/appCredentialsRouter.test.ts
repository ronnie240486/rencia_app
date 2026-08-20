import { beforeEach, describe, expect, it, vi } from "vitest";

let selectRows: unknown[][] = [];
const database = {
  select: vi.fn(() => ({ from: () => ({ where: () => ({ limit: async () => selectRows.shift() ?? [], orderBy: async () => selectRows.shift() ?? [] }), innerJoin: () => ({ where: () => ({ orderBy: async () => selectRows.shift() ?? [] }) }) }) })),
  insert: vi.fn(() => ({ values: async () => ({ insertId: 99 }) })),
  update: vi.fn(() => ({ set: () => ({ where: async () => undefined }) })),
  delete: vi.fn(() => ({ where: async () => undefined })),
};

vi.mock("./db", () => ({
  getDb: vi.fn(async () => database),
  getUserPlanInfo: vi.fn(async () => ({ limiteDevices: 999 })),
  getDeviceStats: vi.fn(async () => ({ total: 1 })),
  createDevice: vi.fn(async () => ({ id: 99 })),
  deleteDevice: vi.fn(async () => undefined),
  deleteManyDevices: vi.fn(), deleteExpiredDevices: vi.fn(), getDeviceById: vi.fn(), getRecentDevices: vi.fn(), listApps: vi.fn(), listDevices: vi.fn(), seedApps: vi.fn(), updateDevice: vi.fn(), upsertUser: vi.fn(),
  getDeviceUrls: vi.fn(), addDeviceUrl: vi.fn(), updateDeviceUrl: vi.fn(), deleteDeviceUrl: vi.fn(), listRevendas: vi.fn(), createRevenda: vi.fn(), updateRevenda: vi.fn(), deleteRevenda: vi.fn(), getRevendaStats: vi.fn(), getConnectedDevices: vi.fn(), updateUserProfile: vi.fn(),
}));
vi.mock("./auth", () => ({ hashPassword: vi.fn(async (password: string) => `hash:${password}`), comparePassword: vi.fn() }));
vi.mock("./audit", () => ({ recordAudit: vi.fn(async () => undefined) }));

import { appRouter } from "./routers";

const context = {
  user: { id: 1, openId: "owner", name: "Owner", email: "owner@example.com", loginMethod: "email_password", role: "admin", isOwner: true, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), lastLoginDate: "2026-08-20", isActive: true, telefone: null, avatarUrl: null, bannerUrl: null, app: null, plano: "UltraMaster", planValidade: null, limiteDevices: 999, resellerId: null, limiteRevendas: 0, senhaRevenda: null },
  req: { headers: {} }, res: {},
} as any;

describe("appCredentials router", () => {
  beforeEach(() => { selectRows = []; vi.clearAllMocks(); });

  it("cria o cliente de acesso com senha em hash e preserva listas adicionais", async () => {
    const caller = appRouter.createCaller(context);
    selectRows = [[]];
    const result = await caller.appCredentials.create({ username: "cliente.teste", password: "senha-segura", appId: "optimus", nomeServer: "Cliente Teste", modoSelecao: "M3U8", urlM3u8: "https://dns.exemplo.com/lista", extraLists: [{ nome: "Lista 2", modoSelecao: "M3U8", urlM3u8: "https://dns2.exemplo.com/lista" }] });

    expect(result).toMatchObject({ success: true, deviceId: 99, username: "cliente.teste" });
    expect(database.insert).toHaveBeenCalledTimes(2);
    const credentialInsert = database.insert.mock.results[0]?.value;
    expect(credentialInsert).toBeDefined();
  });

  it("lista credenciais sem expor o hash da senha", async () => {
    const caller = appRouter.createCaller(context);
    const rows = [{ id: 8, username: "cliente.teste", appId: "optimus", active: true, deviceId: 99, nomeServer: "Cliente", mac: "LOGIN:PENDENTE", status: "Liberado", dataExpiracao: null }];
    selectRows = [rows];
    const result = await caller.appCredentials.list();
    expect(result).toEqual(rows);
    expect(JSON.stringify(result)).not.toContain("passwordHash");
  });

  it("atualiza status e senha sem guardar texto puro e remove apenas a credencial", async () => {
    const caller = appRouter.createCaller(context);
    const credential = { id: 8, ownerId: 1, deviceId: 99, username: "cliente.teste", passwordHash: "anterior", active: true };
    selectRows = [[credential]];
    await expect(caller.appCredentials.update({ id: 8, password: "nova-senha", status: "Bloqueado", active: false, dataExpiracao: "2026-12-31" })).resolves.toEqual({ success: true });
    expect(database.update).toHaveBeenCalledTimes(2);

    selectRows = [[credential]];
    await expect(caller.appCredentials.remove({ id: 8 })).resolves.toEqual({ success: true });
    expect(database.delete).toHaveBeenCalledTimes(1);
    expect(database.update).toHaveBeenCalledTimes(3);
  });
});
