import { boolean, date, decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "operador", "operacional"]).default("operador").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  ativo: boolean("ativo").default(true).notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Projetos ────────────────────────────────────────────────────────────────
export const projetos = mysqlTable("projetos", {
  id: int("id").autoincrement().primaryKey(),
  numero: varchar("numero", { length: 50 }).notNull().unique(),
  nome: varchar("nome", { length: 255 }).notNull(),
  clienteId: int("clienteId").references(() => clientes.id),
  // Contrato principal vinculado ao projeto (opcional)
  contratoPrincipalId: int("contratoPrincipalId"),
  tipoProjeto: mysqlEnum("tipoProjeto", [
    "INSTALACAO",
    "MANUTENCAO",
    "SERVICO_PONTUAL",
    "OBRA",
    "RECORRENTE",
    "CONSULTORIA",
    "PARCERIA",
    "OUTROS",
  ]).default("SERVICO_PONTUAL").notNull(),
  statusOperacional: mysqlEnum("statusOperacional", [
    "PLANEJAMENTO",
    "AGUARDANDO_CONTRATO",
    "AGUARDANDO_MOBILIZACAO",
    "EM_EXECUCAO",
    "PAUSADO",
    "CONCLUIDO_TECNICAMENTE",
    "ENCERRADO_FINANCEIRAMENTE",
    "CANCELADO",
  ]).default("PLANEJAMENTO").notNull(),
  responsavelUserId: int("responsavelUserId").references(() => users.id),
  dataInicioPrevista: date("dataInicioPrevista"),
  dataFimPrevista: date("dataFimPrevista"),
  dataInicioReal: date("dataInicioReal"),
  dataFimReal: date("dataFimReal"),
  // Centro de custo principal do projeto
  centroCustoId: int("centroCustoId"),
  valorContratado: decimal("valorContratado", { precision: 15, scale: 2 }).default("0"),
  localExecucao: varchar("localExecucao", { length: 255 }),
  descricao: text("descricao"),
  observacoes: text("observacoes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdBy: int("createdBy").references(() => users.id),
});
export type Projeto = typeof projetos.$inferSelect;
export type InsertProjeto = typeof projetos.$inferInsert;

// ─── Centros de Custo ────────────────────────────────────────────────────────
export const centrosCusto = mysqlTable("centros_custo", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 150 }).notNull(),
  descricao: text("descricao"),
  // Vínculo com contrato (criado automaticamente ao ativar contrato)
  contratoId: int("contratoId"),
  tipo: mysqlEnum("tipo", ["operacional", "administrativo", "contrato", "projeto", "investimento", "outro"]).default("operacional").notNull(),
  // Classificação estratégica do centro de custo
  classificacao: mysqlEnum("classificacao", ["ESTRATEGICO", "OPERACIONAL", "PROJETO", "ADMINISTRATIVO", "INVESTIMENTO"]).default("OPERACIONAL"),
  // Vínculo direto com projeto (quando classificacao = PROJETO)
  projetoId: int("projetoId"),
  // Responsável pelo centro de custo
  responsavel: varchar("responsavel", { length: 150 }),
  // Observações livres
  observacoes: text("observacoes"),
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
  // Classificação PF/PJ
  tipoPessoa: mysqlEnum("tipoPessoa", ["PF", "PJ"]).default("PJ").notNull(),
  // Segmento de atuação
  segmento: varchar("segmento", { length: 100 }),
  cpfCnpj: varchar("cpfCnpj", { length: 20 }),
  inscricaoEstadual: varchar("inscricaoEstadual", { length: 30 }),
  inscricaoMunicipal: varchar("inscricaoMunicipal", { length: 30 }),
  email: varchar("email", { length: 320 }),
  emailNfe: varchar("emailNfe", { length: 320 }),
  telefone: varchar("telefone", { length: 30 }),
  celular: varchar("celular", { length: 30 }),
  nomeContato: varchar("nomeContato", { length: 150 }),
  // Endereço estruturado
  cep: varchar("cep", { length: 10 }),
  logradouro: varchar("logradouro", { length: 255 }),
  numero: varchar("numero", { length: 20 }),
  complemento: varchar("complemento", { length: 100 }),
  bairro: varchar("bairro", { length: 100 }),
  endereco: text("endereco"),
  cidade: varchar("cidade", { length: 100 }),
  estado: varchar("estado", { length: 2 }),
  observacao: text("observacao"),
  // Dados bancários
  tipoPix: mysqlEnum("tipoPix", ["CPF", "CNPJ", "Email", "Telefone", "Chave Aleatória"]),
  chavePix: varchar("chavePix", { length: 255 }),
  banco: varchar("banco", { length: 100 }),
  agencia: varchar("agencia", { length: 20 }),
  conta: varchar("conta", { length: 30 }),
  tipoConta: mysqlEnum("tipoConta", ["corrente", "poupanca", "pagamento"]),
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
  contratoId: int("contratoId").references(() => contratos.id),
  // Vínculo com projeto (opcional, compatibilidade retroativa)
  projetoId: int("projetoId").references(() => projetos.id),
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
  contratoId: int("contratoId").references(() => contratos.id),
  // Vínculo com projeto (opcional, compatibilidade retroativa)
  projetoId: int("projetoId").references(() => projetos.id),
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
  perfilAcesso: varchar("perfilAcesso", { length: 50 }), // perfil pre-definido: administrativo, financeiro, engenharia, operacional
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
  // Mantém valorUnitario para compatibilidade com OS existentes
  valorUnitario: decimal("valorUnitario", { precision: 15, scale: 2 }),
  // Preço de Custo: valor pago na aquisição do material
  precoCusto: decimal("precoCusto", { precision: 15, scale: 2 }),
  // Preço de Venda: valor cobrado ao cliente
  precoVenda: decimal("precoVenda", { precision: 15, scale: 2 }),
  estoque: decimal("estoque", { precision: 15, scale: 3 }).default("0"),
  // Finalidade do material: uso interno ou fornecimento ao cliente
  finalidade: mysqlEnum("finalidade", ["uso", "fornecimento", "ambos"]).default("ambos").notNull(),
  // Data de inserção do material no catálogo
  dataInsercao: date("dataInsercao"),
  ativo: boolean("ativo").default(true).notNull(),
  // Vínculo com projeto (opcional, compatibilidade retroativa)
  projetoId: int("projetoId").references(() => projetos.id),
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
  // Status alinhado com fluxo ERP: proposta → negociacao → ativo → suspenso → encerrado
  status: mysqlEnum("status", ["proposta", "em_negociacao", "ativo", "suspenso", "encerrado"]).default("proposta").notNull(),
  clienteId: int("clienteId").references(() => clientes.id),
  // Centro de Custo criado automaticamente ao ativar o contrato
  centroCustoId: int("centroCustoId"),
  // Vínculo com projeto (opcional, compatibilidade retroativa)
  projetoId: int("projetoId").references(() => projetos.id),
  valorTotal: decimal("valorTotal", { precision: 15, scale: 2 }).notNull(),
  valorPrevisto: decimal("valorPrevisto", { precision: 15, scale: 2 }),
  margemPrevista: decimal("margemPrevista", { precision: 5, scale: 2 }),
  responsavelTecnico: varchar("responsavelTecnico", { length: 150 }),
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
  // Status alinhado com fluxo ERP: planejada → autorizada → em_execucao → concluida
  // Status expandido conforme requisito: PLANEJADA, AGENDADA, EM_DESLOCAMENTO, EM_EXECUCAO, PAUSADA, CONCLUIDA, AGUARDANDO_VALIDACAO, CANCELADA
  status: mysqlEnum("status", ["planejada", "agendada", "em_deslocamento", "autorizada", "em_execucao", "pausada", "concluida", "aguardando_validacao", "cancelada"]).default("planejada").notNull(),
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
  // Centro de Custo vinculado (herdado do contrato ou definido manualmente)
  centroCustoId: int("centroCustoId").references(() => centrosCusto.id),
  // Vínculo com projeto (obrigatório conforme requisito, mas opcional para compatibilidade retroativa)
  projetoId: int("projetoId").references(() => projetos.id),
  // Equipe responsável pela OS (JSON array de nomes/IDs)
  equipe: text("equipe"),
  // Datas reais de início e fim da OS
  dataInicioReal: date("dataInicioReal"),
  dataFimReal: date("dataFimReal"),
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

// ─── Permissões Granulares por Usuário ─────────────────────────────────────────
// Cada linha representa as permissões de um usuário em um módulo específico.
// Módulos: pagamentos, recebimentos, clientes, centros_custo, engenharia_os,
//           engenharia_contratos, engenharia_materiais, relatorios, dashboard
export const userPermissions = mysqlTable("user_permissions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  modulo: varchar("modulo", { length: 60 }).notNull(),
  podeVer: boolean("podeVer").default(false).notNull(),
  podeCriar: boolean("podeCriar").default(false).notNull(),
  podeEditar: boolean("podeEditar").default(false).notNull(),
  podeExcluir: boolean("podeExcluir").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type UserPermission = typeof userPermissions.$inferSelect;
export type InsertUserPermission = typeof userPermissions.$inferInsert;

// Módulos disponíveis no sistema
// Módulo projetos adicionado ao sistema de permissões
export const MODULOS = [
  { id: "dashboard", label: "Dashboard", grupo: "Geral" },
  { id: "pagamentos", label: "Compras e Pagamentos", grupo: "Financeiro" },
  { id: "recebimentos", label: "Recebimentos", grupo: "Financeiro" },
  { id: "clientes", label: "Clientes / Fornecedores", grupo: "Cadastros" },
  { id: "centros_custo", label: "Centros de Custo", grupo: "Financeiro" },
  { id: "relatorios", label: "Relatórios", grupo: "Financeiro" },
  { id: "engenharia_contratos", label: "Contratos", grupo: "Engenharia" },
  { id: "engenharia_os", label: "Ordens de Serviço", grupo: "Engenharia" },
  { id: "engenharia_materiais", label: "Materiais e Tipos de Serviço", grupo: "Engenharia" },
  { id: "extrato_cliente", label: "Extrato por Cliente", grupo: "Financeiro" },
  { id: "projetos", label: "Projetos", grupo: "Engenharia" },
] as const;
export type ModuloId = typeof MODULOS[number]["id"];

// Perfis pré-definidos de acesso
export const PERFIS_ACESSO: Record<string, { label: string; descricao: string; permissoes: Record<string, { podeVer: boolean; podeCriar: boolean; podeEditar: boolean; podeExcluir: boolean }> }> = {
  administrativo: {
    label: "Administrativo",
    descricao: "Acesso completo a todos os módulos financeiros e administrativos (sem exclusão — apenas admin pode excluir)",
    permissoes: Object.fromEntries(MODULOS.map(m => [m.id, { podeVer: true, podeCriar: true, podeEditar: true, podeExcluir: false }])),
  },

  financeiro: {
    label: "Financeiro",
    descricao: "Acesso a pagamentos, recebimentos, relatórios e centros de custo. Sem acesso a engenharia.",
    permissoes: {
      dashboard: { podeVer: true, podeCriar: false, podeEditar: false, podeExcluir: false },
      pagamentos: { podeVer: true, podeCriar: true, podeEditar: true, podeExcluir: false },
      recebimentos: { podeVer: true, podeCriar: true, podeEditar: true, podeExcluir: false },
      clientes: { podeVer: true, podeCriar: true, podeEditar: true, podeExcluir: false },
      centros_custo: { podeVer: true, podeCriar: true, podeEditar: true, podeExcluir: false },
      relatorios: { podeVer: true, podeCriar: false, podeEditar: false, podeExcluir: false },
      engenharia_contratos: { podeVer: false, podeCriar: false, podeEditar: false, podeExcluir: false },
      engenharia_os: { podeVer: false, podeCriar: false, podeEditar: false, podeExcluir: false },
      engenharia_materiais: { podeVer: false, podeCriar: false, podeEditar: false, podeExcluir: false },
      extrato_cliente: { podeVer: true, podeCriar: false, podeEditar: false, podeExcluir: false },
      projetos: { podeVer: false, podeCriar: false, podeEditar: false, podeExcluir: false },
    },
  },
  engenharia: {
    label: "Engenharia",
    descricao: "Acesso a contratos, ordens de serviço e materiais. Sem acesso a financeiro.",
    permissoes: {
      dashboard: { podeVer: true, podeCriar: false, podeEditar: false, podeExcluir: false },
      pagamentos: { podeVer: false, podeCriar: false, podeEditar: false, podeExcluir: false },
      recebimentos: { podeVer: false, podeCriar: false, podeEditar: false, podeExcluir: false },
      clientes: { podeVer: true, podeCriar: false, podeEditar: false, podeExcluir: false },
      centros_custo: { podeVer: false, podeCriar: false, podeEditar: false, podeExcluir: false },
      relatorios: { podeVer: false, podeCriar: false, podeEditar: false, podeExcluir: false },
      engenharia_contratos: { podeVer: true, podeCriar: true, podeEditar: true, podeExcluir: false },
      engenharia_os: { podeVer: true, podeCriar: true, podeEditar: true, podeExcluir: false },
      engenharia_materiais: { podeVer: true, podeCriar: true, podeEditar: true, podeExcluir: false },
      extrato_cliente: { podeVer: false, podeCriar: false, podeEditar: false, podeExcluir: false },
      projetos: { podeVer: true, podeCriar: true, podeEditar: true, podeExcluir: false },
    },
  },
  operacional: {
    label: "Operacional",
    descricao: "Acesso somente a ordens de serviço e clientes. Sem acesso financeiro.",
    permissoes: {
      dashboard: { podeVer: true, podeCriar: false, podeEditar: false, podeExcluir: false },
      pagamentos: { podeVer: false, podeCriar: false, podeEditar: false, podeExcluir: false },
      recebimentos: { podeVer: false, podeCriar: false, podeEditar: false, podeExcluir: false },
      clientes: { podeVer: true, podeCriar: true, podeEditar: true, podeExcluir: false },
      centros_custo: { podeVer: false, podeCriar: false, podeEditar: false, podeExcluir: false },
      relatorios: { podeVer: false, podeCriar: false, podeEditar: false, podeExcluir: false },
      engenharia_contratos: { podeVer: true, podeCriar: false, podeEditar: false, podeExcluir: false },
      engenharia_os: { podeVer: true, podeCriar: true, podeEditar: true, podeExcluir: false },
      engenharia_materiais: { podeVer: true, podeCriar: false, podeEditar: false, podeExcluir: false },
      extrato_cliente: { podeVer: false, podeCriar: false, podeEditar: false, podeExcluir: false },
      projetos: { podeVer: true, podeCriar: true, podeEditar: true, podeExcluir: false },
    },
  },
  somente_leitura: {
    label: "Somente Leitura",
    descricao: "Pode visualizar tudo, mas não pode criar, editar ou excluir.",
    permissoes: Object.fromEntries(MODULOS.map(m => [m.id, { podeVer: true, podeCriar: false, podeEditar: false, podeExcluir: false }])),
  },
  sem_acesso: {
    label: "Sem Acesso",
    descricao: "Nenhum acesso ao sistema (usuário bloqueado).",
    permissoes: Object.fromEntries(MODULOS.map(m => [m.id, { podeVer: false, podeCriar: false, podeEditar: false, podeExcluir: false }])),
  },
};

// Permissões padrão por role (compatível com sistema legado)
export const DEFAULT_PERMISSIONS: Record<string, Record<string, { podeVer: boolean; podeCriar: boolean; podeEditar: boolean; podeExcluir: boolean }>> = {
  admin: Object.fromEntries(MODULOS.map(m => [m.id, { podeVer: true, podeCriar: true, podeEditar: true, podeExcluir: true }])),
  operador: PERFIS_ACESSO.administrativo.permissoes,
  operacional: PERFIS_ACESSO.operacional.permissoes,
  user: Object.fromEntries(MODULOS.map(m => [m.id, { podeVer: false, podeCriar: false, podeEditar: false, podeExcluir: false }])),
};

// ─── Anexos ────────────────────────────────────────────────────────────────────
// Tabela genérica de anexos vinculada a qualquer módulo/registro do sistema.
// modulo: "pagamento" | "recebimento" | "contrato" | "os" | "cliente"
// registroId: ID do registro no módulo correspondente
export const anexos = mysqlTable("anexos", {
  id: int("id").autoincrement().primaryKey(),
  modulo: varchar("modulo", { length: 50 }).notNull(),
  registroId: int("registroId").notNull(),
  nomeOriginal: varchar("nomeOriginal", { length: 255 }).notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  url: text("url").notNull(),
  mimeType: varchar("mimeType", { length: 100 }),
  tamanho: int("tamanho"), // bytes
  descricao: varchar("descricao", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy").references(() => users.id),
});

export type Anexo = typeof anexos.$inferSelect;
export type InsertAnexo = typeof anexos.$inferInsert;
