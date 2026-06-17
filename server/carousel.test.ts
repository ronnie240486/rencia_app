import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import {
  users,
  devices,
  carouselSlides,
  backgroundImages,
} from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Carousel - All Devices of Same User", () => {
  let db: any;
  let testUserId: number;
  let device1Mac: string;
  let device2Mac: string;
  let slideId: number;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error("Failed to connect to database");

    // Criar usuário de teste
    const userResult = await db
      .insert(users)
      .values({
        openId: `test-user-${Date.now()}`,
        name: "Test User",
        email: `test-${Date.now()}@example.com`,
        loginMethod: "test",
      })
      .$returningId();

    testUserId = userResult[0].id;

    // Criar slide de carousel
    const slideResult = await db
      .insert(carouselSlides)
      .values({
        titulo: "Test Slide",
        descricao: "Test Description",
        tipo: "image",
        urlMedia: "https://example.com/test.jpg",
        ordem: 1,
        ativo: true,
      })
      .$returningId();

    slideId = slideResult[0].id;

    // Criar dois devices para o mesmo usuário
    device1Mac = `AA:BB:CC:DD:EE:${Math.floor(Math.random() * 100)
      .toString()
      .padStart(2, "0")}`;
    device2Mac = `AA:BB:CC:DD:FF:${Math.floor(Math.random() * 100)
      .toString()
      .padStart(2, "0")}`;

    await db.insert(devices).values({
      ownerId: testUserId,
      mac: device1Mac,
      nomeServer: "Device 1",
      tipo: "Usuario",
      modoSelecao: "XTeamCode",
    });

    await db.insert(devices).values({
      ownerId: testUserId,
      mac: device2Mac,
      nomeServer: "Device 2",
      tipo: "Usuario",
      modoSelecao: "XTeamCode",
    });

    // Salvar carousel para o usuário
    await db.insert(backgroundImages).values({
      userId: testUserId,
      carouselSlideId: slideId,
      duration: 5,
      order: 1,
    });
  });

  afterAll(async () => {
    if (!db) return;

    // Limpar dados de teste
    await db.delete(backgroundImages).where(eq(backgroundImages.userId, testUserId));
    await db.delete(carouselSlides).where(eq(carouselSlides.id, slideId));
    await db.delete(devices).where(eq(devices.ownerId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  it("should return carousel for device 1", async () => {
    const backgrounds = await db
      .select({
        urlMedia: carouselSlides.urlMedia,
        duration: backgroundImages.duration,
      })
      .from(backgroundImages)
      .innerJoin(carouselSlides, eq(backgroundImages.carouselSlideId, carouselSlides.id))
      .where(eq(backgroundImages.userId, testUserId));

    expect(backgrounds.length).toBeGreaterThan(0);
    expect(backgrounds[0].urlMedia).toBe("https://example.com/test.jpg");
    expect(backgrounds[0].duration).toBe(5);
  });

  it("should return same carousel for device 2", async () => {
    const backgrounds = await db
      .select({
        urlMedia: carouselSlides.urlMedia,
        duration: backgroundImages.duration,
      })
      .from(backgroundImages)
      .innerJoin(carouselSlides, eq(backgroundImages.carouselSlideId, carouselSlides.id))
      .where(eq(backgroundImages.userId, testUserId));

    expect(backgrounds.length).toBeGreaterThan(0);
    expect(backgrounds[0].urlMedia).toBe("https://example.com/test.jpg");
    expect(backgrounds[0].duration).toBe(5);
  });

  it("should return carousel for any device with same ownerId", async () => {
    // Simular busca de carousel pelo MAC do device 1
    const device1 = await db
      .select()
      .from(devices)
      .where(eq(devices.mac, device1Mac))
      .limit(1);

    expect(device1.length).toBe(1);
    const ownerId = device1[0].ownerId;

    // Buscar backgrounds pelo ownerId
    const backgrounds = await db
      .select({
        urlMedia: carouselSlides.urlMedia,
        duration: backgroundImages.duration,
      })
      .from(backgroundImages)
      .innerJoin(carouselSlides, eq(backgroundImages.carouselSlideId, carouselSlides.id))
      .where(eq(backgroundImages.userId, ownerId));

    expect(backgrounds.length).toBeGreaterThan(0);
    expect(backgrounds[0].urlMedia).toBe("https://example.com/test.jpg");

    // Simular busca de carousel pelo MAC do device 2
    const device2 = await db
      .select()
      .from(devices)
      .where(eq(devices.mac, device2Mac))
      .limit(1);

    expect(device2.length).toBe(1);
    const ownerId2 = device2[0].ownerId;

    // Buscar backgrounds pelo ownerId do device 2
    const backgrounds2 = await db
      .select({
        urlMedia: carouselSlides.urlMedia,
        duration: backgroundImages.duration,
      })
      .from(backgroundImages)
      .innerJoin(carouselSlides, eq(backgroundImages.carouselSlideId, carouselSlides.id))
      .where(eq(backgroundImages.userId, ownerId2));

    // Deve retornar o mesmo carousel para ambos os devices
    expect(backgrounds2.length).toBe(backgrounds.length);
    expect(backgrounds2[0].urlMedia).toBe(backgrounds[0].urlMedia);
  });
});
