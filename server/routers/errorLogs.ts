/**
 * errorLogs.ts — Router tRPC para consulta de logs de erros do sistema.
 * Apenas administradores podem acessar os logs.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { errorLog } from "../../drizzle/schema";
import { desc, gte, lte, and, eq, like } from "drizzle-orm";
import { logError } from "../errorLogger";

export const errorLogsRouter = router({
  // Listar logs de erros (apenas admin)
  list: protectedProcedure
    .input(z.object({
      nivel: z.enum(["info", "warn", "error", "critical"]).optional(),
      origem: z.string().optional(),
      dataInicio: z.date().optional(),
      dataFim: z.date().optional(),
      busca: z.string().optional(),
      limit: z.number().min(1).max(500).default(100),
    }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem visualizar logs de erros." });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });

      const conditions = [];
      if (input.nivel) conditions.push(eq(errorLog.nivel, input.nivel));
      if (input.origem) conditions.push(eq(errorLog.origem, input.origem));
      if (input.dataInicio) conditions.push(gte(errorLog.createdAt, input.dataInicio));
      if (input.dataFim) conditions.push(lte(errorLog.createdAt, input.dataFim));
      if (input.busca) conditions.push(like(errorLog.mensagem, `%${input.busca}%`));

      const logs = await db
        .select()
        .from(errorLog)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(errorLog.createdAt))
        .limit(input.limit);

      return logs;
    }),

  // Registrar erro do frontend
  logFrontendError: protectedProcedure
    .input(z.object({
      origem: z.string().max(100),
      acao: z.string().max(200).optional(),
      mensagem: z.string().max(5000),
      stack: z.string().max(10000).optional(),
      contexto: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await logError({
        nivel: "error",
        origem: `frontend:${input.origem}`,
        acao: input.acao,
        mensagem: input.mensagem,
        stack: input.stack,
        usuarioId: ctx.user.id,
        usuarioNome: ctx.user.name ?? undefined,
        contexto: input.contexto,
      });
      return { ok: true };
    }),

  // Limpar logs antigos (apenas admin)
  clearOld: protectedProcedure
    .input(z.object({
      diasManter: z.number().min(7).max(365).default(90),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem limpar logs." });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - input.diasManter);

      await db.delete(errorLog).where(lte(errorLog.createdAt, cutoff)).execute();
      return { ok: true };
    }),
});
