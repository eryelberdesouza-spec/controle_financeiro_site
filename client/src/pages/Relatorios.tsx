import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { BarChart3, TrendingUp, TrendingDown, PieChart, Printer, Download, Filter, X } from "lucide-react";
import { useState, useMemo } from "react";

function formatCurrency(value: any) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(parseFloat(value ?? 0));
}
function formatDate(date: Date | string | null | undefined) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("pt-BR");
}
function pct(part: any, total: any) {
  const p = parseFloat(part ?? 0);
  const t = parseFloat(total ?? 0);
  if (!t) return "0%";
  return ((p / t) * 100).toFixed(1) + "%";
}

const STATUS_COLORS_PAG: Record<string, string> = {
  Pendente: "bg-yellow-100 text-yellow-800",
  Processando: "bg-blue-100 text-blue-800",
  Pago: "bg-green-100 text-green-800",
  Cancelado: "bg-gray-100 text-gray-600",
};
const STATUS_COLORS_REC: Record<string, string> = {
  Pendente: "bg-yellow-100 text-yellow-800",
  Recebido: "bg-green-100 text-green-800",
  Atrasado: "bg-red-100 text-red-800",
  Cancelado: "bg-gray-100 text-gray-600",
};

export default function Relatorios() {
  const { data: stats } = trpc.dashboard.stats.useQuery();
  const { data: pagStats } = trpc.pagamentos.stats.useQuery();
  const { data: recStats } = trpc.recebimentos.stats.useQuery();
  const { data: pagamentos = [] } = trpc.pagamentos.list.useQuery();
  const { data: recebimentos = [] } = trpc.recebimentos.list.useQuery();
  const { data: empresa } = trpc.empresa.get.useQuery();

  // Filtros
  const [filtros, setFiltros] = useState({
    tipo: "ambos" as "pagamentos" | "recebimentos" | "ambos",
    dataInicio: "",
    dataFim: "",
    status: "todos",
    nome: "",
    numeroControle: "",
    centroCusto: "",
    tipoServico: "",
  });
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);

  const temFiltros = filtros.dataInicio || filtros.dataFim || filtros.status !== "todos" ||
    filtros.nome || filtros.numeroControle || filtros.centroCusto || filtros.tipoServico;

  const limparFiltros = () => setFiltros({
    tipo: "ambos", dataInicio: "", dataFim: "", status: "todos",
    nome: "", numeroControle: "", centroCusto: "", tipoServico: "",
  });

  const pagFiltrados = useMemo(() => {
    return pagamentos.filter(p => {
      if (filtros.tipo === "recebimentos") return false;
      if (filtros.nome && !p.nomeCompleto.toLowerCase().includes(filtros.nome.toLowerCase())) return false;
      if (filtros.numeroControle && !(p.numeroControle ?? "").toLowerCase().includes(filtros.numeroControle.toLowerCase())) return false;
      if (filtros.centroCusto && !(p.centroCusto ?? "").toLowerCase().includes(filtros.centroCusto.toLowerCase())) return false;
      if (filtros.tipoServico && !(p.tipoServico ?? "").toLowerCase().includes(filtros.tipoServico.toLowerCase())) return false;
      if (filtros.status !== "todos" && p.status !== filtros.status) return false;
      if (filtros.dataInicio) {
        const d = new Date(p.dataPagamento);
        if (d < new Date(filtros.dataInicio + "T00:00:00")) return false;
      }
      if (filtros.dataFim) {
        const d = new Date(p.dataPagamento);
        if (d > new Date(filtros.dataFim + "T23:59:59")) return false;
      }
      return true;
    });
  }, [pagamentos, filtros]);

  const recFiltrados = useMemo(() => {
    return recebimentos.filter(r => {
      if (filtros.tipo === "pagamentos") return false;
      if (filtros.nome && !r.nomeRazaoSocial.toLowerCase().includes(filtros.nome.toLowerCase())) return false;
      if (filtros.numeroControle && !(r.numeroControle ?? "").toLowerCase().includes(filtros.numeroControle.toLowerCase())) return false;
      if (filtros.status !== "todos" && r.status !== filtros.status) return false;
      if (filtros.dataInicio) {
        const d = new Date(r.dataVencimento);
        if (d < new Date(filtros.dataInicio + "T00:00:00")) return false;
      }
      if (filtros.dataFim) {
        const d = new Date(r.dataVencimento);
        if (d > new Date(filtros.dataFim + "T23:59:59")) return false;
      }
      return true;
    });
  }, [recebimentos, filtros]);

  const totalRecFiltrado = recFiltrados.reduce((acc, r) => acc + parseFloat(String(r.valorTotal ?? 0)), 0);
  const totalPagFiltrado = pagFiltrados.reduce((acc, p) => acc + parseFloat(String(p.valor ?? 0)), 0);
  const fluxoFiltrado = totalRecFiltrado - totalPagFiltrado;

  const totalRec = parseFloat(String(stats?.recebimentos?.totalGeral ?? 0));
  const totalPag = parseFloat(String(stats?.pagamentos?.totalGeral ?? 0));
  const fluxo = totalRec - totalPag;
  const taxaRecebimento = totalRec > 0
    ? ((parseFloat(String(stats?.recebimentos?.totalRecebido ?? 0)) / totalRec) * 100).toFixed(1)
    : "0";

  const nomeEmpresa = empresa?.nomeEmpresa || "Relatório Financeiro";
  const logoUrl = empresa?.logoUrl;

  const handlePrint = () => window.print();

  const exportRelatorio = () => {
    const now = new Date().toLocaleDateString("pt-BR");
    const periodo = filtros.dataInicio || filtros.dataFim
      ? `Período: ${filtros.dataInicio ? formatDate(filtros.dataInicio) : "início"} até ${filtros.dataFim ? formatDate(filtros.dataFim) : "hoje"}`
      : "Período: Todos os registros";
    const lines = [
      nomeEmpresa.toUpperCase(),
      `RELATÓRIO FINANCEIRO - ${now}`,
      periodo,
      ``,
      `=== RESUMO GERAL (FILTRADO) ===`,
      `Total Recebimentos: ${formatCurrency(totalRecFiltrado)} (${recFiltrados.length} registros)`,
      `Total Pagamentos: ${formatCurrency(totalPagFiltrado)} (${pagFiltrados.length} registros)`,
      `Fluxo de Caixa: ${formatCurrency(fluxoFiltrado)}`,
      ``,
      `=== PAGAMENTOS ===`,
      ...pagFiltrados.map(p =>
        `${p.numeroControle || "-"} | ${p.nomeCompleto} | ${p.tipoServico || "-"} | ${formatCurrency(p.valor)} | ${formatDate(p.dataPagamento)} | ${p.status}`
      ),
      ``,
      `=== RECEBIMENTOS ===`,
      ...recFiltrados.map(r =>
        `${r.numeroControle || "-"} | ${r.nomeRazaoSocial} | ${r.tipoRecebimento} | ${formatCurrency(r.valorTotal)} | ${formatDate(r.dataVencimento)} | ${r.status}`
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `relatorio_financeiro_${new Date().toISOString().split("T")[0]}.txt`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #relatorio-print, #relatorio-print * { visibility: visible; }
          #relatorio-print { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="space-y-6 p-6">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between flex-wrap gap-3 no-print">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
            <p className="text-muted-foreground text-sm mt-1">Análises financeiras com filtros avançados</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={filtrosAbertos ? "default" : "outline"}
              onClick={() => setFiltrosAbertos(!filtrosAbertos)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Filtros
              {temFiltros && <span className="bg-primary-foreground text-primary text-xs rounded-full px-1.5 py-0.5 ml-1">●</span>}
            </Button>
            <Button variant="outline" onClick={exportRelatorio} className="gap-2">
              <Download className="h-4 w-4" /> Exportar TXT
            </Button>
            <Button variant="outline" onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" /> Imprimir
            </Button>
          </div>
        </div>

        {/* Painel de Filtros */}
        {filtrosAbertos && (
          <Card className="no-print">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Filtros Avançados</CardTitle>
                {temFiltros && (
                  <Button variant="ghost" size="sm" onClick={limparFiltros} className="gap-1 text-muted-foreground h-7">
                    <X className="h-3.5 w-3.5" /> Limpar filtros
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label className="text-xs">Tipo de Registro</Label>
                  <Select value={filtros.tipo} onValueChange={v => setFiltros(f => ({ ...f, tipo: v as any }))}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ambos">Pagamentos e Recebimentos</SelectItem>
                      <SelectItem value="pagamentos">Somente Pagamentos</SelectItem>
                      <SelectItem value="recebimentos">Somente Recebimentos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select value={filtros.status} onValueChange={v => setFiltros(f => ({ ...f, status: v }))}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="Pendente">Pendente</SelectItem>
                      <SelectItem value="Pago">Pago</SelectItem>
                      <SelectItem value="Recebido">Recebido</SelectItem>
                      <SelectItem value="Atrasado">Atrasado</SelectItem>
                      <SelectItem value="Processando">Processando</SelectItem>
                      <SelectItem value="Cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Data Início</Label>
                  <Input type="date" className="h-8 text-sm" value={filtros.dataInicio} onChange={e => setFiltros(f => ({ ...f, dataInicio: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Data Fim</Label>
                  <Input type="date" className="h-8 text-sm" value={filtros.dataFim} onChange={e => setFiltros(f => ({ ...f, dataFim: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Nome / Razão Social</Label>
                  <Input className="h-8 text-sm" placeholder="Buscar por nome..." value={filtros.nome} onChange={e => setFiltros(f => ({ ...f, nome: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Nº de Controle</Label>
                  <Input className="h-8 text-sm" placeholder="Ex: PAG-2024-001" value={filtros.numeroControle} onChange={e => setFiltros(f => ({ ...f, numeroControle: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Centro de Custo</Label>
                  <Input className="h-8 text-sm" placeholder="Ex: TI, RH..." value={filtros.centroCusto} onChange={e => setFiltros(f => ({ ...f, centroCusto: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Tipo de Serviço</Label>
                  <Input className="h-8 text-sm" placeholder="Ex: Consultoria..." value={filtros.tipoServico} onChange={e => setFiltros(f => ({ ...f, tipoServico: e.target.value }))} />
                </div>
              </div>
              {temFiltros && (
                <p className="text-xs text-muted-foreground mt-3">
                  Exibindo: <strong>{pagFiltrados.length}</strong> pagamento(s) e <strong>{recFiltrados.length}</strong> recebimento(s) com os filtros aplicados.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Área de impressão */}
        <div id="relatorio-print">
          {/* Cabeçalho de impressão com logo e nome da empresa */}
          <div className="hidden print:flex items-center gap-4 mb-6 border-b pb-4">
            {logoUrl && <img src={logoUrl} alt="Logo" className="h-14 w-auto object-contain" />}
            <div>
              <h1 className="text-2xl font-bold">{nomeEmpresa}</h1>
              <p className="text-sm text-muted-foreground">Relatório Financeiro — Gerado em {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</p>
              {(filtros.dataInicio || filtros.dataFim) && (
                <p className="text-sm text-muted-foreground">
                  Período: {filtros.dataInicio ? formatDate(filtros.dataInicio) : "início"} até {filtros.dataFim ? formatDate(filtros.dataFim) : "hoje"}
                </p>
              )}
            </div>
          </div>

          {/* Resumo filtrado (quando há filtros) */}
          {temFiltros && (
            <Card className="border-primary/20 bg-primary/5 mb-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-primary">Resumo do Período Filtrado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Recebimentos</p>
                    <p className="font-bold text-green-600">{formatCurrency(totalRecFiltrado)}</p>
                    <p className="text-xs text-muted-foreground">{recFiltrados.length} registros</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Pagamentos</p>
                    <p className="font-bold text-red-600">{formatCurrency(totalPagFiltrado)}</p>
                    <p className="text-xs text-muted-foreground">{pagFiltrados.length} registros</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Fluxo de Caixa</p>
                    <p className={`font-bold ${fluxoFiltrado >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(fluxoFiltrado)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* KPIs Gerais */}
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
            {filtros.tipo !== "recebimentos" && (
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
                    </div>
                  ))}
                  {(!pagStats || pagStats.length === 0) && <p className="text-muted-foreground text-sm">Nenhum dado disponível.</p>}
                </CardContent>
              </Card>
            )}

            {/* Recebimentos por Status */}
            {filtros.tipo !== "pagamentos" && (
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
                    </div>
                  ))}
                  {(!recStats || recStats.length === 0) && <p className="text-muted-foreground text-sm">Nenhum dado disponível.</p>}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Composição de Faturamento */}
          <Card className="mt-6">
            <CardHeader><CardTitle className="text-base">Composição de Faturamento</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground mb-1">Equipamentos</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats?.recebimentos?.totalEquipamento)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{pct(stats?.recebimentos?.totalEquipamento, totalRec)} do total</p>
                </div>
                <div className="p-4 bg-indigo-50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground mb-1">Serviços</p>
                  <p className="text-2xl font-bold text-indigo-600">{formatCurrency(stats?.recebimentos?.totalServico)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{pct(stats?.recebimentos?.totalServico, totalRec)} do total</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg text-center">
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

          <Separator className="my-6" />

          {/* Tabela de Pagamentos Filtrada */}
          {filtros.tipo !== "recebimentos" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Pagamentos {temFiltros ? `(${pagFiltrados.length} registros filtrados)` : `(${pagamentos.length} registros)`}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium text-muted-foreground">Nº Controle</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Nome</th>
                        <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Serviço</th>
                        <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Centro Custo</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">Valor</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Data</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagFiltrados.map(p => (
                        <tr key={p.id} className="border-b hover:bg-muted/20">
                          <td className="p-3 font-mono text-xs text-muted-foreground">{p.numeroControle || "-"}</td>
                          <td className="p-3 font-medium">{p.nomeCompleto}</td>
                          <td className="p-3 text-muted-foreground hidden md:table-cell">{p.tipoServico || "-"}</td>
                          <td className="p-3 text-muted-foreground hidden md:table-cell">{p.centroCusto || "-"}</td>
                          <td className="p-3 text-right font-semibold">{formatCurrency(p.valor)}</td>
                          <td className="p-3 text-muted-foreground">{formatDate(p.dataPagamento)}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS_PAG[p.status] || ""}`}>{p.status}</span>
                          </td>
                        </tr>
                      ))}
                      {pagFiltrados.length === 0 && (
                        <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">Nenhum pagamento encontrado com os filtros aplicados.</td></tr>
                      )}
                    </tbody>
                    {pagFiltrados.length > 0 && (
                      <tfoot>
                        <tr className="border-t bg-muted/30">
                          <td colSpan={4} className="p-3 text-sm font-semibold text-right">Total:</td>
                          <td className="p-3 text-right font-bold">{formatCurrency(totalPagFiltrado)}</td>
                          <td colSpan={2} />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tabela de Recebimentos Filtrada */}
          {filtros.tipo !== "pagamentos" && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-base">
                  Recebimentos {temFiltros ? `(${recFiltrados.length} registros filtrados)` : `(${recebimentos.length} registros)`}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium text-muted-foreground">Nº Controle</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Nome / Razão Social</th>
                        <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Contrato</th>
                        <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Tipo</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">Valor Líquido</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Vencimento</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recFiltrados.map(r => {
                        const liquido = parseFloat(String(r.valorTotal ?? 0)) + parseFloat(String(r.juros ?? 0)) - parseFloat(String(r.desconto ?? 0));
                        return (
                          <tr key={r.id} className="border-b hover:bg-muted/20">
                            <td className="p-3 font-mono text-xs text-muted-foreground">{r.numeroControle || "-"}</td>
                            <td className="p-3 font-medium">{r.nomeRazaoSocial}</td>
                            <td className="p-3 text-muted-foreground hidden md:table-cell">{r.numeroContrato || "-"}</td>
                            <td className="p-3 text-muted-foreground hidden md:table-cell">{r.tipoRecebimento}</td>
                            <td className="p-3 text-right font-semibold">{formatCurrency(liquido)}</td>
                            <td className="p-3 text-muted-foreground">{formatDate(r.dataVencimento)}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS_REC[r.status] || ""}`}>{r.status}</span>
                            </td>
                          </tr>
                        );
                      })}
                      {recFiltrados.length === 0 && (
                        <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">Nenhum recebimento encontrado com os filtros aplicados.</td></tr>
                      )}
                    </tbody>
                    {recFiltrados.length > 0 && (
                      <tfoot>
                        <tr className="border-t bg-muted/30">
                          <td colSpan={4} className="p-3 text-sm font-semibold text-right">Total:</td>
                          <td className="p-3 text-right font-bold">{formatCurrency(totalRecFiltrado)}</td>
                          <td colSpan={2} />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Rodapé de impressão */}
          <div className="hidden print:block mt-8 pt-4 border-t text-center text-xs text-muted-foreground">
            <p>{nomeEmpresa} — Documento gerado em {new Date().toLocaleString("pt-BR")}</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
