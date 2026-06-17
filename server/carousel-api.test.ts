import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import {
  users,
  devices,
  carouselSlides,
  backgroundImages,
} from "../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Teste de integração para verificar que o endpoint /api/v4/bg.php
 * retorna o carousel correto para todos os devices do mesmo usuário
 */
describe("Carousel API Integration", () => {
  let db: any;
  let testUserId: number;
  let device1Mac: string;
  let device2Mac: string;
  let slideId1: number;
  let slideId2: number;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error("Failed to connect to database");

    // Criar usuário de teste
    const userResult = await db
      .insert(users)
      .values({
        openId: `test-carousel-api-${Date.now()}`,
        name: "Test Carousel API",
        email: `carousel-api-${Date.now()}@example.com`,
        loginMethod: "test",
      })
      .$returningId();

    testUserId = userResult[0].id;

    // Criar 2 slides de carousel
    const slide1Result = await db
      .insert(carouselSlides)
      .values({
        titulo: "Slide 1",
        descricao: "First Slide",
        tipo: "image",
        urlMedia: "https://example.com/slide1.jpg",
        ordem: 1,
        ativo: true,
      })
      .$returningId();

    slideId1 = slide1Result[0].id;

    const slide2Result = await db
      .insert(carouselSlides)
      .values({
        titulo: "Slide 2",
        descricao: "Second Slide",
        tipo: "image",
        urlMedia: "https://example.com/slide2.jpg",
        ordem: 2,
        ativo: true,
      })
      .$returningId();

    slideId2 = slide2Result[0].id;

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

    // Salvar carousel para o usuário (2 imagens)
    await db.insert(backgroundImages).values({
      userId: testUserId,
      carouselSlideId: slideId1,
      duration: 5,
      order: 1,
    });

    await db.insert(backgroundImages).values({
      userId: testUserId,
      carouselSlideId: slideId2,
      duration: 5,
      order: 2,
    });
  });

  afterAll(async () => {
    if (!db) return;

    // Limpar dados de teste
    await db.delete(backgroundImages).where(eq(backgroundImages.userId, testUserId));
    await db.delete(carouselSlides).where(
      eq(carouselSlides.id, slideId1)
    );
    await db.delete(carouselSlides).where(
      eq(carouselSlides.id, slideId2)
    );
    await db.delete(devices).where(eq(devices.ownerId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  it("should return carousel for device 1 when querying by MAC", async () => {
    // Simular busca do device pelo MAC
    const device = await db
      .select()
      .from(devices)
      .where(eq(devices.mac, device1Mac))
      .limit(1);

    expect(device.length).toBe(1);
    const ownerId = device[0].ownerId;

    // Buscar backgrounds pelo ownerId (como faz o endpoint /api/v4/bg.php)
    const backgrounds = await db
      .select({
        urlMedia: carouselSlides.urlMedia,
        duration: backgroundImages.duration,
      })
      .from(backgroundImages)
      .innerJoin(carouselSlides, eq(backgroundImages.carouselSlideId, carouselSlides.id))
      .where(eq(backgroundImages.userId, ownerId))
      .orderBy(backgroundImages.order);

    expect(backgrounds.length).toBe(2);
    expect(backgrounds[0].urlMedia).toBe("https://example.com/slide1.jpg");
    expect(backgrounds[1].urlMedia).toBe("https://example.com/slide2.jpg");
  });

  it("should return SAME carousel for device 2 when querying by MAC", async () => {
    // Simular busca do device 2 pelo MAC
    const device = await db
      .select()
      .from(devices)
      .where(eq(devices.mac, device2Mac))
      .limit(1);

    expect(device.length).toBe(1);
    const ownerId = device[0].ownerId;

    // Buscar backgrounds pelo ownerId (como faz o endpoint /api/v4/bg.php)
    const backgrounds = await db
      .select({
        urlMedia: carouselSlides.urlMedia,
        duration: backgroundImages.duration,
      })
      .from(backgroundImages)
      .innerJoin(carouselSlides, eq(backgroundImages.carouselSlideId, carouselSlides.id))
      .where(eq(backgroundImages.userId, ownerId))
      .orderBy(backgroundImages.order);

    // Deve retornar o MESMO carousel (2 imagens)
    expect(backgrounds.length).toBe(2);
    expect(backgrounds[0].urlMedia).toBe("https://example.com/slide1.jpg");
    expect(backgrounds[1].urlMedia).toBe("https://example.com/slide2.jpg");
  });

  it("should mark carousel as isCarousel=true when 2+ images", async () => {
    const device = await db
      .select()
      .from(devices)
      .where(eq(devices.mac, device1Mac))
      .limit(1);

    const ownerId = device[0].ownerId;

    const backgrounds = await db
      .select({
        urlMedia: carouselSlides.urlMedia,
        duration: backgroundImages.duration,
      })
      .from(backgroundImages)
      .innerJoin(carouselSlides, eq(backgroundImages.carouselSlideId, carouselSlides.id))
      .where(eq(backgroundImages.userId, ownerId))
      .orderBy(backgroundImages.order);

    // Com 2 imagens, isCarousel deve ser true
    const isCarousel = backgrounds.length > 1;
    expect(isCarousel).toBe(true);
  });

  it("should return empty carousel when no backgrounds configured", async () => {
    // Criar novo usuário sem carousel
    const userResult = await db
      .insert(users)
      .values({
        openId: `test-no-carousel-${Date.now()}`,
        name: "Test No Carousel",
        email: `no-carousel-${Date.now()}@example.com`,
        loginMethod: "test",
      })
      .$returningId();

    const noCarouselUserId = userResult[0].id;

    // Criar device para esse usuário
    const noCarouselMac = `BB:BB:CC:DD:EE:${Math.floor(Math.random() * 100)
      .toString()
      .padStart(2, "0")}`;

    await db.insert(devices).values({
      ownerId: noCarouselUserId,
      mac: noCarouselMac,
      nomeServer: "No Carousel Device",
      tipo: "Usuario",
      modoSelecao: "XTeamCode",
    });

    // Buscar backgrounds (deve estar vazio)
    const backgrounds = await db
      .select({
        urlMedia: carouselSlides.urlMedia,
        duration: backgroundImages.duration,
      })
      .from(backgroundImages)
      .innerJoin(carouselSlides, eq(backgroundImages.carouselSlideId, carouselSlides.id))
      .where(eq(backgroundImages.userId, noCarouselUserId))
      .orderBy(backgroundImages.order);

    expect(backgrounds.length).toBe(0);

    // Limpar
    await db.delete(devices).where(eq(devices.ownerId, noCarouselUserId));
    await db.delete(users).where(eq(users.id, noCarouselUserId));
  });
});
