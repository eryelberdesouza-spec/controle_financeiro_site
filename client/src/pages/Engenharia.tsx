import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { EngenhariaImpressao, type ContratoParaImpressao, type OSParaImpressao, type MaterialParaImpressao, type TipoServicoParaImpressao } from "@/components/EngenhariaImpressao";
import {
  Plus, Search, Edit2, Trash2, FileText, Wrench, Package, ClipboardList,
  ChevronDown, ChevronUp, Eye, Link2, DollarSign, BarChart2, MapPin, Printer, CheckSquare, Calendar, Archive, ArchiveRestore
} from "lucide-react";
import AnexosPanel from "@/components/AnexosPanel";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";

// === Helpers ===
const fmt = (v: string | number | null | undefined) =>
  v == null ? "—" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const STATUS_CONTRATO: Record<string, { label: string; color: string }> = {
  proposta: { label: "Proposta", color: "bg-purple-100 text-purple-800" },
  em_negociacao: { label: "Em Negociação", color: "bg-yellow-100 text-yellow-800" },
  ativo: { label: "Ativo", color: "bg-green-100 text-green-800" },
  suspenso: { label: "Suspenso", color: "bg-orange-100 text-orange-800" },
  encerrado: { label: "Encerrado", color: "bg-gray-100 text-gray-700" },
};

const STATUS_OS: Record<string, { label: string; color: string }> = {
  planejada: { label: "Planejada", color: "bg-blue-100 text-blue-800" },
  autorizada: { label: "Autorizada", color: "bg-purple-100 text-purple-800" },
  em_execucao: { label: "Em Execução", color: "bg-yellow-100 text-yellow-800" },
  concluida: { label: "Concluída", color: "bg-green-100 text-green-800" },
  cancelada: { label: "Cancelada", color: "bg-red-100 text-red-800" },
};

const PRIORIDADE: Record<string, { label: string; color: string }> = {
  baixa: { label: "Baixa", color: "bg-gray-100 text-gray-600" },
  media: { label: "Média", color: "bg-blue-100 text-blue-700" },
  alta: { label: "Alta", color: "bg-orange-100 text-orange-700" },
  urgente: { label: "Urgente", color: "bg-red-100 text-red-800" },
};

// === Contratos ===
export function ContratosTab() {
  const { can } = usePermissions();
  const podeCriar = can.criar("engenharia_contratos");
  const podeEditar = can.editar("engenharia_contratos");
  const podeExcluir = can.excluir("engenharia_contratos");
  const utils = trpc.useUtils();
  const { data: contratos = [], isLoading } = trpc.contratos.list.useQuery();
  const { data: clientes = [] } = trpc.clientes.list.useQuery();
  const { data: centrosCustoList = [] } = trpc.centrosCusto.list.useQuery();
  const { data: listaProjetos = [] } = trpc.projetos.list.useQuery();
  const { data: nextNumero } = trpc.contratos.nextNumero.useQuery();

  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroCC, setFiltroCC] = useState("todos");
  const [showArquivadosContratos, setShowArquivadosContratos] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [relatorioContratoId, setRelatorioContratoId] = useState<number | null>(null);
  const [relatorioAba, setRelatorioAba] = useState<"resumo" | "dre">("resumo");
  const [impressaoContratos, setImpressaoContratos] = useState<ContratoParaImpressao[] | null>(null);
  const { data: relatorio, isLoading: relatorioLoading } = trpc.relatorioContrato.getRelatorio.useQuery(
    { contratoId: relatorioContratoId! },
    { enabled: relatorioContratoId !== null }
  );
  const { data: dreData, isLoading: dreLoading } = trpc.relatorioContrato.getDRE.useQuery(
    { contratoId: relatorioContratoId! },
    { enabled: relatorioContratoId !== null && relatorioAba === "dre" }
  );
  const [form, setForm] = useState({
    numero: "", objeto: "", tipo: "prestacao_servico" as const,
    status: "proposta" as const, clienteId: "" as string | number,
    centroCustoId: null as number | null,
    projetoId: null as number | null,
    valorTotal: "", dataInicio: "", dataFim: "", descricao: "", observacoes: "",
    enderecoLogradouro: "", enderecoNumero: "", enderecoComplemento: "",
    enderecoBairro: "", enderecoCidade: "", enderecoEstado: "", enderecoCep: "",
  });

  // Abre formulário automaticamente quando navegar com ?novo=1
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("novo") === "1" && podeCriar) {
      setEditId(null);
      setShowForm(true);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Estado para geração automática de recebimentos
  const [gerarRec, setGerarRec] = useState(false);
  const [numParcelas, setNumParcelas] = useState(1);
  const [tipoRecGerado, setTipoRecGerado] = useState<"Pix" | "Boleto" | "Transferência" | "Cartão de Crédito" | "Cartão de Débito" | "Dinheiro" | "Outro">("Pix");
  const [dataPrimeiroVenc, setDataPrimeiroVenc] = useState("");

  const createMutation = trpc.contratos.create.useMutation({
    onSuccess: () => { utils.contratos.list.invalidate(); utils.recebimentos.list.invalidate(); setShowForm(false); toast.success(gerarRec ? `Contrato criado com recebimentos gerados!` : "Contrato criado!"); },
    onError: (err) => toast.error(`Erro ao criar contrato: ${err.message}`),
  });
  const regenerarMutation = trpc.contratos.regenerarRecebimentos.useMutation({
    onSuccess: (data) => { utils.recebimentos.list.invalidate(); toast.success(`${data.gerados} recebimento(s) gerado(s) com sucesso!`); },
    onError: (err) => toast.error(`Erro ao regenerar recebimentos: ${err.message}`),
  });
  const updateMutation = trpc.contratos.update.useMutation({
    onSuccess: () => { utils.contratos.list.invalidate(); setShowForm(false); setEditId(null); toast.success("Contrato atualizado!"); },
    onError: (err) => toast.error(`Erro ao atualizar contrato: ${err.message}`),
  });
  const [deleteContratoId, setDeleteContratoId] = useState<number | null>(null);
  const deleteMutation = trpc.contratos.delete.useMutation({
    onSuccess: () => { utils.contratos.list.invalidate(); toast.success("Contrato removido."); setDeleteContratoId(null); }
  });
  const arquivarContratoMutation = trpc.contratos.arquivar.useMutation({
    onSuccess: () => { utils.contratos.list.invalidate(); toast.success("Contrato arquivado."); },
    onError: (e: any) => toast.error(e.message),
  });
  const desarquivarContratoMutation = trpc.contratos.desarquivar.useMutation({
    onSuccess: () => { utils.contratos.list.invalidate(); toast.success("Contrato restaurado."); },
    onError: (e: any) => toast.error(e.message),
  });
  const mudarStatusMutation = trpc.contratos.mudarStatus.useMutation({
    onSuccess: () => { utils.contratos.list.invalidate(); toast.success("Status atualizado!"); },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });
  const criarCCRapidoMutation = trpc.centrosCusto.create.useMutation({
    onSuccess: (cc: any) => {
      utils.centrosCusto.list.invalidate();
      setForm(p => ({ ...p, centroCustoId: cc.id }));
      toast.success(`CC criado e vinculado!`);
    },
    onError: (err: any) => toast.error(err.message),
  });
  const ativarMutation = trpc.relatorioContrato.ativarContrato.useMutation({
    onSuccess: (data) => {
      utils.contratos.list.invalidate();
      utils.centrosCusto?.list?.invalidate?.();
      toast.success("Contrato ativado! Centro de Custo vinculado automaticamente.");
    },
    onError: (err) => toast.error(err.message),
  });

  const filtered = useMemo(() => {
    return contratos.filter(c => {
      const statusRegistro = (c as any).statusRegistro ?? 'ativo';
      const matchArquivado = showArquivadosContratos ? statusRegistro === 'arquivado' : statusRegistro !== 'arquivado';
      const matchBusca = !busca || c.numero.toLowerCase().includes(busca.toLowerCase()) ||
        c.objeto.toLowerCase().includes(busca.toLowerCase()) ||
        (c.clienteNome ?? "").toLowerCase().includes(busca.toLowerCase());
      const matchStatus = filtroStatus === "todos" || c.status === filtroStatus;
      const matchTipo = filtroTipo === "todos" || c.tipo === filtroTipo;
      const matchCliente = !filtroCliente || (c.clienteNome ?? "").toLowerCase().includes(filtroCliente.toLowerCase());
      const matchCC = filtroCC === "todos" || String((c as any).centroCustoId ?? "") === filtroCC;
      return matchArquivado && matchBusca && matchStatus && matchTipo && matchCliente && matchCC;
    });
  }, [contratos, busca, filtroStatus, filtroTipo, filtroCliente, filtroCC]);

  // Atualiza o número automaticamente quando nextNumero chegar do servidor
  useEffect(() => {
    if (!editId && showForm && nextNumero) {
      setForm(prev => ({
        ...prev,
        numero: prev.numero || nextNumero,
      }));
    }
  }, [nextNumero, showForm, editId]);

  function openNew() {
    setEditId(null);
    setForm({ numero: nextNumero ?? "", objeto: "", tipo: "prestacao_servico", status: "proposta", clienteId: "", centroCustoId: null, projetoId: null, valorTotal: "", dataInicio: "", dataFim: "", descricao: "", observacoes: "", enderecoLogradouro: "", enderecoNumero: "", enderecoComplemento: "", enderecoBairro: "", enderecoCidade: "", enderecoEstado: "", enderecoCep: "" });
    setShowForm(true);
  }

  function openEdit(c: typeof contratos[0]) {
    setEditId(c.id);
    setForm({
      numero: c.numero, objeto: c.objeto, tipo: c.tipo as any,
      status: c.status as any, clienteId: c.clienteId ?? "",
      centroCustoId: (c as any).centroCustoId ?? null,
      projetoId: (c as any).projetoId ?? null,
      valorTotal: c.valorTotal ?? "", dataInicio: c.dataInicio ? new Date(c.dataInicio).toISOString().split("T")[0] : "",
      dataFim: c.dataFim ? new Date(c.dataFim).toISOString().split("T")[0] : "",
      descricao: c.descricao ?? "", observacoes: c.observacoes ?? "",
      enderecoLogradouro: c.enderecoLogradouro ?? "", enderecoNumero: c.enderecoNumero ?? "",
      enderecoComplemento: c.enderecoComplemento ?? "", enderecoBairro: c.enderecoBairro ?? "",
      enderecoCidade: c.enderecoCidade ?? "", enderecoEstado: c.enderecoEstado ?? "", enderecoCep: c.enderecoCep ?? "",
    });
    setShowForm(true);
  }

  function handleSubmit() {
    const payload = {
      numero: form.numero, objeto: form.objeto, tipo: form.tipo, status: form.status,
      clienteId: form.clienteId ? Number(form.clienteId) : undefined,
      centroCustoId: form.centroCustoId ?? undefined,
      projetoId: form.projetoId ?? undefined,
      valorTotal: parseFloat(String(form.valorTotal).replace(",", ".")) || 0,
      valorPrevisto: (form as any).valorPrevisto ? parseFloat(String((form as any).valorPrevisto).replace(",", ".")) : undefined,
      margemPrevista: (form as any).margemPrevista ? parseFloat(String((form as any).margemPrevista).replace(",", ".")) : undefined,
      dataInicio: form.dataInicio || undefined, dataFim: form.dataFim || undefined,
      descricao: form.descricao || undefined, observacoes: form.observacoes || undefined,
      enderecoLogradouro: form.enderecoLogradouro || undefined,
      enderecoNumero: form.enderecoNumero || undefined,
      enderecoComplemento: form.enderecoComplemento || undefined,
      enderecoBairro: form.enderecoBairro || undefined,
      enderecoCidade: form.enderecoCidade || undefined,
      enderecoEstado: form.enderecoEstado || undefined,
      enderecoCep: form.enderecoCep || undefined,
    };
    if (editId) updateMutation.mutate({ id: editId, ...payload });
    else createMutation.mutate({
      ...payload,
      gerarRecebimentos: gerarRec,
      numeroParcelas: numParcelas,
      tipoRecebimento: tipoRecGerado,
      dataPrimeiroVencimento: dataPrimeiroVenc || undefined,
    });
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar contrato..." className="pl-9" value={busca} onChange={e => setBusca(e.target.value)} />
          </div>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Status</SelectItem>
              {Object.entries(STATUS_CONTRATO).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Tipos</SelectItem>
              <SelectItem value="prestacao_servico">Prestação de Serviço</SelectItem>
              <SelectItem value="fornecimento">Fornecimento</SelectItem>
              <SelectItem value="locacao">Locação</SelectItem>
              <SelectItem value="misto">Misto</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Filtrar cliente..." className="pl-9 w-44" value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)} />
          </div>
          <Select value={filtroCC} onValueChange={setFiltroCC}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Centro de Custo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os CC</SelectItem>
              {centrosCustoList.map(cc => (
                <SelectItem key={cc.id} value={String(cc.id)}>{cc.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {filtroCC !== "todos" && (
            <Button variant="ghost" size="sm" onClick={() => setFiltroCC("todos")} className="text-muted-foreground">Limpar CC</Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImpressaoContratos(filtered)} className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-50">
            <Printer className="h-4 w-4" /> Imprimir Lista ({filtered.length})
          </Button>
          <Button
            variant={showArquivadosContratos ? "default" : "outline"}
            size="sm"
            className="gap-2"
            onClick={() => setShowArquivadosContratos(v => !v)}
          >
            <Archive className="h-4 w-4" />
            {showArquivadosContratos ? "Ver Ativos" : "Ver Arquivados"}
          </Button>
          {podeCriar && <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Novo Contrato</Button>}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Nenhum contrato encontrado.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => {
            const st = STATUS_CONTRATO[c.status ?? "proposta"] ?? STATUS_CONTRATO.proposta;
            return (
              <Card key={c.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-semibold text-primary">{c.numero}</span>
                        <Badge className={`text-xs ${st.color}`}>{st.label}</Badge>
                        <Badge variant="outline" className="text-xs">{c.tipo.replace("_", " ")}</Badge>
                      </div>
                      <p className="mt-1 font-medium truncate">{c.objeto}</p>
                      {c.clienteNome && <p className="text-sm text-muted-foreground">{c.clienteNome}</p>}
                      <div className="flex gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                        <span>Valor: <strong className="text-foreground">{fmt(c.valorTotal)}</strong></span>
                        {c.dataInicio && <span>Início: {new Date(c.dataInicio).toLocaleDateString("pt-BR")}</span>}
                        {c.dataFim && <span>Fim: {new Date(c.dataFim).toLocaleDateString("pt-BR")}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {podeEditar && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline" className="h-8 px-2 text-xs gap-1">
                              Status <ChevronDown className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuLabel className="text-xs">Mudar Status</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {Object.entries(STATUS_CONTRATO).map(([k, v]) => (
                              <DropdownMenuItem key={k} disabled={c.status === k}
                                onClick={() => {
                                  if (k === "ativo" && c.status !== "ativo") {
                                    if (confirm(`Ativar contrato ${c.numero}? Um Centro de Custo será criado automaticamente.`)) ativarMutation.mutate({ id: c.id });
                                  } else {
                                    mudarStatusMutation.mutate({ id: c.id, status: k as any });
                                  }
                                }}
                                className={`text-xs ${c.status === k ? "font-bold" : ""}`}
                              >
                                <span className={`w-2 h-2 rounded-full mr-2 inline-block ${v.color.split(" ")[0]}`} />
                                {v.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                      {podeEditar && c.status !== "ativo" && c.status !== "encerrado" && false && (
                        <Button size="sm" variant="outline" className="text-green-700 border-green-300 hover:bg-green-50 h-8 px-2 text-xs" title="Ativar Contrato" onClick={() => { if (confirm(`Ativar contrato ${c.numero}? Um Centro de Custo será criado automaticamente.`)) ativarMutation.mutate({ id: c.id }); }} disabled={ativarMutation.isPending}>
                          Ativar
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" title="Imprimir Contrato" onClick={() => setImpressaoContratos([c])}>
                        <Printer className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button size="icon" variant="ghost" title="Relatório do Contrato" onClick={() => setRelatorioContratoId(c.id)}>
                        <BarChart2 className="h-4 w-4 text-blue-600" />
                      </Button>
                      {podeEditar && (c as any).statusRegistro !== 'arquivado' && <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Edit2 className="h-4 w-4" /></Button>}
                      {podeEditar && (
                        (c as any).statusRegistro === 'arquivado' ? (
                          <Button size="icon" variant="ghost" title="Restaurar" className="text-green-600" onClick={() => desarquivarContratoMutation.mutate({ id: c.id })}><ArchiveRestore className="h-4 w-4" /></Button>
                        ) : (
                          <Button size="icon" variant="ghost" title="Arquivar" className="text-orange-500" onClick={() => { if (confirm(`Arquivar contrato ${c.numero}?`)) arquivarContratoMutation.mutate({ id: c.id }); }}><Archive className="h-4 w-4" /></Button>
                        )
                      )}
                      {podeExcluir && (c as any).statusRegistro !== 'arquivado' && <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteContratoId(c.id)}><Trash2 className="h-4 w-4" /></Button>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Relatório por Contrato */}
      <Dialog open={relatorioContratoId !== null} onOpenChange={v => { if (!v) { setRelatorioContratoId(null); setRelatorioAba("resumo"); } }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-blue-600" />
              Relatório do Contrato
            </DialogTitle>
          </DialogHeader>
          {/* Abas Resumo / DRE */}
          <div className="flex gap-1 border-b mb-2">
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                relatorioAba === "resumo" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setRelatorioAba("resumo")}
            >
              Resumo Financeiro
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                relatorioAba === "dre" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setRelatorioAba("dre")}
            >
              DRE do Contrato
            </button>
          </div>
          {relatorioAba === "dre" ? (
            dreLoading ? (
              <div className="py-12 text-center text-muted-foreground">Carregando DRE...</div>
            ) : dreData ? (
              <div className="space-y-4 py-2">
                <div className="p-4 bg-muted/40 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-mono font-bold text-primary">{dreData.contrato.numero}</p>
                      <p className="font-semibold">{dreData.contrato.objeto}</p>
                      <p className="text-sm text-muted-foreground">{dreData.contrato.clienteNome}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Valor Contratado</p>
                      <p className="text-xl font-bold text-primary">{fmt(dreData.contrato.receitaContratada)}</p>
                    </div>
                  </div>
                </div>
                {/* Tabela DRE */}
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 font-semibold">Descrição</th>
                        <th className="text-right p-3 font-semibold">Previsto</th>
                        <th className="text-right p-3 font-semibold">Realizado</th>
                        <th className="text-right p-3 font-semibold">Pend./Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t bg-green-50/50">
                        <td className="p-3 font-semibold text-green-800">RECEITAS</td>
                        <td className="p-3 text-right text-green-700">{fmt(dreData.receitas.prevista)}</td>
                        <td className="p-3 text-right font-bold text-green-800">{fmt(dreData.receitas.realizada)}</td>
                        <td className="p-3 text-right text-green-600">{fmt(dreData.receitas.pendente)}</td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-3 pl-6 text-muted-foreground">Receita Contratada</td>
                        <td className="p-3 text-right">{fmt(dreData.receitas.contratada)}</td>
                        <td className="p-3 text-right">—</td>
                        <td className="p-3 text-right">—</td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-3 pl-6 text-muted-foreground">Recebimentos Realizados</td>
                        <td className="p-3 text-right">—</td>
                        <td className="p-3 text-right">{fmt(dreData.receitas.realizada)}</td>
                        <td className="p-3 text-right">{fmt(dreData.receitas.pendente)}</td>
                      </tr>
                      <tr className="border-t bg-red-50/50">
                        <td className="p-3 font-semibold text-red-800">CUSTOS</td>
                        <td className="p-3 text-right text-red-700">{fmt(dreData.custos.previstos)}</td>
                        <td className="p-3 text-right font-bold text-red-800">{fmt(dreData.custos.realizados)}</td>
                        <td className="p-3 text-right text-red-600">{fmt(dreData.custos.pendentes)}</td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-3 pl-6 text-muted-foreground">Pagamentos Realizados (CC)</td>
                        <td className="p-3 text-right">—</td>
                        <td className="p-3 text-right">{fmt(dreData.custos.realizados)}</td>
                        <td className="p-3 text-right">{fmt(dreData.custos.pendentes)}</td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-3 pl-6 text-muted-foreground">Custo Estimado das OS</td>
                        <td className="p-3 text-right">{fmt(dreData.custos.osEstimado)}</td>
                        <td className="p-3 text-right">{fmt(dreData.custos.osRealizado)}</td>
                        <td className="p-3 text-right">—</td>
                      </tr>
                      <tr className="border-t-2 border-gray-300 bg-muted/30">
                        <td className="p-3 font-bold">MARGEM BRUTA</td>
                        <td className="p-3 text-right font-semibold">
                          {fmt(dreData.margens.prevista)}
                          <span className="ml-1 text-xs text-muted-foreground">({dreData.margens.previstaPerc.toFixed(1)}%)</span>
                        </td>
                        <td className={`p-3 text-right font-bold ${dreData.margens.bruta >= 0 ? "text-green-700" : "text-red-700"}`}>
                          {fmt(dreData.margens.bruta)}
                          <span className="ml-1 text-xs">({dreData.margens.brutaPerc.toFixed(1)}%)</span>
                        </td>
                        <td className="p-3 text-right">—</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                {/* Indicadores */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 border rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">OS Vinculadas</p>
                    <p className="text-xl font-bold">{dreData.os.length}</p>
                  </div>
                  <div className="p-3 border rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">OS Concluídas</p>
                    <p className="text-xl font-bold text-green-700">{dreData.os.filter(o => o.status === "concluida").length}</p>
                  </div>
                  <div className="p-3 border rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">Recebimentos</p>
                    <p className="text-xl font-bold text-blue-700">{dreData.recebimentos.length}</p>
                  </div>
                  <div className="p-3 border rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">Pagamentos (CC)</p>
                    <p className="text-xl font-bold text-orange-700">{dreData.pagamentos.length}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">Nenhum dado encontrado.</div>
            )
          ) : relatorioLoading ? (
            <div className="py-12 text-center text-muted-foreground">Carregando relatório...</div>
          ) : relatorio ? (
            <div className="space-y-6 py-2">
              {/* Cabeçalho do Contrato */}
              <div className="p-4 bg-muted/40 rounded-lg border">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-primary text-lg">{relatorio.contrato.numero}</span>
                      <Badge className={`text-xs ${(STATUS_CONTRATO[relatorio.contrato.status ?? "proposta"] ?? STATUS_CONTRATO.proposta)?.color}`}>
                        {(STATUS_CONTRATO[relatorio.contrato.status ?? "proposta"] ?? STATUS_CONTRATO.proposta)?.label}
                      </Badge>
                    </div>
                    <p className="font-semibold text-base mt-1">{relatorio.contrato.objeto}</p>
                    {relatorio.contrato.clienteNome && (
                      <p className="text-sm text-muted-foreground">{relatorio.contrato.clienteNome}</p>
                    )}
                    <div className="flex gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                      {relatorio.contrato.dataInicio && <span>Início: {new Date(relatorio.contrato.dataInicio).toLocaleDateString("pt-BR")}</span>}
                      {relatorio.contrato.dataFim && <span>Fim: {new Date(relatorio.contrato.dataFim).toLocaleDateString("pt-BR")}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">Valor do Contrato</p>
                    <p className="text-2xl font-bold text-primary">{fmt(relatorio.totais.valorContrato)}</p>
                  </div>
                </div>
              </div>

              {/* Cards de Totais */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                  <p className="text-xs text-green-700 font-medium">Total Recebido</p>
                  <p className="text-lg font-bold text-green-800">{fmt(relatorio.totais.totalRecebido)}</p>
                </div>
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                  <p className="text-xs text-yellow-700 font-medium">Pendente</p>
                  <p className="text-lg font-bold text-yellow-800">{fmt(relatorio.totais.totalPendente)}</p>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                  <p className="text-xs text-blue-700 font-medium">Saldo Restante</p>
                  <p className="text-lg font-bold text-blue-800">{fmt(relatorio.totais.saldoRestante)}</p>
                </div>
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-center">
                  <p className="text-xs text-purple-700 font-medium">OS ({relatorio.totais.osTotal})</p>
                  <p className="text-lg font-bold text-purple-800">{relatorio.totais.osConcluida} concluídas</p>
                </div>
              </div>

              {/* Ordens de Serviço */}
              {relatorio.os.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
                    <ClipboardList className="h-4 w-4" />Ordens de Serviço ({relatorio.os.length})
                  </h3>
                  <div className="space-y-2">
                    {relatorio.os.map(os => {
                      const st = STATUS_OS[os.status ?? "planejada"] ?? STATUS_OS.planejada;
                      return (
                        <div key={os.id} className="flex items-center justify-between p-3 border rounded-lg text-sm">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="font-mono font-semibold text-primary shrink-0">{os.numero}</span>
                            <Badge className={`text-xs shrink-0 ${st.color}`}>{st.label}</Badge>
                            <span className="truncate">{os.titulo}</span>
                          </div>
                          <div className="flex gap-4 text-muted-foreground shrink-0 ml-2">
                            {os.valorEstimado && <span>{fmt(os.valorEstimado)}</span>}
                            {os.dataPrevisao && <span>{new Date(os.dataPrevisao).toLocaleDateString("pt-BR")}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recebimentos */}
              {relatorio.recebimentos.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4 text-green-600" />Recebimentos ({relatorio.recebimentos.length})
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="text-left p-2 font-medium">Nº Controle</th>
                          <th className="text-left p-2 font-medium">Descrição</th>
                          <th className="text-right p-2 font-medium">Valor</th>
                          <th className="text-left p-2 font-medium">Vencimento</th>
                          <th className="text-left p-2 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {relatorio.recebimentos.map(r => (
                          <tr key={r.id} className="border-b hover:bg-muted/20">
                            <td className="p-2 font-mono text-xs">{r.numeroControle}</td>
                            <td className="p-2 text-muted-foreground">{r.descricao || r.nomeRazaoSocial}</td>
                            <td className="p-2 text-right font-semibold">{fmt(r.valorTotal)}</td>
                            <td className="p-2">{r.dataVencimento ? new Date(r.dataVencimento).toLocaleDateString("pt-BR") : "—"}</td>
                            <td className="p-2">
                              <Badge className={`text-xs ${
                                r.status === "Recebido" ? "bg-green-100 text-green-800" :
                                r.status === "Atrasado" ? "bg-red-100 text-red-800" :
                                "bg-yellow-100 text-yellow-800"
                              }`}>{r.status}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Pagamentos */}
              {relatorio.pagamentos.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4 text-red-500" />Pagamentos ({relatorio.pagamentos.length})
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="text-left p-2 font-medium">Nº Controle</th>
                          <th className="text-left p-2 font-medium">Beneficiário</th>
                          <th className="text-right p-2 font-medium">Valor</th>
                          <th className="text-left p-2 font-medium">Data</th>
                          <th className="text-left p-2 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {relatorio.pagamentos.map(p => (
                          <tr key={p.id} className="border-b hover:bg-muted/20">
                            <td className="p-2 font-mono text-xs">{p.numeroControle}</td>
                            <td className="p-2 text-muted-foreground">{p.nomeCompleto}</td>
                            <td className="p-2 text-right font-semibold">{fmt(p.valor)}</td>
                            <td className="p-2">{p.dataPagamento ? new Date(p.dataPagamento).toLocaleDateString("pt-BR") : "—"}</td>
                            <td className="p-2">
                              <Badge className={`text-xs ${
                                p.status === "Pago" ? "bg-green-100 text-green-800" :
                                p.status === "Cancelado" ? "bg-red-100 text-red-800" :
                                "bg-yellow-100 text-yellow-800"
                              }`}>{p.status}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {relatorio.recebimentos.length === 0 && relatorio.pagamentos.length === 0 && relatorio.os.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum dado financeiro ou OS vinculado a este contrato ainda.
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">Nenhum dado encontrado.</div>
          )}
          {/* Fim da aba Resumo */}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRelatorioContratoId(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={showForm} onOpenChange={v => { setShowForm(v); if (!v) setEditId(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto p-0">
          <SheetHeader className="px-6 py-4 border-b bg-muted/30 sticky top-0 z-10">
            <SheetTitle>{editId ? "Editar Contrato" : "Novo Contrato"}</SheetTitle>
          </SheetHeader>
          <div className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4 py-2 space-y-0">
            <div className="space-y-1">
              <Label>Nº do Contrato *</Label>
              <Input value={form.numero} onChange={e => setForm(p => ({ ...p, numero: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Tipo *</Label>
              <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="prestacao_servico">Prestação de Serviço</SelectItem>
                  <SelectItem value="fornecimento">Fornecimento</SelectItem>
                  <SelectItem value="locacao">Locação</SelectItem>
                  <SelectItem value="misto">Misto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Objeto / Descrição do Contrato *</Label>
              <Input value={form.objeto} onChange={e => setForm(p => ({ ...p, objeto: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONTRATO).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Cliente / Parceiro</Label>
              <Select value={form.clienteId ? String(form.clienteId) : "none"} onValueChange={v => setForm(p => ({ ...p, clienteId: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Nenhum —</SelectItem>
                  {clientes.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="flex items-center justify-between">
                <span>Centro de Custo</span>
                <button
                  type="button"
                  className="text-xs text-primary underline hover:no-underline"
                  onClick={() => {
                    const nome = prompt("Nome do novo Centro de Custo:");
                    if (!nome?.trim()) return;
                    criarCCRapidoMutation.mutate({ nome: nome.trim(), tipo: "contrato" });
                  }}
                >+ Criar novo CC</button>
              </Label>
              <Select
                value={form.centroCustoId ? String(form.centroCustoId) : "none"}
                onValueChange={v => setForm(p => ({ ...p, centroCustoId: v === "none" ? null : Number(v) }))}
              >
                <SelectTrigger><SelectValue placeholder="Selecionar CC..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Nenhum —</SelectItem>
                  {centrosCustoList.map((cc: any) => (
                    <SelectItem key={cc.id} value={String(cc.id)}>{cc.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Projeto Vinculado</Label>
              <Select
                value={form.projetoId ? String(form.projetoId) : "none"}
                onValueChange={v => setForm(p => ({ ...p, projetoId: v === "none" ? null : Number(v) }))}
              >
                <SelectTrigger><SelectValue placeholder="Selecionar projeto (opcional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Nenhum —</SelectItem>
                  {listaProjetos.map((proj: any) => (
                    <SelectItem key={proj.id} value={String(proj.id)}>
                      {proj.numero ? `${proj.numero} — ` : ""}{proj.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Valor Total (R$) *</Label>
              <Input type="number" min="0" step="0.01" value={form.valorTotal} onChange={e => setForm(p => ({ ...p, valorTotal: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Valor Previsto (R$)</Label>
              <Input type="number" min="0" step="0.01" placeholder="Valor previsto de receita" value={(form as any).valorPrevisto ?? ""} onChange={e => setForm(p => ({ ...p, valorPrevisto: e.target.value } as any))} />
            </div>
            <div className="space-y-1">
              <Label>Margem Prevista (%)</Label>
              <Input type="number" min="0" max="100" step="0.1" placeholder="Ex: 25" value={(form as any).margemPrevista ?? ""} onChange={e => setForm(p => ({ ...p, margemPrevista: e.target.value } as any))} />
            </div>
            <div className="space-y-1">
              <Label>Data de Início</Label>
              <Input type="date" value={form.dataInicio} onChange={e => setForm(p => ({ ...p, dataInicio: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Data de Fim / Vencimento</Label>
              <Input type="date" value={form.dataFim} onChange={e => setForm(p => ({ ...p, dataFim: e.target.value }))} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Descrição Detalhada</Label>
              <Textarea rows={3} value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Observações</Label>
              <Textarea rows={2} value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} />
            </div>
            {/* Endereço do Local de Execução */}
            <div className="col-span-2">
              <p className="text-sm font-semibold text-muted-foreground mb-2 mt-1 border-t pt-3 flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />Endereço do Local de Execução
              </p>
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Logradouro (Rua / Av.)</Label>
              <Input placeholder="Ex: Rua das Flores" value={form.enderecoLogradouro} onChange={e => setForm(p => ({ ...p, enderecoLogradouro: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Número</Label>
              <Input placeholder="123" value={form.enderecoNumero} onChange={e => setForm(p => ({ ...p, enderecoNumero: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Complemento</Label>
              <Input placeholder="Apto, Sala, Bloco..." value={form.enderecoComplemento} onChange={e => setForm(p => ({ ...p, enderecoComplemento: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Bairro</Label>
              <Input value={form.enderecoBairro} onChange={e => setForm(p => ({ ...p, enderecoBairro: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>CEP</Label>
              <Input placeholder="00000-000" value={form.enderecoCep} onChange={e => setForm(p => ({ ...p, enderecoCep: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Cidade</Label>
              <Input value={form.enderecoCidade} onChange={e => setForm(p => ({ ...p, enderecoCidade: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Estado (UF)</Label>
              <Input maxLength={2} placeholder="SP" value={form.enderecoEstado} onChange={e => setForm(p => ({ ...p, enderecoEstado: e.target.value.toUpperCase() }))} />
            </div>
          </div>
          {/* Geração Automática de Recebimentos */}
          {!editId && (
            <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-green-800 dark:text-green-300">Gerar Recebimentos Automaticamente</p>
                  <p className="text-xs text-green-600 dark:text-green-400">Cria parcelas de recebimento vinculadas a este contrato</p>
                </div>
                <button
                  type="button"
                  onClick={() => setGerarRec(v => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    gerarRec ? "bg-green-600" : "bg-gray-300 dark:bg-gray-600"
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    gerarRec ? "translate-x-6" : "translate-x-1"
                  }`} />
                </button>
              </div>
              {gerarRec && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <Label className="text-xs">Número de Parcelas</Label>
                    <Input
                      type="number" min={1} max={60}
                      value={numParcelas}
                      onChange={e => setNumParcelas(parseInt(e.target.value) || 1)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Forma de Recebimento</Label>
                    <select
                      value={tipoRecGerado}
                      onChange={e => setTipoRecGerado(e.target.value as any)}
                      className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                    >
                      {["Pix", "Boleto", "Transferência", "Cartão de Crédito", "Cartão de Débito", "Dinheiro", "Outro"].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Data do 1º Vencimento <span className="text-muted-foreground">(deixe em branco para usar a data de início do contrato)</span></Label>
                    <Input
                      type="date"
                      value={dataPrimeiroVenc}
                      onChange={e => setDataPrimeiroVenc(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  {form.valorTotal && (
                    <div className="col-span-2 text-xs text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 rounded p-2">
                      Serão gerados <strong>{numParcelas} recebimento(s)</strong> de{" "}
                      <strong>R$ {(parseFloat(String(form.valorTotal).replace(",",".")) / numParcelas).toFixed(2)}</strong> cada,
                      com vencimentos mensais a partir da data informada.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {/* Regenerar Recebimentos (apenas em edição) */}
          {editId && (
            <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 space-y-3">
              <div>
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Recebimentos do Contrato</p>
                <p className="text-xs text-muted-foreground">Regenerar apaga os recebimentos existentes e cria novos com os parâmetros abaixo.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Número de Parcelas</Label>
                  <Input type="number" min={1} max={60} value={numParcelas} onChange={e => setNumParcelas(parseInt(e.target.value) || 1)} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Forma de Recebimento</Label>
                  <select value={tipoRecGerado} onChange={e => setTipoRecGerado(e.target.value as any)} className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm">
                    {["Pix", "Boleto", "Transferência", "Cartão de Crédito", "Cartão de Débito", "Dinheiro", "Outro"].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Data do 1º Vencimento</Label>
                  <Input type="date" value={dataPrimeiroVenc} onChange={e => setDataPrimeiroVenc(e.target.value)} className="h-8 text-sm" />
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-blue-700 border-blue-300 hover:bg-blue-100"
                disabled={!dataPrimeiroVenc || regenerarMutation.isPending}
                onClick={() => {
                  if (!editId) return;
                  if (!window.confirm(`Isso apagará os recebimentos existentes deste contrato e criará ${numParcelas} novo(s). Confirmar?`)) return;
                  regenerarMutation.mutate({
                    contratoId: editId,
                    numeroParcelas: numParcelas,
                    tipoRecebimento: tipoRecGerado,
                    dataPrimeiroVencimento: dataPrimeiroVenc,
                  });
                }}
              >
                {regenerarMutation.isPending ? "Gerando..." : "Regenerar Recebimentos"}
              </Button>
            </div>
          )}
          {/* Anexos do Contrato */}
          {editId && (
            <div className="space-y-2 px-1">
              <p className="text-sm font-medium flex items-center gap-2">
                <span>Anexos</span>
                <span className="text-xs text-muted-foreground font-normal">(contratos assinados, propostas, documentos)</span>
              </p>
              <AnexosPanel modulo="contrato" registroId={editId} podeAnexar podeExcluir />
            </div>
          )}
          <div className="flex justify-end gap-2 pt-4 border-t mt-4 pb-6">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editId ? "Salvar Alterações" : "Criar Contrato"}
            </Button>
          </div>
          </div>
        </SheetContent>
      </Sheet>
      {/* Modal de Impressão de Contratos */}
      {impressaoContratos && (
        <EngenhariaImpressao
          open={impressaoContratos !== null}
          onClose={() => setImpressaoContratos(null)}
          tipo="contrato"
          dados={impressaoContratos}
        />
      )}
      <ConfirmDeleteDialog
        open={!!deleteContratoId}
        onOpenChange={(o) => { if (!o) setDeleteContratoId(null); }}
        title="Excluir Contrato"
        description="Esta ação não pode ser desfeita. O contrato e todos os dados vinculados serão removidos permanentemente."
        requireMasterPassword
        loading={deleteMutation.isPending}
        onConfirm={() => { if (deleteContratoId) deleteMutation.mutate({ id: deleteContratoId }); }}
      />
    </div>
  );
}

// === Ordens de Serviço ===
function OrdensServicoTab() {
  const { can } = usePermissions();
  const podeCriar = can.criar("engenharia_os");
  const podeEditar = can.editar("engenharia_os");
  const podeExcluir = can.excluir("engenharia_os");
  const utils = trpc.useUtils();
  const [, navigate] = useLocation();
  const { data: ordens = [], isLoading } = trpc.ordensServico.list.useQuery();
  const { data: clientes = [] } = trpc.clientes.list.useQuery();
  const { data: contratos = [] } = trpc.contratos.list.useQuery();
  const { data: tiposServico = [] } = trpc.tiposServico.list.useQuery();
  const { data: materiais = [] } = trpc.materiais.list.useQuery();
  const { data: centrosCustoList = [] } = trpc.centrosCusto.list.useQuery();
  const { data: listaProjetos = [] } = trpc.projetos.list.useQuery();
  const { data: nextNumero } = trpc.ordensServico.nextNumero.useQuery();

  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroContrato, setFiltroContrato] = useState("");
  const [filtroClienteOS, setFiltroClienteOS] = useState("");
  const [filtroCC, setFiltroCC] = useState("todos");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [form, setForm] = useState({
    numero: "", titulo: "", descricao: "", status: "planejada" as const,
    prioridade: "normal" as const, responsavel: "", dataAbertura: "",
    dataPrevisao: "", valorEstimado: "", observacoes: "",
    contratoId: "" as string | number, clienteId: "" as string | number,
    centroCustoId: null as number | null,
    projetoId: null as number | null,
    enderecoLogradouro: "", enderecoNumero: "", enderecoComplemento: "",
    enderecoBairro: "", enderecoCidade: "", enderecoEstado: "", enderecoCep: "",
    // Novos campos OS avançada
    tipoServico: "", categoriaServico: "",
    localExecucao: "",
    responsavelUsuarioId: null as number | null,
    equipeIds: [] as number[],
    dataAgendamento: "", dataInicioPrevista: "", dataFimPrevista: "",
    checklistJson: "[]", evidenciasUrls: "[]",
  });
  const [itens, setItens] = useState<Array<{
    tipo: "servico" | "material"; tipoServicoId?: number; materialId?: number;
    descricao: string; quantidade: number; valorUnitario: number; valorTotal: number;
  }>>([]);

  const createMutation = trpc.ordensServico.create.useMutation({
    onSuccess: () => { utils.ordensServico.list.invalidate(); setShowForm(false); toast.success("OS criada!"); }
  });
  const updateMutation = trpc.ordensServico.update.useMutation({
    onSuccess: () => { utils.ordensServico.list.invalidate(); setShowForm(false); setEditId(null); toast.success("OS atualizada!"); }
  });
  const deleteMutation = trpc.ordensServico.delete.useMutation({
    onSuccess: () => { utils.ordensServico.list.invalidate(); toast.success("OS removida."); }
  });
  const mudarStatusMutation = trpc.ordensServico.mudarStatus.useMutation({
    onSuccess: () => { utils.ordensServico.list.invalidate(); toast.success("Status atualizado!"); },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });

  const [impressaoOS, setImpressaoOS] = useState<OSParaImpressao[] | null>(null);

  // Estado do modal de gerar lançamento
  const [showGerarLancamento, setShowGerarLancamento] = useState(false);
  const [osParaLancamento, setOsParaLancamento] = useState<typeof ordens[0] | null>(null);
  const [lancamentoForm, setLancamentoForm] = useState({
    tipo: "recebimento" as "pagamento" | "recebimento",
    valor: "",
    descricao: "",
    dataVencimento: new Date().toISOString().split("T")[0],
  });

  const gerarLancamentoMutation = trpc.ordensServico.gerarLancamento.useMutation({
    onSuccess: (result) => {
      setShowGerarLancamento(false);
      toast.success(`${result.tipo === "pagamento" ? "Pagamento" : "Recebimento"} ${result.numeroControle} criado com sucesso!`);
      if (result.tipo === "pagamento") navigate("/pagamentos");
      else navigate("/recebimentos");
    },
    onError: (err) => toast.error(err.message),
  });

  function openGerarLancamento(os: typeof ordens[0]) {
    setOsParaLancamento(os);
    setLancamentoForm({
      tipo: "recebimento",
      valor: os.valorEstimado ?? "",
      descricao: `OS ${os.numero} — ${os.titulo}`,
      dataVencimento: new Date().toISOString().split("T")[0],
    });
    setShowGerarLancamento(true);
  }

  const filtered = useMemo(() => {
    return ordens.filter(o => {
      const matchBusca = !busca || o.numero.toLowerCase().includes(busca.toLowerCase()) ||
        o.titulo.toLowerCase().includes(busca.toLowerCase()) ||
        (o.clienteNome ?? "").toLowerCase().includes(busca.toLowerCase());
      const matchStatus = filtroStatus === "todos" || o.status === filtroStatus;
      const matchContrato = !filtroContrato || (o.contratoNumero ?? "").toLowerCase().includes(filtroContrato.toLowerCase());
      const matchCliente = !filtroClienteOS || (o.clienteNome ?? "").toLowerCase().includes(filtroClienteOS.toLowerCase());
      const matchCC = filtroCC === "todos" || String((o as any).centroCustoId ?? "") === filtroCC;
      return matchBusca && matchStatus && matchContrato && matchCliente && matchCC;
    });
  }, [ordens, busca, filtroStatus, filtroContrato, filtroClienteOS, filtroCC]);

  // Atualiza o número da OS automaticamente quando nextNumero chegar do servidor
  useEffect(() => {
    if (!editId && showForm && nextNumero) {
      setForm(prev => ({
        ...prev,
        numero: prev.numero || nextNumero,
      }));
    }
  }, [nextNumero, showForm, editId]);

  function openNew() {
    setEditId(null);
    setItens([]);
    setForm({ numero: nextNumero ?? "", titulo: "", descricao: "", status: "planejada", prioridade: "normal", responsavel: "", dataAbertura: new Date().toISOString().split("T")[0], dataPrevisao: "", valorEstimado: "", observacoes: "", contratoId: "", clienteId: "", centroCustoId: null, projetoId: null, enderecoLogradouro: "", enderecoNumero: "", enderecoComplemento: "", enderecoBairro: "", enderecoCidade: "", enderecoEstado: "", enderecoCep: "", tipoServico: "", categoriaServico: "", localExecucao: "", responsavelUsuarioId: null, equipeIds: [], dataAgendamento: "", dataInicioPrevista: "", dataFimPrevista: "", checklistJson: "[]", evidenciasUrls: "[]" });
    setShowForm(true);
  }

  function openEdit(o: typeof ordens[0]) {
    setEditId(o.id);
    setItens([]);
    setForm({
      numero: o.numero, titulo: o.titulo, descricao: o.descricao ?? "",
      status: o.status as any, prioridade: (o.prioridade as any) === "media" || (o.prioridade as any) === "urgente" ? "normal" : (o.prioridade as any) ?? "normal",
      responsavel: o.responsavel ?? "", observacoes: o.observacoes ?? "",
      dataAbertura: o.dataAbertura ? new Date(o.dataAbertura).toISOString().split("T")[0] : "",
      dataPrevisao: o.dataPrevisao ? new Date(o.dataPrevisao).toISOString().split("T")[0] : "",
      valorEstimado: o.valorEstimado ?? "",
      contratoId: o.contratoId ?? "", clienteId: o.clienteId ?? "",
      centroCustoId: (o as any).centroCustoId ?? null,
      projetoId: (o as any).projetoId ?? null,
      enderecoLogradouro: o.enderecoLogradouro ?? "", enderecoNumero: o.enderecoNumero ?? "",
      enderecoComplemento: o.enderecoComplemento ?? "", enderecoBairro: o.enderecoBairro ?? "",
      enderecoCidade: o.enderecoCidade ?? "", enderecoEstado: o.enderecoEstado ?? "", enderecoCep: o.enderecoCep ?? "",
      tipoServico: (o as any).tipoServico ?? "", categoriaServico: (o as any).categoriaServico ?? "",
      localExecucao: (o as any).localExecucao ?? "",
      responsavelUsuarioId: (o as any).responsavelUsuarioId ?? null,
      equipeIds: (o as any).equipeIds ? JSON.parse((o as any).equipeIds) : [],
      dataAgendamento: (o as any).dataAgendamento ? new Date((o as any).dataAgendamento).toISOString().split("T")[0] : "",
      dataInicioPrevista: (o as any).dataInicioPrevista ? new Date((o as any).dataInicioPrevista).toISOString().split("T")[0] : "",
      dataFimPrevista: (o as any).dataFimPrevista ? new Date((o as any).dataFimPrevista).toISOString().split("T")[0] : "",
      checklistJson: (o as any).checklistJson ?? "[]",
      evidenciasUrls: (o as any).evidenciasUrls ?? "[]",
    });
    setShowForm(true);
  }

  function addItem() {
    setItens(p => [...p, { tipo: "servico", descricao: "", quantidade: 1, valorUnitario: 0, valorTotal: 0 }]);
  }

  function updateItem(idx: number, field: string, value: any) {
    setItens(p => p.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      if (field === "quantidade" || field === "valorUnitario") {
        updated.valorTotal = (updated.quantidade || 0) * (updated.valorUnitario || 0);
      }
      return updated;
    }));
  }

  function handleSubmit() {
    if (!form.projetoId) {
      toast.error("Uma OS deve estar vinculada a um Projeto.");
      return;
    }
    const payload = {
      numero: form.numero, titulo: form.titulo, descricao: form.descricao || undefined,
      status: form.status, prioridade: form.prioridade,
      tipoServico: form.tipoServico || undefined,
      categoriaServico: form.categoriaServico || undefined,
      responsavel: form.responsavel || undefined,
      responsavelUsuarioId: form.responsavelUsuarioId ?? undefined,
      equipeIds: form.equipeIds.length > 0 ? form.equipeIds : undefined,
      localExecucao: form.localExecucao || undefined,
      dataAgendamento: form.dataAgendamento || undefined,
      dataInicioPrevista: form.dataInicioPrevista || undefined,
      dataFimPrevista: form.dataFimPrevista || undefined,
      dataAbertura: form.dataAbertura || undefined,
      dataPrevisao: form.dataPrevisao || undefined,
      valorEstimado: form.valorEstimado ? parseFloat(form.valorEstimado) : undefined,
      observacoes: form.observacoes || undefined,
      checklistJson: form.checklistJson !== "[]" ? form.checklistJson : undefined,
      evidenciasUrls: form.evidenciasUrls !== "[]" ? form.evidenciasUrls : undefined,
      contratoId: form.contratoId ? Number(form.contratoId) : undefined,
      clienteId: form.clienteId ? Number(form.clienteId) : undefined,
      centroCustoId: form.centroCustoId ?? undefined,
      projetoId: form.projetoId,
      enderecoLogradouro: form.enderecoLogradouro || undefined,
      enderecoNumero: form.enderecoNumero || undefined,
      enderecoComplemento: form.enderecoComplemento || undefined,
      enderecoBairro: form.enderecoBairro || undefined,
      enderecoCidade: form.enderecoCidade || undefined,
      enderecoEstado: form.enderecoEstado || undefined,
      enderecoCep: form.enderecoCep || undefined,
    };
    if (editId) updateMutation.mutate({ id: editId, ...payload });
    else createMutation.mutate({ ...payload, itens: itens.length > 0 ? itens : undefined });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar OS..." className="pl-9" value={busca} onChange={e => setBusca(e.target.value)} />
          </div>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Status</SelectItem>
              {Object.entries(STATUS_OS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Nº do Contrato..." className="pl-9 w-40" value={filtroContrato} onChange={e => setFiltroContrato(e.target.value)} />
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Filtrar cliente..." className="pl-9 w-40" value={filtroClienteOS} onChange={e => setFiltroClienteOS(e.target.value)} />
          </div>
          <Select value={filtroCC} onValueChange={setFiltroCC}>
            <SelectTrigger className="w-[170px]"><SelectValue placeholder="Centro de Custo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os CC</SelectItem>
              {centrosCustoList.map(cc => (
                <SelectItem key={cc.id} value={String(cc.id)}>{cc.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {filtroCC !== "todos" && (
            <Button variant="ghost" size="sm" onClick={() => setFiltroCC("todos")} className="text-muted-foreground">Limpar CC</Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImpressaoOS(filtered)} className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-50">
            <Printer className="h-4 w-4" /> Imprimir Lista ({filtered.length})
          </Button>
          {podeCriar && <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Nova OS</Button>}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Nenhuma OS encontrada.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(o => {
            const st = STATUS_OS[o.status ?? "planejada"] ?? STATUS_OS.planejada;
            const pr = PRIORIDADE[o.prioridade ?? "media"];
            const expanded = expandedId === o.id;
            return (
              <Card key={o.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-semibold text-primary">{o.numero}</span>
                        <Badge className={`text-xs ${st.color}`}>{st.label}</Badge>
                        <Badge className={`text-xs ${pr.color}`}>{pr.label}</Badge>
                        {o.contratoNumero && (
                          <Badge variant="outline" className="text-xs flex items-center gap-1">
                            <Link2 className="h-3 w-3" />{o.contratoNumero}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 font-medium">{o.titulo}</p>
                      {o.clienteNome && <p className="text-sm text-muted-foreground">{o.clienteNome}</p>}
                      <div className="flex gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                        {o.responsavel && <span>Resp.: {o.responsavel}</span>}
                        {o.dataPrevisao && <span>Previsão: {new Date(o.dataPrevisao).toLocaleDateString("pt-BR")}</span>}
                        {o.valorEstimado && <span>Estimado: <strong className="text-foreground">{fmt(o.valorEstimado)}</strong></span>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {podeEditar && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline" className="h-8 px-2 text-xs gap-1">
                              Status <ChevronDown className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuLabel className="text-xs">Mudar Status</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {Object.entries(STATUS_OS).map(([k, v]) => (
                              <DropdownMenuItem key={k} disabled={o.status === k}
                                onClick={() => mudarStatusMutation.mutate({ id: o.id, status: k as any })}
                                className={`text-xs ${o.status === k ? "font-bold" : ""}`}
                              >
                                <span className={`w-2 h-2 rounded-full mr-2 inline-block ${v.color.split(" ")[0]}`} />
                                {v.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                      <Button size="icon" variant="ghost" title="Imprimir OS" onClick={() => setImpressaoOS([o])}>
                        <Printer className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button size="icon" variant="ghost" title="Gerar Lançamento Financeiro" onClick={() => openGerarLancamento(o)}>
                        <DollarSign className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setExpandedId(expanded ? null : o.id)}>
                        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                      {podeEditar && <Button size="icon" variant="ghost" onClick={() => openEdit(o)}><Edit2 className="h-4 w-4" /></Button>}
                      {podeExcluir && <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Excluir OS?")) deleteMutation.mutate({ id: o.id }); }}><Trash2 className="h-4 w-4" /></Button>}
                    </div>
                  </div>
                  {expanded && o.descricao && (
                    <div className="mt-3 pt-3 border-t text-sm text-muted-foreground">
                      {o.descricao}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Gerar Lançamento */}
      <Dialog open={showGerarLancamento} onOpenChange={v => { setShowGerarLancamento(v); if (!v) setOsParaLancamento(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Gerar Lançamento Financeiro
            </DialogTitle>
          </DialogHeader>
          {osParaLancamento && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="font-semibold">{osParaLancamento.numero} — {osParaLancamento.titulo}</p>
                {osParaLancamento.clienteNome && <p className="text-muted-foreground">{osParaLancamento.clienteNome}</p>}
                {osParaLancamento.contratoNumero && <p className="text-muted-foreground">Contrato: {osParaLancamento.contratoNumero}</p>}
              </div>
              <div className="space-y-1">
                <Label>Tipo de Lançamento *</Label>
                <Select value={lancamentoForm.tipo} onValueChange={v => setLancamentoForm(p => ({ ...p, tipo: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recebimento">Recebimento (a receber do cliente)</SelectItem>
                    <SelectItem value="pagamento">Pagamento (a pagar ao fornecedor)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Valor (R$) *</Label>
                <Input
                  type="number" min="0" step="0.01"
                  value={lancamentoForm.valor}
                  onChange={e => setLancamentoForm(p => ({ ...p, valor: e.target.value }))}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-1">
                <Label>Data de Vencimento *</Label>
                <Input
                  type="date"
                  value={lancamentoForm.dataVencimento}
                  onChange={e => setLancamentoForm(p => ({ ...p, dataVencimento: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Descrição</Label>
                <Input
                  value={lancamentoForm.descricao}
                  onChange={e => setLancamentoForm(p => ({ ...p, descricao: e.target.value }))}
                  placeholder="Descrição do lançamento..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGerarLancamento(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (!osParaLancamento || !lancamentoForm.valor) return;
                gerarLancamentoMutation.mutate({
                  osId: osParaLancamento.id,
                  tipo: lancamentoForm.tipo,
                  valor: parseFloat(lancamentoForm.valor),
                  descricao: lancamentoForm.descricao || undefined,
                  dataVencimento: lancamentoForm.dataVencimento || undefined,
                });
              }}
              disabled={gerarLancamentoMutation.isPending || !lancamentoForm.valor}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {gerarLancamentoMutation.isPending ? "Criando..." : "Criar Lançamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={showForm} onOpenChange={v => { setShowForm(v); if (!v) { setEditId(null); setItens([]); } }}>
        <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto p-0">
          <SheetHeader className="px-6 py-4 border-b bg-muted/30 sticky top-0 z-10">
            <SheetTitle>{editId ? "Editar OS" : "Nova Ordem de Serviço"}</SheetTitle>
          </SheetHeader>
          <div className="px-6 py-4">
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1">
              <Label>Nº da OS *</Label>
              <Input value={form.numero} onChange={e => setForm(p => ({ ...p, numero: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Prioridade</Label>
              <Select value={form.prioridade} onValueChange={v => setForm(p => ({ ...p, prioridade: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORIDADE).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Título *</Label>
              <Input value={form.titulo} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_OS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Tipo de Serviço</Label>
              <Input placeholder="Ex: Instalação Elétrica" value={form.tipoServico} onChange={e => setForm(p => ({ ...p, tipoServico: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Categoria do Serviço</Label>
              <Input placeholder="Ex: Manutenção Preventiva" value={form.categoriaServico} onChange={e => setForm(p => ({ ...p, categoriaServico: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Responsável (nome)</Label>
              <Input value={form.responsavel} onChange={e => setForm(p => ({ ...p, responsavel: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Contrato Vinculado</Label>
              <Select value={form.contratoId ? String(form.contratoId) : "none"} onValueChange={v => {
                const contratoSelecionado = contratos.find(c => String(c.id) === v);
                setForm(p => ({
                  ...p,
                  contratoId: v === "none" ? "" : v,
                  // Herda cliente do contrato automaticamente
                  clienteId: contratoSelecionado?.clienteId ? String(contratoSelecionado.clienteId) : p.clienteId,
                  // Herda CC do contrato automaticamente
                  centroCustoId: contratoSelecionado ? ((contratoSelecionado as any).centroCustoId ?? p.centroCustoId) : p.centroCustoId,
                  // Herda projeto do contrato automaticamente se tiver
                  projetoId: contratoSelecionado ? ((contratoSelecionado as any).projetoId ?? p.projetoId) : p.projetoId,
                }));
              }}>
                <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Nenhum —</SelectItem>
                  {contratos.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.numero} — {c.objeto?.substring(0, 50)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Projeto Vinculado</Label>
              <Select
                value={form.projetoId ? String(form.projetoId) : "none"}
                onValueChange={v => setForm(p => ({ ...p, projetoId: v === "none" ? null : Number(v) }))}
              >
                <SelectTrigger><SelectValue placeholder="Selecionar projeto (opcional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Nenhum —</SelectItem>
                  {listaProjetos.map((proj: any) => (
                    <SelectItem key={proj.id} value={String(proj.id)}>
                      {proj.numero ? `${proj.numero} — ` : ""}{proj.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Cliente</Label>
              <Select value={form.clienteId ? String(form.clienteId) : "none"} onValueChange={v => setForm(p => ({ ...p, clienteId: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Nenhum —</SelectItem>
                  {clientes.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Centro de Custo <span className="text-xs text-muted-foreground">(herdado do contrato)</span></Label>
              <Select
                value={form.centroCustoId ? String(form.centroCustoId) : "none"}
                onValueChange={v => setForm(p => ({ ...p, centroCustoId: v === "none" ? null : Number(v) }))}
              >
                <SelectTrigger><SelectValue placeholder="Selecionar CC..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Nenhum —</SelectItem>
                  {centrosCustoList.filter((cc: any) => cc.ativo).map((cc: any) => (
                    <SelectItem key={cc.id} value={String(cc.id)}>{cc.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Data de Abertura</Label>
              <Input type="date" value={form.dataAbertura} onChange={e => setForm(p => ({ ...p, dataAbertura: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Previsão de Conclusão</Label>
              <Input type="date" value={form.dataPrevisao} onChange={e => setForm(p => ({ ...p, dataPrevisao: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Valor Estimado (R$)</Label>
              <Input type="number" min="0" step="0.01" value={form.valorEstimado} onChange={e => setForm(p => ({ ...p, valorEstimado: e.target.value }))} />
            </div>

            {/* Datas operacionais */}
            <div className="col-span-2">
              <p className="text-sm font-semibold text-muted-foreground mb-2 mt-1 border-t pt-3">Datas Operacionais</p>
            </div>
            <div className="space-y-1">
              <Label>Data de Agendamento</Label>
              <Input type="date" value={form.dataAgendamento} onChange={e => setForm(p => ({ ...p, dataAgendamento: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Início Previsto</Label>
              <Input type="date" value={form.dataInicioPrevista} onChange={e => setForm(p => ({ ...p, dataInicioPrevista: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Fim Previsto</Label>
              <Input type="date" value={form.dataFimPrevista} onChange={e => setForm(p => ({ ...p, dataFimPrevista: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Previsão de Conclusão (legado)</Label>
              <Input type="date" value={form.dataPrevisao} onChange={e => setForm(p => ({ ...p, dataPrevisao: e.target.value }))} />
            </div>

            {/* Local de execução */}
            <div className="col-span-2 space-y-1">
              <Label>Local de Execução</Label>
              <Input placeholder="Ex: Setor Industrial Norte, Galpão 3" value={form.localExecucao} onChange={e => setForm(p => ({ ...p, localExecucao: e.target.value }))} />
            </div>

            <div className="col-span-2 space-y-1">
              <Label>Descrição do Serviço</Label>
              <Textarea rows={3} value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Observações</Label>
              <Textarea rows={2} value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} />
            </div>

            {/* Checklist Operacional */}
            <div className="col-span-2">
              <p className="text-sm font-semibold text-muted-foreground mb-2 mt-1 border-t pt-3 flex items-center gap-1.5">
                <CheckSquare className="h-4 w-4" />Checklist Operacional
              </p>
              {(() => {
                let checklist: Array<{descricao: string; obrigatorio: boolean; status: string}> = [];
                try { checklist = JSON.parse(form.checklistJson || "[]"); } catch {}
                return (
                  <div className="space-y-2">
                    {checklist.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 border rounded-lg bg-muted/20">
                        <input
                          type="checkbox"
                          checked={item.status === "CONCLUIDO"}
                          onChange={e => {
                            const updated = [...checklist];
                            updated[idx] = { ...updated[idx], status: e.target.checked ? "CONCLUIDO" : "PENDENTE" };
                            setForm(p => ({ ...p, checklistJson: JSON.stringify(updated) }));
                          }}
                          className="h-4 w-4"
                        />
                        <span className={`flex-1 text-sm ${item.status === "CONCLUIDO" ? "line-through text-muted-foreground" : ""}`}>{item.descricao}</span>
                        {item.obrigatorio && <span className="text-xs text-red-500 font-medium">Obrigatório</span>}
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => {
                          const updated = checklist.filter((_, i) => i !== idx);
                          setForm(p => ({ ...p, checklistJson: JSON.stringify(updated) }));
                        }}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    ))}
                    <Button size="sm" variant="outline" onClick={() => {
                      const updated = [...checklist, { descricao: "", obrigatorio: false, status: "PENDENTE" }];
                      setForm(p => ({ ...p, checklistJson: JSON.stringify(updated) }));
                    }}><Plus className="h-3 w-3 mr-1" />Adicionar Item</Button>
                  </div>
                );
              })()}
            </div>

            {/* Endereço do Local de Execução */}
            <div className="col-span-2">
              <p className="text-sm font-semibold text-muted-foreground mb-2 mt-1 border-t pt-3 flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />Endereço do Local de Execução
              </p>
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Logradouro (Rua / Av.)</Label>
              <Input placeholder="Ex: Rua das Flores" value={form.enderecoLogradouro} onChange={e => setForm(p => ({ ...p, enderecoLogradouro: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Número</Label>
              <Input placeholder="123" value={form.enderecoNumero} onChange={e => setForm(p => ({ ...p, enderecoNumero: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Complemento</Label>
              <Input placeholder="Apto, Sala, Bloco..." value={form.enderecoComplemento} onChange={e => setForm(p => ({ ...p, enderecoComplemento: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Bairro</Label>
              <Input value={form.enderecoBairro} onChange={e => setForm(p => ({ ...p, enderecoBairro: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>CEP</Label>
              <Input placeholder="00000-000" value={form.enderecoCep} onChange={e => setForm(p => ({ ...p, enderecoCep: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Cidade</Label>
              <Input value={form.enderecoCidade} onChange={e => setForm(p => ({ ...p, enderecoCidade: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Estado (UF)</Label>
              <Input maxLength={2} placeholder="SP" value={form.enderecoEstado} onChange={e => setForm(p => ({ ...p, enderecoEstado: e.target.value.toUpperCase() }))} />
            </div>

            {!editId && (
              <div className="col-span-2 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Itens da OS</Label>
                  <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-3 w-3 mr-1" />Adicionar Item</Button>
                </div>
                {itens.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end p-3 border rounded-lg bg-muted/30">
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Tipo</Label>
                      <Select value={item.tipo} onValueChange={v => updateItem(idx, "tipo", v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="servico">Serviço</SelectItem>
                          <SelectItem value="material">Material</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3 space-y-1">
                      <Label className="text-xs">{item.tipo === "servico" ? "Tipo de Serviço" : "Material"}</Label>
                      <Select
                        value={item.tipo === "servico" ? String(item.tipoServicoId ?? "") : String(item.materialId ?? "")}
                        onValueChange={v => {
                          if (item.tipo === "servico") {
                            const ts = tiposServico.find(t => t.id === Number(v));
                            updateItem(idx, "tipoServicoId", Number(v));
                            if (ts?.valorUnitario) updateItem(idx, "valorUnitario", parseFloat(ts.valorUnitario));
                          } else {
                            const m = materiais.find(m => m.id === Number(v));
                            updateItem(idx, "materialId", Number(v));
                            // Usa precoVenda como valor padrão; fallback para valorUnitario se não houver
                            const valorPadrao = m?.precoVenda ?? m?.valorUnitario;
                            if (valorPadrao) updateItem(idx, "valorUnitario", parseFloat(String(valorPadrao)));
                          }
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                        <SelectContent>
                          {(item.tipo === "servico" ? tiposServico : materiais).map(t => (
                            <SelectItem key={t.id} value={String(t.id)}>{t.codigo} — {t.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3 space-y-1">
                      <Label className="text-xs">Descrição</Label>
                      <Input className="h-8 text-xs" value={item.descricao} onChange={e => updateItem(idx, "descricao", e.target.value)} />
                    </div>
                    <div className="col-span-1 space-y-1">
                      <Label className="text-xs">Qtd</Label>
                      <Input className="h-8 text-xs" type="number" min="1" value={item.quantidade} onChange={e => updateItem(idx, "quantidade", Number(e.target.value))} />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Vl. Unit.</Label>
                      <Input className="h-8 text-xs" type="number" min="0" step="0.01" value={item.valorUnitario} onChange={e => updateItem(idx, "valorUnitario", Number(e.target.value))} />
                    </div>
                    <div className="col-span-1 flex items-end">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setItens(p => p.filter((_, i) => i !== idx))}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                {itens.length > 0 && (
                  <div className="text-right text-sm font-semibold">
                    Total: {fmt(itens.reduce((s, i) => s + i.valorTotal, 0))}
                  </div>
                )}
              </div>
            )}
          </div>
          {/* Anexos da OS */}
          {editId && (
            <div className="space-y-2 px-1">
              <p className="text-sm font-medium flex items-center gap-2">
                <span>Anexos</span>
                <span className="text-xs text-muted-foreground font-normal">(fotos, laudos, relatórios de execução)</span>
              </p>
              <AnexosPanel modulo="os" registroId={editId} podeAnexar podeExcluir />
            </div>
          )}
           <div className="flex justify-end gap-2 pt-4 border-t mt-4 pb-6">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editId ? "Salvar Alterações" : "Criar OS"}
            </Button>
          </div>
          </div>
        </SheetContent>
      </Sheet>
      {/* Modal de Impressão de OS */}
      {impressaoOS && (
        <EngenhariaImpressao
          open={impressaoOS !== null}
          onClose={() => setImpressaoOS(null)}
          tipo="os"
          dados={impressaoOS}
        />
      )}
    </div>
  );
}

// === Agenda Operacional ===
function AgendaOperacionalTab() {
  const { data: ordens = [], isLoading } = trpc.ordensServico.list.useQuery();
  const { data: listaProjetos = [] } = trpc.projetos.list.useQuery();

  // Filtrar OS pendentes (não concluídas e não canceladas)
  const osPendentes = useMemo(() => {
    return ordens
      .filter(o => o.status !== "concluida" && o.status !== "cancelada")
      .map(o => ({
        ...o,
        dataRef: (o as any).dataAgendamento || (o as any).dataInicioPrevista || o.dataPrevisao || o.dataAbertura,
        projetoNome: listaProjetos.find((p: any) => p.id === (o as any).projetoId)?.nome ?? null,
      }))
      .sort((a, b) => {
        if (!a.dataRef) return 1;
        if (!b.dataRef) return -1;
        return new Date(a.dataRef).getTime() - new Date(b.dataRef).getTime();
      });
  }, [ordens, listaProjetos]);

  // Agrupar por data
  const grupos = useMemo(() => {
    const map = new Map<string, typeof osPendentes>();
    for (const os of osPendentes) {
      const key = os.dataRef
        ? new Date(os.dataRef).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })
        : "Sem data agendada";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(os);
    }
    return Array.from(map.entries());
  }, [osPendentes]);

  const hoje = new Date().toDateString();

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Carregando agenda...</div>;

  if (osPendentes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
        <Calendar className="h-12 w-12 opacity-30" />
        <p className="text-lg font-medium">Nenhuma OS pendente na agenda</p>
        <p className="text-sm">Todas as ordens de serviço estão concluídas ou canceladas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Agenda Operacional</h3>
          <p className="text-sm text-muted-foreground">{osPendentes.length} OS pendente{osPendentes.length !== 1 ? "s" : ""} — ordenadas por data de agendamento</p>
        </div>
      </div>

      {grupos.map(([dataLabel, items]) => {
        const isSemData = dataLabel === "Sem data agendada";
        const dataObj = items[0]?.dataRef ? new Date(items[0].dataRef) : null;
        const isHoje = dataObj ? dataObj.toDateString() === hoje : false;
        const isAtrasado = dataObj ? dataObj < new Date() && !isHoje : false;

        return (
          <div key={dataLabel} className="space-y-3">
            <div className={`flex items-center gap-3 pb-2 border-b ${
              isHoje ? "border-blue-500" : isAtrasado ? "border-red-400" : "border-border"
            }`}>
              <Calendar className={`h-4 w-4 ${
                isHoje ? "text-blue-500" : isAtrasado ? "text-red-500" : "text-muted-foreground"
              }`} />
              <span className={`font-semibold capitalize ${
                isHoje ? "text-blue-600" : isAtrasado ? "text-red-600" : ""
              }`}>
                {isHoje ? "★ HOJE — " : ""}{dataLabel}
              </span>
              {isAtrasado && !isSemData && (
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Atrasado</span>
              )}
              <span className="text-xs text-muted-foreground ml-auto">{items.length} OS</span>
            </div>

            <div className="grid gap-3">
              {items.map(os => {
                const statusInfo = STATUS_OS[os.status] ?? { label: os.status, color: "bg-gray-100 text-gray-700" };
                const prioInfo = PRIORIDADE[os.prioridade ?? "normal"] ?? { label: os.prioridade, color: "bg-gray-100 text-gray-700" };
                let checklist: Array<{descricao: string; obrigatorio: boolean; status: string}> = [];
                try { checklist = JSON.parse((os as any).checklistJson || "[]"); } catch {}
                const totalItens = checklist.length;
                const concluidos = checklist.filter(c => c.status === "CONCLUIDO").length;

                return (
                  <div key={os.id} className={`p-4 rounded-lg border ${
                    os.prioridade === "critica" ? "border-red-300 bg-red-50/30" :
                    os.prioridade === "alta" ? "border-orange-300 bg-orange-50/20" :
                    "border-border bg-card"
                  }`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs text-muted-foreground">{os.numero}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${prioInfo.color}`}>{prioInfo.label}</span>
                        </div>
                        <p className="font-semibold mt-1 truncate">{os.titulo}</p>
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                          {os.clienteNome && <span>👤 {os.clienteNome}</span>}
                          {os.projetoNome && <span>📁 {os.projetoNome}</span>}
                          {(os as any).localExecucao && <span>📍 {(os as any).localExecucao}</span>}
                          {os.responsavel && <span>🛠️ {os.responsavel}</span>}
                        </div>
                        {totalItens > 0 && (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 bg-muted rounded-full h-1.5 max-w-32">
                              <div
                                className="bg-green-500 h-1.5 rounded-full transition-all"
                                style={{ width: `${totalItens > 0 ? (concluidos / totalItens) * 100 : 0}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">{concluidos}/{totalItens} checklist</span>
                          </div>
                        )}
                      </div>
                      {os.valorEstimado && (
                        <div className="text-right shrink-0">
                          <p className="text-xs text-muted-foreground">Valor est.</p>
                          <p className="font-semibold text-sm">{fmt(os.valorEstimado)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// === Tipos de Serviço ===
function TiposServicoTab() {
  const { can } = usePermissions();
  const podeCriar = can.criar("engenharia_materiais");
  const podeEditar = can.editar("engenharia_materiais");
  const podeExcluir = can.excluir("engenharia_materiais");
  const utils = trpc.useUtils();
  const { data: tipos = [], isLoading } = trpc.tiposServico.list.useQuery();
  const [busca, setBusca] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ codigo: "", nome: "", descricao: "", unidade: "", valorUnitario: "" });
  const [impressaoTipos, setImpressaoTipos] = useState<TipoServicoParaImpressao[] | null>(null);

  // Busca o próximo código automático SERV-NNNN
  const { data: nextCodigoServico } = trpc.tiposServico.nextCodigo.useQuery(undefined, {
    enabled: showForm && !editId,
    staleTime: 0,
  });
  // Preenche o código automaticamente quando o valor chegar do servidor
  useEffect(() => {
    if (nextCodigoServico && showForm && !editId) {
      setForm(p => ({ ...p, codigo: nextCodigoServico }));
    }
  }, [nextCodigoServico, showForm, editId]);

  const createMutation = trpc.tiposServico.create.useMutation({
    onSuccess: () => { utils.tiposServico.list.invalidate(); utils.tiposServico.nextCodigo.invalidate(); setShowForm(false); toast.success("Tipo de serviço criado!"); }
  });
  const updateMutation = trpc.tiposServico.update.useMutation({
    onSuccess: () => { utils.tiposServico.list.invalidate(); setShowForm(false); setEditId(null); toast.success("Tipo de serviço atualizado!"); }
  });
  const deleteMutation = trpc.tiposServico.delete.useMutation({
    onSuccess: () => { utils.tiposServico.list.invalidate(); utils.tiposServico.nextCodigo.invalidate(); toast.success("Tipo de serviço removido."); }
  });

  const filtered = tipos.filter(t =>
    !busca || t.codigo.toLowerCase().includes(busca.toLowerCase()) || t.nome.toLowerCase().includes(busca.toLowerCase())
  );

  function openNew() { setEditId(null); setForm({ codigo: "", nome: "", descricao: "", unidade: "", valorUnitario: "" }); setShowForm(true); }
  function openEdit(t: typeof tipos[0]) {
    setEditId(t.id);
    setForm({ codigo: t.codigo, nome: t.nome, descricao: t.descricao ?? "", unidade: t.unidade ?? "", valorUnitario: t.valorUnitario ?? "" });
    setShowForm(true);
  }
  function handleSubmit() {
    const payload = { codigo: form.codigo, nome: form.nome, descricao: form.descricao || undefined, unidade: form.unidade || undefined, valorUnitario: form.valorUnitario ? parseFloat(form.valorUnitario) : undefined };
    if (editId) updateMutation.mutate({ id: editId, ...payload });
    else createMutation.mutate(payload);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center justify-between">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar tipo de serviço..." className="pl-9" value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImpressaoTipos(filtered)} className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-50">
            <Printer className="h-4 w-4" /> Imprimir Catálogo ({filtered.length})
          </Button>
          {podeCriar && <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Novo Tipo</Button>}
        </div>
      </div>
      {isLoading ? <div className="text-center py-8 text-muted-foreground">Carregando...</div> : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Código</th>
                <th className="text-left px-4 py-3 font-medium">Nome</th>
                <th className="text-left px-4 py-3 font-medium">Unidade</th>
                <th className="text-right px-4 py-3 font-medium">Valor Unit.</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum tipo de serviço cadastrado.</td></tr>
              ) : filtered.map(t => (
                <tr key={t.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-primary">{t.codigo}</td>
                  <td className="px-4 py-3">{t.nome}</td>
                  <td className="px-4 py-3 text-muted-foreground">{t.unidade ?? "—"}</td>
                  <td className="px-4 py-3 text-right">{t.valorUnitario ? fmt(t.valorUnitario) : "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" title="Imprimir" onClick={() => setImpressaoTipos([t])}><Printer className="h-3.5 w-3.5 text-green-600" /></Button>
                      {podeEditar && <Button size="icon" variant="ghost" onClick={() => openEdit(t)}><Edit2 className="h-3.5 w-3.5" /></Button>}
                      {podeExcluir && <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Excluir?")) deleteMutation.mutate({ id: t.id }); }}><Trash2 className="h-3.5 w-3.5" /></Button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) setEditId(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Editar Tipo de Serviço" : "Novo Tipo de Serviço"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1">
              <Label>Código *</Label>
              <Input
                value={form.codigo}
                onChange={e => setForm(p => ({ ...p, codigo: e.target.value }))}
                placeholder={!editId ? (nextCodigoServico ?? "Gerando...") : ""}
                className="font-mono"
              />
              {!editId && <p className="text-xs text-muted-foreground">Gerado automaticamente — editável</p>}
            </div>
            <div className="space-y-1"><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Unidade</Label><Input value={form.unidade} onChange={e => setForm(p => ({ ...p, unidade: e.target.value }))} placeholder="Ex: hora, m², un" /></div>
            <div className="space-y-1"><Label>Valor Unitário (R$)</Label><Input type="number" min="0" step="0.01" value={form.valorUnitario} onChange={e => setForm(p => ({ ...p, valorUnitario: e.target.value }))} /></div>
            <div className="col-span-2 space-y-1"><Label>Descrição</Label><Textarea rows={2} value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSubmit}>{editId ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Modal de Impressão de Tipos de Serviço */}
      {impressaoTipos && (
        <EngenhariaImpressao
          open={impressaoTipos !== null}
          onClose={() => setImpressaoTipos(null)}
          tipo="tiposServico"
          dados={impressaoTipos}
        />
      )}
    </div>
  );
}

// === Materiais ===
function MateriaisTab() {
  const { can } = usePermissions();
  const podeCriar = can.criar("engenharia_materiais");
  const podeEditar = can.editar("engenharia_materiais");
  const podeExcluir = can.excluir("engenharia_materiais");
  const utils = trpc.useUtils();
  const { data: lista = [], isLoading } = trpc.materiais.list.useQuery();
  const [busca, setBusca] = useState("");
  const [filtroFinalidade, setFiltroFinalidade] = useState<"todos" | "uso" | "fornecimento" | "ambos">("todos");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    codigo: "", nome: "", descricao: "", unidade: "",
    precoCusto: "", precoVenda: "", estoque: "",
    finalidade: "ambos" as "uso" | "fornecimento" | "ambos",
    dataInsercao: new Date().toISOString().split('T')[0],
  });
  const [impressaoMateriais, setImpressaoMateriais] = useState<MaterialParaImpressao[] | null>(null);

  // Busca o próximo código automático MAT-NNNN
  const { data: nextCodigo } = trpc.materiais.nextCodigo.useQuery(undefined, {
    enabled: showForm && !editId,
    staleTime: 0,
  });

  // Preenche o código automaticamente quando o valor chegar do servidor
  useEffect(() => {
    if (nextCodigo && showForm && !editId) {
      setForm(p => ({ ...p, codigo: nextCodigo }));
    }
  }, [nextCodigo, showForm, editId]);

  const createMutation = trpc.materiais.create.useMutation({
    onSuccess: () => { utils.materiais.list.invalidate(); setShowForm(false); toast.success("Material criado!"); }
  });
  const updateMutation = trpc.materiais.update.useMutation({
    onSuccess: () => { utils.materiais.list.invalidate(); setShowForm(false); setEditId(null); toast.success("Material atualizado!"); }
  });
  const deleteMutation = trpc.materiais.delete.useMutation({
    onSuccess: () => { utils.materiais.list.invalidate(); toast.success("Material removido."); }
  });

  const filtered = lista.filter(m => {
    const matchBusca = !busca || m.codigo.toLowerCase().includes(busca.toLowerCase()) || m.nome.toLowerCase().includes(busca.toLowerCase());
    const matchFinalidade = filtroFinalidade === "todos" || m.finalidade === filtroFinalidade || (filtroFinalidade === "ambos" && (!m.finalidade || m.finalidade === "ambos"));
    return matchBusca && matchFinalidade;
  });

  // Calcula margem de lucro: (precoVenda - precoCusto) / precoCusto * 100
  const calcMargem = (m: typeof lista[0]) => {
    if (!m.precoCusto || !m.precoVenda || Number(m.precoCusto) === 0) return null;
    return ((Number(m.precoVenda) - Number(m.precoCusto)) / Number(m.precoCusto) * 100);
  };

  function openNew() {
    setEditId(null);
    setForm({
      codigo: "", nome: "", descricao: "", unidade: "",
      precoCusto: "", precoVenda: "", estoque: "0",
      finalidade: "ambos",
      dataInsercao: new Date().toISOString().split('T')[0],
    });
    setShowForm(true);
  }
  function openEdit(m: typeof lista[0]) {
    setEditId(m.id);
    setForm({
      codigo: m.codigo,
      nome: m.nome,
      descricao: m.descricao ?? "",
      unidade: m.unidade ?? "",
      precoCusto: m.precoCusto ?? "",
      precoVenda: m.precoVenda ?? "",
      estoque: m.estoque ?? "0",
      finalidade: (m.finalidade as "uso" | "fornecimento" | "ambos") ?? "ambos",
      dataInsercao: m.dataInsercao instanceof Date ? m.dataInsercao.toISOString().split('T')[0] : (m.dataInsercao ?? new Date().toISOString().split('T')[0]),
    });
    setShowForm(true);
  }
  function handleSubmit() {
    const payload = {
      codigo: form.codigo,
      nome: form.nome,
      descricao: form.descricao || undefined,
      unidade: form.unidade || undefined,
      precoCusto: form.precoCusto ? parseFloat(form.precoCusto) : undefined,
      precoVenda: form.precoVenda ? parseFloat(form.precoVenda) : undefined,
      estoque: form.estoque ? parseFloat(form.estoque) : 0,
      finalidade: form.finalidade,
      dataInsercao: form.dataInsercao || undefined,
    };
    if (editId) updateMutation.mutate({ id: editId, ...payload });
    else createMutation.mutate(payload);
  }
  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center justify-between">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar material..." className="pl-9" value={busca} onChange={e => setBusca(e.target.value)} />
          </div>
          <Select value={filtroFinalidade} onValueChange={(v) => setFiltroFinalidade(v as any)}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Finalidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas as finalidades</SelectItem>
              <SelectItem value="uso">Uso Interno</SelectItem>
              <SelectItem value="fornecimento">Fornecimento</SelectItem>
              <SelectItem value="ambos">Uso e Fornecimento</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImpressaoMateriais(filtered)} className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-50">
            <Printer className="h-4 w-4" /> Imprimir Catálogo ({filtered.length})
          </Button>
          {podeCriar && <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Novo Material</Button>}
        </div>
      </div>
      {isLoading ? <div className="text-center py-8 text-muted-foreground">Carregando...</div> : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Código</th>
                <th className="text-left px-4 py-3 font-medium">Nome</th>
                <th className="text-left px-4 py-3 font-medium">Unidade</th>
                <th className="text-right px-4 py-3 font-medium">Estoque</th>
                <th className="text-right px-4 py-3 font-medium">Preço Custo</th>
                <th className="text-right px-4 py-3 font-medium">Preço Venda</th>
                <th className="text-left px-4 py-3 font-medium">Finalidade</th>
                <th className="text-right px-4 py-3 font-medium text-amber-600">Margem (%)</th>
                <th className="text-left px-4 py-3 font-medium">Inserção</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum material cadastrado.</td></tr>
              ) : filtered.map(m => (
                <tr key={m.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-primary">{m.codigo}</td>
                  <td className="px-4 py-3">{m.nome}</td>
                  <td className="px-4 py-3 text-muted-foreground">{m.unidade ?? "—"}</td>
                  <td className="px-4 py-3 text-right">{m.estoque ?? "0"}</td>
                  <td className="px-4 py-3 text-right text-red-600">{m.precoCusto ? fmt(m.precoCusto) : "—"}</td>
                  <td className="px-4 py-3 text-right text-green-600">{m.precoVenda ? fmt(m.precoVenda) : "—"}</td>
                  <td className="px-4 py-3">
                    {m.finalidade === 'uso' && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">Uso Interno</span>}
                    {m.finalidade === 'fornecimento' && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700">Fornecimento</span>}
                    {(m.finalidade === 'ambos' || !m.finalidade) && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">Uso e Fornec.</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {(() => { const mg = calcMargem(m); return mg !== null ? <span className={`font-semibold text-xs ${mg >= 0 ? 'text-amber-600' : 'text-red-600'}`}>{mg.toFixed(1)}%</span> : <span className="text-muted-foreground">—</span>; })()}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{m.dataInsercao ? (m.dataInsercao instanceof Date ? m.dataInsercao.toLocaleDateString('pt-BR') : new Date(m.dataInsercao).toLocaleDateString('pt-BR')) : "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" title="Imprimir" onClick={() => setImpressaoMateriais([m])}><Printer className="h-3.5 w-3.5 text-green-600" /></Button>
                      {podeEditar && <Button size="icon" variant="ghost" onClick={() => openEdit(m)}><Edit2 className="h-3.5 w-3.5" /></Button>}
                      {podeExcluir && <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Excluir?")) deleteMutation.mutate({ id: m.id }); }}><Trash2 className="h-3.5 w-3.5" /></Button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) setEditId(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Editar Material" : "Novo Material"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1">
              <Label>Código *</Label>
              <Input
                value={form.codigo}
                onChange={e => setForm(p => ({ ...p, codigo: e.target.value }))}
                placeholder={!editId ? (nextCodigo ?? "Gerando...") : ""}
                className="font-mono"
              />
              {!editId && <p className="text-xs text-muted-foreground">Gerado automaticamente — editável</p>}
            </div>
            <div className="space-y-1"><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Unidade</Label><Input value={form.unidade} onChange={e => setForm(p => ({ ...p, unidade: e.target.value }))} placeholder="Ex: un, kg, m" /></div>
            <div className="space-y-1"><Label>Estoque Inicial</Label><Input type="number" min="0" step="0.01" value={form.estoque} onChange={e => setForm(p => ({ ...p, estoque: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Preço de Custo (R$)</Label><Input type="number" min="0" step="0.01" value={form.precoCusto} onChange={e => setForm(p => ({ ...p, precoCusto: e.target.value }))} placeholder="Valor pago na compra" /></div>
            <div className="space-y-1"><Label>Preço de Venda (R$)</Label><Input type="number" min="0" step="0.01" value={form.precoVenda} onChange={e => setForm(p => ({ ...p, precoVenda: e.target.value }))} placeholder="Valor cobrado ao cliente" /></div>
            <div className="space-y-1">
              <Label>Finalidade</Label>
              <Select value={form.finalidade} onValueChange={v => setForm(p => ({ ...p, finalidade: v as "uso" | "fornecimento" | "ambos" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="uso">Uso Interno</SelectItem>
                  <SelectItem value="fornecimento">Fornecimento ao Cliente</SelectItem>
                  <SelectItem value="ambos">Uso e Fornecimento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Data de Inserção</Label><Input type="date" value={form.dataInsercao} onChange={e => setForm(p => ({ ...p, dataInsercao: e.target.value }))} /></div>
            <div className="col-span-2 space-y-1"><Label>Descrição</Label><Textarea rows={2} value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSubmit}>{editId ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Modal de Impressão de Materiais */}
      {impressaoMateriais && (
        <EngenhariaImpressao
          open={impressaoMateriais !== null}
          onClose={() => setImpressaoMateriais(null)}
          tipo="materiais"
          dados={impressaoMateriais}
        />
      )}
    </div>
  );
}

// === Página Principal ===
export default function Engenharia() {
  const { data: contratos = [] } = trpc.contratos.list.useQuery();
  const { data: ordens = [] } = trpc.ordensServico.list.useQuery();

  // Detectar ?novaOS=1 para selecionar aba de OS
  const defaultTab = (() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("novaOS") === "1") {
      window.history.replaceState({}, "", window.location.pathname);
      return "ordens";
    }
    return "contratos";
  })();

  const stats = useMemo(() => ({
    contratosAtivos: contratos.filter(c => c.status === "ativo").length,
    osAbertas: ordens.filter(o => o.status === "planejada" || o.status === "autorizada").length,
    osEmExecucao: ordens.filter(o => o.status === "em_execucao").length,
    valorContratos: contratos.filter(c => c.status === "ativo").reduce((s, c) => s + parseFloat(c.valorTotal ?? "0"), 0),
  }), [contratos, ordens]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Engenharia</h1>
        <p className="text-muted-foreground text-sm mt-1">Gerencie contratos, ordens de serviço, tipos de serviço e materiais.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg"><FileText className="h-5 w-5 text-green-700" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Contratos Ativos</p>
                <p className="text-2xl font-bold">{stats.contratosAtivos}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><ClipboardList className="h-5 w-5 text-blue-700" /></div>
              <div>
                <p className="text-xs text-muted-foreground">OS Abertas</p>
                <p className="text-2xl font-bold">{stats.osAbertas}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg"><Wrench className="h-5 w-5 text-yellow-700" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Em Execução</p>
                <p className="text-2xl font-bold">{stats.osEmExecucao}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg"><Package className="h-5 w-5 text-purple-700" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Valor em Contratos</p>
                <p className="text-lg font-bold">{fmt(stats.valorContratos)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Abas */}
      <Tabs defaultValue={defaultTab}>
        <TabsList className="grid grid-cols-5 w-full max-w-3xl">
          <TabsTrigger value="contratos" className="flex items-center gap-1.5">
            <FileText className="h-4 w-4" />Contratos
          </TabsTrigger>
          <TabsTrigger value="ordens" className="flex items-center gap-1.5">
            <ClipboardList className="h-4 w-4" />Ordens de Serviço
          </TabsTrigger>
          <TabsTrigger value="agenda" className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />Agenda
          </TabsTrigger>
          <TabsTrigger value="servicos" className="flex items-center gap-1.5">
            <Wrench className="h-4 w-4" />Tipos de Serviço
          </TabsTrigger>
          <TabsTrigger value="materiais" className="flex items-center gap-1.5">
            <Package className="h-4 w-4" />Materiais
          </TabsTrigger>
        </TabsList>
        <TabsContent value="contratos" className="mt-6"><ContratosTab /></TabsContent>
        <TabsContent value="ordens" className="mt-6"><OrdensServicoTab /></TabsContent>
        <TabsContent value="agenda" className="mt-6"><AgendaOperacionalTab /></TabsContent>
        <TabsContent value="servicos" className="mt-6"><TiposServicoTab /></TabsContent>
        <TabsContent value="materiais" className="mt-6"><MateriaisTab /></TabsContent>
      </Tabs>
    </div>
  );
}
