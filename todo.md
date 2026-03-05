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
