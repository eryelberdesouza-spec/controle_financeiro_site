import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

const faqs = [
  { q: "Como alterar o status de um pagamento?", a: "Clique no ícone de edição (lápis) ao lado do registro, altere o campo 'Status' para o valor desejado e clique em 'Salvar Alterações'." },
  { q: "Posso registrar pagamentos em parcelas?", a: "Sim! No módulo de Recebimentos, informe a quantidade de parcelas e a parcela atual. Cada parcela pode ser registrada como um recebimento separado." },
  { q: "Como filtrar pagamentos por período?", a: "Na listagem de Pagamentos ou Recebimentos, use os filtros de busca. Você pode filtrar por nome, CPF/contrato e status." },
  { q: "O que significa cada status de pagamento?", a: "Pendente: aguardando autorização ou processamento. Processando: em andamento. Pago: concluído. Cancelado: não será realizado." },
  { q: "O que significa cada status de recebimento?", a: "Pendente: aguardando recebimento. Recebido: valor já recebido. Atrasado: passou da data de vencimento. Cancelado: não será recebido." },
  { q: "Como funciona o Dashboard?", a: "O Dashboard exibe automaticamente os totais de pagamentos e recebimentos, o fluxo de caixa (diferença entre os dois) e a composição por equipamentos e serviços. Os dados são atualizados em tempo real." },
  { q: "Posso excluir um registro?", a: "Sim, clique no ícone de lixeira ao lado do registro. Uma confirmação será solicitada antes da exclusão permanente." },
  { q: "Como separar valores de equipamento e serviço?", a: "Ao cadastrar um recebimento, preencha os campos 'Valor Equipamento' e 'Valor Serviço' separadamente. A soma deve ser igual ao Valor Total. Isso permite análises de composição de faturamento nos relatórios." },
  { q: "O sistema funciona em celular?", a: "Sim! O sistema é responsivo e funciona em dispositivos móveis. Algumas colunas da tabela ficam ocultas em telas menores para melhor visualização." },
  { q: "Como registrar um pagamento autorizado por outra pessoa?", a: "Preencha o campo 'Autorizado Por' com o nome do responsável pela autorização. Isso cria um histórico de rastreabilidade dos pagamentos." },
  { q: "Posso usar o sistema sem fazer login?", a: "Não. O sistema requer autenticação para garantir a segurança dos dados financeiros da empresa." },
  { q: "Como acessar os relatórios?", a: "Clique em 'Relatórios' no menu lateral. Você verá análises automáticas de pagamentos por status, recebimentos por status, composição de faturamento e indicadores de inadimplência." },
];

export default function Faq() {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Perguntas Frequentes</h1>
          <p className="text-muted-foreground text-sm mt-1">Respostas para as dúvidas mais comuns</p>
        </div>

        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <Card key={i} className="overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === i ? null : i)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
              >
                <span className="font-medium text-foreground pr-4">{faq.q}</span>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${expanded === i ? "rotate-180" : ""}`}
                />
              </button>
              {expanded === i && (
                <CardContent className="pt-0 pb-4 px-4 border-t">
                  <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <p className="text-sm text-foreground font-medium mb-1">Não encontrou a resposta?</p>
            <p className="text-sm text-muted-foreground">Entre em contato com o administrador do sistema para obter suporte adicional.</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
