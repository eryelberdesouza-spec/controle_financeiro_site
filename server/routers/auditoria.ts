import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { auditLog } from "../../drizzle/schema";
import { desc, eq, and, gte, lte } from "drizzle-orm";

// ─── Helper para registrar eventos de auditoria ──────────────────────────────
export async function registrarAuditoria(params: {
  entidade: string;
  entidadeId?: number;
  acao: "criacao" | "edicao" | "exclusao" | "arquivamento" | "restauracao" | "atualizar_status" | "converter_em_contrato" | "enviar_para_assinatura" | "webhook_zapsign";
  usuarioId?: number;
  usuarioNome?: string;
  valorAnterior?: object | null;
  valorNovo?: object | null;
  camposAlterados?: string[];
  descricao?: string;
}) {
  try {
    const d = await getDb();
    if (!d) return;
    await d.insert(auditLog).values({
      entidade: params.entidade,
      entidadeId: params.entidadeId ?? null,
      acao: params.acao,
      usuarioId: params.usuarioId ?? null,
      usuarioNome: params.usuarioNome ?? null,
      valorAnterior: params.valorAnterior ? JSON.stringify(params.valorAnterior) : null,
      valorNovo: params.valorNovo ? JSON.stringify(params.valorNovo) : null,
      camposAlterados: params.camposAlterados?.join(", ") ?? null,
      descricao: params.descricao ?? null,
    });
  } catch {
    // Auditoria nunca deve quebrar a operação principal
  }
}

// ─── Router de Auditoria ─────────────────────────────────────────────────────
export const auditoriaRouter = router({
  // Listar logs de auditoria com filtros
  list: protectedProcedure
    .input(z.object({
      entidade: z.string().optional(),
      acao: z.enum(["criacao", "edicao", "exclusao"]).optional(),
      dataInicio: z.string().optional(),
      dataFim: z.string().optional(),
      limit: z.number().min(1).max(500).default(100),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const d = await getDb();
      if (!d) return { logs: [], total: 0 };

      const conditions = [];
      if (input.entidade) conditions.push(eq(auditLog.entidade, input.entidade));
      if (input.acao) conditions.push(eq(auditLog.acao, input.acao));
      if (input.dataInicio) conditions.push(gte(auditLog.createdAt, new Date(input.dataInicio)));
      if (input.dataFim) {
        const fim = new Date(input.dataFim);
        fim.setHours(23, 59, 59, 999);
        conditions.push(lte(auditLog.createdAt, fim));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [logs, countResult] = await Promise.all([
        d.select().from(auditLog)
          .where(where)
          .orderBy(desc(auditLog.createdAt))
          .limit(input.limit)
          .offset(input.offset),
        d.select({ count: auditLog.id }).from(auditLog).where(where),
      ]);

      return { logs, total: countResult.length };
    }),

  // Buscar logs de uma entidade específica
  getByEntidade: protectedProcedure
    .input(z.object({
      entidade: z.string(),
      entidadeId: z.number(),
    }))
    .query(async ({ input }) => {
      const d = await getDb();
      if (!d) return [];
      return d.select().from(auditLog)
        .where(and(
          eq(auditLog.entidade, input.entidade),
          eq(auditLog.entidadeId, input.entidadeId),
        ))
        .orderBy(desc(auditLog.createdAt))
        .limit(50);
    }),
});
