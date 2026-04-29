import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  BarChart3,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  GitMerge,
  TrendingUp,
  Wallet,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import Pagamentos from "./Pagamentos";
import Recebimentos from "./Recebimentos";

// Aba de Visão Geral com resumo financeiro
function VisaoGeral() {
  const [, setLocation] = useLocation();
  const [periodoInput] = useState(() => ({
    dataInicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    dataFim: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
  }));
  const { data: dashboard } = trpc.dashboard.stats.useQuery(periodoInput);

  const totalPagar = dashboard?.pagamentos?.totalGeral ?? 0;
  const totalReceber = dashboard?.recebimentos?.totalPendente ?? 0;
  const totalRecebido = dashboard?.recebimentos?.totalRecebido ?? 0;
  const saldo = totalRecebido - totalPagar;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ArrowDownCircle className="h-4 w-4 text-blue-500" />
              Total a Receber
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">
              {(totalReceber).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Pendente no mês</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Total Recebido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {totalRecebido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Confirmado no mês</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ArrowUpCircle className="h-4 w-4 text-red-500" />
              Total a Pagar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              {totalPagar.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Compras e custos</p>
          </CardContent>
        </Card>

        <Card className={`border-l-4 ${saldo >= 0 ? "border-l-emerald-500" : "border-l-orange-500"}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className={`h-4 w-4 ${saldo >= 0 ? "text-emerald-500" : "text-orange-500"}`} />
              Fluxo de Caixa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${saldo >= 0 ? "text-emerald-600" : "text-orange-600"}`}>
              {saldo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Recebido − Pago</p>
          </CardContent>
        </Card>
      </div>

      {/* Atalhos rápidos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: ArrowUpCircle, label: "Contas a Pagar", desc: "Gerenciar pagamentos e despesas", color: "text-red-500", bg: "bg-red-50 hover:bg-red-100 border-red-200", action: () => setLocation("/pagamentos") },
          { icon: ArrowDownCircle, label: "Contas a Receber", desc: "Gerenciar recebimentos e cobranças", color: "text-blue-500", bg: "bg-blue-50 hover:bg-blue-100 border-blue-200", action: () => setLocation("/recebimentos") },
          { icon: BarChart3, label: "Relatórios", desc: "Análises e exportações", color: "text-purple-500", bg: "bg-purple-50 hover:bg-purple-100 border-purple-200", action: () => setLocation("/relatorios") },
          { icon: FileText, label: "Extrato por Cliente", desc: "Histórico por cliente/parceiro", color: "text-amber-500", bg: "bg-amber-50 hover:bg-amber-100 border-amber-200", action: () => setLocation("/extrato-cliente") },
        ].map(({ icon: Icon, label, desc, color, bg, action }) => (
          <button
            key={label}
            onClick={action}
            className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-colors ${bg}`}
          >
            <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${color}`} />
            <div>
              <p className="font-semibold text-sm">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Avisos de funcionalidades em desenvolvimento */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { icon: GitMerge, title: "Lançamentos", desc: "Lançamentos manuais e ajustes contábeis — em desenvolvimento" },
          { icon: Clock, title: "Aprovações", desc: "Fluxo de aprovação de pagamentos — em desenvolvimento" },
          { icon: Wallet, title: "Conciliação", desc: "Conciliação bancária automática — em desenvolvimento" },
          { icon: AlertCircle, title: "Relatórios Financeiros", desc: "DRE, Balanço e Fluxo de Caixa projetado — em desenvolvimento" },
        ].map(({ icon: Icon, title, desc }) => (
          <Card key={title} className="opacity-70">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                {title}
                <Badge variant="secondary" className="text-[10px] ml-auto">Em breve</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Aba placeholder para funcionalidades em desenvolvimento
function EmDesenvolvimento({ titulo, descricao }: { titulo: string; descricao: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
        <Clock className="h-8 w-8 text-muted-foreground" />
      </div>
      <div>
        <h3 className="text-lg font-semibold">{titulo}</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">{descricao}</p>
      </div>
      <Badge variant="secondary">Em desenvolvimento</Badge>
    </div>
  );
}

const TABS = [
  { value: "visao-geral", label: "Visão Geral", icon: DollarSign },
  { value: "contas-pagar", label: "Contas a Pagar", icon: ArrowUpCircle },
  { value: "contas-receber", label: "Contas a Receber", icon: ArrowDownCircle },
  { value: "lancamentos", label: "Lançamentos", icon: GitMerge },
  { value: "aprovacoes", label: "Aprovações", icon: CheckCircle2 },
  { value: "fluxo-caixa", label: "Fluxo de Caixa", icon: TrendingUp },
  { value: "conciliacao", label: "Conciliação", icon: Wallet },
  { value: "relatorios", label: "Relatórios Financeiros", icon: BarChart3 },
];

export default function Financeiro() {
  const [tab, setTab] = useState("visao-geral");
  const [, setLocation] = useLocation();

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Financeiro</h1>
            <p className="text-sm text-muted-foreground">
              Gestão financeira completa — pagamentos, recebimentos, fluxo de caixa e conciliação
            </p>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          {/* Abas em scroll horizontal para mobile */}
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <TabsList className="inline-flex h-10 min-w-max bg-muted/60 p-1 gap-0.5">
              {TABS.map(({ value, label, icon: Icon }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="flex items-center gap-1.5 text-xs px-3 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="visao-geral" className="mt-0">
            <VisaoGeral />
          </TabsContent>

          {/* Contas a Pagar — embeds a página Pagamentos existente sem o DashboardLayout */}
          <TabsContent value="contas-pagar" className="mt-0">
            <div className="flex items-center gap-2 mb-4">
              <ArrowUpCircle className="h-5 w-5 text-red-500" />
              <h2 className="text-lg font-semibold">Contas a Pagar</h2>
              <Badge variant="outline" className="text-xs">Compras · Despesas · Pagamentos</Badge>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto text-xs gap-1 text-muted-foreground"
                onClick={() => setLocation("/pagamentos")}
              >
                <ExternalLink className="h-3 w-3" />
                Abrir em tela cheia
              </Button>
            </div>
            <PagamentosEmbed />
          </TabsContent>

          {/* Contas a Receber — embeds a página Recebimentos existente sem o DashboardLayout */}
          <TabsContent value="contas-receber" className="mt-0">
            <div className="flex items-center gap-2 mb-4">
              <ArrowDownCircle className="h-5 w-5 text-blue-500" />
              <h2 className="text-lg font-semibold">Contas a Receber</h2>
              <Badge variant="outline" className="text-xs">Cobranças · Recebimentos · Parcelas</Badge>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto text-xs gap-1 text-muted-foreground"
                onClick={() => setLocation("/recebimentos")}
              >
                <ExternalLink className="h-3 w-3" />
                Abrir em tela cheia
              </Button>
            </div>
            <RecebimentosEmbed />
          </TabsContent>

          <TabsContent value="lancamentos" className="mt-0">
            <EmDesenvolvimento
              titulo="Lançamentos Manuais"
              descricao="Registre ajustes contábeis, transferências entre contas e lançamentos avulsos. Esta funcionalidade será implementada na próxima versão."
            />
          </TabsContent>

          <TabsContent value="aprovacoes" className="mt-0">
            <EmDesenvolvimento
              titulo="Aprovações"
              descricao="Fluxo de aprovação para pagamentos acima de determinado valor. Configure alçadas de aprovação por perfil de usuário."
            />
          </TabsContent>

          <TabsContent value="fluxo-caixa" className="mt-0">
            <EmDesenvolvimento
              titulo="Fluxo de Caixa"
              descricao="Projeção de fluxo de caixa com base em contas a pagar e a receber. Visualize o saldo projetado para os próximos meses."
            />
          </TabsContent>

          <TabsContent value="conciliacao" className="mt-0">
            <EmDesenvolvimento
              titulo="Conciliação Bancária"
              descricao="Importe extratos bancários e concilie automaticamente com os lançamentos do sistema. Identifique divergências e pendências."
            />
          </TabsContent>

          <TabsContent value="relatorios" className="mt-0">
            <EmDesenvolvimento
              titulo="Relatórios Financeiros"
              descricao="DRE (Demonstrativo de Resultado), Balanço Patrimonial e Fluxo de Caixa projetado. Exporte em PDF ou Excel."
            />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

// Versão embed do Pagamentos (sem DashboardLayout, sem header duplicado)
function PagamentosEmbed() {
  // Reutiliza o conteúdo do Pagamentos mas sem o wrapper DashboardLayout
  // Para evitar duplicação de código, redirecionamos para a página completa
  // em uma div com overflow controlado
  const [, setLocation] = useLocation();
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="p-6 text-center space-y-3">
        <ArrowUpCircle className="h-10 w-10 text-red-400 mx-auto" />
        <div>
          <h3 className="font-semibold">Contas a Pagar</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie todas as compras, despesas e pagamentos da empresa.
          </p>
        </div>
        <Button
          className="bg-red-600 hover:bg-red-700 text-white gap-2"
          onClick={() => setLocation("/pagamentos")}
        >
          <ArrowUpCircle className="h-4 w-4" />
          Acessar Contas a Pagar
        </Button>
      </div>
    </div>
  );
}

function RecebimentosEmbed() {
  const [, setLocation] = useLocation();
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="p-6 text-center space-y-3">
        <ArrowDownCircle className="h-10 w-10 text-blue-400 mx-auto" />
        <div>
          <h3 className="font-semibold">Contas a Receber</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie todos os recebimentos, cobranças e parcelas de contratos.
          </p>
        </div>
        <Button
          className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
          onClick={() => setLocation("/recebimentos")}
        >
          <ArrowDownCircle className="h-4 w-4" />
          Acessar Contas a Receber
        </Button>
      </div>
    </div>
  );
}
