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

const BANCOS = [
  "Banco do Brasil", "Bradesco", "Caixa Econômica Federal", "Itaú", "Santander",
  "Nubank", "Inter", "Sicoob", "Sicredi", "BTG Pactual", "C6 Bank", "PicPay",
  "Mercado Pago", "PagBank", "Neon", "Original", "Safra", "BRB", "Banrisul", "Outro",
];

const STATUS_COLORS: Record<string, string> = {
  Pendente: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  Processando: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  Pago: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
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
  nomeCompleto: string;
  cpf: string;
  banco: string;
  tipoPix: "CPF" | "CNPJ" | "Email" | "Telefone" | "Chave Aleatória";
  chavePix: string;
  tipoServico: string;
  centroCusto: string;
  valor: string;
  dataPagamento: string;
  status: "Pendente" | "Processando" | "Pago" | "Cancelado";
  descricao: string;
  observacao: string;
  autorizadoPor: string;
};

const defaultForm: FormData = {
  numeroControle: "", nomeCompleto: "", cpf: "", banco: "", tipoPix: "CPF",
  chavePix: "", tipoServico: "", centroCusto: "", valor: "",
  dataPagamento: "", status: "Pendente", descricao: "", observacao: "", autorizadoPor: "",
};

function exportToCSV(data: any[]) {
  const headers = ["Nº Controle", "Nome", "CPF", "Banco", "Tipo Pix", "Chave Pix", "Tipo Serviço", "Centro de Custo", "Valor", "Data Pagamento", "Status", "Autorizado Por", "Descrição", "Observação"];
  const rows = data.map(p => [
    p.numeroControle ?? "", p.nomeCompleto, p.cpf ?? "", p.banco ?? "",
    p.tipoPix ?? "", p.chavePix ?? "", p.tipoServico ?? "", p.centroCusto ?? "",
    parseFloat(p.valor ?? 0).toFixed(2).replace(".", ","),
    formatDate(p.dataPagamento), p.status, p.autorizadoPor ?? "",
    (p.descricao ?? "").replace(/\n/g, " "), (p.observacao ?? "").replace(/\n/g, " "),
  ]);
  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `pagamentos_${new Date().toISOString().split("T")[0]}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

export default function Pagamentos() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const utils = trpc.useUtils();

  const { data: pagamentos = [], isLoading } = trpc.pagamentos.list.useQuery();

  const createMutation = trpc.pagamentos.create.useMutation({
    onSuccess: () => { utils.pagamentos.list.invalidate(); utils.dashboard.stats.invalidate(); toast.success("Pagamento cadastrado!"); setOpen(false); setForm(defaultForm); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.pagamentos.update.useMutation({
    onSuccess: () => { utils.pagamentos.list.invalidate(); utils.dashboard.stats.invalidate(); toast.success("Pagamento atualizado!"); setOpen(false); setEditId(null); setForm(defaultForm); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.pagamentos.delete.useMutation({
    onSuccess: () => { utils.pagamentos.list.invalidate(); utils.dashboard.stats.invalidate(); toast.success("Pagamento removido!"); },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nomeCompleto || !form.valor || !form.dataPagamento) { toast.error("Preencha os campos obrigatórios"); return; }
    const payload = { ...form, dataPagamento: new Date(form.dataPagamento) };
    if (editId) updateMutation.mutate({ id: editId, ...payload });
    else createMutation.mutate(payload);
  };

  const handleEdit = (p: any) => {
    setEditId(p.id);
    setForm({
      numeroControle: p.numeroControle ?? "", nomeCompleto: p.nomeCompleto ?? "",
      cpf: p.cpf ?? "", banco: p.banco ?? "", tipoPix: p.tipoPix ?? "CPF",
      chavePix: p.chavePix ?? "", tipoServico: p.tipoServico ?? "",
      centroCusto: p.centroCusto ?? "", valor: String(p.valor ?? ""),
      dataPagamento: p.dataPagamento ? new Date(p.dataPagamento).toISOString().split("T")[0] : "",
      status: p.status ?? "Pendente", descricao: p.descricao ?? "",
      observacao: p.observacao ?? "", autorizadoPor: p.autorizadoPor ?? "",
    });
    setOpen(true);
  };

  const filtered = pagamentos.filter(p => {
    const matchSearch = !search ||
      p.nomeCompleto.toLowerCase().includes(search.toLowerCase()) ||
      (p.cpf ?? "").includes(search) ||
      (p.numeroControle ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "todos" || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalFiltrado = filtered.reduce((acc, p) => acc + parseFloat(String(p.valor ?? 0)), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Pagamentos</h1>
            <p className="text-muted-foreground text-sm mt-1">Controle e autorização de pagamentos via Pix</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => exportToCSV(filtered)} className="gap-2">
              <Download className="h-4 w-4" /> Exportar CSV
            </Button>
            <Button onClick={() => { setEditId(null); setForm(defaultForm); setOpen(true); }} className="gap-2">
              <Plus className="h-4 w-4" /> Novo Pagamento
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome, CPF ou nº controle..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="Pendente">Pendente</SelectItem>
              <SelectItem value="Processando">Processando</SelectItem>
              <SelectItem value="Pago">Pago</SelectItem>
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
                <p className="text-muted-foreground">Nenhum pagamento encontrado.</p>
                <Button variant="outline" className="mt-4" onClick={() => { setEditId(null); setForm(defaultForm); setOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" /> Cadastrar primeiro pagamento
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Nº Controle</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Nome</th>
                      <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Banco</th>
                      <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Serviço</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Valor</th>
                      <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Data</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => (
                      <tr key={p.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="p-3 text-muted-foreground hidden lg:table-cell font-mono text-xs">{p.numeroControle || "-"}</td>
                        <td className="p-3 font-medium">{p.nomeCompleto}</td>
                        <td className="p-3 text-muted-foreground hidden md:table-cell">{p.banco || "-"}</td>
                        <td className="p-3 text-muted-foreground hidden lg:table-cell">{p.tipoServico || "-"}</td>
                        <td className="p-3 text-right font-semibold">{formatCurrency(p.valor)}</td>
                        <td className="p-3 text-muted-foreground hidden md:table-cell">{formatDate(p.dataPagamento)}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[p.status]}`}>{p.status}</span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(p)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            {isAdmin && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => { if (confirm("Remover este pagamento?")) deleteMutation.mutate({ id: p.id }); }}>
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
            <DialogTitle>{editId ? "Editar Pagamento" : "Novo Pagamento"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Nº de Controle</Label>
                <Input value={form.numeroControle} onChange={e => setForm(f => ({ ...f, numeroControle: e.target.value }))} placeholder="Ex: PAG-2024-001" />
              </div>
              <div>
                <Label>Nome Completo *</Label>
                <Input value={form.nomeCompleto} onChange={e => setForm(f => ({ ...f, nomeCompleto: e.target.value }))} placeholder="Nome do beneficiário" />
              </div>
              <div>
                <Label>CPF</Label>
                <Input value={form.cpf} onChange={e => setForm(f => ({ ...f, cpf: e.target.value }))} placeholder="000.000.000-00" />
              </div>
              <div>
                <Label>Banco</Label>
                <Select value={form.banco} onValueChange={v => setForm(f => ({ ...f, banco: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione o banco" /></SelectTrigger>
                  <SelectContent>
                    {BANCOS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo de Chave Pix</Label>
                <Select value={form.tipoPix} onValueChange={v => setForm(f => ({ ...f, tipoPix: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["CPF", "CNPJ", "Email", "Telefone", "Chave Aleatória"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Chave Pix</Label>
                <Input value={form.chavePix} onChange={e => setForm(f => ({ ...f, chavePix: e.target.value }))} placeholder="Chave Pix" />
              </div>
              <div>
                <Label>Tipo de Serviço</Label>
                <Input value={form.tipoServico} onChange={e => setForm(f => ({ ...f, tipoServico: e.target.value }))} placeholder="Ex: Consultoria, Manutenção..." />
              </div>
              <div>
                <Label>Centro de Custo</Label>
                <Input value={form.centroCusto} onChange={e => setForm(f => ({ ...f, centroCusto: e.target.value }))} placeholder="Ex: TI, RH, Comercial..." />
              </div>
              <div>
                <Label>Valor (R$) *</Label>
                <Input type="number" step="0.01" min="0" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} placeholder="0,00" />
              </div>
              <div>
                <Label>Data de Pagamento *</Label>
                <Input type="date" value={form.dataPagamento} onChange={e => setForm(f => ({ ...f, dataPagamento: e.target.value }))} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Pendente", "Processando", "Pago", "Cancelado"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Autorizado Por</Label>
                <Input value={form.autorizadoPor} onChange={e => setForm(f => ({ ...f, autorizadoPor: e.target.value }))} placeholder="Nome do autorizador" />
              </div>
              <div className="md:col-span-2">
                <Label>Descrição</Label>
                <Textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descrição do pagamento" rows={2} />
              </div>
              <div className="md:col-span-2">
                <Label>Observação</Label>
                <Textarea value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} placeholder="Observações adicionais" rows={2} />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editId ? "Salvar Alterações" : "Cadastrar Pagamento"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
