import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createPagamento,
  createPagamentoParcelas,
  createRecebimento,
  createRecebimentoParcelas,
  deletePagamento,
  deletePagamentoParcelas,
  deleteRecebimento,
  deleteRecebimentoParcelas,
  deleteUser,
  getDashboardStats,
  getEmpresaConfig,
  getPagamentoById,
  getPagamentosStats,
  getRecebimentoById,
  getRecebimentosStats,
  listPagamentoParcelas,
  listPagamentos,
  listRecebimentoParcelas,
  listRecebimentos,
  listUsers,
  updatePagamento,
  updatePagamentoParcela,
  updateRecebimento,
  updateRecebimentoParcela,
  updateUserRole,
  upsertEmpresaConfig,
} from "./db";

// Procedure que exige role admin
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a administradores." });
  }
  return next({ ctx });
});

// Procedure que exige admin ou operador (bloqueia role "user" simples)
const staffProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "operador") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Acesso não autorizado." });
  }
  return next({ ctx });
});

const TIPOS_RECEBIMENTO = ["Pix", "Boleto", "Transferência", "Cartão de Crédito", "Cartão de Débito", "Dinheiro", "Outro"] as const;

const pagamentosRouter = router({
  list: staffProcedure
    .input(z.object({
      status: z.string().optional(),
      centroCusto: z.string().optional(),
      dataInicio: z.date().optional(),
      dataFim: z.date().optional(),
    }).optional())
    .query(({ input }) => listPagamentos(input)),

  getById: staffProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getPagamentoById(input.id)),

  create: staffProcedure
    .input(z.object({
      numeroControle: z.string().optional(),
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

  update: staffProcedure
    .input(z.object({
      id: z.number(),
      numeroControle: z.string().optional(),
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

  // Somente admin pode excluir pagamentos
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deletePagamento(input.id)),

  stats: staffProcedure.query(() => getPagamentosStats()),
});

const recebimentosRouter = router({
  list: staffProcedure
    .input(z.object({
      status: z.string().optional(),
      tipoRecebimento: z.string().optional(),
      dataInicio: z.date().optional(),
      dataFim: z.date().optional(),
    }).optional())
    .query(({ input }) => listRecebimentos(input)),

  getById: staffProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getRecebimentoById(input.id)),

  create: staffProcedure
    .input(z.object({
      numeroControle: z.string().optional(),
      numeroContrato: z.string().optional(),
      nomeRazaoSocial: z.string().min(1),
      descricao: z.string().optional(),
      tipoRecebimento: z.enum(TIPOS_RECEBIMENTO).default("Pix"),
      valorTotal: z.string().min(1),
      valorEquipamento: z.string().optional().default("0"),
      valorServico: z.string().optional().default("0"),
      juros: z.string().optional().default("0"),
      desconto: z.string().optional().default("0"),
      quantidadeParcelas: z.number().min(1).default(1),
      parcelaAtual: z.number().min(1).optional(),
      dataVencimento: z.date(),
      dataRecebimento: z.date().optional(),
      status: z.enum(["Pendente", "Recebido", "Atrasado", "Cancelado"]).default("Pendente"),
      observacao: z.string().optional(),
    }))
    .mutation(({ input, ctx }) => createRecebimento({ ...input, createdBy: ctx.user.id })),

  update: staffProcedure
    .input(z.object({
      id: z.number(),
      numeroControle: z.string().optional(),
      numeroContrato: z.string().optional(),
      nomeRazaoSocial: z.string().min(1).optional(),
      descricao: z.string().optional(),
      tipoRecebimento: z.enum(TIPOS_RECEBIMENTO).optional(),
      valorTotal: z.string().optional(),
      valorEquipamento: z.string().optional(),
      valorServico: z.string().optional(),
      juros: z.string().optional(),
      desconto: z.string().optional(),
      quantidadeParcelas: z.number().min(1).optional(),
      parcelaAtual: z.number().min(1).optional(),
      dataVencimento: z.date().optional(),
      dataRecebimento: z.date().optional(),
      status: z.enum(["Pendente", "Recebido", "Atrasado", "Cancelado"]).optional(),
      observacao: z.string().optional(),
    }))
    .mutation(({ input }) => { const { id, ...data } = input; return updateRecebimento(id, data); }),

  // Somente admin pode excluir recebimentos
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteRecebimento(input.id)),

  stats: staffProcedure.query(() => getRecebimentosStats()),
});

const dashboardRouter = router({
  stats: staffProcedure.query(() => getDashboardStats()),
});

const usersRouter = router({
  list: adminProcedure.query(() => listUsers()),
  updateRole: adminProcedure
    .input(z.object({
      id: z.number(),
      role: z.enum(["admin", "operador", "user"]),
    }))
    .mutation(({ input }) => updateUserRole(input.id, input.role)),
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteUser(input.id)),
});

const empresaRouter = router({
  get: staffProcedure.query(() => getEmpresaConfig()),
  save: adminProcedure
    .input(z.object({
      nomeEmpresa: z.string().min(1).optional(),
      cnpj: z.string().optional(),
      telefone: z.string().optional(),
      email: z.string().email().optional(),
      endereco: z.string().optional(),
      logoUrl: z.string().optional(),
      corPrimaria: z.string().optional(),
    }))
    .mutation(({ input }) => upsertEmpresaConfig(input)),
});

const parcelaSchema = z.object({
  numeroParcela: z.number(),
  valor: z.string(),
  dataVencimento: z.date(),
  dataPagamento: z.date().optional(),
  status: z.enum(["Pendente", "Pago", "Atrasado", "Cancelado"]).optional(),
  observacao: z.string().optional(),
});

const parcelaRecebimentoSchema = z.object({
  numeroParcela: z.number(),
  valor: z.string(),
  dataVencimento: z.date(),
  dataRecebimento: z.date().optional(),
  status: z.enum(["Pendente", "Recebido", "Atrasado", "Cancelado"]).optional(),
  observacao: z.string().optional(),
});

const pagamentoParcelasRouter = router({
  list: staffProcedure
    .input(z.object({ pagamentoId: z.number() }))
    .query(({ input }) => listPagamentoParcelas(input.pagamentoId)),
  createBulk: staffProcedure
    .input(z.object({
      pagamentoId: z.number(),
      parcelas: z.array(parcelaSchema),
    }))
    .mutation(({ input }) =>
      createPagamentoParcelas(input.parcelas.map(p => ({ ...p, pagamentoId: input.pagamentoId })))
    ),
  update: staffProcedure
    .input(z.object({
      id: z.number(),
      data: parcelaSchema.partial(),
    }))
    .mutation(({ input }) => updatePagamentoParcela(input.id, input.data)),
  deleteBulk: staffProcedure
    .input(z.object({ pagamentoId: z.number() }))
    .mutation(({ input }) => deletePagamentoParcelas(input.pagamentoId)),
});

const recebimentoParcelasRouter = router({
  list: staffProcedure
    .input(z.object({ recebimentoId: z.number() }))
    .query(({ input }) => listRecebimentoParcelas(input.recebimentoId)),
  createBulk: staffProcedure
    .input(z.object({
      recebimentoId: z.number(),
      parcelas: z.array(parcelaRecebimentoSchema),
    }))
    .mutation(({ input }) =>
      createRecebimentoParcelas(input.parcelas.map(p => ({ ...p, recebimentoId: input.recebimentoId })))
    ),
  update: staffProcedure
    .input(z.object({
      id: z.number(),
      data: parcelaRecebimentoSchema.partial(),
    }))
    .mutation(({ input }) => updateRecebimentoParcela(input.id, input.data)),
  deleteBulk: staffProcedure
    .input(z.object({ recebimentoId: z.number() }))
    .mutation(({ input }) => deleteRecebimentoParcelas(input.recebimentoId)),
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
  usuarios: usersRouter,
  empresa: empresaRouter,
  pagamentoParcelas: pagamentoParcelasRouter,
  recebimentoParcelas: recebimentoParcelasRouter,
});

export type AppRouter = typeof appRouter;
