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
