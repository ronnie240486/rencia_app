import { z } from "zod";

export const bulkDeviceUpdateSchema = z.object({
  ids: z.array(z.number()).min(1),
  status: z.enum(["Liberado", "Bloqueado", "Expirado"]).optional(),
  app: z.string().min(1).optional(),
  dataExpiracao: z.string().optional(),
  urlM3u8: z.string().url().optional(),
}).refine((input) => input.status || input.app || input.dataExpiracao || input.urlM3u8, {
  message: "Escolha pelo menos uma configuração para alterar.",
});
