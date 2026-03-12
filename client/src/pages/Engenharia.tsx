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
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { EngenhariaImpressao, type ContratoParaImpressao, type OSParaImpressao, type MaterialParaImpressao, type TipoServicoParaImpressao } from "@/components/EngenhariaImpressao";
import {
  Plus, Search, Edit2, Trash2, FileText, Wrench, Package, ClipboardList,
  ChevronDown, ChevronUp, Eye, Link2, DollarSign, BarChart2, MapPin, Printer
} from "lucide-react";
import AnexosPanel from "@/components/AnexosPanel";

// ─── Helpers ─────────────────────────────────────────────────────────────────
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

// ─── Contratos ────────────────────────────────────────────────────────────────
function ContratosTab() {
  const { can } = usePermissions();
  const podeCriar = can.criar("engenharia_contratos");
  const podeEditar = can.editar("engenharia_contratos");
  const podeExcluir = can.excluir("engenharia_contratos");
  const utils = trpc.useUtils();
  const { data: contratos = [], isLoading } = trpc.contratos.list.useQuery();
  const { data: clientes = [] } = trpc.clientes.list.useQuery();
  const { data: centrosCustoList = [] } = trpc.centrosCusto.list.useQuery();
  const { data: nextNumero } = trpc.contratos.nextNumero.useQuery();

  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroCC, setFiltroCC] = useState("todos");
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
    valorTotal: "", dataInicio: "", dataFim: "", descricao: "", observacoes: "",
    enderecoLogradouro: "", enderecoNumero: "", enderecoComplemento: "",
    enderecoBairro: "", enderecoCidade: "", enderecoEstado: "", enderecoCep: "",
  });

  const createMutation = trpc.contratos.create.useMutation({
    onSuccess: () => { utils.contratos.list.invalidate(); setShowForm(false); toast.success("Contrato criado!"); },
    onError: (err) => toast.error(`Erro ao criar contrato: ${err.message}`),
  });
  const updateMutation = trpc.contratos.update.useMutation({
    onSuccess: () => { utils.contratos.list.invalidate(); setShowForm(false); setEditId(null); toast.success("Contrato atualizado!"); },
    onError: (err) => toast.error(`Erro ao atualizar contrato: ${err.message}`),
  });
  const deleteMutation = trpc.contratos.delete.useMutation({
    onSuccess: () => { utils.contratos.list.invalidate(); toast.success("Contrato removido."); }
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
      const matchBusca = !busca || c.numero.toLowerCase().includes(busca.toLowerCase()) ||
        c.objeto.toLowerCase().includes(busca.toLowerCase()) ||
        (c.clienteNome ?? "").toLowerCase().includes(busca.toLowerCase());
      const matchStatus = filtroStatus === "todos" || c.status === filtroStatus;
      const matchTipo = filtroTipo === "todos" || c.tipo === filtroTipo;
      const matchCliente = !filtroCliente || (c.clienteNome ?? "").toLowerCase().includes(filtroCliente.toLowerCase());
      const matchCC = filtroCC === "todos" || String((c as any).centroCustoId ?? "") === filtroCC;
      return matchBusca && matchStatus && matchTipo && matchCliente && matchCC;
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
    setForm({ numero: nextNumero ?? "", objeto: "", tipo: "prestacao_servico", status: "proposta", clienteId: "", valorTotal: "", dataInicio: "", dataFim: "", descricao: "", observacoes: "", enderecoLogradouro: "", enderecoNumero: "", enderecoComplemento: "", enderecoBairro: "", enderecoCidade: "", enderecoEstado: "", enderecoCep: "" });
    setShowForm(true);
  }

  function openEdit(c: typeof contratos[0]) {
    setEditId(c.id);
    setForm({
      numero: c.numero, objeto: c.objeto, tipo: c.tipo as any,
      status: c.status as any, clienteId: c.clienteId ?? "",
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
    else createMutation.mutate(payload);
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
                      {podeEditar && c.status !== "ativo" && c.status !== "encerrado" && (
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
                      {podeEditar && <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Edit2 className="h-4 w-4" /></Button>}
                      {podeExcluir && <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Excluir contrato?")) deleteMutation.mutate({ id: c.id }); }}><Trash2 className="h-4 w-4" /></Button>}
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

      <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) setEditId(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Editar Contrato" : "Novo Contrato"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editId ? "Salvar Alterações" : "Criar Contrato"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Modal de Impressão de Contratos */}
      {impressaoContratos && (
        <EngenhariaImpressao
          open={impressaoContratos !== null}
          onClose={() => setImpressaoContratos(null)}
          tipo="contrato"
          dados={impressaoContratos}
        />
      )}
    </div>
  );
}

// ─── Ordens de Serviço ────────────────────────────────────────────────────────
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
    prioridade: "media" as const, responsavel: "", dataAbertura: "",
    dataPrevisao: "", valorEstimado: "", observacoes: "",
    contratoId: "" as string | number, clienteId: "" as string | number,
    enderecoLogradouro: "", enderecoNumero: "", enderecoComplemento: "",
    enderecoBairro: "", enderecoCidade: "", enderecoEstado: "", enderecoCep: "",
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
    setForm({ numero: nextNumero ?? "", titulo: "", descricao: "", status: "planejada", prioridade: "media", responsavel: "", dataAbertura: new Date().toISOString().split("T")[0], dataPrevisao: "", valorEstimado: "", observacoes: "", contratoId: "", clienteId: "", enderecoLogradouro: "", enderecoNumero: "", enderecoComplemento: "", enderecoBairro: "", enderecoCidade: "", enderecoEstado: "", enderecoCep: "" });
    setShowForm(true);
  }

  function openEdit(o: typeof ordens[0]) {
    setEditId(o.id);
    setItens([]);
    setForm({
      numero: o.numero, titulo: o.titulo, descricao: o.descricao ?? "",
      status: o.status as any, prioridade: o.prioridade as any,
      responsavel: o.responsavel ?? "", observacoes: o.observacoes ?? "",
      dataAbertura: o.dataAbertura ? new Date(o.dataAbertura).toISOString().split("T")[0] : "",
      dataPrevisao: o.dataPrevisao ? new Date(o.dataPrevisao).toISOString().split("T")[0] : "",
      valorEstimado: o.valorEstimado ?? "",
      contratoId: o.contratoId ?? "", clienteId: o.clienteId ?? "",
      enderecoLogradouro: o.enderecoLogradouro ?? "", enderecoNumero: o.enderecoNumero ?? "",
      enderecoComplemento: o.enderecoComplemento ?? "", enderecoBairro: o.enderecoBairro ?? "",
      enderecoCidade: o.enderecoCidade ?? "", enderecoEstado: o.enderecoEstado ?? "", enderecoCep: o.enderecoCep ?? "",
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
    const payload = {
      numero: form.numero, titulo: form.titulo, descricao: form.descricao || undefined,
      status: form.status, prioridade: form.prioridade,
      responsavel: form.responsavel || undefined,
      dataAbertura: form.dataAbertura || undefined,
      dataPrevisao: form.dataPrevisao || undefined,
      valorEstimado: form.valorEstimado ? parseFloat(form.valorEstimado) : undefined,
      observacoes: form.observacoes || undefined,
      contratoId: form.contratoId ? Number(form.contratoId) : undefined,
      clienteId: form.clienteId ? Number(form.clienteId) : undefined,
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

      <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) { setEditId(null); setItens([]); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Editar OS" : "Nova Ordem de Serviço"}</DialogTitle></DialogHeader>
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
              <Label>Responsável</Label>
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
            <div className="col-span-2 space-y-1">
              <Label>Descrição do Serviço</Label>
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
                            if (m?.valorUnitario) updateItem(idx, "valorUnitario", parseFloat(m.valorUnitario));
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editId ? "Salvar Alterações" : "Criar OS"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

// ─── Tipos de Serviço ─────────────────────────────────────────────────────────
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

  const createMutation = trpc.tiposServico.create.useMutation({
    onSuccess: () => { utils.tiposServico.list.invalidate(); setShowForm(false); toast.success("Tipo de serviço criado!"); }
  });
  const updateMutation = trpc.tiposServico.update.useMutation({
    onSuccess: () => { utils.tiposServico.list.invalidate(); setShowForm(false); setEditId(null); toast.success("Tipo de serviço atualizado!"); }
  });
  const deleteMutation = trpc.tiposServico.delete.useMutation({
    onSuccess: () => { utils.tiposServico.list.invalidate(); toast.success("Tipo de serviço removido."); }
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
            <div className="space-y-1"><Label>Código *</Label><Input value={form.codigo} onChange={e => setForm(p => ({ ...p, codigo: e.target.value }))} placeholder="Ex: CONS-001" /></div>
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

// ─── Materiais ────────────────────────────────────────────────────────────────
function MateriaisTab() {
  const { can } = usePermissions();
  const podeCriar = can.criar("engenharia_materiais");
  const podeEditar = can.editar("engenharia_materiais");
  const podeExcluir = can.excluir("engenharia_materiais");
  const utils = trpc.useUtils();
  const { data: lista = [], isLoading } = trpc.materiais.list.useQuery();
  const [busca, setBusca] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ codigo: "", nome: "", descricao: "", unidade: "", valorUnitario: "", estoque: "" });
  const [impressaoMateriais, setImpressaoMateriais] = useState<MaterialParaImpressao[] | null>(null);

  const createMutation = trpc.materiais.create.useMutation({
    onSuccess: () => { utils.materiais.list.invalidate(); setShowForm(false); toast.success("Material criado!"); }
  });
  const updateMutation = trpc.materiais.update.useMutation({
    onSuccess: () => { utils.materiais.list.invalidate(); setShowForm(false); setEditId(null); toast.success("Material atualizado!"); }
  });
  const deleteMutation = trpc.materiais.delete.useMutation({
    onSuccess: () => { utils.materiais.list.invalidate(); toast.success("Material removido."); }
  });

  const filtered = lista.filter(m =>
    !busca || m.codigo.toLowerCase().includes(busca.toLowerCase()) || m.nome.toLowerCase().includes(busca.toLowerCase())
  );

  function openNew() { setEditId(null); setForm({ codigo: "", nome: "", descricao: "", unidade: "", valorUnitario: "", estoque: "0" }); setShowForm(true); }
  function openEdit(m: typeof lista[0]) {
    setEditId(m.id);
    setForm({ codigo: m.codigo, nome: m.nome, descricao: m.descricao ?? "", unidade: m.unidade ?? "", valorUnitario: m.valorUnitario ?? "", estoque: m.estoque ?? "0" });
    setShowForm(true);
  }
  function handleSubmit() {
    const payload = { codigo: form.codigo, nome: form.nome, descricao: form.descricao || undefined, unidade: form.unidade || undefined, valorUnitario: form.valorUnitario ? parseFloat(form.valorUnitario) : undefined, estoque: form.estoque ? parseFloat(form.estoque) : 0 };
    if (editId) updateMutation.mutate({ id: editId, ...payload });
    else createMutation.mutate(payload);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center justify-between">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar material..." className="pl-9" value={busca} onChange={e => setBusca(e.target.value)} />
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
                <th className="text-right px-4 py-3 font-medium">Valor Unit.</th>
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
                  <td className="px-4 py-3 text-right">{m.valorUnitario ? fmt(m.valorUnitario) : "—"}</td>
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
            <div className="space-y-1"><Label>Código *</Label><Input value={form.codigo} onChange={e => setForm(p => ({ ...p, codigo: e.target.value }))} placeholder="Ex: MAT-001" /></div>
            <div className="space-y-1"><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Unidade</Label><Input value={form.unidade} onChange={e => setForm(p => ({ ...p, unidade: e.target.value }))} placeholder="Ex: un, kg, m" /></div>
            <div className="space-y-1"><Label>Estoque Inicial</Label><Input type="number" min="0" step="0.01" value={form.estoque} onChange={e => setForm(p => ({ ...p, estoque: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Valor Unitário (R$)</Label><Input type="number" min="0" step="0.01" value={form.valorUnitario} onChange={e => setForm(p => ({ ...p, valorUnitario: e.target.value }))} /></div>
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

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function Engenharia() {
  const { data: contratos = [] } = trpc.contratos.list.useQuery();
  const { data: ordens = [] } = trpc.ordensServico.list.useQuery();

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
      <Tabs defaultValue="contratos">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="contratos" className="flex items-center gap-1.5">
            <FileText className="h-4 w-4" />Contratos
          </TabsTrigger>
          <TabsTrigger value="ordens" className="flex items-center gap-1.5">
            <ClipboardList className="h-4 w-4" />Ordens de Serviço
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
        <TabsContent value="servicos" className="mt-6"><TiposServicoTab /></TabsContent>
        <TabsContent value="materiais" className="mt-6"><MateriaisTab /></TabsContent>
      </Tabs>
    </div>
  );
}
