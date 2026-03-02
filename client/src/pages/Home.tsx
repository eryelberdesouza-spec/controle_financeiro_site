import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ArrowDownCircle, ArrowUpCircle, TrendingUp, Wallet } from "lucide-react";
import { useLocation } from "wouter";

function formatCurrency(value: number | string | null | undefined) {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num || 0);
}

export default function Home() {
  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery();
  const [, setLocation] = useLocation();

  const totalRecebimentos = parseFloat(String(stats?.recebimentos?.totalGeral ?? 0));
  const totalPagamentos = parseFloat(String(stats?.pagamentos?.totalGeral ?? 0));
  const fluxoCaixa = totalRecebimentos - totalPagamentos;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard Financeiro</h1>
          <p className="text-muted-foreground mt-1">Visão geral consolidada do fluxo de caixa</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ArrowDownCircle className="h-4 w-4 text-green-500" />
                Total Recebimentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(stats?.recebimentos?.totalGeral)}</p>
              <p className="text-xs text-muted-foreground mt-1">{stats?.recebimentos?.count ?? 0} registros</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ArrowUpCircle className="h-4 w-4 text-red-500" />
                Total Pagamentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(stats?.pagamentos?.totalGeral)}</p>
              <p className="text-xs text-muted-foreground mt-1">{stats?.pagamentos?.count ?? 0} registros</p>
            </CardContent>
          </Card>

          <Card className={`border-l-4 ${fluxoCaixa >= 0 ? "border-l-blue-500" : "border-l-orange-500"}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                Fluxo de Caixa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${fluxoCaixa >= 0 ? "text-blue-600" : "text-orange-600"}`}>
                {formatCurrency(fluxoCaixa)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Recebimentos - Pagamentos</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Wallet className="h-4 w-4 text-purple-500" />
                A Receber (Pendente)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-purple-600">{formatCurrency(stats?.recebimentos?.totalPendente)}</p>
              <p className="text-xs text-muted-foreground mt-1">Aguardando recebimento</p>
            </CardContent>
          </Card>
        </div>

        {/* Status Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowUpCircle className="h-4 w-4 text-red-500" />
                Pagamentos por Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <p className="text-muted-foreground text-sm">Carregando...</p>
              ) : (
                <>
                  <StatusRow label="Pendente" value={stats?.pagamentos?.totalPendente} color="text-yellow-600" bg="bg-yellow-50 dark:bg-yellow-900/20" />
                  <StatusRow label="Pago" value={stats?.pagamentos?.totalPago} color="text-green-600" bg="bg-green-50 dark:bg-green-900/20" />
                  <div className="pt-2 border-t">
                    <StatusRow label="Total Geral" value={stats?.pagamentos?.totalGeral} color="text-foreground font-bold" bg="bg-muted" />
                  </div>
                </>
              )}
              <button
                onClick={() => setLocation("/pagamentos")}
                className="w-full text-sm text-primary hover:underline mt-2 text-left"
              >
                Ver todos os pagamentos →
              </button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowDownCircle className="h-4 w-4 text-green-500" />
                Recebimentos por Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <p className="text-muted-foreground text-sm">Carregando...</p>
              ) : (
                <>
                  <StatusRow label="Pendente" value={stats?.recebimentos?.totalPendente} color="text-yellow-600" bg="bg-yellow-50 dark:bg-yellow-900/20" />
                  <StatusRow label="Recebido" value={stats?.recebimentos?.totalRecebido} color="text-green-600" bg="bg-green-50 dark:bg-green-900/20" />
                  <StatusRow label="Atrasado" value={stats?.recebimentos?.totalAtrasado} color="text-red-600" bg="bg-red-50 dark:bg-red-900/20" />
                  <div className="pt-2 border-t">
                    <StatusRow label="Total Geral" value={stats?.recebimentos?.totalGeral} color="text-foreground font-bold" bg="bg-muted" />
                  </div>
                </>
              )}
              <button
                onClick={() => setLocation("/recebimentos")}
                className="w-full text-sm text-primary hover:underline mt-2 text-left"
              >
                Ver todos os recebimentos →
              </button>
            </CardContent>
          </Card>
        </div>

        {/* Composição */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Composição de Faturamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-muted-foreground">Total Equipamentos</p>
                <p className="text-xl font-bold text-blue-600 mt-1">{formatCurrency(stats?.recebimentos?.totalEquipamento)}</p>
              </div>
              <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                <p className="text-sm text-muted-foreground">Total Serviços</p>
                <p className="text-xl font-bold text-indigo-600 mt-1">{formatCurrency(stats?.recebimentos?.totalServico)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function StatusRow({ label, value, color, bg }: { label: string; value: any; color: string; bg: string }) {
  return (
    <div className={`flex justify-between items-center p-2 rounded ${bg}`}>
      <span className="text-sm text-foreground">{label}</span>
      <span className={`text-sm font-semibold ${color}`}>{formatCurrency(value)}</span>
    </div>
  );
}
