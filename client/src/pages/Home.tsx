import React, { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  ArrowDownCircle, ArrowUpCircle, TrendingUp, Wallet,
  AlertTriangle, CheckCircle2, Clock, CalendarDays, Bell, BellRing,
} from "lucide-react";
import { useLocation } from "wouter";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell,
} from "recharts";

function formatCurrency(value: number | string | null | undefined) {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num || 0);
}

function formatCurrencyShort(value: number) {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(1)}k`;
  return formatCurrency(value);
}

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const COLORS_PIE = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];

export default function Home() {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1); // 1-12
  const [ano, setAno] = useState(now.getFullYear());
  const [, setLocation] = useLocation();

  // Converte mes/ano em dataInicio e dataFim para o backend
  const periodoInput = useMemo(() => {
    const dataInicio = new Date(ano, mes - 1, 1, 0, 0, 0);
    const dataFim = new Date(ano, mes, 0, 23, 59, 59);
    return { dataInicio, dataFim };
  }, [mes, ano]);

  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery(periodoInput);
  const { data: vencimentos } = trpc.dashboard.vencimentosProximos.useQuery({ dias: 7 });
  const vencPagamentos = (vencimentos as any)?.pagamentos ?? [];
  const vencRecebimentos = (vencimentos as any)?.recebimentos ?? [];
  const totalAlertas = vencPagamentos.length + vencRecebimentos.length;
  const { data: historicoRaw } = trpc.dashboard.historicoMensal.useQuery({ meses: 6 });
  const pagMensal = (historicoRaw as any)?.pagMensal ?? [];
  const recMensal = (historicoRaw as any)?.recMensal ?? [];
  const { data: porCentroRaw } = trpc.dashboard.porCentroCusto.useQuery(periodoInput);
  const porCentroRecebimentos = (porCentroRaw as any)?.recebimentos ?? [];
  const porCentroPagamentos = (porCentroRaw as any)?.pagamentos ?? [];

  const totalRecebimentos = parseFloat(String(stats?.recebimentos?.totalGeral ?? 0));
  const totalPagamentos = parseFloat(String(stats?.pagamentos?.totalGeral ?? 0));
  const fluxoCaixa = totalRecebimentos - totalPagamentos;

  // Anos disponíveis (últimos 5 anos + próximo)
  const anos = Array.from({ length: 6 }, (_, i) => now.getFullYear() - 4 + i);

  // Dados do gráfico histórico — mescla pagMensal e recMensal por ano/mes
  const historicoMap = new Map<string, { mes: string; Recebimentos: number; Pagamentos: number }>();
  recMensal.forEach((h: any) => {
    const key = `${h.ano}-${String(h.mes).padStart(2, "0")}`;
    const entry = historicoMap.get(key) ?? { mes: MESES[(h.mes - 1) % 12].substring(0, 3), Recebimentos: 0, Pagamentos: 0 };
    entry.Recebimentos = parseFloat(String(h.total ?? 0));
    historicoMap.set(key, entry);
  });
  pagMensal.forEach((h: any) => {
    const key = `${h.ano}-${String(h.mes).padStart(2, "0")}`;
    const entry = historicoMap.get(key) ?? { mes: MESES[(h.mes - 1) % 12].substring(0, 3), Recebimentos: 0, Pagamentos: 0 };
    entry.Pagamentos = parseFloat(String(h.total ?? 0));
    historicoMap.set(key, entry);
  });
  const historicoData = Array.from(historicoMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => ({ ...v, "Fluxo Líquido": v.Recebimentos - v.Pagamentos }));

  // Dados do gráfico por centro de custo — mescla recebimentos e pagamentos por nome
  const centroCustoMap = new Map<string, { Recebimentos: number; Pagamentos: number }>();
  porCentroRecebimentos.forEach((c: any) => {
    const nome = c.nomeCentro ?? "Sem CC";
    const entry = centroCustoMap.get(nome) ?? { Recebimentos: 0, Pagamentos: 0 };
    entry.Recebimentos = parseFloat(String(c.total ?? 0));
    centroCustoMap.set(nome, entry);
  });
  porCentroPagamentos.forEach((c: any) => {
    const nome = c.nomeCentro ?? "Sem CC";
    const entry = centroCustoMap.get(nome) ?? { Recebimentos: 0, Pagamentos: 0 };
    entry.Pagamentos = parseFloat(String(c.total ?? 0));
    centroCustoMap.set(nome, entry);
  });
  const centroCustoData = Array.from(centroCustoMap.entries()).slice(0, 8).map(([nome, vals]) => ({
    name: nome.length > 12 ? nome.substring(0, 12) + "…" : nome,
    ...vals,
  }));

  // Dados do gráfico de composição (pizza)
  const composicaoData = [
    { name: "Equipamentos", value: parseFloat(String(stats?.recebimentos?.totalEquipamento ?? 0)) },
    { name: "Serviços", value: parseFloat(String(stats?.recebimentos?.totalServico ?? 0)) },
  ].filter(d => d.value > 0);

  const isMesAtual = mes === now.getMonth() + 1 && ano === now.getFullYear();

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        {/* Header com filtro de período */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard Financeiro</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {isMesAtual ? "Mês corrente" : `${MESES[mes - 1]} de ${ano}`} — visão consolidada do fluxo de caixa
            </p>
          </div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <Select value={String(mes)} onValueChange={v => setMes(parseInt(v))}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MESES.map((m, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(ano)} onValueChange={v => setAno(parseInt(v))}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {anos.map(a => (
                  <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={<ArrowDownCircle className="h-5 w-5 text-green-500" />}
            label="Total Recebimentos"
            value={formatCurrency(stats?.recebimentos?.totalGeral)}
            sub={`${stats?.recebimentos?.count ?? 0} registros`}
            accent="border-l-green-500"
            valueColor="text-green-600"
            loading={isLoading}
          />
          <KpiCard
            icon={<ArrowUpCircle className="h-5 w-5 text-red-500" />}
            label="Total Pagamentos"
            value={formatCurrency(stats?.pagamentos?.totalGeral)}
            sub={`${stats?.pagamentos?.count ?? 0} registros`}
            accent="border-l-red-500"
            valueColor="text-red-600"
            loading={isLoading}
          />
          <KpiCard
            icon={<TrendingUp className="h-5 w-5 text-blue-500" />}
            label="Fluxo de Caixa"
            value={formatCurrency(fluxoCaixa)}
            sub="Recebimentos − Pagamentos"
            accent={fluxoCaixa >= 0 ? "border-l-blue-500" : "border-l-orange-500"}
            valueColor={fluxoCaixa >= 0 ? "text-blue-600" : "text-orange-600"}
            loading={isLoading}
          />
          <KpiCard
            icon={<Wallet className="h-5 w-5 text-purple-500" />}
            label="A Receber (Pendente)"
            value={formatCurrency(stats?.recebimentos?.totalPendente)}
            sub="Aguardando recebimento"
            accent="border-l-purple-500"
            valueColor="text-purple-600"
            loading={isLoading}
          />
        </div>

        {/* Alertas rápidos */}
        {!isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <AlertCard
              icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
              label="Recebimentos Atrasados"
              value={formatCurrency(stats?.recebimentos?.totalAtrasado)}
              bg="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
            />
            <AlertCard
              icon={<Clock className="h-4 w-4 text-yellow-500" />}
              label="Pagamentos Pendentes"
              value={formatCurrency(stats?.pagamentos?.totalPendente)}
              bg="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
            />
            <AlertCard
              icon={<CheckCircle2 className="h-4 w-4 text-green-500" />}
              label="Recebimentos Confirmados"
              value={formatCurrency(stats?.recebimentos?.totalRecebido)}
              bg="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
            />
          </div>
        )}

        {/* Painel de Alertas de Vencimento */}
        {totalAlertas > 0 && (
          <Card className="border-orange-300 dark:border-orange-700 bg-orange-50/50 dark:bg-orange-900/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-orange-700 dark:text-orange-400">
                <BellRing className="h-5 w-5" />
                Alertas de Vencimento — Próximos 7 dias
                <span className="ml-auto text-xs font-normal bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200 px-2 py-0.5 rounded-full">
                  {totalAlertas} {totalAlertas === 1 ? "item" : "itens"}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Pagamentos a vencer */}
                {vencPagamentos.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" /> Pagamentos a Efetuar
                    </p>
                    <div className="space-y-2">
                      {vencPagamentos.map((p: any) => {
                        const data = p.dataPagamento ? new Date(p.dataPagamento) : null;
                        const hoje = new Date(); hoje.setHours(0,0,0,0);
                        const atrasado = data && data < hoje;
                        return (
                          <div key={p.id} className={`flex items-center justify-between rounded-md px-3 py-2 text-sm border ${
                            atrasado
                              ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                              : "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
                          }`}>
                            <div className="min-w-0">
                              <p className="font-medium truncate">{p.nomeCompleto}</p>
                              <p className="text-xs text-muted-foreground">
                                {p.numeroControle && <span className="mr-2">{p.numeroControle}</span>}
                                {atrasado ? (
                                  <span className="text-red-600 font-semibold">ATRASADO — {data?.toLocaleDateString("pt-BR")}</span>
                                ) : (
                                  <span>{data?.toLocaleDateString("pt-BR")}</span>
                                )}
                              </p>
                            </div>
                            <span className="font-semibold text-red-600 dark:text-red-400 ml-3 shrink-0">
                              {formatCurrency(p.valor)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {/* Recebimentos a vencer */}
                {vencRecebimentos.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <Bell className="h-3.5 w-3.5" /> Recebimentos a Cobrar
                    </p>
                    <div className="space-y-2">
                      {vencRecebimentos.map((r: any) => {
                        const data = r.dataVencimento ? new Date(r.dataVencimento) : null;
                        const hoje = new Date(); hoje.setHours(0,0,0,0);
                        const atrasado = data && data < hoje;
                        return (
                          <div key={r.id} className={`flex items-center justify-between rounded-md px-3 py-2 text-sm border ${
                            atrasado
                              ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                              : "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800"
                          }`}>
                            <div className="min-w-0">
                              <p className="font-medium truncate">{r.nomeRazaoSocial}</p>
                              <p className="text-xs text-muted-foreground">
                                {r.numeroControle && <span className="mr-2">{r.numeroControle}</span>}
                                {atrasado ? (
                                  <span className="text-red-600 font-semibold">ATRASADO — {data?.toLocaleDateString("pt-BR")}</span>
                                ) : (
                                  <span>Vence {data?.toLocaleDateString("pt-BR")}</span>
                                )}
                              </p>
                            </div>
                            <span className="font-semibold text-purple-600 dark:text-purple-400 ml-3 shrink-0">
                              {formatCurrency(r.valorTotal)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Gráfico Comparativo Histórico (6 meses) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Comparativo dos Últimos 6 Meses — {ano}</CardTitle>
          </CardHeader>
          <CardContent>
            {historicoData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Sem dados para exibir.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={historicoData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={formatCurrencyShort} tick={{ fontSize: 11 }} width={80} />
                  <Tooltip formatter={(v: any) => formatCurrency(v)} />
                  <Legend />
                  <Bar dataKey="Recebimentos" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Pagamentos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Gráfico Fluxo Líquido */}
        {historicoData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Evolução do Fluxo Líquido — {ano}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={historicoData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={formatCurrencyShort} tick={{ fontSize: 11 }} width={80} />
                  <Tooltip formatter={(v: any) => formatCurrency(v)} />
                  <Line
                    type="monotone"
                    dataKey="Fluxo Líquido"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Gráfico por Centro de Custo + Composição */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Por Centro de Custo — {MESES[mes - 1]}/{ano}</CardTitle>
            </CardHeader>
            <CardContent>
              {centroCustoData.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Nenhum registro com centro de custo neste período.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={centroCustoData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" tickFormatter={formatCurrencyShort} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                    <Tooltip formatter={(v: any) => formatCurrency(v)} />
                    <Legend />
                    <Bar dataKey="Recebimentos" fill="#22c55e" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="Pagamentos" fill="#ef4444" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Composição de Faturamento — {MESES[mes - 1]}/{ano}</CardTitle>
            </CardHeader>
            <CardContent>
              {composicaoData.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Sem dados de composição neste período.
                </p>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={composicaoData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {composicaoData.map((_, index) => (
                          <Cell key={index} fill={COLORS_PIE[index % COLORS_PIE.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any) => formatCurrency(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex gap-4 text-sm">
                    {composicaoData.map((d, i) => (
                      <div key={d.name} className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full" style={{ background: COLORS_PIE[i] }} />
                        <span className="text-muted-foreground">{d.name}:</span>
                        <span className="font-semibold">{formatCurrency(d.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Status detalhado */}
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
                  <StatusRow label="Pendente / Em Processamento" value={(stats?.pagamentos as any)?.totalPendente} color="text-yellow-600" bg="bg-yellow-50 dark:bg-yellow-900/20" />
                  {(stats?.pagamentos as any)?.totalProcessando > 0 && (
                    <StatusRow label="↳ Em Processamento" value={(stats?.pagamentos as any)?.totalProcessando} color="text-orange-600" bg="bg-orange-50 dark:bg-orange-900/20" />
                  )}
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
      </div>
    </DashboardLayout>
  );
}

function KpiCard({ icon, label, value, sub, accent, valueColor, loading }: {
  icon: React.ReactNode; label: string; value: string; sub: string;
  accent: string; valueColor: string; loading: boolean;
}) {
  return (
    <Card className={`border-l-4 ${accent}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          {icon}
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-8 w-24 bg-muted animate-pulse rounded" />
        ) : (
          <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      </CardContent>
    </Card>
  );
}

function AlertCard({ icon, label, value, bg }: { icon: React.ReactNode; label: string; value: string; bg: string }) {
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${bg}`}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm text-foreground">{label}</span>
      </div>
      <span className="text-sm font-bold text-foreground">{value}</span>
    </div>
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
