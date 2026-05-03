/**
 * API REST pública para consumo pelo APK.
 * Todos os endpoints retornam JSON e não requerem autenticação OAuth.
 *
 * Endpoints disponíveis:
 *   GET  /api/device/check?mac=XX:XX:XX:XX:XX:XX
 *        → Verifica se um device está cadastrado e retorna seus dados
 *
 *   GET  /api/device/info?mac=XX:XX:XX:XX:XX:XX
 *        → Retorna informações completas do device (app, url, status, expiração)
 */

import type { Express, Request, Response } from "express";
import { getDb } from "./db";
import { devices } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

export function registerApiRoutes(app: Express) {
  /**
   * GET /api/device/check?mac=XX:XX:XX:XX:XX:XX
   *
   * Retorna se o device está liberado, bloqueado ou não cadastrado.
   * Usado pelo APK para verificar autorização de acesso.
   *
   * Resposta de sucesso (device encontrado):
   * {
   *   "found": true,
   *   "status": "Liberado" | "Bloqueado" | "Expirado",
   *   "allowed": true | false,
   *   "mac": "XX:XX:XX:XX:XX:XX",
   *   "nomeServer": "...",
   *   "tipo": "Usuario" | "Revenda" | "UltraMaster" | "Master",
   *   "app": "...",
   *   "urlM3u8": "...",
   *   "urlEpg": "...",
   *   "dataExpiracao": "2025-12-31T00:00:00.000Z" | null
   * }
   *
   * Resposta quando não encontrado:
   * { "found": false, "allowed": false, "message": "Device não cadastrado." }
   */
  app.get("/api/device/check", async (req: Request, res: Response) => {
    const mac = typeof req.query.mac === "string" ? req.query.mac.trim() : null;

    if (!mac) {
      res.status(400).json({ error: "Parâmetro 'mac' é obrigatório." });
      return;
    }

    try {
      const db = await getDb();
      if (!db) {
        res.status(503).json({ error: "Banco de dados indisponível." });
        return;
      }

      const result = await db
        .select()
        .from(devices)
        .where(eq(devices.mac, mac))
        .limit(1);

      if (result.length === 0) {
        res.json({
          found: false,
          allowed: false,
          message: "Device não cadastrado.",
        });
        return;
      }

      const device = result[0];
      const now = new Date();
      const expired =
        device.dataExpiracao != null && new Date(device.dataExpiracao) < now;

      // Se expirado, atualiza o status automaticamente
      if (expired && device.status !== "Expirado") {
        await db
          .update(devices)
          .set({ status: "Expirado" })
          .where(eq(devices.id, device.id));
        device.status = "Expirado";
      }

      res.json({
        found: true,
        status: device.status,
        allowed: device.status === "Liberado",
        mac: device.mac,
        nomeServer: device.nomeServer,
        tipo: device.tipo,
        app: device.app ?? null,
        urlM3u8: device.urlM3u8 ?? null,
        urlEpg: device.urlEpg ?? null,
        modoSelecao: device.modoSelecao,
        dataExpiracao: device.dataExpiracao
          ? new Date(device.dataExpiracao).toISOString()
          : null,
        dataCadastro: device.dataCadastro
          ? new Date(device.dataCadastro).toISOString()
          : null,
      });
    } catch (error) {
      console.error("[API] /api/device/check error:", error);
      res.status(500).json({ error: "Erro interno do servidor." });
    }
  });

  /**
   * GET /api/health
   * Endpoint de health check — confirma que o servidor está rodando.
   */
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });
}
