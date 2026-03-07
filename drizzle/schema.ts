import { boolean, date, decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

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

// ─── Centros de Custo ────────────────────────────────────────────────────────
export const centrosCusto = mysqlTable("centros_custo", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 150 }).notNull(),
  descricao: text("descricao"),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdBy: int("createdBy").references(() => users.id),
});

export type CentroCusto = typeof centrosCusto.$inferSelect;
export type InsertCentroCusto = typeof centrosCusto.$inferInsert;

// ─── Clientes / Parceiros ────────────────────────────────────────────────────
export const clientes = mysqlTable("clientes", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  tipo: mysqlEnum("tipo", [
    "Cliente",
    "Prestador de Serviço",
    "Fornecedor",
    "Hotel",
    "Parceiro",
    "Outro",
  ]).default("Cliente").notNull(),
  cpfCnpj: varchar("cpfCnpj", { length: 20 }),
  email: varchar("email", { length: 320 }),
  telefone: varchar("telefone", { length: 30 }),
  endereco: text("endereco"),
  cidade: varchar("cidade", { length: 100 }),
  estado: varchar("estado", { length: 2 }),
  observacao: text("observacao"),
  // Dados de Pix para preenchimento automático em Pagamentos
  tipoPix: mysqlEnum("tipoPix", ["CPF", "CNPJ", "Email", "Telefone", "Chave Aleatória"]),
  chavePix: varchar("chavePix", { length: 255 }),
  banco: varchar("banco", { length: 100 }),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdBy: int("createdBy").references(() => users.id),
});

export type Cliente = typeof clientes.$inferSelect;
export type InsertCliente = typeof clientes.$inferInsert;

// ─── Pagamentos ──────────────────────────────────────────────────────────────
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
  // Vínculos com novas tabelas (opcionais para manter compatibilidade com registros antigos)
  clienteId: int("clienteId").references(() => clientes.id),
  centroCustoId: int("centroCustoId").references(() => centrosCusto.id),
  valor: decimal("valor", { precision: 15, scale: 2 }).notNull(),
  valorEquipamento: decimal("valorEquipamento", { precision: 15, scale: 2 }).default("0"),
  valorServico: decimal("valorServico", { precision: 15, scale: 2 }).default("0"),
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

// ─── Recebimentos ────────────────────────────────────────────────────────────
export const recebimentos = mysqlTable("recebimentos", {
  id: int("id").autoincrement().primaryKey(),
  numeroControle: varchar("numeroControle", { length: 50 }),
  numeroContrato: varchar("numeroContrato", { length: 100 }),
  nomeRazaoSocial: varchar("nomeRazaoSocial", { length: 255 }).notNull(),
  descricao: text("descricao"),
  tipoRecebimento: mysqlEnum("tipoRecebimento", ["Pix", "Boleto", "Transferência", "Cartão de Crédito", "Cartão de Débito", "Dinheiro", "Outro"]).default("Pix").notNull(),
  // Vínculos com novas tabelas (opcionais para manter compatibilidade com registros antigos)
  clienteId: int("clienteId").references(() => clientes.id),
  centroCustoId: int("centroCustoId").references(() => centrosCusto.id),
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

// ─── Configurações da Empresa ────────────────────────────────────────────────
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

// ─── Parcelas de Pagamentos ──────────────────────────────────────────────────
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

// ─── Parcelas de Recebimentos ────────────────────────────────────────────────
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

// ─── Convites de Usuários ────────────────────────────────────────────────────
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

// ─── Configurações do Dashboard ────────────────────────────────────────────────
// Armazena a configuração de widgets do dashboard por usuário (admin)
export const dashboardConfig = mysqlTable("dashboard_config", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  // JSON com array de widgets: [{id, tipo, visivel, ordem, tamanho}]
  // TiDB não suporta default em colunas TEXT; o default será tratado no backend
  widgets: text("widgets").notNull(),
  // Tema de cor selecionado
  tema: varchar("tema", { length: 50 }).default("azul"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DashboardConfig = typeof dashboardConfig.$inferSelect;
export type InsertDashboardConfig = typeof dashboardConfig.$inferInsert;


// ─── Módulo de Engenharia ─────────────────────────────────────────────────────

// Tipos de Serviço
export const tiposServico = mysqlTable("tipos_servico", {
  id: int("id").autoincrement().primaryKey(),
  codigo: varchar("codigo", { length: 30 }).notNull().unique(),
  nome: varchar("nome", { length: 200 }).notNull(),
  descricao: text("descricao"),
  unidade: varchar("unidade", { length: 30 }), // ex: hora, m², un
  valorUnitario: decimal("valorUnitario", { precision: 15, scale: 2 }),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdBy: int("createdBy").references(() => users.id),
});
export type TipoServico = typeof tiposServico.$inferSelect;
export type InsertTipoServico = typeof tiposServico.$inferInsert;

// Materiais
export const materiais = mysqlTable("materiais", {
  id: int("id").autoincrement().primaryKey(),
  codigo: varchar("codigo", { length: 30 }).notNull().unique(),
  nome: varchar("nome", { length: 200 }).notNull(),
  descricao: text("descricao"),
  unidade: varchar("unidade", { length: 30 }), // ex: kg, m, un, caixa
  valorUnitario: decimal("valorUnitario", { precision: 15, scale: 2 }),
  estoque: decimal("estoque", { precision: 15, scale: 3 }).default("0"),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdBy: int("createdBy").references(() => users.id),
});
export type Material = typeof materiais.$inferSelect;
export type InsertMaterial = typeof materiais.$inferInsert;

// Contratos
export const contratos = mysqlTable("contratos", {
  id: int("id").autoincrement().primaryKey(),
  numero: varchar("numero", { length: 50 }).notNull().unique(),
  objeto: text("objeto").notNull(),
  tipo: mysqlEnum("tipo", ["prestacao_servico", "fornecimento", "locacao", "misto"]).default("prestacao_servico").notNull(),
  status: mysqlEnum("status", ["negociacao", "ativo", "suspenso", "encerrado", "cancelado"]).default("negociacao").notNull(),
  clienteId: int("clienteId").references(() => clientes.id),
  valorTotal: decimal("valorTotal", { precision: 15, scale: 2 }).notNull(),
  dataInicio: date("dataInicio"),
  dataFim: date("dataFim"),
  descricao: text("descricao"),
  observacoes: text("observacoes"),
  // Endereço do local de execução do contrato
  enderecoLogradouro: varchar("enderecoLogradouro", { length: 255 }),
  enderecoNumero: varchar("enderecoNumero", { length: 20 }),
  enderecoComplemento: varchar("enderecoComplemento", { length: 100 }),
  enderecoBairro: varchar("enderecoBairro", { length: 100 }),
  enderecoCidade: varchar("enderecoCidade", { length: 100 }),
  enderecoEstado: varchar("enderecoEstado", { length: 2 }),
  enderecoCep: varchar("enderecoCep", { length: 10 }),
  // Vinculação financeira
  recebimentoId: int("recebimentoId").references(() => recebimentos.id),
  pagamentoId: int("pagamentoId").references(() => pagamentos.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdBy: int("createdBy").references(() => users.id),
});
export type Contrato = typeof contratos.$inferSelect;
export type InsertContrato = typeof contratos.$inferInsert;

// Ordens de Serviço
export const ordensServico = mysqlTable("ordens_servico", {
  id: int("id").autoincrement().primaryKey(),
  numero: varchar("numero", { length: 50 }).notNull().unique(),
  contratoId: int("contratoId").references(() => contratos.id),
  clienteId: int("clienteId").references(() => clientes.id),
  titulo: varchar("titulo", { length: 200 }).notNull(),
  descricao: text("descricao"),
  status: mysqlEnum("status", ["aberta", "em_execucao", "concluida", "cancelada", "pausada"]).default("aberta").notNull(),
  prioridade: mysqlEnum("prioridade", ["baixa", "media", "alta", "urgente"]).default("media").notNull(),
  responsavel: varchar("responsavel", { length: 150 }),
  dataAbertura: date("dataAbertura"),
  dataPrevisao: date("dataPrevisao"),
  dataConclusao: date("dataConclusao"),
  valorEstimado: decimal("valorEstimado", { precision: 15, scale: 2 }),
  valorRealizado: decimal("valorRealizado", { precision: 15, scale: 2 }),
  observacoes: text("observacoes"),
  // Endereço do local de execução da OS
  enderecoLogradouro: varchar("enderecoLogradouro", { length: 255 }),
  enderecoNumero: varchar("enderecoNumero", { length: 20 }),
  enderecoComplemento: varchar("enderecoComplemento", { length: 100 }),
  enderecoBairro: varchar("enderecoBairro", { length: 100 }),
  enderecoCidade: varchar("enderecoCidade", { length: 100 }),
  enderecoEstado: varchar("enderecoEstado", { length: 2 }),
  enderecoCep: varchar("enderecoCep", { length: 10 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdBy: int("createdBy").references(() => users.id),
});
export type OrdemServico = typeof ordensServico.$inferSelect;
export type InsertOrdemServico = typeof ordensServico.$inferInsert;

// Itens da Ordem de Serviço (serviços e materiais)
export const osItens = mysqlTable("os_itens", {
  id: int("id").autoincrement().primaryKey(),
  osId: int("osId").notNull().references(() => ordensServico.id, { onDelete: "cascade" }),
  tipo: mysqlEnum("tipo", ["servico", "material"]).notNull(),
  tipoServicoId: int("tipoServicoId").references(() => tiposServico.id),
  materialId: int("materialId").references(() => materiais.id),
  descricao: varchar("descricao", { length: 300 }),
  quantidade: decimal("quantidade", { precision: 15, scale: 3 }).notNull(),
  valorUnitario: decimal("valorUnitario", { precision: 15, scale: 2 }).notNull(),
  valorTotal: decimal("valorTotal", { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type OsItem = typeof osItens.$inferSelect;
export type InsertOsItem = typeof osItens.$inferInsert;
