import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Plus, Search, Edit2, Trash2, Eye, FolderOpen, TrendingUp,
  Calendar, MapPin, User, DollarSign, ClipboardList, Building2,
  CheckCircle, Clock, AlertTriangle, XCircle, Loader2, ChevronDown, BarChart3,
  ArrowRight, GitBranch, Lock, CheckCircle2, ChevronRight
} from "lucide-react";
import { useLocation } from "wouter";

// ─── Constantes ───────────────────────────────────────────────────────────────

const TIPOS_PROJETO = [
  { value: "INSTALACAO", label: "Instalação" },
  { value: "MANUTENCAO", label: "Manutenção" },
  { value: "SERVICO_PONTUAL", label: "Serviço Pontual" },
  { value: "OBRA", label: "Obra" },
  { value: "RECORRENTE", label: "Recorrente" },
  { value: "CONSULTORIA", label: "Consultoria" },
  { value: "PARCERIA", label: "Parceria" },
  { value: "OUTROS", label: "Outros" },
];

const STATUS_PROJETO = [
  { value: "PLANEJAMENTO", label: "Planejamento", color: "bg-slate-100 text-slate-700" },
  { value: "AGUARDANDO_CONTRATO", label: "Aguardando Contrato", color: "bg-yellow-100 text-yellow-700" },
  { value: "AGUARDANDO_MOBILIZACAO", label: "Aguardando Mobilização", color: "bg-orange-100 text-orange-700" },
  { value: "EM_EXECUCAO", label: "Em Execução", color: "bg-blue-100 text-blue-700" },
  { value: "PAUSADO", label: "Pausado", color: "bg-gray-100 text-gray-600" },
  { value: "CONCLUIDO_TECNICAMENTE", label: "Concluído Tecnicamente", color: "bg-teal-100 text-teal-700" },
  { value: "ENCERRADO_FINANCEIRAMENTE", label: "Encerrado Financeiramente", color: "bg-green-100 text-green-700" },
  { value: "CANCELADO", label: "Cancelado", color: "bg-red-100 text-red-700" },
];

function getStatusConfig(status: string) {
  return STATUS_PROJETO.find((s) => s.value === status) ?? { label: status, color: "bg-gray-100 text-gray-600" };
}

function fmtMoeda(v: number | string | null | undefined) {
  const n = parseFloat(String(v ?? 0));
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtData(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

// ─── Formulário de Projeto ────────────────────────────────────────────────────

interface FormData {
  numero: string;
  nome: string;
  clienteId: string;
  tipoProjeto: string;
  statusOperacional: string;
  responsavelUserId: string;
  dataInicioPrevista: string;
  dataFimPrevista: string;
  dataInicioReal: string;
  dataFimReal: string;
  centroCustoId: string;
  valorContratado: string;
  localExecucao: string;
  descricao: string;
  observacoes: string;
  criarCentroCusto: boolean;
}

const FORM_VAZIO: FormData = {
  numero: "", nome: "", clienteId: "", tipoProjeto: "SERVICO_PONTUAL",
  statusOperacional: "PLANEJAMENTO", responsavelUserId: "", dataInicioPrevista: "",
  dataFimPrevista: "", dataInicioReal: "", dataFimReal: "", centroCustoId: "",
  valorContratado: "", localExecucao: "", descricao: "", observacoes: "",
  criarCentroCusto: false,
};

// ─── Workflow do Projeto ─────────────────────────────────────────────────────

const WORKFLOW_LABELS: Record<string, { label: string; icon: React.ReactNode; desc: string }> = {
  lead: { label: "Lead", icon: <User className="w-4 h-4" />, desc: "Oportunidade identificada" },
  proposta: { label: "Proposta", icon: <ClipboardList className="w-4 h-4" />, desc: "Proposta em elaboração" },
  contrato: { label: "Contrato", icon: <Building2 className="w-4 h-4" />, desc: "Contrato assinado" },
  engenharia: { label: "Engenharia", icon: <GitBranch className="w-4 h-4" />, desc: "Projeto técnico" },
  execucao: { label: "Execução", icon: <TrendingUp className="w-4 h-4" />, desc: "Em campo" },
  operacao: { label: "Operação", icon: <CheckCircle2 className="w-4 h-4" />, desc: "Entregue ao cliente" },
  encerrado: { label: "Encerrado", icon: <CheckCircle className="w-4 h-4" />, desc: "Financeiramente encerrado" },
};

function WorkflowProjeto({ projetoId }: { projetoId: number }) {
  const utils = trpc.useUtils();
  const { data: wf, isLoading } = trpc.workflow.getWorkflow.useQuery({ projetoId });

  const avancarMutation = trpc.workflow.avancarStatus.useMutation({
    onSuccess: (res) => {
      toast.success(`Status avançado para ${WORKFLOW_LABELS[res.statusNovo?.toLowerCase?.() ?? ""]?.label ?? res.statusNovo}`);
      utils.workflow.getWorkflow.invalidate({ projetoId });
      utils.projetos.list.invalidate();
      utils.projetos.painel.invalidate({ id: projetoId });
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="animate-spin w-4 h-4" /> Carregando workflow...</div>;
  if (!wf) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <GitBranch className="w-4 h-4" /> Workflow do Projeto
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Linha do tempo */}
        <div className="flex items-center gap-0 overflow-x-auto pb-2">
          {wf.workflow.map((etapa, idx) => (
            <div key={etapa.status} className="flex items-center">
              <div className={`flex flex-col items-center min-w-[80px] ${
                etapa.atual ? 'opacity-100' : etapa.concluido ? 'opacity-90' : 'opacity-40'
              }`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                  etapa.atual
                    ? 'bg-primary border-primary text-primary-foreground shadow-md scale-110'
                    : etapa.concluido
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'bg-muted border-muted-foreground/30 text-muted-foreground'
                }`}>
                  {etapa.concluido ? <CheckCircle className="w-4 h-4" /> : WORKFLOW_LABELS[etapa.status]?.icon}
                </div>
                <span className={`text-xs mt-1 text-center font-medium ${
                  etapa.atual ? 'text-primary' : etapa.concluido ? 'text-green-600' : 'text-muted-foreground'
                }`}>{etapa.label}</span>
                {etapa.atual && (
                  <span className="text-[10px] text-primary/70 text-center leading-tight">{WORKFLOW_LABELS[etapa.status]?.desc}</span>
                )}
              </div>
              {idx < wf.workflow.length - 1 && (
                <ChevronRight className={`w-4 h-4 shrink-0 mx-1 ${
                  wf.workflow[idx + 1].concluido || wf.workflow[idx + 1].atual ? 'text-green-500' : 'text-muted-foreground/30'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Botão de avançar */}
        {wf.proximoStatus && (
          <div className="mt-4 flex items-center gap-3">
            {wf.requisitosProximo && !wf.requisitosProximo.ok ? (
              <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex-1">
                <Lock className="w-4 h-4 shrink-0" />
                <span>{wf.requisitosProximo.mensagem}</span>
              </div>
            ) : (
              <Button
                size="sm"
                className="gap-2"
                disabled={avancarMutation.isPending}
                onClick={() => avancarMutation.mutate({ projetoId, novoStatus: wf.proximoStatus as any })}
              >
                {avancarMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Avançar para {WORKFLOW_LABELS[wf.proximoStatus]?.label}
              </Button>
            )}
          </div>
        )}
        {!wf.proximoStatus && (
          <div className="mt-3 flex items-center gap-2 text-sm text-emerald-600">
            <CheckCircle className="w-4 h-4" />
            <span className="font-medium">Projeto encerrado — todas as etapas concluídas</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import React from "react";

// ─── Painel do Projeto ────────────────────────────────────────────────────────

function PainelProjeto({ projetoId, onClose }: { projetoId: number; onClose: () => void }) {
  const { data: painel, isLoading } = trpc.projetos.painel.useQuery({ id: projetoId });

  if (isLoading) return (
    <div className="flex items-center justify-center p-12">
      <Loader2 className="animate-spin w-8 h-8 text-primary" />
    </div>
  );
  if (!painel) return <div className="p-8 text-center text-muted-foreground">Projeto não encontrado.</div>;

  const { projeto, financeiro, execucao, relacionamentos } = painel;
  const statusCfg = getStatusConfig(projeto.statusOperacional ?? "PLANEJAMENTO");

  return (
    <div className="space-y-6">
      {/* Identificação */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FolderOpen className="w-4 h-4" /> Identificação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Número</span>
              <span className="font-mono font-semibold text-primary">{projeto.numero}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cliente</span>
              <span>{projeto.clienteNome ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Responsável</span>
              <span>{projeto.responsavelNome ?? "—"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Status</span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusCfg.color}`}>{statusCfg.label}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tipo</span>
              <span>{TIPOS_PROJETO.find(t => t.value === projeto.tipoProjeto)?.label ?? projeto.tipoProjeto}</span>
            </div>
            {projeto.localExecucao && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Local</span>
                <span className="text-right max-w-[180px]">{projeto.localExecucao}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Datas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Início Previsto</span>
              <span>{fmtData(projeto.dataInicioPrevista)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fim Previsto</span>
              <span>{fmtData(projeto.dataFimPrevista)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Início Real</span>
              <span>{fmtData(projeto.dataInicioReal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fim Real</span>
              <span>{fmtData(projeto.dataFimReal)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financeiro */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <DollarSign className="w-4 h-4" /> Financeiro
            {/* Status financeiro badge */}
            {(() => {
              const sf = (financeiro as any).statusFinanceiro as string | undefined;
              const sfCfg: Record<string, { label: string; color: string }> = {
                SEM_RECEITA: { label: "Sem Receita", color: "bg-gray-100 text-gray-600" },
                EM_RECEBIMENTO: { label: "Em Recebimento", color: "bg-blue-100 text-blue-700" },
                RECEITA_PARCIAL: { label: "Receita Parcial", color: "bg-yellow-100 text-yellow-700" },
                RECEITA_COMPLETA: { label: "Receita Completa", color: "bg-green-100 text-green-700" },
                INADIMPLENTE: { label: "Inadimplente", color: "bg-red-100 text-red-700" },
              };
              const cfg = sf ? sfCfg[sf] : null;
              return cfg ? (
                <span className={`ml-auto px-2 py-0.5 rounded text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
              ) : null;
            })()}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: "Valor Contratado", value: financeiro.valorContratado, color: "text-blue-600" },
              { label: "Receita Prevista", value: financeiro.receitaPrevista, color: "text-green-600" },
              { label: "Receita Realizada", value: financeiro.receitaRealizada, color: "text-emerald-600" },
              { label: "Custos Registrados", value: financeiro.custosRegistrados, color: "text-red-600" },
              { label: "Saldo a Receber", value: financeiro.saldoAReceber, color: financeiro.saldoAReceber >= 0 ? "text-green-600" : "text-red-600" },
              { label: "Resultado Estimado", value: (financeiro as any).resultadoEstimado ?? (financeiro.receitaRealizada - financeiro.custosRegistrados), color: ((financeiro as any).resultadoEstimado ?? (financeiro.receitaRealizada - financeiro.custosRegistrados)) >= 0 ? "text-emerald-600" : "text-red-600" },
            ].map((item) => (
              <div key={item.label} className="text-center p-3 bg-muted/40 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                <p className={`text-sm font-bold ${item.color}`}>{fmtMoeda(item.value)}</p>
              </div>
            ))}
          </div>
          {/* Barra de progresso financeiro */}
          {(() => {
            const pct = (financeiro as any).percentualRecebido as number | undefined;
            const pctVal = pct ?? (financeiro.receitaPrevista > 0 ? Math.min(100, Math.round((financeiro.receitaRealizada / financeiro.receitaPrevista) * 100)) : 0);
            return (
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Progresso de Recebimento</span>
                  <span className="font-semibold">{pctVal}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${pctVal >= 100 ? 'bg-emerald-500' : pctVal >= 50 ? 'bg-blue-500' : 'bg-yellow-500'}`}
                    style={{ width: `${Math.min(100, pctVal)}%` }}
                  />
                </div>
              </div>
            );
          })()}
          {/* Indicador de encerramento */}
          {(financeiro as any).prontoParaEncerramento && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-sm text-emerald-700 font-medium">Pronto para Encerramento — todas as OS concluídas</span>
            </div>
          )}
          {/* Alerta de inadimplência */}
          {(financeiro as any).statusFinanceiro === "INADIMPLENTE" && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span className="text-sm text-red-700 font-medium">Atenção: há recebimentos vencidos vinculados a este projeto</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Execução */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="text-center p-4">
          <p className="text-2xl font-bold text-blue-600">{execucao.totalOS}</p>
          <p className="text-xs text-muted-foreground mt-1">Total de OS</p>
        </Card>
        <Card className="text-center p-4">
          <p className="text-2xl font-bold text-orange-500">{execucao.osAbertas}</p>
          <p className="text-xs text-muted-foreground mt-1">OS Abertas</p>
        </Card>
        <Card className="text-center p-4">
          <p className="text-2xl font-bold text-green-600">{execucao.osConcluidas}</p>
          <p className="text-xs text-muted-foreground mt-1">OS Concluídas</p>
        </Card>
      </div>

      {/* Relacionamentos */}
      <Tabs defaultValue="os">
        <TabsList>
          <TabsTrigger value="os">OS ({relacionamentos.ordensServico.length})</TabsTrigger>
          <TabsTrigger value="contratos">Contratos ({relacionamentos.contratos.length})</TabsTrigger>
          <TabsTrigger value="recebimentos">Recebimentos ({relacionamentos.recebimentos.length})</TabsTrigger>
          <TabsTrigger value="pagamentos">Pagamentos ({relacionamentos.pagamentos.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="os">
          {relacionamentos.ordensServico.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma OS vinculada.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Responsável</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {relacionamentos.ordensServico.map((os) => (
                  <TableRow key={os.id}>
                    <TableCell className="font-mono text-xs">{os.numero}</TableCell>
                    <TableCell>{os.titulo}</TableCell>
                    <TableCell><Badge variant="outline">{os.status}</Badge></TableCell>
                    <TableCell>{os.responsavel ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="contratos">
          {relacionamentos.contratos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum contrato vinculado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Objeto</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {relacionamentos.contratos.map((ct) => (
                  <TableRow key={ct.id}>
                    <TableCell className="font-mono text-xs">{ct.numero}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{ct.objeto}</TableCell>
                    <TableCell><Badge variant="outline">{ct.status}</Badge></TableCell>
                    <TableCell>{fmtMoeda(ct.valorTotal)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="recebimentos">
          {relacionamentos.recebimentos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum recebimento vinculado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº Controle</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {relacionamentos.recebimentos.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.numeroControle ?? "—"}</TableCell>
                    <TableCell>{r.nomeRazaoSocial}</TableCell>
                    <TableCell>{fmtMoeda(r.valorTotal)}</TableCell>
                    <TableCell><Badge variant="outline">{r.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="pagamentos">
          {relacionamentos.pagamentos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum pagamento vinculado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº Controle</TableHead>
                  <TableHead>Beneficiário</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {relacionamentos.pagamentos.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.numeroControle ?? "—"}</TableCell>
                    <TableCell>{p.nomeCompleto}</TableCell>
                    <TableCell>{fmtMoeda(p.valor)}</TableCell>
                    <TableCell><Badge variant="outline">{p.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>

      {projeto.descricao && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">Descrição</p>
          <p className="text-sm">{projeto.descricao}</p>
        </div>
      )}
      {projeto.observacoes && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">Observações</p>
          <p className="text-sm">{projeto.observacoes}</p>
        </div>
      )}

      {/* Workflow de Projeto */}
      <WorkflowProjeto projetoId={projetoId} />

      <div className="flex justify-end">
        <Button variant="outline" onClick={onClose}>Fechar</Button>
      </div>
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function Projetos() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [, navigate] = useLocation();

  const { data: projetos = [], isLoading } = trpc.projetos.list.useQuery();
  const { data: nextNumeroData } = trpc.projetos.nextNumero.useQuery();
  const { data: clientes = [] } = trpc.clientes.list.useQuery();
  const { data: centrosCusto = [] } = trpc.centrosCusto.list.useQuery();
  const { data: usuarios = [] } = trpc.usuarios.list.useQuery();

  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroTipo, setFiltroTipo] = useState("todos");

  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<number | null>(null);
  const [painelId, setPainelId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(FORM_VAZIO);

  // Preencher número automático ao abrir modal de criação
  useEffect(() => {
    if (modalAberto && !editando && nextNumeroData?.numero) {
      setForm((f) => ({ ...f, numero: nextNumeroData.numero }));
    }
  }, [modalAberto, editando, nextNumeroData]);

  const createMutation = trpc.projetos.create.useMutation({
    onSuccess: () => {
      toast.success("Projeto criado com sucesso!");
      utils.projetos.list.invalidate();
      utils.projetos.nextNumero.invalidate();
      setModalAberto(false);
      setForm(FORM_VAZIO);
    },
    onError: (e) => toast.error(`Erro ao criar projeto: ${e.message}`),
  });

  const updateMutation = trpc.projetos.update.useMutation({
    onSuccess: () => {
      toast.success("Projeto atualizado!");
      utils.projetos.list.invalidate();
      setModalAberto(false);
      setEditando(null);
      setForm(FORM_VAZIO);
    },
    onError: (e) => toast.error(`Erro ao atualizar projeto: ${e.message}`),
  });

  const deleteMutation = trpc.projetos.delete.useMutation({
    onSuccess: () => {
      toast.success("Projeto excluído.");
      utils.projetos.list.invalidate();
    },
    onError: (e) => toast.error(`Erro ao excluir: ${e.message}`),
  });

  const mudarStatusMutation = trpc.projetos.mudarStatus.useMutation({
    onSuccess: () => { utils.projetos.list.invalidate(); toast.success("Status atualizado!"); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  function abrirNovo() {
    setEditando(null);
    setForm(FORM_VAZIO);
    setModalAberto(true);
  }

  function abrirEditar(p: any) {
    setEditando(p.id);
    setForm({
      numero: p.numero ?? "",
      nome: p.nome ?? "",
      clienteId: p.clienteId ? String(p.clienteId) : "",
      tipoProjeto: p.tipoProjeto ?? "SERVICO_PONTUAL",
      statusOperacional: p.statusOperacional ?? "PLANEJAMENTO",
      responsavelUserId: p.responsavelUserId ? String(p.responsavelUserId) : "",
      dataInicioPrevista: p.dataInicioPrevista ? new Date(p.dataInicioPrevista).toISOString().split("T")[0] : "",
      dataFimPrevista: p.dataFimPrevista ? new Date(p.dataFimPrevista).toISOString().split("T")[0] : "",
      dataInicioReal: p.dataInicioReal ? new Date(p.dataInicioReal).toISOString().split("T")[0] : "",
      dataFimReal: p.dataFimReal ? new Date(p.dataFimReal).toISOString().split("T")[0] : "",
      centroCustoId: p.centroCustoId ? String(p.centroCustoId) : "",
      valorContratado: p.valorContratado ? String(p.valorContratado) : "",
      localExecucao: p.localExecucao ?? "",
      descricao: p.descricao ?? "",
      observacoes: p.observacoes ?? "",
      criarCentroCusto: false,
    });
    setModalAberto(true);
  }

  function handleSubmit() {
    if (!form.nome.trim()) {
      toast.error("Nome do projeto é obrigatório");
      return;
    }
    const payload = {
      numero: form.numero || undefined,
      nome: form.nome,
      clienteId: form.clienteId ? parseInt(form.clienteId) : null,
      tipoProjeto: form.tipoProjeto as any,
      statusOperacional: form.statusOperacional as any,
      responsavelUserId: form.responsavelUserId ? parseInt(form.responsavelUserId) : null,
      dataInicioPrevista: form.dataInicioPrevista || null,
      dataFimPrevista: form.dataFimPrevista || null,
      dataInicioReal: form.dataInicioReal || null,
      dataFimReal: form.dataFimReal || null,
      centroCustoId: form.centroCustoId ? parseInt(form.centroCustoId) : null,
      valorContratado: form.valorContratado ? parseFloat(form.valorContratado) : 0,
      localExecucao: form.localExecucao || null,
      descricao: form.descricao || null,
      observacoes: form.observacoes || null,
      criarCentroCusto: form.criarCentroCusto,
    };
    if (editando) {
      updateMutation.mutate({ id: editando, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  // Filtros
  const projetosFiltrados = projetos.filter((p) => {
    const matchBusca = !busca ||
      p.nome.toLowerCase().includes(busca.toLowerCase()) ||
      p.numero.toLowerCase().includes(busca.toLowerCase()) ||
      (p.clienteNome ?? "").toLowerCase().includes(busca.toLowerCase());
    const matchStatus = filtroStatus === "todos" || p.statusOperacional === filtroStatus;
    const matchTipo = filtroTipo === "todos" || p.tipoProjeto === filtroTipo;
    return matchBusca && matchStatus && matchTipo;
  });

  const isAdmin = user?.role === "admin";

  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FolderOpen className="w-6 h-6 text-primary" />
            Projetos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestão centralizada de projetos, contratos, OS e financeiro
          </p>
        </div>
        <Button onClick={abrirNovo} className="gap-2">
          <Plus className="w-4 h-4" /> Novo Projeto
        </Button>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total", count: projetos.length, icon: FolderOpen, color: "text-blue-600" },
          { label: "Em Execução", count: projetos.filter(p => p.statusOperacional === "EM_EXECUCAO").length, icon: TrendingUp, color: "text-orange-500" },
          { label: "Concluídos", count: projetos.filter(p => ["CONCLUIDO_TECNICAMENTE", "ENCERRADO_FINANCEIRAMENTE"].includes(p.statusOperacional ?? "")).length, icon: CheckCircle, color: "text-green-600" },
          { label: "Cancelados", count: projetos.filter(p => p.statusOperacional === "CANCELADO").length, icon: XCircle, color: "text-red-500" },
        ].map((card) => (
          <Card key={card.label} className="p-4">
            <div className="flex items-center gap-3">
              <card.icon className={`w-8 h-8 ${card.color}`} />
              <div>
                <p className="text-2xl font-bold">{card.count}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, número ou cliente..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {STATUS_PROJETO.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {TIPOS_PROJETO.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin w-8 h-8 text-primary" />
        </div>
      ) : projetosFiltrados.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum projeto encontrado.</p>
          <Button variant="outline" className="mt-4" onClick={abrirNovo}>
            <Plus className="w-4 h-4 mr-2" /> Criar primeiro projeto
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Valor Contratado</TableHead>
                <TableHead>Início Previsto</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projetosFiltrados.map((p) => {
                const statusCfg = getStatusConfig(p.statusOperacional ?? "PLANEJAMENTO");
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs text-primary font-semibold">{p.numero}</TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">{p.nome}</TableCell>
                    <TableCell className="text-xs">{TIPOS_PROJETO.find(t => t.value === p.tipoProjeto)?.label ?? p.tipoProjeto}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{p.clienteNome ?? "—"}</TableCell>
                    <TableCell className="text-sm">{p.responsavelNome ?? "—"}</TableCell>
                    <TableCell className="text-sm font-medium">{fmtMoeda(p.valorContratado)}</TableCell>
                    <TableCell className="text-sm">{fmtData(p.dataInicioPrevista)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline" className="h-8 px-2 text-xs gap-1">
                              Status <ChevronDown className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuLabel className="text-xs">Mudar Status</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {STATUS_PROJETO.map((s) => (
                              <DropdownMenuItem key={s.value}
                                disabled={p.statusOperacional === s.value}
                                onClick={() => mudarStatusMutation.mutate({ id: p.id, statusOperacional: s.value as any })}
                                className={`text-xs ${p.statusOperacional === s.value ? "font-bold" : ""}`}
                              >
                                <span className={`w-2 h-2 rounded-full mr-2 inline-block ${s.color.split(" ")[0]}`} />
                                {s.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button
                          size="sm" variant="ghost"
                          onClick={() => setPainelId(p.id)}
                          title="Ver painel"
                        >
                          <Eye className="w-4 h-4 text-blue-500" />
                        </Button>
                        <Button
                          size="sm" variant="ghost"
                          onClick={() => navigate(`/projetos/${p.id}/orcamento`)}
                          title="Orçamento do Projeto"
                        >
                          <BarChart3 className="w-4 h-4 text-green-600" />
                        </Button>
                        <Button
                          size="sm" variant="ghost"
                          onClick={() => abrirEditar(p)}
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4 text-amber-500" />
                        </Button>
                        {isAdmin && (
                          <Button
                            size="sm" variant="ghost"
                            onClick={() => {
                              if (confirm(`Excluir o projeto "${p.nome}"?`)) {
                                deleteMutation.mutate({ id: p.id });
                              }
                            }}
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Modal de Criação/Edição */}
      <Dialog open={modalAberto} onOpenChange={(o) => { if (!o) { setModalAberto(false); setEditando(null); setForm(FORM_VAZIO); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar Projeto" : "Novo Projeto"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Número e Nome */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nº de Controle</Label>
                <Input value={form.numero} onChange={(e) => setForm(f => ({ ...f, numero: e.target.value }))} placeholder="PRJ-2026-03-001" />
              </div>
              <div>
                <Label>Nome do Projeto *</Label>
                <Input value={form.nome} onChange={(e) => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Instalação Elétrica Giraffas" />
              </div>
            </div>

            {/* Tipo e Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo de Projeto</Label>
                <Select value={form.tipoProjeto} onValueChange={(v) => setForm(f => ({ ...f, tipoProjeto: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_PROJETO.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status Operacional</Label>
                <Select value={form.statusOperacional} onValueChange={(v) => setForm(f => ({ ...f, statusOperacional: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_PROJETO.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Cliente e Responsável */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cliente</Label>
                <Select value={form.clienteId || "none"} onValueChange={(v) => setForm(f => ({ ...f, clienteId: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {(clientes as any[]).map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Responsável</Label>
                <Select value={form.responsavelUserId || "none"} onValueChange={(v) => setForm(f => ({ ...f, responsavelUserId: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione o responsável" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {(usuarios as any[]).map((u: any) => <SelectItem key={u.id} value={String(u.id)}>{u.name ?? u.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Datas previstas */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Início Previsto</Label>
                <Input type="date" value={form.dataInicioPrevista} onChange={(e) => setForm(f => ({ ...f, dataInicioPrevista: e.target.value }))} />
              </div>
              <div>
                <Label>Fim Previsto</Label>
                <Input type="date" value={form.dataFimPrevista} onChange={(e) => setForm(f => ({ ...f, dataFimPrevista: e.target.value }))} />
              </div>
            </div>

            {/* Datas reais */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Início Real</Label>
                <Input type="date" value={form.dataInicioReal} onChange={(e) => setForm(f => ({ ...f, dataInicioReal: e.target.value }))} />
              </div>
              <div>
                <Label>Fim Real</Label>
                <Input type="date" value={form.dataFimReal} onChange={(e) => setForm(f => ({ ...f, dataFimReal: e.target.value }))} />
              </div>
            </div>

            {/* Valor e Local */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valor Contratado (R$)</Label>
                <Input type="number" step="0.01" value={form.valorContratado} onChange={(e) => setForm(f => ({ ...f, valorContratado: e.target.value }))} placeholder="0,00" />
              </div>
              <div>
                <Label>Local de Execução</Label>
                <Input value={form.localExecucao} onChange={(e) => setForm(f => ({ ...f, localExecucao: e.target.value }))} placeholder="Ex: Brasília - DF" />
              </div>
            </div>

            {/* Centro de Custo */}
            <div>
              <Label>Centro de Custo</Label>
              <Select value={form.centroCustoId || "none"} onValueChange={(v) => setForm(f => ({ ...f, centroCustoId: v === "none" ? "" : v, criarCentroCusto: false }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o CC" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  <SelectItem value="criar">+ Criar CC automaticamente</SelectItem>
                  {(centrosCusto as any[]).map((cc: any) => <SelectItem key={cc.id} value={String(cc.id)}>{cc.nome}</SelectItem>)}
                </SelectContent>
              </Select>
              {form.centroCustoId === "criar" && (
                <p className="text-xs text-muted-foreground mt-1">
                  Um Centro de Custo do tipo PROJETO será criado automaticamente com o nome do projeto.
                </p>
              )}
            </div>

            {/* Descrição e Observações */}
            <div>
              <Label>Descrição</Label>
              <Textarea value={form.descricao} onChange={(e) => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descreva o escopo do projeto..." rows={3} />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={(e) => setForm(f => ({ ...f, observacoes: e.target.value }))} placeholder="Observações adicionais..." rows={2} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setModalAberto(false); setEditando(null); setForm(FORM_VAZIO); }}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editando ? "Salvar Alterações" : "Criar Projeto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal do Painel do Projeto */}
      <Dialog open={painelId !== null} onOpenChange={(o) => { if (!o) setPainelId(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Painel do Projeto
            </DialogTitle>
          </DialogHeader>
          {painelId && <PainelProjeto projetoId={painelId} onClose={() => setPainelId(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
