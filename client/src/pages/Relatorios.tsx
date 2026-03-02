import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { BarChart3, TrendingUp, TrendingDown, PieChart } from "lucide-react";

function formatCurrency(value: any) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(parseFloat(value ?? 0));
}

function pct(part: any, total: any) {
  const p = parseFloat(part ?? 0);
  const t = parseFloat(total ?? 0);
  if (!t) return "0%";
  return ((p / t) * 100).toFixed(1) + "%";
}

export default function Relatorios() {
  const { data: stats } = trpc.dashboard.stats.useQuery();
  const { data: pagStats } = trpc.pagamentos.stats.useQuery();
  const { data: recStats } = trpc.recebimentos.stats.useQuery();

  const totalRec = parseFloat(String(stats?.recebimentos?.totalGeral ?? 0));
  const totalPag = parseFloat(String(stats?.pagamentos?.totalGeral ?? 0));
  const fluxo = totalRec - totalPag;
  const taxaRecebimento = totalRec > 0
    ? ((parseFloat(String(stats?.recebimentos?.totalRecebido ?? 0)) / totalRec) * 100).toFixed(1)
    : "0";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
          <p className="text-muted-foreground text-sm mt-1">Análises automáticas do seu fluxo financeiro</p>
        </div>

        {/* KPIs Principais */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Fluxo de Caixa", value: formatCurrency(fluxo), color: fluxo >= 0 ? "text-green-600" : "text-red-600", icon: TrendingUp },
            { label: "Taxa de Recebimento", value: `${taxaRecebimento}%`, color: "text-blue-600", icon: PieChart },
            { label: "Total Recebimentos", value: formatCurrency(totalRec), color: "text-green-600", icon: TrendingDown },
            { label: "Total Pagamentos", value: formatCurrency(totalPag), color: "text-red-600", icon: BarChart3 },
          ].map(kpi => {
            const Icon = kpi.icon;
            return (
              <Card key={kpi.label}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  </div>
                  <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pagamentos por Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pagamentos por Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pagStats?.map(row => (
                <div key={row.status} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground">{row.status}</span>
                    <span className="font-semibold">{formatCurrency(row.total)} ({row.count} reg.)</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: pct(row.total, stats?.pagamentos?.totalGeral) }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-right">{pct(row.total, stats?.pagamentos?.totalGeral)} do total</p>
                </div>
              ))}
              {(!pagStats || pagStats.length === 0) && (
                <p className="text-muted-foreground text-sm">Nenhum dado disponível.</p>
              )}
            </CardContent>
          </Card>

          {/* Recebimentos por Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recebimentos por Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recStats?.map(row => (
                <div key={row.status} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground">{row.status}</span>
                    <span className="font-semibold">{formatCurrency(row.total)} ({row.count} reg.)</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: pct(row.total, stats?.recebimentos?.totalGeral) }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-right">{pct(row.total, stats?.recebimentos?.totalGeral)} do total</p>
                </div>
              ))}
              {(!recStats || recStats.length === 0) && (
                <p className="text-muted-foreground text-sm">Nenhum dado disponível.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Composição de Faturamento */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Composição de Faturamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                <p className="text-sm text-muted-foreground mb-1">Equipamentos</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats?.recebimentos?.totalEquipamento)}</p>
                <p className="text-xs text-muted-foreground mt-1">{pct(stats?.recebimentos?.totalEquipamento, stats?.recebimentos?.totalGeral)} do total</p>
              </div>
              <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-center">
                <p className="text-sm text-muted-foreground mb-1">Serviços</p>
                <p className="text-2xl font-bold text-indigo-600">{formatCurrency(stats?.recebimentos?.totalServico)}</p>
                <p className="text-xs text-muted-foreground mt-1">{pct(stats?.recebimentos?.totalServico, stats?.recebimentos?.totalGeral)} do total</p>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                <p className="text-sm text-muted-foreground mb-1">Total Geral</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(stats?.recebimentos?.totalGeral)}</p>
                <p className="text-xs text-muted-foreground mt-1">100%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Análise de Inadimplência */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Análise de Inadimplência</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">Total Atrasado</p>
                <p className="text-xl font-bold text-red-600 mt-1">{formatCurrency(stats?.recebimentos?.totalAtrasado)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {pct(stats?.recebimentos?.totalAtrasado, stats?.recebimentos?.totalGeral)} do total a receber
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">Taxa de Recebimento</p>
                <p className="text-xl font-bold text-green-600 mt-1">{taxaRecebimento}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatCurrency(stats?.recebimentos?.totalRecebido)} recebido de {formatCurrency(stats?.recebimentos?.totalGeral)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
