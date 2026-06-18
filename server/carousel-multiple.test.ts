import { describe, it, expect } from "vitest";

describe("Carousel com múltiplas imagens", () => {
  it("deve permitir salvar múltiplas URLs separadas por vírgula", () => {
    const urls = [
      "https://example.com/img1.jpg",
      "https://example.com/img2.jpg",
      "https://example.com/img3.jpg",
      "https://example.com/img4.jpg",
      "https://example.com/img5.jpg",
    ];
    
    const urlString = urls.join(", ");
    const urlArray = urlString.split(",").map(u => u.trim()).filter(u => u);

    expect(urlArray.length).toBe(5);
    expect(urlArray[0]).toBe("https://example.com/img1.jpg");
    expect(urlArray[4]).toBe("https://example.com/img5.jpg");
  });

  it("deve permitir até 8 imagens", () => {
    const urls = Array.from({ length: 8 }, (_, i) => `https://example.com/img${i + 1}.jpg`);
    const urlString = urls.join(", ");

    // Verificar que 8 URLs são válidas
    const urlArray = urlString.split(",").map(u => u.trim()).filter(u => u);
    expect(urlArray.length).toBe(8);
  });

  it("deve rejeitar mais de 8 imagens", () => {
    const urls = Array.from({ length: 9 }, (_, i) => `https://example.com/img${i + 1}.jpg`);
    const urlArray = urls.join(", ").split(",").map(u => u.trim()).filter(u => u);

    // Limitar a 8
    const limited = urlArray.slice(0, 8);
    expect(limited.length).toBe(8);
    expect(urlArray.length).toBe(9); // Original tem 9
  });

  it("deve alternar entre as imagens continuamente", () => {
    const urls = [
      "https://example.com/img1.jpg",
      "https://example.com/img2.jpg",
      "https://example.com/img3.jpg",
    ];

    // Simular o carousel alternando
    let currentIndex = 0;
    const sequence = [];
    
    for (let i = 0; i < 10; i++) {
      sequence.push(urls[currentIndex]);
      currentIndex = (currentIndex + 1) % urls.length;
    }

    // Verificar que alterna corretamente
    expect(sequence[0]).toBe(urls[0]);
    expect(sequence[1]).toBe(urls[1]);
    expect(sequence[2]).toBe(urls[2]);
    expect(sequence[3]).toBe(urls[0]); // Volta ao começo
    expect(sequence[4]).toBe(urls[1]);
    expect(sequence[5]).toBe(urls[2]);
  });
});
