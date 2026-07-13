import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  // Registrar Vite APENAS para requisições que NÃO são da API
  app.use((req, res, next) => {
    if (req.path.startsWith("/api/") || req.path.startsWith("/apk") || req.path.startsWith("/ouropro")) {
      return next(); // Pula o Vite para requisições da API
    }
    // Para outras requisições, usa o Vite
    vite.middlewares(req, res, next);
  });
  
  // Middleware catch-all para servir index.html (SPA)
  app.use("*", async (req, res, next) => {
    // Não interceptar requisições da API - retornar 404 em vez de HTML
    if (req.path.startsWith("/api/") || req.path.startsWith("/apk") || req.path.startsWith("/ouropro")) {
      return res.status(404).json({ error: "Endpoint not found", path: req.path });
    }
    
    const url = req.originalUrl;
    
    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
