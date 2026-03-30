import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import {
  Plus, Zap, AlertTriangle, AlertCircle, Bell, BellRing, Clock,
  CheckCircle2, ArrowDownCircle, ArrowUpCircle, TrendingUp, TrendingDown,
  Wallet, FolderOpen, HardHat, FileText, DollarSign, CreditCard,
  ChevronRight, ExternalLink, BarChart3, Settings, X, Eye, EyeOff,
  CalendarDays, Target, ClipboardList, Wrench, FolderKanban,
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
  { id: "kpis",              label: "Cards KPI (Totais)",              visivel: true },
  { id: "alertas",           label: "Alertas Rápidos (Status)",        visivel: true },
  { id: "vencimentos",       label: "Alertas de Vencimento (7 dias)",  visivel: true },
  { id: "projetos",          label: "Bloco Projetos em Execução",      visivel: true },
  { id: "operacao",          label: "Bloco Operação (OS)",             visivel: true },
  { id: "historico",         label: "Gráfico Histórico (6 meses)",     visivel: true },
  { id: "fluxo",             label: "Evolução do Fluxo Líquido",       visivel: true },
  { id: "centrocusto",       label: "Por Centro de Custo",             visivel: true },
  { id: "composicao",        label: "Composição de Faturamento",       visivel: true },
  { id: "status",            label: "Status Detalhado (Tabelas)",      visivel: true },
  { id: "kpiProjetos",       label: "KPIs Estratégicos por Projeto",   visivel: true },
  { id: "acoesPrioritarias", label: "Ações Prioritárias",              visivel: true },
];

function applyTema(temaId: string) {
  const tema = TEMAS.find(t => t.id === temaId) ?? TEMAS[0];
  const root = document.documentElement;
  root.style.setProperty("--color-primary-custom", tema.primary);
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

const STATUS_LABEL: Record<string, string> = {
  PLANEJAMENTO: "Planejamento",
  EM_EXECUCAO: "Em Execução",
  CONCLUIDO_TECNICAMENTE: "Concluído",
  CANCELADO: "Cancelado",
  ENCERRADO_FINANCEIRAMENTE: "Encerrado",
};

const STATUS_COLOR: Record<string, string> = {
  PLANEJAMENTO: "bg-blue-100 text-blue-700",
  EM_EXECUCAO: "bg-green-100 text-green-700",
  CONCLUIDO_TECNICAMENTE: "bg-gray-100 text-gray-600",
  CANCELADO: "bg-red-100 text-red-700",
  ENCERRADO_FINANCEIRAMENTE: "bg-purple-100 text-purple-700",
};

// ===== Componente principal =====
export default function Home() {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { can } = usePermissions();
  const podePagamentos = can.ver("pagamentos");
  const podeRecebimentos = can.ver("recebimentos");

  // Configuração de widgets e tema
  const [showConfig, setShowConfig] = useState(false);
  const [widgets, setWidgets] = useState(WIDGETS_DEFAULT);
  const [tema, setTema] = useState("azul");
  const [configDirty, setConfigDirty] = useState(false);

  const { data: savedConfig } = trpc.dashboard.getConfig.useQuery(undefined, { enabled: isAdmin });
  const saveConfigMutation = trpc.dashboard.saveConfig.useMutation({
    onSuccess: () => { setConfigDirty(false); setShowConfig(false); },
  });

  useEffect(() => {
    if (!savedConfig) return;
    try {
      const parsed = JSON.parse(savedConfig.widgets || "[]");
      if (Array.isArray(parsed) && parsed.length > 0) {
        const merged = WIDGETS_DEFAULT.map(w => {
          const saved = parsed.find((s: any) => s.id === w.id);
          return saved ? { ...w, visivel: saved.visivel } : w;
        });
        setWidgets(merged);
      }
    } catch {}
    if (savedConfig.tema) { setTema(savedConfig.tema); applyTema(savedConfig.tema); }
  }, [savedConfig]);

  useEffect(() => { applyTema(tema); }, [tema]);

  const isVisible = (id: string) => widgets.find(w => w.id === id)?.visivel ?? true;
  const handleToggleWidget = (id: string) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, visivel: !w.visivel } : w));
    setConfigDirty(true);
  };
  const handleSaveConfig = () => saveConfigMutation.mutate({ widgets: JSON.stringify(widgets), tema });

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
  const { data: kpiProjetosData } = trpc.dashboard.kpiProjetos.useQuery();
  const kpiProjetos = kpiProjetosData?.projetos ?? [];
  const kpiTotais = kpiProjetosData?.totais ?? { receita: 0, custo: 0, margem: 0, margemPct: null };
  const { data: acoesPrioritariasData } = trpc.dashboard.acoesPrioritarias.useQuery();

  const totalRecebimentos = parseFloat(String(stats?.recebimentos?.totalGeral ?? 0));
  const totalPagamentos = parseFloat(String(stats?.pagamentos?.totalGeral ?? 0));
  const fluxoCaixa = totalRecebimentos - totalPagamentos;
  const anos = Array.from({ length: 6 }, (_, i) => now.getFullYear() - 4 + i);
  const isMesAtual = mes === now.getMonth() + 1 && ano === now.getFullYear();

  // Dados dos gráficos
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

  const composicaoData = [
    { name: "Equipamentos", value: parseFloat(String(stats?.recebimentos?.totalEquipamento ?? 0)) },
    { name: "Serviços", value: parseFloat(String(stats?.recebimentos?.totalServico ?? 0)) },
  ].filter(d => d.value > 0);

  // Projetos em execução e atrasados (derivados de kpiProjetos)
  const projetosEmExecucao = kpiProjetos.filter(p => p.statusOperacional === "EM_EXECUCAO");
  const projetosAtrasados = kpiProjetos.filter(p => p.alertaDesvio);

  // OS: contagem de abertas e atrasadas via acoesPrioritarias
  const osAbertasAcao = acoesPrioritariasData?.find(a => a.tipo === "os_parada");

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 sm:p-6">

        {/* ===== CABEÇALHO ===== */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard Operacional</h1>
            <p className="text-muted-foreground mt-0.5 text-sm">
              {isMesAtual ? "Mês corrente" : `${MESES[mes - 1]} de ${ano}`} — visão consolidada e ações rápidas
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <Select value={String(mes)} onValueChange={v => setMes(parseInt(v))}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MESES.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={String(ano)} onValueChange={v => setAno(parseInt(v))}>
              <SelectTrigger className="w-[90px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {anos.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => setShowConfig(v => !v)} className="gap-1.5" title="Configurar Dashboard">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Configurar</span>
              </Button>
            )}
          </div>
        </div>

        {/* ===== BLOCO 1: AÇÕES RÁPIDAS ===== */}
        <div className="rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/3 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Ações Rápidas</h2>
              <p className="text-xs text-muted-foreground">Crie qualquer registro em até 2 cliques</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {can.criar("engenharia_contratos") && (
              <button
                onClick={() => setLocation("/propostas?novo=1")}
                className="flex flex-col items-center gap-2 p-3 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-all hover:scale-105 shadow-sm"
              >
                <FileText className="h-5 w-5" />
                <span className="text-xs font-semibold text-center leading-tight">Nova Proposta</span>
              </button>
            )}
            {can.criar("projetos") && (
              <button
                onClick={() => setLocation("/projetos?novo=1")}
                className="flex flex-col items-center gap-2 p-3 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-all hover:scale-105 shadow-sm"
              >
                <FolderKanban className="h-5 w-5" />
                <span className="text-xs font-semibold text-center leading-tight">Novo Projeto</span>
              </button>
            )}
            {can.criar("engenharia_contratos") && (
              <button
                onClick={() => setLocation("/contratos?novo=1")}
                className="flex flex-col items-center gap-2 p-3 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-all hover:scale-105 shadow-sm"
              >
                <ClipboardList className="h-5 w-5" />
                <span className="text-xs font-semibold text-center leading-tight">Novo Contrato</span>
              </button>
            )}
            {can.criar("engenharia_os") && (
              <button
                onClick={() => setLocation("/engenharia?novaOS=1")}
                className="flex flex-col items-center gap-2 p-3 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-all hover:scale-105 shadow-sm"
              >
                <Wrench className="h-5 w-5" />
                <span className="text-xs font-semibold text-center leading-tight">Nova OS</span>
              </button>
            )}
            {can.criar("recebimentos") && (
              <button
                onClick={() => setLocation("/recebimentos?novo=1")}
                className="flex flex-col items-center gap-2 p-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-all hover:scale-105 shadow-sm"
              >
                <ArrowDownCircle className="h-5 w-5" />
                <span className="text-xs font-semibold text-center leading-tight">Lançar Receita</span>
              </button>
            )}
            {can.criar("pagamentos") && (
              <button
                onClick={() => setLocation("/pagamentos?novo=1")}
                className="flex flex-col items-center gap-2 p-3 rounded-lg bg-orange-600 hover:bg-orange-700 text-white transition-all hover:scale-105 shadow-sm"
              >
                <ArrowUpCircle className="h-5 w-5" />
                <span className="text-xs font-semibold text-center leading-tight">Lançar Custo</span>
              </button>
            )}
          </div>
        </div>

        {/* ===== PAINEL DE CONFIGURAÇÃO (admin) ===== */}
        {isAdmin && showConfig && (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2"><Settings className="h-4 w-4" /> Configurar Dashboard</span>
                <button onClick={() => setShowConfig(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <p className="text-sm font-semibold mb-2">Tema de Cor</p>
                <div className="flex flex-wrap gap-2">
                  {TEMAS.map(t => (
                    <button key={t.id} onClick={() => { setTema(t.id); setConfigDirty(true); }}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition-all ${
                        tema === t.id ? "border-foreground bg-foreground text-background font-semibold" : "border-border hover:border-foreground/50"
                      }`}>
                      <span className="w-3 h-3 rounded-full" style={{ background: t.primary }} />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold mb-2">Widgets Visíveis</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {widgets.map(w => (
                    <button key={w.id} onClick={() => handleToggleWidget(w.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm border transition-all text-left ${
                        w.visivel ? "border-green-300 bg-green-50 dark:bg-green-900/20 text-foreground" : "border-border bg-muted text-muted-foreground"
                      }`}>
                      {w.visivel ? <Eye className="h-3.5 w-3.5 text-green-600 shrink-0" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button onClick={handleSaveConfig} disabled={!configDirty || saveConfigMutation.isPending} size="sm">
                  {saveConfigMutation.isPending ? "Salvando..." : "Salvar Configuração"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setWidgets(WIDGETS_DEFAULT); setTema("azul"); setConfigDirty(true); }}>
                  Restaurar Padrão
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ===== BLOCO 2: ALERTAS OPERACIONAIS ===== */}
        {isVisible("alertas") && !isLoading && (podePagamentos || podeRecebimentos) && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Alertas Operacionais
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {podeRecebimentos && (
                <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wide mb-1">Recebimentos Atrasados</p>
                      <p className="text-xl font-bold text-red-700 dark:text-red-300">{formatCurrencyShort(parseFloat(String(stats?.recebimentos?.totalAtrasado ?? 0)))}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Cobranças em atraso</p>
                    </div>
                    <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  </div>
                  <Button size="sm" variant="outline" className="mt-3 w-full border-red-400 text-red-700 hover:bg-red-100 bg-transparent font-semibold"
                    onClick={() => setLocation("/recebimentos")}>
                    Cobrar Agora
                  </Button>
                </div>
              )}
              {podePagamentos && (
                <div className="rounded-lg border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 uppercase tracking-wide mb-1">Pagamentos Pendentes</p>
                      <p className="text-xl font-bold text-yellow-700 dark:text-yellow-300">{formatCurrencyShort(parseFloat(String(stats?.pagamentos?.totalPendente ?? 0)))}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Aguardando pagamento</p>
                    </div>
                    <Clock className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                  </div>
                  <Button size="sm" variant="outline" className="mt-3 w-full border-yellow-500 text-yellow-700 hover:bg-yellow-100 bg-transparent font-semibold"
                    onClick={() => setLocation("/pagamentos")}>
                    Ver Pagamentos
                  </Button>
                </div>
              )}
              {osAbertasAcao && (
                <div className="rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-orange-700 dark:text-orange-400 uppercase tracking-wide mb-1">OS Sem Conclusão</p>
                      <p className="text-sm font-bold text-orange-700 dark:text-orange-300 leading-snug">{osAbertasAcao.descricao}</p>
                    </div>
                    <HardHat className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                  </div>
                  <Button size="sm" variant="outline" className="mt-3 w-full border-orange-400 text-orange-700 hover:bg-orange-100 bg-transparent font-semibold"
                    onClick={() => setLocation("/engenharia")}>
                    Abrir OS
                  </Button>
                </div>
              )}
              {!osAbertasAcao && podeRecebimentos && (
                <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide mb-1">Recebimentos Confirmados</p>
                      <p className="text-xl font-bold text-green-700 dark:text-green-300">{formatCurrencyShort(parseFloat(String(stats?.recebimentos?.totalRecebido ?? 0)))}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Já recebidos no período</p>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  </div>
                  <Button size="sm" variant="outline" className="mt-3 w-full border-green-500 text-green-700 hover:bg-green-100 bg-transparent font-semibold"
                    onClick={() => setLocation("/recebimentos")}>
                    Ver Recebimentos
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== BLOCO 3: FINANCEIRO ===== */}
        {isVisible("kpis") && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                Financeiro — {isMesAtual ? "Mês Atual" : `${MESES[mes - 1]}/${ano}`}
              </h2>
              <div className="flex gap-2">
                {podeRecebimentos && (
                  <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => setLocation("/recebimentos")}>
                    <ArrowDownCircle className="h-3.5 w-3.5 text-green-600" />
                    Ver Cobranças
                  </Button>
                )}
                {podePagamentos && (
                  <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => setLocation("/pagamentos")}>
                    <ArrowUpCircle className="h-3.5 w-3.5 text-red-500" />
                    Ver Pagamentos
                  </Button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {podeRecebimentos && (
                <KpiCard
                  icon={<ArrowDownCircle className="h-5 w-5 text-green-500" />}
                  label="Total a Receber" sublabel="Pendente"
                  value={formatCurrency(stats?.recebimentos?.totalPendente)}
                  total={formatCurrency(stats?.recebimentos?.totalGeral)}
                  accent="border-l-green-500" valueColor="text-green-600"
                  loading={isLoading}
                  onClick={() => setLocation("/recebimentos")}
                />
              )}
              {podeRecebimentos && (
                <KpiCard
                  icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                  label="Total Recebido" sublabel="Confirmado"
                  value={formatCurrency(stats?.recebimentos?.totalRecebido)}
                  total={`${stats?.recebimentos?.count ?? 0} registros`}
                  accent="border-l-emerald-500" valueColor="text-emerald-600"
                  loading={isLoading}
                  onClick={() => setLocation("/recebimentos")}
                />
              )}
              {podePagamentos && (
                <KpiCard
                  icon={<ArrowUpCircle className="h-5 w-5 text-red-500" />}
                  label="Total a Pagar" sublabel="Compras e custos"
                  value={formatCurrency(stats?.pagamentos?.totalGeral)}
                  total={`${stats?.pagamentos?.count ?? 0} registros`}
                  accent="border-l-red-500" valueColor="text-red-600"
                  loading={isLoading}
                  onClick={() => setLocation("/pagamentos")}
                />
              )}
              {(podePagamentos || podeRecebimentos) && (
                <KpiCard
                  icon={<TrendingUp className="h-5 w-5 text-blue-500" />}
                  label="Fluxo de Caixa" sublabel="Receitas − Custos"
                  value={formatCurrency(fluxoCaixa)}
                  total={fluxoCaixa >= 0 ? "Positivo" : "Negativo"}
                  accent={fluxoCaixa >= 0 ? "border-l-blue-500" : "border-l-orange-500"}
                  valueColor={fluxoCaixa >= 0 ? "text-blue-600" : "text-orange-600"}
                  loading={isLoading}
                />
              )}
            </div>
          </div>
        )}

        {/* ===== BLOCO 4: ALERTAS DE VENCIMENTO ===== */}
        {isVisible("vencimentos") && totalAlertas > 0 && (
          <Card className="border-orange-300 dark:border-orange-700 bg-orange-50/50 dark:bg-orange-900/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-orange-700 dark:text-orange-400">
                <BellRing className="h-4 w-4" />
                Alertas de Vencimento — Próximos 7 dias
                <span className="ml-auto text-xs font-normal bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200 px-2 py-0.5 rounded-full">
                  {totalAlertas} {totalAlertas === 1 ? "item" : "itens"}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {vencPagamentos.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" /> Pagamentos a Efetuar
                      </p>
                      <button onClick={() => setLocation("/pagamentos")} className="text-xs text-primary hover:underline flex items-center gap-0.5">
                        Ver todos <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="space-y-2">
                      {vencPagamentos.map((p: any) => {
                        const data = p.dataPagamento ? new Date(p.dataPagamento) : null;
                        const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
                        const atrasado = data && data < hoje;
                        return (
                          <div key={p.id} className={`flex items-center justify-between rounded-md px-3 py-2 text-sm border ${atrasado ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800" : "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"}`}>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium truncate">{p.nomeCompleto}</p>
                              <p className="text-xs text-muted-foreground">
                                {p.numeroControle && <span className="mr-2">{p.numeroControle}</span>}
                                {atrasado ? <span className="text-red-600 font-semibold">ATRASADO — {data?.toLocaleDateString("pt-BR")}</span> : <span>{data?.toLocaleDateString("pt-BR")}</span>}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 ml-3 shrink-0">
                              <span className="font-semibold text-red-600 dark:text-red-400">{formatCurrency(p.valor)}</span>
                              <button onClick={() => setLocation("/pagamentos")} className="text-xs font-semibold px-2 py-0.5 rounded border border-red-300 text-red-700 hover:bg-red-100 transition-colors">Pagar</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {vencRecebimentos.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide flex items-center gap-1">
                        <Bell className="h-3.5 w-3.5" /> Recebimentos a Cobrar
                      </p>
                      <button onClick={() => setLocation("/recebimentos")} className="text-xs text-primary hover:underline flex items-center gap-0.5">
                        Ver todos <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="space-y-2">
                      {vencRecebimentos.map((r: any) => {
                        const data = r.dataVencimento ? new Date(r.dataVencimento) : null;
                        const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
                        const atrasado = data && data < hoje;
                        return (
                          <div key={r.id} className={`flex items-center justify-between rounded-md px-3 py-2 text-sm border ${atrasado ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800" : "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800"}`}>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium truncate">{r.nomeRazaoSocial}</p>
                              <p className="text-xs text-muted-foreground">
                                {r.numeroControle && <span className="mr-2">{r.numeroControle}</span>}
                                {atrasado ? <span className="text-red-600 font-semibold">ATRASADO — {data?.toLocaleDateString("pt-BR")}</span> : <span>Vence {data?.toLocaleDateString("pt-BR")}</span>}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 ml-3 shrink-0">
                              <span className="font-semibold text-purple-600 dark:text-purple-400">{formatCurrency(r.valorTotal)}</span>
                              <button onClick={() => setLocation("/recebimentos")} className="text-xs font-semibold px-2 py-0.5 rounded border border-purple-300 text-purple-700 hover:bg-purple-100 transition-colors">Cobrar</button>
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

        {/* ===== BLOCO 5: PROJETOS ===== */}
        {isVisible("projetos") && kpiProjetos.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-blue-600" />
                Projetos
                {projetosAtrasados.length > 0 && (
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">
                    {projetosAtrasados.length} com desvio
                  </span>
                )}
              </h2>
              <div className="flex gap-2">
                {can.criar("projetos") && (
                  <Button size="sm" className="text-xs gap-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => setLocation("/projetos?novo=1")}>
                    <Plus className="h-3.5 w-3.5" /> Novo Projeto
                  </Button>
                )}
                <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => setLocation("/projetos")}>
                  Ver todos <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Cards de projetos em execução */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {projetosEmExecucao.slice(0, 6).map(p => (
                <div key={p.id} className={`rounded-lg border p-4 bg-card hover:shadow-md transition-shadow ${p.alertaDesvio ? "border-red-300 dark:border-red-700" : "border-border"}`}>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${STATUS_COLOR[p.statusOperacional] ?? "bg-gray-100 text-gray-600"}`}>
                          {STATUS_LABEL[p.statusOperacional] ?? p.statusOperacional}
                        </span>
                        {p.alertaDesvio && <AlertCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />}
                      </div>
                      <p className="font-semibold text-sm truncate" title={p.nome}>{p.nome}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div>
                      <p className="text-muted-foreground">Receita</p>
                      <p className="font-semibold text-green-600">{formatCurrencyShort(p.receita)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Custo</p>
                      <p className="font-semibold text-red-600">{formatCurrencyShort(p.custo)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Margem</p>
                      <p className={`font-semibold ${p.margem >= 0 ? "text-blue-600" : "text-orange-600"}`}>
                        {formatCurrencyShort(p.margem)}
                        {p.margemPct !== null && <span className="font-normal ml-1">({p.margemPct.toFixed(0)}%)</span>}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">OS</p>
                      <p className="font-semibold">{p.osConcluidasCount}/{p.totalOs} concluídas</p>
                    </div>
                  </div>
                  <Button size="sm" className="w-full text-xs gap-1 bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => setLocation(`/projetos/${p.id}/orcamento`)}>
                    <ExternalLink className="h-3.5 w-3.5" />
                    Abrir Projeto
                  </Button>
                </div>
              ))}
            </div>

            {/* KPIs consolidados */}
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
                    {kpiTotais.margemPct !== null && <span className="text-sm font-normal ml-1">({kpiTotais.margemPct.toFixed(1)}%)</span>}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ===== BLOCO 6: OPERAÇÃO (OS) ===== */}
        {isVisible("operacao") && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Wrench className="h-4 w-4 text-orange-600" />
                Operação — Ordens de Serviço
              </h2>
              <div className="flex gap-2">
                {can.criar("engenharia_os") && (
                  <Button size="sm" className="text-xs gap-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => setLocation("/engenharia?novaOS=1")}>
                    <Plus className="h-3.5 w-3.5" /> Nova OS
                  </Button>
                )}
                <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => setLocation("/engenharia")}>
                  Ver todas <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* OS em execução */}
              <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <HardHat className="h-5 w-5 text-blue-600" />
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide">Em Execução</p>
                </div>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {kpiProjetos.reduce((sum, p) => sum + (p.totalOs - p.osConcluidasCount), 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">OS abertas nos projetos</p>
                <Button size="sm" variant="outline" className="mt-3 w-full border-blue-400 text-blue-700 hover:bg-blue-100 bg-transparent text-xs"
                  onClick={() => setLocation("/engenharia")}>
                  Ver OS
                </Button>
              </div>
              {/* OS concluídas */}
              <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide">Concluídas</p>
                </div>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {kpiProjetos.reduce((sum, p) => sum + p.osConcluidasCount, 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">OS finalizadas nos projetos</p>
                <Button size="sm" variant="outline" className="mt-3 w-full border-green-500 text-green-700 hover:bg-green-100 bg-transparent text-xs"
                  onClick={() => setLocation("/engenharia")}>
                  Ver Histórico
                </Button>
              </div>
              {/* OS paradas (alerta) */}
              <div className={`rounded-lg border p-4 ${osAbertasAcao ? "border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20" : "border-border bg-card"}`}>
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className={`h-5 w-5 ${osAbertasAcao ? "text-orange-600" : "text-muted-foreground"}`} />
                  <p className={`text-xs font-semibold uppercase tracking-wide ${osAbertasAcao ? "text-orange-700 dark:text-orange-400" : "text-muted-foreground"}`}>
                    {osAbertasAcao ? "Atenção Necessária" : "Tudo em Dia"}
                  </p>
                </div>
                {osAbertasAcao ? (
                  <>
                    <p className="text-sm font-semibold text-orange-700 dark:text-orange-300 leading-snug">{osAbertasAcao.descricao}</p>
                    <Button size="sm" variant="outline" className="mt-3 w-full border-orange-400 text-orange-700 hover:bg-orange-100 bg-transparent text-xs font-semibold"
                      onClick={() => setLocation("/engenharia")}>
                      Resolver
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">Nenhuma OS parada há mais de 30 dias.</p>
                    <Button size="sm" className="mt-3 w-full text-xs gap-1 bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => setLocation("/engenharia?novaOS=1")}>
                      <Plus className="h-3.5 w-3.5" /> Nova OS
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===== AÇÕES PRIORITÁRIAS ===== */}
        {isVisible("acoesPrioritarias") && acoesPrioritariasData && acoesPrioritariasData.length > 0 && (
          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <Target className="h-4 w-4" />
                Ações Prioritárias
                <span className="ml-auto text-xs font-normal bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded-full">
                  {acoesPrioritariasData.length} {acoesPrioritariasData.length === 1 ? "item" : "itens"}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {acoesPrioritariasData.map((acao, i) => (
                <div key={i}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:opacity-80 transition-opacity ${
                    acao.urgencia === "alta" ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800" : "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
                  }`}
                  onClick={() => setLocation(acao.link)}
                >
                  <AlertCircle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${acao.urgencia === "alta" ? "text-red-500" : "text-yellow-500"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{acao.descricao}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${acao.urgencia === "alta" ? "bg-red-200 text-red-800" : "bg-yellow-200 text-yellow-800"}`}>
                      {acao.urgencia === "alta" ? "URGENTE" : "ATENÇÃO"}
                    </span>
                    <button className="text-xs text-primary hover:underline flex items-center gap-0.5">
                      Resolver <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* ===== KPI TABELA COMPLETA (colapsável) ===== */}
        {isVisible("kpiProjetos") && kpiProjetos.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  KPIs Detalhados por Projeto
                </span>
                <button onClick={() => setLocation("/projetos")} className="text-xs text-primary hover:underline flex items-center gap-1">
                  Ver todos <ChevronRight className="h-3 w-3" />
                </button>
              </CardTitle>
            </CardHeader>
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
                            <button onClick={() => setLocation(`/projetos/${p.id}/orcamento`)} className="text-left hover:text-primary hover:underline truncate max-w-[180px]">
                              {p.nome}
                            </button>
                            {p.alertaDesvio && <AlertCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-right font-medium">{formatCurrency(p.receita)}</td>
                        <td className="px-4 py-2 text-right text-red-600">{formatCurrency(p.custo)}</td>
                        <td className={`px-4 py-2 text-right font-semibold ${p.margem >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {formatCurrency(p.margem)}
                          {p.margemPct !== null && <span className="text-xs font-normal ml-1">({p.margemPct.toFixed(1)}%)</span>}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {p.desvio !== null ? (
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded ${p.desvio > 10 ? "bg-red-100 text-red-700" : p.desvio > 0 ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>
                              {p.desvio > 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                              {p.desvio > 0 ? "+" : ""}{p.desvio.toFixed(1)}%
                            </span>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-2 text-center text-xs text-muted-foreground">{p.osConcluidasCount}/{p.totalOs}</td>
                        <td className="px-4 py-2 text-center">
                          <button onClick={() => setLocation(`/projetos/${p.id}/orcamento`)}
                            className="text-xs font-semibold px-2.5 py-1 rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors inline-flex items-center gap-1">
                            <ExternalLink className="h-3 w-3" /> Abrir
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

        {/* ===== GRÁFICOS ===== */}
        {isVisible("historico") && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold">Comparativo dos Últimos 6 Meses — {ano}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={historicoData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={v => formatCurrencyShort(v)} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: any) => formatCurrency(v)} />
                  <Legend />
                  <Bar dataKey="Recebimentos" fill="#22c55e" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Pagamentos" fill="#ef4444" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {isVisible("fluxo") && historicoData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold">Evolução do Fluxo Líquido — {ano}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={historicoData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={v => formatCurrencyShort(v)} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: any) => formatCurrency(v)} />
                  <Line type="monotone" dataKey="Fluxo Líquido" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {(isVisible("centrocusto") || isVisible("composicao")) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isVisible("centrocusto") && centroCustoData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-bold">Por Centro de Custo</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={centroCustoData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={v => formatCurrencyShort(v)} tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                      <Tooltip formatter={(v: any) => formatCurrency(v)} />
                      <Legend />
                      <Bar dataKey="Recebimentos" fill="#22c55e" />
                      <Bar dataKey="Pagamentos" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
            {isVisible("composicao") && composicaoData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-bold">Composição de Faturamento</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={composicaoData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {composicaoData.map((_, index) => <Cell key={index} fill={COLORS_PIE[index % COLORS_PIE.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => formatCurrency(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Status detalhado */}
        {isVisible("status") && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {podePagamentos && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center justify-between">
                    <span className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-red-500" /> Pagamentos</span>
                    <Button size="sm" variant="outline" className="text-xs gap-1 h-7" onClick={() => setLocation("/pagamentos")}>
                      Ver todos <ChevronRight className="h-3 w-3" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1.5 text-sm">
                    {[
                      { label: "Pendentes", value: stats?.pagamentos?.totalPendente, color: "text-yellow-600" },
                      { label: "Pagos", value: stats?.pagamentos?.totalPago, color: "text-green-600" },
                      { label: "Atrasados", value: (stats?.pagamentos as any)?.totalAtrasado ?? 0, color: "text-red-600" },
                    ].map(row => (
                      <div key={row.label} className="flex justify-between items-center py-1 border-b last:border-0">
                        <span className="text-muted-foreground">{row.label}</span>
                        <span className={`font-semibold ${row.color}`}>{formatCurrency(row.value)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            {podeRecebimentos && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center justify-between">
                    <span className="flex items-center gap-2"><Wallet className="h-4 w-4 text-green-500" /> Recebimentos</span>
                    <Button size="sm" variant="outline" className="text-xs gap-1 h-7" onClick={() => setLocation("/recebimentos")}>
                      Ver todos <ChevronRight className="h-3 w-3" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1.5 text-sm">
                    {[
                      { label: "Pendentes", value: stats?.recebimentos?.totalPendente, color: "text-yellow-600" },
                      { label: "Recebidos", value: stats?.recebimentos?.totalRecebido, color: "text-green-600" },
                      { label: "Atrasados", value: stats?.recebimentos?.totalAtrasado, color: "text-red-600" },
                    ].map(row => (
                      <div key={row.label} className="flex justify-between items-center py-1 border-b last:border-0">
                        <span className="text-muted-foreground">{row.label}</span>
                        <span className={`font-semibold ${row.color}`}>{formatCurrency(row.value)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}

// ===== Componentes auxiliares =====
function KpiCard({ icon, label, sublabel, value, total, accent, valueColor, loading, onClick }: {
  icon: React.ReactNode; label: string; sublabel: string;
  value: string; total: string; accent: string; valueColor: string;
  loading: boolean; onClick?: () => void;
}) {
  return (
    <Card className={`border-l-4 ${accent} ${onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`} onClick={onClick}>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium">{label}</p>
            <p className="text-xs text-muted-foreground/70">{sublabel}</p>
            {loading ? (
              <div className="h-7 w-24 bg-muted animate-pulse rounded mt-1" />
            ) : (
              <p className={`text-xl font-bold mt-1 ${valueColor}`}>{value}</p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">{total}</p>
          </div>
          <div className="shrink-0 mt-0.5">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}
