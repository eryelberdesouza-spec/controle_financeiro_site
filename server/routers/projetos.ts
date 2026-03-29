import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { registrarAuditoria } from "./auditoria";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  projetos,
  contratos,
  ordensServico,
  pagamentos,
  recebimentos,
  centrosCusto,
  clientes,
  users,
  InsertProjeto,
} from "../../drizzle/schema";
import { eq, desc, sql, and, isNull, or } from "drizzle-orm";

// ─── Helpers de DB ────────────────────────────────────────────────────────────

export async function nextNumeroProjeto(): Promise<string> {
  const db = await getDb();
  if (!db) return "PRJ-0001";
  const now = new Date();
  const ano = now.getFullYear();
  const mes = String(now.getMonth() + 1).padStart(2, "0");
  const prefix = `PRJ-${ano}-${mes}-`;
  const [row] = await db.execute(
    sql`SELECT numero FROM projetos WHERE numero LIKE ${prefix + "%"} ORDER BY numero DESC LIMIT 1`
  ) as any;
  const rows = Array.isArray(row) ? row : [];
  if (rows.length === 0) return `${prefix}001`;
  const last = rows[0].numero as string;
  const seq = parseInt(last.split("-").pop() ?? "0", 10);
  return `${prefix}${String(seq + 1).padStart(3, "0")}`;
}

export async function listProjetos(userId?: number, userRole?: string) {
  const db = await getDb();
  if (!db) return [];
  // Usuários operacionais veem apenas projetos atribuídos a eles
  const isOperacional = userRole === "operacional";
  const rows = await db
    .select({
      id: projetos.id,
      numero: projetos.numero,
      nome: projetos.nome,
      tipoProjeto: projetos.tipoProjeto,
      statusOperacional: projetos.statusOperacional,
      valorContratado: projetos.valorContratado,
      localExecucao: projetos.localExecucao,
      dataInicioPrevista: projetos.dataInicioPrevista,
      dataFimPrevista: projetos.dataFimPrevista,
      dataInicioReal: projetos.dataInicioReal,
      dataFimReal: projetos.dataFimReal,
      descricao: projetos.descricao,
      createdAt: projetos.createdAt,
      clienteNome: clientes.nome,
      responsavelNome: users.name,
      responsavelUserId: projetos.responsavelUserId,
      clienteId: projetos.clienteId,
      centroCustoId: projetos.centroCustoId,
      contratoPrincipalId: projetos.contratoPrincipalId,
    })
    .from(projetos)
    .leftJoin(clientes, eq(projetos.clienteId, clientes.id))
    .leftJoin(users, eq(projetos.responsavelUserId, users.id))
    .where(isOperacional && userId ? eq(projetos.responsavelUserId, userId) : undefined)
    .orderBy(desc(projetos.createdAt));
  return rows;
}

export async function getProjeto(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(projetos)
    .leftJoin(clientes, eq(projetos.clienteId, clientes.id))
    .leftJoin(users, eq(projetos.responsavelUserId, users.id))
    .where(eq(projetos.id, id))
    .limit(1);
  return rows.length > 0 ? rows[0] : null;
}

export async function getPainelProjeto(id: number) {
  const db = await getDb();
  if (!db) return null;

  // Dados básicos do projeto
  const projetoRows = await db
    .select({
      id: projetos.id,
      numero: projetos.numero,
      nome: projetos.nome,
      tipoProjeto: projetos.tipoProjeto,
      statusOperacional: projetos.statusOperacional,
      valorContratado: projetos.valorContratado,
      localExecucao: projetos.localExecucao,
      dataInicioPrevista: projetos.dataInicioPrevista,
      dataFimPrevista: projetos.dataFimPrevista,
      dataInicioReal: projetos.dataInicioReal,
      dataFimReal: projetos.dataFimReal,
      descricao: projetos.descricao,
      observacoes: projetos.observacoes,
      clienteId: projetos.clienteId,
      centroCustoId: projetos.centroCustoId,
      contratoPrincipalId: projetos.contratoPrincipalId,
      responsavelUserId: projetos.responsavelUserId,
      clienteNome: clientes.nome,
      responsavelNome: users.name,
    })
    .from(projetos)
    .leftJoin(clientes, eq(projetos.clienteId, clientes.id))
    .leftJoin(users, eq(projetos.responsavelUserId, users.id))
    .where(eq(projetos.id, id))
    .limit(1);

  if (projetoRows.length === 0) return null;
  const projeto = projetoRows[0];

  // Recebimentos vinculados diretamente ao projeto
  const recRows = await db
    .select({
      id: recebimentos.id,
      numeroControle: recebimentos.numeroControle,
      nomeRazaoSocial: recebimentos.nomeRazaoSocial,
      valorTotal: recebimentos.valorTotal,
      status: recebimentos.status,
      dataVencimento: recebimentos.dataVencimento,
    })
    .from(recebimentos)
    .where(eq(recebimentos.projetoId, id));

  // Pagamentos vinculados diretamente ao projeto
  const pagRows = await db
    .select({
      id: pagamentos.id,
      numeroControle: pagamentos.numeroControle,
      nomeCompleto: pagamentos.nomeCompleto,
      valor: pagamentos.valor,
      status: pagamentos.status,
      dataPagamento: pagamentos.dataPagamento,
      centroCustoId: pagamentos.centroCustoId,
    })
    .from(pagamentos)
    .where(eq(pagamentos.projetoId, id));

  // Pagamentos via CC do tipo PROJETO (se o projeto tem CC vinculado)
  let pagViaCcRows: typeof pagRows = [];
  if (projeto.centroCustoId) {
    const ccRows = await db
      .select({ classificacao: centrosCusto.classificacao })
      .from(centrosCusto)
      .where(eq(centrosCusto.id, projeto.centroCustoId))
      .limit(1);
    if (ccRows.length > 0 && ccRows[0].classificacao === "PROJETO") {
      pagViaCcRows = await db
        .select({
          id: pagamentos.id,
          numeroControle: pagamentos.numeroControle,
          nomeCompleto: pagamentos.nomeCompleto,
          valor: pagamentos.valor,
          status: pagamentos.status,
          dataPagamento: pagamentos.dataPagamento,
          centroCustoId: pagamentos.centroCustoId,
        })
        .from(pagamentos)
        .where(
          and(
            eq(pagamentos.centroCustoId, projeto.centroCustoId),
            isNull(pagamentos.projetoId) // evitar duplicatas
          )
        );
    }
  }

  // Unir pagamentos diretos + via CC (sem duplicatas)
  const todosOsPagamentos = [
    ...pagRows,
    ...pagViaCcRows.filter(p => !pagRows.some(pr => pr.id === p.id)),
  ];

  // OS vinculadas ao projeto
  const osRows = await db
    .select({
      id: ordensServico.id,
      numero: ordensServico.numero,
      titulo: ordensServico.titulo,
      status: ordensServico.status,
      responsavel: ordensServico.responsavel,
      dataAbertura: ordensServico.dataAbertura,
      dataPrevisao: ordensServico.dataPrevisao,
    })
    .from(ordensServico)
    .where(eq(ordensServico.projetoId, id));

  // Contratos vinculados ao projeto
  const ctRows = await db
    .select({
      id: contratos.id,
      numero: contratos.numero,
      objeto: contratos.objeto,
      status: contratos.status,
      valorTotal: contratos.valorTotal,
    })
    .from(contratos)
    .where(eq(contratos.projetoId, id));

  // ─── Cálculos Financeiros ────────────────────────────────────────────────────
  const agora = new Date();

  // Receita prevista = soma de todos os recebimentos vinculados (independente do status)
  const receitaPrevista = recRows.reduce((s, r) => s + parseFloat(String(r.valorTotal ?? 0)), 0);

  // Receita realizada = recebimentos com status "Recebido"
  const receitaRealizada = recRows
    .filter((r) => r.status === "Recebido")
    .reduce((s, r) => s + parseFloat(String(r.valorTotal ?? 0)), 0);

  // Custos totais = todos os pagamentos vinculados
  const custosRegistrados = todosOsPagamentos.reduce((s, p) => s + parseFloat(String(p.valor ?? 0)), 0);

  const saldoAReceber = receitaPrevista - receitaRealizada;
  const resultadoEstimado = receitaRealizada - custosRegistrados;
  const percentualRecebido = receitaPrevista > 0 ? (receitaRealizada / receitaPrevista) * 100 : 0;

  // ─── Status Financeiro Derivado ──────────────────────────────────────────────
  // Verificar inadimplência: recebimentos vencidos e não recebidos
  const temInadimplencia = recRows.some((r) => {
    if (r.status === "Recebido") return false;
    if (!r.dataVencimento) return false;
    return new Date(r.dataVencimento) < agora;
  });

  let statusFinanceiro: string;
  if (temInadimplencia) {
    statusFinanceiro = "INADIMPLENTE";
  } else if (receitaPrevista === 0) {
    statusFinanceiro = "SEM_RECEITA";
  } else if (receitaRealizada >= receitaPrevista) {
    statusFinanceiro = "RECEITA_COMPLETA";
  } else if (receitaRealizada > 0) {
    statusFinanceiro = percentualRecebido >= 50 ? "RECEITA_PARCIAL" : "EM_RECEBIMENTO";
  } else {
    statusFinanceiro = "EM_RECEBIMENTO";
  }

  // ─── Indicador de Encerramento ───────────────────────────────────────────────
  const todasOsConcluidas =
    osRows.length > 0 &&
    osRows.every((o) => ["concluida", "cancelada"].includes(o.status));
  const prontoParaEncerramento = todasOsConcluidas && saldoAReceber <= 0;

  const osAbertas = osRows.filter((o) => !["concluida", "cancelada"].includes(o.status)).length;
  const osConcluidas = osRows.filter((o) => o.status === "concluida").length;

  return {
    projeto,
    financeiro: {
      valorContratado: parseFloat(String(projeto.valorContratado ?? 0)),
      receitaPrevista,
      receitaRealizada,
      custosRegistrados,
      saldoAReceber,
      resultadoEstimado,
      percentualRecebido: Math.round(percentualRecebido * 100) / 100,
      statusFinanceiro,
      temInadimplencia,
      prontoParaEncerramento,
    },
    execucao: {
      totalOS: osRows.length,
      osAbertas,
      osConcluidas,
    },
    relacionamentos: {
      contratos: ctRows,
      recebimentos: recRows,
      pagamentos: todosOsPagamentos,
      ordensServico: osRows,
    },
  };
}

// ─── Fluxos Automáticos ───────────────────────────────────────────────────────

/**
 * Ao vincular contrato a projeto: atualiza valor_contratado e status do projeto
 */
export async function onContratoVinculado(projetoId: number, valorContrato: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(projetos)
    .set({ valorContratado: String(valorContrato) })
    .where(eq(projetos.id, projetoId));
}

/**
 * Ao iniciar a primeira OS: muda status do projeto para EM_EXECUCAO e define data_inicio_real
 */
export async function onPrimeiraOSIniciada(projetoId: number) {
  const db = await getDb();
  if (!db) return;
  const projetoAtual = await db
    .select({ statusOperacional: projetos.statusOperacional, dataInicioReal: projetos.dataInicioReal })
    .from(projetos)
    .where(eq(projetos.id, projetoId))
    .limit(1);
  if (projetoAtual.length === 0) return;
  const { statusOperacional, dataInicioReal } = projetoAtual[0];
  // Só atualiza se ainda não está em execução e não tem data de início real
  if (statusOperacional !== "EM_EXECUCAO" && !dataInicioReal) {
    await db
      .update(projetos)
      .set({ statusOperacional: "EM_EXECUCAO", dataInicioReal: new Date() })
      .where(eq(projetos.id, projetoId));
  }
}

// ─── Router tRPC ─────────────────────────────────────────────────────────────

export const projetosRouter = router({
  // Próximo número de controle
  nextNumero: protectedProcedure.query(async () => {
    return { numero: await nextNumeroProjeto() };
  }),

  // Listar todos os projetos (com filtro por responsável para operacionais)
  list: protectedProcedure.query(async ({ ctx }) => {
    return listProjetos(ctx.user.id, ctx.user.role);
  }),

  // Buscar projeto por ID
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return getProjeto(input.id);
    }),

  // Painel consolidado do projeto
  painel: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const painel = await getPainelProjeto(input.id);
      if (!painel) throw new TRPCError({ code: "NOT_FOUND", message: "Projeto não encontrado" });
      return painel;
    }),

  // Criar novo projeto
  create: protectedProcedure
    .input(
      z.object({
        numero: z.string().optional(),
        nome: z.string().min(3),
        clienteId: z.number().optional().nullable(),
        contratoPrincipalId: z.number().optional().nullable(),
        tipoProjeto: z.enum([
          "INSTALACAO", "MANUTENCAO", "SERVICO_PONTUAL", "OBRA",
          "RECORRENTE", "CONSULTORIA", "PARCERIA", "OUTROS",
        ]).default("SERVICO_PONTUAL"),
        statusOperacional: z.enum([
          "PLANEJAMENTO", "AGUARDANDO_CONTRATO", "AGUARDANDO_MOBILIZACAO",
          "EM_EXECUCAO", "PAUSADO", "CONCLUIDO_TECNICAMENTE",
          "ENCERRADO_FINANCEIRAMENTE", "CANCELADO",
        ]).default("PLANEJAMENTO"),
        responsavelUserId: z.number().optional().nullable(),
        dataInicioPrevista: z.string().optional().nullable(),
        dataFimPrevista: z.string().optional().nullable(),
        dataInicioReal: z.string().optional().nullable(),
        dataFimReal: z.string().optional().nullable(),
        centroCustoId: z.number().optional().nullable(),
        valorContratado: z.number().optional().default(0),
        localExecucao: z.string().optional().nullable(),
        descricao: z.string().optional().nullable(),
        observacoes: z.string().optional().nullable(),
        // Se true, cria automaticamente um CC do tipo PROJETO
        criarCentroCusto: z.boolean().optional().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      const numero = input.numero || await nextNumeroProjeto();

      // Criar CC do tipo PROJETO automaticamente se solicitado
      let centroCustoId = input.centroCustoId ?? null;
      if (input.criarCentroCusto && !centroCustoId) {
        const [ccResult] = await db.execute(
          sql`INSERT INTO centros_custo (nome, tipo, classificacao, ativo, createdAt, updatedAt, createdBy)
              VALUES (${`CC - ${input.nome}`}, 'projeto', 'PROJETO', 1, NOW(), NOW(), ${ctx.user.id})`
        ) as any;
        centroCustoId = (ccResult as any).insertId ?? null;
      }

      const [result] = await db.execute(
        sql`INSERT INTO projetos (numero, nome, clienteId, contratoPrincipalId, tipoProjeto, statusOperacional,
            responsavelUserId, dataInicioPrevista, dataFimPrevista, dataInicioReal, dataFimReal,
            centroCustoId, valorContratado, localExecucao, descricao, observacoes, createdAt, updatedAt, createdBy)
            VALUES (
              ${numero}, ${input.nome}, ${input.clienteId ?? null}, ${input.contratoPrincipalId ?? null},
              ${input.tipoProjeto}, ${input.statusOperacional}, ${input.responsavelUserId ?? null},
              ${input.dataInicioPrevista ?? null}, ${input.dataFimPrevista ?? null},
              ${input.dataInicioReal ?? null}, ${input.dataFimReal ?? null},
              ${centroCustoId}, ${input.valorContratado ?? 0}, ${input.localExecucao ?? null},
              ${input.descricao ?? null}, ${input.observacoes ?? null},
              NOW(), NOW(), ${ctx.user.id}
            )`
      ) as any;

      const insertId = (result as any).insertId;
      await registrarAuditoria({
        entidade: "projeto",
        entidadeId: insertId,
        acao: "criacao",
        usuarioId: ctx.user.id,
        usuarioNome: ctx.user.name ?? undefined,
        valorNovo: { ...input, numero, centroCustoId },
        descricao: `Projeto criado: ${input.nome} (${numero})`,
      });
      return { id: insertId, numero };
    }),

  // Atualizar projeto existente
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        nome: z.string().min(3).optional(),
        clienteId: z.number().optional().nullable(),
        contratoPrincipalId: z.number().optional().nullable(),
        tipoProjeto: z.enum([
          "INSTALACAO", "MANUTENCAO", "SERVICO_PONTUAL", "OBRA",
          "RECORRENTE", "CONSULTORIA", "PARCERIA", "OUTROS",
        ]).optional(),
        statusOperacional: z.enum([
          "PLANEJAMENTO", "AGUARDANDO_CONTRATO", "AGUARDANDO_MOBILIZACAO",
          "EM_EXECUCAO", "PAUSADO", "CONCLUIDO_TECNICAMENTE",
          "ENCERRADO_FINANCEIRAMENTE", "CANCELADO",
        ]).optional(),
        responsavelUserId: z.number().optional().nullable(),
        dataInicioPrevista: z.string().optional().nullable(),
        dataFimPrevista: z.string().optional().nullable(),
        dataInicioReal: z.string().optional().nullable(),
        dataFimReal: z.string().optional().nullable(),
        centroCustoId: z.number().optional().nullable(),
        valorContratado: z.number().optional(),
        localExecucao: z.string().optional().nullable(),
        descricao: z.string().optional().nullable(),
        observacoes: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      const { id, ...fields } = input;
      const set: Record<string, unknown> = {};
      if (fields.nome !== undefined) set.nome = fields.nome;
      if (fields.clienteId !== undefined) set.clienteId = fields.clienteId;
      if (fields.contratoPrincipalId !== undefined) set.contratoPrincipalId = fields.contratoPrincipalId;
      if (fields.tipoProjeto !== undefined) set.tipoProjeto = fields.tipoProjeto;
      if (fields.statusOperacional !== undefined) set.statusOperacional = fields.statusOperacional;
      if (fields.responsavelUserId !== undefined) set.responsavelUserId = fields.responsavelUserId;
      if (fields.dataInicioPrevista !== undefined) set.dataInicioPrevista = fields.dataInicioPrevista;
      if (fields.dataFimPrevista !== undefined) set.dataFimPrevista = fields.dataFimPrevista;
      if (fields.dataInicioReal !== undefined) set.dataInicioReal = fields.dataInicioReal;
      if (fields.dataFimReal !== undefined) set.dataFimReal = fields.dataFimReal;
      if (fields.centroCustoId !== undefined) set.centroCustoId = fields.centroCustoId;
      if (fields.valorContratado !== undefined) set.valorContratado = fields.valorContratado;
      if (fields.localExecucao !== undefined) set.localExecucao = fields.localExecucao;
      if (fields.descricao !== undefined) set.descricao = fields.descricao;
      if (fields.observacoes !== undefined) set.observacoes = fields.observacoes;

      if (Object.keys(set).length === 0) return { success: true };
      await db.update(projetos).set(set).where(eq(projetos.id, id));
      // Auditoria assíncrona (não bloqueia a resposta)
      registrarAuditoria({
        entidade: "projeto",
        entidadeId: id,
        acao: "edicao",
        usuarioId: (input as any).updatedBy ?? 0,
        valorNovo: set,
        camposAlterados: Object.keys(set),
        descricao: `Projeto #${id} atualizado: ${Object.keys(set).join(", ")}`,
      }).catch(() => {});
      return { success: true };
    }),

  // Excluir projeto (apenas admin)
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem excluir projetos" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      await registrarAuditoria({
        entidade: "projeto",
        entidadeId: input.id,
        acao: "exclusao",
        usuarioId: ctx.user.id,
        usuarioNome: ctx.user.name ?? undefined,
        descricao: `Projeto #${input.id} excluído`,
      });
      await db.delete(projetos).where(eq(projetos.id, input.id));
      return { success: true };
    }),

  mudarStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      statusOperacional: z.enum(["PLANEJAMENTO", "EM_EXECUCAO", "PARALISADO", "CONCLUIDO", "CANCELADO"]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const set: Record<string, any> = { statusOperacional: input.statusOperacional };
      if (input.statusOperacional === "EM_EXECUCAO") set.dataInicioReal = new Date();
      await db.update(projetos).set(set).where(eq(projetos.id, input.id));
      return { success: true };
    }),
});
