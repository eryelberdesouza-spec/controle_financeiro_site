import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, Users, Building2, Wrench, Hotel, Handshake, MoreHorizontal, Archive, ArchiveRestore, Eye } from "lucide-react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import AnexosPanel from "@/components/AnexosPanel";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import MaskedInput from "@/components/MaskedInput";

const TIPOS = ["Cliente", "Prestador de Serviço", "Fornecedor", "Parceiro", "Outro"] as const;
type Tipo = typeof TIPOS[number];

const tipoIcons: Record<Tipo, React.ReactNode> = {
  "Cliente": <Users className="h-3.5 w-3.5" />,
  "Prestador de Serviço": <Wrench className="h-3.5 w-3.5" />,
  "Fornecedor": <Building2 className="h-3.5 w-3.5" />,
  "Parceiro": <Handshake className="h-3.5 w-3.5" />,
  "Outro": <MoreHorizontal className="h-3.5 w-3.5" />,
};

const tipoColors: Record<Tipo, string> = {
  "Cliente": "bg-blue-100 text-blue-800 border-blue-200",
  "Prestador de Serviço": "bg-purple-100 text-purple-800 border-purple-200",
  "Fornecedor": "bg-orange-100 text-orange-800 border-orange-200",
  "Parceiro": "bg-green-100 text-green-800 border-green-200",
  "Outro": "bg-gray-100 text-gray-700 border-gray-200",
};

const TIPOS_PIX = ["CPF", "CNPJ", "Email", "Telefone", "Chave Aleatória"] as const;
type TipoPix = typeof TIPOS_PIX[number];

type FormData = {
  nome: string;
  tipo: Tipo;
  tipoPessoa: "PF" | "PJ";
  segmento: string;
  cpfCnpj: string;
  inscricaoEstadual: string;
  inscricaoMunicipal: string;
  email: string;
  telefone: string;
  celular: string;
  nomeContato: string;
  endereco: string;
  cidade: string;
  estado: string;
  observacao: string;
  tipoPix: TipoPix | "";
  chavePix: string;
  banco: string;
  agencia: string;
  conta: string;
  tipoConta: "corrente" | "poupanca" | "pagamento" | "";
};

const emptyForm = (tipo: Tipo): FormData => ({
  nome: "", tipo, tipoPessoa: "PJ", segmento: "",
  cpfCnpj: "", inscricaoEstadual: "", inscricaoMunicipal: "",
  email: "", telefone: "", celular: "", nomeContato: "",
  endereco: "", cidade: "", estado: "", observacao: "",
  tipoPix: "", chavePix: "", banco: "", agencia: "", conta: "", tipoConta: "",
});

const tabConfig: { value: Tipo; label: string; icon: React.ReactNode }[] = [
  { value: "Cliente", label: "Clientes", icon: <Users className="h-4 w-4" /> },
  { value: "Fornecedor", label: "Fornecedores", icon: <Building2 className="h-4 w-4" /> },
  { value: "Prestador de Serviço", label: "Prestadores", icon: <Wrench className="h-4 w-4" /> },
  { value: "Parceiro", label: "Parceiros", icon: <Handshake className="h-4 w-4" /> },
  { value: "Outro", label: "Outros", icon: <MoreHorizontal className="h-4 w-4" /> },
];

function CadastroLista({ tipoFiltro }: { tipoFiltro: Tipo }) {
  const [, navigate] = useLocation();
  const { can } = usePermissions();
  const podeCriar = can.criar("clientes");
  const podeEditar = can.editar("clientes");
  const podeExcluir = can.excluir("clientes");

  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm(tipoFiltro));
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showAnexos, setShowAnexos] = useState<number | null>(null);
  const [showArquivados, setShowArquivados] = useState(false);

  const utils = trpc.useUtils();
  const { data: todosClientes = [], isLoading } = trpc.clientes.list.useQuery();

  const createMutation = trpc.clientes.create.useMutation({
    onSuccess: () => { utils.clientes.list.invalidate(); toast.success("Cadastro criado com sucesso!"); setShowDialog(false); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.clientes.update.useMutation({
    onSuccess: () => { utils.clientes.list.invalidate(); toast.success("Cadastro atualizado!"); setShowDialog(false); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.clientes.delete.useMutation({
    onSuccess: () => { utils.clientes.list.invalidate(); toast.success("Cadastro excluído!"); setDeleteId(null); },
    onError: (e) => toast.error(e.message),
  });
  const arquivarMutation = trpc.clientes.arquivar.useMutation({
    onSuccess: () => { utils.clientes.list.invalidate(); toast.success("Cadastro arquivado!"); },
    onError: (e) => toast.error(e.message),
  });
  const desarquivarMutation = trpc.clientes.desarquivar?.useMutation({
    onSuccess: () => { utils.clientes.list.invalidate(); toast.success("Cadastro reativado!"); },
    onError: (e) => toast.error(e.message),
  });

  const clientesFiltrados = todosClientes.filter(c => c.tipo === tipoFiltro && (showArquivados || c.statusRegistro !== "arquivado"));
  const filtered = clientesFiltrados.filter(c =>
    c.nome.toLowerCase().includes(search.toLowerCase()) ||
    (c.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (c.cpfCnpj ?? "").includes(search)
  );

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm(tipoFiltro));
    setShowDialog(true);
  };

  const openEdit = (c: typeof todosClientes[0]) => {
    setEditingId(c.id);
    setForm({
      nome: c.nome, tipo: c.tipo as Tipo, tipoPessoa: c.tipoPessoa as "PF" | "PJ",
      segmento: c.segmento ?? "", cpfCnpj: c.cpfCnpj ?? "",
      inscricaoEstadual: c.inscricaoEstadual ?? "", inscricaoMunicipal: c.inscricaoMunicipal ?? "",
      email: c.email ?? "", telefone: c.telefone ?? "", celular: c.celular ?? "",
      nomeContato: c.nomeContato ?? "", endereco: c.endereco ?? "",
      cidade: c.cidade ?? "", estado: c.estado ?? "", observacao: c.observacao ?? "",
      tipoPix: (c.tipoPix as TipoPix | null) ?? "", chavePix: c.chavePix ?? "",
      banco: c.banco ?? "", agencia: c.agencia ?? "", conta: c.conta ?? "",
      tipoConta: (c.tipoConta as "corrente" | "poupanca" | "pagamento" | null) ?? "",
    });
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!form.nome.trim()) return toast.error("Nome é obrigatório");
    const payload = { ...form, tipo: tipoFiltro, tipoPix: form.tipoPix || undefined, tipoConta: form.tipoConta || undefined };
    if (editingId) updateMutation.mutate({ id: editingId, ...payload });
    else createMutation.mutate(payload);
  };

  const f = (field: keyof FormData, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={`Buscar ${tipoFiltro.toLowerCase()}...`} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowArquivados(v => !v)}>
            {showArquivados ? <ArchiveRestore className="h-4 w-4 mr-1" /> : <Archive className="h-4 w-4 mr-1" />}
            {showArquivados ? "Ocultar arquivados" : "Ver arquivados"}
          </Button>
          {podeCriar && (
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> Novo {tipoFiltro}
            </Button>
          )}
        </div>
      </div>

      {/* Contagem */}
      <p className="text-sm text-muted-foreground">{filtered.length} registro(s) encontrado(s)</p>

      {/* Tabela */}
      {isLoading ? (
        <div className="text-center py-10 text-muted-foreground">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          Nenhum {tipoFiltro.toLowerCase()} encontrado.
          {podeCriar && <Button variant="link" onClick={openCreate}>Cadastrar agora</Button>}
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Nome</TableHead>
                <TableHead className="hidden md:table-cell">CPF/CNPJ</TableHead>
                <TableHead className="hidden lg:table-cell">Email</TableHead>
                <TableHead className="hidden lg:table-cell">Telefone</TableHead>
                <TableHead className="hidden md:table-cell">Cidade/UF</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(c => (
                <TableRow key={c.id} className={c.statusRegistro === "arquivado" ? "opacity-60" : ""}>
                  <TableCell>
                    <div className="font-medium">{c.nome}</div>
                    {c.nomeContato && <div className="text-xs text-muted-foreground">{c.nomeContato}</div>}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{c.cpfCnpj || "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{c.email || "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{c.telefone || c.celular || "—"}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {c.cidade ? `${c.cidade}/${c.estado}` : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/clientes/${c.id}`)} title="Ver detalhes">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {podeEditar && (
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)} title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {podeEditar && c.statusRegistro === "ativo" && (
                        <Button variant="ghost" size="icon" onClick={() => arquivarMutation.mutate({ id: c.id })} title="Arquivar">
                          <Archive className="h-4 w-4" />
                        </Button>
                      )}
                      {podeEditar && c.statusRegistro === "arquivado" && desarquivarMutation && (
                        <Button variant="ghost" size="icon" onClick={() => desarquivarMutation.mutate({ id: c.id })} title="Reativar">
                          <ArchiveRestore className="h-4 w-4" />
                        </Button>
                      )}
                      {podeExcluir && (
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(c.id)} title="Excluir">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog Criar/Editar */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? `Editar ${tipoFiltro}` : `Novo ${tipoFiltro}`}</DialogTitle>
            <DialogDescription>Preencha os dados do cadastro.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="sm:col-span-2">
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={e => f("nome", e.target.value)} placeholder="Nome completo ou razão social" />
            </div>
            <div>
              <Label>Tipo de Pessoa</Label>
              <Select value={form.tipoPessoa} onValueChange={v => f("tipoPessoa", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PJ">Pessoa Jurídica</SelectItem>
                  <SelectItem value="PF">Pessoa Física</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{form.tipoPessoa === "PF" ? "CPF" : "CNPJ"}</Label>
              <Input
                value={form.cpfCnpj}
                onChange={e => f("cpfCnpj", e.target.value)}
                placeholder={form.tipoPessoa === "PF" ? "000.000.000-00" : "00.000.000/0000-00"}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => f("email", e.target.value)} />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={form.telefone} onChange={e => f("telefone", e.target.value)} placeholder="(00) 0000-0000" />
            </div>
            <div>
              <Label>Celular</Label>
              <Input value={form.celular} onChange={e => f("celular", e.target.value)} placeholder="(00) 00000-0000" />
            </div>
            <div>
              <Label>Nome do Contato</Label>
              <Input value={form.nomeContato} onChange={e => f("nomeContato", e.target.value)} />
            </div>
            <div>
              <Label>Segmento</Label>
              <Input value={form.segmento} onChange={e => f("segmento", e.target.value)} placeholder="Ex: Energia Solar, TI..." />
            </div>
            <div>
              <Label>Cidade</Label>
              <Input value={form.cidade} onChange={e => f("cidade", e.target.value)} />
            </div>
            <div>
              <Label>Estado</Label>
              <Input value={form.estado} onChange={e => f("estado", e.target.value)} maxLength={2} placeholder="UF" />
            </div>
            <div className="sm:col-span-2">
              <Label>Endereço</Label>
              <Input value={form.endereco} onChange={e => f("endereco", e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>Observações</Label>
              <Textarea value={form.observacao} onChange={e => f("observacao", e.target.value)} rows={3} />
            </div>
            <div className="sm:col-span-2 border-t pt-3">
              <p className="text-sm font-medium text-muted-foreground mb-3">Dados Bancários (opcional)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Tipo de Pix</Label>
                  <Select value={form.tipoPix} onValueChange={v => f("tipoPix", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {TIPOS_PIX.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Chave Pix</Label>
                  <Input value={form.chavePix} onChange={e => f("chavePix", e.target.value)} />
                </div>
                <div>
                  <Label>Banco</Label>
                  <Input value={form.banco} onChange={e => f("banco", e.target.value)} />
                </div>
                <div>
                  <Label>Agência</Label>
                  <Input value={form.agencia} onChange={e => f("agencia", e.target.value)} />
                </div>
                <div>
                  <Label>Conta</Label>
                  <Input value={form.conta} onChange={e => f("conta", e.target.value)} />
                </div>
                <div>
                  <Label>Tipo de Conta</Label>
                  <Select value={form.tipoConta} onValueChange={v => f("tipoConta", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="corrente">Corrente</SelectItem>
                      <SelectItem value="poupanca">Poupança</SelectItem>
                      <SelectItem value="pagamento">Pagamento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingId ? "Salvar alterações" : `Cadastrar ${tipoFiltro}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete */}
      <ConfirmDeleteDialog
        open={deleteId !== null}
        onOpenChange={open => !open && setDeleteId(null)}
        onConfirm={() => { if (deleteId) deleteMutation.mutate({ id: deleteId }); }}
        title={`Excluir ${tipoFiltro}`}
        description="Esta ação não pode ser desfeita."
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

export default function Cadastros() {
  const [activeTab, setActiveTab] = useState<Tipo>("Cliente");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cadastros</h1>
          <p className="text-muted-foreground">Gerencie clientes, fornecedores, prestadores de serviços e parceiros.</p>
        </div>

        {/* Tabs por tipo */}
        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as Tipo)}>
          <TabsList className="flex flex-wrap gap-1 h-auto">
            {tabConfig.map(tab => (
              <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-1.5">
                {tab.icon}
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {tabConfig.map(tab => (
            <TabsContent key={tab.value} value={tab.value} className="mt-4">
              <CadastroLista tipoFiltro={tab.value} />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
