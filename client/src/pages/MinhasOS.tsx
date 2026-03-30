import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import {
  MapPin, Play, CheckCircle2, Clock, AlertTriangle,
  ChevronLeft, ChevronRight, Loader2, ClipboardList,
  Navigation, Phone, MessageSquare, Camera, FileText
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Status helpers ──────────────────────────────────────────────────────────
const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  planejada:            { label: "Planejada",       color: "text-gray-600",  bg: "bg-gray-100",   icon: <Clock size={14} /> },
  agendada:             { label: "Agendada",         color: "text-blue-600",  bg: "bg-blue-100",   icon: <Clock size={14} /> },
  em_deslocamento:      { label: "Em Deslocamento",  color: "text-purple-600",bg: "bg-purple-100", icon: <Navigation size={14} /> },
  autorizada:           { label: "Autorizada",       color: "text-blue-600",  bg: "bg-blue-100",   icon: <CheckCircle2 size={14} /> },
  em_execucao:          { label: "Em Execução",      color: "text-orange-600",bg: "bg-orange-100", icon: <Play size={14} /> },
  pausada:              { label: "Pausada",           color: "text-yellow-600",bg: "bg-yellow-100", icon: <AlertTriangle size={14} /> },
  aguardando_validacao: { label: "Aguard. Validação",color: "text-indigo-600",bg: "bg-indigo-100", icon: <Clock size={14} /> },
  concluida:            { label: "Concluída",         color: "text-green-600", bg: "bg-green-100",  icon: <CheckCircle2 size={14} /> },
  cancelada:            { label: "Cancelada",         color: "text-red-600",   bg: "bg-red-100",    icon: <AlertTriangle size={14} /> },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] ?? statusConfig.planejada;
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold", cfg.bg, cfg.color)}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ─── Card de OS ──────────────────────────────────────────────────────────────
interface OSCardProps {
  os: {
    id: number;
    numero: string;
    titulo: string;
    status: string;
    prioridade: string;
    localExecucao?: string | null;
    responsavel?: string | null;
    dataPrevisao?: string | null;
    descricao?: string | null;
    projetoNome?: string | null;
    clienteNome?: string | null;
  };
  onIniciar: (id: number) => void;
  onFinalizar: (id: number) => void;
  onAbrir: (id: number) => void;
  isLoading: boolean;
}

function OSCard({ os, onIniciar, onFinalizar, onAbrir, isLoading }: OSCardProps) {
  const [expanded, setExpanded] = useState(false);
  const prioridadeColor = {
    baixa: "border-l-gray-300",
    normal: "border-l-blue-400",
    alta: "border-l-orange-400",
    critica: "border-l-red-500",
  }[os.prioridade] ?? "border-l-blue-400";

  const canIniciar = ["planejada", "agendada", "autorizada"].includes(os.status);
  const canFinalizar = ["em_execucao", "em_deslocamento"].includes(os.status);
  const isConcluida = os.status === "concluida" || os.status === "cancelada";

  return (
    <div className={cn("bg-white rounded-xl border-l-4 shadow-sm overflow-hidden", prioridadeColor)}>
      {/* Header */}
      <button
        className="w-full px-4 py-3.5 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-gray-400">{os.numero}</span>
              <StatusBadge status={os.status} />
            </div>
            <p className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">{os.titulo}</p>
            {os.projetoNome && (
              <p className="text-xs text-gray-500 mt-0.5 truncate">{os.projetoNome}</p>
            )}
          </div>
          <ChevronRight size={16} className={cn("text-gray-400 shrink-0 mt-1 transition-transform", expanded && "rotate-90")} />
        </div>

        {os.localExecucao && (
          <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500">
            <MapPin size={12} className="shrink-0" />
            <span className="truncate">{os.localExecucao}</span>
          </div>
        )}
      </button>

      {/* Expandido */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-50">
          {os.descricao && (
            <p className="text-xs text-gray-600 pt-3 leading-relaxed">{os.descricao}</p>
          )}

          {os.clienteNome && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Phone size={12} />
              <span>Cliente: <strong>{os.clienteNome}</strong></span>
            </div>
          )}

          {os.dataPrevisao && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Clock size={12} />
              <span>Previsão: <strong>{new Date(os.dataPrevisao).toLocaleDateString("pt-BR")}</strong></span>
            </div>
          )}

          {/* Ações */}
          {!isConcluida && (
            <div className="flex gap-2 pt-1">
              {canIniciar && (
                <button
                  onClick={() => onIniciar(os.id)}
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white rounded-xl font-semibold text-sm min-h-[48px] transition-colors disabled:opacity-50"
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                  INICIAR
                </button>
              )}
              {canFinalizar && (
                <button
                  onClick={() => onFinalizar(os.id)}
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-semibold text-sm min-h-[48px] transition-colors disabled:opacity-50"
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  FINALIZAR
                </button>
              )}
              <button
                onClick={() => onAbrir(os.id)}
                className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold text-sm min-h-[48px] transition-colors"
              >
                <FileText size={16} />
              </button>
            </div>
          )}

          {isConcluida && (
            <div className="flex items-center gap-2 py-2 text-green-600 text-sm font-medium">
              <CheckCircle2 size={16} />
              OS {os.status === "concluida" ? "concluída" : "cancelada"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Página Principal ────────────────────────────────────────────────────────
export default function MinhasOS() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const { data: osData, isLoading } = trpc.ordensServico.list.useQuery({});

  const mudarStatus = trpc.ordensServico.mudarStatus.useMutation({
    onSuccess: () => {
      utils.ordensServico.list.invalidate();
      toast.success("Status da OS atualizado!");
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const hoje = new Date().toISOString().split("T")[0];

  // Filtrar OS do usuário logado (responsável ou equipe)
  type OsItem = NonNullable<typeof osData>[number];
  const minhasOS = (osData ?? []).filter((os: OsItem) => {
    const isResponsavel = os.responsavelUsuarioId === user?.id;
    const equipe = (() => {
      try { return JSON.parse(os.equipeIds ?? "[]") as number[]; }
      catch { return []; }
    })();
    const isEquipe = equipe.includes(user?.id ?? 0);
    const ativa = !["concluida", "cancelada"].includes(os.status);
    return (isResponsavel || isEquipe) && ativa;
  });

  // OS de hoje (agendadas para hoje ou em execução)
  const osHoje = minhasOS.filter((os: OsItem) => {
    const toStr = (d: Date | string | null | undefined) => d ? new Date(d).toISOString().split("T")[0] : null;
    const agendada = toStr(os.dataAgendamento) === hoje || toStr(os.dataInicioPrevista) === hoje;
    const emExecucao = os.status === "em_execucao" || os.status === "em_deslocamento";
    return agendada || emExecucao;
  });

  // Demais OS ativas
  const outrasOS = minhasOS.filter((os: OsItem) => !osHoje.find((o: OsItem) => o.id === os.id));

  const handleIniciar = (id: number) => {
    mudarStatus.mutate({ id, status: "em_andamento" });
  };

  const handleFinalizar = (id: number) => {
    mudarStatus.mutate({ id, status: "concluida" });
  };

  const handleAbrir = (id: number) => {
    navigate(`/engenharia?osId=${id}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-green-600 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Carregando suas OS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-800 to-green-600 px-4 pt-10 pb-5 text-white">
        <button onClick={() => navigate("/")} className="flex items-center gap-1 text-green-200 text-sm mb-3">
          <ChevronLeft size={16} /> Dashboard
        </button>
        <div className="flex items-center gap-3">
          <ClipboardList size={24} />
          <div>
            <h1 className="text-xl font-bold">Minhas OS</h1>
            <p className="text-green-200 text-xs">
              {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
        </div>
        <div className="flex gap-3 mt-3">
          <div className="bg-white/20 rounded-lg px-3 py-1.5 text-center">
            <p className="text-lg font-bold">{osHoje.length}</p>
            <p className="text-[10px] text-green-200">Hoje</p>
          </div>
          <div className="bg-white/20 rounded-lg px-3 py-1.5 text-center">
            <p className="text-lg font-bold">{outrasOS.length}</p>
            <p className="text-[10px] text-green-200">Pendentes</p>
          </div>
          <div className="bg-white/20 rounded-lg px-3 py-1.5 text-center">
            <p className="text-lg font-bold">{minhasOS.length}</p>
            <p className="text-[10px] text-green-200">Total</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-5">

        {/* OS de Hoje */}
        {osHoje.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">OS do Dia</h2>
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold">
                {osHoje.length}
              </span>
            </div>
            <div className="space-y-2.5">
              {osHoje.map((os: OsItem) => (
                <OSCard
                  key={os.id}
                  os={os as any}
                  onIniciar={handleIniciar}
                  onFinalizar={handleFinalizar}
                  onAbrir={handleAbrir}
                  isLoading={mudarStatus.isPending}
                />
              ))}
            </div>
          </div>
        )}

        {/* Outras OS */}
        {outrasOS.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Outras OS Ativas</h2>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-semibold">
                {outrasOS.length}
              </span>
            </div>
            <div className="space-y-2.5">
              {outrasOS.map((os: OsItem) => (
                <OSCard
                  key={os.id}
                  os={os as any}
                  onIniciar={handleIniciar}
                  onFinalizar={handleFinalizar}
                  onAbrir={handleAbrir}
                  isLoading={mudarStatus.isPending}
                />
              ))}
            </div>
          </div>
        )}

        {/* Estado vazio */}
        {minhasOS.length === 0 && (
          <div className="text-center py-12">
            <CheckCircle2 size={48} className="text-green-400 mx-auto mb-3" />
            <p className="text-gray-700 font-semibold">Nenhuma OS pendente!</p>
            <p className="text-gray-400 text-sm mt-1">Todas as suas ordens de serviço estão em dia.</p>
            <button
              onClick={() => navigate("/engenharia?novaOS=1")}
              className="mt-4 px-6 py-3 bg-green-600 text-white rounded-xl font-semibold text-sm min-h-[48px]"
            >
              + Nova OS
            </button>
          </div>
        )}

        {/* Botão Nova OS */}
        {minhasOS.length > 0 && (
          <button
            onClick={() => navigate("/engenharia?novaOS=1")}
            className="w-full py-3.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold text-sm min-h-[52px] flex items-center justify-center gap-2 transition-colors"
          >
            <ClipboardList size={18} />
            + Nova OS
          </button>
        )}
      </div>
    </div>
  );
}
