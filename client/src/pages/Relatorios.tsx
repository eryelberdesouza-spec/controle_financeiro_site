import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import {
  BarChart3, TrendingUp, TrendingDown, PieChart, Printer, Download, Filter, X,
  Building2, DollarSign, ArrowUpCircle, ArrowDownCircle, FileText,
} from "lucide-react";
import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, PieChart as RechartsPie, Pie, Cell,
} from "recharts";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatCurrency(value: any) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(parseFloat(value ?? 0));
}
function formatDate(date: Date | string | null | undefined) {
  if (!date) return "-";
  const iso = date instanceof Date ? date.toISOString() : String(date);
  const parts = iso.substring(0, 10).split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
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

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const ANOS = [2023, 2024, 2025, 2026, 2027];
const PIE_COLORS = ["#3b82f6","#ef4444","#22c55e","#f59e0b","#8b5cf6","#ec4899","#14b8a6","#f97316"];

// ─── Aba Geral ─────────────────────────────────────────────────────────────────
function AbaGeral() {
  const { data: stats } = trpc.dashboard.stats.useQuery();
  const { data: pagStats } = trpc.pagamentos.stats.useQuery();
  const { data: recStats } = trpc.recebimentos.stats.useQuery();
  const { data: pagamentos = [] } = trpc.pagamentos.list.useQuery();
  const { data: recebimentos = [] } = trpc.recebimentos.list.useQuery();
  const { data: empresa } = trpc.empresa.get.useQuery();
  const { data: centrosCusto = [] } = trpc.centrosCusto.list.useQuery();

  const [filtros, setFiltros] = useState({
    tipo: "ambos" as "pagamentos" | "recebimentos" | "ambos",
    dataInicio: "",
    dataFim: "",
    status: "todos",
    nome: "",
    numeroControle: "",
    centroCustoId: "" as string,
    tipoServico: "",
  });
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);

  const temFiltros = filtros.dataInicio || filtros.dataFim || filtros.status !== "todos" ||
    filtros.nome || filtros.numeroControle || filtros.centroCustoId || filtros.tipoServico;

  const limparFiltros = () => setFiltros({
    tipo: "ambos", dataInicio: "", dataFim: "", status: "todos",
    nome: "", numeroControle: "", centroCustoId: "", tipoServico: "",
  });

  const pagFiltrados = useMemo(() => {
    return pagamentos.filter(p => {
      if (filtros.tipo === "recebimentos") return false;
      if (filtros.nome && !p.nomeCompleto.toLowerCase().includes(filtros.nome.toLowerCase())) return false;
      if (filtros.numeroControle && !(p.numeroControle ?? "").toLowerCase().includes(filtros.numeroControle.toLowerCase())) return false;
      if (filtros.centroCustoId && String(p.centroCustoId) !== filtros.centroCustoId) return false;
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
      if (filtros.centroCustoId && String(r.centroCustoId) !== filtros.centroCustoId) return false;
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
  const ccSelecionado = filtros.centroCustoId
    ? centrosCusto.find(cc => String(cc.id) === filtros.centroCustoId)
    : null;

  const exportRelatorio = () => {
    const now = new Date().toLocaleDateString("pt-BR");
    const periodo = filtros.dataInicio || filtros.dataFim
      ? `Período: ${filtros.dataInicio ? formatDate(filtros.dataInicio) : "início"} até ${filtros.dataFim ? formatDate(filtros.dataFim) : "hoje"}`
      : "Período: Todos os registros";
    const ccLinha = ccSelecionado ? `Centro de Custo: ${ccSelecionado.nome}` : "Centro de Custo: Todos";
    const lines = [
      nomeEmpresa.toUpperCase(),
      `RELATÓRIO FINANCEIRO - ${now}`,
      periodo,
      ccLinha,
      ``,
      `=== RESUMO GERAL (FILTRADO) ===`,
      `Total Recebimentos: ${formatCurrency(totalRecFiltrado)} (${recFiltrados.length} registros)`,
      `Total Pagamentos: ${formatCurrency(totalPagFiltrado)} (${pagFiltrados.length} registros)`,
      `Fluxo de Caixa: ${formatCurrency(fluxoFiltrado)}`,
      ``,
      `=== PAGAMENTOS ===`,
      ...pagFiltrados.map(p =>
        `${p.numeroControle || "-"} | ${p.nomeCompleto} | ${(p as any).centroCustoNome || p.centroCusto || "-"} | ${p.tipoServico || "-"} | ${formatCurrency(p.valor)} | ${formatDate(p.dataPagamento)} | ${p.status}`
      ),
      ``,
      `=== RECEBIMENTOS ===`,
      ...recFiltrados.map(r =>
        `${r.numeroControle || "-"} | ${r.nomeRazaoSocial} | ${(r as any).centroCustoNome || "-"} | ${r.tipoRecebimento} | ${formatCurrency(r.valorTotal)} | ${formatDate(r.dataVencimento)} | ${r.status}`
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `relatorio_financeiro_${new Date().toISOString().split("T")[0]}.txt`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #relatorio-print, #relatorio-print * { visibility: visible; }
          #relatorio-print { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Barra de ações */}
      <div className="flex items-center justify-between flex-wrap gap-3 no-print">
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
          <Button variant="outline" onClick={() => window.print()} className="gap-2">
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
                <Select value={filtros.centroCustoId || "todos"} onValueChange={v => setFiltros(f => ({ ...f, centroCustoId: v === "todos" ? "" : v }))}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Todos os CCs" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Centros de Custo</SelectItem>
                    {centrosCusto.map(cc => (
                      <SelectItem key={cc.id} value={String(cc.id)}>{cc.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
        {/* Cabeçalho de impressão */}
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
            {ccSelecionado && (
              <p className="text-sm text-muted-foreground">
                Centro de Custo: <strong>{ccSelecionado.nome}</strong>
              </p>
            )}
            {filtros.status !== "todos" && (
              <p className="text-sm text-muted-foreground">
                Status: <strong>{filtros.status}</strong>
              </p>
            )}
          </div>
        </div>

        {/* Resumo filtrado */}
        {temFiltros && (
          <Card className="border-primary/20 bg-primary/5 mb-6">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-sm font-semibold text-primary">Resumo do Período Filtrado</CardTitle>
                <div className="flex flex-wrap gap-2">
                  {ccSelecionado && (
                    <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">
                      <Building2 className="h-3 w-3" /> CC: {ccSelecionado.nome}
                    </span>
                  )}
                  {filtros.status !== "todos" && (
                    <span className="inline-flex items-center gap-1 text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-medium">
                      Status: {filtros.status}
                    </span>
                  )}
                  {(filtros.dataInicio || filtros.dataFim) && (
                    <span className="inline-flex items-center gap-1 text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full font-medium">
                      {filtros.dataInicio ? formatDate(filtros.dataInicio) : "início"} → {filtros.dataFim ? formatDate(filtros.dataFim) : "hoje"}
                    </span>
                  )}
                </div>
              </div>
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

        {/* Tabela de Pagamentos */}
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
                      <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Centro de Custo</th>
                      <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Serviço</th>
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
                        <td className="p-3 text-muted-foreground hidden md:table-cell">
                          {(p as any).centroCustoNome || p.centroCusto || <span className="text-muted-foreground/50">—</span>}
                        </td>
                        <td className="p-3 text-muted-foreground hidden md:table-cell">{p.tipoServico || "-"}</td>
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

        {/* Tabela de Recebimentos */}
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
                      <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Centro de Custo</th>
                      <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Tipo</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Valor</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Vencimento</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recFiltrados.map(r => (
                      <tr key={r.id} className="border-b hover:bg-muted/20">
                        <td className="p-3 font-mono text-xs text-muted-foreground">{r.numeroControle || "-"}</td>
                        <td className="p-3 font-medium">{r.nomeRazaoSocial}</td>
                        <td className="p-3 text-muted-foreground hidden md:table-cell">
                          {(r as any).centroCustoNome || <span className="text-muted-foreground/50">—</span>}
                        </td>
                        <td className="p-3 text-muted-foreground hidden md:table-cell">{r.tipoRecebimento}</td>
                        <td className="p-3 text-right font-semibold">{formatCurrency(r.valorTotal)}</td>
                        <td className="p-3 text-muted-foreground">{formatDate(r.dataVencimento)}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS_REC[r.status] || ""}`}>{r.status}</span>
                        </td>
                      </tr>
                    ))}
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
  );
}

// ─── Aba Por Centro de Custo ───────────────────────────────────────────────────
function AbaCentroCusto() {
  const hoje = new Date();
  const [centroCustoId, setCentroCustoId] = useState<number | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<"mes" | "periodo">("mes");
  const [mesSelecionado, setMesSelecionado] = useState(hoje.getMonth() + 1);
  const [anoSelecionado, setAnoSelecionado] = useState(hoje.getFullYear());
  const [dataInicio, setDataInicio] = useState<string>("");
  const [dataFim, setDataFim] = useState<string>("");
  const [abaAtiva, setAbaAtiva] = useState<"pagamentos" | "recebimentos">("pagamentos");

  const queryInput = useMemo(() => {
    if (filtroTipo === "mes") {
      const inicio = new Date(anoSelecionado, mesSelecionado - 1, 1);
      const fim = new Date(anoSelecionado, mesSelecionado, 0, 23, 59, 59);
      return { centroCustoId: centroCustoId ?? undefined, dataInicio: inicio, dataFim: fim };
    } else {
      return {
        centroCustoId: centroCustoId ?? undefined,
        dataInicio: dataInicio ? new Date(dataInicio) : undefined,
        dataFim: dataFim ? new Date(dataFim + "T23:59:59") : undefined,
      };
    }
  }, [centroCustoId, filtroTipo, mesSelecionado, anoSelecionado, dataInicio, dataFim]);

  const { data, isLoading } = trpc.relatorioCentroCusto.getRelatorio.useQuery(queryInput);
  const { data: empresa } = trpc.empresa.get.useQuery();

  const todosCentros = data?.todosCentros ?? [];
  const totais = data?.totais ?? { totalPagamentos: 0, totalRecebimentos: 0, saldo: 0, qtdPagamentos: 0, qtdRecebimentos: 0 };
  const pagamentosList = data?.pagamentosList ?? [];
  const recebimentosList = data?.recebimentosList ?? [];
  const evolucaoMensal = data?.evolucaoMensal ?? [];
  const porTipoServico = data?.porTipoServico ?? [];
  const porTipoRecebimento = data?.porTipoRecebimento ?? [];

  const nomeCentroCusto = centroCustoId
    ? todosCentros.find(cc => cc.id === centroCustoId)?.nome ?? "Centro de Custo"
    : "Todos os Centros de Custo";

  const periodoLabel = filtroTipo === "mes"
    ? `${MESES[mesSelecionado - 1]}/${anoSelecionado}`
    : dataInicio && dataFim
      ? `${formatDate(dataInicio)} a ${formatDate(dataFim)}`
      : "Período selecionado";

  function handleImprimir() {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const logoHtml = empresa?.logoUrl
      ? `<img src="${empresa.logoUrl}" alt="Logo" style="height:50px;object-fit:contain;margin-right:12px;" />`
      : "";
    const nomeEmpresa = empresa?.nomeEmpresa || "Relatório por Centro de Custo";
    const pagRows = pagamentosList.map(p => `
      <tr>
        <td>${p.numeroControle ?? "—"}</td>
        <td>${p.nomeCompleto}</td>
        <td>${p.clienteNome ?? "—"}</td>
        <td>${p.tipoServico ?? "—"}</td>
        <td style="text-align:right">${formatCurrency(p.valor)}</td>
        <td>${formatDate(p.dataPagamento)}</td>
        <td>${p.status}</td>
      </tr>`).join("");
    const recRows = recebimentosList.map(r => `
      <tr>
        <td>${r.numeroControle ?? "—"}</td>
        <td>${r.nomeRazaoSocial}</td>
        <td>${r.clienteNome ?? "—"}</td>
        <td>${r.tipoRecebimento ?? "—"}</td>
        <td style="text-align:right">${formatCurrency(r.valorTotal)}</td>
        <td>${formatDate(r.dataVencimento)}</td>
        <td>${r.status}</td>
      </tr>`).join("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Relatório por CC</title>
      <style>body{font-family:Arial,sans-serif;font-size:12px;padding:20px}
      h1{font-size:18px}h2{font-size:14px;margin-top:20px;border-bottom:1px solid #ccc;padding-bottom:4px}
      table{width:100%;border-collapse:collapse;margin-top:8px}
      th{background:#f3f4f6;text-align:left;padding:6px 8px;font-size:11px}
      td{padding:5px 8px;border-bottom:1px solid #e5e7eb}
      .header{display:flex;align-items:center;border-bottom:2px solid #1e3a5f;padding-bottom:12px;margin-bottom:16px}
      .kpi{display:inline-block;padding:8px 16px;border:1px solid #e5e7eb;border-radius:6px;margin:4px}
      .green{color:#16a34a}.red{color:#dc2626}</style></head><body>
      <div class="header">${logoHtml}<div><h1>${nomeEmpresa}</h1>
      <p>Relatório por Centro de Custo — ${nomeCentroCusto}</p>
      <p>Período: ${periodoLabel} — Emitido em ${new Date().toLocaleDateString("pt-BR")}</p></div></div>
      <div>
        <span class="kpi">Pagamentos: <strong class="red">${formatCurrency(totais.totalPagamentos)}</strong></span>
        <span class="kpi">Recebimentos: <strong class="green">${formatCurrency(totais.totalRecebimentos)}</strong></span>
        <span class="kpi">Saldo: <strong class="${totais.saldo >= 0 ? "green" : "red"}">${formatCurrency(totais.saldo)}</strong></span>
      </div>
      <h2>Pagamentos (${pagamentosList.length})</h2>
      <table><thead><tr><th>Nº Controle</th><th>Nome</th><th>Cliente</th><th>Tipo Serviço</th><th>Valor</th><th>Data</th><th>Status</th></tr></thead>
      <tbody>${pagRows || "<tr><td colspan='7' style='text-align:center'>Nenhum registro</td></tr>"}</tbody></table>
      <h2>Recebimentos (${recebimentosList.length})</h2>
      <table><thead><tr><th>Nº Controle</th><th>Nome</th><th>Cliente</th><th>Tipo</th><th>Valor</th><th>Vencimento</th><th>Status</th></tr></thead>
      <tbody>${recRows || "<tr><td colspan='7' style='text-align:center'>Nenhum registro</td></tr>"}</tbody></table>
      </body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Filtros do Relatório
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs">Centro de Custo</Label>
              <Select
                value={centroCustoId ? String(centroCustoId) : "todos"}
                onValueChange={v => setCentroCustoId(v === "todos" ? null : Number(v))}
              >
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Todos os CCs" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Centros de Custo</SelectItem>
                  {todosCentros.map(cc => (
                    <SelectItem key={cc.id} value={String(cc.id)}>{cc.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Tipo de Período</Label>
              <Select value={filtroTipo} onValueChange={v => setFiltroTipo(v as any)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mes">Por Mês</SelectItem>
                  <SelectItem value="periodo">Período Livre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {filtroTipo === "mes" ? (
              <>
                <div>
                  <Label className="text-xs">Mês</Label>
                  <Select value={String(mesSelecionado)} onValueChange={v => setMesSelecionado(Number(v))}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MESES.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Ano</Label>
                  <Select value={String(anoSelecionado)} onValueChange={v => setAnoSelecionado(Number(v))}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ANOS.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label className="text-xs">Data Início</Label>
                  <Input type="date" className="h-9 text-sm" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Data Fim</Label>
                  <Input type="date" className="h-9 text-sm" value={dataFim} onChange={e => setDataFim(e.target.value)} />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cabeçalho do relatório */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            {nomeCentroCusto}
          </h2>
          <p className="text-sm text-muted-foreground">{periodoLabel}</p>
        </div>
        <Button variant="outline" onClick={handleImprimir} className="gap-2">
          <Printer className="h-4 w-4" /> Imprimir / Salvar PDF
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground">Carregando dados...</div>
      ) : (
        <>
          {/* Cards de totais */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <ArrowDownCircle className="h-4 w-4 text-red-500" />
                  <p className="text-xs text-muted-foreground">Total Pagamentos</p>
                </div>
                <p className="text-xl font-bold text-red-600">{formatCurrency(totais.totalPagamentos)}</p>
                <p className="text-xs text-muted-foreground">{totais.qtdPagamentos} lançamentos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <ArrowUpCircle className="h-4 w-4 text-green-500" />
                  <p className="text-xs text-muted-foreground">Total Recebimentos</p>
                </div>
                <p className="text-xl font-bold text-green-600">{formatCurrency(totais.totalRecebimentos)}</p>
                <p className="text-xs text-muted-foreground">{totais.qtdRecebimentos} lançamentos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-blue-500" />
                  <p className="text-xs text-muted-foreground">Saldo</p>
                </div>
                <p className={`text-xl font-bold ${totais.saldo >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(totais.saldo)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4 text-purple-500" />
                  <p className="text-xs text-muted-foreground">Total Lançamentos</p>
                </div>
                <p className="text-xl font-bold text-purple-600">
                  {(totais.qtdPagamentos ?? 0) + (totais.qtdRecebimentos ?? 0)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Evolução mensal */}
            {evolucaoMensal.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Evolução Mensal</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={evolucaoMensal} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: any) => formatCurrency(v)} />
                      <Legend />
                      <Bar dataKey="recebimentos" name="Recebimentos" fill="#22c55e" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="pagamentos" name="Pagamentos" fill="#ef4444" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Distribuição por tipo */}
            <div className="grid grid-cols-1 gap-4">
              {porTipoServico.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Pagamentos por Tipo de Serviço</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={140}>
                      <RechartsPie>
                        <Pie data={porTipoServico.map(t => ({ name: t.tipo || "Sem tipo", value: Number(t.total) }))}
                          cx="50%" cy="50%" outerRadius={55} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}>
                          {porTipoServico.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v: any) => formatCurrency(v)} />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
              {porTipoRecebimento.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Recebimentos por Tipo</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {porTipoRecebimento.map((t, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                            <span>{t.tipo || "Sem tipo"}</span>
                          </div>
                          <span className="font-semibold">{formatCurrency(t.total)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Tabelas detalhadas */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <Button
                variant={abaAtiva === "pagamentos" ? "default" : "outline"}
                size="sm"
                onClick={() => setAbaAtiva("pagamentos")}
                className="gap-1"
              >
                <ArrowDownCircle className="h-3.5 w-3.5" />
                Pagamentos ({pagamentosList.length})
              </Button>
              <Button
                variant={abaAtiva === "recebimentos" ? "default" : "outline"}
                size="sm"
                onClick={() => setAbaAtiva("recebimentos")}
                className="gap-1"
              >
                <ArrowUpCircle className="h-3.5 w-3.5" />
                Recebimentos ({recebimentosList.length})
              </Button>
            </div>

            {abaAtiva === "pagamentos" && (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-3 font-medium text-muted-foreground">Nº Controle</th>
                          <th className="text-left p-3 font-medium text-muted-foreground">Nome</th>
                          <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Cliente</th>
                          <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Tipo Serviço</th>
                          <th className="text-right p-3 font-medium text-muted-foreground">Valor</th>
                          <th className="text-left p-3 font-medium text-muted-foreground">Data</th>
                          <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagamentosList.map(p => (
                          <tr key={p.id} className="border-b hover:bg-muted/20">
                            <td className="p-3 font-mono text-xs text-muted-foreground">{p.numeroControle ?? "—"}</td>
                            <td className="p-3 font-medium">{p.nomeCompleto}</td>
                            <td className="p-3 text-muted-foreground hidden md:table-cell">{p.clienteNome ?? "—"}</td>
                            <td className="p-3 text-muted-foreground hidden md:table-cell">{p.tipoServico ?? "—"}</td>
                            <td className="p-3 text-right font-semibold">{formatCurrency(p.valor)}</td>
                            <td className="p-3 text-muted-foreground">{formatDate(p.dataPagamento)}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS_PAG[p.status] || ""}`}>{p.status}</span>
                            </td>
                          </tr>
                        ))}
                        {pagamentosList.length === 0 && (
                          <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Nenhum pagamento neste período/CC.</td></tr>
                        )}
                      </tbody>
                      {pagamentosList.length > 0 && (
                        <tfoot>
                          <tr className="border-t bg-muted/30">
                            <td colSpan={4} className="p-3 text-sm font-semibold text-right">Total:</td>
                            <td className="p-3 text-right font-bold text-red-600">{formatCurrency(totais.totalPagamentos)}</td>
                            <td colSpan={2} />
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {abaAtiva === "recebimentos" && (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-3 font-medium text-muted-foreground">Nº Controle</th>
                          <th className="text-left p-3 font-medium text-muted-foreground">Nome / Razão Social</th>
                          <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Cliente</th>
                          <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Tipo</th>
                          <th className="text-right p-3 font-medium text-muted-foreground">Valor</th>
                          <th className="text-left p-3 font-medium text-muted-foreground">Vencimento</th>
                          <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recebimentosList.map(r => (
                          <tr key={r.id} className="border-b hover:bg-muted/20">
                            <td className="p-3 font-mono text-xs text-muted-foreground">{r.numeroControle ?? "—"}</td>
                            <td className="p-3 font-medium">{r.nomeRazaoSocial}</td>
                            <td className="p-3 text-muted-foreground hidden md:table-cell">{r.clienteNome ?? "—"}</td>
                            <td className="p-3 text-muted-foreground hidden md:table-cell">{r.tipoRecebimento ?? "—"}</td>
                            <td className="p-3 text-right font-semibold">{formatCurrency(r.valorTotal)}</td>
                            <td className="p-3 text-muted-foreground">{formatDate(r.dataVencimento)}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS_REC[r.status] || ""}`}>{r.status}</span>
                            </td>
                          </tr>
                        ))}
                        {recebimentosList.length === 0 && (
                          <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Nenhum recebimento neste período/CC.</td></tr>
                        )}
                      </tbody>
                      {recebimentosList.length > 0 && (
                        <tfoot>
                          <tr className="border-t bg-muted/30">
                            <td colSpan={4} className="p-3 text-sm font-semibold text-right">Total:</td>
                            <td className="p-3 text-right font-bold text-green-600">{formatCurrency(totais.totalRecebimentos)}</td>
                            <td colSpan={2} />
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Página principal ──────────────────────────────────────────────────────────
export default function Relatorios() {
  const [abaAtiva, setAbaAtiva] = useState<"geral" | "centroCusto">("geral");

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        {/* Cabeçalho */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
          <p className="text-muted-foreground text-sm mt-1">Análises financeiras integradas com filtros avançados</p>
        </div>

        {/* Seletor de aba */}
        <div className="flex gap-1 border-b">
          <button
            onClick={() => setAbaAtiva("geral")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              abaAtiva === "geral"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Geral
            </span>
          </button>
          <button
            onClick={() => setAbaAtiva("centroCusto")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              abaAtiva === "centroCusto"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Por Centro de Custo
            </span>
          </button>
        </div>

        {/* Conteúdo da aba */}
        {abaAtiva === "geral" ? <AbaGeral /> : <AbaCentroCusto />}
      </div>
    </DashboardLayout>
  );
}
