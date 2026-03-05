import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { Plus, Pencil, Trash2, Layers, Search } from "lucide-react";

type FormData = { nome: string; descricao: string };
const emptyForm: FormData = { nome: "", descricao: "" };

export default function CentrosCusto() {
  const [busca, setBusca] = useState("");
  const [dialogAberto, setDialogAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const { data: centros = [] } = trpc.centrosCusto.list.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.centrosCusto.create.useMutation({
    onSuccess: () => { toast.success("Centro de custo criado!"); utils.centrosCusto.list.invalidate(); fecharDialog(); },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.centrosCusto.update.useMutation({
    onSuccess: () => { toast.success("Centro de custo atualizado!"); utils.centrosCusto.list.invalidate(); fecharDialog(); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.centrosCusto.delete.useMutation({
    onSuccess: () => { toast.success("Centro de custo removido."); utils.centrosCusto.list.invalidate(); setConfirmDeleteId(null); },
    onError: (e) => toast.error(e.message),
  });

  const fecharDialog = () => { setDialogAberto(false); setEditandoId(null); setForm(emptyForm); };

  const abrirNovo = () => { setForm(emptyForm); setEditandoId(null); setDialogAberto(true); };

  const abrirEditar = (c: typeof centros[0]) => {
    setForm({ nome: c.nome, descricao: c.descricao ?? "" });
    setEditandoId(c.id);
    setDialogAberto(true);
  };

  const handleSubmit = () => {
    if (!form.nome.trim()) { toast.error("Nome é obrigatório."); return; }
    if (editandoId) {
      updateMutation.mutate({ id: editandoId, ...form });
    } else {
      createMutation.mutate(form);
    }
  };

  const centrosFiltrados = centros.filter(c =>
    c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (c.descricao ?? "").toLowerCase().includes(busca.toLowerCase())
  );

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
            Organize pagamentos e recebimentos por área, projeto ou departamento
          </p>
        </div>
        <Button onClick={abrirNovo} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Centro de Custo
        </Button>
      </div>

      {/* Card resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-3xl font-bold text-primary">{centros.length}</p>
          <p className="text-sm text-muted-foreground">Total cadastrados</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-3xl font-bold text-green-600">{centros.filter(c => c.ativo).length}</p>
          <p className="text-sm text-muted-foreground">Ativos</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-3xl font-bold text-muted-foreground">{centros.filter(c => !c.ativo).length}</p>
          <p className="text-sm text-muted-foreground">Inativos</p>
        </div>
      </div>

      {/* Busca */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar centro de custo..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tabela */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Nome</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {centrosFiltrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  {busca
                    ? "Nenhum resultado encontrado."
                    : "Nenhum centro de custo cadastrado. Clique em \"Novo Centro de Custo\" para começar."}
                </TableCell>
              </TableRow>
            ) : (
              centrosFiltrados.map(c => (
                <TableRow key={c.id} className={!c.ativo ? "opacity-50" : ""}>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                    {c.descricao || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.ativo ? "default" : "secondary"} className="text-xs">
                      {c.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(c.createdAt).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
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
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog cadastro / edição */}
      <Dialog open={dialogAberto} onOpenChange={(o) => { if (!o) fecharDialog(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editandoId ? "Editar Centro de Custo" : "Novo Centro de Custo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Projetos, Administrativo, Operacional..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea
                value={form.descricao}
                onChange={(e) => setForm(f => ({ ...f, descricao: e.target.value }))}
                placeholder="Descreva o objetivo deste centro de custo..."
                rows={3}
              />
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
            Tem certeza que deseja remover este centro de custo? Pagamentos e recebimentos vinculados perderão este vínculo.
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
