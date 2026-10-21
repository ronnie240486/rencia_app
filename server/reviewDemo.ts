import type { Express, Request, Response } from "express";

/**
 * Lista de DEMONSTRAÇÃO para a revisão do Google Play (e para quem quiser conhecer o app).
 *
 * O revisor do Google abre o Ouro Pro num aparelho novo e o teste gratuito depende de um provedor
 * externo que pode recusar de outro país. Esta lista M3U pública só tem vídeos de demonstração
 * liberados para teste de players (filmes abertos da Blender Foundation e streams de teste da Apple),
 * então o app abre, carrega e toca sem login nem provedor. Fica no painel (não no app) para poder
 * trocar os links sem publicar versão nova.
 */
export const REVIEW_DEMO_M3U = [
  "#EXTM3U",
  '#EXTINF:-1 tvg-id="demo-bbb" group-title="Demonstração - Filmes abertos",Big Buck Bunny (demo)',
  "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  '#EXTINF:-1 tvg-id="demo-sintel" group-title="Demonstração - Filmes abertos",Sintel (demo)',
  "https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8",
  '#EXTINF:-1 tvg-id="demo-tos" group-title="Demonstração - Filmes abertos",Tears of Steel (demo)',
  "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8",
  '#EXTINF:-1 tvg-id="demo-bipbop" group-title="Demonstração - Canais de teste",Canal de teste 1 (demo)',
  "https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_ts/master.m3u8",
  '#EXTINF:-1 tvg-id="demo-live" group-title="Demonstração - Canais de teste",Canal de teste 2 ao vivo (demo)',
  "https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8",
  "",
].join("\n");

/** GET /api/review-demo.m3u — pública, sem login. */
export function registerReviewDemoRoute(app: Express) {
  app.get("/api/review-demo.m3u", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "audio/x-mpegurl; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.send(REVIEW_DEMO_M3U);
  });
}
