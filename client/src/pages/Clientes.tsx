import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, Users, Building2, Wrench, Hotel, Handshake, MoreHorizontal } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

const TIPOS = ["Cliente", "Prestador de Serviço", "Fornecedor", "Hotel", "Parceiro", "Outro"] as const;
type Tipo = typeof TIPOS[number];

const tipoIcons: Record<Tipo, React.ReactNode> = {
  "Cliente": <Users className="h-3.5 w-3.5" />,
  "Prestador de Serviço": <Wrench className="h-3.5 w-3.5" />,
  "Fornecedor": <Building2 className="h-3.5 w-3.5" />,
  "Hotel": <Hotel className="h-3.5 w-3.5" />,
  "Parceiro": <Handshake className="h-3.5 w-3.5" />,
  "Outro": <MoreHorizontal className="h-3.5 w-3.5" />,
};

const tipoColors: Record<Tipo, string> = {
  "Cliente": "bg-blue-100 text-blue-800 border-blue-200",
  "Prestador de Serviço": "bg-purple-100 text-purple-800 border-purple-200",
  "Fornecedor": "bg-orange-100 text-orange-800 border-orange-200",
  "Hotel": "bg-teal-100 text-teal-800 border-teal-200",
  "Parceiro": "bg-green-100 text-green-800 border-green-200",
  "Outro": "bg-gray-100 text-gray-700 border-gray-200",
};

type FormData = {
  nome: string;
  tipo: Tipo;
  cpfCnpj: string;
  email: string;
  telefone: string;
  endereco: string;
  cidade: string;
  estado: string;
  observacao: string;
};

const emptyForm: FormData = {
  nome: "", tipo: "Cliente", cpfCnpj: "", email: "", telefone: "",
  endereco: "", cidade: "", estado: "", observacao: "",
};

export default function Clientes() {
  const [busca, setBusca] = useState("");
  const [dialogAberto, setDialogAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const { data: clientes = [], refetch } = trpc.clientes.list.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.clientes.create.useMutation({
    onSuccess: () => { toast.success("Cliente cadastrado com sucesso!"); utils.clientes.list.invalidate(); fecharDialog(); },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.clientes.update.useMutation({
    onSuccess: () => { toast.success("Cliente atualizado!"); utils.clientes.list.invalidate(); fecharDialog(); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.clientes.delete.useMutation({
    onSuccess: () => { toast.success("Cliente removido."); utils.clientes.list.invalidate(); setConfirmDeleteId(null); },
    onError: (e) => toast.error(e.message),
  });

  const fecharDialog = () => { setDialogAberto(false); setEditandoId(null); setForm(emptyForm); };

  const abrirNovo = () => { setForm(emptyForm); setEditandoId(null); setDialogAberto(true); };

  const abrirEditar = (c: typeof clientes[0]) => {
    setForm({
      nome: c.nome,
      tipo: c.tipo as Tipo,
      cpfCnpj: c.cpfCnpj ?? "",
      email: c.email ?? "",
      telefone: c.telefone ?? "",
      endereco: c.endereco ?? "",
      cidade: c.cidade ?? "",
      estado: c.estado ?? "",
      observacao: c.observacao ?? "",
    });
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

  const clientesFiltrados = clientes.filter(c =>
    c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (c.cpfCnpj ?? "").includes(busca) ||
    (c.email ?? "").toLowerCase().includes(busca.toLowerCase()) ||
    (c.cidade ?? "").toLowerCase().includes(busca.toLowerCase())
  );

  // Contagem por tipo
  const contagemTipo = TIPOS.reduce((acc, t) => {
    acc[t] = clientes.filter(c => c.tipo === t).length;
    return acc;
  }, {} as Record<Tipo, number>);

  return (
    <DashboardLayout>
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes & Parceiros</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie clientes, fornecedores, prestadores de serviço e outros parceiros
          </p>
        </div>
        <Button onClick={abrirNovo} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Cadastro
        </Button>
      </div>

      {/* Cards de resumo por tipo */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {TIPOS.map(tipo => (
          <div key={tipo} className="rounded-lg border bg-card p-3 text-center space-y-1">
            <div className="flex justify-center text-muted-foreground">{tipoIcons[tipo]}</div>
            <p className="text-2xl font-bold">{contagemTipo[tipo]}</p>
            <p className="text-xs text-muted-foreground leading-tight">{tipo}</p>
          </div>
        ))}
      </div>

      {/* Busca */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, CPF/CNPJ, e-mail ou cidade..."
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
              <TableHead>Tipo</TableHead>
              <TableHead>CPF / CNPJ</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Cidade / UF</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clientesFiltrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  {busca ? "Nenhum resultado encontrado." : "Nenhum cadastro ainda. Clique em \"Novo Cadastro\" para começar."}
                </TableCell>
              </TableRow>
            ) : (
              clientesFiltrados.map(c => (
                <TableRow key={c.id} className={!c.ativo ? "opacity-50" : ""}>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`flex items-center gap-1 w-fit text-xs border ${tipoColors[c.tipo as Tipo] ?? ""}`}
                    >
                      {tipoIcons[c.tipo as Tipo]}
                      {c.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.cpfCnpj || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.email || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.telefone || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {c.cidade ? `${c.cidade}${c.estado ? ` / ${c.estado}` : ""}` : "—"}
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

      {/* Dialog de cadastro / edição */}
      <Dialog open={dialogAberto} onOpenChange={(o) => { if (!o) fecharDialog(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editandoId ? "Editar Cadastro" : "Novo Cadastro"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            {/* Nome */}
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Nome / Razão Social *</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Nome completo ou razão social"
              />
            </div>
            {/* Tipo */}
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm(f => ({ ...f, tipo: v as Tipo }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS.map(t => (
                    <SelectItem key={t} value={t}>
                      <span className="flex items-center gap-2">{tipoIcons[t]} {t}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* CPF/CNPJ */}
            <div className="space-y-1.5">
              <Label>CPF / CNPJ</Label>
              <Input
                value={form.cpfCnpj}
                onChange={(e) => setForm(f => ({ ...f, cpfCnpj: e.target.value }))}
                placeholder="000.000.000-00 ou 00.000.000/0001-00"
              />
            </div>
            {/* Email */}
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="contato@empresa.com.br"
              />
            </div>
            {/* Telefone */}
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input
                value={form.telefone}
                onChange={(e) => setForm(f => ({ ...f, telefone: e.target.value }))}
                placeholder="(61) 99999-9999"
              />
            </div>
            {/* Endereço */}
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Endereço</Label>
              <Input
                value={form.endereco}
                onChange={(e) => setForm(f => ({ ...f, endereco: e.target.value }))}
                placeholder="Rua, número, complemento, bairro"
              />
            </div>
            {/* Cidade */}
            <div className="space-y-1.5">
              <Label>Cidade</Label>
              <Input
                value={form.cidade}
                onChange={(e) => setForm(f => ({ ...f, cidade: e.target.value }))}
                placeholder="Brasília"
              />
            </div>
            {/* Estado */}
            <div className="space-y-1.5">
              <Label>UF</Label>
              <Input
                value={form.estado}
                onChange={(e) => setForm(f => ({ ...f, estado: e.target.value.toUpperCase().slice(0, 2) }))}
                placeholder="DF"
                maxLength={2}
              />
            </div>
            {/* Observação */}
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Observação</Label>
              <Textarea
                value={form.observacao}
                onChange={(e) => setForm(f => ({ ...f, observacao: e.target.value }))}
                placeholder="Informações adicionais..."
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
              {editandoId ? "Salvar Alterações" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={!!confirmDeleteId} onOpenChange={(o) => { if (!o) setConfirmDeleteId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja remover este cadastro? Esta ação não pode ser desfeita.
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
