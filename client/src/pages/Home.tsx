import React, { useState, useMemo, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import {
  ArrowDownCircle, ArrowUpCircle, TrendingUp, Wallet,
  AlertTriangle, CheckCircle2, Clock, CalendarDays, Bell, BellRing,
  Settings, X, Eye, EyeOff, FolderOpen, Target, Zap, ChevronRight,
  TrendingDown, BarChart3, AlertCircle, Plus, ClipboardList, FileText,
  HardHat, DollarSign, FolderKanban, ExternalLink, CreditCard,
} from "lucide-react";
import { useLocation } from "wouter";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell,
} from "recharts";

// === Temas de cor disponíveis ===
const TEMAS = [
  { id: "azul",    label: "Azul",    primary: "#2563eb", accent: "#3b82f6" },
  { id: "verde",   label: "Verde",   primary: "#16a34a", accent: "#22c55e" },
  { id: "roxo",    label: "Roxo",    primary: "#7c3aed", accent: "#8b5cf6" },
  { id: "laranja", label: "Laranja", primary: "#ea580c", accent: "#f97316" },
  { id: "cinza",   label: "Cinza",   primary: "#374151", accent: "#6b7280" },
  { id: "rosa",    label: "Rosa",    primary: "#be185d", accent: "#ec4899" },
];

// === Widgets disponíveis no dashboard ===
const WIDGETS_DEFAULT = [
  { id: "kpis",         label: "Cards KPI (Totais)",              visivel: true },
  { id: "alertas",      label: "Alertas Rápidos (Status)",        visivel: true },
  { id: "vencimentos",  label: "Alertas de Vencimento (7 dias)",  visivel: true },
  { id: "historico",    label: "Gráfico Histórico (6 meses)",     visivel: true },
  { id: "fluxo",        label: "Evolução do Fluxo Líquido",       visivel: true },
  { id: "centrocusto",  label: "Por Centro de Custo",             visivel: true },
  { id: "composicao",   label: "Composição de Faturamento",       visivel: true },
  { id: "status",       label: "Status Detalhado (Tabelas)",      visivel: true },
  { id: "kpiProjetos",  label: "KPIs Estratégicos por Projeto",    visivel: true },
  { id: "acoesPrioritarias", label: "Ações Prioritárias",             visivel: true },
];

function applyTema(temaId: string) {
  const tema = TEMAS.find(t => t.id === temaId) ?? TEMAS[0];
  document.documentElement.style.setProperty("--color-primary-custom", tema.primary);
  // Aplica ao :root via CSS variable para uso em tailwind
  const root = document.documentElement;
  // Converte hex para hsl aproximado para compatibilidade com shadcn
  root.setAttribute("data-tema", temaId);
}

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
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { can } = usePermissions();
  const podePagamentos = can.ver("pagamentos");
  const podeRecebimentos = can.ver("recebimentos");

  // === Configuração de widgets e tema ===
  const [showConfig, setShowConfig] = useState(false);
  const [widgets, setWidgets] = useState(WIDGETS_DEFAULT);
  const [tema, setTema] = useState("azul");
  const [configDirty, setConfigDirty] = useState(false);

  // Carrega configuração salva do banco (apenas admin)
  const { data: savedConfig } = trpc.dashboard.getConfig.useQuery(undefined, { enabled: isAdmin });
  const saveConfigMutation = trpc.dashboard.saveConfig.useMutation({
    onSuccess: () => { setConfigDirty(false); setShowConfig(false); },
  });

  // Aplica configuração salva ao carregar
  useEffect(() => {
    if (!savedConfig) return;
    try {
      const parsed = JSON.parse(savedConfig.widgets || "[]");
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Mescla com defaults para garantir novos widgets
        const merged = WIDGETS_DEFAULT.map(w => {
          const saved = parsed.find((s: any) => s.id === w.id);
          return saved ? { ...w, visivel: saved.visivel } : w;
        });
        setWidgets(merged);
      }
    } catch {}
    if (savedConfig.tema) {
      setTema(savedConfig.tema);
      applyTema(savedConfig.tema);
    }
  }, [savedConfig]);

  // Aplica tema ao mudar
  useEffect(() => { applyTema(tema); }, [tema]);

  const isVisible = (id: string) => widgets.find(w => w.id === id)?.visivel ?? true;

  const handleToggleWidget = (id: string) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, visivel: !w.visivel } : w));
    setConfigDirty(true);
  };

  const handleSaveConfig = () => {
    saveConfigMutation.mutate({ widgets: JSON.stringify(widgets), tema });
  };

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

  // KPIs estratégicos por projeto
  const { data: kpiProjetosData } = trpc.dashboard.kpiProjetos.useQuery();
  const kpiProjetos = kpiProjetosData?.projetos ?? [];
  const kpiTotais = kpiProjetosData?.totais ?? { receita: 0, custo: 0, margem: 0, margemPct: null };

  // Ações prioritárias
  const { data: acoesPrioritariasData } = trpc.dashboard.acoesPrioritarias.useQuery();

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
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConfig(v => !v)}
                className="gap-1.5"
                title="Configurar Dashboard"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Configurar</span>
              </Button>
            )}
          </div>
        </div>

        {/* ===== BARRA DE AÇÕES RÁPIDAS ===== */}
        <div className="rounded-xl border bg-gradient-to-r from-primary/5 via-background to-primary/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Ações Rápidas</span>
            <span className="text-xs text-muted-foreground ml-1">— crie em 1 clique</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {can.criar("engenharia_contratos") && (
              <Button
                size="sm"
                className="gap-1.5 bg-green-600 hover:bg-green-700 text-white shadow-sm"
                onClick={() => setLocation("/propostas?novo=1")}
              >
                <Plus className="h-3.5 w-3.5" />
                Nova Proposta
              </Button>
            )}
            {can.criar("projetos") && (
              <Button
                size="sm"
                className="gap-1.5 bg-green-600 hover:bg-green-700 text-white shadow-sm"
                onClick={() => setLocation("/projetos?novo=1")}
              >
                <Plus className="h-3.5 w-3.5" />
                Novo Projeto
              </Button>
            )}
            {can.criar("engenharia_contratos") && (
              <Button
                size="sm"
                className="gap-1.5 bg-green-600 hover:bg-green-700 text-white shadow-sm"
                onClick={() => setLocation("/contratos?novo=1")}
              >
                <Plus className="h-3.5 w-3.5" />
                Novo Contrato
              </Button>
            )}
            {can.criar("engenharia_os") && (
              <Button
                size="sm"
                className="gap-1.5 bg-green-600 hover:bg-green-700 text-white shadow-sm"
                onClick={() => setLocation("/engenharia?novaOS=1")}
              >
                <Plus className="h-3.5 w-3.5" />
                Nova OS
              </Button>
            )}
            {can.criar("pagamentos") && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-50 shadow-sm"
                onClick={() => setLocation("/pagamentos?novo=1")}
              >
                <Plus className="h-3.5 w-3.5" />
                Novo Pagamento
              </Button>
            )}
            {can.criar("recebimentos") && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-purple-300 text-purple-700 hover:bg-purple-50 shadow-sm"
                onClick={() => setLocation("/recebimentos?novo=1")}
              >
                <Plus className="h-3.5 w-3.5" />
                Novo Recebimento
              </Button>
            )}
          </div>
        </div>

        {/* Painel de Configuração do Dashboard (admin only) */}
        {isAdmin && showConfig && (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2"><Settings className="h-4 w-4" /> Configurar Dashboard</span>
                <button onClick={() => setShowConfig(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Seletor de tema */}
              <div>
                <p className="text-sm font-semibold mb-2">Tema de Cor</p>
                <div className="flex flex-wrap gap-2">
                  {TEMAS.map(t => (
                    <button
                      key={t.id}
                      onClick={() => { setTema(t.id); setConfigDirty(true); }}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition-all ${
                        tema === t.id
                          ? "border-foreground bg-foreground text-background font-semibold"
                          : "border-border hover:border-foreground/50"
                      }`}
                    >
                      <span className="w-3 h-3 rounded-full" style={{ background: t.primary }} />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Visibilidade de widgets */}
              <div>
                <p className="text-sm font-semibold mb-2">Widgets Visíveis</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {widgets.map(w => (
                    <button
                      key={w.id}
                      onClick={() => handleToggleWidget(w.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm border transition-all text-left ${
                        w.visivel
                          ? "border-green-300 bg-green-50 dark:bg-green-900/20 text-foreground"
                          : "border-border bg-muted text-muted-foreground"
                      }`}
                    >
                      {w.visivel
                        ? <Eye className="h-3.5 w-3.5 text-green-600 shrink-0" />
                        : <EyeOff className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Botões de ação */}
              <div className="flex gap-2 pt-1">
                <Button
                  onClick={handleSaveConfig}
                  disabled={!configDirty || saveConfigMutation.isPending}
                  size="sm"
                >
                  {saveConfigMutation.isPending ? "Salvando..." : "Salvar Configuração"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setWidgets(WIDGETS_DEFAULT);
                    setTema("azul");
                    setConfigDirty(true);
                  }}
                >
                  Restaurar Padrão
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* KPI Cards */}
        {isVisible("kpis") && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {podeRecebimentos && (
            <KpiCard
              icon={<ArrowDownCircle className="h-5 w-5 text-green-500" />}
              label="Total Recebimentos"
              value={formatCurrency(stats?.recebimentos?.totalGeral)}
              sub={`${stats?.recebimentos?.count ?? 0} registros`}
              accent="border-l-green-500"
              valueColor="text-green-600"
              loading={isLoading}
            />
          )}
          {podePagamentos && (
            <KpiCard
              icon={<ArrowUpCircle className="h-5 w-5 text-red-500" />}
              label="Total Compras e Pagamentos"
              value={formatCurrency(stats?.pagamentos?.totalGeral)}
              sub={`${stats?.pagamentos?.count ?? 0} registros`}
              accent="border-l-red-500"
              valueColor="text-red-600"
              loading={isLoading}
            />
          )}
          {(podePagamentos || podeRecebimentos) && (
            <KpiCard
              icon={<TrendingUp className="h-5 w-5 text-blue-500" />}
              label="Fluxo de Caixa"
              value={formatCurrency(fluxoCaixa)}
              sub="Recebimentos − Pagamentos"
              accent={fluxoCaixa >= 0 ? "border-l-blue-500" : "border-l-orange-500"}
              valueColor={fluxoCaixa >= 0 ? "text-blue-600" : "text-orange-600"}
              loading={isLoading}
            />
          )}
          {podeRecebimentos && (
            <KpiCard
              icon={<Wallet className="h-5 w-5 text-purple-500" />}
              label="A Receber (Pendente)"
              value={formatCurrency(stats?.recebimentos?.totalPendente)}
              sub="Aguardando recebimento"
              accent="border-l-purple-500"
              valueColor="text-purple-600"
              loading={isLoading}
            />
          )}
          {!podePagamentos && !podeRecebimentos && (
            <div className="col-span-4 text-center py-8 text-muted-foreground text-sm">
              Você não tem permissão para visualizar dados financeiros neste painel.
            </div>
          )}
        </div>
        )}

        {/* Alertas rápidos */}
        {isVisible("alertas") && !isLoading && (podePagamentos || podeRecebimentos) && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {podeRecebimentos && (
              <AlertCard
                icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
                label="Recebimentos Atrasados"
                value={formatCurrency(stats?.recebimentos?.totalAtrasado)}
                bg="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                action={{ label: "Cobrar", onClick: () => setLocation("/recebimentos"), color: "border-red-400 text-red-700 hover:bg-red-100" }}
              />
            )}
            {podePagamentos && (
              <AlertCard
                icon={<Clock className="h-4 w-4 text-yellow-500" />}
                label="Compras e Pagamentos Pendentes"
                value={formatCurrency(stats?.pagamentos?.totalPendente)}
                bg="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
                action={{ label: "Ver", onClick: () => setLocation("/pagamentos"), color: "border-yellow-500 text-yellow-700 hover:bg-yellow-100" }}
              />
            )}
            {podeRecebimentos && (
              <AlertCard
                icon={<CheckCircle2 className="h-4 w-4 text-green-500" />}
                label="Recebimentos Confirmados"
                value={formatCurrency(stats?.recebimentos?.totalRecebido)}
                bg="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                action={{ label: "Ver", onClick: () => setLocation("/recebimentos"), color: "border-green-500 text-green-700 hover:bg-green-100" }}
              />
            )}
          </div>
        )}

        {/* Painel de Alertas de Vencimento */}
        {isVisible("vencimentos") && totalAlertas > 0 && (
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
                            <div className="min-w-0 flex-1">
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
                            <div className="flex items-center gap-2 ml-3 shrink-0">
                              <span className="font-semibold text-red-600 dark:text-red-400">
                                {formatCurrency(p.valor)}
                              </span>
                              <button
                                onClick={() => setLocation("/pagamentos")}
                                className="text-xs font-semibold px-2 py-0.5 rounded border border-red-300 text-red-700 hover:bg-red-100 transition-colors"
                                title="Ver pagamento"
                              >
                                Pagar
                              </button>
                            </div>
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
                            <div className="min-w-0 flex-1">
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
                            <div className="flex items-center gap-2 ml-3 shrink-0">
                              <span className="font-semibold text-purple-600 dark:text-purple-400">
                                {formatCurrency(r.valorTotal)}
                              </span>
                              <button
                                onClick={() => setLocation("/recebimentos")}
                                className="text-xs font-semibold px-2 py-0.5 rounded border border-purple-300 text-purple-700 hover:bg-purple-100 transition-colors"
                                title="Ver recebimento"
                              >
                                Cobrar
                              </button>
                            </div>
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
        {isVisible("historico") && (
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
        )}

        {/* Gráfico Fluxo Líquido */}
        {isVisible("fluxo") && historicoData.length > 0 && (
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
        {(isVisible("centrocusto") || isVisible("composicao")) && (
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
        )}

        {/* Status detalhado */}
        {isVisible("status") && (
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
        )}
        {/* KPIs Estratégicos por Projeto */}
        {isVisible("kpiProjetos") && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                KPIs Estratégicos por Projeto
              </h2>
              <button onClick={() => setLocation("/projetos")} className="text-xs text-primary hover:underline flex items-center gap-1">
                Ver todos <ChevronRight className="h-3 w-3" />
              </button>
            </div>

            {/* Totais consolidados */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card className="border-l-4 border-l-green-500">
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-muted-foreground">Receita Total (Contratos)</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(kpiTotais.receita)}</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-red-500">
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-muted-foreground">Custo Total Realizado</p>
                  <p className="text-xl font-bold text-red-600">{formatCurrency(kpiTotais.custo)}</p>
                </CardContent>
              </Card>
              <Card className={`border-l-4 ${kpiTotais.margem >= 0 ? "border-l-blue-500" : "border-l-orange-500"}`}>
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-muted-foreground">Margem Bruta Total</p>
                  <p className={`text-xl font-bold ${kpiTotais.margem >= 0 ? "text-blue-600" : "text-orange-600"}`}>
                    {formatCurrency(kpiTotais.margem)}
                    {kpiTotais.margemPct !== null && (
                      <span className="text-sm font-normal ml-1">({kpiTotais.margemPct.toFixed(1)}%)</span>
                    )}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Tabela por projeto */}
            {kpiProjetos.length > 0 && (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left px-4 py-2 font-medium text-muted-foreground">Projeto</th>
                          <th className="text-right px-4 py-2 font-medium text-muted-foreground">Receita</th>
                          <th className="text-right px-4 py-2 font-medium text-muted-foreground">Custo</th>
                          <th className="text-right px-4 py-2 font-medium text-muted-foreground">Margem</th>
                          <th className="text-right px-4 py-2 font-medium text-muted-foreground">Desvio</th>
                          <th className="text-center px-4 py-2 font-medium text-muted-foreground">OS</th>
                          <th className="text-center px-4 py-2 font-medium text-muted-foreground">Ação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {kpiProjetos.map(p => (
                          <tr key={p.id} className="border-b hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-2">
                                <FolderOpen className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                <button
                                  onClick={() => setLocation(`/projetos/${p.id}/orcamento`)}
                                  className="text-left hover:text-primary hover:underline truncate max-w-[180px]"
                                >
                                  {p.nome}
                                </button>
                                {p.alertaDesvio && <AlertCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />}
                              </div>
                            </td>
                            <td className="px-4 py-2 text-right font-medium">{formatCurrency(p.receita)}</td>
                            <td className="px-4 py-2 text-right text-red-600">{formatCurrency(p.custo)}</td>
                            <td className={`px-4 py-2 text-right font-semibold ${p.margem >= 0 ? "text-green-600" : "text-red-600"}`}>
                              {formatCurrency(p.margem)}
                              {p.margemPct !== null && (
                                <span className="text-xs font-normal ml-1">({p.margemPct.toFixed(1)}%)</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-right">
                              {p.desvio !== null ? (
                                <span className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded ${
                                  p.desvio > 10 ? "bg-red-100 text-red-700" :
                                  p.desvio > 0 ? "bg-yellow-100 text-yellow-700" :
                                  "bg-green-100 text-green-700"
                                }`}>
                                  {p.desvio > 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                                  {p.desvio > 0 ? "+" : ""}{p.desvio.toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-center text-xs text-muted-foreground">
                              {p.osConcluidasCount}/{p.totalOs}
                            </td>
                            <td className="px-4 py-2 text-center">
                              <button
                                onClick={() => setLocation("/projetos")}
                                className="text-xs font-semibold px-2.5 py-1 rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors inline-flex items-center gap-1"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Abrir
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Ações Prioritárias */}
        {isVisible("acoesPrioritarias") && acoesPrioritariasData && acoesPrioritariasData.length > 0 && (
          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <Zap className="h-5 w-5" />
                Ações Prioritárias
                <span className="ml-auto text-xs font-normal bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded-full">
                  {acoesPrioritariasData.length} {acoesPrioritariasData.length === 1 ? "item" : "itens"}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {acoesPrioritariasData.map((acao, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:opacity-80 transition-opacity ${
                    acao.urgencia === "alta" ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800" :
                    "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
                  }`}
                  onClick={() => setLocation(acao.link)}
                >
                  <AlertCircle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                    acao.urgencia === "alta" ? "text-red-500" : "text-yellow-500"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{acao.descricao}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                    acao.urgencia === "alta" ? "bg-red-200 text-red-800" : "bg-yellow-200 text-yellow-800"
                  }`}>
                    {acao.urgencia === "alta" ? "URGENTE" : "ATENÇÃO"}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
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

function AlertCard({ icon, label, value, bg, action }: { icon: React.ReactNode; label: string; value: string; bg: string; action?: { label: string; onClick: () => void; color?: string } }) {
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${bg}`}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm text-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-foreground">{value}</span>
        {action && (
          <button
            onClick={action.onClick}
            className={`text-xs font-semibold px-2 py-1 rounded-md border transition-colors ${action.color ?? "border-current text-current hover:bg-black/5"}`}
          >
            {action.label}
          </button>
        )}
      </div>
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
