import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { Convite, convites, EmpresaConfig, empresaConfig, InsertEmpresaConfig, InsertPagamento, InsertRecebimento, InsertUser, pagamentos, recebimentos, users } from "../drizzle/schema";
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
  return db.select().from(pagamentos)
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
  return db.select().from(recebimentos)
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

export async function getDashboardStats() {
  const db = await getDb();
  if (!db) return null;
  const [pagStats, recStats] = await Promise.all([
    db.select({
      totalPago: sql<number>`SUM(CASE WHEN ${pagamentos.status} = 'Pago' THEN ${pagamentos.valor} ELSE 0 END)`,
      totalPendente: sql<number>`SUM(CASE WHEN ${pagamentos.status} = 'Pendente' THEN ${pagamentos.valor} ELSE 0 END)`,
      totalGeral: sql<number>`SUM(${pagamentos.valor})`,
      count: sql<number>`COUNT(*)`,
    }).from(pagamentos),
    db.select({
      totalRecebido: sql<number>`SUM(CASE WHEN ${recebimentos.status} = 'Recebido' THEN ${recebimentos.valorTotal} ELSE 0 END)`,
      totalPendente: sql<number>`SUM(CASE WHEN ${recebimentos.status} = 'Pendente' THEN ${recebimentos.valorTotal} ELSE 0 END)`,
      totalAtrasado: sql<number>`SUM(CASE WHEN ${recebimentos.status} = 'Atrasado' THEN ${recebimentos.valorTotal} ELSE 0 END)`,
      totalGeral: sql<number>`SUM(${recebimentos.valorTotal})`,
      totalEquipamento: sql<number>`SUM(${recebimentos.valorEquipamento})`,
      totalServico: sql<number>`SUM(${recebimentos.valorServico})`,
      count: sql<number>`COUNT(*)`,
    }).from(recebimentos),
  ]);
  return { pagamentos: pagStats[0], recebimentos: recStats[0] };
}



// ==================== PARCELAS DE PAGAMENTOS ====================

import { InsertPagamentoParcela, InsertRecebimentoParcela, pagamentoParcelas, recebimentoParcelas } from "../drizzle/schema";

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
