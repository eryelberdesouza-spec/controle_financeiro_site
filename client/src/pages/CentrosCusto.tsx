import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Plus, Pencil, Trash2, Layers, Search, TrendingUp, TrendingDown, DollarSign,
  BarChart3, Filter, X, User, FileText, ChevronDown, ChevronUp, Eye
} from "lucide-react";

const TIPOS_CC = [
  { value: "operacional", label: "Operacional" },
  { value: "administrativo", label: "Administrativo" },
  { value: "contrato", label: "Contrato" },
  { value: "projeto", label: "Projeto" },
  { value: "investimento", label: "Investimento" },
  { value: "outro", label: "Outro" },
] as const;

type TipoCC = typeof TIPOS_CC[number]["value"];

type FormData = {
  nome: string;
  descricao: string;
  tipo: TipoCC;
  responsavel: string;
  observacoes: string;
};

const emptyForm: FormData = {
  nome: "",
  descricao: "",
  tipo: "operacional",
  responsavel: "",
  observacoes: "",
};

const tipoBadgeColor: Record<TipoCC, string> = {
  operacional: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  administrativo: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  contrato: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  projeto: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  investimento: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  outro: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300",
};

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function CentrosCusto() {
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [dialogAberto, setDialogAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [ccRelatorio, setCcRelatorio] = useState<number | null>(null);
  const [expandidoId, setExpandidoId] = useState<number | null>(null);

  const { data: centros = [] } = trpc.centrosCusto.list.useQuery();
  const { data: relatorio } = trpc.centrosCusto.relatorio.useQuery(
    { centroCustoId: ccRelatorio ?? undefined },
    { enabled: ccRelatorio !== null }
  );
  const utils = trpc.useUtils();

  const createMutation = trpc.centrosCusto.create.useMutation({
    onSuccess: () => {
      toast.success("Centro de custo criado!");
      utils.centrosCusto.list.invalidate();
      fecharDialog();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.centrosCusto.update.useMutation({
    onSuccess: () => {
      toast.success("Centro de custo atualizado!");
      utils.centrosCusto.list.invalidate();
      fecharDialog();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.centrosCusto.delete.useMutation({
    onSuccess: () => {
      toast.success("Centro de custo removido.");
      utils.centrosCusto.list.invalidate();
      setConfirmDeleteId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const fecharDialog = () => {
    setDialogAberto(false);
    setEditandoId(null);
    setForm(emptyForm);
  };

  const abrirNovo = () => {
    setForm(emptyForm);
    setEditandoId(null);
    setDialogAberto(true);
  };

  const abrirEditar = (c: typeof centros[0]) => {
    setForm({
      nome: c.nome,
      descricao: c.descricao ?? "",
      tipo: (c.tipo as TipoCC) ?? "operacional",
      responsavel: (c as any).responsavel ?? "",
      observacoes: (c as any).observacoes ?? "",
    });
    setEditandoId(c.id);
    setDialogAberto(true);
  };

  const handleSubmit = () => {
    if (!form.nome.trim()) { toast.error("Nome é obrigatório."); return; }
    const payload = {
      nome: form.nome.trim(),
      descricao: form.descricao || undefined,
      tipo: form.tipo,
      responsavel: form.responsavel || undefined,
      observacoes: form.observacoes || undefined,
    };
    if (editandoId) {
      updateMutation.mutate({ id: editandoId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const toggleAtivo = (c: typeof centros[0]) => {
    updateMutation.mutate({ id: c.id, ativo: !c.ativo });
  };

  // Filtros aplicados
  const centrosFiltrados = centros.filter(c => {
    const matchBusca =
      c.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (c.descricao ?? "").toLowerCase().includes(busca.toLowerCase()) ||
      ((c as any).responsavel ?? "").toLowerCase().includes(busca.toLowerCase());
    const matchTipo = filtroTipo === "todos" || c.tipo === filtroTipo;
    const matchStatus =
      filtroStatus === "todos" ||
      (filtroStatus === "ativo" && c.ativo) ||
      (filtroStatus === "inativo" && !c.ativo);
    return matchBusca && matchTipo && matchStatus;
  });

  const temFiltros = filtroTipo !== "todos" || filtroStatus !== "todos" || busca !== "";
  const limparFiltros = () => { setBusca(""); setFiltroTipo("todos"); setFiltroStatus("todos"); };

  // Resumo
  const totalAtivos = centros.filter(c => c.ativo).length;
  const totalInativos = centros.filter(c => !c.ativo).length;
  const totalPorTipo = TIPOS_CC.reduce((acc, t) => {
    acc[t.value] = centros.filter(c => c.tipo === t.value).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Layers className="h-6 w-6 text-primary" />
              Centros de Custo
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Entidade financeira central — vinculada a contratos, OS, pagamentos e recebimentos
            </p>
          </div>
          <Button onClick={abrirNovo} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Centro de Custo
          </Button>
        </div>

        {/* Cards resumo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-lg border bg-card p-4 text-center">
            <p className="text-3xl font-bold text-primary">{centros.length}</p>
            <p className="text-sm text-muted-foreground">Total cadastrados</p>
          </div>
          <div className="rounded-lg border bg-card p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{totalAtivos}</p>
            <p className="text-sm text-muted-foreground">Ativos</p>
          </div>
          <div className="rounded-lg border bg-card p-4 text-center">
            <p className="text-3xl font-bold text-muted-foreground">{totalInativos}</p>
            <p className="text-sm text-muted-foreground">Inativos</p>
          </div>
          <div className="rounded-lg border bg-card p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">
              {centros.filter(c => c.tipo === "contrato").length}
            </p>
            <p className="text-sm text-muted-foreground">Contratos</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, descrição ou responsável..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="w-[160px]">
              <Filter className="h-4 w-4 mr-1 text-muted-foreground" />
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {TIPOS_CC.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="ativo">Ativos</SelectItem>
              <SelectItem value="inativo">Inativos</SelectItem>
            </SelectContent>
          </Select>

          {temFiltros && (
            <Button variant="ghost" size="sm" onClick={limparFiltros} className="gap-1 text-muted-foreground">
              <X className="h-3.5 w-3.5" />
              Limpar filtros
            </Button>
          )}

          <span className="text-sm text-muted-foreground ml-auto">
            {centrosFiltrados.length} de {centros.length} registros
          </span>
        </div>

        {/* Tabela */}
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {centrosFiltrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    {temFiltros
                      ? "Nenhum resultado para os filtros aplicados."
                      : "Nenhum centro de custo cadastrado. Clique em \"Novo Centro de Custo\" para começar."}
                  </TableCell>
                </TableRow>
              ) : (
                centrosFiltrados.map(c => (
                  <>
                    <TableRow key={c.id} className={!c.ativo ? "opacity-60" : ""}>
                      <TableCell className="font-medium">{c.nome}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${tipoBadgeColor[c.tipo as TipoCC] ?? tipoBadgeColor.outro}`}>
                          {TIPOS_CC.find(t => t.value === c.tipo)?.label ?? c.tipo}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {(c as any).responsavel ? (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {(c as any).responsavel}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {c.descricao || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={c.ativo ? "default" : "secondary"}
                          className="text-xs cursor-pointer"
                          onClick={() => toggleAtivo(c)}
                          title="Clique para alternar status"
                        >
                          {c.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(c.createdAt).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost" size="icon" className="h-8 w-8"
                            title="Ver relatório financeiro"
                            onClick={() => {
                              if (ccRelatorio === c.id) {
                                setCcRelatorio(null);
                              } else {
                                setCcRelatorio(c.id);
                                setExpandidoId(c.id);
                              }
                            }}
                          >
                            <BarChart3 className="h-3.5 w-3.5 text-blue-500" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => abrirEditar(c)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setConfirmDeleteId(c.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Painel de relatório expandido inline */}
                    {ccRelatorio === c.id && relatorio && (
                      <TableRow key={`rel-${c.id}`}>
                        <TableCell colSpan={7} className="p-0">
                          <div className="bg-muted/30 border-t px-6 py-4 space-y-4">
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold text-sm flex items-center gap-2">
                                <BarChart3 className="h-4 w-4 text-primary" />
                                Resumo Financeiro — {c.nome}
                              </h3>
                              <Button variant="ghost" size="sm" onClick={() => setCcRelatorio(null)}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                              <div className="rounded-lg border bg-card p-3 text-center">
                                <div className="flex items-center justify-center gap-1 mb-1">
                                  <TrendingDown className="h-4 w-4 text-red-500" />
                                  <span className="text-xs text-muted-foreground">Total Pago</span>
                                </div>
                                <p className="text-lg font-bold text-red-600">
                                  {formatCurrency(relatorio.totais.totalPagamentos)}
                                </p>
                                <p className="text-xs text-muted-foreground">{relatorio.totais.qtdPagamentos} lançamentos</p>
                              </div>
                              <div className="rounded-lg border bg-card p-3 text-center">
                                <div className="flex items-center justify-center gap-1 mb-1">
                                  <TrendingUp className="h-4 w-4 text-green-500" />
                                  <span className="text-xs text-muted-foreground">Total Recebido</span>
                                </div>
                                <p className="text-lg font-bold text-green-600">
                                  {formatCurrency(relatorio.totais.totalRecebimentos)}
                                </p>
                                <p className="text-xs text-muted-foreground">{relatorio.totais.qtdRecebimentos} lançamentos</p>
                              </div>
                              <div className="rounded-lg border bg-card p-3 text-center">
                                <div className="flex items-center justify-center gap-1 mb-1">
                                  <DollarSign className="h-4 w-4 text-primary" />
                                  <span className="text-xs text-muted-foreground">Resultado</span>
                                </div>
                                <p className={`text-lg font-bold ${relatorio.totais.saldo >= 0 ? "text-green-600" : "text-red-600"}`}>
                                  {formatCurrency(relatorio.totais.saldo)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {relatorio.totais.saldo >= 0 ? "Superávit" : "Déficit"}
                                </p>
                              </div>
                            </div>

                            {(c as any).observacoes && (
                              <div className="text-sm text-muted-foreground flex items-start gap-2">
                                <FileText className="h-4 w-4 mt-0.5 shrink-0" />
                                <span>{(c as any).observacoes}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Dialog cadastro / edição */}
        <Dialog open={dialogAberto} onOpenChange={(o) => { if (!o) fecharDialog(); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editandoId ? "Editar Centro de Custo" : "Novo Centro de Custo"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <Label>Nome *</Label>
                  <Input
                    value={form.nome}
                    onChange={(e) => setForm(f => ({ ...f, nome: e.target.value }))}
                    placeholder="Ex: Projeto Alpha, Administrativo, Operacional..."
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Tipo</Label>
                  <Select value={form.tipo} onValueChange={(v) => setForm(f => ({ ...f, tipo: v as TipoCC }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_CC.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Responsável</Label>
                  <Input
                    value={form.responsavel}
                    onChange={(e) => setForm(f => ({ ...f, responsavel: e.target.value }))}
                    placeholder="Nome do responsável..."
                  />
                </div>

                <div className="col-span-2 space-y-1.5">
                  <Label>Descrição</Label>
                  <Textarea
                    value={form.descricao}
                    onChange={(e) => setForm(f => ({ ...f, descricao: e.target.value }))}
                    placeholder="Descreva o objetivo deste centro de custo..."
                    rows={2}
                  />
                </div>

                <div className="col-span-2 space-y-1.5">
                  <Label>Observações</Label>
                  <Textarea
                    value={form.observacoes}
                    onChange={(e) => setForm(f => ({ ...f, observacoes: e.target.value }))}
                    placeholder="Informações adicionais, metas, restrições orçamentárias..."
                    rows={2}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={fecharDialog}>Cancelar</Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editandoId ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Confirmação exclusão */}
        <Dialog open={!!confirmDeleteId} onOpenChange={(o) => { if (!o) setConfirmDeleteId(null); }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Confirmar exclusão</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Tem certeza que deseja remover este centro de custo? Pagamentos, recebimentos e OS vinculados perderão este vínculo.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>Cancelar</Button>
              <Button
                variant="destructive"
                onClick={() => confirmDeleteId && deleteMutation.mutate({ id: confirmDeleteId })}
                disabled={deleteMutation.isPending}
              >
                Remover
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
