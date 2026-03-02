import { Card } from '@/components/ui/card';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function Receivables() {
  const fields = [
    { name: 'Nº Contrato', desc: 'Número do contrato', validation: 'Texto livre' },
    { name: 'Nome/Razão Social', desc: 'Cliente ou empresa', validation: 'Texto livre' },
    { name: 'Qtd Parcelas', desc: 'Quantidade total de parcelas', validation: 'Entre 1 e 12' },
    { name: 'Parcela', desc: 'Número da parcela atual', validation: 'Numérico' },
    { name: 'Valor Total (R$)', desc: 'Valor total do contrato', validation: 'Deve ser positivo' },
    { name: 'Valor Equipamento (R$)', desc: 'Parte referente a equipamentos', validation: 'Deve ser positivo' },
    { name: 'Valor Serviços (R$)', desc: 'Parte referente a serviços', validation: 'Deve ser positivo' },
    { name: 'Data Vencimento', desc: 'Quando vence a parcela', validation: 'Não pode ser anterior a hoje' },
    { name: 'Status', desc: 'Situação do recebimento', validation: 'Pendente, Recebido, Atrasado, Cancelado' },
    { name: 'Descrição', desc: 'Descrição do contrato', validation: 'Texto livre' },
    { name: 'Observações', desc: 'Notas adicionais', validation: 'Texto livre' }
  ];

  const features = [
    { icon: '🧮', title: 'Coluna "Valor/Parcela"', desc: 'Calcula automaticamente o valor de cada parcela' },
    { icon: '📅', title: 'Coluna "Dias até Venc."', desc: 'Mostra quantos dias faltam para vencer' },
    { icon: '➕', title: 'Totais Automáticos', desc: 'Soma de valores totais, equipamentos e serviços' },
    { icon: '📈', title: 'Relatórios', desc: 'Análises de recebimentos, composição e KPIs' }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-display text-secondary">📥 Planilha de Recebimentos</h1>
        <p className="text-lg text-muted-foreground">
          Controla recebimentos e parcelas com cálculos automáticos e análises consolidadas.
        </p>
      </div>

      {/* Fields Table */}
      <div className="space-y-4">
        <h2 className="text-heading text-foreground">Campos Disponíveis</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary text-secondary-foreground">
                <th className="px-4 py-3 text-left font-semibold">Campo</th>
                <th className="px-4 py-3 text-left font-semibold">Descrição</th>
                <th className="px-4 py-3 text-left font-semibold">Validação</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field, idx) => (
                <tr
                  key={field.name}
                  className={`border-b border-border ${
                    idx % 2 === 0 ? 'bg-card' : 'bg-background'
                  } hover:bg-muted/50 transition-smooth`}
                >
                  <td className="px-4 py-3 font-semibold text-foreground">{field.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{field.desc}</td>
                  <td className="px-4 py-3 text-muted-foreground">{field.validation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Automatic Features */}
      <div className="space-y-4">
        <h2 className="text-heading text-foreground">Recursos Automáticos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {features.map((feature) => (
            <Card key={feature.title} className="card-premium p-6">
              <div className="flex items-start gap-4">
                <span className="text-3xl">{feature.icon}</span>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Example */}
      <div className="space-y-4">
        <h2 className="text-heading text-foreground">Exemplo de Preenchimento</h2>
        <div className="bg-card border border-border rounded-lg p-6 font-mono text-sm">
          <div className="space-y-2 text-foreground">
            <div><span className="text-secondary font-semibold">Nº Contrato:</span> 2026-001</div>
            <div><span className="text-secondary font-semibold">Nome/Razão Social:</span> Empresa XYZ Ltda</div>
            <div><span className="text-secondary font-semibold">Qtd Parcelas:</span> 3</div>
            <div><span className="text-secondary font-semibold">Parcela:</span> 1</div>
            <div><span className="text-secondary font-semibold">Valor Total:</span> R$ 9.000,00</div>
            <div><span className="text-secondary font-semibold">Valor Equipamento:</span> R$ 5.000,00</div>
            <div><span className="text-secondary font-semibold">Valor Serviços:</span> R$ 4.000,00</div>
            <div><span className="text-secondary font-semibold">Data Vencimento:</span> 31/03/2026</div>
            <div><span className="text-secondary font-semibold">Status:</span> Pendente</div>
            <div><span className="text-secondary font-semibold">Descrição:</span> Consultoria e implementação de sistema</div>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="bg-gradient-to-br from-green-50 to-green-50/50 dark:from-green-900/20 dark:to-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-6">
        <div className="flex gap-4">
          <AlertCircle className="text-green-600 dark:text-green-400 flex-shrink-0" size={24} />
          <div>
            <h3 className="font-semibold text-foreground mb-2">💡 Dicas Importantes</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>✓ A quantidade de parcelas deve estar entre 1 e 12</li>
              <li>✓ O valor por parcela é calculado automaticamente</li>
              <li>✓ A soma de equipamento + serviços deve ser igual ao valor total</li>
              <li>✓ Atualize o status conforme os recebimentos ocorrem</li>
              <li>✓ Use a coluna "Dias até Venc." para identificar vencimentos próximos</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Reports Section */}
      <div className="space-y-4">
        <h2 className="text-heading text-foreground">📊 Relatórios Automáticos</h2>
        <Card className="card-premium p-6">
          <p className="text-muted-foreground mb-4">
            A aba "Relatórios" na planilha de Recebimentos inclui análises automáticas:
          </p>
          <ul className="space-y-2 text-foreground">
            <li className="flex items-center gap-2">
              <CheckCircle2 size={20} className="text-secondary" />
              <span>Total a receber</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 size={20} className="text-secondary" />
              <span>Total recebido e total pendente</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 size={20} className="text-secondary" />
              <span>Total atrasado</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 size={20} className="text-secondary" />
              <span>Composição de faturamento (equipamentos vs. serviços)</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 size={20} className="text-secondary" />
              <span>Taxa de recebimento e valores médios</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 size={20} className="text-secondary" />
              <span>Quantidade de registros</span>
            </li>
          </ul>
        </Card>
      </div>

      {/* KPIs */}
      <div className="space-y-4">
        <h2 className="text-heading text-foreground">📈 Indicadores-Chave Calculados</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { title: 'Taxa de Recebimento', desc: 'Percentual de valores já recebidos' },
            { title: 'Ticket Médio', desc: 'Valor médio por contrato' },
            { title: 'Valor Médio por Parcela', desc: 'Valor médio de cada parcela' },
            { title: 'Percentual de Equipamentos', desc: 'Proporção de equipamentos no faturamento' }
          ].map((kpi) => (
            <Card key={kpi.title} className="card-premium p-4">
              <h4 className="font-semibold text-foreground mb-1">{kpi.title}</h4>
              <p className="text-sm text-muted-foreground">{kpi.desc}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
