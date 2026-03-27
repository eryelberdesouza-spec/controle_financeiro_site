import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  propostas,
  propostaEscopos,
  propostaItens,
  propostaPagamentos,
  propostaInfoImportantes,
  formasPagamentoPadrao,
  prazosPadrao,
  infoImportantesPadrao,
} from "../../drizzle/schema";
import { eq, desc, like, and, or, sql } from "drizzle-orm";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Gera o próximo número de proposta no formato PRO-AAAA-MM-XXXX */
async function gerarProximoNumero(): Promise<string> {
  const db = await getDb();
  if (!db) return `PRO-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-0025`;

  const now = new Date();
  const ano = now.getFullYear();
  const mes = String(now.getMonth() + 1).padStart(2, "0");
  const prefixo = `PRO-${ano}-${mes}-`;

  const [ultima] = await db
    .select({ numero: propostas.numero })
    .from(propostas)
    .orderBy(desc(propostas.id))
    .limit(1);

  let proximoSeq = 25; // inicia em 0025 conforme requisito

  if (ultima) {
    const match = ultima.numero.match(/PRO-\d{4}-\d{2}-(\d+)/);
    if (match) {
      const seq = parseInt(match[1], 10);
      proximoSeq = Math.max(seq + 1, 25);
    }
  }

  return `${prefixo}${String(proximoSeq).padStart(4, "0")}`;
}

/** Texto padrão "Sobre Nós" da Atom Tech */
const SOBRE_NOS_PADRAO = `A ATOM TECH é uma empresa brasiliense especializada em soluções de engenharia elétrica e tecnologia, fundada com o propósito de entregar excelência técnica e inovação aos seus clientes.

Com mais de duas décadas de experiência no mercado, nossa equipe é liderada por engenheiros eletricistas formados pela Universidade Federal de Goiás (UFG), trazendo sólida base acadêmica aliada à prática no campo.

Atuamos em projetos de instalações elétricas, manutenção preventiva e corretiva, automação industrial, consultoria técnica e serviços especializados para os setores residencial, comercial e industrial em Brasília e região.

Nossa missão é transformar desafios técnicos em soluções eficientes, seguras e duradouras, sempre com foco na satisfação do cliente e no cumprimento dos prazos acordados.`;

// ─── Schemas de validação ─────────────────────────────────────────────────────

const escopoSchema = z.object({
  id: z.number().optional(),
  descricao: z.string().min(1),
  ordem: z.number().default(1),
});

const itemSchema = z.object({
  id: z.number().optional(),
  tipo: z.enum(["MATERIAL", "SERVICO", "OUTRO"]).default("SERVICO"),
  materialId: z.number().nullable().optional(),
  tipoServicoId: z.number().nullable().optional(),
  descricao: z.string().min(1),
  unidade: z.string().default("un"),
  quantidade: z.union([z.string(), z.number()]),
  valorUnitario: z.union([z.string(), z.number()]),
  valorSubtotal: z.union([z.string(), z.number()]),
  ordem: z.number().default(1),
});

const pagamentoItemSchema = z.object({
  id: z.number().optional(),
  formaPagamentoId: z.number().nullable().optional(),
  textoCustomizado: z.string().nullable().optional(),
  ordem: z.number().default(1),
});

const infoSchema = z.object({
  id: z.number().optional(),
  infoImportanteId: z.number().nullable().optional(),
  titulo: z.string().min(1),
  conteudo: z.string().min(1),
  exclusiva: z.boolean().default(false),
  ordem: z.number().default(1),
});

const propostaInputSchema = z.object({
  clienteId: z.number().nullable().optional(),
  clienteNome: z.string().nullable().optional(),
  clienteCpfCnpj: z.string().nullable().optional(),
  clienteEndereco: z.string().nullable().optional(),
  clienteCep: z.string().nullable().optional(),
  clienteTelefone: z.string().nullable().optional(),
  clienteEmail: z.string().nullable().optional(),
  clienteResponsavel: z.string().nullable().optional(),
  dataGeracao: z.string(),
  validadeDias: z.number().default(30),
  dataValidade: z.string().nullable().optional(),
  sobreNosTexto: z.string().nullable().optional(),
  prazoPadraoId: z.number().nullable().optional(),
  prazoPadraoTexto: z.string().nullable().optional(),
  valorSubtotal: z.union([z.string(), z.number()]).default("0"),
  descontoPercentual: z.union([z.string(), z.number()]).default("0"),
  descontoValor: z.union([z.string(), z.number()]).default("0"),
  valorTotal: z.union([z.string(), z.number()]).default("0"),
  projetoId: z.number().nullable().optional(),
  assinaturaNome: z.string().nullable().optional(),
  assinaturaData: z.string().nullable().optional(),
  observacoes: z.string().nullable().optional(),
  escopos: z.array(escopoSchema).default([]),
  itens: z.array(itemSchema).default([]),
  pagamentosOpcoes: z.array(pagamentoItemSchema).default([]),
  infoImportantes: z.array(infoSchema).default([]),
});

// ─── Router ───────────────────────────────────────────────────────────────────

export const propostasRouter = router({

  // Retorna o próximo número de proposta
  getProximoNumero: protectedProcedure.query(async () => {
    const numero = await gerarProximoNumero();
    return { numero };
  }),

  // Retorna texto padrão "Sobre Nós"
  getSobreNosPadrao: protectedProcedure.query(async () => {
    return { texto: SOBRE_NOS_PADRAO };
  }),

  // Lista propostas com filtros
  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        status: z.string().optional(),
        clienteId: z.number().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions = [];

      if (input.search) {
        conditions.push(
          or(
            like(propostas.numero, `%${input.search}%`),
            like(propostas.clienteNome, `%${input.search}%`),
            like(propostas.clienteCpfCnpj, `%${input.search}%`)
          )
        );
      }

      if (input.status) {
        conditions.push(eq(propostas.status, input.status as any));
      }

      if (input.clienteId) {
        conditions.push(eq(propostas.clienteId, input.clienteId));
      }

      return db
        .select({
          id: propostas.id,
          numero: propostas.numero,
          status: propostas.status,
          clienteId: propostas.clienteId,
          clienteNome: propostas.clienteNome,
          clienteCpfCnpj: propostas.clienteCpfCnpj,
          dataGeracao: propostas.dataGeracao,
          validadeDias: propostas.validadeDias,
          dataValidade: propostas.dataValidade,
          valorTotal: propostas.valorTotal,
          contratoId: propostas.contratoId,
          projetoId: propostas.projetoId,
          createdAt: propostas.createdAt,
          updatedAt: propostas.updatedAt,
        })
        .from(propostas)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(propostas.id))
        .limit(input.limit)
        .offset(input.offset);
    }),

  // Busca proposta por ID com todos os sub-itens
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      const [proposta] = await db
        .select()
        .from(propostas)
        .where(eq(propostas.id, input.id));

      if (!proposta) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Proposta não encontrada" });
      }

      const [escopos, itens, pagamentosVinculados, infoImportantes] = await Promise.all([
        db.select().from(propostaEscopos).where(eq(propostaEscopos.propostaId, input.id)).orderBy(propostaEscopos.ordem),
        db.select().from(propostaItens).where(eq(propostaItens.propostaId, input.id)).orderBy(propostaItens.ordem),
        db.select({
          id: propostaPagamentos.id,
          propostaId: propostaPagamentos.propostaId,
          formaPagamentoId: propostaPagamentos.formaPagamentoId,
          textoCustomizado: propostaPagamentos.textoCustomizado,
          ordem: propostaPagamentos.ordem,
          formaNome: formasPagamentoPadrao.nome,
          formaDescricao: formasPagamentoPadrao.descricao,
        })
          .from(propostaPagamentos)
          .leftJoin(formasPagamentoPadrao, eq(propostaPagamentos.formaPagamentoId, formasPagamentoPadrao.id))
          .where(eq(propostaPagamentos.propostaId, input.id))
          .orderBy(propostaPagamentos.ordem),
        db.select().from(propostaInfoImportantes).where(eq(propostaInfoImportantes.propostaId, input.id)).orderBy(propostaInfoImportantes.ordem),
      ]);

      return { ...proposta, escopos, itens, pagamentosOpcoes: pagamentosVinculados, infoImportantes };
    }),

  // Cria nova proposta
  create: protectedProcedure
    .input(propostaInputSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      const numero = await gerarProximoNumero();

      const [result] = await db.insert(propostas).values({
        numero,
        status: "RASCUNHO",
        clienteId: input.clienteId ?? null,
        clienteNome: input.clienteNome ?? null,
        clienteCpfCnpj: input.clienteCpfCnpj ?? null,
        clienteEndereco: input.clienteEndereco ?? null,
        clienteCep: input.clienteCep ?? null,
        clienteTelefone: input.clienteTelefone ?? null,
        clienteEmail: input.clienteEmail ?? null,
        clienteResponsavel: input.clienteResponsavel ?? null,
        dataGeracao: new Date(input.dataGeracao),
        validadeDias: input.validadeDias,
        dataValidade: input.dataValidade ? new Date(input.dataValidade) : null,
        sobreNosTexto: input.sobreNosTexto ?? SOBRE_NOS_PADRAO,
        prazoPadraoId: input.prazoPadraoId ?? null,
        prazoPadraoTexto: input.prazoPadraoTexto ?? null,
        valorSubtotal: String(input.valorSubtotal),
        descontoPercentual: String(input.descontoPercentual),
        descontoValor: String(input.descontoValor),
        valorTotal: String(input.valorTotal),
        projetoId: input.projetoId ?? null,
        assinaturaNome: input.assinaturaNome ?? null,
        assinaturaData: input.assinaturaData ? new Date(input.assinaturaData) : null,
        observacoes: input.observacoes ?? null,
        createdBy: ctx.user.id,
      });

      const propostaId = (result as any).insertId as number;

      if (input.escopos.length > 0) {
        await db.insert(propostaEscopos).values(
          input.escopos.map((e, i) => ({ propostaId, descricao: e.descricao, ordem: e.ordem ?? i + 1 }))
        );
      }

      if (input.itens.length > 0) {
        await db.insert(propostaItens).values(
          input.itens.map((item, i) => ({
            propostaId,
            tipo: item.tipo,
            materialId: item.materialId ?? null,
            tipoServicoId: item.tipoServicoId ?? null,
            descricao: item.descricao,
            unidade: item.unidade ?? "un",
            quantidade: String(item.quantidade),
            valorUnitario: String(item.valorUnitario),
            valorSubtotal: String(item.valorSubtotal),
            ordem: item.ordem ?? i + 1,
          }))
        );
      }

      const pagamentosLimitados = input.pagamentosOpcoes.slice(0, 4);
      if (pagamentosLimitados.length > 0) {
        await db.insert(propostaPagamentos).values(
          pagamentosLimitados.map((p, i) => ({
            propostaId,
            formaPagamentoId: p.formaPagamentoId ?? null,
            textoCustomizado: p.textoCustomizado ?? null,
            ordem: p.ordem ?? i + 1,
          }))
        );
      }

      if (input.infoImportantes.length > 0) {
        await db.insert(propostaInfoImportantes).values(
          input.infoImportantes.map((info, i) => ({
            propostaId,
            infoImportanteId: info.infoImportanteId ?? null,
            titulo: info.titulo,
            conteudo: info.conteudo,
            exclusiva: info.exclusiva ?? false,
            ordem: info.ordem ?? i + 1,
          }))
        );
      }

      return { id: propostaId, numero };
    }),

  // Atualiza proposta existente
  update: protectedProcedure
    .input(propostaInputSchema.extend({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      const { id, escopos, itens, pagamentosOpcoes, infoImportantes, ...data } = input;

      await db.update(propostas).set({
        clienteId: data.clienteId ?? null,
        clienteNome: data.clienteNome ?? null,
        clienteCpfCnpj: data.clienteCpfCnpj ?? null,
        clienteEndereco: data.clienteEndereco ?? null,
        clienteCep: data.clienteCep ?? null,
        clienteTelefone: data.clienteTelefone ?? null,
        clienteEmail: data.clienteEmail ?? null,
        clienteResponsavel: data.clienteResponsavel ?? null,
        dataGeracao: new Date(data.dataGeracao),
        validadeDias: data.validadeDias,
        dataValidade: data.dataValidade ? new Date(data.dataValidade) : null,
        sobreNosTexto: data.sobreNosTexto ?? null,
        prazoPadraoId: data.prazoPadraoId ?? null,
        prazoPadraoTexto: data.prazoPadraoTexto ?? null,
        valorSubtotal: String(data.valorSubtotal),
        descontoPercentual: String(data.descontoPercentual),
        descontoValor: String(data.descontoValor),
        valorTotal: String(data.valorTotal),
        projetoId: data.projetoId ?? null,
        assinaturaNome: data.assinaturaNome ?? null,
        assinaturaData: data.assinaturaData ? new Date(data.assinaturaData) : null,
        observacoes: data.observacoes ?? null,
      }).where(eq(propostas.id, id));

      // Recriar sub-itens
      await db.delete(propostaEscopos).where(eq(propostaEscopos.propostaId, id));
      await db.delete(propostaItens).where(eq(propostaItens.propostaId, id));
      await db.delete(propostaPagamentos).where(eq(propostaPagamentos.propostaId, id));
      await db.delete(propostaInfoImportantes).where(eq(propostaInfoImportantes.propostaId, id));

      if (escopos.length > 0) {
        await db.insert(propostaEscopos).values(
          escopos.map((e, i) => ({ propostaId: id, descricao: e.descricao, ordem: e.ordem ?? i + 1 }))
        );
      }

      if (itens.length > 0) {
        await db.insert(propostaItens).values(
          itens.map((item, i) => ({
            propostaId: id,
            tipo: item.tipo,
            materialId: item.materialId ?? null,
            tipoServicoId: item.tipoServicoId ?? null,
            descricao: item.descricao,
            unidade: item.unidade ?? "un",
            quantidade: String(item.quantidade),
            valorUnitario: String(item.valorUnitario),
            valorSubtotal: String(item.valorSubtotal),
            ordem: item.ordem ?? i + 1,
          }))
        );
      }

      const pagamentosLimitados = pagamentosOpcoes.slice(0, 4);
      if (pagamentosLimitados.length > 0) {
        await db.insert(propostaPagamentos).values(
          pagamentosLimitados.map((p, i) => ({
            propostaId: id,
            formaPagamentoId: p.formaPagamentoId ?? null,
            textoCustomizado: p.textoCustomizado ?? null,
            ordem: p.ordem ?? i + 1,
          }))
        );
      }

      if (infoImportantes.length > 0) {
        await db.insert(propostaInfoImportantes).values(
          infoImportantes.map((info, i) => ({
            propostaId: id,
            infoImportanteId: info.infoImportanteId ?? null,
            titulo: info.titulo,
            conteudo: info.conteudo,
            exclusiva: info.exclusiva ?? false,
            ordem: info.ordem ?? i + 1,
          }))
        );
      }

      return { success: true };
    }),

  // Muda status da proposta
  mudarStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["RASCUNHO", "ENVIADA", "EM_NEGOCIACAO", "APROVADA", "RECUSADA", "EM_CONTRATACAO", "EXPIRADA", "CANCELADA"]),
        dataAprovacao: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      const updateData: any = { status: input.status };
      if (input.status === "APROVADA" && input.dataAprovacao) {
        updateData.dataAprovacao = input.dataAprovacao;
      }
      await db.update(propostas).set(updateData).where(eq(propostas.id, input.id));
      return { success: true };
    }),

  // Duplica uma proposta
  duplicar: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      const [original] = await db.select().from(propostas).where(eq(propostas.id, input.id));
      if (!original) throw new TRPCError({ code: "NOT_FOUND" });

      const numero = await gerarProximoNumero();
      const now = new Date();
      const dataGeracaoStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const [result] = await db.insert(propostas).values({
        numero,
        status: "RASCUNHO",
        clienteId: original.clienteId,
        clienteNome: original.clienteNome,
        clienteCpfCnpj: original.clienteCpfCnpj,
        clienteEndereco: original.clienteEndereco,
        clienteCep: original.clienteCep,
        clienteTelefone: original.clienteTelefone,
        clienteEmail: original.clienteEmail,
        clienteResponsavel: original.clienteResponsavel,
        dataGeracao: new Date(dataGeracaoStr),
        validadeDias: original.validadeDias,
        sobreNosTexto: original.sobreNosTexto,
        prazoPadraoId: original.prazoPadraoId,
        prazoPadraoTexto: original.prazoPadraoTexto,
        valorSubtotal: original.valorSubtotal,
        descontoPercentual: original.descontoPercentual,
        descontoValor: original.descontoValor,
        valorTotal: original.valorTotal,
        projetoId: original.projetoId,
        observacoes: original.observacoes,
        createdBy: ctx.user.id,
      });

      const novaId = (result as any).insertId as number;

      const [escopos, itens, pagamentosOrig, infos] = await Promise.all([
        db.select().from(propostaEscopos).where(eq(propostaEscopos.propostaId, input.id)),
        db.select().from(propostaItens).where(eq(propostaItens.propostaId, input.id)),
        db.select().from(propostaPagamentos).where(eq(propostaPagamentos.propostaId, input.id)),
        db.select().from(propostaInfoImportantes).where(eq(propostaInfoImportantes.propostaId, input.id)),
      ]);

      if (escopos.length > 0)
        await db.insert(propostaEscopos).values(escopos.map((e) => ({ propostaId: novaId, descricao: e.descricao, ordem: e.ordem })));
      if (itens.length > 0)
        await db.insert(propostaItens).values(itens.map((it) => ({ propostaId: novaId, tipo: it.tipo, materialId: it.materialId, tipoServicoId: it.tipoServicoId, descricao: it.descricao, unidade: it.unidade, quantidade: it.quantidade, valorUnitario: it.valorUnitario, valorSubtotal: it.valorSubtotal, ordem: it.ordem })));
      if (pagamentosOrig.length > 0)
        await db.insert(propostaPagamentos).values(pagamentosOrig.map((p) => ({ propostaId: novaId, formaPagamentoId: p.formaPagamentoId, textoCustomizado: p.textoCustomizado, ordem: p.ordem })));
      if (infos.length > 0)
        await db.insert(propostaInfoImportantes).values(infos.map((inf) => ({ propostaId: novaId, infoImportanteId: inf.infoImportanteId, titulo: inf.titulo, conteudo: inf.conteudo, exclusiva: inf.exclusiva, ordem: inf.ordem })));

      return { id: novaId, numero };
    }),

  // Vincula proposta a um contrato existente
  vincularContrato: protectedProcedure
    .input(z.object({ propostaId: z.number(), contratoId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      await db.update(propostas).set({ contratoId: input.contratoId, status: "EM_CONTRATACAO" }).where(eq(propostas.id, input.propostaId));
      return { success: true };
    }),

  // Exclui proposta
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      await db.delete(propostas).where(eq(propostas.id, input.id));
      return { success: true };
    }),

  // ─── Formas de Pagamento Padrão ─────────────────────────────────────────────

  listFormasPagamento: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(formasPagamentoPadrao).where(eq(formasPagamentoPadrao.ativo, true)).orderBy(formasPagamentoPadrao.nome);
  }),

  listFormasPagamentoAll: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(formasPagamentoPadrao).orderBy(formasPagamentoPadrao.nome);
  }),

  createFormaPagamento: protectedProcedure
    .input(z.object({ nome: z.string().min(1), descricao: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const [result] = await db.insert(formasPagamentoPadrao).values({ nome: input.nome, descricao: input.descricao ?? null, ativo: true, createdBy: ctx.user.id });
      return { id: (result as any).insertId };
    }),

  updateFormaPagamento: protectedProcedure
    .input(z.object({ id: z.number(), nome: z.string().min(1), descricao: z.string().optional(), ativo: z.boolean().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      await db.update(formasPagamentoPadrao).set({ nome: input.nome, descricao: input.descricao ?? null, ativo: input.ativo ?? true }).where(eq(formasPagamentoPadrao.id, input.id));
      return { success: true };
    }),

  deleteFormaPagamento: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      await db.update(formasPagamentoPadrao).set({ ativo: false }).where(eq(formasPagamentoPadrao.id, input.id));
      return { success: true };
    }),

  // ─── Prazos Padrão ──────────────────────────────────────────────────────────

  listPrazos: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(prazosPadrao).where(eq(prazosPadrao.ativo, true)).orderBy(prazosPadrao.nome);
  }),

  listPrazosAll: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(prazosPadrao).orderBy(prazosPadrao.nome);
  }),

  createPrazo: protectedProcedure
    .input(z.object({ nome: z.string().min(1), descricao: z.string().optional(), diasPrazo: z.number().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const [result] = await db.insert(prazosPadrao).values({ nome: input.nome, descricao: input.descricao ?? null, diasPrazo: input.diasPrazo ?? null, ativo: true, createdBy: ctx.user.id });
      return { id: (result as any).insertId };
    }),

  updatePrazo: protectedProcedure
    .input(z.object({ id: z.number(), nome: z.string().min(1), descricao: z.string().optional(), diasPrazo: z.number().optional(), ativo: z.boolean().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      await db.update(prazosPadrao).set({ nome: input.nome, descricao: input.descricao ?? null, diasPrazo: input.diasPrazo ?? null, ativo: input.ativo ?? true }).where(eq(prazosPadrao.id, input.id));
      return { success: true };
    }),

  deletePrazo: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      await db.update(prazosPadrao).set({ ativo: false }).where(eq(prazosPadrao.id, input.id));
      return { success: true };
    }),

  // ─── Informações Importantes Padrão ─────────────────────────────────────────

  listInfoImportantes: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(infoImportantesPadrao).where(eq(infoImportantesPadrao.ativo, true)).orderBy(infoImportantesPadrao.titulo);
  }),

  listInfoImportantesAll: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(infoImportantesPadrao).orderBy(infoImportantesPadrao.titulo);
  }),

  createInfoImportante: protectedProcedure
    .input(z.object({ titulo: z.string().min(1), conteudo: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const [result] = await db.insert(infoImportantesPadrao).values({ titulo: input.titulo, conteudo: input.conteudo, ativo: true, createdBy: ctx.user.id });
      return { id: (result as any).insertId };
    }),

  updateInfoImportante: protectedProcedure
    .input(z.object({ id: z.number(), titulo: z.string().min(1), conteudo: z.string().min(1), ativo: z.boolean().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      await db.update(infoImportantesPadrao).set({ titulo: input.titulo, conteudo: input.conteudo, ativo: input.ativo ?? true }).where(eq(infoImportantesPadrao.id, input.id));
      return { success: true };
    }),

  deleteInfoImportante: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      await db.update(infoImportantesPadrao).set({ ativo: false }).where(eq(infoImportantesPadrao.id, input.id));
      return { success: true };
    }),
});
