/**
 * Router de Conversão de Proposta em Contrato + Integração ZapSign
 *
 * Fluxo principal:
 *  1. atualizarStatus   — muda o status da proposta (RASCUNHO → ENVIADA → APROVADA etc.)
 *  2. converterEmContrato — cria contrato + recebimentos a partir de uma proposta APROVADA
 *  3. enviarParaAssinatura — gera PDF e envia para ZapSign
 *  4. (webhook público)  — registrado em server/_core/index.ts
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb, getNextNumeroControleRecebimento, createRecebimento, createRecebimentoParcelas } from "../db";
import {
  propostas,
  propostaItens,
  propostaPagamentos,
  contratos,
  recebimentos,
  clientes,
  projetos,
} from "../../drizzle/schema";
import { eq, desc, sql } from "drizzle-orm";
import { registrarAuditoria } from "./auditoria";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Gera o próximo número de contrato no padrão CTR-AAAA-MM-NNN */
async function gerarProximoNumeroContrato(): Promise<string> {
  const db = await getDb();
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  if (!db) return `CTR-${year}-${month}-001`;

  const rows = await db.select({ numero: contratos.numero }).from(contratos);
  let maxNum = 0;
  for (const row of rows) {
    if (!row.numero) continue;
    const match = row.numero.match(/(\d+)\s*$/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > maxNum) maxNum = n;
    }
  }
  const next = maxNum + 1;
  return `CTR-${year}-${month}-${String(next).padStart(3, "0")}`;
}

// ─── Status válidos da proposta ───────────────────────────────────────────────
const STATUS_PROPOSTA = ["RASCUNHO", "ENVIADA", "EM_NEGOCIACAO", "APROVADA", "RECUSADA", "EM_CONTRATACAO", "EXPIRADA", "CANCELADA", "aguardando_assinatura", "assinado", "recusado"] as const;
type StatusProposta = typeof STATUS_PROPOSTA[number];

// ─── Router ───────────────────────────────────────────────────────────────────

export const conversaoRouter = router({

  // ── 1. Atualizar status da proposta ─────────────────────────────────────────
  atualizarStatus: protectedProcedure
    .input(z.object({
      propostaId: z.number(),
      novoStatus: z.enum(["RASCUNHO", "ENVIADA", "EM_NEGOCIACAO", "APROVADA", "RECUSADA", "EM_CONTRATACAO", "EXPIRADA", "CANCELADA"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      const [proposta] = await db.select().from(propostas).where(eq(propostas.id, input.propostaId)).limit(1);
      if (!proposta) throw new TRPCError({ code: "NOT_FOUND", message: "Proposta não encontrada" });

      // Não permitir alterar status de proposta já convertida (exceto para auditoria)
      if (proposta.convertidaEmContrato && input.novoStatus === "RASCUNHO") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Proposta já convertida em contrato não pode voltar para rascunho" });
      }

      const statusAnterior = proposta.status;
      const updateData: Record<string, unknown> = { status: input.novoStatus };
      if (input.novoStatus === "APROVADA") {
        updateData.dataAprovacao = new Date().toISOString().split("T")[0];
      }

      await db.update(propostas).set(updateData as any).where(eq(propostas.id, input.propostaId));

      await registrarAuditoria({
        usuarioId: ctx.user.id,
        usuarioNome: ctx.user.name ?? "Sistema",
        entidade: "proposta",
        entidadeId: input.propostaId,
        acao: "atualizar_status",
        valorAnterior: { status: statusAnterior },
        valorNovo: { status: input.novoStatus },
      });

      return { success: true, novoStatus: input.novoStatus };
    }),

  // ── 2. Converter proposta em contrato ────────────────────────────────────────
  converterEmContrato: protectedProcedure
    .input(z.object({
      propostaId: z.number(),
      projetoId: z.number().nullable().optional(),
      criarNovoProjeto: z.boolean().default(false),
      nomeNovoProjeto: z.string().optional(),
      tipoContrato: z.enum(["prestacao_servico", "fornecimento", "locacao", "misto"]).default("prestacao_servico"),
      // Dados de faturamento
      gerarRecebimentos: z.boolean().default(true),
      numeroParcelas: z.number().min(1).max(60).default(1),
      tipoRecebimento: z.enum(["Pix", "Boleto", "Transferência", "Cartão de Crédito", "Cartão de Débito", "Dinheiro", "Outro"]).default("Pix"),
      dataPrimeiroVencimento: z.string().optional(), // YYYY-MM-DD
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      // ── Buscar proposta completa ─────────────────────────────────────────────
      const [proposta] = await db.select().from(propostas).where(eq(propostas.id, input.propostaId)).limit(1);
      if (!proposta) throw new TRPCError({ code: "NOT_FOUND", message: "Proposta não encontrada" });

      // ── Validações ───────────────────────────────────────────────────────────
      if (proposta.convertidaEmContrato) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Esta proposta já foi convertida em contrato" });
      }
      const statusAptos = ["APROVADA", "EM_CONTRATACAO"] as string[];
      if (!statusAptos.includes(proposta.status ?? "") && proposta.zapsignStatus !== "assinado") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Apenas propostas APROVADAS ou ASSINADAS podem ser convertidas em contrato" });
      }
      if (!proposta.clienteId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "A proposta deve ter um cliente vinculado para ser convertida" });
      }

      // ── Buscar itens da proposta ─────────────────────────────────────────────
      const itens = await db.select().from(propostaItens).where(eq(propostaItens.propostaId, input.propostaId));
      if (itens.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "A proposta deve ter pelo menos 1 item para ser convertida" });
      }

      // ── Buscar condições de pagamento ────────────────────────────────────────
      const pagamentosPropostos = await db.select().from(propostaPagamentos).where(eq(propostaPagamentos.propostaId, input.propostaId));

      // ── Buscar dados do cliente ──────────────────────────────────────────────
      const [cliente] = await db.select().from(clientes).where(eq(clientes.id, proposta.clienteId)).limit(1);
      const nomeCliente = cliente?.nome ?? proposta.clienteNome ?? "Cliente";

      // ── Resolver projeto ─────────────────────────────────────────────────────
      let projetoId: number | null = input.projetoId ?? proposta.projetoId ?? null;

      if (!projetoId && input.criarNovoProjeto && input.nomeNovoProjeto) {
        // Criar novo projeto automaticamente
        const now = new Date();
        const ano = now.getFullYear();
        const mes = String(now.getMonth() + 1).padStart(2, "0");
        const [ultimoProjeto] = await db.select({ numero: projetos.numero }).from(projetos).orderBy(desc(projetos.id)).limit(1);
        let seq = 1;
        if (ultimoProjeto?.numero) {
          const match = ultimoProjeto.numero.match(/(\d+)$/);
          if (match) seq = parseInt(match[1], 10) + 1;
        }
        const numeroProjeto = `PRJ-${ano}-${mes}-${String(seq).padStart(3, "0")}`;
        const [projResult] = await db.execute(sql`
          INSERT INTO projetos (numero, nome, clienteId, tipoProjeto, statusOperacional, valorContratado, exigeOrcamento, createdBy)
          VALUES (${numeroProjeto}, ${input.nomeNovoProjeto}, ${proposta.clienteId}, 'SERVICO_PONTUAL', 'PLANEJAMENTO', ${proposta.valorTotal ?? "0"}, 0, ${ctx.user.id})
        `);
        projetoId = (projResult as any).insertId;
      }

      // ── Gerar número do contrato ─────────────────────────────────────────────
      const numeroContrato = await gerarProximoNumeroContrato();

      // ── Montar objeto do contrato ────────────────────────────────────────────
      const objetoContrato = proposta.escopoDetalhado
        ?? itens.map(i => i.descricao).join("; ")
        ?? `Contrato gerado da proposta ${proposta.numero}`;

      // ── Inserir contrato ─────────────────────────────────────────────────────
      const [contratoResult] = await db.execute(sql`
        INSERT INTO contratos (
          numero, objeto, tipo, status, clienteId, projetoId, valorTotal,
          descricao, observacoes, propostaOrigemId, origemDescricao, createdBy
        ) VALUES (
          ${numeroContrato},
          ${objetoContrato},
          ${input.tipoContrato},
          'ativo',
          ${proposta.clienteId},
          ${projetoId},
          ${proposta.valorTotal ?? "0"},
          ${proposta.observacoesCondicoes ?? null},
          ${proposta.observacoes ?? null},
          ${input.propostaId},
          ${`Gerado automaticamente da proposta ${proposta.numero}`},
          ${ctx.user.id}
        )
      `);
      const contratoId = (contratoResult as any).insertId;

      // ── Gerar recebimentos automaticamente ──────────────────────────────────
      const recebimentosGerados: number[] = [];
      if (input.gerarRecebimentos && parseFloat(proposta.valorTotal ?? "0") > 0) {
        const valorTotal = parseFloat(proposta.valorTotal ?? "0");
        const n = input.numeroParcelas;
        const valorParcela = parseFloat((valorTotal / n).toFixed(2));
        const valorUltima = parseFloat((valorTotal - valorParcela * (n - 1)).toFixed(2));
        const dataBase = input.dataPrimeiroVencimento
          ? new Date(input.dataPrimeiroVencimento + "T12:00:00")
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // +30 dias padrão

        for (let i = 0; i < n; i++) {
          const vencimento = new Date(dataBase);
          vencimento.setMonth(vencimento.getMonth() + i);
          const valor = i === n - 1 ? valorUltima : valorParcela;
          const numeroControle = await getNextNumeroControleRecebimento();
          const now = new Date();
          const statusParcela: "Pendente" | "Atrasado" = vencimento < now ? "Atrasado" : "Pendente";

          const descricaoRec = n === 1
            ? `${objetoContrato.substring(0, 100)} — ${proposta.numero}`
            : `${objetoContrato.substring(0, 80)} — Parcela ${i + 1}/${n} — ${proposta.numero}`;

          const [recResult] = await createRecebimento({
            numeroControle,
            numeroContrato,
            nomeRazaoSocial: nomeCliente,
            descricao: descricaoRec,
            tipoRecebimento: input.tipoRecebimento,
            clienteId: proposta.clienteId,
            centroCustoId: null,
            contratoId,
            projetoId,
            valorTotal: valor.toString(),
            valorEquipamento: "0",
            valorServico: valor.toString(),
            juros: "0",
            desconto: "0",
            quantidadeParcelas: 1,
            parcelaAtual: 1,
            dataVencimento: vencimento,
            status: statusParcela,
            geradoAutomaticamente: true,
            createdBy: ctx.user.id,
          } as any);
          const recebimentoId = (recResult as any).insertId;
          recebimentosGerados.push(recebimentoId);

          await createRecebimentoParcelas([{
            recebimentoId,
            numeroParcela: 1,
            valor: valor.toString(),
            dataVencimento: vencimento,
            status: statusParcela,
          } as any]);
        }
      }

      // ── Marcar proposta como convertida ─────────────────────────────────────
      await db.update(propostas).set({
        convertidaEmContrato: true,
        contratoId,
        projetoId: projetoId ?? proposta.projetoId,
        status: "EM_CONTRATACAO",
      } as any).where(eq(propostas.id, input.propostaId));

      // ── Registrar auditoria ──────────────────────────────────────────────────
      await registrarAuditoria({
        usuarioId: ctx.user.id,
        usuarioNome: ctx.user.name ?? "Sistema",
        entidade: "proposta",
        entidadeId: input.propostaId,
        acao: "converter_em_contrato",
        valorAnterior: { convertidaEmContrato: false },
        valorNovo: {
          convertidaEmContrato: true,
          contratoId,
          contratoNumero: numeroContrato,
          recebimentosGerados: recebimentosGerados.length,
          projetoId,
        },
      });

      return {
        success: true,
        contratoId,
        contratoNumero: numeroContrato,
        recebimentosGerados: recebimentosGerados.length,
        projetoId,
      };
    }),

  // ── 3. Enviar proposta para assinatura via ZapSign ───────────────────────────
  enviarParaAssinatura: protectedProcedure
    .input(z.object({
      propostaId: z.number(),
      pdfBase64: z.string().optional(), // PDF gerado no frontend em base64 (opcional — pode ser gerado no servidor)
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      const [proposta] = await db.select().from(propostas).where(eq(propostas.id, input.propostaId)).limit(1);
      if (!proposta) throw new TRPCError({ code: "NOT_FOUND", message: "Proposta não encontrada" });

      // Verificar se já foi enviada
      if (proposta.zapsignDocId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Esta proposta já foi enviada para assinatura" });
      }

      // Verificar se proposta está em status que permite envio para assinatura
      const statusPermitidos = ["RASCUNHO", "ENVIADA", "EM_NEGOCIACAO", "APROVADA", "EM_CONTRATACAO"] as string[];
      if (!statusPermitidos.includes(proposta.status ?? "")) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Esta proposta não pode ser enviada para assinatura no status atual" });
      }

      // Buscar dados do cliente
      let clienteEmail = proposta.clienteEmail ?? "";
      let clienteNome = proposta.clienteNome ?? "Cliente";
      if (proposta.clienteId) {
        const [cli] = await db.select({ nome: clientes.nome, email: clientes.email }).from(clientes).where(eq(clientes.id, proposta.clienteId)).limit(1);
        if (cli) {
          clienteNome = cli.nome ?? clienteNome;
          clienteEmail = cli.email ?? clienteEmail;
        }
      }

      if (!clienteEmail) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "O cliente não possui e-mail cadastrado. Cadastre o e-mail do cliente antes de enviar para assinatura." });
      }

      // Verificar se a API key do ZapSign está configurada
      const apiToken = process.env.ZAPSIGN_API_TOKEN;
      if (!apiToken) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Integração ZapSign não configurada. Configure a variável ZAPSIGN_API_TOKEN." });
      }

      // ── Chamar API do ZapSign ────────────────────────────────────────────────
      try {
        const webhookUrl = process.env.ZAPSIGN_WEBHOOK_URL ?? `${process.env.VITE_FRONTEND_FORGE_API_URL ?? ""}/api/webhooks/zapsign`;

        const payload = {
          name: `Proposta ${proposta.numero} — ${clienteNome}`,
          lang: "pt-br",
          disable_signer_emails: false,
          signed_file_only_finished: false,
          brand_logo: "",
          brand_name: "SIGECO — Atom Tech",
          external_id: `proposta-${proposta.id}`,
          send_automatic_email: true,
          webhook_url: webhookUrl,
          signers: [
            {
              name: clienteNome,
              email: clienteEmail,
              send_automatic_email: true,
              auth_mode: "assinaturaTela",
            },
          ],
          base64_pdf: input.pdfBase64,
        };

        const response = await fetch("https://api.zapsign.com.br/api/v1/docs/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiToken}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `ZapSign retornou erro ${response.status}: ${errText.substring(0, 200)}`,
          });
        }

        const data = await response.json() as any;
        const docId = data.token ?? data.id ?? "";
        const signerToken = data.signers?.[0]?.token ?? "";
        const signerUrl = data.signers?.[0]?.sign_url ?? "";

        // ── Atualizar proposta com dados do ZapSign ──────────────────────────
        await db.update(propostas).set({
          zapsignDocId: docId,
          zapsignSignerToken: signerToken,
          zapsignStatus: "aguardando_assinatura",
          zapsignEnviadoEm: new Date(),
          status: "ENVIADA",
        } as any).where(eq(propostas.id, input.propostaId));

        await registrarAuditoria({
          usuarioId: ctx.user.id,
          usuarioNome: ctx.user.name ?? "Sistema",
          entidade: "proposta",
          entidadeId: input.propostaId,
          acao: "enviar_para_assinatura",
          valorAnterior: { zapsignDocId: null },
          valorNovo: { zapsignDocId: docId, clienteEmail, signerUrl },
        });

        return {
          success: true,
          docId,
          signerUrl,
          message: `Proposta enviada para assinatura do cliente ${clienteNome} (${clienteEmail})`,
        };
      } catch (err: any) {
        if (err instanceof TRPCError) throw err;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Erro ao comunicar com ZapSign: ${err.message ?? "Erro desconhecido"}`,
        });
      }
    }),

  // ── 4. Consultar status ZapSign ──────────────────────────────────────────────
  consultarStatusZapsign: protectedProcedure
    .input(z.object({ propostaId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const [proposta] = await db
        .select({
          id: propostas.id,
          numero: propostas.numero,
          status: propostas.status,
          zapsignDocId: propostas.zapsignDocId,
          zapsignStatus: propostas.zapsignStatus,
          zapsignPdfUrl: propostas.zapsignPdfUrl,
          zapsignEnviadoEm: propostas.zapsignEnviadoEm,
          zapsignAssinadoEm: propostas.zapsignAssinadoEm,
          convertidaEmContrato: propostas.convertidaEmContrato,
          contratoId: propostas.contratoId,
        })
        .from(propostas)
        .where(eq(propostas.id, input.propostaId))
        .limit(1);

      return proposta ?? null;
    }),
});
