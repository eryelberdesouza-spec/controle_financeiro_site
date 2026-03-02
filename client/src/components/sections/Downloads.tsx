import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText, CheckCircle2 } from 'lucide-react';

export default function Downloads() {
  const files = [
    {
      id: 'payments',
      name: 'Controle_Pagamentos.xlsx',
      description: 'Gerencia todos os pagamentos via Pix com validações automáticas',
      features: [
        'Validação automática de CPF',
        'Cálculo de dias até pagamento',
        'Análise por status e centro de custo',
        'Relatórios consolidados'
      ],
      size: '9.2 KB',
      color: 'from-red-50 to-red-50/50 dark:from-red-900/20 dark:to-red-900/10'
    },
    {
      id: 'receivables',
      name: 'Controle_Recebimentos.xlsx',
      description: 'Controla recebimentos e parcelas com cálculos automáticos',
      features: [
        'Cálculo automático de valor por parcela',
        'Cálculo de dias até vencimento',
        'Análise de equipamentos vs. serviços',
        'KPIs e indicadores-chave'
      ],
      size: '9.8 KB',
      color: 'from-green-50 to-green-50/50 dark:from-green-900/20 dark:to-green-900/10'
    },
    {
      id: 'dashboard',
      name: 'Dashboard_Financeiro.xlsx',
      description: 'Visão consolidada com fluxo de caixa e indicadores-chave',
      features: [
        'Consolidação de dados em tempo real',
        'Fluxo de caixa consolidado',
        'Análise de atrasos',
        'Análise temporal para comparação de períodos'
      ],
      size: '9.1 KB',
      color: 'from-blue-50 to-blue-50/50 dark:from-blue-900/20 dark:to-blue-900/10'
    }
  ];

  const handleDownload = (filename: string) => {
    const link = document.createElement('a');
    link.href = `/${filename}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-display text-primary">⬇️ Downloads</h1>
        <p className="text-lg text-muted-foreground">
          Baixe as planilhas Excel profissionais e comece a usar o sistema de controle financeiro imediatamente.
        </p>
      </div>

      {/* Download Cards */}
      <div className="space-y-6">
        {files.map((file) => (
          <Card
            key={file.id}
            className={`bg-gradient-to-br ${file.color} border-border overflow-hidden`}
          >
            <div className="p-6 space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="text-primary" size={24} />
                    <h3 className="text-subheading text-foreground">{file.name}</h3>
                  </div>
                  <p className="text-muted-foreground mb-4">{file.description}</p>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  {file.size}
                </div>
              </div>

              {/* Features */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">Inclui:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {file.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-secondary flex-shrink-0" />
                      <span className="text-sm text-foreground">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Download Button */}
              <div className="pt-4 border-t border-border">
                <Button
                  onClick={() => handleDownload(file.name)}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-smooth"
                >
                  <Download size={20} />
                  Baixar {file.name}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick Start */}
      <div className="bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/20 rounded-lg p-6">
        <h2 className="text-heading text-primary mb-4">🚀 Comece Agora</h2>
        <ol className="space-y-3 text-foreground">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">1</span>
            <span>Baixe as 3 planilhas acima</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">2</span>
            <span>Insira o logo da sua empresa em cada planilha</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">3</span>
            <span>Comece a registrar seus pagamentos e recebimentos</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">4</span>
            <span>Acompanhe os relatórios e indicadores no Dashboard</span>
          </li>
        </ol>
      </div>

      {/* Bundle Download */}
      <Card className="card-premium p-6 border-2 border-primary">
        <div className="space-y-4">
          <div>
            <h3 className="text-subheading text-primary mb-2">📦 Baixar Todas as Planilhas</h3>
            <p className="text-muted-foreground">
              Baixe um pacote com as 3 planilhas em um único clique.
            </p>
          </div>
          <Button
            onClick={() => {
              // Baixar cada arquivo
              const files = [
                'Controle_Pagamentos.xlsx',
                'Controle_Recebimentos.xlsx',
                'Dashboard_Financeiro.xlsx'
              ];
              files.forEach((file) => {
                const link = document.createElement('a');
                link.href = `/${file}`;
                link.download = file;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              });
            }}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-smooth"
          >
            <Download size={20} />
            Baixar Todas (28.1 KB)
          </Button>
        </div>
      </Card>

      {/* Requirements */}
      <div className="space-y-4">
        <h2 className="text-heading text-foreground">📋 Requisitos</h2>
        <Card className="card-premium p-6">
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="text-lg">✓</span>
              <span className="text-foreground"><span className="font-semibold">Microsoft Excel 2016</span> ou superior (recomendado)</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-lg">✓</span>
              <span className="text-foreground"><span className="font-semibold">Google Sheets</span> (funciona, mas com limitações)</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-lg">✓</span>
              <span className="text-foreground"><span className="font-semibold">LibreOffice Calc</span> (compatível)</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-lg">⚠️</span>
              <span className="text-foreground">Algumas validações e fórmulas podem não funcionar perfeitamente em Google Sheets</span>
            </li>
          </ul>
        </Card>
      </div>

      {/* Support */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-50/50 dark:from-blue-900/20 dark:to-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h3 className="text-subheading text-blue-600 dark:text-blue-400 mb-4">💡 Dúvidas?</h3>
        <p className="text-foreground mb-4">
          Consulte a seção de <span className="font-semibold">Perguntas Frequentes</span> para respostas detalhadas sobre como usar as planilhas.
        </p>
        <p className="text-sm text-muted-foreground">
          Se não encontrar a resposta, entre em contato com o administrador do sistema para obter ajuda adicional.
        </p>
      </div>
    </div>
  );
}
