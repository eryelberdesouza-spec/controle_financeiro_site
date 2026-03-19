import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb, getUserPermissions } from "../db";
import { TRPCError } from "@trpc/server";

// Helper local para verificar permissão granular
async function requirePerm(userId: number, userRole: string, modulo: string, acao: "podeVer" | "podeCriar" | "podeEditar" | "podeExcluir") {
  if (userRole === "admin") return;
  const perms = await getUserPermissions(userId, userRole);
  if (!perms[modulo]?.[acao]) {
    throw new TRPCError({ code: "FORBIDDEN", message: `Você não tem permissão para excluir registros neste módulo.` });
  }
}
import {
  tiposServico, materiais, contratos, ordensServico, osItens, clientes,
  pagamentos, recebimentos, pagamentoParcelas, recebimentoParcelas, centrosCusto
} from "../../drizzle/schema";
import { eq, like, desc, and, sql, inArray, or } from "drizzle-orm";

// === Tipos de Serviço ===
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
    .mutation(async ({ ctx, input }) => {
      await requirePerm(ctx.user.id, ctx.user.role, "engenharia_materiais", "podeExcluir");
      const d = await getDb();
      if (!d) throw new Error("DB unavailable");
      await d.delete(tiposServico).where(eq(tiposServico.id, input.id));
    }),
});

// === Materiais ===
export const materiaisRouter = router({
  list: protectedProcedure
    .input(z.object({ busca: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const d = await getDb();
      if (!d) return [];
      const cond = input?.busca ? like(materiais.nome, `%${input.busca}%`) : undefined;
      return d.select().from(materiais).where(cond).orderBy(materiais.codigo);
    }),

  // Retorna o próximo código automático no formato MAT-NNNN
  nextCodigo: protectedProcedure.query(async () => {
    const d = await getDb();
    if (!d) return 'MAT-0001';
    const rows = await d.select({ codigo: materiais.codigo }).from(materiais);
    let maxNum = 0;
    for (const row of rows) {
      if (!row.codigo) continue;
      // Extrai o sequencial de qualquer formato (MAT-0001, MAT-001, MAT-1, etc.)
      const match = row.codigo.match(/(\d+)\s*$/);
      if (match) {
        const n = parseInt(match[1], 10);
        if (n > maxNum) maxNum = n;
      }
    }
    const next = maxNum + 1;
    return `MAT-${String(next).padStart(4, '0')}`;
  }),

  create: protectedProcedure
    .input(z.object({
      codigo: z.string().min(1).max(30),
      nome: z.string().min(1).max(200),
      descricao: z.string().optional(),
      unidade: z.string().optional(),
      valorUnitario: z.number().optional(),
      precoCusto: z.number().optional(),
      precoVenda: z.number().optional(),
      estoque: z.number().optional(),
      finalidade: z.enum(['uso', 'fornecimento', 'ambos']).optional(),
      dataInsercao: z.string().optional(), // formato YYYY-MM-DD
    }))
    .mutation(async ({ input, ctx }) => {
      const d = await getDb();
      if (!d) throw new Error("DB unavailable");
      const { precoCusto, precoVenda, valorUnitario, estoque, ...rest } = input;
      const dataIns = input.dataInsercao ? new Date(input.dataInsercao) : new Date();
      const [result] = await d.insert(materiais).values({
        ...rest,
        valorUnitario: (precoVenda ?? valorUnitario)?.toString(), // usa precoVenda como valorUnitario para compatibilidade com OS
        precoCusto: precoCusto?.toString(),
        precoVenda: precoVenda?.toString(),
        estoque: estoque?.toString() ?? '0',
        finalidade: input.finalidade ?? 'ambos',
        dataInsercao: dataIns,
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
      precoCusto: z.number().optional(),
      precoVenda: z.number().optional(),
      estoque: z.number().optional(),
      finalidade: z.enum(['uso', 'fornecimento', 'ambos']).optional(),
      dataInsercao: z.string().optional(),
      ativo: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const d = await getDb();
      if (!d) throw new Error("DB unavailable");
      const { id, precoCusto, precoVenda, valorUnitario, estoque, ...rest } = input;
      const dataIns = rest.dataInsercao ? new Date(rest.dataInsercao) : undefined;
      const { dataInsercao: _di, ...restSemData } = rest;
      await d.update(materiais).set({
        ...restSemData,
        valorUnitario: (precoVenda ?? valorUnitario)?.toString(),
        precoCusto: precoCusto?.toString(),
        precoVenda: precoVenda?.toString(),
        estoque: estoque?.toString(),
        dataInsercao: dataIns,
      }).where(eq(materiais.id, id));
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await requirePerm(ctx.user.id, ctx.user.role, "engenharia_materiais", "podeExcluir");
      const d = await getDb();
      if (!d) throw new Error("DB unavailable");
      await d.delete(materiais).where(eq(materiais.id, input.id));
    }),
});

// === Contratos ===
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
          centroCustoId: contratos.centroCustoId,
          valorPrevisto: contratos.valorPrevisto,
          margemPrevista: contratos.margemPrevista,
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
      status: z.enum(["proposta", "em_negociacao", "ativo", "suspenso", "encerrado"]).optional(),
      clienteId: z.number().optional(),
      centroCustoId: z.number().optional(),
      valorTotal: z.number(),
      valorPrevisto: z.number().optional(),
      margemPrevista: z.number().optional(),
      dataInicio: z.string().optional(),
      dataFim: z.string().optional(),
      descricao: z.string().optional(),
      observacoes: z.string().optional(),
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
      // Usar SQL raw para evitar que o Drizzle inclua DEFAULT em colunas opcionais
      const [result] = await d.execute(sql`
        INSERT INTO contratos (numero, objeto, tipo, status, clienteId, centroCustoId, valorTotal,
          valorPrevisto, margemPrevista, dataInicio, dataFim, descricao, observacoes,
          enderecoLogradouro, enderecoNumero, enderecoComplemento, enderecoBairro,
          enderecoCidade, enderecoEstado, enderecoCep, createdBy)
        VALUES (
          ${input.numero}, ${input.objeto}, ${input.tipo}, ${input.status ?? "proposta"},
          ${input.clienteId ?? null}, ${input.centroCustoId ?? null}, ${input.valorTotal.toString()},
          ${input.valorPrevisto?.toString() ?? null}, ${input.margemPrevista?.toString() ?? null},
          ${input.dataInicio ?? null}, ${input.dataFim ?? null},
          ${input.descricao ?? null}, ${input.observacoes ?? null},
          ${input.enderecoLogradouro ?? null}, ${input.enderecoNumero ?? null},
          ${input.enderecoComplemento ?? null}, ${input.enderecoBairro ?? null},
          ${input.enderecoCidade ?? null}, ${input.enderecoEstado ?? null},
          ${input.enderecoCep ?? null}, ${ctx.user.id}
        )
      `);
      return { id: (result as any).insertId };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      numero: z.string().min(1).max(50),
      objeto: z.string().min(1),
      tipo: z.enum(["prestacao_servico", "fornecimento", "locacao", "misto"]),
      status: z.enum(["proposta", "em_negociacao", "ativo", "suspenso", "encerrado"]),
      clienteId: z.number().optional(),
      centroCustoId: z.number().optional(),
      valorTotal: z.number(),
      valorPrevisto: z.number().optional(),
      margemPrevista: z.number().optional(),
      dataInicio: z.string().optional(),
      dataFim: z.string().optional(),
      descricao: z.string().optional(),
      observacoes: z.string().optional(),
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
      // Usar SQL raw para evitar que o Drizzle inclua DEFAULT em colunas opcionais
      await d.execute(sql`
        UPDATE contratos SET
          numero = ${input.numero},
          objeto = ${input.objeto},
          tipo = ${input.tipo},
          status = ${input.status},
          clienteId = ${input.clienteId ?? null},
          centroCustoId = ${input.centroCustoId ?? null},
          valorTotal = ${input.valorTotal.toString()},
          valorPrevisto = ${input.valorPrevisto?.toString() ?? null},
          margemPrevista = ${input.margemPrevista?.toString() ?? null},
          dataInicio = ${input.dataInicio ?? null},
          dataFim = ${input.dataFim ?? null},
          descricao = ${input.descricao ?? null},
          observacoes = ${input.observacoes ?? null},
          enderecoLogradouro = ${input.enderecoLogradouro ?? null},
          enderecoNumero = ${input.enderecoNumero ?? null},
          enderecoComplemento = ${input.enderecoComplemento ?? null},
          enderecoBairro = ${input.enderecoBairro ?? null},
          enderecoCidade = ${input.enderecoCidade ?? null},
          enderecoEstado = ${input.enderecoEstado ?? null},
          enderecoCep = ${input.enderecoCep ?? null}
        WHERE id = ${input.id}
      `);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await requirePerm(ctx.user.id, ctx.user.role, "engenharia_contratos", "podeExcluir");
      const d = await getDb();
      if (!d) throw new Error("DB unavailable");
      await d.delete(contratos).where(eq(contratos.id, input.id));
    }),

  nextNumero: protectedProcedure.query(async () => {
    const d = await getDb();
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    if (!d) return `CTR-${year}-${month}-001`;
    // Busca todos os contratos para encontrar o maior sequencial global
    const rows = await d.select({ numero: contratos.numero }).from(contratos);
    let maxNum = 0;
    for (const row of rows) {
      if (!row.numero) continue;
      // Extrai o último segmento numérico (ex: CTR-2026-03-042 -> 42)
      const match = row.numero.match(/(\d+)\s*$/);
      if (match) {
        const n = parseInt(match[1], 10);
        if (n > maxNum) maxNum = n;
      }
    }
    const next = maxNum + 1;
    return `CTR-${year}-${month}-${String(next).padStart(3, "0")}`;
  }),
});

// === Ordens de Serviço ===
export const ordensServicoRouter = router({
  list: protectedProcedure
    .input(z.object({
      contratoId: z.number().optional(),
      centroCustoId: z.number().optional(),
      clienteId: z.number().optional(),
      status: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const d = await getDb();
      if (!d) return [];
      const conditions = [];
      if (input?.contratoId) conditions.push(eq(ordensServico.contratoId, input.contratoId));
      if (input?.centroCustoId) conditions.push(eq(ordensServico.centroCustoId, input.centroCustoId));
      if (input?.clienteId) conditions.push(eq(ordensServico.clienteId, input.clienteId));
      if (input?.status) conditions.push(eq(ordensServico.status, input.status as any));
      return d
        .select({
          id: ordensServico.id,
          numero: ordensServico.numero,
          contratoId: ordensServico.contratoId,
          centroCustoId: ordensServico.centroCustoId,
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
          centroCustoNome: centrosCusto.nome,
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
        .leftJoin(centrosCusto, eq(ordensServico.centroCustoId, centrosCusto.id))
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
      centroCustoId: z.number().optional(),
      clienteId: z.number().optional(),
      titulo: z.string().min(1).max(200),
      descricao: z.string().optional(),
      status: z.enum(["planejada", "autorizada", "em_execucao", "concluida", "cancelada"]).optional(),
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
      status: z.enum(["planejada", "autorizada", "em_execucao", "concluida", "cancelada"]),
      prioridade: z.enum(["baixa", "media", "alta", "urgente"]),
      responsavel: z.string().optional(),
      dataAbertura: z.string().optional(),
      dataPrevisao: z.string().optional(),
      dataConclusao: z.string().optional(),
      valorEstimado: z.number().optional(),
      valorRealizado: z.number().optional(),
      observacoes: z.string().optional(),
      contratoId: z.number().optional(),
      centroCustoId: z.number().optional(),
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
    .mutation(async ({ ctx, input }) => {
      await requirePerm(ctx.user.id, ctx.user.role, "engenharia_os", "podeExcluir");
      const d = await getDb();
      if (!d) throw new Error("DB unavailable");
      await d.delete(ordensServico).where(eq(ordensServico.id, input.id));
    }),

  nextNumero: protectedProcedure.query(async () => {
    const d = await getDb();
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    if (!d) return `OS-${year}-${month}-001`;
    // Busca todos os números de OS para encontrar o maior sequencial global
    const rows = await d.select({ numero: ordensServico.numero }).from(ordensServico);
    let maxNum = 0;
    for (const row of rows) {
      if (!row.numero) continue;
      // Extrai o último segmento numérico (ex: OS-2026-03-042 -> 42, ou OS-2026-042 -> 42)
      const match = row.numero.match(/(\d+)\s*$/);
      if (match) {
        const n = parseInt(match[1], 10);
        if (n > maxNum) maxNum = n;
      }
    }
    const next = maxNum + 1;
    return `OS-${year}-${month}-${String(next).padStart(3, '0')}`;
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

// === Relatório por Contrato ===
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

      // Recebimentos vinculados (por contratoId direto ou numeroContrato para compatibilidade)
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
        .where(or(eq(recebimentos.contratoId, input.contratoId), eq(recebimentos.numeroContrato, contrato.numero)))
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

      // Pagamentos vinculados (por contratoId direto ou tipoServico para compatibilidade)
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
        .where(or(eq(pagamentos.contratoId, input.contratoId), sql`${pagamentos.tipoServico} LIKE ${`%${contrato.numero}%`}`))
        .orderBy(pagamentos.dataPagamento);

      // Calcular totais
      const totalRecebido = parcelas
        .filter(p => p.status === "Recebido")
        .reduce((acc, p) => acc + parseFloat(p.valor ?? "0"), 0);
      const totalPago = pags
        .filter(p => p.status === "Pago")
        .reduce((acc, p) => acc + parseFloat(p.valor ?? "0"), 0);
      const totalPendente = recs.reduce((acc, r) => acc + parseFloat(r.valorTotal ?? "0"), 0) - totalRecebido;

      const osAberta = os.filter(o => ["planejada", "autorizada", "em_execucao"].includes(o.status ?? "")).length;
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

  ativarContrato: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const d = await getDb();
      if (!d) throw new Error("DB unavailable");

      // Buscar contrato
      const [contrato] = await d
        .select({
          id: contratos.id,
          numero: contratos.numero,
          objeto: contratos.objeto,
          status: contratos.status,
          centroCustoId: contratos.centroCustoId,
          clienteId: contratos.clienteId,
          clienteNome: clientes.nome,
        })
        .from(contratos)
        .leftJoin(clientes, eq(contratos.clienteId, clientes.id))
        .where(eq(contratos.id, input.id));

      if (!contrato) throw new TRPCError({ code: "NOT_FOUND", message: "Contrato não encontrado" });
      if (contrato.status === "ativo") throw new TRPCError({ code: "BAD_REQUEST", message: "Contrato já está ativo" });

      let centroCustoId = contrato.centroCustoId;

      // Criar Centro de Custo automaticamente se não existir
      if (!centroCustoId) {
        const nomeCc = `CTR ${contrato.numero} — ${contrato.objeto.substring(0, 60)}`;
        const [ccResult] = await d.insert(centrosCusto).values({
          nome: nomeCc,
          descricao: `Centro de custo criado automaticamente ao ativar o contrato ${contrato.numero}`,
          tipo: "contrato",
          contratoId: contrato.id,
          ativo: true,
          createdBy: ctx.user.id,
        });
        centroCustoId = ccResult.insertId;
      }

      // Atualizar status do contrato para ativo e vincular CC
      await d.update(contratos).set({
        status: "ativo",
        centroCustoId,
      }).where(eq(contratos.id, input.id));

      return { success: true, centroCustoId };
    }),

  getDRE: protectedProcedure
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
          status: contratos.status,
          valorTotal: contratos.valorTotal,
          valorPrevisto: contratos.valorPrevisto,
          margemPrevista: contratos.margemPrevista,
          dataInicio: contratos.dataInicio,
          dataFim: contratos.dataFim,
          centroCustoId: contratos.centroCustoId,
          clienteNome: clientes.nome,
        })
        .from(contratos)
        .leftJoin(clientes, eq(contratos.clienteId, clientes.id))
        .where(eq(contratos.id, input.contratoId));

      if (!contrato) return null;

      // Receitas: recebimentos vinculados ao contrato (por número)
      const recs = await d
        .select({
          id: recebimentos.id,
          valorTotal: recebimentos.valorTotal,
          status: recebimentos.status,
          dataVencimento: recebimentos.dataVencimento,
          dataRecebimento: recebimentos.dataRecebimento,
          descricao: recebimentos.descricao,
        })
        .from(recebimentos)
        .where(eq(recebimentos.numeroContrato, contrato.numero));

      // Custos: pagamentos vinculados ao CC do contrato
      const custos = contrato.centroCustoId
        ? await d
            .select({
              id: pagamentos.id,
              valor: pagamentos.valor,
              status: pagamentos.status,
              dataPagamento: pagamentos.dataPagamento,
              descricao: pagamentos.descricao,
              tipoServico: pagamentos.tipoServico,
            })
            .from(pagamentos)
            .where(eq(pagamentos.centroCustoId, contrato.centroCustoId!))
        : [];

      // OS vinculadas
      const os = await d
        .select({
          id: ordensServico.id,
          numero: ordensServico.numero,
          titulo: ordensServico.titulo,
          status: ordensServico.status,
          valorEstimado: ordensServico.valorEstimado,
          valorRealizado: ordensServico.valorRealizado,
        })
        .from(ordensServico)
        .where(eq(ordensServico.contratoId, input.contratoId));

      // Cálculos DRE
      const receitaContratada = parseFloat(contrato.valorTotal ?? "0");
      const receitaPrevista = parseFloat(contrato.valorPrevisto ?? contrato.valorTotal ?? "0");
      const receitaRealizada = recs
        .filter(r => r.status === "Recebido")
        .reduce((s, r) => s + parseFloat(r.valorTotal ?? "0"), 0);
      const receitaPendente = recs
        .filter(r => r.status === "Pendente" || r.status === "Atrasado")
        .reduce((s, r) => s + parseFloat(r.valorTotal ?? "0"), 0);

      const custosRealizados = custos
        .filter(p => p.status === "Pago")
        .reduce((s, p) => s + parseFloat(p.valor ?? "0"), 0);
      const custosPendentes = custos
        .filter(p => p.status === "Pendente" || p.status === "Processando")
        .reduce((s, p) => s + parseFloat(p.valor ?? "0"), 0);

      const custoOsEstimado = os
        .reduce((s, o) => s + parseFloat(o.valorEstimado ?? "0"), 0);
      const custoOsRealizado = os
        .filter(o => o.status === "concluida")
        .reduce((s, o) => s + parseFloat(o.valorRealizado ?? o.valorEstimado ?? "0"), 0);

      const margemPrevistaPerc = parseFloat(contrato.margemPrevista ?? "0");
      const custosPrevisos = receitaPrevista * (1 - margemPrevistaPerc / 100);

      const margemBrutaRealizada = receitaRealizada - custosRealizados;
      const margemBrutaPerc = receitaRealizada > 0 ? (margemBrutaRealizada / receitaRealizada) * 100 : 0;

      return {
        contrato: {
          ...contrato,
          receitaContratada,
          receitaPrevista,
          margemPrevistaPerc,
        },
        receitas: {
          contratada: receitaContratada,
          prevista: receitaPrevista,
          realizada: receitaRealizada,
          pendente: receitaPendente,
          total: receitaRealizada + receitaPendente,
        },
        custos: {
          previstos: custosPrevisos,
          realizados: custosRealizados,
          pendentes: custosPendentes,
          osEstimado: custoOsEstimado,
          osRealizado: custoOsRealizado,
          total: custosRealizados + custosPendentes,
        },
        margens: {
          bruta: margemBrutaRealizada,
          brutaPerc: margemBrutaPerc,
          prevista: receitaPrevista * (margemPrevistaPerc / 100),
          previstaPerc: margemPrevistaPerc,
        },
        os,
        recebimentos: recs,
        pagamentos: custos,
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
