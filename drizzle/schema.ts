import { boolean, decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "operador"]).default("operador").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  ativo: boolean("ativo").default(true).notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Tabela de Pagamentos
export const pagamentos = mysqlTable("pagamentos", {
  id: int("id").autoincrement().primaryKey(),
  numeroControle: varchar("numeroControle", { length: 50 }),
  nomeCompleto: varchar("nomeCompleto", { length: 255 }).notNull(),
  cpf: varchar("cpf", { length: 18 }),
  banco: varchar("banco", { length: 100 }),
  chavePix: varchar("chavePix", { length: 255 }),
  tipoPix: mysqlEnum("tipoPix", ["CPF", "CNPJ", "Email", "Telefone", "Chave Aleatória"]).default("CPF"),
  tipoServico: varchar("tipoServico", { length: 100 }),
  centroCusto: varchar("centroCusto", { length: 100 }),
  valor: decimal("valor", { precision: 15, scale: 2 }).notNull(),
  dataPagamento: timestamp("dataPagamento").notNull(),
  status: mysqlEnum("status", ["Pendente", "Processando", "Pago", "Cancelado"]).default("Pendente").notNull(),
  descricao: text("descricao"),
  observacao: text("observacao"),
  autorizadoPor: varchar("autorizadoPor", { length: 255 }),
  parcelado: boolean("parcelado").default(false).notNull(),
  quantidadeParcelas: int("quantidadeParcelas").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdBy: int("createdBy").references(() => users.id),
});

export type Pagamento = typeof pagamentos.$inferSelect;
export type InsertPagamento = typeof pagamentos.$inferInsert;

// Tabela de Recebimentos
export const recebimentos = mysqlTable("recebimentos", {
  id: int("id").autoincrement().primaryKey(),
  numeroControle: varchar("numeroControle", { length: 50 }),
  numeroContrato: varchar("numeroContrato", { length: 100 }),
  nomeRazaoSocial: varchar("nomeRazaoSocial", { length: 255 }).notNull(),
  descricao: text("descricao"),
  tipoRecebimento: mysqlEnum("tipoRecebimento", ["Pix", "Boleto", "Transferência", "Cartão de Crédito", "Cartão de Débito", "Dinheiro", "Outro"]).default("Pix").notNull(),
  valorTotal: decimal("valorTotal", { precision: 15, scale: 2 }).notNull(),
  valorEquipamento: decimal("valorEquipamento", { precision: 15, scale: 2 }).default("0"),
  valorServico: decimal("valorServico", { precision: 15, scale: 2 }).default("0"),
  juros: decimal("juros", { precision: 15, scale: 2 }).default("0"),
  desconto: decimal("desconto", { precision: 15, scale: 2 }).default("0"),
  quantidadeParcelas: int("quantidadeParcelas").default(1).notNull(),
  parcelaAtual: int("parcelaAtual").default(1),
  dataVencimento: timestamp("dataVencimento").notNull(),
  dataRecebimento: timestamp("dataRecebimento"),
  status: mysqlEnum("status", ["Pendente", "Recebido", "Atrasado", "Cancelado"]).default("Pendente").notNull(),
  observacao: text("observacao"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdBy: int("createdBy").references(() => users.id),
});

export type Recebimento = typeof recebimentos.$inferSelect;
export type InsertRecebimento = typeof recebimentos.$inferInsert;

// Tabela de Configurações da Empresa
export const empresaConfig = mysqlTable("empresa_config", {
  id: int("id").autoincrement().primaryKey(),
  nomeEmpresa: varchar("nomeEmpresa", { length: 255 }).notNull().default("Minha Empresa"),
  cnpj: varchar("cnpj", { length: 20 }),
  telefone: varchar("telefone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  endereco: text("endereco"),
  logoUrl: text("logoUrl"),
  corPrimaria: varchar("corPrimaria", { length: 7 }).default("#2563eb"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmpresaConfig = typeof empresaConfig.$inferSelect;
export type InsertEmpresaConfig = typeof empresaConfig.$inferInsert;

// Tabela de Parcelas de Pagamentos
export const pagamentoParcelas = mysqlTable("pagamento_parcelas", {
  id: int("id").autoincrement().primaryKey(),
  pagamentoId: int("pagamentoId").notNull().references(() => pagamentos.id),
  numeroParcela: int("numeroParcela").notNull(),
  valor: decimal("valor", { precision: 15, scale: 2 }).notNull(),
  dataVencimento: timestamp("dataVencimento").notNull(),
  dataPagamento: timestamp("dataPagamento"),
  status: mysqlEnum("status", ["Pendente", "Pago", "Atrasado", "Cancelado"]).default("Pendente").notNull(),
  observacao: text("observacao"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PagamentoParcela = typeof pagamentoParcelas.$inferSelect;
export type InsertPagamentoParcela = typeof pagamentoParcelas.$inferInsert;

// Tabela de Parcelas de Recebimentos
export const recebimentoParcelas = mysqlTable("recebimento_parcelas", {
  id: int("id").autoincrement().primaryKey(),
  recebimentoId: int("recebimentoId").notNull().references(() => recebimentos.id),
  numeroParcela: int("numeroParcela").notNull(),
  valor: decimal("valor", { precision: 15, scale: 2 }).notNull(),
  dataVencimento: timestamp("dataVencimento").notNull(),
  dataRecebimento: timestamp("dataRecebimento"),
  status: mysqlEnum("status", ["Pendente", "Recebido", "Atrasado", "Cancelado"]).default("Pendente").notNull(),
  observacao: text("observacao"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RecebimentoParcela = typeof recebimentoParcelas.$inferSelect;
export type InsertRecebimentoParcela = typeof recebimentoParcelas.$inferInsert;

// Tabela de Convites de Usuários
export const convites = mysqlTable("convites", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  nome: varchar("nome", { length: 255 }),
  role: mysqlEnum("role", ["admin", "operador", "user"]).default("operador").notNull(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  status: mysqlEnum("status", ["pendente", "aceito", "expirado"]).default("pendente").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdBy: int("createdBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  usedAt: timestamp("usedAt"),
});

export type Convite = typeof convites.$inferSelect;
export type InsertConvite = typeof convites.$inferInsert;
