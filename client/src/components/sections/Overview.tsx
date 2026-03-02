import { FileText, BarChart3, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function Overview() {
  const features = [
    {
      icon: FileText,
      title: 'Controle de Pagamentos',
      description: 'Gerencia todos os pagamentos via Pix com validações automáticas'
    },
    {
      icon: BarChart3,
      title: 'Controle de Recebimentos',
      description: 'Acompanha recebimentos e parcelas com cálculos automáticos'
    },
    {
      icon: TrendingUp,
      title: 'Dashboard Consolidado',
      description: 'Visão em tempo real do fluxo de caixa e indicadores-chave'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-display text-primary">
          Sistema de Controle Financeiro
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Solução completa para gerenciar pagamentos e recebimentos da sua empresa com automações inteligentes e relatórios consolidados.
        </p>
      </div>

      {/* Key Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <Card key={feature.title} className="card-premium p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Icon className="text-primary" size={24} />
                </div>
                <div>
                  <h3 className="text-subheading text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Files Included */}
      <div className="space-y-4">
        <h2 className="text-heading text-foreground">Arquivos Inclusos</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { name: 'Controle_Pagamentos.xlsx', desc: 'Gerencia pagamentos via Pix' },
            { name: 'Controle_Recebimentos.xlsx', desc: 'Controla recebimentos e parcelas' },
            { name: 'Dashboard_Financeiro.xlsx', desc: 'Visão consolidada e KPIs' }
          ].map((file) => (
            <div key={file.name} className="card-premium p-4">
              <h4 className="font-semibold text-foreground mb-1">
                📊 {file.name}
              </h4>
              <p className="text-sm text-muted-foreground">
                {file.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Getting Started */}
      <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-lg border border-primary/20 p-8">
        <h2 className="text-heading text-primary mb-4">🎯 Como Começar</h2>
        <div className="space-y-3">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
              1
            </div>
            <div>
              <h4 className="font-semibold text-foreground">Baixe as planilhas</h4>
              <p className="text-muted-foreground text-sm">Obtenha os 3 arquivos Excel inclusos</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
              2
            </div>
            <div>
              <h4 className="font-semibold text-foreground">Insira o logo da empresa</h4>
              <p className="text-muted-foreground text-sm">Personalize as planilhas com sua identidade visual</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
              3
            </div>
            <div>
              <h4 className="font-semibold text-foreground">Comece a registrar dados</h4>
              <p className="text-muted-foreground text-sm">Preencha os campos conforme seus pagamentos e recebimentos</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
              4
            </div>
            <div>
              <h4 className="font-semibold text-foreground">Acompanhe os relatórios</h4>
              <p className="text-muted-foreground text-sm">Consulte o dashboard para análises automáticas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Key Benefits */}
      <div className="space-y-4">
        <h2 className="text-heading text-foreground">✨ Principais Benefícios</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            '✅ Validações automáticas para evitar erros',
            '✅ Cálculos automáticos de parcelas e totais',
            '✅ Dashboard consolidado em tempo real',
            '✅ Relatórios analíticos por status e departamento',
            '✅ Análise de atrasos e fluxo de caixa',
            '✅ Indicadores-chave de desempenho (KPIs)',
            '✅ Composição de faturamento (equipamentos vs serviços)',
            '✅ Análise temporal para comparar períodos'
          ].map((benefit) => (
            <div key={benefit} className="flex items-center gap-3 p-3 bg-card rounded-lg">
              <span className="text-lg">{benefit.split(' ')[0]}</span>
              <span className="text-foreground">{benefit.substring(3)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
