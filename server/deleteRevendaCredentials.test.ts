import { beforeEach, describe, expect, it, vi } from "vitest";
import { localCredentials, users } from "../drizzle/schema";

const state = vi.hoisted(() => ({ deleteMock: vi.fn() }));

vi.mock("drizzle-orm/mysql2", () => ({
  drizzle: vi.fn(() => ({
    delete: state.deleteMock,
  })),
}));

import { deleteRevenda } from "./db";

describe("deleteRevenda", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = "mysql://test";
    state.deleteMock.mockImplementation(() => ({ where: vi.fn().mockResolvedValue(undefined) }));
  });

  it("remove credenciais locais antes de apagar a conta da revenda", async () => {
    await deleteRevenda(77, 1);
    expect(state.deleteMock).toHaveBeenNthCalledWith(1, localCredentials);
    expect(state.deleteMock).toHaveBeenNthCalledWith(2, users);
  });
});
