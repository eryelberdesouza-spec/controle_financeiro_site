import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  tiposServico, materiais, contratos, ordensServico, osItens, clientes,
  pagamentos, recebimentos, pagamentoParcelas, recebimentoParcelas
} from "../../drizzle/schema";
import { eq, like, desc, and, sql, inArray } from "drizzle-orm";

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
          enderecoLogradouro: contratos.enderecoLogradouro,
          enderecoNumero: contratos.enderecoNumero,
          enderecoComplemento: contratos.enderecoComplemento,
          enderecoBairro: contratos.enderecoBairro,
          enderecoCidade: contratos.enderecoCidade,
          enderecoEstado: contratos.enderecoEstado,
          enderecoCep: contratos.enderecoCep,
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
      enderecoLogradouro: z.string().max(255).optional(),
      enderecoNumero: z.string().max(20).optional(),
      enderecoComplemento: z.string().max(100).optional(),
      enderecoBairro: z.string().max(100).optional(),
      enderecoCidade: z.string().max(100).optional(),
      enderecoEstado: z.string().max(2).optional(),
      enderecoCep: z.string().max(10).optional(),
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
      enderecoLogradouro: z.string().max(255).optional(),
      enderecoNumero: z.string().max(20).optional(),
      enderecoComplemento: z.string().max(100).optional(),
      enderecoBairro: z.string().max(100).optional(),
      enderecoCidade: z.string().max(100).optional(),
      enderecoEstado: z.string().max(2).optional(),
      enderecoCep: z.string().max(10).optional(),
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
          enderecoLogradouro: ordensServico.enderecoLogradouro,
          enderecoNumero: ordensServico.enderecoNumero,
          enderecoComplemento: ordensServico.enderecoComplemento,
          enderecoBairro: ordensServico.enderecoBairro,
          enderecoCidade: ordensServico.enderecoCidade,
          enderecoEstado: ordensServico.enderecoEstado,
          enderecoCep: ordensServico.enderecoCep,
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
      enderecoLogradouro: z.string().max(255).optional(),
      enderecoNumero: z.string().max(20).optional(),
      enderecoComplemento: z.string().max(100).optional(),
      enderecoBairro: z.string().max(100).optional(),
      enderecoCidade: z.string().max(100).optional(),
      enderecoEstado: z.string().max(2).optional(),
      enderecoCep: z.string().max(10).optional(),
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
      enderecoLogradouro: z.string().max(255).optional(),
      enderecoNumero: z.string().max(20).optional(),
      enderecoComplemento: z.string().max(100).optional(),
      enderecoBairro: z.string().max(100).optional(),
      enderecoCidade: z.string().max(100).optional(),
      enderecoEstado: z.string().max(2).optional(),
      enderecoCep: z.string().max(10).optional(),
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

  gerarLancamento: protectedProcedure
    .input(z.object({
      osId: z.number(),
      tipo: z.enum(["pagamento", "recebimento"]),
      valor: z.number(),
      descricao: z.string().optional(),
      dataVencimento: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const d = await getDb();
      if (!d) throw new Error("DB unavailable");

      // Buscar dados da OS e do contrato vinculado
      const [os] = await d
        .select({
          id: ordensServico.id,
          numero: ordensServico.numero,
          titulo: ordensServico.titulo,
          clienteId: ordensServico.clienteId,
          contratoId: ordensServico.contratoId,
          clienteNome: clientes.nome,
          clienteCpf: clientes.cpfCnpj,
          contratoNumero: contratos.numero,
        })
        .from(ordensServico)
        .leftJoin(clientes, eq(ordensServico.clienteId, clientes.id))
        .leftJoin(contratos, eq(ordensServico.contratoId, contratos.id))
        .where(eq(ordensServico.id, input.osId));

      if (!os) throw new Error("OS não encontrada");

      const dataRef = input.dataVencimento ? new Date(input.dataVencimento) : new Date();
      const descricao = input.descricao || `OS ${os.numero} — ${os.titulo}`;

      if (input.tipo === "pagamento") {
        // Gerar próximo número de controle
        const [row] = await d
          .select({ max: sql<string>`MAX(CAST(SUBSTRING_INDEX(COALESCE(numeroControle, 'PAG-0-000'), '-', -1) AS UNSIGNED))` })
          .from(pagamentos);
        const next = (parseInt(row?.max ?? "0") || 0) + 1;
        const numeroControle = `PAG-${new Date().getFullYear()}-${String(next).padStart(3, "0")}`;

        const [result] = await d.insert(pagamentos).values({
          numeroControle,
          nomeCompleto: os.clienteNome ?? "Não informado",
          cpf: os.clienteCpf ?? "",
          valor: input.valor.toString(),
          dataPagamento: dataRef,
          status: "Pendente",
          descricao,
          clienteId: os.clienteId ?? undefined,
          tipoServico: os.contratoNumero ? `Contrato ${os.contratoNumero}` : undefined,
          createdBy: ctx.user.id,
        });
        return { tipo: "pagamento", id: result.insertId, numeroControle };
      } else {
        // Gerar próximo número de controle
        const [row] = await d
          .select({ max: sql<string>`MAX(CAST(SUBSTRING_INDEX(COALESCE(numeroControle, 'REC-0-000'), '-', -1) AS UNSIGNED))` })
          .from(recebimentos);
        const next = (parseInt(row?.max ?? "0") || 0) + 1;
        const numeroControle = `REC-${new Date().getFullYear()}-${String(next).padStart(3, "0")}`;

        const [result] = await d.insert(recebimentos).values({
          numeroControle,
          numeroContrato: os.contratoNumero ?? "",
          nomeRazaoSocial: os.clienteNome ?? "Não informado",
          valorTotal: input.valor.toString(),
          dataVencimento: dataRef,
          status: "Pendente",
          tipoRecebimento: "Pix",
          descricao,
          clienteId: os.clienteId ?? undefined,
          quantidadeParcelas: 1,
          createdBy: ctx.user.id,
        });
        return { tipo: "recebimento", id: result.insertId, numeroControle };
      }
    }),
});

// ─── Relatório por Contrato ───────────────────────────────────────────────────
export const relatorioContratoRouter = router({
  getRelatorio: protectedProcedure
    .input(z.object({ contratoId: z.number() }))
    .query(async ({ input }) => {
      const d = await getDb();
      if (!d) return null;

      // Dados do contrato
      const [contrato] = await d
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
          clienteNome: clientes.nome,
          clienteCpf: clientes.cpfCnpj,
          clienteEmail: clientes.email,
          clienteTelefone: clientes.telefone,
        })
        .from(contratos)
        .leftJoin(clientes, eq(contratos.clienteId, clientes.id))
        .where(eq(contratos.id, input.contratoId));

      if (!contrato) return null;

      // OS vinculadas
      const os = await d
        .select({
          id: ordensServico.id,
          numero: ordensServico.numero,
          titulo: ordensServico.titulo,
          status: ordensServico.status,
          prioridade: ordensServico.prioridade,
          responsavel: ordensServico.responsavel,
          dataAbertura: ordensServico.dataAbertura,
          dataPrevisao: ordensServico.dataPrevisao,
          dataConclusao: ordensServico.dataConclusao,
          valorEstimado: ordensServico.valorEstimado,
          valorRealizado: ordensServico.valorRealizado,
        })
        .from(ordensServico)
        .where(eq(ordensServico.contratoId, input.contratoId))
        .orderBy(ordensServico.dataAbertura);

      // Recebimentos vinculados (por numeroContrato ou clienteId do contrato)
      const recs = await d
        .select({
          id: recebimentos.id,
          numeroControle: recebimentos.numeroControle,
          nomeRazaoSocial: recebimentos.nomeRazaoSocial,
          valorTotal: recebimentos.valorTotal,
          dataVencimento: recebimentos.dataVencimento,
          dataRecebimento: recebimentos.dataRecebimento,
          status: recebimentos.status,
          descricao: recebimentos.descricao,
          quantidadeParcelas: recebimentos.quantidadeParcelas,
        })
        .from(recebimentos)
        .where(eq(recebimentos.numeroContrato, contrato.numero))
        .orderBy(recebimentos.dataVencimento);

      // Parcelas dos recebimentos
      const recIds = recs.map(r => r.id);
      const parcelas = recIds.length > 0
        ? await d
            .select()
            .from(recebimentoParcelas)
            .where(inArray(recebimentoParcelas.recebimentoId, recIds))
            .orderBy(recebimentoParcelas.numeroParcela)
        : [];

      // Pagamentos vinculados (por tipoServico contendo o número do contrato)
      const pags = await d
        .select({
          id: pagamentos.id,
          numeroControle: pagamentos.numeroControle,
          nomeCompleto: pagamentos.nomeCompleto,
          valor: pagamentos.valor,
          dataPagamento: pagamentos.dataPagamento,
          status: pagamentos.status,
          descricao: pagamentos.descricao,
          tipoServico: pagamentos.tipoServico,
        })
        .from(pagamentos)
        .where(sql`${pagamentos.tipoServico} LIKE ${`%${contrato.numero}%`}`)
        .orderBy(pagamentos.dataPagamento);

      // Calcular totais
      const totalRecebido = parcelas
        .filter(p => p.status === "Recebido")
        .reduce((acc, p) => acc + parseFloat(p.valor ?? "0"), 0);
      const totalPago = pags
        .filter(p => p.status === "Pago")
        .reduce((acc, p) => acc + parseFloat(p.valor ?? "0"), 0);
      const totalPendente = recs.reduce((acc, r) => acc + parseFloat(r.valorTotal ?? "0"), 0) - totalRecebido;

      const osAberta = os.filter(o => ["aberta", "em_execucao", "pausada"].includes(o.status ?? "")).length;
      const osConcluida = os.filter(o => o.status === "concluida").length;

      return {
        contrato,
        os,
        recebimentos: recs,
        parcelas,
        pagamentos: pags,
        totais: {
          valorContrato: parseFloat(contrato.valorTotal ?? "0"),
          totalRecebido,
          totalPago,
          totalPendente,
          saldoRestante: parseFloat(contrato.valorTotal ?? "0") - totalRecebido,
          osTotal: os.length,
          osAberta,
          osConcluida,
        },
      };
    }),

  listar: protectedProcedure
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
          status: contratos.status,
          valorTotal: contratos.valorTotal,
          dataInicio: contratos.dataInicio,
          dataFim: contratos.dataFim,
          clienteNome: clientes.nome,
        })
        .from(contratos)
        .leftJoin(clientes, eq(contratos.clienteId, clientes.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(contratos.createdAt));
    }),
});
