import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { projetos, contratos, ordensServico, projetoOrcamento } from "../../drizzle/schema";
import { eq, and, count } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { registrarAuditoria } from "./auditoria";

// ─── Sequência de status do workflow ─────────────────────────────────────────
export const WORKFLOW_STATUS = [
  "lead",
  "proposta",
  "contrato",
  "engenharia",
  "execucao",
  "operacao",
  "encerrado",
] as const;
export type WorkflowStatus = (typeof WORKFLOW_STATUS)[number];

// Mapeamento para statusOperacional existente no banco
const STATUS_MAP: Record<WorkflowStatus, "PLANEJAMENTO" | "AGUARDANDO_CONTRATO" | "AGUARDANDO_MOBILIZACAO" | "EM_EXECUCAO" | "PAUSADO" | "CONCLUIDO_TECNICAMENTE" | "ENCERRADO_FINANCEIRAMENTE" | "CANCELADO"> = {
  lead: "PLANEJAMENTO",
  proposta: "AGUARDANDO_CONTRATO",
  contrato: "AGUARDANDO_MOBILIZACAO",
  engenharia: "AGUARDANDO_MOBILIZACAO",
  execucao: "EM_EXECUCAO",
  operacao: "CONCLUIDO_TECNICAMENTE",
  encerrado: "ENCERRADO_FINANCEIRAMENTE",
};

// ─── Validar requisitos para avançar de status ────────────────────────────────
async function validarRequisitos(
  projetoId: number,
  novoStatus: WorkflowStatus,
  projetoCreatedAt: Date
): Promise<{ ok: boolean; mensagem?: string }> {
  // Projetos criados antes de 01/01/2025 são legados — sem bloqueio
  const dataCorte = new Date("2025-01-01");
  if (projetoCreatedAt < dataCorte) return { ok: true };

  const d = await getDb();
  if (!d) return { ok: true };

  if (novoStatus === "contrato") {
    // Exige pelo menos 1 contrato criado
    const [{ total }] = await d
      .select({ total: count() })
      .from(contratos)
      .where(eq(contratos.projetoId, projetoId));
    if (total === 0) {
      return { ok: false, mensagem: "Para avançar para Contrato, é necessário criar pelo menos um contrato para este projeto." };
    }
  }

  if (novoStatus === "execucao") {
    // Exige orçamento cadastrado
    const [{ total }] = await d
      .select({ total: count() })
      .from(projetoOrcamento)
      .where(eq(projetoOrcamento.projetoId, projetoId));
    if (total === 0) {
      return { ok: false, mensagem: "Para avançar para Execução, é necessário cadastrar o orçamento do projeto." };
    }
  }

  if (novoStatus === "operacao") {
    // Exige pelo menos 1 OS concluída
    const [{ total }] = await d
      .select({ total: count() })
      .from(ordensServico)
      .where(and(
        eq(ordensServico.projetoId, projetoId),
        eq(ordensServico.status, "concluida"),
      ));
    if (total === 0) {
      return { ok: false, mensagem: "Para avançar para Operação, é necessário ter pelo menos uma Ordem de Serviço concluída." };
    }
  }

  return { ok: true };
}

// ─── Router de Workflow ───────────────────────────────────────────────────────
export const workflowRouter = router({
  // Avançar status do projeto no workflow
  avancarStatus: protectedProcedure
    .input(z.object({
      projetoId: z.number(),
      novoStatus: z.enum(WORKFLOW_STATUS),
      forcar: z.boolean().default(false), // Forçar avanço ignorando requisitos (para projetos legados)
    }))
    .mutation(async ({ ctx, input }) => {
      const d = await getDb();
      if (!d) throw new Error("DB unavailable");

      const [projeto] = await d.select().from(projetos).where(eq(projetos.id, input.projetoId));
      if (!projeto) throw new TRPCError({ code: "NOT_FOUND", message: "Projeto não encontrado" });

      // Validar requisitos (exceto se forçado ou projeto legado)
      if (!input.forcar) {
        const validacao = await validarRequisitos(
          input.projetoId,
          input.novoStatus,
          new Date(projeto.createdAt),
        );
        if (!validacao.ok) {
          throw new TRPCError({ code: "BAD_REQUEST", message: validacao.mensagem });
        }
      }

      const statusAnterior = projeto.statusOperacional;
      const novoStatusBanco = STATUS_MAP[input.novoStatus];

      await d.update(projetos)
        .set({ statusOperacional: novoStatusBanco })
        .where(eq(projetos.id, input.projetoId));

      // Registrar auditoria
      await registrarAuditoria({
        entidade: "projeto",
        entidadeId: input.projetoId,
        acao: "edicao",
        usuarioId: ctx.user.id,
        usuarioNome: ctx.user.name ?? undefined,
        valorAnterior: { statusOperacional: statusAnterior },
        valorNovo: { statusOperacional: novoStatusBanco },
        camposAlterados: ["statusOperacional"],
        descricao: `Status do projeto alterado de "${statusAnterior}" para "${novoStatusBanco}" via workflow`,
      });

      return { ok: true, statusAnterior, statusNovo: novoStatusBanco };
    }),

  // Verificar requisitos para avançar (sem executar)
  verificarRequisitos: protectedProcedure
    .input(z.object({
      projetoId: z.number(),
      novoStatus: z.enum(WORKFLOW_STATUS),
    }))
    .query(async ({ input }) => {
      const d = await getDb();
      if (!d) return { ok: true };

      const [projeto] = await d.select({ createdAt: projetos.createdAt })
        .from(projetos).where(eq(projetos.id, input.projetoId));
      if (!projeto) return { ok: false, mensagem: "Projeto não encontrado" };

      return validarRequisitos(input.projetoId, input.novoStatus, new Date(projeto.createdAt));
    }),

  // Obter o status atual e próximos passos do workflow
  getWorkflow: protectedProcedure
    .input(z.object({ projetoId: z.number() }))
    .query(async ({ input }) => {
      const d = await getDb();
      if (!d) return null;

      const [projeto] = await d
        .select({ id: projetos.id, statusOperacional: projetos.statusOperacional, createdAt: projetos.createdAt })
        .from(projetos).where(eq(projetos.id, input.projetoId));
      if (!projeto) return null;

      // Mapear statusOperacional para workflowStatus
      const statusAtualWorkflow = (Object.entries(STATUS_MAP).find(
        ([, v]) => v === projeto.statusOperacional
      )?.[0] ?? "lead") as WorkflowStatus;

      const indexAtual = WORKFLOW_STATUS.indexOf(statusAtualWorkflow);
      const proximoStatus = indexAtual < WORKFLOW_STATUS.length - 1
        ? WORKFLOW_STATUS[indexAtual + 1]
        : null;

      // Verificar requisitos do próximo passo
      let requisitosProximo = null;
      if (proximoStatus) {
        requisitosProximo = await validarRequisitos(
          input.projetoId,
          proximoStatus,
          new Date(projeto.createdAt),
        );
      }

      return {
        statusAtual: statusAtualWorkflow,
        statusAtualBanco: projeto.statusOperacional,
        proximoStatus,
        requisitosProximo,
        workflow: WORKFLOW_STATUS.map((s, i) => ({
          status: s,
          label: {
            lead: "Lead",
            proposta: "Proposta",
            contrato: "Contrato",
            engenharia: "Engenharia",
            execucao: "Execução",
            operacao: "Operação",
            encerrado: "Encerrado",
          }[s],
          concluido: i < indexAtual,
          atual: i === indexAtual,
          futuro: i > indexAtual,
        })),
      };
    }),
});
