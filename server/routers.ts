import { z } from "zod";
import { tiposServicoRouter, materiaisRouter, contratosRouter, ordensServicoRouter, relatorioContratoRouter } from "./routers/engenharia";
import { projetosRouter, onPrimeiraOSIniciada } from "./routers/projetos";
import { propostasRouter } from "./routers/propostas";
import { orcamentoRouter } from "./routers/orcamento";
import { auditoriaRouter, registrarAuditoria } from "./routers/auditoria";
import { workflowRouter } from "./routers/workflow";
import { listAnexos, createAnexo, deleteAnexo, type AnexoModulo } from "./db.anexos";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { eq, and, isNull, sql } from "drizzle-orm";
import { recebimentoParcelas, recebimentos, contratos, centrosCusto, pagamentos, projetos, ordensServico } from "../drizzle/schema";
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
  getNextNumeroControleRecebimento,
  getVencimentosProximos,
  getDashboardConfig,
  saveDashboardConfig,
  getRelatorioCentroCusto,
  getUserPermissions,
  setAllUserPermissions,
  resetUserPermissions,
  getModulos,
  checkDuplicateCliente,
  assignCentroCustoPagamentosLote,
  assignCentroCustoRecebimentosLote,
  getResumoPorCentroCusto,
  applyPerfilAcesso,
  getUserByOpenId,
} from "./db";

// Procedure que exige role admin
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a administradores." });
  }
  return next({ ctx });
});

// Procedure que exige admin, operador ou operacional (bloqueia role "user" simples)
const staffProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "operador" && ctx.user.role !== "operacional") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Acesso não autorizado." });
  }
  return next({ ctx });
});

// Helper para verificar permissão granular em uma procedure
async function requirePermission(
  userId: number,
  userRole: string,
  modulo: string,
  acao: "podeVer" | "podeCriar" | "podeEditar" | "podeExcluir"
) {
  if (userRole === "admin") return; // admin sempre passa
  const perms = await getUserPermissions(userId, userRole);
  if (!perms[modulo]?.[acao]) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Você não tem permissão para ${acao === "podeVer" ? "visualizar" : acao === "podeCriar" ? "criar" : acao === "podeEditar" ? "editar" : "excluir"} registros em ${modulo}.`,
    });
  }
}

// Router de permissões granulares
const permissoesRouter = router({
  // Retorna as permissões do usuário logado
  minhasPermissoes: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.user as any;
    return getUserPermissions(user.id, user.role);
  }),
  // Retorna os módulos disponíveis
  modulos: protectedProcedure.query(() => getModulos()),
  // Admin: ver permissões de qualquer usuário
  getByUser: adminProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const db = await import("./db");
      const userResult = await db.listUsers();
      const user = userResult.find(u => u.id === input.userId);
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "Usuário não encontrado." });
      return getUserPermissions(input.userId, user.role);
    }),
  // Admin: definir permissões de um usuário
  setPermissions: adminProcedure
    .input(z.object({
      userId: z.number(),
      permissions: z.array(z.object({
        modulo: z.string(),
        podeVer: z.boolean(),
        podeCriar: z.boolean(),
        podeEditar: z.boolean(),
        podeExcluir: z.boolean(),
      })),
    }))
    .mutation(({ input }) => setAllUserPermissions(input.userId, input.permissions)),
  // Admin: resetar permissões para o padrão do role
  resetPermissions: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(({ input }) => resetUserPermissions(input.userId)),
  // Admin: alterar role do usuário
  setRole: adminProcedure
    .input(z.object({ userId: z.number(), role: z.enum(["admin", "operador", "operacional", "user"]) }))
    .mutation(async ({ input }) => {
      const db = await import("./db");
      await db.updateUserRole(input.userId, input.role as any);
      // Resetar permissões customizadas ao mudar de role
      await resetUserPermissions(input.userId);
      return { success: true };
    }),
  // Retorna os perfis pré-definidos de acesso
  getPerfis: adminProcedure.query(async () => {
    const db = await import("./db");
    return db.getPerfisAcesso();
  }),
  // Admin: aplicar um perfil pré-definido a um usuário
  applyPerfil: adminProcedure
    .input(z.object({ userId: z.number(), perfilId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await import("./db");
      return db.applyPerfilAcesso(input.userId, input.perfilId);
    }),
});

const TIPOS_RECEBIMENTO = ["Pix", "Boleto", "Transferência", "Cartão de Crédito", "Cartão de Débito", "Dinheiro", "Outro"] as const;

const pagamentosRouter = router({
  list: staffProcedure
    .input(z.object({
      status: z.string().optional(),
      centroCusto: z.string().optional(),
      centroCustoId: z.number().optional(),
      clienteId: z.number().optional(),
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
      clienteId: z.number().nullable().optional(),
      centroCustoId: z.number().nullable().optional(),
      contratoId: z.number().nullable().optional(),
      projetoId: z.number().min(1, "Selecione um projeto"),
      categoriaCusto: z.enum(["Material", "Mao_de_Obra", "Equipamentos", "Terceiros", "Outros"]).optional(),
      valor: z.string().min(1),
      valorEquipamento: z.string().optional().default("0"),
      valorServico: z.string().optional().default("0"),
      dataPagamento: z.date(),
      status: z.enum(["Pendente", "Processando", "Pago", "Cancelado"]).default("Pendente"),
      descricao: z.string().optional(),
      observacao: z.string().optional(),
      autorizadoPor: z.string().optional(),
      parcelado: z.boolean().optional(),
      quantidadeParcelas: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Vínculo automático: se CC é do tipo PROJETO, vincular ao projeto do CC
      let projetoId = input.projetoId ?? null;
      if (!projetoId && input.centroCustoId) {
        const db = await getDb();
        if (db) {
          // Buscar o CC para ver se é do tipo PROJETO
          const ccRows = await db
            .select({ classificacao: centrosCusto.classificacao })
            .from(centrosCusto)
            .where(eq(centrosCusto.id, input.centroCustoId))
            .limit(1);
          if (ccRows.length > 0 && ccRows[0].classificacao === "PROJETO") {
            // Buscar o projeto vinculado a este CC
            const projRows = await db
              .select({ id: projetos.id })
              .from(projetos)
              .where(eq(projetos.centroCustoId, input.centroCustoId))
              .limit(1);
            if (projRows.length > 0) {
              projetoId = projRows[0].id;
            }
          }
        }
      }
      const novoPagamento = await createPagamento({ ...input, projetoId, createdBy: ctx.user.id });
      await registrarAuditoria({
        entidade: "pagamento",
        entidadeId: (novoPagamento as any)?.insertId ?? undefined,
        acao: "criacao",
        usuarioId: ctx.user.id,
        usuarioNome: ctx.user.name ?? undefined,
        valorNovo: { ...input, projetoId },
        descricao: `Pagamento criado: ${input.nomeCompleto} — R$ ${input.valor}`,
      });
      return novoPagamento;
    }),

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
      clienteId: z.number().nullable().optional(),
      centroCustoId: z.number().nullable().optional(),
      contratoId: z.number().nullable().optional(),
      projetoId: z.number().nullable().optional(),
      categoriaCusto: z.enum(["Material", "Mao_de_Obra", "Equipamentos", "Terceiros", "Outros"]).optional().nullable(),
      valor: z.string().optional(),
      valorEquipamento: z.string().optional(),
      valorServico: z.string().optional(),
      dataPagamento: z.date().optional(),
      status: z.enum(["Pendente", "Processando", "Pago", "Cancelado"]).optional(),
      descricao: z.string().optional(),
      observacao: z.string().optional(),
      autorizadoPor: z.string().optional(),
      parcelado: z.boolean().optional(),
      quantidadeParcelas: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const resultado = await updatePagamento(id, data);
      await registrarAuditoria({
        entidade: "pagamento",
        entidadeId: id,
        acao: "edicao",
        usuarioId: ctx.user.id,
        usuarioNome: ctx.user.name ?? undefined,
        valorNovo: data,
        camposAlterados: Object.keys(data),
        descricao: `Pagamento #${id} atualizado`,
      });
      return resultado;
    }),

  // Somente admin pode excluir pagamentos
  delete: staffProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user as any;
      await requirePermission(user.id, user.role, "pagamentos", "podeExcluir");
      await registrarAuditoria({
        entidade: "pagamento",
        entidadeId: input.id,
        acao: "exclusao",
        usuarioId: ctx.user.id,
        usuarioNome: ctx.user.name ?? undefined,
        descricao: `Pagamento #${input.id} excluído`,
      });
      return deletePagamento(input.id);
    }),

  stats: staffProcedure.query(() => getPagamentosStats()),

  // Retorna o próximo número de controle sugerido (ex: PAG-2026-042)
  nextNumeroControle: staffProcedure.query(() => getNextNumeroControlePagamento()),

  // Atribuição em lote de Centro de Custo
  assignCentroCustoLote: staffProcedure
    .input(z.object({
      ids: z.array(z.number()).min(1),
      centroCustoId: z.number().nullable(),
    }))
    .mutation(({ input }) => assignCentroCustoPagamentosLote(input.ids, input.centroCustoId)),
});

const recebimentosRouter = router({
  list: staffProcedure
    .input(z.object({
      status: z.string().optional(),
      tipoRecebimento: z.string().optional(),
      centroCustoId: z.number().optional(),
      clienteId: z.number().optional(),
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
      nomeRazaoSocial: z.string().min(1).max(255),
      descricao: z.string().optional(),
      tipoRecebimento: z.enum(TIPOS_RECEBIMENTO).default("Pix"),
      clienteId: z.number().nullable().optional(),
      centroCustoId: z.number().nullable().optional(),
      projetoId: z.number().min(1, "Selecione um projeto"),
      contratoId: z.number().min(1, "Selecione um contrato"),
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
    .mutation(async ({ input, ctx }) => {
      // Vínculo automático: se contrato tem projeto, vincular ao projeto
      let projetoId = input.projetoId ?? null;
      if (!projetoId && input.contratoId) {
        const db = await getDb();
        if (db) {
          const ctRows = await db
            .select({ projetoId: contratos.projetoId })
            .from(contratos)
            .where(eq(contratos.id, input.contratoId))
            .limit(1);
          if (ctRows.length > 0 && ctRows[0].projetoId) {
            projetoId = ctRows[0].projetoId;
          }
        }
      }
      const novoRec = await createRecebimento({ ...input, projetoId, createdBy: ctx.user.id });
      await registrarAuditoria({
        entidade: "recebimento",
        entidadeId: (novoRec as any)?.insertId ?? undefined,
        acao: "criacao",
        usuarioId: ctx.user.id,
        usuarioNome: ctx.user.name ?? undefined,
        valorNovo: { ...input, projetoId },
        descricao: `Recebimento criado: ${input.nomeRazaoSocial} — R$ ${input.valorTotal}`,
      });
      return novoRec;
    }),

  update: staffProcedure
    .input(z.object({
      id: z.number(),
      numeroControle: z.string().optional(),
      numeroContrato: z.string().optional(),
      nomeRazaoSocial: z.string().min(1).max(255).optional(),
      descricao: z.string().optional(),
      tipoRecebimento: z.enum(TIPOS_RECEBIMENTO).optional(),
      clienteId: z.number().nullable().optional(),
      centroCustoId: z.number().nullable().optional(),
      contratoId: z.number().nullable().optional(),
      projetoId: z.number().nullable().optional(),
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
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const resultado = await updateRecebimento(id, data);
      await registrarAuditoria({
        entidade: "recebimento",
        entidadeId: id,
        acao: "edicao",
        usuarioId: ctx.user.id,
        usuarioNome: ctx.user.name ?? undefined,
        valorNovo: data,
        camposAlterados: Object.keys(data),
        descricao: `Recebimento #${id} atualizado`,
      });
      return resultado;
    }),

  // Somente admin pode excluir recebimentos
  delete: staffProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user as any;
      await requirePermission(user.id, user.role, "recebimentos", "podeExcluir");
      await registrarAuditoria({
        entidade: "recebimento",
        entidadeId: input.id,
        acao: "exclusao",
        usuarioId: ctx.user.id,
        usuarioNome: ctx.user.name ?? undefined,
        descricao: `Recebimento #${input.id} excluído`,
      });
      return deleteRecebimento(input.id);
    }),

  stats: staffProcedure.query(() => getRecebimentosStats()),

  // Retorna o próximo número de controle sugerido (ex: REC-2026-157)
  nextNumeroControle: staffProcedure.query(() => getNextNumeroControleRecebimento()),

  // Atribuição em lote de Centro de Custo
  assignCentroCustoLote: staffProcedure
    .input(z.object({
      ids: z.array(z.number()).min(1),
      centroCustoId: z.number().nullable(),
    }))
    .mutation(({ input }) => assignCentroCustoRecebimentosLote(input.ids, input.centroCustoId)),
});

const relatorioCCRouter = router({
  getRelatorio: staffProcedure
    .input(z.object({
      centroCustoId: z.number().nullable().optional(),
      dataInicio: z.date().optional(),
      dataFim: z.date().optional(),
    }).optional())
    .query(({ input }) => getRelatorioCentroCusto({
      centroCustoId: input?.centroCustoId,
      dataInicio: input?.dataInicio,
      dataFim: input?.dataFim,
    })),
  // Resumo consolidado por CC (inclui grupo Sem CC)
  getResumoPorCC: staffProcedure
    .input(z.object({
      dataInicio: z.date().optional(),
      dataFim: z.date().optional(),
    }).optional())
    .query(({ input }) => getResumoPorCentroCusto({
      dataInicio: input?.dataInicio,
      dataFim: input?.dataFim,
    })),
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

  // KPIs estratégicos por projeto (receita, custo, margem)
  kpiProjetos: staffProcedure.query(async () => {
    const d = await getDb();
    if (!d) return { projetos: [], totais: { receita: 0, custo: 0, margem: 0, margemPct: null } };

    const resultado = await d.execute(
      sql`
        SELECT
          p.id,
          p.nome,
          p.statusOperacional,
          COALESCE(p.valorContratado, 0) as receita,
          COALESCE((
            SELECT SUM(pg.valor)
            FROM pagamentos pg
            WHERE pg.projetoId = p.id
            AND pg.status IN ('Pago', 'Pendente', 'Processando')
          ), 0) as custo,
          COALESCE((
            SELECT SUM(po.valorPrevisto)
            FROM projeto_orcamento po
            WHERE po.projetoId = p.id
          ), 0) as custoPrevisto,
          COALESCE((
            SELECT COUNT(*)
            FROM ordens_servico os
            WHERE os.projetoId = p.id AND os.status NOT IN ('cancelada')
          ), 0) as totalOs,
          COALESCE((
            SELECT COUNT(*)
            FROM ordens_servico os
            WHERE os.projetoId = p.id AND os.status = 'concluida'
          ), 0) as osConcluidasCount
        FROM projetos p
        WHERE p.statusOperacional NOT IN ('CANCELADO', 'ENCERRADO_FINANCEIRAMENTE')
        ORDER BY p.nome ASC
        LIMIT 20
      `
    ) as any;

    const rows = ((resultado as any)[0] as any[]).map((r: any) => {
      const receita = parseFloat(r.receita || "0");
      const custo = parseFloat(r.custo || "0");
      const custoPrevisto = parseFloat(r.custoPrevisto || "0");
      const margem = receita - custo;
      const margemPct = receita > 0 ? ((margem / receita) * 100) : null;
      const desvio = custoPrevisto > 0 ? (((custo - custoPrevisto) / custoPrevisto) * 100) : null;
      return {
        id: r.id as number,
        nome: r.nome as string,
        statusOperacional: r.statusOperacional as string,
        receita,
        custo,
        custoPrevisto,
        margem,
        margemPct,
        desvio,
        alertaDesvio: desvio !== null && desvio > 10,
        alertaMargem: margemPct !== null && margemPct < 10,
        totalOs: parseInt(r.totalOs || "0"),
        osConcluidasCount: parseInt(r.osConcluidasCount || "0"),
      };
    });

    const totais = rows.reduce(
      (acc, r) => ({ receita: acc.receita + r.receita, custo: acc.custo + r.custo, margem: acc.margem + r.margem }),
      { receita: 0, custo: 0, margem: 0 }
    );
    const margemPct = totais.receita > 0 ? ((totais.margem / totais.receita) * 100) : null;

    return { projetos: rows, totais: { ...totais, margemPct } };
  }),

  // Ações prioritárias (alertas acionáveis para o gestor)
  acoesPrioritarias: staffProcedure.query(async () => {
    const d = await getDb();
    if (!d) return [];

    const acoes: Array<{ tipo: string; descricao: string; link: string; urgencia: "alta" | "media" | "baixa" }> = [];

    // Projetos com desvio de custo > 10%
    const desvios = await d.execute(
      sql`
        SELECT p.id, p.nome,
          COALESCE(SUM(po.valorPrevisto), 0) as previsto,
          COALESCE((
            SELECT SUM(pg.valor) FROM pagamentos pg
            WHERE pg.projetoId = p.id AND pg.status IN ('Pago','Pendente','Processando')
          ), 0) as realizado
        FROM projetos p
        LEFT JOIN projeto_orcamento po ON po.projetoId = p.id
        WHERE p.statusOperacional = 'EM_EXECUCAO'
        GROUP BY p.id, p.nome
        HAVING previsto > 0 AND ((realizado - previsto) / previsto * 100) > 10
        LIMIT 5
      `
    ) as any;
    for (const r of ((desvios as any)[0] as any[])) {
      const prev = parseFloat(r.previsto || "0");
      const real = parseFloat(r.realizado || "0");
      const pct = prev > 0 ? (((real - prev) / prev) * 100).toFixed(1) : "0";
      acoes.push({
        tipo: "desvio_custo",
        descricao: `Projeto "${r.nome}" com desvio de custo de +${pct}% acima do orçado`,
        link: `/projetos/${r.id}/orcamento`,
        urgencia: parseFloat(pct) > 25 ? "alta" : "media",
      });
    }

    // Recebimentos vencidos
    const recVencidos = await d.execute(
      sql`SELECT COUNT(*) as total, SUM(valorTotal) as soma FROM recebimentos
          WHERE status = 'Pendente' AND dataVencimento < CURDATE() LIMIT 1`
    ) as any;
    const rvRow = ((recVencidos as any)[0] as any[])[0];
    if (rvRow && parseInt(rvRow.total || "0") > 0) {
      acoes.push({
        tipo: "recebimento_vencido",
        descricao: `${rvRow.total} recebimento(s) vencido(s) — total R$ ${parseFloat(rvRow.soma || "0").toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
        link: "/recebimentos",
        urgencia: "alta",
      });
    }

    // OS abertas há mais de 30 dias sem atualização
    const osAbertas = await d.execute(
      sql`SELECT COUNT(*) as total FROM ordens_servico
          WHERE status NOT IN ('concluida','cancelada')
          AND dataAbertura < DATE_SUB(CURDATE(), INTERVAL 30 DAY) LIMIT 1`
    ) as any;
    const osRow = ((osAbertas as any)[0] as any[])[0];
    if (osRow && parseInt(osRow.total || "0") > 0) {
      acoes.push({
        tipo: "os_parada",
        descricao: `${osRow.total} OS aberta(s) há mais de 30 dias sem conclusão`,
        link: "/engenharia",
        urgencia: "media",
      });
    }

    // Projetos em execução sem orçamento
    const semOrc = await d.execute(
      sql`SELECT COUNT(*) as total FROM projetos p
          WHERE p.statusOperacional = 'EM_EXECUCAO'
          AND NOT EXISTS (SELECT 1 FROM projeto_orcamento po WHERE po.projetoId = p.id) LIMIT 1`
    ) as any;
    const semOrcRow = ((semOrc as any)[0] as any[])[0];
    if (semOrcRow && parseInt(semOrcRow.total || "0") > 0) {
      acoes.push({
        tipo: "sem_orcamento",
        descricao: `${semOrcRow.total} projeto(s) em execução sem orçamento cadastrado`,
        link: "/projetos",
        urgencia: "media",
      });
    }

    return acoes.sort((a, b) => {
      const ord = { alta: 0, media: 1, baixa: 2 };
      return ord[a.urgencia] - ord[b.urgencia];
    });
  }),
});

// === Clientes ===
const clientesRouter = router({
  list: staffProcedure.query(() => listClientes()),
  create: staffProcedure
    .input(z.object({
      nome: z.string().min(1, "Nome é obrigatório"),
      tipo: z.enum(["Cliente", "Prestador de Serviço", "Fornecedor", "Hotel", "Parceiro", "Outro"]).default("Cliente"),
      tipoPessoa: z.enum(["PF", "PJ"]).optional(),
      segmento: z.string().optional(),
      cpfCnpj: z.string().optional(),
      inscricaoEstadual: z.string().optional(),
      inscricaoMunicipal: z.string().optional(),
      email: z.string().optional().or(z.literal("")),
      telefone: z.string().optional(),
      celular: z.string().optional(),
      nomeContato: z.string().optional(),
      endereco: z.string().optional(),
      cidade: z.string().optional(),
      estado: z.string().max(2).optional(),
      observacao: z.string().optional(),
      tipoPix: z.enum(["CPF", "CNPJ", "Email", "Telefone", "Chave Aleatória"]).optional(),
      chavePix: z.string().optional(),
      banco: z.string().optional(),
      agencia: z.string().optional(),
      conta: z.string().optional(),
      tipoConta: z.enum(["corrente", "poupanca", "pagamento"]).optional(),
    }))
    .mutation(({ input, ctx }) => createCliente({ ...input, createdBy: ctx.user.id })),
  update: staffProcedure
    .input(z.object({
      id: z.number(),
      nome: z.string().min(1).optional(),
      tipo: z.enum(["Cliente", "Prestador de Serviço", "Fornecedor", "Hotel", "Parceiro", "Outro"]).optional(),
      tipoPessoa: z.enum(["PF", "PJ"]).optional(),
      segmento: z.string().optional(),
      cpfCnpj: z.string().optional(),
      inscricaoEstadual: z.string().optional(),
      inscricaoMunicipal: z.string().optional(),
      email: z.string().optional().or(z.literal("")),
      telefone: z.string().optional(),
      celular: z.string().optional(),
      nomeContato: z.string().optional(),
      endereco: z.string().optional(),
      cidade: z.string().optional(),
      estado: z.string().max(2).optional(),
      observacao: z.string().optional(),
      ativo: z.boolean().optional(),
      tipoPix: z.enum(["CPF", "CNPJ", "Email", "Telefone", "Chave Aleatória"]).optional(),
      chavePix: z.string().optional(),
      banco: z.string().optional(),
      agencia: z.string().optional(),
      conta: z.string().optional(),
      tipoConta: z.enum(["corrente", "poupanca", "pagamento"]).optional(),
    }))
    .mutation(({ input }) => { const { id, ...data } = input; return updateCliente(id, data); }),
  delete: staffProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user as any;
      await requirePermission(user.id, user.role, "clientes", "podeExcluir");
      return deleteCliente(input.id);
    }),
  extrato: staffProcedure
    .input(z.object({ clienteId: z.number() }))
    .query(({ input }) => getExtratoCliente(input.clienteId)),
  checkDuplicate: staffProcedure
    .input(z.object({
      nome: z.string().optional(),
      cpfCnpj: z.string().optional(),
      excludeId: z.number().optional(),
    }))
    .query(({ input }) => checkDuplicateCliente(input)),
});

// === Centros de Custo ===
const centrosCustoRouter = router({
  list: staffProcedure.query(() => listCentrosCusto()),
  create: staffProcedure
    .input(z.object({
      nome: z.string().min(1, "Nome é obrigatório"),
      descricao: z.string().optional(),
      tipo: z.enum(["operacional", "administrativo", "contrato", "projeto", "investimento", "outro"]).optional(),
      classificacao: z.enum(["ESTRATEGICO", "OPERACIONAL", "PROJETO", "ADMINISTRATIVO", "INVESTIMENTO"]).optional(),
      responsavel: z.string().optional(),
      observacoes: z.string().optional(),
      contratoId: z.number().optional(),
      projetoId: z.number().nullable().optional(),
    }))
    .mutation(({ input, ctx }) => createCentroCusto({ ...input, createdBy: ctx.user.id })),
  update: staffProcedure
    .input(z.object({
      id: z.number(),
      nome: z.string().min(1).optional(),
      descricao: z.string().optional(),
      tipo: z.enum(["operacional", "administrativo", "contrato", "projeto", "investimento", "outro"]).optional(),
      classificacao: z.enum(["ESTRATEGICO", "OPERACIONAL", "PROJETO", "ADMINISTRATIVO", "INVESTIMENTO"]).optional(),
      responsavel: z.string().optional(),
      observacoes: z.string().optional(),
      ativo: z.boolean().optional(),
      projetoId: z.number().nullable().optional(),
    }))
    .mutation(({ input }) => { const { id, ...data } = input; return updateCentroCusto(id, data); }),
  delete: staffProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user as any;
      await requirePermission(user.id, user.role, "centros_custo", "podeExcluir");
      return deleteCentroCusto(input.id);
    }),
  relatorio: staffProcedure
    .input(z.object({
      centroCustoId: z.number().optional(),
      dataInicio: z.date().optional(),
      dataFim: z.date().optional(),
    }).optional())
    .query(({ input }) => getRelatorioCentroCusto({
      centroCustoId: input?.centroCustoId ?? null,
      dataInicio: input?.dataInicio,
      dataFim: input?.dataFim,
    })),
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
      perfilAcesso: z.string().optional(), // perfil pre-definido: administrativo, financeiro, engenharia, operacional
    }))
    .mutation(async ({ input, ctx }) => {
      const { nanoid } = await import("nanoid");
      const token = nanoid(48);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias
      await createConvite({
        email: input.email,
        nome: input.nome,
        role: input.role,
        perfilAcesso: input.perfilAcesso,
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
    .input(z.object({ token: z.string(), openId: z.string().optional() }))
    .mutation(async ({ input }) => {
      const convite = await getConviteByToken(input.token);
      if (!convite || convite.status !== "pendente") throw new TRPCError({ code: "BAD_REQUEST", message: "Convite inválido." });
      if (new Date() > convite.expiresAt) throw new TRPCError({ code: "BAD_REQUEST", message: "Convite expirado." });
      await markConviteAceito(input.token);
      // Se o usuario ja esta logado e o convite tem perfil, aplica o perfil automaticamente
      if (input.openId && convite.perfilAcesso) {
        const user = await getUserByOpenId(input.openId);
        if (user) {
          await applyPerfilAcesso(user.id, convite.perfilAcesso);
        }
      }
      return { success: true, email: convite.email, role: convite.role, perfilAcesso: convite.perfilAcesso };
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
    .mutation(async ({ input }) => {
      await updateRecebimentoParcela(input.id, input.data);
      // Após atualizar a parcela, sincronizar o status do recebimento pai
      const db = await getDb();
      if (!db) return;
      // Buscar a parcela para obter o recebimentoId
      const [parcela] = await db.select({ recebimentoId: recebimentoParcelas.recebimentoId })
        .from(recebimentoParcelas)
        .where(eq(recebimentoParcelas.id, input.id));
      if (!parcela) return;
      // Buscar todas as parcelas do recebimento
      const todasParcelas = await db.select({ status: recebimentoParcelas.status })
        .from(recebimentoParcelas)
        .where(eq(recebimentoParcelas.recebimentoId, parcela.recebimentoId));
      // Determinar o novo status do recebimento pai
      const todasRecebidas = todasParcelas.every(p => p.status === "Recebido");
      const algumAtrasado = todasParcelas.some(p => p.status === "Atrasado");
      const novoStatus = todasRecebidas ? "Recebido" : algumAtrasado ? "Atrasado" : "Pendente";
      await db.update(recebimentos)
        .set({ status: novoStatus as any })
        .where(eq(recebimentos.id, parcela.recebimentoId));
    }),
  deleteBulk: staffProcedure
    .input(z.object({ recebimentoId: z.number() }))
    .mutation(({ input }) => deleteRecebimentoParcelas(input.recebimentoId)),
});

// === Anexos ===
const MODULOS_ANEXO = ["pagamento", "recebimento", "contrato", "os", "cliente"] as const;

const anexosRouter = router({
  list: staffProcedure
    .input(z.object({
      modulo: z.enum(MODULOS_ANEXO),
      registroId: z.number(),
    }))
    .query(({ input }) => listAnexos(input.modulo as AnexoModulo, input.registroId)),

  upload: staffProcedure
    .input(z.object({
      modulo: z.enum(MODULOS_ANEXO),
      registroId: z.number(),
      nomeOriginal: z.string().min(1).max(255),
      mimeType: z.string().default("application/octet-stream"),
      tamanho: z.number().optional(),
      descricao: z.string().optional(),
      // Arquivo codificado em base64
      fileBase64: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const buffer = Buffer.from(input.fileBase64, "base64");
      return createAnexo({
        modulo: input.modulo as AnexoModulo,
        registroId: input.registroId,
        nomeOriginal: input.nomeOriginal,
        fileBuffer: buffer,
        mimeType: input.mimeType,
        tamanho: input.tamanho ?? buffer.length,
        descricao: input.descricao,
        createdBy: ctx.user.id,
      });
    }),

  delete: staffProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteAnexo(input.id)),
});

// ─── Router de Inconsistências ─────────────────────────────────────────────
const inconsistenciasRouter = router({
  resumo: staffProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB indisponível' });
    const [[pagRow], [recRow], [ctrRow], [osRow]] = await Promise.all([
      db.execute<any>(sql`SELECT COUNT(*) as n FROM pagamentos WHERE inconsistente = TRUE`),
      db.execute<any>(sql`SELECT COUNT(*) as n FROM recebimentos WHERE inconsistente = TRUE`),
      db.execute<any>(sql`SELECT COUNT(*) as n FROM contratos WHERE inconsistente = TRUE`),
      db.execute<any>(sql`SELECT COUNT(*) as n FROM ordens_servico WHERE inconsistente = TRUE`),
    ]);
    const nPag = Number((pagRow as any)[0]?.n ?? 0);
    const nRec = Number((recRow as any)[0]?.n ?? 0);
    const nCtr = Number((ctrRow as any)[0]?.n ?? 0);
    const nOs = Number((osRow as any)[0]?.n ?? 0);
    return { pagamentos: nPag, recebimentos: nRec, contratos: nCtr, ordensServico: nOs, total: nPag + nRec + nCtr + nOs };
  }),
  listPagamentos: staffProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB indisponível' });
    return db.select({
      id: pagamentos.id,
      numeroControle: pagamentos.numeroControle,
      nomeCompleto: pagamentos.nomeCompleto,
      valor: pagamentos.valor,
      dataPagamento: pagamentos.dataPagamento,
      status: pagamentos.status,
      motivoInconsistencia: pagamentos.motivoInconsistencia,
    }).from(pagamentos).where(eq(pagamentos.inconsistente, true)).orderBy(pagamentos.dataPagamento);
  }),
  listRecebimentos: staffProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB indisponível' });
    return db.select({
      id: recebimentos.id,
      numeroControle: recebimentos.numeroControle,
      nomeRazaoSocial: recebimentos.nomeRazaoSocial,
      valorTotal: recebimentos.valorTotal,
      dataVencimento: recebimentos.dataVencimento,
      status: recebimentos.status,
      motivoInconsistencia: recebimentos.motivoInconsistencia,
    }).from(recebimentos).where(eq(recebimentos.inconsistente, true)).orderBy(recebimentos.dataVencimento);
  }),
  listContratos: staffProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB indisponível' });
    return db.select({
      id: contratos.id,
      numero: contratos.numero,
      objeto: contratos.objeto,
      valorTotal: contratos.valorTotal,
      status: contratos.status,
      motivoInconsistencia: contratos.motivoInconsistencia,
    }).from(contratos).where(eq(contratos.inconsistente, true)).orderBy(contratos.numero);
  }),
  listOS: staffProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB indisponível' });
    return db.select({
      id: ordensServico.id,
      numero: ordensServico.numero,
      titulo: ordensServico.titulo,
      status: ordensServico.status,
      motivoInconsistencia: ordensServico.motivoInconsistencia,
    }).from(ordensServico).where(eq(ordensServico.inconsistente, true)).orderBy(ordensServico.numero);
  }),
  corrigirPagamento: staffProcedure
    .input(z.object({ id: z.number(), projetoId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB indisponível' });
      await db.update(pagamentos)
        .set({ projetoId: input.projetoId, inconsistente: false, motivoInconsistencia: null })
        .where(eq(pagamentos.id, input.id));
      return { success: true };
    }),
  corrigirRecebimento: staffProcedure
    .input(z.object({ id: z.number(), projetoId: z.number(), contratoId: z.number().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB indisponível' });
      await db.update(recebimentos)
        .set({ projetoId: input.projetoId, contratoId: input.contratoId ?? null, inconsistente: false, motivoInconsistencia: null })
        .where(eq(recebimentos.id, input.id));
      return { success: true };
    }),
  corrigirContrato: staffProcedure
    .input(z.object({ id: z.number(), projetoId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB indisponível' });
      await db.update(contratos)
        .set({ projetoId: input.projetoId, inconsistente: false, motivoInconsistencia: null })
        .where(eq(contratos.id, input.id));
      return { success: true };
    }),
  corrigirOS: staffProcedure
    .input(z.object({ id: z.number(), projetoId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB indisponível' });
      await db.update(ordensServico)
        .set({ projetoId: input.projetoId, inconsistente: false, motivoInconsistencia: null })
        .where(eq(ordensServico.id, input.id));
      return { success: true };
    }),
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
  relatorioContrato: relatorioContratoRouter,
  relatorioCentroCusto: relatorioCCRouter,
  permissoes: permissoesRouter,
  anexos: anexosRouter,
  projetos: projetosRouter,
  propostas: propostasRouter,
  inconsistencias: inconsistenciasRouter,
  orcamento: orcamentoRouter,
  auditoria: auditoriaRouter,
  workflow: workflowRouter,
  engenharia: router({
    listContratos: staffProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select({ id: contratos.id, numero: contratos.numero, objeto: contratos.objeto }).from(contratos).orderBy(contratos.numero);
    }),
  }),
});

export type AppRouter = typeof appRouter;
