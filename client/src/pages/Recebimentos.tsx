import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Plus, Pencil, Trash2, Search, Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const TIPOS_RECEBIMENTO = ["Pix", "Boleto", "Transferência", "Cartão de Crédito", "Cartão de Débito", "Dinheiro", "Outro"] as const;
type TipoRecebimento = typeof TIPOS_RECEBIMENTO[number];

const STATUS_COLORS: Record<string, string> = {
  Pendente: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  Recebido: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  Atrasado: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  Cancelado: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

function formatCurrency(value: any) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(parseFloat(value ?? 0));
}
function formatDate(date: Date | string | null | undefined) {
  if (!date) return "-";
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
};

const defaultForm: FormData = {
  numeroControle: "", numeroContrato: "", nomeRazaoSocial: "", descricao: "",
  tipoRecebimento: "Pix", valorTotal: "", valorEquipamento: "0",
  valorServico: "0", juros: "0", desconto: "0",
  quantidadeParcelas: 1, parcelaAtual: 1,
  dataVencimento: "", dataRecebimento: "", status: "Pendente", observacao: "",
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

export default function Recebimentos() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const utils = trpc.useUtils();

  const { data: recebimentos = [], isLoading } = trpc.recebimentos.list.useQuery();

  const createMutation = trpc.recebimentos.create.useMutation({
    onSuccess: () => { utils.recebimentos.list.invalidate(); utils.dashboard.stats.invalidate(); toast.success("Recebimento cadastrado!"); setOpen(false); setForm(defaultForm); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.recebimentos.update.useMutation({
    onSuccess: () => { utils.recebimentos.list.invalidate(); utils.dashboard.stats.invalidate(); toast.success("Recebimento atualizado!"); setOpen(false); setEditId(null); setForm(defaultForm); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.recebimentos.delete.useMutation({
    onSuccess: () => { utils.recebimentos.list.invalidate(); utils.dashboard.stats.invalidate(); toast.success("Recebimento removido!"); },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nomeRazaoSocial || !form.valorTotal || !form.dataVencimento) { toast.error("Preencha os campos obrigatórios"); return; }
    const payload = {
      ...form,
      dataVencimento: new Date(form.dataVencimento),
      dataRecebimento: form.dataRecebimento ? new Date(form.dataRecebimento) : undefined,
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
      valorTotal: String(r.valorTotal ?? ""), valorEquipamento: String(r.valorEquipamento ?? "0"),
      valorServico: String(r.valorServico ?? "0"), juros: String(r.juros ?? "0"),
      desconto: String(r.desconto ?? "0"),
      quantidadeParcelas: r.quantidadeParcelas ?? 1, parcelaAtual: r.parcelaAtual ?? 1,
      dataVencimento: r.dataVencimento ? new Date(r.dataVencimento).toISOString().split("T")[0] : "",
      dataRecebimento: r.dataRecebimento ? new Date(r.dataRecebimento).toISOString().split("T")[0] : "",
      status: r.status ?? "Pendente", observacao: r.observacao ?? "",
    });
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

  // Valor líquido = total + juros - desconto
  const calcLiquido = (r: any) => {
    const total = parseFloat(String(r.valorTotal ?? 0));
    const juros = parseFloat(String(r.juros ?? 0));
    const desconto = parseFloat(String(r.desconto ?? 0));
    return total + juros - desconto;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Recebimentos</h1>
            <p className="text-muted-foreground text-sm mt-1">Controle de recebimentos e contratos</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => exportToCSV(filtered)} className="gap-2">
              <Download className="h-4 w-4" /> Exportar CSV
            </Button>
            <Button onClick={() => { setEditId(null); setForm(defaultForm); setOpen(true); }} className="gap-2">
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
                <Button variant="outline" className="mt-4" onClick={() => { setEditId(null); setForm(defaultForm); setOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" /> Cadastrar primeiro recebimento
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
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
                      <tr key={r.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="p-3 text-muted-foreground hidden lg:table-cell font-mono text-xs">{r.numeroControle || "-"}</td>
                        <td className="p-3 font-medium">{r.nomeRazaoSocial}</td>
                        <td className="p-3 text-muted-foreground hidden md:table-cell">{r.numeroContrato || "-"}</td>
                        <td className="p-3 text-muted-foreground hidden lg:table-cell">{r.tipoRecebimento}</td>
                        <td className="p-3 text-right font-semibold">{formatCurrency(calcLiquido(r))}</td>
                        <td className="p-3 text-muted-foreground hidden lg:table-cell">{r.parcelaAtual}/{r.quantidadeParcelas}</td>
                        <td className="p-3 text-muted-foreground hidden md:table-cell">{formatDate(r.dataVencimento)}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[r.status]}`}>{r.status}</span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-1">
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
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Recebimento" : "Novo Recebimento"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
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
                <Input value={form.nomeRazaoSocial} onChange={e => setForm(f => ({ ...f, nomeRazaoSocial: e.target.value }))} placeholder="Nome do cliente ou empresa" />
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

              {/* Valores */}
              <div className="md:col-span-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Valores</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <Label>Valor Total (R$) *</Label>
                    <Input type="number" step="0.01" min="0" value={form.valorTotal} onChange={e => setForm(f => ({ ...f, valorTotal: e.target.value }))} placeholder="0,00" />
                  </div>
                  <div>
                    <Label>Equipamentos (R$)</Label>
                    <Input type="number" step="0.01" min="0" value={form.valorEquipamento} onChange={e => setForm(f => ({ ...f, valorEquipamento: e.target.value }))} placeholder="0,00" />
                  </div>
                  <div>
                    <Label>Serviços (R$)</Label>
                    <Input type="number" step="0.01" min="0" value={form.valorServico} onChange={e => setForm(f => ({ ...f, valorServico: e.target.value }))} placeholder="0,00" />
                  </div>
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
                          (parseFloat(form.valorTotal || "0") + parseFloat(form.juros || "0") - parseFloat(form.desconto || "0"))
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <Label>Qtd. Parcelas</Label>
                <Input type="number" min="1" value={form.quantidadeParcelas} onChange={e => setForm(f => ({ ...f, quantidadeParcelas: parseInt(e.target.value) || 1 }))} />
              </div>
              <div>
                <Label>Parcela Atual</Label>
                <Input type="number" min="1" value={form.parcelaAtual} onChange={e => setForm(f => ({ ...f, parcelaAtual: parseInt(e.target.value) || 1 }))} />
              </div>
              <div>
                <Label>Data de Vencimento *</Label>
                <Input type="date" value={form.dataVencimento} onChange={e => setForm(f => ({ ...f, dataVencimento: e.target.value }))} />
              </div>
              <div>
                <Label>Data de Recebimento</Label>
                <Input type="date" value={form.dataRecebimento} onChange={e => setForm(f => ({ ...f, dataRecebimento: e.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <Label>Descrição</Label>
                <Textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descrição do serviço ou produto" rows={2} />
              </div>
              <div className="md:col-span-2">
                <Label>Observação</Label>
                <Textarea value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} placeholder="Observações adicionais" rows={2} />
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
    </DashboardLayout>
  );
}
