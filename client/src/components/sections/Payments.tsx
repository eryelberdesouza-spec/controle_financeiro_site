import { Card } from '@/components/ui/card';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function Payments() {
  const fields = [
    { name: 'Nome Completo', desc: 'Nome do beneficiário', validation: 'Texto livre' },
    { name: 'CPF', desc: 'CPF do beneficiário', validation: 'Deve conter 11 dígitos' },
    { name: 'Banco', desc: 'Banco do beneficiário', validation: 'Lista suspensa com opções' },
    { name: 'Chave Pix', desc: 'Chave Pix para transferência', validation: 'Texto livre (CPF, email, telefone ou aleatória)' },
    { name: 'Tipo de Serviço', desc: 'Categoria do serviço', validation: 'Lista suspensa: Consultoria, Desenvolvimento, Suporte, Manutenção, Treinamento, Outro' },
    { name: 'Centro de Custo', desc: 'Departamento responsável', validation: 'Lista suspensa: Administrativo, Operacional, Comercial, TI, RH, Financeiro, Outro' },
    { name: 'Valor (R$)', desc: 'Valor do pagamento', validation: 'Deve ser positivo' },
    { name: 'Data Pagamento', desc: 'Quando será realizado', validation: 'Não pode ser anterior a hoje' },
    { name: 'Status', desc: 'Situação do pagamento', validation: 'Pendente, Processando, Pago, Cancelado' },
    { name: 'Observações', desc: 'Notas adicionais', validation: 'Texto livre' }
  ];

  const features = [
    { icon: '📊', title: 'Coluna "Dias até Pgto"', desc: 'Calcula automaticamente quantos dias faltam para o pagamento' },
    { icon: '➕', title: 'Total de Pagamentos', desc: 'Soma automática de todos os valores' },
    { icon: '📈', title: 'Relatórios', desc: 'Aba separada com análises por status e centro de custo' }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-display text-primary">📤 Planilha de Pagamentos</h1>
        <p className="text-lg text-muted-foreground">
          Gerencia todos os pagamentos via Pix com validações automáticas e relatórios consolidados.
        </p>
      </div>

      {/* Fields Table */}
      <div className="space-y-4">
        <h2 className="text-heading text-foreground">Campos Disponíveis</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-primary text-primary-foreground">
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <div><span className="text-primary font-semibold">Nome Completo:</span> João Silva</div>
            <div><span className="text-primary font-semibold">CPF:</span> 12345678901</div>
            <div><span className="text-primary font-semibold">Banco:</span> Banco do Brasil</div>
            <div><span className="text-primary font-semibold">Chave Pix:</span> joao@email.com</div>
            <div><span className="text-primary font-semibold">Tipo de Serviço:</span> Consultoria</div>
            <div><span className="text-primary font-semibold">Centro de Custo:</span> Administrativo</div>
            <div><span className="text-primary font-semibold">Valor:</span> R$ 1.500,00</div>
            <div><span className="text-primary font-semibold">Data Pagamento:</span> 15/03/2026</div>
            <div><span className="text-primary font-semibold">Status:</span> Pendente</div>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-50/50 dark:from-blue-900/20 dark:to-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <div className="flex gap-4">
          <AlertCircle className="text-blue-600 dark:text-blue-400 flex-shrink-0" size={24} />
          <div>
            <h3 className="font-semibold text-foreground mb-2">💡 Dicas Importantes</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>✓ Use as listas suspensas para evitar erros de digitação</li>
              <li>✓ O CPF deve conter exatamente 11 dígitos</li>
              <li>✓ A data de pagamento não pode ser anterior a hoje</li>
              <li>✓ Os valores devem ser sempre positivos</li>
              <li>✓ Atualize o status conforme o pagamento avança</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Reports Section */}
      <div className="space-y-4">
        <h2 className="text-heading text-foreground">📊 Relatórios Automáticos</h2>
        <Card className="card-premium p-6">
          <p className="text-muted-foreground mb-4">
            A aba "Relatórios" na planilha de Pagamentos inclui análises automáticas:
          </p>
          <ul className="space-y-2 text-foreground">
            <li className="flex items-center gap-2">
              <CheckCircle2 size={20} className="text-secondary" />
              <span>Total de pagamentos</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 size={20} className="text-secondary" />
              <span>Pagamentos por status (Pendente, Processando, Pago, Cancelado)</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 size={20} className="text-secondary" />
              <span>Análise por centro de custo</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 size={20} className="text-secondary" />
              <span>Quantidade de registros</span>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
