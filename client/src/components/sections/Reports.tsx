import { Card } from '@/components/ui/card';
import { BarChart3, PieChart, TrendingUp } from 'lucide-react';

export default function Reports() {
  const paymentReports = [
    'Total de pagamentos',
    'Pagamentos por status (Pendente, Processando, Pago, Cancelado)',
    'Análise por centro de custo',
    'Quantidade de registros'
  ];

  const receivableReports = [
    'Total a receber',
    'Total recebido',
    'Total pendente',
    'Total atrasado',
    'Composição (equipamentos vs. serviços)',
    'Taxa de recebimento',
    'Valores médios'
  ];

  const dashboardReports = [
    'Total de pagamentos e recebimentos',
    'Fluxo de caixa consolidado',
    'Análise de atrasos',
    'Composição de faturamento',
    'Indicadores-chave (KPIs)',
    'Comparativo de períodos'
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-display text-primary">🔍 Relatórios Automáticos</h1>
        <p className="text-lg text-muted-foreground">
          Cada planilha possui abas de relatórios com análises automáticas que se atualizam conforme você preenche os dados.
        </p>
      </div>

      {/* Payment Reports */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="text-primary" size={28} />
          <h2 className="text-heading text-foreground">Relatórios de Pagamentos</h2>
        </div>
        <Card className="card-premium p-6">
          <p className="text-muted-foreground mb-4">
            A aba "Relatórios" na planilha de Pagamentos inclui as seguintes análises automáticas:
          </p>
          <ul className="space-y-3">
            {paymentReports.map((report) => (
              <li key={report} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-2 h-2 bg-primary rounded-full mt-2" />
                <span className="text-foreground">{report}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Receivable Reports */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <TrendingUp className="text-secondary" size={28} />
          <h2 className="text-heading text-foreground">Relatórios de Recebimentos</h2>
        </div>
        <Card className="card-premium p-6">
          <p className="text-muted-foreground mb-4">
            A aba "Relatórios" na planilha de Recebimentos inclui as seguintes análises automáticas:
          </p>
          <ul className="space-y-3">
            {receivableReports.map((report) => (
              <li key={report} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-2 h-2 bg-secondary rounded-full mt-2" />
                <span className="text-foreground">{report}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Dashboard Reports */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <PieChart className="text-accent" size={28} />
          <h2 className="text-heading text-foreground">Relatórios do Dashboard</h2>
        </div>
        <Card className="card-premium p-6">
          <p className="text-muted-foreground mb-4">
            A planilha Dashboard_Financeiro.xlsx consolida informações de ambas as planilhas:
          </p>
          <ul className="space-y-3">
            {dashboardReports.map((report) => (
              <li key={report} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-2 h-2 bg-accent rounded-full mt-2" />
                <span className="text-foreground">{report}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Report Examples */}
      <div className="space-y-4">
        <h2 className="text-heading text-foreground">📊 Exemplos de Relatórios</h2>
        
        {/* Example 1 */}
        <Card className="card-premium p-6">
          <h3 className="text-subheading text-foreground mb-4">Análise de Pagamentos por Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-card rounded">
              <span className="text-foreground">Pendente</span>
              <span className="font-semibold text-primary">R$ 12.500,00</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-card rounded">
              <span className="text-foreground">Processando</span>
              <span className="font-semibold text-orange-600">R$ 5.000,00</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-card rounded">
              <span className="text-foreground">Pago</span>
              <span className="font-semibold text-secondary">R$ 28.500,00</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-card rounded border-t-2 border-primary">
              <span className="font-semibold text-foreground">Total</span>
              <span className="font-bold text-lg text-primary">R$ 46.000,00</span>
            </div>
          </div>
        </Card>

        {/* Example 2 */}
        <Card className="card-premium p-6">
          <h3 className="text-subheading text-foreground mb-4">Composição de Faturamento</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-card rounded">
              <span className="text-foreground">Total de Equipamentos</span>
              <span className="font-semibold text-primary">R$ 25.000,00</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-card rounded">
              <span className="text-foreground">Total de Serviços</span>
              <span className="font-semibold text-secondary">R$ 20.000,00</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-card rounded">
              <span className="text-foreground">% Equipamentos</span>
              <span className="font-semibold text-primary">55,6%</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-card rounded">
              <span className="text-foreground">% Serviços</span>
              <span className="font-semibold text-secondary">44,4%</span>
            </div>
          </div>
        </Card>

        {/* Example 3 */}
        <Card className="card-premium p-6">
          <h3 className="text-subheading text-foreground mb-4">Indicadores-Chave (KPIs)</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-card rounded">
              <span className="text-foreground">Taxa de Recebimento</span>
              <span className="font-semibold text-secondary">87,5%</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-card rounded">
              <span className="text-foreground">Ticket Médio de Recebimento</span>
              <span className="font-semibold text-primary">R$ 9.000,00</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-card rounded">
              <span className="text-foreground">Ticket Médio de Pagamento</span>
              <span className="font-semibold text-primary">R$ 5.750,00</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-card rounded">
              <span className="text-foreground">Quantidade de Transações</span>
              <span className="font-semibold text-primary">16</span>
            </div>
          </div>
        </Card>
      </div>

      {/* How to Access Reports */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-50/50 dark:from-blue-900/20 dark:to-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h3 className="text-subheading text-primary mb-4">📍 Como Acessar os Relatórios</h3>
        <ol className="space-y-3 text-foreground">
          <li className="flex gap-3">
            <span className="flex-shrink-0 font-bold text-primary">1.</span>
            <span>Abra a planilha desejada (Pagamentos, Recebimentos ou Dashboard)</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 font-bold text-primary">2.</span>
            <span>Procure pela aba "Relatórios" na parte inferior da planilha</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 font-bold text-primary">3.</span>
            <span>Clique na aba para visualizar as análises automáticas</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 font-bold text-primary">4.</span>
            <span>Os dados são atualizados automaticamente conforme você preenche as planilhas</span>
          </li>
        </ol>
      </div>

      {/* Important Notes */}
      <div className="space-y-4">
        <h2 className="text-heading text-foreground">⚠️ Notas Importantes</h2>
        <div className="space-y-3">
          <Card className="card-premium p-4 border-l-4 border-l-primary">
            <h4 className="font-semibold text-foreground mb-1">Não modifique as fórmulas</h4>
            <p className="text-sm text-muted-foreground">
              As fórmulas nas abas de Relatórios são automáticas. Não as modifique para não quebrar os cálculos.
            </p>
          </Card>
          <Card className="card-premium p-4 border-l-4 border-l-secondary">
            <h4 className="font-semibold text-foreground mb-1">Atualizações em tempo real</h4>
            <p className="text-sm text-muted-foreground">
              Todos os relatórios são atualizados automaticamente quando você preenche ou altera dados nas planilhas.
            </p>
          </Card>
          <Card className="card-premium p-4 border-l-4 border-l-accent">
            <h4 className="font-semibold text-foreground mb-1">Consulte regularmente</h4>
            <p className="text-sm text-muted-foreground">
              Revise os relatórios periodicamente para acompanhar a saúde financeira da sua empresa.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
