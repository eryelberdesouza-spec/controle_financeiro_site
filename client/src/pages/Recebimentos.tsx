import React from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { TabelaParcelas, gerarParcelas, type ParcelaLocal } from "@/components/TabelaParcelas";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Plus, Pencil, Trash2, Search, Download, ChevronDown, ChevronUp, Layers, Printer } from "lucide-react";
import { ComprovanteViewer, type ComprovanteRecebimento } from "@/components/ComprovanteViewer";
import { useState } from "react";
import { toast } from "sonner";

const TIPOS_RECEBIMENTO = ["Pix", "Boleto", "Transferência", "Cartão de Crédito", "Cartão de Débito", "Dinheiro", "Outro"] as const;
type TipoRecebimento = typeof TIPOS_RECEBIMENTO[number];

const STATUS_COLORS: Record<string, string> = {
  Pendente: "bg-yellow-100 text-yellow-800",
  Recebido: "bg-green-100 text-green-800",
  Atrasado: "bg-red-100 text-red-800",
  Cancelado: "bg-gray-100 text-gray-600",
};

function formatCurrency(value: any) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(parseFloat(value ?? 0));
}
function formatDate(date: Date | string | null | undefined) {
  if (!date) return "-";
  const iso = date instanceof Date ? date.toISOString() : String(date);
  const parts = iso.substring(0, 10).split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return new Date(date).toLocaleDateString("pt-BR");
}

type FormData = {
  numeroControle: string;
  numeroContrato: string;
  nomeRazaoSocial: string;
  descricao: string;
  tipoRecebimento: TipoRecebimento;
  valorTotal: string;
  valorEquipamento: string;
  valorServico: string;
  juros: string;
  desconto: string;
  quantidadeParcelas: number;
  parcelaAtual: number;
  dataVencimento: string;
  dataRecebimento: string;
  status: "Pendente" | "Recebido" | "Atrasado" | "Cancelado";
  observacao: string;
  parcelado: boolean;
  dataPrimeiroVencimento: string;
};

const defaultForm: FormData = {
  numeroControle: "", numeroContrato: "", nomeRazaoSocial: "", descricao: "",
  tipoRecebimento: "Pix", valorTotal: "", valorEquipamento: "",
  valorServico: "", juros: "0", desconto: "0",
  quantidadeParcelas: 1, parcelaAtual: 1,
  dataVencimento: "", dataRecebimento: "", status: "Pendente", observacao: "",
  parcelado: false, dataPrimeiroVencimento: "",
};

function exportToCSV(data: any[]) {
  const headers = ["Nº Controle", "Nº Contrato", "Nome/Razão Social", "Tipo", "Valor Total", "Equipamento", "Serviço", "Juros", "Desconto", "Parcelas", "Parcela Atual", "Vencimento", "Recebimento", "Status", "Descrição", "Observação"];
  const rows = data.map(r => [
    r.numeroControle ?? "", r.numeroContrato ?? "", r.nomeRazaoSocial,
    r.tipoRecebimento, parseFloat(r.valorTotal ?? 0).toFixed(2).replace(".", ","),
    parseFloat(r.valorEquipamento ?? 0).toFixed(2).replace(".", ","),
    parseFloat(r.valorServico ?? 0).toFixed(2).replace(".", ","),
    parseFloat(r.juros ?? 0).toFixed(2).replace(".", ","),
    parseFloat(r.desconto ?? 0).toFixed(2).replace(".", ","),
    r.quantidadeParcelas, r.parcelaAtual ?? 1,
    formatDate(r.dataVencimento), formatDate(r.dataRecebimento),
    r.status, (r.descricao ?? "").replace(/\n/g, " "), (r.observacao ?? "").replace(/\n/g, " "),
  ]);
  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `recebimentos_${new Date().toISOString().split("T")[0]}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

/**
 * Exibe o status real de um recebimento parcelado na listagem:
 * - Se todas as parcelas estiverem pagas: badge "Recebido" verde
 * - Caso contrário: "X/N pagas" com badge amarelo ou vermelho
 */
function StatusParcelasInline({ recebimentoId, quantidadeParcelas, statusGeral }: { recebimentoId: number; quantidadeParcelas: number; statusGeral: string }) {
  const { data: parcelas = [] } = trpc.recebimentoParcelas.list.useQuery({ recebimentoId });

  if (parcelas.length === 0) {
    // Ainda carregando ou sem parcelas — mostra o status geral
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[statusGeral] ?? "bg-gray-100 text-gray-600"}`}>{statusGeral}</span>;
  }

  const pagas = parcelas.filter((p: any) => p.status === "Recebido" || p.status === "Pago").length;
  const total = parcelas.length;
  const todasPagas = pagas === total;
  const algumAtrasado = parcelas.some((p: any) => p.status === "Atrasado");

  if (todasPagas) {
    return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Recebido</span>;
  }

  const cor = algumAtrasado ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800";
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${cor}`}>
      {pagas}/{total} pagas
    </span>
  );
}

function ParcelasRow({ recebimentoId }: { recebimentoId: number }) {
  const { data: parcelas = [] } = trpc.recebimentoParcelas.list.useQuery({ recebimentoId });
  const utils = trpc.useUtils();
  const updateMutation = trpc.recebimentoParcelas.update.useMutation({
    onSuccess: () => { utils.recebimentoParcelas.list.invalidate(); toast.success("Parcela atualizada!"); },
    onError: (e) => toast.error(e.message),
  });

  if (parcelas.length === 0) return <p className="text-sm text-muted-foreground py-2">Nenhuma parcela cadastrada.</p>;

  const localParcelas: ParcelaLocal[] = parcelas.map(p => ({
    id: p.id,
    numeroParcela: p.numeroParcela,
    valor: String(p.valor),
    dataVencimento: p.dataVencimento ? new Date(p.dataVencimento).toISOString().split("T")[0] : "",
    dataRecebimento: p.dataRecebimento ? new Date(p.dataRecebimento).toISOString().split("T")[0] : undefined,
    status: p.status,
    observacao: p.observacao ?? "",
  }));

  // Extrai apenas YYYY-MM-DD de qualquer formato de data (ISO, timestamp, etc.)
  const toDateOnly = (val: string | undefined | null): string | undefined => {
    if (!val) return undefined;
    // Se já é YYYY-MM-DD puro, retorna direto
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    // Caso contrário, extrai os primeiros 10 caracteres (YYYY-MM-DD)
    return val.substring(0, 10);
  };

  const handleChange = (updated: ParcelaLocal[]) => {
    updated.forEach((p, i) => {
      const original = localParcelas[i];
      if (!p.id) return;
      const changed =
        p.valor !== original.valor ||
        p.dataVencimento !== original.dataVencimento ||
        p.dataRecebimento !== original.dataRecebimento ||
        p.status !== original.status ||
        p.observacao !== original.observacao;
      if (changed) {
        const dateVenc = toDateOnly(p.dataVencimento);
        const dateRec = toDateOnly(p.dataRecebimento);
        updateMutation.mutate({
          id: p.id,
          data: {
            valor: p.valor,
            dataVencimento: dateVenc ? new Date(dateVenc + "T12:00:00") : new Date(),
            dataRecebimento: dateRec ? new Date(dateRec + "T12:00:00") : undefined,
            status: p.status as any,
            observacao: p.observacao,
          },
        });
      }
    });
  };

  return (
    <TabelaParcelas
      tipo="recebimento"
      parcelas={localParcelas}
      onChange={handleChange}
    />
  );
}

export default function Recebimentos() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [parcelas, setParcelas] = useState<ParcelaLocal[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [comprovanteOpen, setComprovanteOpen] = useState(false);
  const [comprovanteRegistros, setComprovanteRegistros] = useState<ComprovanteRecebimento[]>([]);
  const utils = trpc.useUtils();

  const toComprovante = (r: any): ComprovanteRecebimento => ({
    id: r.id,
    numeroControle: r.numeroControle,
    numeroContrato: r.numeroContrato,
    nomeRazaoSocial: r.nomeRazaoSocial,
    tipoRecebimento: r.tipoRecebimento,
    valorTotal: r.valorTotal,
    valorEquipamento: r.valorEquipamento,
    valorServico: r.valorServico,
    juros: r.juros,
    desconto: r.desconto,
    quantidadeParcelas: r.quantidadeParcelas,
    parcelaAtual: r.parcelaAtual,
    dataVencimento: r.dataVencimento,
    dataRecebimento: r.dataRecebimento,
    status: r.status,
    descricao: r.descricao,
    observacao: r.observacao,
  });

  const handleImprimirUnico = (r: any) => {
    setComprovanteRegistros([toComprovante(r)]);
    setComprovanteOpen(true);
  };

  const handleImprimirLote = () => {
    const registros = filtered.filter(r => selecionados.has(r.id)).map(toComprovante);
    if (registros.length === 0) { toast.error("Selecione ao menos um recebimento."); return; }
    setComprovanteRegistros(registros);
    setComprovanteOpen(true);
  };

  const toggleSelecionado = (id: number) => {
    setSelecionados(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const toggleTodos = () => {
    setSelecionados(selecionados.size === filtered.length ? new Set() : new Set(filtered.map(r => r.id)));
  };

  const { data: recebimentos = [], isLoading } = trpc.recebimentos.list.useQuery();

  const createParcelasMutation = trpc.recebimentoParcelas.createBulk.useMutation();
  const deleteParcelasMutation = trpc.recebimentoParcelas.deleteBulk.useMutation();

  const createMutation = trpc.recebimentos.create.useMutation({
    onSuccess: async (data: any) => {
      if (form.parcelado && parcelas.length > 0) {
        const id = data?.insertId ?? data?.id;
        if (id) {
          await createParcelasMutation.mutateAsync({
            recebimentoId: id,
            parcelas: parcelas.map(p => ({
              ...p,
              dataVencimento: new Date(p.dataVencimento + "T12:00:00"),
              dataRecebimento: p.dataRecebimento ? new Date(p.dataRecebimento + "T12:00:00") : undefined,
              status: p.status as any,
            })),
          });
        }
      }
      utils.recebimentos.list.invalidate();
      utils.dashboard.stats.invalidate();
      toast.success("Recebimento cadastrado!");
      setOpen(false);
      setForm(defaultForm);
      setParcelas([]);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.recebimentos.update.useMutation({
    onSuccess: async () => {
      if (editId && form.parcelado && parcelas.length > 0) {
        await deleteParcelasMutation.mutateAsync({ recebimentoId: editId });
        await createParcelasMutation.mutateAsync({
          recebimentoId: editId,
          parcelas: parcelas.map(p => ({
            ...p,
            dataVencimento: new Date(p.dataVencimento + "T12:00:00"),
            dataRecebimento: p.dataRecebimento ? new Date(p.dataRecebimento + "T12:00:00") : undefined,
            status: p.status as any,
          })),
        });
      }
      utils.recebimentos.list.invalidate();
      utils.dashboard.stats.invalidate();
      utils.recebimentoParcelas.list.invalidate();
      toast.success("Recebimento atualizado!");
      setOpen(false);
      setEditId(null);
      setForm(defaultForm);
      setParcelas([]);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.recebimentos.delete.useMutation({
    onSuccess: () => { utils.recebimentos.list.invalidate(); utils.dashboard.stats.invalidate(); toast.success("Recebimento removido!"); },
    onError: (e) => toast.error(e.message),
  });

  const handleGerarParcelas = () => {
    const valorLiquido = parseFloat(form.valorTotal || "0") + parseFloat(form.juros || "0") - parseFloat(form.desconto || "0");
    // Usa dataPrimeiroVencimento se parcelado, senão usa dataVencimento (ambos sincronizados no onChange do campo)
    const dataRef = form.dataPrimeiroVencimento || form.dataVencimento;
    if (!valorLiquido || !dataRef || form.quantidadeParcelas < 1) {
      toast.error("Preencha valor total e data de vencimento antes de gerar as parcelas.");
      return;
    }
    const geradas = gerarParcelas("recebimento", form.quantidadeParcelas, valorLiquido, dataRef);
    setParcelas(geradas);
    toast.success(`${geradas.length === 1 ? "1 parcela gerada" : `${geradas.length} parcelas geradas`} automaticamente!`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nomeRazaoSocial || !form.valorTotal) { toast.error("Preencha os campos obrigatórios"); return; }
    if (form.parcelado && parcelas.length === 0) { toast.error("Gere as parcelas antes de salvar."); return; }

    // Quando parcelado, usa a data do primeiro vencimento; quando não parcelado, usa dataVencimento
    const dataVencimentoFinal = form.parcelado
      ? (form.dataPrimeiroVencimento ? new Date(form.dataPrimeiroVencimento + "T12:00:00") : new Date())
      : (form.dataVencimento ? new Date(form.dataVencimento + "T12:00:00") : new Date());

    const payload = {
      ...form,
      dataVencimento: dataVencimentoFinal,
      dataRecebimento: form.dataRecebimento ? new Date(form.dataRecebimento + "T12:00:00") : undefined,
      quantidadeParcelas: form.parcelado ? form.quantidadeParcelas : 1,
    };
    if (editId) updateMutation.mutate({ id: editId, ...payload });
    else createMutation.mutate(payload);
  };

  const handleEdit = (r: any) => {
    setEditId(r.id);
    setForm({
      numeroControle: r.numeroControle ?? "", numeroContrato: r.numeroContrato ?? "",
      nomeRazaoSocial: r.nomeRazaoSocial ?? "", descricao: r.descricao ?? "",
      tipoRecebimento: r.tipoRecebimento ?? "Pix",
      valorTotal: String(r.valorTotal ?? ""), valorEquipamento: String(r.valorEquipamento ?? ""),
      valorServico: String(r.valorServico ?? ""), juros: String(r.juros ?? "0"),
      desconto: String(r.desconto ?? "0"),
      quantidadeParcelas: r.quantidadeParcelas ?? 1, parcelaAtual: r.parcelaAtual ?? 1,
      dataVencimento: r.dataVencimento ? new Date(r.dataVencimento).toISOString().split("T")[0] : "",
      dataRecebimento: r.dataRecebimento ? new Date(r.dataRecebimento).toISOString().split("T")[0] : "",
      status: r.status ?? "Pendente", observacao: r.observacao ?? "",
      parcelado: r.quantidadeParcelas > 1,
      dataPrimeiroVencimento: r.dataVencimento ? new Date(r.dataVencimento).toISOString().split("T")[0] : "",
    });
    setParcelas([]);
    setOpen(true);
  };

  const filtered = recebimentos.filter(r => {
    const matchSearch = !search ||
      r.nomeRazaoSocial.toLowerCase().includes(search.toLowerCase()) ||
      (r.numeroContrato ?? "").includes(search) ||
      (r.numeroControle ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "todos" || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalFiltrado = filtered.reduce((acc, r) => acc + parseFloat(String(r.valorTotal ?? 0)), 0);

  const calcLiquido = (r: any) => {
    const total = parseFloat(String(r.valorTotal ?? 0));
    const juros = parseFloat(String(r.juros ?? 0));
    const desconto = parseFloat(String(r.desconto ?? 0));
    return total + juros - desconto;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Recebimentos</h1>
            <p className="text-muted-foreground text-sm mt-1">Controle de recebimentos e contratos</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {selecionados.size > 0 && (
              <Button variant="outline" onClick={handleImprimirLote} className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-50">
                <Printer className="h-4 w-4" /> Imprimir Selecionados ({selecionados.size})
              </Button>
            )}
            <Button variant="outline" onClick={() => exportToCSV(filtered)} className="gap-2">
              <Download className="h-4 w-4" /> Exportar CSV
            </Button>
            <Button onClick={() => { setEditId(null); setForm(defaultForm); setParcelas([]); setOpen(true); }} className="gap-2">
              <Plus className="h-4 w-4" /> Novo Recebimento
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome, contrato ou nº controle..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="Pendente">Pendente</SelectItem>
              <SelectItem value="Recebido">Recebido</SelectItem>
              <SelectItem value="Atrasado">Atrasado</SelectItem>
              <SelectItem value="Cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{filtered.length} registro(s)</span>
          <span>|</span>
          <span>Total: <strong className="text-foreground">{formatCurrency(totalFiltrado)}</strong></span>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <p className="p-6 text-muted-foreground text-sm">Carregando...</p>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-muted-foreground">Nenhum recebimento encontrado.</p>
                <Button variant="outline" className="mt-4" onClick={() => { setEditId(null); setForm(defaultForm); setParcelas([]); setOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" /> Cadastrar primeiro recebimento
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-3 w-10">
                        <input type="checkbox" className="rounded" checked={selecionados.size === filtered.length && filtered.length > 0} onChange={toggleTodos} title="Selecionar todos" />
                      </th>
                      <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Nº Controle</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Nome / Razão Social</th>
                      <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Contrato</th>
                      <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Tipo</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Valor Líquido</th>
                      <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Parcelas</th>
                      <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Vencimento</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => (
                      <React.Fragment key={r.id}>
                        <tr className={`border-b hover:bg-muted/30 transition-colors ${selecionados.has(r.id) ? 'bg-blue-50' : ''}`}>
                          <td className="p-3 w-10">
                            <input type="checkbox" className="rounded" checked={selecionados.has(r.id)} onChange={() => toggleSelecionado(r.id)} />
                          </td>
                          <td className="p-3 text-muted-foreground hidden lg:table-cell font-mono text-xs">{r.numeroControle || "-"}</td>
                          <td className="p-3 font-medium">
                            <div className="flex items-center gap-1.5">
                              {r.quantidadeParcelas > 1 && (
                                <span title="Parcelado">
                                  <Layers className="h-3.5 w-3.5 text-primary shrink-0" />
                                </span>
                              )}
                              {r.nomeRazaoSocial}
                            </div>
                            {r.quantidadeParcelas > 1 && (
                              <span className="text-xs text-muted-foreground">{r.quantidadeParcelas}x parcelas</span>
                            )}
                          </td>
                          <td className="p-3 text-muted-foreground hidden md:table-cell">{r.numeroContrato || "-"}</td>
                          <td className="p-3 text-muted-foreground hidden lg:table-cell">{r.tipoRecebimento}</td>
                          <td className="p-3 text-right font-semibold">{formatCurrency(calcLiquido(r))}</td>
                          <td className="p-3 text-muted-foreground hidden lg:table-cell">
                            {r.quantidadeParcelas > 1 ? `${r.parcelaAtual}/${r.quantidadeParcelas}` : "À vista"}
                          </td>
                          <td className="p-3 text-muted-foreground hidden md:table-cell">{formatDate(r.dataVencimento)}</td>
                          <td className="p-3">
                            {r.quantidadeParcelas > 1 ? (
                              <StatusParcelasInline
                                recebimentoId={r.id}
                                quantidadeParcelas={r.quantidadeParcelas}
                                statusGeral={r.status}
                              />
                            ) : (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[r.status] ?? "bg-gray-100 text-gray-600"}`}>{r.status}</span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex justify-end gap-1">
                              {r.quantidadeParcelas > 1 && (
                                <Button variant="ghost" size="icon" className="h-8 w-8" title="Ver parcelas"
                                  onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}>
                                  {expandedId === r.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700" title="Imprimir comprovante" onClick={() => handleImprimirUnico(r)}>
                                <Printer className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(r)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              {isAdmin && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => { if (confirm("Remover este recebimento?")) deleteMutation.mutate({ id: r.id }); }}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {expandedId === r.id && (
                          <tr className="bg-muted/20">
                            <td colSpan={9} className="p-4">
                              <p className="text-sm font-medium text-muted-foreground mb-3">Parcelas de {r.nomeRazaoSocial}</p>
                              <ParcelasRow recebimentoId={r.id} />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Recebimento" : "Novo Recebimento"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Nº de Controle</Label>
                <Input value={form.numeroControle} onChange={e => setForm(f => ({ ...f, numeroControle: e.target.value }))} placeholder="Ex: REC-2024-001" />
              </div>
              <div>
                <Label>Nº do Contrato</Label>
                <Input value={form.numeroContrato} onChange={e => setForm(f => ({ ...f, numeroContrato: e.target.value }))} placeholder="Ex: CT-2024-001" />
              </div>
              <div className="md:col-span-2">
                <Label>Nome / Razão Social *</Label>
                <Input value={form.nomeRazaoSocial} onChange={e => setForm(f => ({ ...f, nomeRazaoSocial: e.target.value }))} placeholder="Nome do cliente ou empresa" required />
              </div>
              <div>
                <Label>Tipo de Recebimento</Label>
                <Select value={form.tipoRecebimento} onValueChange={v => setForm(f => ({ ...f, tipoRecebimento: v as TipoRecebimento }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_RECEBIMENTO.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Pendente", "Recebido", "Atrasado", "Cancelado"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Composição do Valor */}
              <div className="md:col-span-2">
                <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
                  <p className="text-sm font-medium">Composição do Valor</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <Label>Valor Equipamento (R$)</Label>
                      <Input
                        type="number" step="0.01" min="0"
                        value={form.valorEquipamento}
                        onChange={e => {
                          const eq = parseFloat(e.target.value) || 0;
                          const sv = parseFloat(form.valorServico) || 0;
                          setForm(f => ({ ...f, valorEquipamento: e.target.value, valorTotal: (eq + sv).toFixed(2) }));
                        }}
                        placeholder="Opcional"
                      />
                    </div>
                    <div>
                      <Label>Valor Serviços (R$)</Label>
                      <Input
                        type="number" step="0.01" min="0"
                        value={form.valorServico}
                        onChange={e => {
                          const sv = parseFloat(e.target.value) || 0;
                          const eq = parseFloat(form.valorEquipamento) || 0;
                          setForm(f => ({ ...f, valorServico: e.target.value, valorTotal: (eq + sv).toFixed(2) }));
                        }}
                        placeholder="Opcional"
                      />
                    </div>
                    <div>
                      <Label>Valor Total (R$) *</Label>
                      <Input
                        type="number" step="0.01" min="0"
                        value={form.valorTotal}
                        onChange={e => setForm(f => ({ ...f, valorTotal: e.target.value }))}
                        placeholder="0,00"
                        required
                        className="font-semibold"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Calculado automaticamente ou edite manualmente</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <Label>Juros (R$)</Label>
                      <Input type="number" step="0.01" min="0" value={form.juros} onChange={e => setForm(f => ({ ...f, juros: e.target.value }))} placeholder="0,00" />
                    </div>
                    <div>
                      <Label>Desconto (R$)</Label>
                      <Input type="number" step="0.01" min="0" value={form.desconto} onChange={e => setForm(f => ({ ...f, desconto: e.target.value }))} placeholder="0,00" />
                    </div>
                    <div className="flex items-end">
                      <div className="w-full p-2 bg-muted rounded-md">
                        <p className="text-xs text-muted-foreground">Valor Líquido</p>
                        <p className="font-bold text-foreground">
                          {formatCurrency(
                            parseFloat(form.valorTotal || "0") + parseFloat(form.juros || "0") - parseFloat(form.desconto || "0")
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Datas (apenas quando não parcelado) */}
              {!form.parcelado && (
                <>
                  <div>
                    <Label>Data de Vencimento</Label>
                    <Input type="date" value={form.dataVencimento} onChange={e => setForm(f => ({ ...f, dataVencimento: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Data de Recebimento</Label>
                    <Input type="date" value={form.dataRecebimento} onChange={e => setForm(f => ({ ...f, dataRecebimento: e.target.value }))} />
                  </div>
                </>
              )}

              <div className="md:col-span-2">
                <Label>Descrição</Label>
                <Textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descrição do serviço ou produto" rows={2} />
              </div>
              <div className="md:col-span-2">
                <Label>Observação</Label>
                <Textarea value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} placeholder="Observações adicionais" rows={2} />
              </div>
            </div>

            <Separator />

            {/* Seção de Parcelamento */}
            <div className="space-y-4">
              <div>
                <p className="font-medium text-sm">Parcelamento</p>
                <p className="text-xs text-muted-foreground">Selecione a quantidade de parcelas e gere automaticamente com datas e valores individuais</p>
              </div>

              <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label>Nº de Parcelas</Label>
                    <Select
                      value={String(form.quantidadeParcelas)}
                      onValueChange={v => {
                        const n = parseInt(v);
                        setForm(f => ({ ...f, quantidadeParcelas: n, parcelado: n > 1 }));
                        if (n === 1) setParcelas([]);
                      }}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Parcela Única (1x)</SelectItem>
                        {Array.from({ length: 23 }, (_, i) => i + 2).map(n => (
                          <SelectItem key={n} value={String(n)}>{n}x parcelas</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{form.quantidadeParcelas === 1 ? "Data de Vencimento" : "1º Vencimento"}</Label>
                    <Input
                      type="date"
                      value={form.dataPrimeiroVencimento || form.dataVencimento}
                      onChange={e => {
                        // Sempre sincroniza ambos os campos de data para evitar inconsistência
                        setForm(f => ({ ...f, dataVencimento: e.target.value, dataPrimeiroVencimento: e.target.value }));
                      }}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button type="button" variant="outline" className="w-full" onClick={handleGerarParcelas}>
                      {form.quantidadeParcelas === 1 ? "Gerar Parcela" : "Gerar Parcelas"}
                    </Button>
                  </div>
                </div>

                {parcelas.length > 0 && (
                  <>
                    <p className="text-xs text-muted-foreground">
                      {parcelas.length === 1
                        ? "1 parcela gerada — edite o valor e a data conforme necessário."
                        : `${parcelas.length} parcelas geradas — edite individualmente o valor, vencimento, data de recebimento e status.`}
                    </p>
                    <TabelaParcelas
                      tipo="recebimento"
                      parcelas={parcelas}
                      onChange={setParcelas}
                    />
                  </>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editId ? "Salvar Alterações" : "Cadastrar Recebimento"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <ComprovanteViewer
        open={comprovanteOpen}
        onClose={() => setComprovanteOpen(false)}
        tipo="recebimento"
        registros={comprovanteRegistros}
      />
    </DashboardLayout>
  );
}
