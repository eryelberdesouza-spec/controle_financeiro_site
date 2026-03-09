import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { centrosCusto, clientes, Convite, convites, dashboardConfig, EmpresaConfig, empresaConfig, InsertCentroCusto, InsertCliente, InsertEmpresaConfig, InsertPagamento, InsertPagamentoParcela, InsertRecebimento, InsertRecebimentoParcela, InsertUser, pagamentoParcelas, pagamentos, recebimentoParcelas, recebimentos, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot get user: database not available"); return undefined; }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ==================== USERS MANAGEMENT ====================

export async function listUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    loginMethod: users.loginMethod,
    createdAt: users.createdAt,
    lastSignedIn: users.lastSignedIn,
  }).from(users).orderBy(desc(users.createdAt));
}

export async function updateUserRole(id: number, role: "admin" | "operador" | "user") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(users).set({ role }).where(eq(users.id, id));
}

export async function toggleUserAtivo(id: number, ativo: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(users).set({ ativo }).where(eq(users.id, id));
}

export async function deleteUser(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(users).where(eq(users.id, id));
}

// ==================== PAGAMENTOS ====================

export async function listPagamentos(filters?: { status?: string; centroCusto?: string; dataInicio?: Date; dataFim?: Date }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.status) conditions.push(eq(pagamentos.status, filters.status as any));
  if (filters?.centroCusto) conditions.push(eq(pagamentos.centroCusto, filters.centroCusto));
  if (filters?.dataInicio) conditions.push(gte(pagamentos.dataPagamento, filters.dataInicio));
  if (filters?.dataFim) conditions.push(lte(pagamentos.dataPagamento, filters.dataFim));
  return db.select({
    id: pagamentos.id,
    numeroControle: pagamentos.numeroControle,
    nomeCompleto: pagamentos.nomeCompleto,
    descricao: pagamentos.descricao,
    valor: pagamentos.valor,
    valorEquipamento: pagamentos.valorEquipamento,
    valorServico: pagamentos.valorServico,
    dataPagamento: pagamentos.dataPagamento,
    status: pagamentos.status,
    centroCusto: pagamentos.centroCusto,
    centroCustoId: pagamentos.centroCustoId,
    clienteId: pagamentos.clienteId,
    clienteNome: clientes.nome,
    tipoServico: pagamentos.tipoServico,
    banco: pagamentos.banco,
    cpf: pagamentos.cpf,
    chavePix: pagamentos.chavePix,
    tipoPix: pagamentos.tipoPix,
    autorizadoPor: pagamentos.autorizadoPor,
    parcelado: pagamentos.parcelado,
    quantidadeParcelas: pagamentos.quantidadeParcelas,
    observacao: pagamentos.observacao,
    createdAt: pagamentos.createdAt,
    updatedAt: pagamentos.updatedAt,
  })
    .from(pagamentos)
    .leftJoin(clientes, eq(pagamentos.clienteId, clientes.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(pagamentos.dataPagamento));
}

export async function getPagamentoById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(pagamentos).where(eq(pagamentos.id, id)).limit(1);
  return result[0];
}

export async function createPagamento(data: InsertPagamento) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(pagamentos).values(data);
}

export async function updatePagamento(id: number, data: Partial<InsertPagamento>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(pagamentos).set(data).where(eq(pagamentos.id, id));
}

export async function deletePagamento(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(pagamentos).where(eq(pagamentos.id, id));
}

/**
 * Retorna o próximo número de controle sugerido para Pagamentos.
 * Extrai o maior número numérico de todos os campos numeroControle e retorna o próximo.
 * Formato: PAG-YYYY-NNN (ex: PAG-2026-042)
 */
export async function getNextNumeroControlePagamento(): Promise<string> {
  const db = await getDb();
  if (!db) return `PAG-${new Date().getFullYear()}-001`;
  const result = await db.select({ numeroControle: pagamentos.numeroControle }).from(pagamentos);
  let maxNum = 0;
  for (const row of result) {
    if (!row.numeroControle) continue;
    // Extrai o último segmento numérico (ex: PAG-2026-042 -> 42, ou 42 -> 42)
    const match = row.numeroControle.match(/(\d+)\s*$/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > maxNum) maxNum = n;
    }
  }
  const next = maxNum + 1;
  const year = new Date().getFullYear();
  return `PAG-${year}-${String(next).padStart(3, "0")}`;
}

export async function getPagamentosStats() {
  const db = await getDb();
  if (!db) return null;
  return db.select({
    status: pagamentos.status,
    total: sql<number>`SUM(${pagamentos.valor})`,
    count: sql<number>`COUNT(*)`,
  }).from(pagamentos).groupBy(pagamentos.status);
}

// ==================== RECEBIMENTOS ====================

export async function listRecebimentos(filters?: { status?: string; tipoRecebimento?: string; dataInicio?: Date; dataFim?: Date }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.status) conditions.push(eq(recebimentos.status, filters.status as any));
  if (filters?.tipoRecebimento) conditions.push(eq(recebimentos.tipoRecebimento, filters.tipoRecebimento as any));
  if (filters?.dataInicio) conditions.push(gte(recebimentos.dataVencimento, filters.dataInicio));
  if (filters?.dataFim) conditions.push(lte(recebimentos.dataVencimento, filters.dataFim));
  return db.select({
    id: recebimentos.id,
    numeroControle: recebimentos.numeroControle,
    numeroContrato: recebimentos.numeroContrato,
    nomeRazaoSocial: recebimentos.nomeRazaoSocial,
    descricao: recebimentos.descricao,
    valorTotal: recebimentos.valorTotal,
    valorEquipamento: recebimentos.valorEquipamento,
    valorServico: recebimentos.valorServico,
    juros: recebimentos.juros,
    desconto: recebimentos.desconto,
    dataVencimento: recebimentos.dataVencimento,
    dataRecebimento: recebimentos.dataRecebimento,
    status: recebimentos.status,
    tipoRecebimento: recebimentos.tipoRecebimento,
    centroCustoId: recebimentos.centroCustoId,
    clienteId: recebimentos.clienteId,
    clienteNome: clientes.nome,
    quantidadeParcelas: recebimentos.quantidadeParcelas,
    parcelaAtual: recebimentos.parcelaAtual,
    observacao: recebimentos.observacao,
    createdAt: recebimentos.createdAt,
    updatedAt: recebimentos.updatedAt,
  })
    .from(recebimentos)
    .leftJoin(clientes, eq(recebimentos.clienteId, clientes.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(recebimentos.dataVencimento));
}

export async function getRecebimentoById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(recebimentos).where(eq(recebimentos.id, id)).limit(1);
  return result[0];
}

export async function createRecebimento(data: InsertRecebimento) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(recebimentos).values(data);
}

export async function updateRecebimento(id: number, data: Partial<InsertRecebimento>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(recebimentos).set(data).where(eq(recebimentos.id, id));
}

export async function deleteRecebimento(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(recebimentos).where(eq(recebimentos.id, id));
}

export async function getRecebimentosStats() {
  const db = await getDb();
  if (!db) return null;
  return db.select({
    status: recebimentos.status,
    total: sql<number>`SUM(${recebimentos.valorTotal})`,
    totalEquipamento: sql<number>`SUM(${recebimentos.valorEquipamento})`,
    totalServico: sql<number>`SUM(${recebimentos.valorServico})`,
    count: sql<number>`COUNT(*)`,
  }).from(recebimentos).groupBy(recebimentos.status);
}

// ==================== EMPRESA CONFIG ====================

export async function getEmpresaConfig(): Promise<EmpresaConfig | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(empresaConfig).limit(1);
  return result[0] ?? null;
}

export async function upsertEmpresaConfig(data: Partial<InsertEmpresaConfig>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(empresaConfig).limit(1);
  if (existing.length > 0) {
    return db.update(empresaConfig).set(data).where(eq(empresaConfig.id, existing[0].id));
  } else {
    return db.insert(empresaConfig).values({
      nomeEmpresa: data.nomeEmpresa ?? "Minha Empresa",
      ...data,
    });
  }
}

// ==================== DASHBOARD ====================

/**
 * Retorna stats do dashboard filtrados por período.
 * dataInicio e dataFim são opcionais — sem filtro retorna tudo.
 */
export async function getDashboardStats(dataInicio?: Date, dataFim?: Date) {
  const db = await getDb();
  if (!db) return null;

  const pagWhere = dataInicio && dataFim
    ? and(gte(pagamentos.dataPagamento, dataInicio), lte(pagamentos.dataPagamento, dataFim))
    : undefined;
  const recWhere = dataInicio && dataFim
    ? and(gte(recebimentos.dataVencimento, dataInicio), lte(recebimentos.dataVencimento, dataFim))
    : undefined;

  const [pagStats, recStats] = await Promise.all([
    db.select({
      totalPago: sql<number>`SUM(CASE WHEN ${pagamentos.status} = 'Pago' THEN ${pagamentos.valor} ELSE 0 END)`,
      // Pendente inclui 'Pendente' E 'Processando' — ambos são pagamentos ainda não efetivados
      totalPendente: sql<number>`SUM(CASE WHEN ${pagamentos.status} IN ('Pendente', 'Processando') THEN ${pagamentos.valor} ELSE 0 END)`,
      totalProcessando: sql<number>`SUM(CASE WHEN ${pagamentos.status} = 'Processando' THEN ${pagamentos.valor} ELSE 0 END)`,
      countPendente: sql<number>`SUM(CASE WHEN ${pagamentos.status} IN ('Pendente', 'Processando') THEN 1 ELSE 0 END)`,
      totalGeral: sql<number>`SUM(${pagamentos.valor})`,
      count: sql<number>`COUNT(*)`,
    }).from(pagamentos).where(pagWhere),
    db.select({
      totalRecebido: sql<number>`SUM(CASE WHEN ${recebimentos.status} = 'Recebido' THEN ${recebimentos.valorTotal} ELSE 0 END)`,
      totalPendente: sql<number>`SUM(CASE WHEN ${recebimentos.status} = 'Pendente' THEN ${recebimentos.valorTotal} ELSE 0 END)`,
      totalAtrasado: sql<number>`SUM(CASE WHEN ${recebimentos.status} = 'Atrasado' THEN ${recebimentos.valorTotal} ELSE 0 END)`,
      totalGeral: sql<number>`SUM(${recebimentos.valorTotal})`,
      totalEquipamento: sql<number>`SUM(${recebimentos.valorEquipamento})`,
      totalServico: sql<number>`SUM(${recebimentos.valorServico})`,
      count: sql<number>`COUNT(*)`,
    }).from(recebimentos).where(recWhere),
  ]);
  return { pagamentos: pagStats[0], recebimentos: recStats[0] };
}

/**
 * Retorna pagamentos e recebimentos com vencimento nos próximos N dias ou já atrasados.
 * Usado para alertas no Dashboard.
 */
export async function getVencimentosProximos(diasAntecedencia: number = 7) {
  const db = await getDb();
  if (!db) return { pagamentos: [], recebimentos: [] };

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const limite = new Date(hoje);
  limite.setDate(limite.getDate() + diasAntecedencia);
  limite.setHours(23, 59, 59, 999);

  const [pagVenc, pagParcelasVenc, recVenc, recParcelasVenc] = await Promise.all([
    // Pagamentos NÃO parcelados: pendentes/processando com vencimento até o limite
    db.select({
      id: pagamentos.id,
      numeroControle: pagamentos.numeroControle,
      nomeCompleto: pagamentos.nomeCompleto,
      valor: pagamentos.valor,
      dataPagamento: pagamentos.dataPagamento,
      status: pagamentos.status,
      tipo: sql<string>`'pagamento'`,
    })
      .from(pagamentos)
      .where(
        and(
          sql`${pagamentos.status} IN ('Pendente', 'Processando')`,
          eq(pagamentos.parcelado, false),
          lte(pagamentos.dataPagamento, limite)
        )
      )
      .orderBy(pagamentos.dataPagamento)
      .limit(10),
    // Parcelas de pagamentos: pendentes/atrasadas com vencimento até o limite
    db.select({
      id: pagamentoParcelas.id,
      numeroControle: pagamentos.numeroControle,
      nomeCompleto: pagamentos.nomeCompleto,
      valor: pagamentoParcelas.valor,
      dataPagamento: pagamentoParcelas.dataVencimento,
      status: pagamentoParcelas.status,
      tipo: sql<string>`'parcela_pagamento'`,
    })
      .from(pagamentoParcelas)
      .innerJoin(pagamentos, eq(pagamentoParcelas.pagamentoId, pagamentos.id))
      .where(
        and(
          sql`${pagamentoParcelas.status} IN ('Pendente', 'Atrasado')`,
          lte(pagamentoParcelas.dataVencimento, limite)
        )
      )
      .orderBy(pagamentoParcelas.dataVencimento)
      .limit(10),
    // Recebimentos NÃO parcelados (quantidadeParcelas = 1): pendentes/atrasados com vencimento até o limite
    db.select({
      id: recebimentos.id,
      numeroControle: recebimentos.numeroControle,
      nomeRazaoSocial: recebimentos.nomeRazaoSocial,
      valorTotal: recebimentos.valorTotal,
      dataVencimento: recebimentos.dataVencimento,
      status: recebimentos.status,
      tipo: sql<string>`'recebimento'`,
    })
      .from(recebimentos)
      .where(
        and(
          sql`${recebimentos.status} IN ('Pendente', 'Atrasado')`,
          eq(recebimentos.quantidadeParcelas, 1),
          lte(recebimentos.dataVencimento, limite)
        )
      )
      .orderBy(recebimentos.dataVencimento)
      .limit(10),
    // Parcelas de recebimentos: pendentes/atrasadas com vencimento até o limite
    db.select({
      id: recebimentoParcelas.id,
      numeroControle: recebimentos.numeroControle,
      nomeRazaoSocial: recebimentos.nomeRazaoSocial,
      valorTotal: recebimentoParcelas.valor,
      dataVencimento: recebimentoParcelas.dataVencimento,
      status: recebimentoParcelas.status,
      tipo: sql<string>`'parcela_recebimento'`,
    })
      .from(recebimentoParcelas)
      .innerJoin(recebimentos, eq(recebimentoParcelas.recebimentoId, recebimentos.id))
      .where(
        and(
          sql`${recebimentoParcelas.status} IN ('Pendente', 'Atrasado')`,
          lte(recebimentoParcelas.dataVencimento, limite)
        )
      )
      .orderBy(recebimentoParcelas.dataVencimento)
      .limit(10),
  ]);

  // Combina e normaliza os resultados
  const pagamentosVenc = [
    ...pagVenc.map(p => ({ id: p.id, numeroControle: p.numeroControle, nomeCompleto: p.nomeCompleto, valor: p.valor, dataPagamento: p.dataPagamento, status: p.status })),
    ...pagParcelasVenc.map(p => ({ id: p.id, numeroControle: p.numeroControle, nomeCompleto: p.nomeCompleto, valor: p.valor, dataPagamento: p.dataPagamento, status: p.status })),
  ].sort((a, b) => new Date(a.dataPagamento!).getTime() - new Date(b.dataPagamento!).getTime()).slice(0, 10);

  const recebimentosVenc = [
    ...recVenc.map(r => ({ id: r.id, numeroControle: r.numeroControle, nomeRazaoSocial: r.nomeRazaoSocial, valorTotal: r.valorTotal, dataVencimento: r.dataVencimento, status: r.status })),
    ...recParcelasVenc.map(r => ({ id: r.id, numeroControle: r.numeroControle, nomeRazaoSocial: r.nomeRazaoSocial, valorTotal: r.valorTotal, dataVencimento: r.dataVencimento, status: r.status })),
  ].sort((a, b) => new Date(a.dataVencimento!).getTime() - new Date(b.dataVencimento!).getTime()).slice(0, 10);

  return { pagamentos: pagamentosVenc, recebimentos: recebimentosVenc };
}

// ==================== DASHBOARD CONFIG ====================

/**
 * Retorna a configuração do dashboard para um usuário.
 * Se não existir, retorna a configuração padrão.
 */
export async function getDashboardConfig(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(dashboardConfig).where(eq(dashboardConfig.userId, userId)).limit(1);
  if (result.length === 0) return null;
  return result[0];
}

/**
 * Salva (upsert) a configuração do dashboard para um usuário.
 */
export async function saveDashboardConfig(userId: number, widgets: string, tema: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getDashboardConfig(userId);
  if (existing) {
    await db.update(dashboardConfig)
      .set({ widgets, tema })
      .where(eq(dashboardConfig.userId, userId));
  } else {
    await db.insert(dashboardConfig).values({ userId, widgets, tema });
  }
}

/**
 * Retorna totais mensais dos últimos N meses para gráficos históricos.
 */
export async function getDashboardHistoricoMensal(meses: number = 6) {
  const db = await getDb();
  if (!db) return [];

  const dataInicio = new Date();
  dataInicio.setMonth(dataInicio.getMonth() - (meses - 1));
  dataInicio.setDate(1);
  dataInicio.setHours(0, 0, 0, 0);

  // Usa sql.raw para evitar problema de geração de SQL com backtick dentro de funções MySQL
  const [pagMensal, recMensal] = await Promise.all([
    db.select({
      ano: sql<number>`YEAR(dataPagamento)`,
      mes: sql<number>`MONTH(dataPagamento)`,
      total: sql<number>`SUM(valor)`,
      totalPago: sql<number>`SUM(CASE WHEN status = 'Pago' THEN valor ELSE 0 END)`,
    })
      .from(pagamentos)
      .where(gte(pagamentos.dataPagamento, dataInicio))
      .groupBy(sql`YEAR(dataPagamento), MONTH(dataPagamento)`)
      .orderBy(sql`YEAR(dataPagamento), MONTH(dataPagamento)`),
    db.select({
      ano: sql<number>`YEAR(dataVencimento)`,
      mes: sql<number>`MONTH(dataVencimento)`,
      total: sql<number>`SUM(valorTotal)`,
      totalRecebido: sql<number>`SUM(CASE WHEN status = 'Recebido' THEN valorTotal ELSE 0 END)`,
    })
      .from(recebimentos)
      .where(gte(recebimentos.dataVencimento, dataInicio))
      .groupBy(sql`YEAR(dataVencimento), MONTH(dataVencimento)`)
      .orderBy(sql`YEAR(dataVencimento), MONTH(dataVencimento)`),
  ]);

  return { pagMensal, recMensal };
}

/**
 * Retorna totais por centro de custo para gráfico de pizza.
 */
export async function getDashboardPorCentroCusto(dataInicio?: Date, dataFim?: Date) {
  const db = await getDb();
  if (!db) return [];

  const pagWhere = dataInicio && dataFim
    ? and(gte(pagamentos.dataPagamento, dataInicio), lte(pagamentos.dataPagamento, dataFim))
    : undefined;
  const recWhere = dataInicio && dataFim
    ? and(gte(recebimentos.dataVencimento, dataInicio), lte(recebimentos.dataVencimento, dataFim))
    : undefined;

  const [pagCC, recCC] = await Promise.all([
    db.select({
      centroCustoId: pagamentos.centroCustoId,
      nomeCentro: centrosCusto.nome,
      total: sql<number>`SUM(${pagamentos.valor})`,
    })
      .from(pagamentos)
      .leftJoin(centrosCusto, eq(pagamentos.centroCustoId, centrosCusto.id))
      .where(pagWhere)
      .groupBy(pagamentos.centroCustoId, centrosCusto.nome),
    db.select({
      centroCustoId: recebimentos.centroCustoId,
      nomeCentro: centrosCusto.nome,
      total: sql<number>`SUM(${recebimentos.valorTotal})`,
    })
      .from(recebimentos)
      .leftJoin(centrosCusto, eq(recebimentos.centroCustoId, centrosCusto.id))
      .where(recWhere)
      .groupBy(recebimentos.centroCustoId, centrosCusto.nome),
  ]);

  return { pagamentos: pagCC, recebimentos: recCC };
}

// ==================== CLIENTES ====================

export async function listClientes() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(clientes).orderBy(clientes.nome);
}

export async function getClienteById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(clientes).where(eq(clientes.id, id)).limit(1);
  return result[0];
}

export async function createCliente(data: InsertCliente) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(clientes).values(data);
}

export async function updateCliente(id: number, data: Partial<InsertCliente>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(clientes).set(data).where(eq(clientes.id, id));
}

export async function deleteCliente(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(clientes).where(eq(clientes.id, id));
}

// ==================== CENTROS DE CUSTO ====================

export async function listCentrosCusto() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(centrosCusto).orderBy(centrosCusto.nome);
}

export async function createCentroCusto(data: InsertCentroCusto) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(centrosCusto).values(data);
}

export async function updateCentroCusto(id: number, data: Partial<InsertCentroCusto>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(centrosCusto).set(data).where(eq(centrosCusto.id, id));
}

export async function deleteCentroCusto(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(centrosCusto).where(eq(centrosCusto.id, id));
}



// ==================== PARCELAS DE PAGAMENTOS ====================


export async function listPagamentoParcelas(pagamentoId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pagamentoParcelas)
    .where(eq(pagamentoParcelas.pagamentoId, pagamentoId))
    .orderBy(pagamentoParcelas.numeroParcela);
}

export async function createPagamentoParcelas(parcelas: InsertPagamentoParcela[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (parcelas.length === 0) return;
  return db.insert(pagamentoParcelas).values(parcelas);
}

export async function updatePagamentoParcela(id: number, data: Partial<InsertPagamentoParcela>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(pagamentoParcelas).set(data).where(eq(pagamentoParcelas.id, id));
}

export async function deletePagamentoParcelas(pagamentoId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(pagamentoParcelas).where(eq(pagamentoParcelas.pagamentoId, pagamentoId));
}

// ==================== PARCELAS DE RECEBIMENTOS ====================

export async function listRecebimentoParcelas(recebimentoId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(recebimentoParcelas)
    .where(eq(recebimentoParcelas.recebimentoId, recebimentoId))
    .orderBy(recebimentoParcelas.numeroParcela);
}

export async function createRecebimentoParcelas(parcelas: InsertRecebimentoParcela[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (parcelas.length === 0) return;
  return db.insert(recebimentoParcelas).values(parcelas);
}

export async function updateRecebimentoParcela(id: number, data: Partial<InsertRecebimentoParcela>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(recebimentoParcelas).set(data).where(eq(recebimentoParcelas.id, id));
}

export async function deleteRecebimentoParcelas(recebimentoId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(recebimentoParcelas).where(eq(recebimentoParcelas.recebimentoId, recebimentoId));
}

// ─── Convites ─────────────────────────────────────────────────────────────────

export async function listConvites() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(convites).orderBy(convites.createdAt);
}

export async function createConvite(data: { email: string; nome?: string; role: "admin" | "operador" | "user"; token: string; expiresAt: Date; createdBy?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(convites).values({
    email: data.email,
    nome: data.nome,
    role: data.role,
    token: data.token,
    expiresAt: data.expiresAt,
    createdBy: data.createdBy,
    status: "pendente",
  });
}

export async function getConviteByToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(convites).where(eq(convites.token, token)).limit(1);
  return result[0];
}

export async function markConviteAceito(token: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(convites).set({ status: "aceito", usedAt: new Date() }).where(eq(convites.token, token));
}

export async function deleteConvite(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(convites).where(eq(convites.id, id));
}

// ─── Extrato por Cliente ───────────────────────────────────────────────────────
export async function getExtratoCliente(clienteId: number) {
  const db = await getDb();
  if (!db) return { cliente: null, pagamentos: [], recebimentos: [] };

  const clienteResult = await db.select().from(clientes).where(eq(clientes.id, clienteId)).limit(1);
  const cliente = clienteResult[0] ?? null;

  const pags = await db
    .select()
    .from(pagamentos)
    .where(eq(pagamentos.clienteId, clienteId))
    .orderBy(desc(pagamentos.dataPagamento));

  const rebs = await db
    .select()
    .from(recebimentos)
    .where(eq(recebimentos.clienteId, clienteId))
    .orderBy(desc(recebimentos.dataVencimento));

  return { cliente, pagamentos: pags, recebimentos: rebs };
}

// ─── Relatório por Centro de Custo ────────────────────────────────────────────
export async function getRelatorioCentroCusto(params: {
  centroCustoId?: number | null;
  dataInicio?: Date;
  dataFim?: Date;
}) {
  const db = await getDb();
  if (!db) return {
    centroCusto: null,
    todosCentros: [],
    totais: { totalPagamentos: 0, totalRecebimentos: 0, saldo: 0, qtdPagamentos: 0, qtdRecebimentos: 0 },
    pagamentosList: [],
    recebimentosList: [],
    evolucaoMensal: [],
    porTipoServico: [],
    porTipoRecebimento: [],
  };

  const { centroCustoId, dataInicio, dataFim } = params;

  // Buscar todos os centros de custo para o seletor
  const todosCentros = await db.select().from(centrosCusto).orderBy(centrosCusto.nome);

  // Buscar dados do CC selecionado
  let ccInfo = null;
  if (centroCustoId) {
    const ccResult = await db.select().from(centrosCusto).where(eq(centrosCusto.id, centroCustoId)).limit(1);
    ccInfo = ccResult[0] ?? null;
  }

  // Montar filtros para pagamentos
  const pagConditions = [];
  if (centroCustoId) pagConditions.push(eq(pagamentos.centroCustoId, centroCustoId));
  if (dataInicio) pagConditions.push(gte(pagamentos.dataPagamento, dataInicio));
  if (dataFim) pagConditions.push(lte(pagamentos.dataPagamento, dataFim));
  const pagWhere = pagConditions.length > 0 ? and(...pagConditions) : undefined;

  // Montar filtros para recebimentos
  const recConditions = [];
  if (centroCustoId) recConditions.push(eq(recebimentos.centroCustoId, centroCustoId));
  if (dataInicio) recConditions.push(gte(recebimentos.dataVencimento, dataInicio));
  if (dataFim) recConditions.push(lte(recebimentos.dataVencimento, dataFim));
  const recWhere = recConditions.length > 0 ? and(...recConditions) : undefined;

  // Buscar pagamentos detalhados com join de cliente
  const pagamentosList = await db
    .select({
      id: pagamentos.id,
      numeroControle: pagamentos.numeroControle,
      nomeCompleto: pagamentos.nomeCompleto,
      tipoServico: pagamentos.tipoServico,
      valor: pagamentos.valor,
      dataPagamento: pagamentos.dataPagamento,
      status: pagamentos.status,
      descricao: pagamentos.descricao,
      observacao: pagamentos.observacao,
      clienteNome: clientes.nome,
    })
    .from(pagamentos)
    .leftJoin(clientes, eq(pagamentos.clienteId, clientes.id))
    .where(pagWhere)
    .orderBy(desc(pagamentos.dataPagamento));

  // Buscar recebimentos detalhados com join de cliente
  const recebimentosList = await db
    .select({
      id: recebimentos.id,
      numeroControle: recebimentos.numeroControle,
      numeroContrato: recebimentos.numeroContrato,
      nomeRazaoSocial: recebimentos.nomeRazaoSocial,
      tipoRecebimento: recebimentos.tipoRecebimento,
      valorTotal: recebimentos.valorTotal,
      dataVencimento: recebimentos.dataVencimento,
      dataRecebimento: recebimentos.dataRecebimento,
      status: recebimentos.status,
      descricao: recebimentos.descricao,
      observacao: recebimentos.observacao,
      clienteNome: clientes.nome,
    })
    .from(recebimentos)
    .leftJoin(clientes, eq(recebimentos.clienteId, clientes.id))
    .where(recWhere)
    .orderBy(desc(recebimentos.dataVencimento));

  // Calcular totais
  const [pagTotais] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${pagamentos.valor}), 0)`,
      qtd: sql<number>`COUNT(*)`,
    })
    .from(pagamentos)
    .where(pagWhere);

  const [recTotais] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${recebimentos.valorTotal}), 0)`,
      qtd: sql<number>`COUNT(*)`,
    })
    .from(recebimentos)
    .where(recWhere);

  const totalPagamentos = Number(pagTotais?.total ?? 0);
  const totalRecebimentos = Number(recTotais?.total ?? 0);

  // Evolução mensal
  const evolucaoPag = await db
    .select({
      ano: sql<number>`YEAR(${pagamentos.dataPagamento})`,
      mes: sql<number>`MONTH(${pagamentos.dataPagamento})`,
      total: sql<number>`COALESCE(SUM(${pagamentos.valor}), 0)`,
    })
    .from(pagamentos)
    .where(pagWhere)
    .groupBy(sql`YEAR(${pagamentos.dataPagamento})`, sql`MONTH(${pagamentos.dataPagamento})`)
    .orderBy(sql`YEAR(${pagamentos.dataPagamento})`, sql`MONTH(${pagamentos.dataPagamento})`);

  const evolucaoRec = await db
    .select({
      ano: sql<number>`YEAR(${recebimentos.dataVencimento})`,
      mes: sql<number>`MONTH(${recebimentos.dataVencimento})`,
      total: sql<number>`COALESCE(SUM(${recebimentos.valorTotal}), 0)`,
    })
    .from(recebimentos)
    .where(recWhere)
    .groupBy(sql`YEAR(${recebimentos.dataVencimento})`, sql`MONTH(${recebimentos.dataVencimento})`)
    .orderBy(sql`YEAR(${recebimentos.dataVencimento})`, sql`MONTH(${recebimentos.dataVencimento})`);

  const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const mesesMap = new Map<string, { label: string; pagamentos: number; recebimentos: number }>();
  for (const p of evolucaoPag) {
    const key = `${p.ano}-${String(p.mes).padStart(2, "0")}`;
    const label = `${MESES[p.mes - 1]}/${String(p.ano).slice(2)}`;
    const entry = mesesMap.get(key) ?? { label, pagamentos: 0, recebimentos: 0 };
    entry.pagamentos = Number(p.total);
    mesesMap.set(key, entry);
  }
  for (const r of evolucaoRec) {
    const key = `${r.ano}-${String(r.mes).padStart(2, "0")}`;
    const label = `${MESES[r.mes - 1]}/${String(r.ano).slice(2)}`;
    const entry = mesesMap.get(key) ?? { label, pagamentos: 0, recebimentos: 0 };
    entry.recebimentos = Number(r.total);
    mesesMap.set(key, entry);
  }
  const evolucaoMensal = Array.from(mesesMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);

  // Distribuição por tipo de serviço (pagamentos)
  const porTipoServico = await db
    .select({
      tipo: pagamentos.tipoServico,
      total: sql<number>`COALESCE(SUM(${pagamentos.valor}), 0)`,
      qtd: sql<number>`COUNT(*)`,
    })
    .from(pagamentos)
    .where(pagWhere)
    .groupBy(pagamentos.tipoServico)
    .orderBy(sql`SUM(${pagamentos.valor}) DESC`);

  // Distribuição por tipo de recebimento
  const porTipoRecebimento = await db
    .select({
      tipo: recebimentos.tipoRecebimento,
      total: sql<number>`COALESCE(SUM(${recebimentos.valorTotal}), 0)`,
      qtd: sql<number>`COUNT(*)`,
    })
    .from(recebimentos)
    .where(recWhere)
    .groupBy(recebimentos.tipoRecebimento)
    .orderBy(sql`SUM(${recebimentos.valorTotal}) DESC`);

  return {
    centroCusto: ccInfo,
    todosCentros,
    totais: {
      totalPagamentos,
      totalRecebimentos,
      saldo: totalRecebimentos - totalPagamentos,
      qtdPagamentos: Number(pagTotais?.qtd ?? 0),
      qtdRecebimentos: Number(recTotais?.qtd ?? 0),
    },
    pagamentosList,
    recebimentosList,
    evolucaoMensal,
    porTipoServico: porTipoServico.map(p => ({ tipo: p.tipo ?? "Sem tipo", total: Number(p.total), qtd: Number(p.qtd) })),
    porTipoRecebimento: porTipoRecebimento.map(r => ({ tipo: r.tipo ?? "Sem tipo", total: Number(r.total), qtd: Number(r.qtd) })),
  };
}
