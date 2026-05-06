import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Printer,
  Filter,
  ArrowUpCircle,
  ArrowDownCircle,
  FileText,
  Building2,
} from "lucide-react";


const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const ANOS = [2023, 2024, 2025, 2026, 2027];

const PIE_COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(date: Date | string | null | undefined) {
  if (!date) return "—";
  const d = new Date(date);
  return d.toLocaleDateString("pt-BR");
}

const STATUS_COLORS: Record<string, string> = {
  Pago: "bg-green-100 text-green-800",
  Pendente: "bg-yellow-100 text-yellow-800",
  Processando: "bg-blue-100 text-blue-800",
  Cancelado: "bg-gray-100 text-gray-800",
  Recebido: "bg-green-100 text-green-800",
  Atrasado: "bg-red-100 text-red-800",
};

export default function RelatorioCentroCusto() {
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
      return {
        centroCustoId: centroCustoId ?? undefined,
        dataInicio: inicio,
        dataFim: fim,
      };
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

    const logoSrc = empresa?.logoUrl || "https://d2xsxph8kpxj0f.cloudfront.net/310519663389577190/eCW2qMCc4P3oBzxQMhj7Zi/logo-atomtech-horizontal_7749c840.png";
    const logoHtml = `<img src="${logoSrc}" alt="Logo SIGECO" style="height:50px;object-fit:contain;margin-right:12px;" />`;

    const pagRows = pagamentosList.map(p => `
      <tr>
        <td>${p.numeroControle ?? "—"}</td>
        <td>${p.nomeCompleto}</td>
        <td>${p.clienteNome ?? "—"}</td>
        <td>${p.tipoServico ?? "—"}</td>
        <td>${formatDate(p.dataPagamento)}</td>
        <td style="text-align:right">${formatCurrency(Number(p.valor))}</td>
        <td><span style="padding:2px 8px;border-radius:4px;font-size:11px;background:${p.status === "Pago" ? "#dcfce7" : "#fef9c3"};color:${p.status === "Pago" ? "#166534" : "#854d0e"}">${p.status}</span></td>
      </tr>
    `).join("");

    const recRows = recebimentosList.map(r => `
      <tr>
        <td>${r.numeroControle ?? "—"}</td>
        <td>${r.nomeRazaoSocial}</td>
        <td>${r.clienteNome ?? "—"}</td>
        <td>${r.tipoRecebimento ?? "—"}</td>
        <td>${formatDate(r.dataVencimento)}</td>
        <td style="text-align:right">${formatCurrency(Number(r.valorTotal))}</td>
        <td><span style="padding:2px 8px;border-radius:4px;font-size:11px;background:${r.status === "Recebido" ? "#dcfce7" : r.status === "Atrasado" ? "#fee2e2" : "#fef9c3"};color:${r.status === "Recebido" ? "#166534" : r.status === "Atrasado" ? "#991b1b" : "#854d0e"}">${r.status}</span></td>
      </tr>
    `).join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <title>Relatório por Centro de Custo — ${nomeCentroCusto}</title>
        <style>
          @page { size: A4; margin: 15mm 12mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Calibri', 'Calibri Light', 'Trebuchet MS', 'Gill Sans', 'Gill Sans MT', Candara, Verdana, Arial, sans-serif; font-size: 11px; color: #1a1a1a; font-weight: 400; -webkit-font-smoothing: antialiased; }
          .header { background: #f9fafb; border-bottom: 3px solid #111827; padding: 12px 20px; display: flex; align-items: center; margin-bottom: 16px; }
          .header-info { flex: 1; }
          .sigeco-title { font-size: 18px; font-weight: 900; letter-spacing: 0.08em; color: #111827; margin-bottom: 1px; }
          .sigeco-sub { font-size: 9px; color: #22c55e; font-weight: 600; margin-bottom: 2px; }
          .header-info h1 { font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 2px; }
          .header-info p { font-size: 10px; color: #6b7280; }
          .section-title { font-size: 13px; font-weight: bold; color: #1e3a5f; border-bottom: 2px solid #1e3a5f; padding-bottom: 4px; margin: 16px 0 8px; }
          .cards { display: flex; gap: 10px; margin-bottom: 16px; }
          .card { flex: 1; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px; }
          .card-label { font-size: 10px; color: #6b7280; margin-bottom: 4px; }
          .card-value { font-size: 14px; font-weight: bold; }
          .card-value.green { color: #16a34a; }
          .card-value.red { color: #dc2626; }
          .card-value.blue { color: #2563eb; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          th { background: #f3f4f6; font-size: 10px; font-weight: 600; text-align: left; padding: 6px 8px; border-bottom: 1px solid #d1d5db; }
          td { padding: 5px 8px; border-bottom: 1px solid #f3f4f6; font-size: 10px; }
          tr:nth-child(even) td { background: #f9fafb; }
          .footer { text-align: center; font-size: 9px; color: #9ca3af; margin-top: 20px; padding-top: 8px; border-top: 1px solid #e5e7eb; }
          .totals-row td { font-weight: bold; background: #eff6ff; border-top: 2px solid #3b82f6; }
        </style>
      </head>
      <body>
        <div class="header">
          ${logoHtml}
          <div class="header-info">
            <p class="sigeco-title">SIGECO</p>
            <p class="sigeco-sub">Sistema Integrado de Gestão de Engenharia, Contratos e Operações</p>
            <h1>${empresa?.nomeEmpresa ?? "Atom Tech"}</h1>
            <p>Relatório por Centro de Custo</p>
            ${empresa?.cnpj ? `<p>CNPJ: ${empresa.cnpj}</p>` : ""}
          </div>
          <div style="text-align:right">
            <div style="font-size:13px;font-weight:bold">${nomeCentroCusto}</div>
            <div style="font-size:11px;opacity:0.85">${periodoLabel}</div>
          </div>
        </div>

        <div class="cards">
          <div class="card">
            <div class="card-label">Total Pagamentos</div>
            <div class="card-value red">${formatCurrency(totais.totalPagamentos)}</div>
            <div style="font-size:10px;color:#6b7280">${totais.qtdPagamentos} lançamentos</div>
          </div>
          <div class="card">
            <div class="card-label">Total Recebimentos</div>
            <div class="card-value green">${formatCurrency(totais.totalRecebimentos)}</div>
            <div style="font-size:10px;color:#6b7280">${totais.qtdRecebimentos} lançamentos</div>
          </div>
          <div class="card">
            <div class="card-label">Saldo do Período</div>
            <div class="card-value ${totais.saldo >= 0 ? "green" : "red"}">${formatCurrency(totais.saldo)}</div>
          </div>
        </div>

        ${pagamentosList.length > 0 ? `
          <div class="section-title">Pagamentos (${pagamentosList.length})</div>
          <table>
            <thead>
              <tr>
                <th>Nº Controle</th>
                <th>Nome</th>
                <th>Cliente</th>
                <th>Tipo Serviço</th>
                <th>Data</th>
                <th style="text-align:right">Valor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${pagRows}
              <tr class="totals-row">
                <td colspan="5">TOTAL PAGAMENTOS</td>
                <td style="text-align:right">${formatCurrency(totais.totalPagamentos)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        ` : ""}

        ${recebimentosList.length > 0 ? `
          <div class="section-title">Recebimentos (${recebimentosList.length})</div>
          <table>
            <thead>
              <tr>
                <th>Nº Controle</th>
                <th>Nome/Razão Social</th>
                <th>Cliente</th>
                <th>Tipo</th>
                <th>Vencimento</th>
                <th style="text-align:right">Valor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${recRows}
              <tr class="totals-row">
                <td colspan="5">TOTAL RECEBIMENTOS</td>
                <td style="text-align:right">${formatCurrency(totais.totalRecebimentos)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        ` : ""}

        <div class="footer">
          <strong>SIGECO</strong> — Sistema Integrado de Gestão de Engenharia, Contratos e Operações<br/>
          ${empresa?.nomeEmpresa ?? "Atom Tech"} — Relatório gerado em ${new Date().toLocaleString("pt-BR")}
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              Relatório por Centro de Custo
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Análise detalhada de gastos e receitas por centro de custo
            </p>
          </div>
          <Button onClick={handleImprimir} variant="outline" className="gap-2">
            <Printer className="h-4 w-4" />
            Imprimir / PDF
          </Button>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              {/* Seletor de Centro de Custo */}
              <div className="flex flex-col gap-1.5 min-w-[200px]">
                <label className="text-xs font-medium text-muted-foreground">Centro de Custo</label>
                <Select
                  value={centroCustoId?.toString() ?? "todos"}
                  onValueChange={(v) => setCentroCustoId(v === "todos" ? null : Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar CC" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Centros de Custo</SelectItem>
                    {todosCentros.map(cc => (
                      <SelectItem key={cc.id} value={cc.id.toString()}>
                        {cc.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tipo de filtro */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Tipo de Filtro</label>
                <div className="flex gap-2">
                  <Button
                    variant={filtroTipo === "mes" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFiltroTipo("mes")}
                  >
                    Por Mês
                  </Button>
                  <Button
                    variant={filtroTipo === "periodo" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFiltroTipo("periodo")}
                  >
                    Por Período
                  </Button>
                </div>
              </div>

              {filtroTipo === "mes" ? (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Mês</label>
                    <Select
                      value={mesSelecionado.toString()}
                      onValueChange={(v) => setMesSelecionado(Number(v))}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MESES.map((m, i) => (
                          <SelectItem key={i + 1} value={(i + 1).toString()}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Ano</label>
                    <Select
                      value={anoSelecionado.toString()}
                      onValueChange={(v) => setAnoSelecionado(Number(v))}
                    >
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ANOS.map(a => (
                          <SelectItem key={a} value={a.toString()}>{a}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Data Início</label>
                    <input
                      type="date"
                      value={dataInicio}
                      onChange={e => setDataInicio(e.target.value)}
                      className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Data Fim</label>
                    <input
                      type="date"
                      value={dataFim}
                      onChange={e => setDataFim(e.target.value)}
                      className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Label do período selecionado */}
            <div className="mt-3 text-sm text-muted-foreground">
              Exibindo: <span className="font-medium text-foreground">{nomeCentroCusto}</span> — <span className="font-medium text-foreground">{periodoLabel}</span>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="text-muted-foreground">Carregando dados...</div>
          </div>
        ) : (
          <>
            {/* Cards de Totais */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <ArrowUpCircle className="h-4 w-4 text-red-600" />
                    <span className="text-xs text-red-700 font-medium">Total Pagamentos</span>
                  </div>
                  <div className="text-xl font-bold text-red-700">{formatCurrency(totais.totalPagamentos)}</div>
                  <div className="text-xs text-red-600 mt-1">{totais.qtdPagamentos} lançamento(s)</div>
                </CardContent>
              </Card>

              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <ArrowDownCircle className="h-4 w-4 text-green-600" />
                    <span className="text-xs text-green-700 font-medium">Total Recebimentos</span>
                  </div>
                  <div className="text-xl font-bold text-green-700">{formatCurrency(totais.totalRecebimentos)}</div>
                  <div className="text-xs text-green-600 mt-1">{totais.qtdRecebimentos} lançamento(s)</div>
                </CardContent>
              </Card>

              <Card className={`border-${totais.saldo >= 0 ? "blue" : "orange"}-200 bg-${totais.saldo >= 0 ? "blue" : "orange"}-50`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className={`h-4 w-4 ${totais.saldo >= 0 ? "text-blue-600" : "text-orange-600"}`} />
                    <span className={`text-xs font-medium ${totais.saldo >= 0 ? "text-blue-700" : "text-orange-700"}`}>Saldo</span>
                  </div>
                  <div className={`text-xl font-bold ${totais.saldo >= 0 ? "text-blue-700" : "text-orange-700"}`}>
                    {formatCurrency(totais.saldo)}
                  </div>
                  <div className={`text-xs mt-1 ${totais.saldo >= 0 ? "text-blue-600" : "text-orange-600"}`}>
                    {totais.saldo >= 0 ? "Superávit" : "Déficit"}
                  </div>
                </CardContent>
              </Card>

              <Card className="col-span-2">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    <span className="text-xs font-medium text-muted-foreground">Distribuição</span>
                  </div>
                  {totais.totalPagamentos + totais.totalRecebimentos > 0 ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="h-2 rounded-full bg-red-500" style={{ width: `${Math.round((totais.totalPagamentos / (totais.totalPagamentos + totais.totalRecebimentos)) * 100)}%`, minWidth: "4px" }} />
                        <span className="text-xs text-muted-foreground">Pagamentos {Math.round((totais.totalPagamentos / (totais.totalPagamentos + totais.totalRecebimentos)) * 100)}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-2 rounded-full bg-green-500" style={{ width: `${Math.round((totais.totalRecebimentos / (totais.totalPagamentos + totais.totalRecebimentos)) * 100)}%`, minWidth: "4px" }} />
                        <span className="text-xs text-muted-foreground">Recebimentos {Math.round((totais.totalRecebimentos / (totais.totalPagamentos + totais.totalRecebimentos)) * 100)}%</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">Sem dados no período</div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Evolução Mensal */}
              {evolucaoMensal.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Evolução Mensal</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={evolucaoMensal} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                        <Legend />
                        <Bar dataKey="pagamentos" name="Pagamentos" fill="#ef4444" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="recebimentos" name="Recebimentos" fill="#22c55e" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Distribuição por Tipo de Serviço */}
              {porTipoServico.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Pagamentos por Tipo de Serviço</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4">
                      <ResponsiveContainer width="50%" height={180}>
                        <PieChart>
                          <Pie
                            data={porTipoServico}
                            dataKey="total"
                            nameKey="tipo"
                            cx="50%"
                            cy="50%"
                            outerRadius={70}
                          >
                            {porTipoServico.map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v: number) => formatCurrency(v)} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex-1 space-y-1.5 overflow-auto max-h-[180px]">
                        {porTipoServico.map((item, i) => (
                          <div key={i} className="flex items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                              <span className="truncate max-w-[100px]">{item.tipo}</span>
                            </div>
                            <span className="font-medium shrink-0">{formatCurrency(item.total)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Distribuição por Tipo de Recebimento */}
              {porTipoRecebimento.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Recebimentos por Tipo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4">
                      <ResponsiveContainer width="50%" height={180}>
                        <PieChart>
                          <Pie
                            data={porTipoRecebimento}
                            dataKey="total"
                            nameKey="tipo"
                            cx="50%"
                            cy="50%"
                            outerRadius={70}
                          >
                            {porTipoRecebimento.map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v: number) => formatCurrency(v)} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex-1 space-y-1.5 overflow-auto max-h-[180px]">
                        {porTipoRecebimento.map((item, i) => (
                          <div key={i} className="flex items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                              <span className="truncate max-w-[100px]">{item.tipo}</span>
                            </div>
                            <span className="font-medium shrink-0">{formatCurrency(item.total)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Linha de tendência */}
              {evolucaoMensal.length > 1 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Tendência — Saldo Mensal</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart
                        data={evolucaoMensal.map(m => ({ ...m, saldo: m.recebimentos - m.pagamentos }))}
                        margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                        <Legend />
                        <Line type="monotone" dataKey="saldo" name="Saldo" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                        <Line type="monotone" dataKey="pagamentos" name="Pagamentos" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
                        <Line type="monotone" dataKey="recebimentos" name="Recebimentos" stroke="#22c55e" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Tabelas Detalhadas */}
            <Card>
              <CardHeader className="pb-0">
                <div className="flex items-center gap-4">
                  <button
                    className={`pb-2 text-sm font-medium border-b-2 transition-colors ${abaAtiva === "pagamentos" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                    onClick={() => setAbaAtiva("pagamentos")}
                  >
                    <span className="flex items-center gap-1.5">
                      <ArrowUpCircle className="h-4 w-4" />
                      Pagamentos ({pagamentosList.length})
                    </span>
                  </button>
                  <button
                    className={`pb-2 text-sm font-medium border-b-2 transition-colors ${abaAtiva === "recebimentos" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                    onClick={() => setAbaAtiva("recebimentos")}
                  >
                    <span className="flex items-center gap-1.5">
                      <ArrowDownCircle className="h-4 w-4" />
                      Recebimentos ({recebimentosList.length})
                    </span>
                  </button>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {abaAtiva === "pagamentos" ? (
                  pagamentosList.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p>Nenhum pagamento encontrado para este filtro.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nº Controle</TableHead>
                            <TableHead>Nome</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Tipo Serviço</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Descrição</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pagamentosList.map(p => (
                            <TableRow key={p.id}>
                              <TableCell className="font-mono text-xs">{p.numeroControle ?? "—"}</TableCell>
                              <TableCell className="font-medium">{p.nomeCompleto}</TableCell>
                              <TableCell className="text-muted-foreground">{p.clienteNome ?? "—"}</TableCell>
                              <TableCell>{p.tipoServico ?? "—"}</TableCell>
                              <TableCell>{formatDate(p.dataPagamento)}</TableCell>
                              <TableCell className="text-right font-medium text-red-600">{formatCurrency(Number(p.valor))}</TableCell>
                              <TableCell>
                                <Badge className={STATUS_COLORS[p.status ?? ""] ?? "bg-gray-100 text-gray-700"} variant="outline">
                                  {p.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{p.descricao ?? "—"}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-muted/50 font-bold">
                            <TableCell colSpan={5}>TOTAL</TableCell>
                            <TableCell className="text-right text-red-600">{formatCurrency(totais.totalPagamentos)}</TableCell>
                            <TableCell colSpan={2} />
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  )
                ) : (
                  recebimentosList.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p>Nenhum recebimento encontrado para este filtro.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nº Controle</TableHead>
                            <TableHead>Nome/Razão Social</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Vencimento</TableHead>
                            <TableHead>Recebimento</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {recebimentosList.map(r => (
                            <TableRow key={r.id}>
                              <TableCell className="font-mono text-xs">{r.numeroControle ?? "—"}</TableCell>
                              <TableCell className="font-medium">{r.nomeRazaoSocial}</TableCell>
                              <TableCell className="text-muted-foreground">{r.clienteNome ?? "—"}</TableCell>
                              <TableCell>{r.tipoRecebimento ?? "—"}</TableCell>
                              <TableCell>{formatDate(r.dataVencimento)}</TableCell>
                              <TableCell>{formatDate(r.dataRecebimento)}</TableCell>
                              <TableCell className="text-right font-medium text-green-600">{formatCurrency(Number(r.valorTotal))}</TableCell>
                              <TableCell>
                                <Badge className={STATUS_COLORS[r.status ?? ""] ?? "bg-gray-100 text-gray-700"} variant="outline">
                                  {r.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-muted/50 font-bold">
                            <TableCell colSpan={6}>TOTAL</TableCell>
                            <TableCell className="text-right text-green-600">{formatCurrency(totais.totalRecebimentos)}</TableCell>
                            <TableCell />
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  )
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
