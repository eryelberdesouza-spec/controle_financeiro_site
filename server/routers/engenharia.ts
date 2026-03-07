import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  tiposServico, materiais, contratos, ordensServico, osItens, clientes
} from "../../drizzle/schema";
import { eq, like, desc, and, sql } from "drizzle-orm";

// ─── Tipos de Serviço ─────────────────────────────────────────────────────────
export const tiposServicoRouter = router({
  list: protectedProcedure
    .input(z.object({ busca: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const d = await getDb();
      if (!d) return [];
      const cond = input?.busca ? like(tiposServico.nome, `%${input.busca}%`) : undefined;
      return d.select().from(tiposServico).where(cond).orderBy(tiposServico.codigo);
    }),

  create: protectedProcedure
    .input(z.object({
      codigo: z.string().min(1).max(30),
      nome: z.string().min(1).max(200),
      descricao: z.string().optional(),
      unidade: z.string().optional(),
      valorUnitario: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const d = await getDb();
      if (!d) throw new Error("DB unavailable");
      const [result] = await d.insert(tiposServico).values({
        ...input,
        valorUnitario: input.valorUnitario?.toString(),
        createdBy: ctx.user.id,
      });
      return { id: result.insertId };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      codigo: z.string().min(1).max(30),
      nome: z.string().min(1).max(200),
      descricao: z.string().optional(),
      unidade: z.string().optional(),
      valorUnitario: z.number().optional(),
      ativo: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const d = await getDb();
      if (!d) throw new Error("DB unavailable");
      const { id, ...data } = input;
      await d.update(tiposServico).set({
        ...data,
        valorUnitario: data.valorUnitario?.toString(),
      }).where(eq(tiposServico.id, id));
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const d = await getDb();
      if (!d) throw new Error("DB unavailable");
      await d.delete(tiposServico).where(eq(tiposServico.id, input.id));
    }),
});

// ─── Materiais ────────────────────────────────────────────────────────────────
export const materiaisRouter = router({
  list: protectedProcedure
    .input(z.object({ busca: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const d = await getDb();
      if (!d) return [];
      const cond = input?.busca ? like(materiais.nome, `%${input.busca}%`) : undefined;
      return d.select().from(materiais).where(cond).orderBy(materiais.codigo);
    }),

  create: protectedProcedure
    .input(z.object({
      codigo: z.string().min(1).max(30),
      nome: z.string().min(1).max(200),
      descricao: z.string().optional(),
      unidade: z.string().optional(),
      valorUnitario: z.number().optional(),
      estoque: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const d = await getDb();
      if (!d) throw new Error("DB unavailable");
      const [result] = await d.insert(materiais).values({
        ...input,
        valorUnitario: input.valorUnitario?.toString(),
        estoque: input.estoque?.toString() ?? "0",
        createdBy: ctx.user.id,
      });
      return { id: result.insertId };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      codigo: z.string().min(1).max(30),
      nome: z.string().min(1).max(200),
      descricao: z.string().optional(),
      unidade: z.string().optional(),
      valorUnitario: z.number().optional(),
      estoque: z.number().optional(),
      ativo: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const d = await getDb();
      if (!d) throw new Error("DB unavailable");
      const { id, ...data } = input;
      await d.update(materiais).set({
        ...data,
        valorUnitario: data.valorUnitario?.toString(),
        estoque: data.estoque?.toString(),
      }).where(eq(materiais.id, id));
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const d = await getDb();
      if (!d) throw new Error("DB unavailable");
      await d.delete(materiais).where(eq(materiais.id, input.id));
    }),
});

// ─── Contratos ────────────────────────────────────────────────────────────────
export const contratosRouter = router({
  list: protectedProcedure
    .input(z.object({
      busca: z.string().optional(),
      status: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const d = await getDb();
      if (!d) return [];
      const conditions = [];
      if (input?.status) conditions.push(eq(contratos.status, input.status as any));
      return d
        .select({
          id: contratos.id,
          numero: contratos.numero,
          objeto: contratos.objeto,
          tipo: contratos.tipo,
          status: contratos.status,
          valorTotal: contratos.valorTotal,
          dataInicio: contratos.dataInicio,
          dataFim: contratos.dataFim,
          descricao: contratos.descricao,
          observacoes: contratos.observacoes,
          clienteId: contratos.clienteId,
          recebimentoId: contratos.recebimentoId,
          pagamentoId: contratos.pagamentoId,
          createdAt: contratos.createdAt,
          clienteNome: clientes.nome,
        })
        .from(contratos)
        .leftJoin(clientes, eq(contratos.clienteId, clientes.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(contratos.createdAt));
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const d = await getDb();
      if (!d) return null;
      const [row] = await d
        .select({
          id: contratos.id,
          numero: contratos.numero,
          objeto: contratos.objeto,
          tipo: contratos.tipo,
          status: contratos.status,
          valorTotal: contratos.valorTotal,
          dataInicio: contratos.dataInicio,
          dataFim: contratos.dataFim,
          descricao: contratos.descricao,
          observacoes: contratos.observacoes,
          clienteId: contratos.clienteId,
          recebimentoId: contratos.recebimentoId,
          pagamentoId: contratos.pagamentoId,
          createdAt: contratos.createdAt,
          clienteNome: clientes.nome,
        })
        .from(contratos)
        .leftJoin(clientes, eq(contratos.clienteId, clientes.id))
        .where(eq(contratos.id, input.id));
      return row ?? null;
    }),

  create: protectedProcedure
    .input(z.object({
      numero: z.string().min(1).max(50),
      objeto: z.string().min(1),
      tipo: z.enum(["prestacao_servico", "fornecimento", "locacao", "misto"]),
      status: z.enum(["negociacao", "ativo", "suspenso", "encerrado", "cancelado"]).optional(),
      clienteId: z.number().optional(),
      valorTotal: z.number(),
      dataInicio: z.string().optional(),
      dataFim: z.string().optional(),
      descricao: z.string().optional(),
      observacoes: z.string().optional(),
      recebimentoId: z.number().optional(),
      pagamentoId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const d = await getDb();
      if (!d) throw new Error("DB unavailable");
      const [result] = await d.insert(contratos).values({
        ...input,
        valorTotal: input.valorTotal.toString(),
        dataInicio: input.dataInicio ? new Date(input.dataInicio) : null,
        dataFim: input.dataFim ? new Date(input.dataFim) : null,
        createdBy: ctx.user.id,
      });
      return { id: result.insertId };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      numero: z.string().min(1).max(50),
      objeto: z.string().min(1),
      tipo: z.enum(["prestacao_servico", "fornecimento", "locacao", "misto"]),
      status: z.enum(["negociacao", "ativo", "suspenso", "encerrado", "cancelado"]),
      clienteId: z.number().optional(),
      valorTotal: z.number(),
      dataInicio: z.string().optional(),
      dataFim: z.string().optional(),
      descricao: z.string().optional(),
      observacoes: z.string().optional(),
      recebimentoId: z.number().optional(),
      pagamentoId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const d = await getDb();
      if (!d) throw new Error("DB unavailable");
      const { id, ...data } = input;
      await d.update(contratos).set({
        ...data,
        valorTotal: data.valorTotal.toString(),
        dataInicio: data.dataInicio ? new Date(data.dataInicio) : null,
        dataFim: data.dataFim ? new Date(data.dataFim) : null,
      }).where(eq(contratos.id, id));
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const d = await getDb();
      if (!d) throw new Error("DB unavailable");
      await d.delete(contratos).where(eq(contratos.id, input.id));
    }),

  nextNumero: protectedProcedure.query(async () => {
    const d = await getDb();
    if (!d) return `CTR-${new Date().getFullYear()}-001`;
    const [row] = await d
      .select({ max: sql<string>`MAX(CAST(SUBSTRING_INDEX(numero, '-', -1) AS UNSIGNED))` })
      .from(contratos);
    const next = (parseInt(row?.max ?? "0") || 0) + 1;
    return `CTR-${new Date().getFullYear()}-${String(next).padStart(3, "0")}`;
  }),
});

// ─── Ordens de Serviço ────────────────────────────────────────────────────────
export const ordensServicoRouter = router({
  list: protectedProcedure
    .input(z.object({
      contratoId: z.number().optional(),
      status: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const d = await getDb();
      if (!d) return [];
      const conditions = [];
      if (input?.contratoId) conditions.push(eq(ordensServico.contratoId, input.contratoId));
      if (input?.status) conditions.push(eq(ordensServico.status, input.status as any));
      return d
        .select({
          id: ordensServico.id,
          numero: ordensServico.numero,
          contratoId: ordensServico.contratoId,
          clienteId: ordensServico.clienteId,
          titulo: ordensServico.titulo,
          descricao: ordensServico.descricao,
          status: ordensServico.status,
          prioridade: ordensServico.prioridade,
          responsavel: ordensServico.responsavel,
          dataAbertura: ordensServico.dataAbertura,
          dataPrevisao: ordensServico.dataPrevisao,
          dataConclusao: ordensServico.dataConclusao,
          valorEstimado: ordensServico.valorEstimado,
          valorRealizado: ordensServico.valorRealizado,
          observacoes: ordensServico.observacoes,
          createdAt: ordensServico.createdAt,
          clienteNome: clientes.nome,
          contratoNumero: contratos.numero,
        })
        .from(ordensServico)
        .leftJoin(clientes, eq(ordensServico.clienteId, clientes.id))
        .leftJoin(contratos, eq(ordensServico.contratoId, contratos.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(ordensServico.createdAt));
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const d = await getDb();
      if (!d) return null;
      const [row] = await d.select().from(ordensServico).where(eq(ordensServico.id, input.id));
      if (!row) return null;
      const itens = await d
        .select({
          id: osItens.id,
          tipo: osItens.tipo,
          tipoServicoId: osItens.tipoServicoId,
          materialId: osItens.materialId,
          descricao: osItens.descricao,
          quantidade: osItens.quantidade,
          valorUnitario: osItens.valorUnitario,
          valorTotal: osItens.valorTotal,
          tipoServicoNome: tiposServico.nome,
          materialNome: materiais.nome,
        })
        .from(osItens)
        .leftJoin(tiposServico, eq(osItens.tipoServicoId, tiposServico.id))
        .leftJoin(materiais, eq(osItens.materialId, materiais.id))
        .where(eq(osItens.osId, input.id));
      return { ...row, itens };
    }),

  create: protectedProcedure
    .input(z.object({
      numero: z.string().min(1).max(50),
      contratoId: z.number().optional(),
      clienteId: z.number().optional(),
      titulo: z.string().min(1).max(200),
      descricao: z.string().optional(),
      status: z.enum(["aberta", "em_execucao", "concluida", "cancelada", "pausada"]).optional(),
      prioridade: z.enum(["baixa", "media", "alta", "urgente"]).optional(),
      responsavel: z.string().optional(),
      dataAbertura: z.string().optional(),
      dataPrevisao: z.string().optional(),
      valorEstimado: z.number().optional(),
      observacoes: z.string().optional(),
      itens: z.array(z.object({
        tipo: z.enum(["servico", "material"]),
        tipoServicoId: z.number().optional(),
        materialId: z.number().optional(),
        descricao: z.string().optional(),
        quantidade: z.number(),
        valorUnitario: z.number(),
        valorTotal: z.number(),
      })).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const d = await getDb();
      if (!d) throw new Error("DB unavailable");
      const { itens, ...osData } = input;
      const [result] = await d.insert(ordensServico).values({
        ...osData,
        valorEstimado: osData.valorEstimado?.toString(),
        dataAbertura: osData.dataAbertura ? new Date(osData.dataAbertura) : null,
        dataPrevisao: osData.dataPrevisao ? new Date(osData.dataPrevisao) : null,
        createdBy: ctx.user.id,
      });
      const osId = result.insertId;
      if (itens && itens.length > 0) {
        await d.insert(osItens).values(
          itens.map(item => ({
            osId,
            ...item,
            quantidade: item.quantidade.toString(),
            valorUnitario: item.valorUnitario.toString(),
            valorTotal: item.valorTotal.toString(),
          }))
        );
      }
      return { id: osId };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      titulo: z.string().min(1).max(200),
      descricao: z.string().optional(),
      status: z.enum(["aberta", "em_execucao", "concluida", "cancelada", "pausada"]),
      prioridade: z.enum(["baixa", "media", "alta", "urgente"]),
      responsavel: z.string().optional(),
      dataAbertura: z.string().optional(),
      dataPrevisao: z.string().optional(),
      dataConclusao: z.string().optional(),
      valorEstimado: z.number().optional(),
      valorRealizado: z.number().optional(),
      observacoes: z.string().optional(),
      contratoId: z.number().optional(),
      clienteId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const d = await getDb();
      if (!d) throw new Error("DB unavailable");
      const { id, ...data } = input;
      await d.update(ordensServico).set({
        ...data,
        valorEstimado: data.valorEstimado?.toString(),
        valorRealizado: data.valorRealizado?.toString(),
        dataAbertura: data.dataAbertura ? new Date(data.dataAbertura) : null,
        dataPrevisao: data.dataPrevisao ? new Date(data.dataPrevisao) : null,
        dataConclusao: data.dataConclusao ? new Date(data.dataConclusao) : null,
      }).where(eq(ordensServico.id, id));
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const d = await getDb();
      if (!d) throw new Error("DB unavailable");
      await d.delete(ordensServico).where(eq(ordensServico.id, input.id));
    }),

  nextNumero: protectedProcedure.query(async () => {
    const d = await getDb();
    if (!d) return `OS-${new Date().getFullYear()}-001`;
    const [row] = await d
      .select({ max: sql<string>`MAX(CAST(SUBSTRING_INDEX(numero, '-', -1) AS UNSIGNED))` })
      .from(ordensServico);
    const next = (parseInt(row?.max ?? "0") || 0) + 1;
    return `OS-${new Date().getFullYear()}-${String(next).padStart(3, "0")}`;
  }),

  addItem: protectedProcedure
    .input(z.object({
      osId: z.number(),
      tipo: z.enum(["servico", "material"]),
      tipoServicoId: z.number().optional(),
      materialId: z.number().optional(),
      descricao: z.string().optional(),
      quantidade: z.number(),
      valorUnitario: z.number(),
      valorTotal: z.number(),
    }))
    .mutation(async ({ input }) => {
      const d = await getDb();
      if (!d) throw new Error("DB unavailable");
      const { osId, ...item } = input;
      await d.insert(osItens).values({
        osId,
        ...item,
        quantidade: item.quantidade.toString(),
        valorUnitario: item.valorUnitario.toString(),
        valorTotal: item.valorTotal.toString(),
      });
    }),

  removeItem: protectedProcedure
    .input(z.object({ itemId: z.number() }))
    .mutation(async ({ input }) => {
      const d = await getDb();
      if (!d) throw new Error("DB unavailable");
      await d.delete(osItens).where(eq(osItens.id, input.itemId));
    }),
});
