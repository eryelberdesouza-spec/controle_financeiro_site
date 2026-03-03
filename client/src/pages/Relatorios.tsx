import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { BarChart3, TrendingUp, TrendingDown, PieChart, Printer, Download } from "lucide-react";

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
  const { data: pagamentos = [] } = trpc.pagamentos.list.useQuery();
  const { data: recebimentos = [] } = trpc.recebimentos.list.useQuery();

  const totalRec = parseFloat(String(stats?.recebimentos?.totalGeral ?? 0));
  const totalPag = parseFloat(String(stats?.pagamentos?.totalGeral ?? 0));
  const fluxo = totalRec - totalPag;
  const taxaRecebimento = totalRec > 0
    ? ((parseFloat(String(stats?.recebimentos?.totalRecebido ?? 0)) / totalRec) * 100).toFixed(1)
    : "0";

  const handlePrint = () => window.print();

  const exportRelatorio = () => {
    const now = new Date().toLocaleDateString("pt-BR");
    const lines = [
      `RELATÓRIO FINANCEIRO - ${now}`,
      ``,
      `=== RESUMO GERAL ===`,
      `Total Recebimentos: ${formatCurrency(totalRec)}`,
      `Total Pagamentos: ${formatCurrency(totalPag)}`,
      `Fluxo de Caixa: ${formatCurrency(fluxo)}`,
      `Taxa de Recebimento: ${taxaRecebimento}%`,
      ``,
      `=== PAGAMENTOS POR STATUS ===`,
      ...(pagStats ?? []).map(r => `${r.status}: ${formatCurrency(r.total)} (${r.count} registros)`),
      ``,
      `=== RECEBIMENTOS POR STATUS ===`,
      ...(recStats ?? []).map(r => `${r.status}: ${formatCurrency(r.total)} (${r.count} registros)`),
      ``,
      `=== COMPOSIÇÃO DE FATURAMENTO ===`,
      `Equipamentos: ${formatCurrency(stats?.recebimentos?.totalEquipamento)} (${pct(stats?.recebimentos?.totalEquipamento, totalRec)})`,
      `Serviços: ${formatCurrency(stats?.recebimentos?.totalServico)} (${pct(stats?.recebimentos?.totalServico, totalRec)})`,
      ``,
      `=== ANÁLISE DE INADIMPLÊNCIA ===`,
      `Total Atrasado: ${formatCurrency(stats?.recebimentos?.totalAtrasado)}`,
      `Percentual: ${pct(stats?.recebimentos?.totalAtrasado, totalRec)}`,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `relatorio_financeiro_${new Date().toISOString().split("T")[0]}.txt`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      {/* Estilos de impressão via style tag inline */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #relatorio-print, #relatorio-print * { visibility: visible; }
          #relatorio-print { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          .print-break { page-break-after: always; }
        }
      `}</style>

      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3 no-print">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
            <p className="text-muted-foreground text-sm mt-1">Análises automáticas do fluxo financeiro</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportRelatorio} className="gap-2">
              <Download className="h-4 w-4" /> Exportar TXT
            </Button>
            <Button variant="outline" onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" /> Imprimir
            </Button>
          </div>
        </div>

        <div id="relatorio-print">
          {/* Cabeçalho para impressão */}
          <div className="hidden print:block mb-6 border-b pb-4">
            <h1 className="text-2xl font-bold">Relatório Financeiro</h1>
            <p className="text-sm text-muted-foreground">Gerado em {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</p>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {/* Pagamentos por Status */}
            <Card>
              <CardHeader><CardTitle className="text-base">Pagamentos por Status</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {pagStats?.map(row => (
                  <div key={row.status} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground font-medium">{row.status}</span>
                      <span className="font-semibold">{formatCurrency(row.total)} <span className="text-muted-foreground font-normal">({row.count} reg.)</span></span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: pct(row.total, stats?.pagamentos?.totalGeral) }} />
                    </div>
                    <p className="text-xs text-muted-foreground text-right">{pct(row.total, stats?.pagamentos?.totalGeral)} do total</p>
                  </div>
                ))}
                {(!pagStats || pagStats.length === 0) && <p className="text-muted-foreground text-sm">Nenhum dado disponível.</p>}
              </CardContent>
            </Card>

            {/* Recebimentos por Status */}
            <Card>
              <CardHeader><CardTitle className="text-base">Recebimentos por Status</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {recStats?.map(row => (
                  <div key={row.status} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground font-medium">{row.status}</span>
                      <span className="font-semibold">{formatCurrency(row.total)} <span className="text-muted-foreground font-normal">({row.count} reg.)</span></span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: pct(row.total, stats?.recebimentos?.totalGeral) }} />
                    </div>
                    <p className="text-xs text-muted-foreground text-right">{pct(row.total, stats?.recebimentos?.totalGeral)} do total</p>
                  </div>
                ))}
                {(!recStats || recStats.length === 0) && <p className="text-muted-foreground text-sm">Nenhum dado disponível.</p>}
              </CardContent>
            </Card>
          </div>

          {/* Composição de Faturamento */}
          <Card className="mt-6">
            <CardHeader><CardTitle className="text-base">Composição de Faturamento</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground mb-1">Equipamentos</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats?.recebimentos?.totalEquipamento)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{pct(stats?.recebimentos?.totalEquipamento, totalRec)} do total</p>
                </div>
                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground mb-1">Serviços</p>
                  <p className="text-2xl font-bold text-indigo-600">{formatCurrency(stats?.recebimentos?.totalServico)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{pct(stats?.recebimentos?.totalServico, totalRec)} do total</p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground mb-1">Total Geral</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(totalRec)}</p>
                  <p className="text-xs text-muted-foreground mt-1">100%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Análise de Inadimplência */}
          <Card className="mt-6">
            <CardHeader><CardTitle className="text-base">Análise de Inadimplência</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Atrasado</p>
                  <p className="text-xl font-bold text-red-600 mt-1">{formatCurrency(stats?.recebimentos?.totalAtrasado)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{pct(stats?.recebimentos?.totalAtrasado, totalRec)} do total a receber</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Taxa de Recebimento</p>
                  <p className="text-xl font-bold text-green-600 mt-1">{taxaRecebimento}%</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatCurrency(stats?.recebimentos?.totalRecebido)} recebido de {formatCurrency(totalRec)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabela resumo de pagamentos para impressão */}
          <Card className="mt-6">
            <CardHeader><CardTitle className="text-base">Últimos Pagamentos</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium text-muted-foreground">Nº Controle</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Nome</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Serviço</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Valor</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Data</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagamentos.slice(0, 10).map(p => (
                      <tr key={p.id} className="border-b">
                        <td className="p-3 font-mono text-xs text-muted-foreground">{p.numeroControle || "-"}</td>
                        <td className="p-3">{p.nomeCompleto}</td>
                        <td className="p-3 text-muted-foreground">{p.tipoServico || "-"}</td>
                        <td className="p-3 text-right font-semibold">{formatCurrency(p.valor)}</td>
                        <td className="p-3 text-muted-foreground">{new Date(p.dataPagamento).toLocaleDateString("pt-BR")}</td>
                        <td className="p-3">{p.status}</td>
                      </tr>
                    ))}
                    {pagamentos.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">Nenhum registro.</td></tr>}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Tabela resumo de recebimentos para impressão */}
          <Card className="mt-6">
            <CardHeader><CardTitle className="text-base">Últimos Recebimentos</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium text-muted-foreground">Nº Controle</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Nome / Razão Social</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Tipo</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Valor Total</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Vencimento</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recebimentos.slice(0, 10).map(r => (
                      <tr key={r.id} className="border-b">
                        <td className="p-3 font-mono text-xs text-muted-foreground">{r.numeroControle || "-"}</td>
                        <td className="p-3">{r.nomeRazaoSocial}</td>
                        <td className="p-3 text-muted-foreground">{r.tipoRecebimento}</td>
                        <td className="p-3 text-right font-semibold">{formatCurrency(r.valorTotal)}</td>
                        <td className="p-3 text-muted-foreground">{new Date(r.dataVencimento).toLocaleDateString("pt-BR")}</td>
                        <td className="p-3">{r.status}</td>
                      </tr>
                    ))}
                    {recebimentos.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">Nenhum registro.</td></tr>}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
