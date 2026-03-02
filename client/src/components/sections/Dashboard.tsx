import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, BarChart3, PieChart } from 'lucide-react';

export default function Dashboard() {
  const sections = [
    {
      title: 'Pagamentos',
      icon: TrendingDown,
      color: 'text-red-600',
      items: [
        'Total de pagamentos',
        'Pagamentos realizados',
        'Pagamentos pendentes'
      ]
    },
    {
      title: 'Recebimentos',
      icon: TrendingUp,
      color: 'text-green-600',
      items: [
        'Total a receber',
        'Total recebido',
        'Total pendente'
      ]
    },
    {
      title: 'Fluxo de Caixa',
      icon: BarChart3,
      color: 'text-blue-600',
      items: [
        'Diferença entre recebimentos e pagamentos',
        'Saldo positivo/negativo'
      ]
    },
    {
      title: 'Análise de Atrasos',
      icon: TrendingDown,
      color: 'text-orange-600',
      items: [
        'Recebimentos atrasados',
        'Quantidade de atrasos'
      ]
    },
    {
      title: 'Composição de Faturamento',
      icon: PieChart,
      color: 'text-purple-600',
      items: [
        'Percentual de equipamentos',
        'Percentual de serviços'
      ]
    },
    {
      title: 'Indicadores-Chave (KPIs)',
      icon: BarChart3,
      color: 'text-indigo-600',
      items: [
        'Taxa de recebimento',
        'Ticket médio de recebimento',
        'Ticket médio de pagamento',
        'Quantidade total de transações'
      ]
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-display text-primary">📊 Dashboard Financeiro</h1>
        <p className="text-lg text-muted-foreground">
          Consolidação de dados de ambas as planilhas com visão em tempo real do fluxo de caixa e indicadores-chave.
        </p>
      </div>

      {/* Main Features */}
      <div className="space-y-4">
        <h2 className="text-heading text-foreground">Seções Principais</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <Card key={section.title} className="card-premium p-6">
                <div className="flex items-start gap-4">
                  <div className={`p-3 bg-primary/10 rounded-lg`}>
                    <Icon className={`${section.color}`} size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-subheading text-foreground mb-3">
                      {section.title}
                    </h3>
                    <ul className="space-y-2">
                      {section.items.map((item) => (
                        <li key={item} className="flex items-center gap-2 text-muted-foreground">
                          <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Visual Example */}
      <div className="space-y-4">
        <h2 className="text-heading text-foreground">Exemplo de Visualização</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Total Recebimentos', value: 'R$ 45.000,00', color: 'bg-green-100 dark:bg-green-900/30' },
            { label: 'Total Pagamentos', value: 'R$ 28.500,00', color: 'bg-red-100 dark:bg-red-900/30' },
            { label: 'Fluxo Líquido', value: 'R$ 16.500,00', color: 'bg-blue-100 dark:bg-blue-900/30' }
          ].map((metric) => (
            <Card key={metric.label} className={`${metric.color} border-0 p-6`}>
              <p className="text-sm text-muted-foreground mb-2">{metric.label}</p>
              <p className="text-2xl font-bold text-foreground">{metric.value}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Temporal Analysis */}
      <div className="space-y-4">
        <h2 className="text-heading text-foreground">📅 Análise Temporal</h2>
        <Card className="card-premium p-6">
          <p className="text-muted-foreground mb-4">
            A aba "Análise Temporal" permite comparar períodos diferentes para acompanhar a evolução do negócio.
          </p>
          <div className="bg-card rounded-lg p-4 border border-border">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground font-semibold">Métrica</p>
                <p className="text-foreground mt-2">Total Recebimentos</p>
                <p className="text-foreground mt-2">Total Pagamentos</p>
                <p className="text-foreground mt-2">Fluxo Líquido</p>
              </div>
              <div>
                <p className="text-muted-foreground font-semibold">Período Atual</p>
                <p className="text-foreground mt-2">R$ 45.000,00</p>
                <p className="text-foreground mt-2">R$ 28.500,00</p>
                <p className="text-foreground mt-2">R$ 16.500,00</p>
              </div>
              <div>
                <p className="text-muted-foreground font-semibold">Período Anterior</p>
                <p className="text-foreground mt-2">R$ 38.000,00</p>
                <p className="text-foreground mt-2">R$ 22.000,00</p>
                <p className="text-foreground mt-2">R$ 16.000,00</p>
              </div>
              <div>
                <p className="text-muted-foreground font-semibold">Variação</p>
                <p className="text-green-600 mt-2">+18,4%</p>
                <p className="text-red-600 mt-2">+29,5%</p>
                <p className="text-green-600 mt-2">+3,1%</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Key Features */}
      <div className="space-y-4">
        <h2 className="text-heading text-foreground">✨ Características Principais</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { icon: '🔄', title: 'Atualização em Tempo Real', desc: 'Dados sincronizados automaticamente com as planilhas' },
            { icon: '📊', title: 'Múltiplas Perspectivas', desc: 'Visualize dados por status, departamento e período' },
            { icon: '📈', title: 'Tendências', desc: 'Compare períodos para identificar padrões' },
            { icon: '⚠️', title: 'Alertas', desc: 'Identifique recebimentos atrasados e pagamentos pendentes' },
            { icon: '💰', title: 'Fluxo de Caixa', desc: 'Saiba sempre o saldo disponível' },
            { icon: '🎯', title: 'KPIs', desc: 'Acompanhe métricas-chave de desempenho' }
          ].map((feature) => (
            <Card key={feature.title} className="card-premium p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{feature.icon}</span>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">{feature.title}</h4>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Usage Tips */}
      <div className="bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/20 rounded-lg p-6">
        <h3 className="text-subheading text-primary mb-4">💡 Como Usar o Dashboard</h3>
        <ol className="space-y-3 text-foreground">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">1</span>
            <span>Preencha as planilhas de Pagamentos e Recebimentos com seus dados</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">2</span>
            <span>Abra a planilha Dashboard_Financeiro.xlsx</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">3</span>
            <span>Os dados serão atualizados automaticamente</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">4</span>
            <span>Consulte as abas de Relatórios para análises detalhadas</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">5</span>
            <span>Use a Análise Temporal para comparar períodos</span>
          </li>
        </ol>
      </div>
    </div>
  );
}
