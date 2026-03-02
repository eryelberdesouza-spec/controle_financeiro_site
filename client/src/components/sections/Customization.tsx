import { Card } from '@/components/ui/card';
import { Settings, Edit3, Plus } from 'lucide-react';

export default function Customization() {
  const customizations = [
    {
      title: 'Tipos de Serviço',
      current: ['Consultoria', 'Desenvolvimento', 'Suporte', 'Manutenção', 'Treinamento', 'Outro'],
      location: 'Coluna "Tipo de Serviço" - Planilha de Pagamentos',
      steps: [
        'Clique na coluna "Tipo de Serviço"',
        'Vá em Dados > Validação',
        'Edite a lista de opções',
        'Adicione seus serviços específicos'
      ]
    },
    {
      title: 'Centros de Custo',
      current: ['Administrativo', 'Operacional', 'Comercial', 'TI', 'Recursos Humanos', 'Financeiro', 'Outro'],
      location: 'Coluna "Centro de Custo" - Planilha de Pagamentos',
      steps: [
        'Clique na coluna "Centro de Custo"',
        'Vá em Dados > Validação',
        'Edite a lista de opções',
        'Adicione seus departamentos'
      ]
    },
    {
      title: 'Bancos',
      current: ['Banco do Brasil', 'Caixa', 'Itaú', 'Bradesco', 'Santander', 'Nubank', 'Inter', 'Outro'],
      location: 'Coluna "Banco" - Planilha de Pagamentos',
      steps: [
        'Clique na coluna "Banco"',
        'Vá em Dados > Validação',
        'Edite a lista de opções',
        'Adicione os bancos da sua empresa'
      ]
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}\n      <div className="space-y-4">
        <h1 className="text-display text-primary">🔧 Personalizações Recomendadas</h1>
        <p className="text-lg text-muted-foreground">
          Customize as listas suspensas para refletir a estrutura e processos específicos da sua empresa.
        </p>
      </div>

      {/* Customization Options */}
      <div className="space-y-6">
        {customizations.map((custom) => (
          <Card key={custom.title} className="card-premium p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Settings className="text-primary" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-subheading text-foreground mb-1">{custom.title}</h3>
                <p className="text-sm text-muted-foreground">{custom.location}</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Current Options */}
              <div>
                <h4 className="font-semibold text-foreground mb-2">Opções Atuais</h4>
                <div className="flex flex-wrap gap-2">
                  {custom.current.map((option) => (
                    <span
                      key={option}
                      className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                    >
                      {option}
                    </span>
                  ))}
                </div>
              </div>

              {/* Steps */}
              <div>
                <h4 className="font-semibold text-foreground mb-3">Como Personalizar</h4>
                <ol className="space-y-2">
                  {custom.steps.map((step, idx) => (
                    <li key={step} className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </span>
                      <span className="text-foreground pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Logo Customization */}
      <div className="space-y-4">
        <h2 className="text-heading text-foreground">🏢 Inserir Logo da Empresa</h2>
        <Card className="card-premium p-6">
          <p className="text-muted-foreground mb-4">
            Em cada planilha, você verá uma célula com o texto <span className="font-mono bg-muted px-2 py-1 rounded">[INSIRA O LOGO AQUI]</span> no canto superior esquerdo.
          </p>
          <ol className="space-y-3">
            <li className="flex gap-3">
              <span className="flex-shrink-0 font-bold text-primary">1.</span>
              <span className="text-foreground">Clique na célula com o texto de placeholder</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 font-bold text-primary">2.</span>
              <span className="text-foreground">Vá em <span className="font-semibold">Inserir {'>'} Imagens</span> (ou equivalente no seu Excel)</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 font-bold text-primary">3.</span>
              <span className="text-foreground">Selecione o arquivo de logo da sua empresa</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 font-bold text-primary">4.</span>
              <span className="text-foreground">Redimensione conforme necessário</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 font-bold text-primary">5.</span>
              <span className="text-foreground">Repita o processo para as outras planilhas</span>
            </li>
          </ol>
        </Card>
      </div>

      {/* Advanced Customizations */}
      <div className="space-y-4">
        <h2 className="text-heading text-foreground">⚙️ Personalizações Avançadas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              icon: Plus,
              title: 'Adicionar Mais Linhas',
              desc: 'As fórmulas estão configuradas para 50 linhas. Para adicionar mais, copie as fórmulas para as linhas adicionais.'
            },
            {
              icon: Edit3,
              title: 'Modificar Cores',
              desc: 'Você pode alterar as cores de fundo das células para personalizar a aparência das planilhas.'
            },
            {
              icon: Settings,
              title: 'Ajustar Largura de Colunas',
              desc: 'Redimensione as colunas para melhor visualização de seus dados específicos.'
            },
            {
              icon: Plus,
              title: 'Adicionar Colunas',
              desc: 'Você pode adicionar colunas extras para informações adicionais (não afeta as fórmulas existentes).'
            }
          ].map((custom) => {
            const Icon = custom.icon;
            return (
              <Card key={custom.title} className="card-premium p-4">
                <div className="flex items-start gap-3">
                  <Icon className="text-primary flex-shrink-0 mt-1" size={20} />
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">{custom.title}</h4>
                    <p className="text-sm text-muted-foreground">{custom.desc}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Best Practices */}
      <div className="bg-gradient-to-br from-green-50 to-green-50/50 dark:from-green-900/20 dark:to-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-6">
        <h3 className="text-subheading text-secondary mb-4">✅ Boas Práticas</h3>
        <ul className="space-y-3 text-foreground">
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 text-secondary font-bold">✓</span>
            <span>Mantenha a estrutura original das colunas principais</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 text-secondary font-bold">✓</span>
            <span>Não delete ou mova as colunas que contêm fórmulas</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 text-secondary font-bold">✓</span>
            <span>Faça backup antes de fazer alterações significativas</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 text-secondary font-bold">✓</span>
            <span>Teste as validações após personalizá-las</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 text-secondary font-bold">✓</span>
            <span>Documente as mudanças que fizer para referência futura</span>
          </li>
        </ul>
      </div>

      {/* Warning */}
      <div className="bg-gradient-to-br from-orange-50 to-orange-50/50 dark:from-orange-900/20 dark:to-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-lg p-6">
        <h3 className="text-subheading text-orange-600 dark:text-orange-400 mb-4">⚠️ Cuidados Importantes</h3>
        <ul className="space-y-3 text-foreground">
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 text-orange-600 dark:text-orange-400 font-bold">!</span>
            <span>Não modifique as fórmulas nas abas de Relatórios e Dashboard</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 text-orange-600 dark:text-orange-400 font-bold">!</span>
            <span>Não delete as linhas de total (última linha de dados)</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 text-orange-600 dark:text-orange-400 font-bold">!</span>
            <span>Não altere os nomes das abas (Pagamentos, Recebimentos, Relatórios)</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 text-orange-600 dark:text-orange-400 font-bold">!</span>
            <span>Faça backup antes de fazer alterações estruturais</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
