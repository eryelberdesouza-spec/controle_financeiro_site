# Controle Financeiro - TODO

## Infraestrutura
- [x] Inicializar projeto web
- [x] Criar site de instruções com 7 seções
- [x] Upgrade para web-db-user (backend + banco de dados)

## Banco de Dados
- [x] Criar schema de pagamentos no banco
- [x] Criar schema de recebimentos no banco
- [x] Executar migração do banco (pnpm db:push)

## Backend (tRPC)
- [x] Criar helpers de DB para pagamentos
- [x] Criar helpers de DB para recebimentos
- [x] Criar procedures tRPC para CRUD de pagamentos
- [x] Criar procedures tRPC para CRUD de recebimentos
- [x] Criar procedures para relatórios e dashboard

## Frontend
- [x] Redesenhar Home.tsx com DashboardLayout
- [x] Criar página de cadastro de pagamentos (formulário)
- [x] Criar página de listagem de pagamentos
- [x] Criar página de cadastro de recebimentos (formulário)
- [x] Criar página de listagem de recebimentos
- [x] Criar dashboard com dados em tempo real
- [x] Criar página de relatórios analíticos

## Testes
- [x] Escrever testes para procedures de pagamentos
- [x] Escrever testes para procedures de recebimentos

## Melhorias v2
- [x] Adicionar campo numeroControle em pagamentos (schema + migration)
- [x] Adicionar campo numeroControle em recebimentos (schema + migration)
- [x] Adicionar campo juros e desconto em recebimentos (schema + migration)
- [x] Adicionar campo role "operador" ao sistema de usuários
- [x] Incluir banco Sicoob nas opções de bancos
- [x] Incluir tipos de pagamento: Boleto, Pix, Cartão de Crédito, Cartão de Débito em recebimentos
- [x] Atualizar formulário de pagamentos com campo numeroControle e banco Sicoob
- [x] Atualizar formulário de recebimentos com campos numeroControle, juros, desconto
- [x] Implementar exportação CSV para pagamentos
- [x] Implementar exportação CSV para recebimentos
- [x] Criar página de relatórios com impressão (print-friendly)
- [x] Criar página de gestão de usuários (admin)
- [x] Implementar controle de acesso: admin vs operador vs user
- [x] Atualizar testes para novos campos e rotas (14 testes passando)

## Configurações da Empresa (v3)
- [ ] Criar tabela empresa_config no banco (nome, logo_url, cnpj, telefone, endereco)
- [ ] Criar helpers de DB para empresa_config
- [ ] Criar procedures tRPC para ler e salvar configurações da empresa
- [ ] Criar página de Configurações com upload de logo e nome da empresa
- [ ] Exibir logo e nome no cabeçalho do sidebar
- [ ] Exibir logo e nome nos relatórios e impressão
- [ ] Adicionar item "Configurações" ao menu (somente admin)
- [ ] Testar procedures de configurações

## Configurações e Relatórios Avançados (v4)
- [ ] Finalizar helpers de DB para empresa_config (getEmpresaConfig, upsertEmpresaConfig)
- [ ] Criar procedure tRPC para ler e salvar configurações da empresa
- [ ] Criar página de Configurações com upload de logo, nome, CNPJ, telefone, endereço
- [ ] Exibir logo e nome da empresa no sidebar (cabeçalho)
- [ ] Exibir logo e nome da empresa nos relatórios e impressão
- [ ] Adicionar item "Configurações" no menu (somente admin)
- [ ] Implementar filtros avançados no relatório de pagamentos (nº controle, data, nome, status, centro de custo, banco, valor min/max)
- [ ] Implementar filtros avançados no relatório de recebimentos (nº controle, data, nome, status, tipo recebimento, contrato, valor min/max)
- [ ] Exibir filtros aplicados no cabeçalho do relatório impresso
- [ ] Atualizar exportação CSV para respeitar os filtros aplicados

## Sistema de Parcelas (v5)
- [ ] Criar tabela pagamento_parcelas no schema (valor, vencimento, dataPagamento, status, observacao)
- [ ] Criar tabela recebimento_parcelas no schema (valor, vencimento, dataRecebimento, status, observacao)
- [ ] Executar migração do banco
- [ ] Criar helpers de DB para parcelas de pagamentos
- [ ] Criar helpers de DB para parcelas de recebimentos
- [ ] Criar procedures tRPC para CRUD de parcelas
- [ ] Atualizar formulário de pagamentos: gerar parcelas automaticamente ao salvar
- [ ] Atualizar formulário de recebimentos: gerar parcelas automaticamente ao salvar
- [ ] Criar componente de tabela de parcelas editável (valor, vencimento, pagamento, status)
- [ ] Exibir parcelas na listagem/detalhe de pagamentos e recebimentos
- [ ] Filtros avançados nos relatórios (nº controle, data, nome, status, valor min/max, tipo)
- [ ] Logo e nome da empresa nos relatórios e impressão

## Impressão e PDF Individual/Lote (v5)
- [ ] Criar componente ComprovanteViewer com layout profissional (logo, dados da empresa, tabela)
- [ ] Adicionar botão de impressão individual em cada linha de Pagamentos
- [ ] Adicionar botão de impressão individual em cada linha de Recebimentos
- [ ] Implementar seleção múltipla (checkboxes) nas listagens
- [ ] Criar botão "Imprimir Selecionados" para impressão em lote
- [ ] Exibir parcelas no comprovante quando parcelado
- [ ] Incluir logo e dados da empresa no cabeçalho do comprovante

## Gestão de Usuários e PDF (v6)
- [ ] Adicionar tabela de convites no schema (email, role, token, status, expira)
- [ ] Criar helpers de DB para listar/criar/atualizar usuários e convites
- [ ] Criar procedures tRPC: listar usuários, alterar role, desativar, criar convite, listar convites
- [ ] Reescrever página de Usuários com tabela de usuários ativos e gerenciamento de roles
- [ ] Adicionar formulário de convite por e-mail com seleção de nível de acesso
- [ ] Criar página de aceite de convite (/convite/:token)
- [ ] Integrar ComprovanteViewer na página de Pagamentos (individual + lote)
- [ ] Integrar ComprovanteViewer na página de Recebimentos (individual + lote)
- [ ] Adicionar checkboxes de seleção múltipla nas listagens
- [ ] Botão "Imprimir Selecionados" nas listagens

## Correção de Bug (v7)
- [x] Corrigir bug de fuso horário nas datas de pagamento e recebimento (data aparece 1 dia a menos)

## Correção de Layout de Impressão (v8)
- [x] Corrigir CSS de impressão do ComprovanteViewer (logo enorme, campos sem formatação, conteúdo em 2 páginas)

## Correção de Bug (v9)
- [x] Corrigir erro React #310 no ComprovanteViewer (hooks chamados dentro de loops .map())

## Melhorias Pagamentos v10
- [x] Adicionar campos valorEquipamento e valorServicos no schema de pagamentos
- [x] Migrar banco com novos campos
- [x] Atualizar db helpers e procedures tRPC para pagamentos
- [x] Reescrever formulário de Pagamentos com parcelamento (1-24 parcelas) e discriminação de valores
- [x] Geração automática de parcelas ao salvar pagamento parcelado

## Sistema de Parcelas Completo (v11)
- [x] Auditar formulário de Recebimentos: parcela única + múltiplas (1-24x) com valor, vencimento e data de recebimento por parcela
- [x] Auditar formulário de Pagamentos: parcela única + múltiplas (1-24x) com valor, vencimento e data de pagamento por parcela
- [x] Garantir que o Select de parcelas inclua "Parcela Única" como primeira opção
- [x] Garantir geração automática das parcelas ao clicar em "Gerar Parcelas"
- [x] Garantir que cada parcela seja editável individualmente (valor, vencimento, pagamento, status)

## Correções Formulário Recebimentos (v12)
- [x] Corrigir campos Equipamento e Serviços para serem totalmente opcionais (aceitar só um ou nenhum)
- [x] Corrigir erro "Preencha valor total e data de vencimento" ao gerar parcelas com Parcela Única (1x) — dataPrimeiroVencimento não estava sendo preenchida quando o campo de data é o dataVencimento
- [x] Garantir que o cálculo de parcelas use o valorTotal diretamente (sem depender de equipamento/serviço)

## Ajustes de Relatórios e Impressão (v14)
- [x] Ajustar CSS de impressão de Pagamentos para caber em 1 página (font-size menor, padding reduzido)
- [x] Reescrever comprovante de Recebimentos: incluir tabela de parcelas com status, descrição e observação
- [x] Nº de Controle no comprovante de Recebimentos em azul e fonte maior
- [x] Remover campo de assinatura do comprovante de Recebimentos
- [x] Corrigir status na listagem de Recebimentos: mostrar "X/N pagas" quando parcelado, e só "Recebido" quando todas as parcelas estiverem pagas

## Correções Críticas (v15)
- [x] Corrigir impressão: parcelas não aparecem no PDF (parcelasMap vazio no momento do print)
- [x] Corrigir erro ao atualizar recebimentos
- [x] Garantir que descrição e observação apareçam no comprovante impresso

## Correção Data Parcelas (v16)
- [x] Corrigir erro ao digitar data de recebimento nas parcelas — input retorna valor parcial enquanto usuário digita, causando datas inválidas no banco

## Correção Input Data Parcelas (v17)
- [x] Corrigir input de data nas parcelas: salvar via onBlur (quando campo perde foco) em vez de bloquear durante digitação

## Nova Atualização — Clientes, Centros de Custo e Gráficos
- [x] Criar tabela `clientes` no schema (nome, tipo, CPF/CNPJ, email, telefone, endereço, ativo)
- [x] Criar tabela `centros_custo` no schema (nome, descricao, ativo)
- [x] Adicionar campos `clienteId` e `centroCustoId` nas tabelas `pagamentos` e `recebimentos`
- [x] Rodar migração do banco (pnpm db:push)
- [x] Criar procedures tRPC para CRUD de Clientes (list, create, update, delete)
- [x] Criar procedures tRPC para CRUD de Centros de Custo (list, create, update, delete)
- [x] Criar página de Clientes com tabela, busca, formulário de cadastro e edição
- [x] Criar página de Centros de Custo com tabela e formulário
- [x] Atualizar formulário de Pagamentos: Select de Cliente e Centro de Custo
- [x] Atualizar formulário de Recebimentos: Select de Cliente e Centro de Custo
- [ ] Atualizar listagem de Pagamentos: mostrar nome do cliente e centro de custo
- [ ] Atualizar listagem de Recebimentos: mostrar nome do cliente e centro de custo
- [x] Adicionar gráfico de barras comparativo mensal (Recebimentos vs Pagamentos) no Dashboard
- [x] Adicionar gráfico de pizza por Centro de Custo no Dashboard
- [x] Adicionar gráfico de linha de fluxo de caixa acumulado no Dashboard
- [ ] Adicionar gráfico de barras por tipo de cliente/parceiro no Dashboard
- [x] Atualizar navegação lateral com links para Clientes e Centros de Custo
- [ ] Escrever testes para os novos routers
- [x] Dashboard: exibir dados do mês corrente por padrão com filtro de mês/ano
- [x] Dashboard: procedure tRPC com parâmetros dataInicio e dataFim para filtrar por período
- [x] Dashboard: gráfico de barras comparativo mensal dos últimos 6 meses (histórico)

## Correção Dashboard Histórico (v19)
- [x] Corrigir query getDashboardHistoricoMensal — coluna dataVencimento falhando no MySQL (nome da coluna no Drizzle vs banco)

## Hardening de Segurança (v19)
- [x] Instalar e configurar express-rate-limit (rate limit por IP e por usuário)
- [x] Instalar e configurar helmet (headers HTTP de segurança)
- [x] Adicionar Content-Security-Policy (CSP) via helmet
- [x] Garantir que .env nunca é commitado (.gitignore já cobre, verificar)
- [x] Revisar todas as procedures tRPC: garantir que staffProcedure/protectedProcedure cobre todos os endpoints sensíveis
- [x] Validar que Drizzle ORM usa queries parametrizadas (proteção SQL Injection)
- [x] Sanitizar inputs de texto livre (descrição, observação) contra XSS
- [x] Adicionar validação de tamanho máximo em todos os campos de texto
- [x] Garantir que tokens JWT têm expiração adequada
- [x] Revisar CORS: restringir origens permitidas em produção
- [x] Adicionar log de tentativas de acesso negado (403/401)
- [x] Corrigir erro "2 errors" no Dashboard (query histórico mensal)

## Navegação (v20)
- [x] Adicionar botão Home/Dashboard no cabeçalho do DashboardLayout para retorno intuitivo à página principal

## Correção Navegação (v21)
- [x] Corrigir botão Home/Dashboard que não está funcionando nas páginas internas

## Busca de Clientes nos Formulários (v22)
- [x] Criar componente ClienteSearchSelect com busca/autocomplete (digitar nome filtra a lista)
- [x] Integrar ClienteSearchSelect no formulário de Pagamentos (substituir Select simples)
- [x] Integrar ClienteSearchSelect no formulário de Recebimentos (substituir Select simples)
- [x] Criar procedure tRPC getLancamentosByCliente (pagamentos + recebimentos vinculados)
- [x] Criar página de extrato por cliente em /extrato-cliente
- [x] Adicionar "Extrato por Cliente" no menu lateral

## Coluna Cliente nas Listagens (v23)
- [x] Atualizar query listPagamentos no db.ts para incluir nome do cliente via JOIN
- [x] Atualizar query listRecebimentos no db.ts para incluir nome do cliente via JOIN
- [x] Adicionar coluna "Cliente" na tabela de listagem de Pagamentos
- [x] Adicionar coluna "Cliente" na tabela de listagem de Recebimentos

## Correção Validação E-mail Clientes (v24)
- [x] Corrigir validação Zod de e-mail no router de clientes para aceitar domínios simples (ex: @icloud, @gmail)

## Reorganização Busca de Cliente nos Formulários (v25)
- [x] Mover campo "Cliente / Parceiro" para junto dos campos Nome e CPF em Pagamentos
- [x] Ao selecionar cliente, preencher automaticamente Nome Completo e CPF em Pagamentos
- [x] Mover campo "Cliente / Parceiro" para junto dos campos Nome/Razão Social em Recebimentos
- [x] Ao selecionar cliente, preencher automaticamente Nome/Razão Social em Recebimentos

## Descrição no Comprovante Impresso (v26)
- [x] Garantir que o campo Descrição aparece no comprovante impresso de Pagamentos
- [x] Garantir que o campo Descrição aparece no comprovante impresso de Recebimentos

## 5 Ajustes v27

- [x] Ajuste 1: Permitir edição de parcelas individuais em Recebimentos (valor, vencimento, data recebimento, status)
- [x] Ajuste 2a: Adicionar campos de Pix (tipo de chave, chave Pix) no cadastro de Clientes/Prestadores no schema e router
- [x] Ajuste 2b: Preencher automaticamente Tipo de Chave Pix e Chave Pix em Pagamentos ao selecionar cliente cadastrado
- [x] Ajuste 3a: Criar procedure no backend para retornar o próximo número de controle de Pagamentos
- [x] Ajuste 3b: Preencher automaticamente o Nº de Controle ao abrir formulário de novo Pagamento (editável)
- [x] Ajuste 4: Corrigir query de pagamentos pendentes no Dashboard para incluir status "Em Processamento"
- [x] Ajuste 5: Adicionar seção de alertas de vencimento próximo no Dashboard (Pagamentos e Recebimentos vencendo em até 7 dias)

## Correção Bugs Parcelas Pagamentos (v28)
- [x] Corrigir: Dashboard não atualiza após salvar pagamento parcelado (invalidar cache tRPC)
- [x] Corrigir: Parcelas somem ao reabrir pagamento para edição (carregar parcelas existentes do banco)

## Melhorias v29 (6 itens)

- [x] Bug 1: Parcelas somem ao editar Recebimentos (mesmo fix aplicado em Pagamentos)
- [x] Bug 2: Corrigir cálculo de "Atrasado" no Dashboard — usar data de vencimento das parcelas, não do recebimento pai
- [x] Feature 3: Dashboard configurável — widgets drag-and-drop, persistência no banco, restrito a admin
- [x] Feature 4a: Revisão geral de UX — melhorar fluidez, intuitividade e objetividade em todas as abas
- [x] Feature 4b: Seletor de temas de cor (paletas predefinidas, persistência por usuário)
- [x] Feature 5: Módulo de Engenharia — Contratos, Ordens de Serviço, Tipos de Serviço, Materiais com códigos de controle, vinculação com Pagamentos/Recebimentos

## Correção Select.Item Vazio - Engenharia (v30)
- [x] Corrigir Select.Item com value="" no formulário de Contratos (erro ao abrir modal de novo contrato)

## Relatório por Contrato + Gerar Lançamento (v31)
- [x] Criar procedure tRPC relatorioContrato.getRelatorio que retorna contrato + OS vinculadas + recebimentos/pagamentos vinculados + totais
- [x] Modal de relatório por contrato na aba Engenharia (botão BarChart2 em cada contrato)
- [x] Relatório exibe: cabeçalho do contrato, cards de totais (recebido/pendente/saldo/OS), lista de OS, tabela de recebimentos, tabela de pagamentos
- [x] Numeração automática de Contratos (CTR-YYYY-NNN) já funcionava via nextNumero procedure
- [x] Numeração automática de OS (OS-YYYY-NNN) já funcionava via nextNumero procedure
- [x] Botão "Gerar Lançamento" (ícone DollarSign verde) em cada OS da listagem
- [x] Modal de geração de lançamento: escolher tipo (Recebimento/Pagamento), valor, data de vencimento, descrição
- [x] Procedure ordensServico.gerarLancamento cria pagamento ou recebimento vinculado ao cliente e contrato da OS
- [x] Após criar lançamento, redireciona automaticamente para a página de Pagamentos ou Recebimentos

## Impressão Engenharia + Endereço (v32)
- [x] Campos de endereço estruturado (logradouro, número, complemento, bairro, CEP, cidade, estado) na tabela contratos
- [x] Campos de endereço estruturado na tabela ordensServico
- [x] Migração do banco de dados aplicada com pnpm db:push
- [x] Router engenharia.ts atualizado com campos de endereço no create/update de Contratos e OS
- [x] Formulário de Contrato atualizado com seção de endereço (7 campos)
- [x] Formulário de OS atualizado com seção "Endereço do Local de Execução" (7 campos)
- [x] Componente EngenhariaImpressao.tsx criado com suporte a Contratos, OS, Materiais e Tipos de Serviço
- [x] Impressão de Contrato: cabeçalho empresa, número em destaque, status, tipo, dados completos, endereço, assinaturas
- [x] Impressão de OS: cabeçalho empresa, número em destaque, status, prioridade, dados completos, endereço, tabela de itens, assinaturas
- [x] Impressão de Materiais: tabela completa com código, nome, unidade, estoque, valor unitário, status
- [x] Impressão de Tipos de Serviço: tabela completa com código, nome, unidade, valor unitário, status
- [x] Botão "Imprimir Lista" (em lote) na barra de ações de Contratos, OS, Materiais e Tipos de Serviço
- [x] Botão de impressão individual (verde) em cada linha/card de Contratos, OS, Materiais e Tipos de Serviço
- [x] Modal de pré-visualização antes da impressão com botão "Imprimir / Salvar PDF"
- [x] CSS de impressão otimizado para A4 com @page size, margens e layout profissional

## Impressão Profissional Completa — OS e Contratos (v33)
- [x] Reescrever impressão de OS com TODOS os campos: número, título, status, prioridade, responsável, cliente, contrato, datas, valor estimado, valor final, endereço completo, descrição, observações, itens/materiais, assinatura do cliente e do responsável
- [x] Reescrever impressão de Contrato com TODOS os campos: número, tipo, status, cliente, objeto, datas, valores, endereço completo, cláusulas/observações, assinatura do contratante e do contratado
- [x] Incluir logo e nome da empresa (Atom Tech) no cabeçalho de todas as impressões de Engenharia
- [x] Seguir o mesmo padrão visual do ComprovanteViewer de Pagamentos (profissional, bem estruturado)
- [x] Impressão de Materiais e Tipos de Serviço também com cabeçalho da empresa

## Relatório Detalhado por Centro de Custo (v34)
- [x] Corrigir bug de criação de recebimentos: adicionar clienteId e centroCustoId no schema Zod do router create/update
- [x] Procedure relatorioCentroCusto.getRelatorio: retorna dados por CC com filtros de período, mês e ano
- [x] Procedure retorna: totais de pagamentos e recebimentos por CC, lista de transações, evolução mensal
- [x] Página RelatorioCentroCusto.tsx com: seletor de CC, filtro de período (mês/ano ou intervalo), cards de totais
- [x] Gráfico de barras comparativo (pagamentos x recebimentos por CC no período)
- [x] Gráfico de pizza de distribuição de gastos por tipo de serviço dentro do CC
- [x] Tabela detalhada de pagamentos vinculados ao CC selecionado no período
- [x] Tabela detalhada de recebimentos vinculados ao CC selecionado no período
- [x] Evolução mensal do CC selecionado (gráfico de linha ou barras empilhadas)
- [x] Botão de impressão do relatório por CC com logo da empresa
- [x] Link no menu lateral em Relatórios para acessar o relatório por CC

## Sistema de Permissões Granulares — Papel Operacional (v35)
- [x] Criar tabela user_permissions no schema (userId, modulo, pode_ver, pode_criar, pode_editar, pode_excluir)
- [x] Migrar banco com pnpm db:push
- [x] Adicionar enum 'operacional' ao campo role da tabela users
- [x] Criar helpers de DB: getUserPermissions, setAllUserPermissions, getModulos, DEFAULT_PERMISSIONS
- [x] Criar procedure tRPC: permissoes.minhasPermissoes (retorna permissões do usuário logado)
- [x] Criar procedure tRPC: permissoes.getPermissoes (admin: ver permissões de qualquer usuário)
- [x] Criar procedure tRPC: permissoes.setPermissoes (admin: definir permissões por módulo)
- [x] Definir DEFAULT_PERMISSIONS por role: admin (tudo), operacional (ver/criar/editar OS+Clientes; sem excluir), operador (ver pagamentos/recebimentos)
- [x] Aplicar guard de permissão nas procedures de exclusão (delete) em pagamentos, recebimentos, clientes, CC, contratos, OS, materiais, tipos de serviço
- [x] Criar hook usePermissions.ts no frontend com can.ver/criar/editar/excluir por módulo
- [x] Página Usuarios.tsx reescrita com seletor de role (admin/operador/operacional/user) e modal de permissões granulares
- [x] Modal de permissões: checkboxes por módulo para Ver/Criar/Editar/Excluir, botão "Aplicar Padrão Operacional"
- [x] DashboardLayout: filtra itens de menu baseado nas permissões (podeVer)
- [x] Pagamentos.tsx: botões Novo/Editar/Excluir condicionais por permissão
- [x] Recebimentos.tsx: botões Novo/Editar/Excluir condicionais por permissão
- [x] Clientes.tsx: botões Novo/Editar/Excluir condicionais por permissão
- [x] Engenharia.tsx: botões Novo/Editar/Excluir em todas as abas (Contratos, OS, Materiais, Tipos) condicionais por permissão
- [x] Operacional NÃO pode excluir sem autorização do admin (guard no backend + botão oculto no frontend)
- [x] Testes atualizados: 26 testes passando

## Integração Relatório por Centro de Custo (v36)
- [x] Mover Relatório por CC para dentro da página Relatórios como nova aba "Por Centro de Custo"
- [x] Remover item "Relatório por CC" do menu lateral (DashboardLayout)
- [x] Corrigir queries listPagamentos e listRecebimentos para JOIN com tabela centros_custo (retorna nome real do CC)
- [x] Garantir que pagamentos vinculados a um CC apareçam no relatório daquele CC (filtro por centroCustoId)
- [x] Garantir que recebimentos vinculados a um CC apareçam no relatório daquele CC (filtro por centroCustoId)
- [x] Seletor de CC no relatório lista apenas os CCs cadastrados no banco (trpc.centrosCusto.list)
- [x] Aba Geral: filtro de CC usa seletor com os CCs cadastrados no banco
- [x] Aba Por Centro de Custo: cards de totais, gráfico de evolução mensal, pizza por tipo, tabelas detalhadas, impressão A4
- [x] TypeScript limpo (0 erros) · 26 testes passando

## Melhorias ERP v2 (script de melhorias)
- [x] Atualizar STATUS_OS: planejada, autorizada, em_execucao, concluida, cancelada (remover aberta, pausada)
- [x] Atualizar STATUS_CONTRATO: proposta, em_negociacao, ativo, suspenso, encerrado (remover negociacao, cancelado)
- [x] Migrar dados existentes de status antigos para novos valores no banco
- [x] Adicionar colunas valorPrevisto e margemPrevista na tabela contratos
- [x] Adicionar coluna centroCustoId na tabela contratos
- [x] Adicionar campos avançados de clientes: tipoPessoa, segmento, inscricaoEstadual, inscricaoMunicipal, emailNfe, celular, nomeContato, cep, logradouro, numero, complemento, bairro, agencia, conta, tipoConta
- [x] Atualizar router de clientes (create/update) com novos campos avançados
- [x] Adicionar procedure ativarContrato: muda status para 'ativo' e cria Centro de Custo vinculado automaticamente
- [x] Adicionar procedure getDRE: calcula DRE por contrato (receitas, custos, margens)
- [x] Adicionar botão "Ativar Contrato" na lista de contratos (status proposta/em_negociacao)
- [x] Adicionar campos valorPrevisto e margemPrevista no formulário de contratos
- [x] Implementar aba "DRE do Contrato" no modal de relatório (tabela com receitas, custos, margem bruta)
- [x] Atualizar formulário de clientes com todos os novos campos avançados
- [x] Atualizar testes: 34 testes passando

## Correções e Reestruturação ERP v3 (script completo)
- [ ] BUG CRÍTICO: Edição de recebimentos zera parcelas — carregar parcelas existentes ao abrir edição
- [ ] BUG CRÍTICO: Registro de recebimento em parcela única não atualiza status/dashboard
- [ ] BUG: Alterações não sendo salvas corretamente
- [ ] Corrigir botão "Ativar Contrato" — verificar se procedure ativarContrato está registrada no router
- [ ] Corrigir DRE do Contrato — aba não aparece no modal de relatório
- [ ] Corrigir criação automática de Centro de Custo ao ativar contrato
- [ ] Corrigir Relatório de Contratos — não deixa selecionar / não mostra dados
- [ ] Vincular recebimentos ao contrato via centroCustoId do contrato
- [ ] Vincular pagamentos ao contrato via centroCustoId do contrato
- [ ] Atualizar registros existentes de OS e Contratos com novos status
- [ ] Dashboard por contrato: receita prevista x realizada, custos, margem, OS em andamento
- [ ] Integração total: pagamento realizado → atualiza CC e DRE do contrato automaticamente

## Correções Críticas v2 (script Eryelber)
- [x] Corrigir bug de parcelas zeradas ao editar recebimento (useEffect com editId como trigger)
- [x] Corrigir bug de parcela única não atualiza status do recebimento pai após registro
- [x] Corrigir relatório de CC: queries YEAR/MONTH incompatíveis com TiDB (substituir por DATE_FORMAT)
- [x] Corrigir dashboard: queries históricas mensais com YEAR/MONTH (substituir por DATE_FORMAT)
- [x] Adicionar ContratoSelect no formulário de recebimentos (preenche CC automaticamente)
- [x] Herdar cliente do contrato ao criar OS
- [x] Garantir que centroCustoId, valorPrevisto e margemPrevista são retornados na listagem de contratos
- [x] Automação de ativação de contratos: botão Ativar cria CC automaticamente
- [x] DRE por contrato: aba DRE no modal de relatório de contrato
- [x] Campos avançados de clientes: tipoPessoa, segmento, inscrições, celular, contato, endereço, dados bancários

## Correções Contratos e Filtros (v3)
- [ ] Corrigir erro ao salvar novo contrato (não salva mesmo com todos os campos preenchidos)
- [ ] Revisar e corrigir procedure createContrato no backend
- [ ] Revisar e corrigir procedure updateContrato no backend
- [ ] Revisar e corrigir procedure ativarContrato (criação automática de CC)
- [ ] Revisar e corrigir getDRE por contrato
- [ ] Implementar filtros avançados na listagem de contratos (status, cliente, tipo, período)
- [ ] Implementar filtros avançados na listagem de OS (status, contrato, cliente, período)

## Correções Críticas Contratos v3 (11/03/2026)
- [x] Corrigir enum de status de contratos no banco (negociacao→em_negociacao, cancelado→encerrado)
- [x] Corrigir enum de tipo de contratos no banco (remover om)
- [x] Corrigir enum de status de OS no banco (remover pausada)
- [x] Adicionar onError nas mutations de criar/atualizar contratos (exibir mensagem de erro)
- [x] Adicionar valorPrevisto e margemPrevista ao schema Zod do backend de contratos
- [x] Corrigir payload do handleSubmit de contratos para enviar valorPrevisto e margemPrevista
- [x] Implementar filtros avançados nos contratos (tipo, cliente)
- [x] Implementar filtros avançados nas OS (contrato, cliente)

## Correção Schema Contratos (12/03/2026)
- [x] Remover colunas recebimentoId e pagamentoId do schema Drizzle de contratos
- [x] Remover foreign keys- [x] Remover colunas recebimentoId e pagamentoId do schema Drizzle de contratos
- [x] Remover recebimentoId/pagamentoId do schema Zod de create/update de contratos
- [x] Usar campos explícitos no INSERT/UPDATE de contratos (sem spread de input)
- [x] Verificar procedure de criação de contratos no backend
## Diagnóstico INSERT Contratos (12/03/2026 - rodada 2)
- [x] Verificar colunas reais da tabela contratos no banco
- [x] Verificar código atual do INSERT no router de engenharia
- [x] Corrigir enums status e tipo no banco (em_negociacao, remover om)
- [x] Reiniciar servidor com código correto e testar INSERT via SQL direto

## URGENTE - Correção INSERT Contratos (12/03/2026)
- [x] Substituir INSERT/UPDATE Drizzle por SQL raw em contratos (resolve DEFAULT incompatível com TiDB)
- [x] Testar INSERT via script e confirmar sucesso
- [x] 34 testes passando, sem erros TypeScript

## Upload de Anexos e Correções (v30)
- [x] Criar tabela `anexos` no schema (modulo, registroId, nomeArquivo, tipoArquivo, tamanho, s3Key, s3Url, uploadPor)
- [x] Executar migração do banco (pnpm db:push)
- [x] Criar helpers de DB para anexos (listAnexos, createAnexo, deleteAnexo)
- [x] Criar procedures tRPC para anexos (list, upload, delete) com upload para S3
- [x] Criar componente reutilizável AnexosPanel (upload múltiplo, lista com download, exclusão)
- [x] Integrar AnexosPanel em Pagamentos (comprovantes, notas)
- [x] Integrar AnexosPanel em Recebimentos (comprovantes, notas)
- [x] Integrar AnexosPanel em Contratos (contratos assinados, propostas)
- [x] Integrar AnexosPanel em OS (fotos, laudos, relatórios de execução)
- [x] Integrar AnexosPanel em Clientes (contratos, documentos, certidões)
- [x] Corrigir número de controle em Pagamentos: useEffect garante preenchimento automático ao abrir modal
- [x] Criar geração automática de número de controle em Recebimentos (REC-2026-157+)
- [x] Corrigir padrão de número de Contratos para CTR-AAAA-MM-NNN (inclui mês)
- [x] Corrigir carregamento automático de número em Contratos e OS via useEffect
- [x] Adicionar filtro por Centro de Custo em Pagamentos
- [x] Adicionar filtro por período (data início/fim) em Pagamentos
- [x] Adicionar filtro por Centro de Custo em Recebimentos
- [x] Adicionar filtro por período (data início/fim) em Recebimentos
- [x] Adicionar filtro por Centro de Custo em Contratos
- [x] Adicionar filtro por Centro de Custo em OS
- [x] Adicionar campos responsavel e observacoes no schema de centros_custo
- [x] Adicionar campo centroCustoId no schema de ordens_servico
- [x] Escrever e passar 13 novos testes (total: 47 testes)

## Filtro por CC nos Relatórios (v31)
- [x] Adicionar parâmetro centroCustoId nas queries de relatório (pagamentos e recebimentos)
- [x] Atualizar procedures tRPC de relatórios para aceitar filtro por CC
- [x] Adicionar Select de Centro de Custo nos filtros da página de Relatórios
- [x] Exibir CC selecionado no cabeçalho do relatório impresso
- [x] Atualizar exportação TXT para incluir CC no cabeçalho

## Bug: Relatório Por Centro de Custo (v32)
- [x] Diagnosticar por que o relatório por CC exibe R$ 0,00 e 0 lançamentos
- [x] Corrigir a query/procedure do relatório por CC (cache de versão antiga — resolvido com restart do servidor)

## Auditoria Completa de Centro de Custo (v32)

### Bug crítico
- [x] Relatório por CC exibe R$ 0,00: todos os registros têm centroCustoId = null no banco (nunca foi salvo)

### Campos obrigatórios CC
- [x] Tornar campo CC obrigatório no formulário de Pagamentos (router corrigido para aceitar centroCustoId)
- [x] Tornar campo CC obrigatório no formulário de Recebimentos (já estava correto)
- [x] Garantir que CC seja salvo corretamente no banco ao criar/editar Pagamento e Recebimento

### Integração CC ↔ Contratos/OS
- [x] Adicionar campo CC no formulário de Contrato (Select de CC)
- [x] Adicionar botão "Criar novo CC" dentro do formulário de Contrato
- [x] Propagar CC do Contrato para OS automaticamente ao criar OS vinculada
- [x] Exibir CC no formulário de OS (herdado do contrato, editável)
- [x] Adicionar centroCustoId no create/update de Contratos no router de engenharia

### Página de Centros de Custo
- [x] Adicionar campo "status" (ativo/encerrado) na página de CC
- [x] Adicionar filtros por tipo e status na listagem de CC
- [x] Página já tem dashboard financeiro por CC (receitas, despesas, saldo)
- [ ] Exibir coluna CC na listagem de Pagamentos e Recebimentos (pendente)

## Correção Número de Controle Recebimentos
- [x] Corrigir padrão para REC-AAAA-MM-NNN com sequencial global iniciando em 157 (não reinicia por mês/ano)

## Correção Padrão Números de Controle (AAAA-MM-NNN)
- [x] Corrigir PAG: padrão PAG-AAAA-MM-NNN mantendo sequencial atual
- [x] Corrigir CTR: padrão CTR-AAAA-MM-NNN (já estava correto)
- [x] Corrigir OS: padrão OS-AAAA-MM-NNN com sequencial global
- [x] REC: padrão REC-AAAA-MM-NNN iniciando em 157 (ignora formatos antigos)

## Ajustes no Módulo de Materiais
- [x] Adicionar campos precoCusto, precoVenda, dataInsercao, finalidade no schema
- [x] Criar função nextCodigoMaterial para gerar MAT-0001, MAT-0002...
- [x] Atualizar router de materiais para aceitar novos campos
- [x] Atualizar formulário de Material no frontend com novos campos (Preço de Custo, Preço de Venda, Finalidade, Data de Inserção)
- [x] Exibir colunas Preço de Custo, Preço de Venda e Finalidade na listagem

## Melhorias Materiais e Prevenção de Duplicidade
- [ ] Filtro por Finalidade na listagem de Materiais
- [ ] Coluna Margem de Lucro (%) na listagem de Materiais
- [ ] Vincular materiais à OS com Preço de Venda como padrão
- [ ] Validação de duplicidade por CPF e Nome em Clientes
- [ ] Validação de duplicidade por CPF e Nome em Prestadores de Serviço
- [ ] Validação de duplicidade por CPF/CNPJ e Nome em Fornecedores
- [ ] Validação de duplicidade nos demais cadastros (outros tipos de pessoa)

## Melhorias v38 — CC em Lote, Coluna CC e Relatório
- [x] Backend: procedure assignCentroCustoLote para atribuir CC em múltiplos pagamentos/recebimentos
- [x] Backend: corrigir getRelatorioCentroCusto para incluir grupo "Sem Centro de Custo"
- [x] Frontend Pagamentos: adicionar coluna "Centro de Custo" na listagem
- [x] Frontend Pagamentos: ferramenta de atribuição em lote de CC (checkboxes + select CC)
- [x] Frontend Recebimentos: adicionar coluna "Centro de Custo" na listagem
- [x] Frontend Recebimentos: ferramenta de atribuição em lote de CC (checkboxes + select CC)
- [x] Frontend Relatórios: exibir grupo "Sem Centro de Custo" na aba Por CC

## Correção Edição de Recebimentos (v39)
- [x] Corrigir formulário de edição: carregar parcelas existentes ao abrir registro (não exigir regeneração)
- [x] Ao editar, exibir parcelas já cadastradas e permitir alterar status/valores sem recriar

## Melhorias v40 — Compras, Contratos e Gestão Financeira

- [x] Renomear "Pagamentos" para "Compras e Pagamentos" no menu lateral e títulos
- [x] Ativar parcelamento no formulário de Pagamentos (Switch parcelado já existe, funcional)
- [x] Criar aba "Contratos" separada no menu lateral (rota /contratos com ContratosTab)
- [x] Backend: adicionar campo contratoId em pagamentos e recebimentos no schema
- [x] Backend: procedure getRelatorioContrato (custos, receitas, materiais, lucro por contrato)
- [x] Frontend: painel de gestão financeira por contrato (vincular pagamentos/recebimentos/materiais)
- [x] Frontend: relatório de lucro por contrato (receitas - custos = lucro)
- [x] Edição inline de status de parcelas diretamente na listagem
- [x] Filtro "Sem Centro de Custo" nas listagens de Pagamentos e Recebimentos
- [x] Exportação PDF do relatório por Centro de Custo

## Melhorias v40 — Permissões Aprimoradas

- [x] Backend: adicionar módulos "contratos" e "extrato_cliente" na lista de MODULOS
- [x] Backend: criar perfis pré-definidos (Administrativo, Financeiro, Engenharia, Operacional)
- [x] Backend: Dashboard retorna apenas dados dos módulos que o usuário tem acesso
- [x] Frontend: cards do Dashboard filtrados por permissão (sem acesso a pagamentos → não vê total de pagamentos)
- [x] Frontend: página de Usuários com matriz de permissões granular (podeVer/podeCriar/podeEditar/podeExcluir por módulo)
- [x] Frontend: aplicar perfis pré-definidos com um clique e permitir personalização individual

## Melhorias v41 — Vinculação a Contratos, Painel Financeiro e Convites

- [x] Backend: verificar/adicionar campo contratoId em pagamentos e recebimentos no schema
- [x] Backend: procedure getRelatorioContrato (receitas, custos, materiais, lucro líquido por contrato)
- [x] Frontend Pagamentos: campo "Contrato" no formulário (select de contratos cadastrados)
- [x] Frontend Recebimentos: campo "Contrato" no formulário (select de contratos cadastrados)
- [x] Frontend Contratos: painel de gestão financeira por contrato (receitas, custos, lucro, gráfico)
- [x] Frontend Usuários: convite por e-mail com perfil pré-definido selecionável
- [x] Backend: procedure de convite com perfil (enviar e-mail + salvar convite com perfil)

## Bug Crítico — Switch Parcelamento Pagamentos (v42)
- [x] Corrigir: switch "Pagamento Parcelado" não aparece no formulário de edição de pagamentos
- [x] Garantir que a seção de parcelamento aparece tanto na criação quanto na edição

## Arquitetura Orientada a PROJETOS (v44)

### Schema e Banco de Dados
- [x] Criar tabela `projetos` com todos os campos obrigatórios e opcionais
- [x] Adicionar enum `tipo_projeto`: INSTALACAO, MANUTENCAO, SERVICO_PONTUAL, OBRA, RECORRENTE, CONSULTORIA, PARCERIA, OUTROS
- [x] Adicionar enum `status_projeto`: PLANEJAMENTO, AGUARDANDO_CONTRATO, AGUARDANDO_MOBILIZACAO, EM_EXECUCAO, PAUSADO, CONCLUIDO_TECNICAMENTE, ENCERRADO_FINANCEIRAMENTE, CANCELADO
- [x] Adicionar campo `projetoId` (opcional) na tabela `contratos`
- [x] Adicionar campo `projetoId` (opcional) na tabela `ordens_servico`
- [x] Adicionar campo `projetoId` (opcional) na tabela `recebimentos`
- [x] Adicionar campo `projetoId` (opcional) na tabela `pagamentos`
- [x] Adicionar campo `projetoId` (opcional) na tabela `materiais`
- [x] Adicionar campo `classificacao` na tabela `centros_custo` (ESTRATEGICO, OPERACIONAL, PROJETO, ADMINISTRATIVO, INVESTIMENTO)
- [x] Adicionar campos `equipe`, `dataInicioReal`, `dataFimReal` na tabela `ordens_servico`
- [x] Atualizar enum status_os com novos valores: PLANEJADA, AGENDADA, EM_DESLOCAMENTO, EM_EXECUCAO, PAUSADA, CONCLUIDA, AGUARDANDO_VALIDACAO, CANCELADA
- [x] Rodar migração do banco (pnpm db:push)

### Backend — Helpers e Procedures
- [x] Criar helpers de DB: `listProjetos`, `getProjeto`, `createProjeto`, `updateProjeto`, `deleteProjeto`
- [x] Criar helper `getPainelProjeto` (dados consolidados: financeiro, execução, relacionamentos)
- [x] Criar procedures tRPC: `projetos.list`, `projetos.get`, `projetos.create`, `projetos.update`, `projetos.delete`
- [x] Criar procedure `projetos.painel` (retorna dados consolidados do painel)
- [x] Criar procedure `projetos.nextNumero` (PRJ-AAAA-MM-NNN)
- [x] Fluxo automático: ao vincular contrato a projeto → atualizar `valor_contratado`, CC e status
- [x] Fluxo automático: 1ª OS iniciada → status do projeto → EM_EXECUCAO + `data_inicio_real`
- [x] Fluxo automático: OS concluída → atualizar progresso do projeto
- [x] Fluxo automático: recebimento confirmado → atualizar receita realizada do projeto
- [x] Automatização de receitas previstas: se contrato tem valor, gerar recebimentos previstos vinculados ao projeto
- [x] Permissão: usuários operacionais veem apenas projetos/OS atribuídos a eles

### Frontend — Página de Projetos
- [x] Criar página `Projetos.tsx` com listagem, filtros (status, tipo, cliente) e cards de resumo
- [x] Criar formulário de criação/edição de projeto (todos os campos)
- [x] Criar painel do projeto (modal ou página dedicada) com: identificação, financeiro, execução, relacionamentos
- [x] Adicionar item "Projetos" no menu lateral (DashboardLayout)
- [x] Rota `/projetos` registrada no App.tsx

### Integração nos Formulários Existentes
- [x] Formulário de Contratos: campo `projetoId` para vincular a projeto existente
- [x] Formulário de OS: campo `projetoId` adicionado (herda do contrato automaticamente)
- [x] Formulário de Pagamentos: campo `projetoId` adicionado (select de projetos, opcional)
- [x] Formulário de Recebimentos: campo `projetoId` adicionado (select de projetos, opcional)
- [x] Formulário de Centros de Custo: campos `classificacao` e `projetoId` adicionados


### Testes
- [x] Verificar que todos os testes existentes continuam passando (53 testes passando)

## Módulo OS Avançado (v46+)

### Schema e Banco
- [x] Garantir campos na tabela `ordens_servico`: `tipo_servico`, `categoria_servico`, `prioridade`, `local_execucao`, `equipe_ids` (JSON), `data_agendamento`, `checklist_json`, `evidencias_urls` (JSON)
- [x] Criar tabela `os_status_historico`: `id`, `os_id`, `status_anterior`, `status_novo`, `usuario_id`, `observacao`, `criado_em`
- [x] Rodar migração `pnpm db:push`

### Backend
- [x] Atualizar schema Zod de create/update OS com todos os novos campos
- [x] Validação: `projeto_id` obrigatório ao criar OS (bloqueia no frontend com toast de erro)
- [x] Fluxo automático: EM_EXECUCAO → registrar `data_inicio_real` + atualizar projeto se PLANEJAMENTO
- [x] Fluxo automático: CONCLUIDA → verificar checklist obrigatório + registrar `data_fim_real` + atualizar contadores do projeto
- [x] Fluxo automático: PAUSADA → manter `data_inicio_real`, não alterar datas previstas
- [x] Registrar histórico de mudança de status em `os_status_historico`
- [x] Procedure `engenharia.agenda` para listar OS com filtro de data e status ≠ CONCLUIDA/CANCELADA

### Frontend — Formulário de OS
- [x] Adicionar campos: `tipo_servico`, `categoria_servico`, `prioridade` (select: BAIXA/NORMAL/ALTA/CRITICA)
- [x] Adicionar campos: `local_execucao`, `data_agendamento`, `data_inicio_prevista`, `data_fim_prevista`
- [x] Adicionar seção de Checklist (adicionar/remover itens, marcar obrigatório, status por item)
- [x] Adicionar seção de Evidências (via AnexosPanel existente)
- [x] `projeto_id` obrigatório no formulário (validação no handleSubmit)

### Frontend — Agenda Operacional
- [x] Criar aba "Agenda" na página de Engenharia
- [x] Visualização em lista com OS agendadas por data (agrupa por dia)
- [x] Indicador visual de prioridade (cor por BAIXA/NORMAL/ALTA/CRITICA)
- [x] Destaque para OS de hoje e OS atrasadas
- [x] Barra de progresso do checklist por OS

### Validações
- [x] OS sem `projeto_id` não pode ser criada (bloqueia com toast)
- [x] Histórico de status preservado em `os_status_historico`
- [x] Compatibilidade retroativa: OS antigas sem `projeto_id` continuam visíveis (campo opcional para dados antigos)

## Automação Financeira de Projetos (v47+) — CONCLUÍDO

### Backend — Cálculos Financeiros
- [x] Procedure `projetos.painel` expandida: calcular `receita_prevista_total`, `receita_realizada_total`, `saldo_a_receber` (baseado em recebimentos vinculados ao projeto)
- [x] Calcular `custos_totais_registrados` (pagamentos vinculados ao projeto ou ao CC do projeto)
- [x] Calcular `resultado_estimado = receita_realizada_total − custos_totais_registrados`
- [x] Calcular `percentual_recebido = receita_realizada_total / receita_prevista_total`
- [x] Derivar `status_financeiro`: SEM_RECEITA, EM_RECEBIMENTO, RECEITA_PARCIAL, RECEITA_COMPLETA, INADIMPLENTE
- [x] Alerta de inadimplência: recebimentos vencidos → status INADIMPLENTE
- [x] Indicador "PRONTO PARA ENCERRAMENTO" se todas as OS do projeto estiverem CONCLUIDAS

### Backend — Vínculos Automáticos
- [x] Ao criar recebimento com contrato que tem projeto → vincular automaticamente ao projeto
- [x] Ao criar pagamento com CC do tipo PROJETO → vincular ao projeto correspondente do CC

### Frontend — Painel Financeiro do Projeto
- [x] Exibir cards: Receita Prevista, Receita Realizada, Saldo a Receber, Custos, Resultado Estimado (grid 2x3)
- [x] Exibir barra de progresso: percentual recebido com cor dinâmica (amarelo/azul/verde)
- [x] Exibir badge de status financeiro (SEM_RECEITA, EM_RECEBIMENTO, RECEITA_PARCIAL, RECEITA_COMPLETA, INADIMPLENTE)
- [x] Exibir indicador "PRONTO PARA ENCERRAMENTO" quando todas as OS estiverem concluídas
- [x] Exibir alerta de inadimplência com ícone de aviso
- [x] Listar recebimentos e pagamentos vinculados ao projeto no painel (abas)

### Validações
- [x] Compatibilidade retroativa: projetos sem recebimentos/pagamentos vinculados mostram R$ 0,00
- [x] Não modificar lógica financeira existente (pagamentos/recebimentos independentes continuam funcionando)
