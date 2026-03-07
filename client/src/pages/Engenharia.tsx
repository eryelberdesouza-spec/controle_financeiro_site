import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
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
import {
  Plus, Search, Edit2, Trash2, FileText, Wrench, Package, ClipboardList,
  ChevronDown, ChevronUp, Eye, Link2
} from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (v: string | number | null | undefined) =>
  v == null ? "—" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const STATUS_CONTRATO: Record<string, { label: string; color: string }> = {
  negociacao: { label: "Negociação", color: "bg-yellow-100 text-yellow-800" },
  ativo: { label: "Ativo", color: "bg-green-100 text-green-800" },
  suspenso: { label: "Suspenso", color: "bg-orange-100 text-orange-800" },
  encerrado: { label: "Encerrado", color: "bg-gray-100 text-gray-700" },
  cancelado: { label: "Cancelado", color: "bg-red-100 text-red-800" },
};

const STATUS_OS: Record<string, { label: string; color: string }> = {
  aberta: { label: "Aberta", color: "bg-blue-100 text-blue-800" },
  em_execucao: { label: "Em Execução", color: "bg-yellow-100 text-yellow-800" },
  concluida: { label: "Concluída", color: "bg-green-100 text-green-800" },
  cancelada: { label: "Cancelada", color: "bg-red-100 text-red-800" },
  pausada: { label: "Pausada", color: "bg-gray-100 text-gray-700" },
};

const PRIORIDADE: Record<string, { label: string; color: string }> = {
  baixa: { label: "Baixa", color: "bg-gray-100 text-gray-600" },
  media: { label: "Média", color: "bg-blue-100 text-blue-700" },
  alta: { label: "Alta", color: "bg-orange-100 text-orange-700" },
  urgente: { label: "Urgente", color: "bg-red-100 text-red-800" },
};

// ─── Contratos ────────────────────────────────────────────────────────────────
function ContratosTab() {
  
  const utils = trpc.useUtils();
  const { data: contratos = [], isLoading } = trpc.contratos.list.useQuery();
  const { data: clientes = [] } = trpc.clientes.list.useQuery();
  const { data: nextNumero } = trpc.contratos.nextNumero.useQuery();

  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    numero: "", objeto: "", tipo: "prestacao_servico" as const,
    status: "negociacao" as const, clienteId: "" as string | number,
    valorTotal: "", dataInicio: "", dataFim: "", descricao: "", observacoes: "",
  });

  const createMutation = trpc.contratos.create.useMutation({
    onSuccess: () => { utils.contratos.list.invalidate(); setShowForm(false); toast.success("Contrato criado!"); }
  });
  const updateMutation = trpc.contratos.update.useMutation({
    onSuccess: () => { utils.contratos.list.invalidate(); setShowForm(false); setEditId(null); toast.success("Contrato atualizado!"); }
  });
  const deleteMutation = trpc.contratos.delete.useMutation({
    onSuccess: () => { utils.contratos.list.invalidate(); toast.success("Contrato removido."); }
  });

  const filtered = useMemo(() => {
    return contratos.filter(c => {
      const matchBusca = !busca || c.numero.toLowerCase().includes(busca.toLowerCase()) ||
        c.objeto.toLowerCase().includes(busca.toLowerCase()) ||
        (c.clienteNome ?? "").toLowerCase().includes(busca.toLowerCase());
      const matchStatus = filtroStatus === "todos" || c.status === filtroStatus;
      return matchBusca && matchStatus;
    });
  }, [contratos, busca, filtroStatus]);

  function openNew() {
    setEditId(null);
    setForm({ numero: nextNumero ?? "", objeto: "", tipo: "prestacao_servico", status: "negociacao", clienteId: "", valorTotal: "", dataInicio: "", dataFim: "", descricao: "", observacoes: "" });
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
    });
    setShowForm(true);
  }

  function handleSubmit() {
    const payload = {
      numero: form.numero, objeto: form.objeto, tipo: form.tipo, status: form.status,
      clienteId: form.clienteId ? Number(form.clienteId) : undefined,
      valorTotal: parseFloat(form.valorTotal.replace(",", ".")) || 0,
      dataInicio: form.dataInicio || undefined, dataFim: form.dataFim || undefined,
      descricao: form.descricao || undefined, observacoes: form.observacoes || undefined,
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
              <SelectItem value="todos">Todos</SelectItem>
              {Object.entries(STATUS_CONTRATO).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Novo Contrato</Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Nenhum contrato encontrado.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => {
            const st = STATUS_CONTRATO[c.status ?? "negociacao"];
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
                      <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Edit2 className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Excluir contrato?")) deleteMutation.mutate({ id: c.id }); }}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editId ? "Salvar Alterações" : "Criar Contrato"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Ordens de Serviço ────────────────────────────────────────────────────────
function OrdensServicoTab() {
  
  const utils = trpc.useUtils();
  const { data: ordens = [], isLoading } = trpc.ordensServico.list.useQuery();
  const { data: clientes = [] } = trpc.clientes.list.useQuery();
  const { data: contratos = [] } = trpc.contratos.list.useQuery();
  const { data: tiposServico = [] } = trpc.tiposServico.list.useQuery();
  const { data: materiais = [] } = trpc.materiais.list.useQuery();
  const { data: nextNumero } = trpc.ordensServico.nextNumero.useQuery();

  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [form, setForm] = useState({
    numero: "", titulo: "", descricao: "", status: "aberta" as const,
    prioridade: "media" as const, responsavel: "", dataAbertura: "",
    dataPrevisao: "", valorEstimado: "", observacoes: "",
    contratoId: "" as string | number, clienteId: "" as string | number,
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

  const filtered = useMemo(() => {
    return ordens.filter(o => {
      const matchBusca = !busca || o.numero.toLowerCase().includes(busca.toLowerCase()) ||
        o.titulo.toLowerCase().includes(busca.toLowerCase()) ||
        (o.clienteNome ?? "").toLowerCase().includes(busca.toLowerCase());
      const matchStatus = filtroStatus === "todos" || o.status === filtroStatus;
      return matchBusca && matchStatus;
    });
  }, [ordens, busca, filtroStatus]);

  function openNew() {
    setEditId(null);
    setItens([]);
    setForm({ numero: nextNumero ?? "", titulo: "", descricao: "", status: "aberta", prioridade: "media", responsavel: "", dataAbertura: new Date().toISOString().split("T")[0], dataPrevisao: "", valorEstimado: "", observacoes: "", contratoId: "", clienteId: "" });
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
              <SelectItem value="todos">Todos</SelectItem>
              {Object.entries(STATUS_OS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Nova OS</Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Nenhuma OS encontrada.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(o => {
            const st = STATUS_OS[o.status ?? "aberta"];
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
                      <Button size="icon" variant="ghost" onClick={() => setExpandedId(expanded ? null : o.id)}>
                        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(o)}><Edit2 className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Excluir OS?")) deleteMutation.mutate({ id: o.id }); }}><Trash2 className="h-4 w-4" /></Button>
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
              <Select value={form.contratoId ? String(form.contratoId) : "none"} onValueChange={v => setForm(p => ({ ...p, contratoId: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Nenhum —</SelectItem>
                  {contratos.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.numero} — {c.objeto}</SelectItem>)}
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editId ? "Salvar Alterações" : "Criar OS"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Tipos de Serviço ─────────────────────────────────────────────────────────
function TiposServicoTab() {
  
  const utils = trpc.useUtils();
  const { data: tipos = [], isLoading } = trpc.tiposServico.list.useQuery();
  const [busca, setBusca] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ codigo: "", nome: "", descricao: "", unidade: "", valorUnitario: "" });

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
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Novo Tipo</Button>
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
                      <Button size="icon" variant="ghost" onClick={() => openEdit(t)}><Edit2 className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Excluir?")) deleteMutation.mutate({ id: t.id }); }}><Trash2 className="h-3.5 w-3.5" /></Button>
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
    </div>
  );
}

// ─── Materiais ────────────────────────────────────────────────────────────────
function MateriaisTab() {
  
  const utils = trpc.useUtils();
  const { data: lista = [], isLoading } = trpc.materiais.list.useQuery();
  const [busca, setBusca] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ codigo: "", nome: "", descricao: "", unidade: "", valorUnitario: "", estoque: "" });

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
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Novo Material</Button>
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
                      <Button size="icon" variant="ghost" onClick={() => openEdit(m)}><Edit2 className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Excluir?")) deleteMutation.mutate({ id: m.id }); }}><Trash2 className="h-3.5 w-3.5" /></Button>
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
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function Engenharia() {
  const { data: contratos = [] } = trpc.contratos.list.useQuery();
  const { data: ordens = [] } = trpc.ordensServico.list.useQuery();

  const stats = useMemo(() => ({
    contratosAtivos: contratos.filter(c => c.status === "ativo").length,
    osAbertas: ordens.filter(o => o.status === "aberta").length,
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
