import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { projetoOrcamento, pagamentos, projetos, pagamentoParcelas } from "../../drizzle/schema";
import { eq, and, sql, sum, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

const CATEGORIAS = ["Material", "Mao_de_Obra", "Equipamentos", "Terceiros", "Outros"] as const;
type Categoria = typeof CATEGORIAS[number];

const CATEGORIA_LABELS: Record<Categoria, string> = {
  Material: "Material",
  Mao_de_Obra: "Mão de Obra",
  Equipamentos: "Equipamentos",
  Terceiros: "Terceiros",
  Outros: "Outros",
};

export const orcamentoRouter = router({
  // Buscar orçamento de um projeto com custo realizado por categoria
  getByProjeto: protectedProcedure
    .input(z.object({ projetoId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB indisponível" });

      // Buscar orçamento previsto por categoria
      const orcamentos = await db
        .select()
        .from(projetoOrcamento)
        .where(eq(projetoOrcamento.projetoId, input.projetoId));

      // Buscar custo realizado por categoria (soma dos pagamentos pagos ou pendentes)
      const custosRealizados = await db
        .select({
          categoria: pagamentos.categoriaCusto,
          totalRealizado: sql<string>`COALESCE(SUM(${pagamentos.valor}), 0)`,
        })
        .from(pagamentos)
        .where(
          and(
            eq(pagamentos.projetoId, input.projetoId),
            sql`${pagamentos.status} IN ('Pago', 'Pendente', 'Processando')`
          )
        )
        .groupBy(pagamentos.categoriaCusto);

      // Buscar dados do projeto
      const [projeto] = await db
        .select({
          id: projetos.id,
          nome: projetos.nome,
          valorContratado: projetos.valorContratado,
          exigeOrcamento: projetos.exigeOrcamento,
        })
        .from(projetos)
        .where(eq(projetos.id, input.projetoId))
        .limit(1);

      if (!projeto) throw new TRPCError({ code: "NOT_FOUND", message: "Projeto não encontrado" });

      // Montar mapa de custos realizados por categoria
      const custoMap: Record<string, number> = {};
      for (const c of custosRealizados) {
        if (c.categoria) {
          custoMap[c.categoria] = parseFloat(c.totalRealizado || "0");
        }
      }

      // Montar mapa de orçamentos por categoria
      const orcamentoMap: Record<string, { id: number; valorPrevisto: number; observacao: string | null }> = {};
      for (const o of orcamentos) {
        orcamentoMap[o.categoria] = {
          id: o.id,
          valorPrevisto: parseFloat(o.valorPrevisto || "0"),
          observacao: o.observacao,
        };
      }

      // Calcular totais por categoria
      const categorias = CATEGORIAS.map((cat) => {
        const previsto = orcamentoMap[cat]?.valorPrevisto ?? 0;
        const realizado = custoMap[cat] ?? 0;
        const desvioAbsoluto = realizado - previsto;
        const desvioPercentual = previsto > 0 ? ((desvioAbsoluto / previsto) * 100) : null;

        return {
          categoria: cat,
          label: CATEGORIA_LABELS[cat],
          id: orcamentoMap[cat]?.id ?? null,
          valorPrevisto: previsto,
          valorRealizado: realizado,
          desvioAbsoluto,
          desvioPercentual,
          observacao: orcamentoMap[cat]?.observacao ?? null,
          alerta: desvioPercentual !== null && desvioPercentual > 10,
        };
      });

      const totalPrevisto = categorias.reduce((s, c) => s + c.valorPrevisto, 0);
      const totalRealizado = categorias.reduce((s, c) => s + c.valorRealizado, 0);
      const totalDesvio = totalRealizado - totalPrevisto;
      const totalDesvioPercentual = totalPrevisto > 0 ? ((totalDesvio / totalPrevisto) * 100) : null;

      // Receita do projeto (recebimentos pagos)
      const [receitaRow] = await db.execute(
        sql`SELECT COALESCE(SUM(valor_total), 0) as total FROM recebimentos WHERE projeto_id = ${input.projetoId} AND status = 'Recebido'`
      ) as any;
      const receitaRealizada = parseFloat((receitaRow as any)?.[0]?.total ?? "0");
      const margemBruta = receitaRealizada - totalRealizado;
      const margemPercentual = receitaRealizada > 0 ? ((margemBruta / receitaRealizada) * 100) : null;

      return {
        projeto: {
          id: projeto.id,
          nome: projeto.nome,
          valorContratado: parseFloat(projeto.valorContratado || "0"),
          exigeOrcamento: projeto.exigeOrcamento,
        },
        categorias,
        totais: {
          totalPrevisto,
          totalRealizado,
          totalDesvio,
          totalDesvioPercentual,
          receitaRealizada,
          margemBruta,
          margemPercentual,
        },
      };
    }),

  // Upsert de orçamento por categoria (criar ou atualizar)
  upsert: protectedProcedure
    .input(
      z.object({
        projetoId: z.number().int().positive(),
        categoria: z.enum(CATEGORIAS),
        valorPrevisto: z.number().min(0),
        observacao: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB indisponível" });

      // Verificar se já existe orçamento para esta categoria neste projeto
      const [existing] = await db
        .select({ id: projetoOrcamento.id })
        .from(projetoOrcamento)
        .where(
          and(
            eq(projetoOrcamento.projetoId, input.projetoId),
            eq(projetoOrcamento.categoria, input.categoria)
          )
        )
        .limit(1);

      if (existing) {
        await db
          .update(projetoOrcamento)
          .set({
            valorPrevisto: input.valorPrevisto.toFixed(2),
            observacao: input.observacao ?? null,
            updatedAt: new Date(),
          })
          .where(eq(projetoOrcamento.id, existing.id));
        return { id: existing.id, action: "updated" };
      } else {
        const [result] = await db.insert(projetoOrcamento).values({
          projetoId: input.projetoId,
          categoria: input.categoria,
          valorPrevisto: input.valorPrevisto.toFixed(2),
          observacao: input.observacao ?? null,
          createdBy: ctx.user.id,
        });
        return { id: (result as any).insertId, action: "created" };
      }
    }),

  // Salvar orçamento completo (todas as categorias de uma vez)
  saveAll: protectedProcedure
    .input(
      z.object({
        projetoId: z.number().int().positive(),
        categorias: z.array(
          z.object({
            categoria: z.enum(CATEGORIAS),
            valorPrevisto: z.number().min(0),
            observacao: z.string().optional(),
          })
        ),
        ativarExigencia: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB indisponível" });

      // Upsert de cada categoria
      for (const cat of input.categorias) {
        const [existing] = await db
          .select({ id: projetoOrcamento.id })
          .from(projetoOrcamento)
          .where(
            and(
              eq(projetoOrcamento.projetoId, input.projetoId),
              eq(projetoOrcamento.categoria, cat.categoria)
            )
          )
          .limit(1);

        if (existing) {
          await db
            .update(projetoOrcamento)
            .set({
              valorPrevisto: cat.valorPrevisto.toFixed(2),
              observacao: cat.observacao ?? null,
              updatedAt: new Date(),
            })
            .where(eq(projetoOrcamento.id, existing.id));
        } else {
          await db.insert(projetoOrcamento).values({
            projetoId: input.projetoId,
            categoria: cat.categoria,
            valorPrevisto: cat.valorPrevisto.toFixed(2),
            observacao: cat.observacao ?? null,
            createdBy: ctx.user.id,
          });
        }
      }

      // Ativar exigência de orçamento no projeto se solicitado
      if (input.ativarExigencia) {
        await db
          .update(projetos)
          .set({ exigeOrcamento: true, updatedAt: new Date() })
          .where(eq(projetos.id, input.projetoId));
      }

      return { success: true };
    }),

  // Listar resumo de orçamento de todos os projetos (para dashboard)
  listResumo: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB indisponível" });

    const resumos = await db.execute(
      sql`
        SELECT 
          p.id,
          p.nome,
          p.valorContratado,
          p.exigeOrcamento,
          COALESCE(SUM(po.valorPrevisto), 0) as totalPrevisto,
          COALESCE((
            SELECT SUM(pg.valor) 
            FROM pagamentos pg 
            WHERE pg.projetoId = p.id 
            AND pg.status IN ('Pago', 'Pendente', 'Processando')
          ), 0) as totalRealizado
        FROM projetos p
        LEFT JOIN projeto_orcamento po ON po.projetoId = p.id
        GROUP BY p.id, p.nome, p.valorContratado, p.exigeOrcamento
        ORDER BY p.nome ASC
      `
    ) as any;

    return ((resumos as any)[0] as any[]).map((r: any) => {
      const previsto = parseFloat(r.totalPrevisto || "0");
      const realizado = parseFloat(r.totalRealizado || "0");
      const desvio = previsto > 0 ? (((realizado - previsto) / previsto) * 100) : null;
      return {
        id: r.id,
        nome: r.nome,
        valorContratado: parseFloat(r.valorContratado || "0"),
        exigeOrcamento: Boolean(r.exigeOrcamento),
        totalPrevisto: previsto,
        totalRealizado: realizado,
        desvioPercentual: desvio,
        alerta: desvio !== null && desvio > 10,
      };
    });
  }),
});
