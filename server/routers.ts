import { z } from "zod";
import { tiposServicoRouter, materiaisRouter, contratosRouter, ordensServicoRouter } from "./routers/engenharia";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createCentroCusto,
  createCliente,
  createConvite,
  createPagamento,
  createPagamentoParcelas,
  createRecebimento,
  createRecebimentoParcelas,
  deleteCentroCusto,
  deleteCliente,
  deletePagamento,
  deletePagamentoParcelas,
  deleteConvite,
  deleteRecebimento,
  deleteRecebimentoParcelas,
  deleteUser,
  getDashboardHistoricoMensal,
  getDashboardPorCentroCusto,
  getDashboardStats,
  getConviteByToken,
  getEmpresaConfig,
  getExtratoCliente,
  getPagamentoById,
  getPagamentosStats,
  getRecebimentoById,
  getRecebimentosStats,
  listCentrosCusto,
  listClientes,
  listConvites,
  listPagamentoParcelas,
  listPagamentos,
  listRecebimentoParcelas,
  listRecebimentos,
  listUsers,
  markConviteAceito,
  toggleUserAtivo,
  updateCentroCusto,
  updateCliente,
  updatePagamento,
  updatePagamentoParcela,
  updateRecebimento,
  updateRecebimentoParcela,
  updateUserRole,
  upsertEmpresaConfig,
  getNextNumeroControlePagamento,
  getVencimentosProximos,
  getDashboardConfig,
  saveDashboardConfig,
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

  // Retorna o próximo número de controle sugerido (ex: PAG-2026-042)
  nextNumeroControle: staffProcedure.query(() => getNextNumeroControlePagamento()),
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
  stats: staffProcedure
    .input(z.object({
      dataInicio: z.date().optional(),
      dataFim: z.date().optional(),
    }).optional())
    .query(({ input }) => getDashboardStats(input?.dataInicio, input?.dataFim)),
  historicoMensal: staffProcedure
    .input(z.object({ meses: z.number().min(1).max(24).default(6) }).optional())
    .query(({ input }) => getDashboardHistoricoMensal(input?.meses ?? 6)),
  porCentroCusto: staffProcedure
    .input(z.object({
      dataInicio: z.date().optional(),
      dataFim: z.date().optional(),
    }).optional())
    .query(({ input }) => getDashboardPorCentroCusto(input?.dataInicio, input?.dataFim)),
  vencimentosProximos: staffProcedure
    .input(z.object({ dias: z.number().min(1).max(30).default(7) }).optional())
    .query(({ input }) => getVencimentosProximos(input?.dias ?? 7)),
  // Configuração de widgets do dashboard (restrito a admin)
  getConfig: adminProcedure
    .query(({ ctx }) => getDashboardConfig(ctx.user.id)),
  saveConfig: adminProcedure
    .input(z.object({
      widgets: z.string(), // JSON string com array de widgets
      tema: z.string().default("azul"),
    }))
    .mutation(({ input, ctx }) => saveDashboardConfig(ctx.user.id, input.widgets, input.tema)),
});

// ─── Clientes ─────────────────────────────────────────────────────────────────
const clientesRouter = router({
  list: staffProcedure.query(() => listClientes()),
  create: staffProcedure
    .input(z.object({
      nome: z.string().min(1, "Nome é obrigatório"),
      tipo: z.enum(["Cliente", "Prestador de Serviço", "Fornecedor", "Hotel", "Parceiro", "Outro"]).default("Cliente"),
      cpfCnpj: z.string().optional(),
      email: z.string().optional().or(z.literal("")),
      telefone: z.string().optional(),
      endereco: z.string().optional(),
      cidade: z.string().optional(),
      estado: z.string().max(2).optional(),
      observacao: z.string().optional(),
      tipoPix: z.enum(["CPF", "CNPJ", "Email", "Telefone", "Chave Aleatória"]).optional(),
      chavePix: z.string().optional(),
      banco: z.string().optional(),
    }))
    .mutation(({ input, ctx }) => createCliente({ ...input, createdBy: ctx.user.id })),
  update: staffProcedure
    .input(z.object({
      id: z.number(),
      nome: z.string().min(1).optional(),
      tipo: z.enum(["Cliente", "Prestador de Serviço", "Fornecedor", "Hotel", "Parceiro", "Outro"]).optional(),
      cpfCnpj: z.string().optional(),
      email: z.string().optional().or(z.literal("")),
      telefone: z.string().optional(),
      endereco: z.string().optional(),
      cidade: z.string().optional(),
      estado: z.string().max(2).optional(),
      observacao: z.string().optional(),
      ativo: z.boolean().optional(),
      tipoPix: z.enum(["CPF", "CNPJ", "Email", "Telefone", "Chave Aleatória"]).optional(),
      chavePix: z.string().optional(),
      banco: z.string().optional(),
    }))
    .mutation(({ input }) => { const { id, ...data } = input; return updateCliente(id, data); }),
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteCliente(input.id)),
  extrato: staffProcedure
    .input(z.object({ clienteId: z.number() }))
    .query(({ input }) => getExtratoCliente(input.clienteId)),
});

// ─── Centros de Custo ─────────────────────────────────────────────────────────
const centrosCustoRouter = router({
  list: staffProcedure.query(() => listCentrosCusto()),
  create: staffProcedure
    .input(z.object({
      nome: z.string().min(1, "Nome é obrigatório"),
      descricao: z.string().optional(),
    }))
    .mutation(({ input, ctx }) => createCentroCusto({ ...input, createdBy: ctx.user.id })),
  update: staffProcedure
    .input(z.object({
      id: z.number(),
      nome: z.string().min(1).optional(),
      descricao: z.string().optional(),
      ativo: z.boolean().optional(),
    }))
    .mutation(({ input }) => { const { id, ...data } = input; return updateCentroCusto(id, data); }),
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteCentroCusto(input.id)),
});

const usersRouter = router({
  list: adminProcedure.query(() => listUsers()),
  updateRole: adminProcedure
    .input(z.object({
      id: z.number(),
      role: z.enum(["admin", "operador", "user"]),
    }))
    .mutation(({ input }) => updateUserRole(input.id, input.role)),
  toggleAtivo: adminProcedure
    .input(z.object({ id: z.number(), ativo: z.boolean() }))
    .mutation(({ input }) => toggleUserAtivo(input.id, input.ativo)),
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteUser(input.id)),
});

const convitesRouter = router({
  list: adminProcedure.query(() => listConvites()),
  create: adminProcedure
    .input(z.object({
      email: z.string().email(),
      nome: z.string().optional(),
      role: z.enum(["admin", "operador", "user"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const { nanoid } = await import("nanoid");
      const token = nanoid(48);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias
      await createConvite({
        email: input.email,
        nome: input.nome,
        role: input.role,
        token,
        expiresAt,
        createdBy: ctx.user.id,
      });
      const baseUrl = (ctx.req as any).headers?.origin ?? "";
      const link = `${baseUrl}/convite/${token}`;
      return { token, link, expiresAt };
    }),
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteConvite(input.id)),
  aceitar: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const convite = await getConviteByToken(input.token);
      if (!convite) throw new TRPCError({ code: "NOT_FOUND", message: "Convite não encontrado." });
      if (convite.status !== "pendente") throw new TRPCError({ code: "BAD_REQUEST", message: "Este convite já foi utilizado ou expirou." });
      if (new Date() > convite.expiresAt) throw new TRPCError({ code: "BAD_REQUEST", message: "Convite expirado." });
      return { email: convite.email, nome: convite.nome, role: convite.role, token: convite.token };
    }),
  confirmar: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input }) => {
      const convite = await getConviteByToken(input.token);
      if (!convite || convite.status !== "pendente") throw new TRPCError({ code: "BAD_REQUEST", message: "Convite inválido." });
      if (new Date() > convite.expiresAt) throw new TRPCError({ code: "BAD_REQUEST", message: "Convite expirado." });
      await markConviteAceito(input.token);
      return { success: true, email: convite.email, role: convite.role };
    }),
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
  clientes: clientesRouter,
  centrosCusto: centrosCustoRouter,
  usuarios: usersRouter,
  empresa: empresaRouter,
  pagamentoParcelas: pagamentoParcelasRouter,
  recebimentoParcelas: recebimentoParcelasRouter,
  convites: convitesRouter,
  tiposServico: tiposServicoRouter,
  materiais: materiaisRouter,
  contratos: contratosRouter,
  ordensServico: ordensServicoRouter,
});

export type AppRouter = typeof appRouter;
