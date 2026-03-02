import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createPagamento,
  createRecebimento,
  deletePagamento,
  deleteRecebimento,
  getDashboardStats,
  getPagamentoById,
  getPagamentosStats,
  getRecebimentoById,
  getRecebimentosStats,
  listPagamentos,
  listRecebimentos,
  updatePagamento,
  updateRecebimento,
} from "./db";

const pagamentosRouter = router({
  list: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      centroCusto: z.string().optional(),
      dataInicio: z.date().optional(),
      dataFim: z.date().optional(),
    }).optional())
    .query(({ input }) => listPagamentos(input)),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getPagamentoById(input.id)),

  create: protectedProcedure
    .input(z.object({
      nomeCompleto: z.string().min(1),
      cpf: z.string().optional(),
      banco: z.string().optional(),
      chavePix: z.string().optional(),
      tipoPix: z.enum(["CPF", "CNPJ", "Email", "Telefone", "Chave Aleatória"]).optional(),
      tipoServico: z.string().optional(),
      centroCusto: z.string().optional(),
      valor: z.string().min(1),
      dataPagamento: z.date(),
      status: z.enum(["Pendente", "Processando", "Pago", "Cancelado"]).default("Pendente"),
      descricao: z.string().optional(),
      observacao: z.string().optional(),
      autorizadoPor: z.string().optional(),
    }))
    .mutation(({ input, ctx }) => createPagamento({ ...input, createdBy: ctx.user.id })),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      nomeCompleto: z.string().min(1).optional(),
      cpf: z.string().optional(),
      banco: z.string().optional(),
      chavePix: z.string().optional(),
      tipoPix: z.enum(["CPF", "CNPJ", "Email", "Telefone", "Chave Aleatória"]).optional(),
      tipoServico: z.string().optional(),
      centroCusto: z.string().optional(),
      valor: z.string().optional(),
      dataPagamento: z.date().optional(),
      status: z.enum(["Pendente", "Processando", "Pago", "Cancelado"]).optional(),
      descricao: z.string().optional(),
      observacao: z.string().optional(),
      autorizadoPor: z.string().optional(),
    }))
    .mutation(({ input }) => { const { id, ...data } = input; return updatePagamento(id, data); }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deletePagamento(input.id)),

  stats: protectedProcedure.query(() => getPagamentosStats()),
});

const recebimentosRouter = router({
  list: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      tipoRecebimento: z.string().optional(),
      dataInicio: z.date().optional(),
      dataFim: z.date().optional(),
    }).optional())
    .query(({ input }) => listRecebimentos(input)),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getRecebimentoById(input.id)),

  create: protectedProcedure
    .input(z.object({
      numeroContrato: z.string().optional(),
      nomeRazaoSocial: z.string().min(1),
      descricao: z.string().optional(),
      tipoRecebimento: z.enum(["Pix", "Boleto", "Transferência", "Cartão", "Dinheiro", "Outro"]).default("Pix"),
      valorTotal: z.string().min(1),
      valorEquipamento: z.string().optional().default("0"),
      valorServico: z.string().optional().default("0"),
      quantidadeParcelas: z.number().min(1).default(1),
      parcelaAtual: z.number().min(1).optional(),
      dataVencimento: z.date(),
      dataRecebimento: z.date().optional(),
      status: z.enum(["Pendente", "Recebido", "Atrasado", "Cancelado"]).default("Pendente"),
      observacao: z.string().optional(),
    }))
    .mutation(({ input, ctx }) => createRecebimento({ ...input, createdBy: ctx.user.id })),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      numeroContrato: z.string().optional(),
      nomeRazaoSocial: z.string().min(1).optional(),
      descricao: z.string().optional(),
      tipoRecebimento: z.enum(["Pix", "Boleto", "Transferência", "Cartão", "Dinheiro", "Outro"]).optional(),
      valorTotal: z.string().optional(),
      valorEquipamento: z.string().optional(),
      valorServico: z.string().optional(),
      quantidadeParcelas: z.number().min(1).optional(),
      parcelaAtual: z.number().min(1).optional(),
      dataVencimento: z.date().optional(),
      dataRecebimento: z.date().optional(),
      status: z.enum(["Pendente", "Recebido", "Atrasado", "Cancelado"]).optional(),
      observacao: z.string().optional(),
    }))
    .mutation(({ input }) => { const { id, ...data } = input; return updateRecebimento(id, data); }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteRecebimento(input.id)),

  stats: protectedProcedure.query(() => getRecebimentosStats()),
});

const dashboardRouter = router({
  stats: protectedProcedure.query(() => getDashboardStats()),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  pagamentos: pagamentosRouter,
  recebimentos: recebimentosRouter,
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;
