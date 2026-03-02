import { decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Tabela de Pagamentos
export const pagamentos = mysqlTable("pagamentos", {
  id: int("id").autoincrement().primaryKey(),
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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdBy: int("createdBy").references(() => users.id),
});

export type Pagamento = typeof pagamentos.$inferSelect;
export type InsertPagamento = typeof pagamentos.$inferInsert;

// Tabela de Recebimentos
export const recebimentos = mysqlTable("recebimentos", {
  id: int("id").autoincrement().primaryKey(),
  numeroContrato: varchar("numeroContrato", { length: 100 }),
  nomeRazaoSocial: varchar("nomeRazaoSocial", { length: 255 }).notNull(),
  descricao: text("descricao"),
  tipoRecebimento: mysqlEnum("tipoRecebimento", ["Pix", "Boleto", "Transferência", "Cartão", "Dinheiro", "Outro"]).default("Pix").notNull(),
  valorTotal: decimal("valorTotal", { precision: 15, scale: 2 }).notNull(),
  valorEquipamento: decimal("valorEquipamento", { precision: 15, scale: 2 }).default("0"),
  valorServico: decimal("valorServico", { precision: 15, scale: 2 }).default("0"),
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
