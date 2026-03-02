import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, ArrowUpCircle, ArrowDownCircle, BarChart3, CheckCircle2 } from "lucide-react";

export default function Guia() {
  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Guia de Uso</h1>
          <p className="text-muted-foreground text-sm mt-1">Aprenda a usar o sistema de controle financeiro</p>
        </div>

        {/* Visão Geral */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Visão Geral do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>O <strong className="text-foreground">FinControl</strong> é um sistema completo para gerenciar pagamentos e recebimentos da sua empresa. Todos os dados são armazenados em banco de dados seguro e acessíveis em tempo real.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
              {[
                { icon: ArrowUpCircle, label: "Pagamentos", desc: "Gerencie e autorize pagamentos via Pix", color: "text-red-500" },
                { icon: ArrowDownCircle, label: "Recebimentos", desc: "Controle recebimentos e contratos", color: "text-green-500" },
                { icon: BarChart3, label: "Relatórios", desc: "Análises automáticas em tempo real", color: "text-blue-500" },
              ].map(item => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="p-3 border rounded-lg">
                    <Icon className={`h-5 w-5 ${item.color} mb-2`} />
                    <p className="font-semibold text-foreground">{item.label}</p>
                    <p className="text-xs mt-1">{item.desc}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Como Cadastrar Pagamentos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowUpCircle className="h-4 w-4 text-red-500" />
              Como Cadastrar Pagamentos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ol className="space-y-3">
              {[
                "Clique em \"Pagamentos\" no menu lateral",
                "Clique no botão \"Novo Pagamento\"",
                "Preencha o nome completo do beneficiário (obrigatório)",
                "Informe CPF, banco e chave Pix",
                "Selecione o tipo de serviço e centro de custo",
                "Informe o valor e a data de pagamento",
                "Defina o status (Pendente, Processando, Pago ou Cancelado)",
                "Adicione o nome do autorizador para controle interno",
                "Clique em \"Cadastrar Pagamento\""
              ].map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</span>
                  <span className="text-muted-foreground pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        {/* Como Cadastrar Recebimentos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowDownCircle className="h-4 w-4 text-green-500" />
              Como Cadastrar Recebimentos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ol className="space-y-3">
              {[
                "Clique em \"Recebimentos\" no menu lateral",
                "Clique no botão \"Novo Recebimento\"",
                "Informe o nome ou razão social do cliente (obrigatório)",
                "Adicione o número do contrato (se houver)",
                "Selecione o tipo de recebimento (Pix, Boleto, etc.)",
                "Informe o valor total, separando equipamentos e serviços",
                "Defina a quantidade de parcelas e a parcela atual",
                "Informe a data de vencimento",
                "Clique em \"Cadastrar Recebimento\""
              ].map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</span>
                  <span className="text-muted-foreground pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        {/* Campos de Pagamentos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Campos de Pagamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium text-muted-foreground">Campo</th>
                    <th className="text-left p-2 font-medium text-muted-foreground">Obrigatório</th>
                    <th className="text-left p-2 font-medium text-muted-foreground">Descrição</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  {[
                    ["Nome Completo", "Sim", "Nome do beneficiário do pagamento"],
                    ["CPF", "Não", "CPF do beneficiário"],
                    ["Banco", "Não", "Banco do beneficiário"],
                    ["Tipo de Chave Pix", "Não", "CPF, CNPJ, Email, Telefone ou Chave Aleatória"],
                    ["Chave Pix", "Não", "A chave Pix para transferência"],
                    ["Tipo de Serviço", "Não", "Categoria do serviço prestado"],
                    ["Centro de Custo", "Não", "Departamento responsável"],
                    ["Valor", "Sim", "Valor em reais do pagamento"],
                    ["Data de Pagamento", "Sim", "Data prevista ou realizada"],
                    ["Status", "Sim", "Pendente, Processando, Pago ou Cancelado"],
                    ["Autorizado Por", "Não", "Nome do responsável pela autorização"],
                  ].map(([campo, obrig, desc]) => (
                    <tr key={campo} className="border-b last:border-0">
                      <td className="p-2 font-medium text-foreground">{campo}</td>
                      <td className="p-2">{obrig === "Sim" ? <span className="text-red-500 font-medium">Sim</span> : "Não"}</td>
                      <td className="p-2">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Campos de Recebimentos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Campos de Recebimentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium text-muted-foreground">Campo</th>
                    <th className="text-left p-2 font-medium text-muted-foreground">Obrigatório</th>
                    <th className="text-left p-2 font-medium text-muted-foreground">Descrição</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  {[
                    ["Nome / Razão Social", "Sim", "Nome do cliente ou empresa"],
                    ["Número do Contrato", "Não", "Identificador do contrato"],
                    ["Tipo de Recebimento", "Sim", "Pix, Boleto, Transferência, Cartão, Dinheiro"],
                    ["Valor Total", "Sim", "Valor total a receber"],
                    ["Valor Equipamento", "Não", "Parcela referente a equipamentos"],
                    ["Valor Serviço", "Não", "Parcela referente a serviços"],
                    ["Qtd. Parcelas", "Sim", "Número total de parcelas"],
                    ["Parcela Atual", "Não", "Número da parcela atual"],
                    ["Data de Vencimento", "Sim", "Data de vencimento do recebimento"],
                    ["Data de Recebimento", "Não", "Data em que foi efetivamente recebido"],
                    ["Status", "Sim", "Pendente, Recebido, Atrasado ou Cancelado"],
                  ].map(([campo, obrig, desc]) => (
                    <tr key={campo} className="border-b last:border-0">
                      <td className="p-2 font-medium text-foreground">{campo}</td>
                      <td className="p-2">{obrig === "Sim" ? <span className="text-red-500 font-medium">Sim</span> : "Não"}</td>
                      <td className="p-2">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Boas Práticas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Boas Práticas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {[
                "Atualize o status dos pagamentos assim que forem realizados",
                "Marque recebimentos como 'Atrasado' quando passarem da data de vencimento",
                "Separe sempre os valores de equipamento e serviço para análises mais precisas",
                "Use o campo 'Autorizado Por' para rastreabilidade dos pagamentos",
                "Consulte o Dashboard regularmente para acompanhar o fluxo de caixa",
                "Utilize os filtros de busca para localizar registros rapidamente",
              ].map((tip, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
