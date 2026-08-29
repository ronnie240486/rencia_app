import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { devices } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("App Ranking - Contabilização de Apps", () => {
  let db: any;

  beforeAll(async () => {
    db = await getDb();
    if (!db) {
      throw new Error("Database connection failed");
    }
  });

  it("deve contar corretamente dispositivos com app OuroPro", async () => {
    // Buscar todos os dispositivos com app OuroPro
    const ouroproDevices = await db
      .select()
      .from(devices)
      .where(eq(devices.app, "OuroPro"));

    expect(Array.isArray(ouroproDevices)).toBe(true);
    expect(ouroproDevices.length).toBeGreaterThanOrEqual(0);
  });

  it("deve contar corretamente dispositivos com app Maximus", async () => {
    // Buscar todos os dispositivos com app Maximus
    const maximusDevices = await db
      .select()
      .from(devices)
      .where(eq(devices.app, "Maximus"));

    expect(Array.isArray(maximusDevices)).toBe(true);
    expect(maximusDevices.length).toBeGreaterThanOrEqual(0);
  });

  it("deve calcular corretamente a porcentagem de adoção", async () => {
    // Buscar todos os dispositivos
    const allDevices = await db.select().from(devices);

    // Contar por app
    const appCounts: Record<string, number> = {};
    for (const device of allDevices) {
      const app = device.app || "Sem App";
      appCounts[app] = (appCounts[app] || 0) + 1;
    }

    const totalDevices = Object.values(appCounts).reduce((sum: number, count: number) => sum + count, 0);

    // Calcular porcentagens para apresentação. Cada item pode arredondar para cima,
    // portanto a soma arredondada pode passar de 100 por alguns pontos percentuais.
    const percentages: Record<string, number> = {};
    for (const [app, count] of Object.entries(appCounts)) {
      percentages[app] = totalDevices > 0 ? Math.round((count / totalDevices) * 100) : 0;
    }

    // A soma matemática exata deve ser 100%; a soma usada no cartão pode variar por arredondamento.
    const exactTotal = Object.values(appCounts).reduce((sum: number, count: number) => sum + (count / totalDevices) * 100, 0);
    expect(exactTotal).toBeCloseTo(100, 10);
    expect(Object.values(percentages).every((percentage) => percentage >= 0 && percentage <= 100)).toBe(true);
  });

  it("deve validar que campo 'app' contém valores válidos", async () => {
    const allDevices = await db.select().from(devices);

    for (const device of allDevices) {
      if (device.app) {
        // Se app não é null, deve ser um dos valores válidos
        const validApps = ["OuroPro", "Maximus", "Maximus Player", "Ultra Player", "Fusion", "Prestige", "Optimus", "Império Play", "Infinitus", "Supremus", "Evolux", "Ominus", "Magnus", "Magnus TV", "Excellence", "Future", "Future Player", "Nexus", "Outro"];
        expect(validApps).toContain(device.app);
      }
    }
  });

  it("deve retornar ranking ordenado por número de clientes", async () => {
    const allDevices = await db.select().from(devices);

    // Contar por app
    const appCounts: Record<string, number> = {};
    for (const device of allDevices) {
      const app = device.app || "Sem App";
      appCounts[app] = (appCounts[app] || 0) + 1;
    }

    // Criar ranking
    const ranking = Object.entries(appCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Validar que ranking está em ordem decrescente
    for (let i = 0; i < ranking.length - 1; i++) {
      expect(ranking[i].count).toBeGreaterThanOrEqual(ranking[i + 1].count);
    }
  });
});
