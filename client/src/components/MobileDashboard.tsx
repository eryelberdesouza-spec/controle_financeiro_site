import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  FileText, FolderPlus, ClipboardList, TrendingUp, TrendingDown,
  AlertTriangle, Clock, CheckCircle2, DollarSign, ArrowRight,
  Zap, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const fmt = (v: number | string | null | undefined) => {
  const n = Number(v ?? 0);
  if (isNaN(n)) return "R$ 0,00";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

// ─── Botão de ação rápida ────────────────────────────────────────────────────
interface QuickActionProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  color: "green" | "blue" | "orange" | "purple" | "red";
}

const colorMap = {
  green:  "bg-green-600 hover:bg-green-700 active:bg-green-800",
  blue:   "bg-blue-600 hover:bg-blue-700 active:bg-blue-800",
  orange: "bg-orange-500 hover:bg-orange-600 active:bg-orange-700",
  purple: "bg-purple-600 hover:bg-purple-700 active:bg-purple-800",
  red:    "bg-red-600 hover:bg-red-700 active:bg-red-800",
};

function QuickAction({ icon, label, href, color }: QuickActionProps) {
  const [, navigate] = useLocation();
  return (
    <button
      onClick={() => navigate(href)}
      className={cn(
        "flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-white font-semibold text-sm",
        "transition-all active:scale-[0.97] shadow-sm min-h-[52px]",
        colorMap[color]
      )}
    >
      <span className="shrink-0">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      <ChevronRight size={16} className="opacity-70 shrink-0" />
    </button>
  );
}

// ─── Card de alerta ──────────────────────────────────────────────────────────
interface AlertCardProps {
  label: string;
  value: string;
  sub?: string;
  variant: "danger" | "warning" | "success";
  actionLabel: string;
  onAction: () => void;
}

const alertVariants = {
  danger:  { bg: "bg-red-50 border-red-200",   text: "text-red-700",   btn: "bg-red-600 hover:bg-red-700",   icon: <AlertTriangle size={18} className="text-red-500" /> },
  warning: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", btn: "bg-amber-500 hover:bg-amber-600", icon: <Clock size={18} className="text-amber-500" /> },
  success: { bg: "bg-green-50 border-green-200", text: "text-green-700", btn: "bg-green-600 hover:bg-green-700", icon: <CheckCircle2 size={18} className="text-green-500" /> },
};

function AlertCard({ label, value, sub, variant, actionLabel, onAction }: AlertCardProps) {
  const v = alertVariants[variant];
  return (
    <div className={cn("rounded-xl border p-4 flex items-center gap-3", v.bg)}>
      <div className="shrink-0">{v.icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
        <p className={cn("text-lg font-bold leading-tight", v.text)}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      <button
        onClick={onAction}
        className={cn("shrink-0 px-3 py-1.5 rounded-lg text-white text-xs font-semibold min-h-[36px] transition-colors", v.btn)}
      >
        {actionLabel}
      </button>
    </div>
  );
}

// ─── Card de KPI ─────────────────────────────────────────────────────────────
interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  color: string;
}

function KpiCard({ label, value, sub, icon, color }: KpiCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs text-gray-500 font-medium">{label}</span>
        <span className={cn("p-1.5 rounded-lg", color)}>{icon}</span>
      </div>
      <p className="text-xl font-bold text-gray-900 leading-tight">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Dashboard Mobile Principal ──────────────────────────────────────────────
export function MobileDashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const now = new Date();
  const [dateRange] = useState(() => ({
    dataInicio: new Date(now.getFullYear(), now.getMonth(), 1),
    dataFim: new Date(now.getFullYear(), now.getMonth() + 1, 0),
  }));

  const { data: stats } = trpc.dashboard.stats.useQuery(dateRange);
  const { data: acoes } = trpc.dashboard.acoesPrioritarias.useQuery();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { data: _vencimentos } = trpc.dashboard.vencimentosProximos.useQuery({ dias: 7 });

  // acoesPrioritarias retorna array de { tipo, descricao, link, urgencia }
  const recAtrasadoCount = acoes?.filter(a => a.tipo === 'recebimento_atrasado').length ?? 0;
  const pagPendenteCount = acoes?.filter(a => a.tipo === 'pagamento_pendente').length ?? 0;
  const osAbertasCount = acoes?.filter(a => a.tipo === 'os_aberta' || a.tipo === 'os_parada').length ?? 0;

  const totalReceber = Number(stats?.recebimentos?.totalPendente ?? 0);
  const totalRecebido = Number(stats?.recebimentos?.totalRecebido ?? 0);
  const totalPagar = Number(stats?.pagamentos?.totalPendente ?? 0);

  const firstName = user?.name?.split(" ")[0] ?? "Usuário";
  const hora = now.getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-800 to-green-600 px-4 pt-10 pb-6 text-white">
        <p className="text-green-200 text-sm">{saudacao},</p>
        <h1 className="text-2xl font-bold">{firstName}</h1>
        <p className="text-green-100 text-xs mt-1 opacity-80">
          {now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      <div className="px-4 -mt-3 space-y-5">

        {/* ── BLOCO 1: Ações Rápidas ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={16} className="text-green-600" />
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Ações Rápidas</h2>
          </div>
          <div className="space-y-2.5">
            <QuickAction icon={<FileText size={18} />} label="Nova Proposta" href="/propostas?novo=1" color="green" />
            <QuickAction icon={<FolderPlus size={18} />} label="Novo Projeto" href="/projetos?novo=1" color="blue" />
            <QuickAction icon={<ClipboardList size={18} />} label="Nova OS" href="/engenharia?novaOS=1" color="orange" />
            <QuickAction icon={<TrendingUp size={18} />} label="Lançar Receita" href="/recebimentos?novo=1" color="green" />
            <QuickAction icon={<TrendingDown size={18} />} label="Lançar Custo" href="/pagamentos?novo=1" color="red" />
          </div>
        </div>

        {/* ── BLOCO 2: Alertas Operacionais ── */}
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <AlertTriangle size={15} className="text-amber-500" />
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Alertas</h2>
          </div>
          <div className="space-y-2.5">
            <AlertCard
              label="Recebimentos Atrasados"
              value={`${recAtrasadoCount} cobranças`}
              sub="Valores em atraso"
              variant={recAtrasadoCount > 0 ? "danger" : "success"}
              actionLabel="Cobrar"
              onAction={() => navigate("/recebimentos")}
            />
            <AlertCard
              label="Pagamentos Pendentes"
              value={`${pagPendenteCount} pagamentos`}
              sub="Aguardando pagamento"
              variant={pagPendenteCount > 0 ? "warning" : "success"}
              actionLabel="Ver"
              onAction={() => navigate("/pagamentos")}
            />
            <AlertCard
              label="OS Abertas"
              value={`${osAbertasCount} OS`}
              sub="Ordens de serviço em andamento"
              variant={osAbertasCount > 0 ? "warning" : "success"}
              actionLabel="Abrir"
              onAction={() => navigate("/engenharia")}
            />
          </div>
        </div>

        {/* ── BLOCO 3: Resumo Financeiro ── */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <DollarSign size={15} className="text-blue-500" />
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Financeiro — Mês Atual</h2>
            </div>
            <button
              onClick={() => navigate("/relatorios")}
              className="text-xs text-blue-600 font-medium flex items-center gap-1"
            >
              Ver mais <ArrowRight size={12} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <KpiCard
              label="A Receber"
              value={fmt(totalReceber)}
              sub="Pendente"
              icon={<TrendingUp size={14} className="text-green-600" />}
              color="bg-green-50"
            />
            <KpiCard
              label="Recebido"
              value={fmt(totalRecebido)}
              sub="Confirmado"
              icon={<CheckCircle2 size={14} className="text-blue-600" />}
              color="bg-blue-50"
            />
            <KpiCard
              label="A Pagar"
              value={fmt(totalPagar)}
              sub="Compras e custos"
              icon={<TrendingDown size={14} className="text-red-600" />}
              color="bg-red-50"
            />
            <KpiCard
              label="Fluxo Líquido"
              value={fmt(totalRecebido - Number(stats?.pagamentos?.totalPago ?? 0))}
              sub="Receita − Custo"
              icon={<DollarSign size={14} className="text-purple-600" />}
              color="bg-purple-50"
            />
          </div>
        </div>

      </div>
    </div>
  );
}
