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
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, Users, Building2, Wrench, Hotel, Handshake, MoreHorizontal, AlertTriangle, Archive, ArchiveRestore, Eye } from "lucide-react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import AnexosPanel from "@/components/AnexosPanel";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import MaskedInput from "@/components/MaskedInput";

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

const emptyForm: FormData = {
  nome: "", tipo: "Cliente", tipoPessoa: "PJ", segmento: "",
  cpfCnpj: "", inscricaoEstadual: "", inscricaoMunicipal: "",
  email: "", telefone: "", celular: "", nomeContato: "",
  endereco: "", cidade: "", estado: "", observacao: "",
  tipoPix: "", chavePix: "", banco: "", agencia: "", conta: "", tipoConta: "",
};

export default function Clientes() {
  const [, navigate] = useLocation();
  const { can } = usePermissions();
  const podeCriar = can.criar("clientes");
  const podeEditar = can.editar("clientes");
  const podeExcluir = can.excluir("clientes");
  const [busca, setBusca] = useState("");
  const [dialogAberto, setDialogAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [showArquivados, setShowArquivados] = useState(false);
  // Estado para controle de duplicidade
  const [duplicados, setDuplicados] = useState<Array<{ id: number; nome: string; tipo: string; cpfCnpj: string | null }>>([]);
  const [confirmandoDuplicidade, setConfirmandoDuplicidade] = useState(false);

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
  const arquivarMutation = trpc.clientes.arquivar.useMutation({
    onSuccess: () => { toast.success("Cliente arquivado."); utils.clientes.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const desarquivarMutation = trpc.clientes.desarquivar.useMutation({
    onSuccess: () => { toast.success("Cliente restaurado."); utils.clientes.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const checkDuplicate = trpc.clientes.checkDuplicate.useQuery(
    { nome: form.nome.trim() || undefined, cpfCnpj: form.cpfCnpj.trim() || undefined, excludeId: editandoId ?? undefined },
    { enabled: false }
  );

  const fecharDialog = () => { setDialogAberto(false); setEditandoId(null); setForm(emptyForm); setDuplicados([]); setConfirmandoDuplicidade(false); };

  const abrirNovo = () => { setForm(emptyForm); setEditandoId(null); setDialogAberto(true); };

  const abrirEditar = (c: typeof clientes[0]) => {
    setForm({
      nome: c.nome,
      tipo: c.tipo as Tipo,
      tipoPessoa: (c.tipoPessoa as "PF" | "PJ") ?? "PJ",
      segmento: c.segmento ?? "",
      cpfCnpj: c.cpfCnpj ?? "",
      inscricaoEstadual: c.inscricaoEstadual ?? "",
      inscricaoMunicipal: c.inscricaoMunicipal ?? "",
      email: c.email ?? "",
      telefone: c.telefone ?? "",
      celular: c.celular ?? "",
      nomeContato: c.nomeContato ?? "",
      endereco: c.endereco ?? "",
      cidade: c.cidade ?? "",
      estado: c.estado ?? "",
      observacao: c.observacao ?? "",
      tipoPix: (c.tipoPix as TipoPix) ?? "",
      chavePix: c.chavePix ?? "",
      banco: c.banco ?? "",
      agencia: c.agencia ?? "",
      conta: c.conta ?? "",
      tipoConta: (c.tipoConta as "corrente" | "poupanca" | "pagamento" | "") ?? "",
    });
    setEditandoId(c.id);
    setDialogAberto(true);
  };

  const buildPayload = () => ({
    ...form,
    tipoPix: form.tipoPix || undefined,
    chavePix: form.chavePix || undefined,
    banco: form.banco || undefined,
    agencia: form.agencia || undefined,
    conta: form.conta || undefined,
    tipoConta: form.tipoConta || undefined,
    segmento: form.segmento || undefined,
    inscricaoEstadual: form.inscricaoEstadual || undefined,
    inscricaoMunicipal: form.inscricaoMunicipal || undefined,
    celular: form.celular || undefined,
    nomeContato: form.nomeContato || undefined,
  });

  const executarSalvar = () => {
    const payload = buildPayload();
    if (editandoId) {
      updateMutation.mutate({ id: editandoId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleSubmit = async () => {
    if (!form.nome.trim()) { toast.error("Nome é obrigatório."); return; }
    // Verificar duplicidade antes de salvar
    try {
      const resultado = await checkDuplicate.refetch();
      const encontrados = resultado.data ?? [];
      if (encontrados.length > 0) {
        setDuplicados(encontrados);
        setConfirmandoDuplicidade(true);
        return;
      }
    } catch {
      // Se falhar a verificação, prosseguir com o salvamento
    }
    executarSalvar();
  };

  const clientesFiltrados = clientes.filter(c => {
    const statusOk = showArquivados
      ? (c as any).statusRegistro === 'arquivado'
      : ((c as any).statusRegistro ?? 'ativo') !== 'arquivado';
    const buscaOk =
      c.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (c.cpfCnpj ?? "").includes(busca) ||
      (c.email ?? "").toLowerCase().includes(busca.toLowerCase()) ||
      (c.cidade ?? "").toLowerCase().includes(busca.toLowerCase());
    return statusOk && buscaOk;
  });

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
        {podeCriar && (
          <Button onClick={abrirNovo} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Cadastro
          </Button>
        )}
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

      {/* Busca + Filtro arquivados */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, CPF/CNPJ, e-mail ou cidade..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant={showArquivados ? "default" : "outline"}
          size="sm"
          className="gap-2"
          onClick={() => setShowArquivados(v => !v)}
        >
          <Archive className="h-4 w-4" />
          {showArquivados ? "Ver Ativos" : "Ver Arquivados"}
        </Button>
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
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:text-blue-700" title="Ver Detalhes" onClick={() => navigate(`/clientes/${c.id}`)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {podeEditar && (c as any).statusRegistro !== 'arquivado' && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => abrirEditar(c)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {podeEditar && (
                        (c as any).statusRegistro === 'arquivado' ? (
                          <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8 text-green-600 hover:text-green-700"
                            title="Restaurar"
                            onClick={() => desarquivarMutation.mutate({ id: c.id })}
                          >
                            <ArchiveRestore className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8 text-orange-500 hover:text-orange-600"
                            title="Arquivar"
                            onClick={() => { if (confirm(`Arquivar "${c.nome}"?`)) arquivarMutation.mutate({ id: c.id }); }}
                          >
                            <Archive className="h-3.5 w-3.5" />
                          </Button>
                        )
                      )}
                      {podeExcluir && (
                        <Button
                          variant="ghost" size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setConfirmDeleteId(c.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
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
            {/* Tipo e Tipo Pessoa */}
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
            <div className="space-y-1.5">
              <Label>Pessoa Física / Jurídica</Label>
              <Select value={form.tipoPessoa} onValueChange={(v) => setForm(f => ({ ...f, tipoPessoa: v as "PF" | "PJ" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PF">PF — Pessoa Física</SelectItem>
                  <SelectItem value="PJ">PJ — Pessoa Jurídica</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Segmento */}
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Segmento de Atuação</Label>
              <Input
                value={form.segmento}
                onChange={(e) => setForm(f => ({ ...f, segmento: e.target.value }))}
                placeholder="Ex: Construção Civil, Energia Elétrica, Telecomunicações..."
              />
            </div>
            {/* CPF/CNPJ */}
            <div className="space-y-1.5">
              <Label>{form.tipoPessoa === "PF" ? "CPF" : "CNPJ"}</Label>
              <MaskedInput
                mask={form.tipoPessoa === "PF" ? "cpf" : "cnpj"}
                value={form.cpfCnpj}
                onChange={(v) => setForm(f => ({ ...f, cpfCnpj: v }))}
                placeholder={form.tipoPessoa === "PF" ? "000.000.000-00" : "00.000.000/0001-00"}
              />
            </div>
            {/* Insc. Estadual (apenas PJ) */}
            {form.tipoPessoa === "PJ" && (
              <div className="space-y-1.5">
                <Label>Inscrição Estadual</Label>
                <Input
                  value={form.inscricaoEstadual}
                  onChange={(e) => setForm(f => ({ ...f, inscricaoEstadual: e.target.value }))}
                  placeholder="Isento ou número"
                />
              </div>
            )}
            {form.tipoPessoa === "PJ" && (
              <div className="space-y-1.5">
                <Label>Inscrição Municipal</Label>
                <Input
                  value={form.inscricaoMunicipal}
                  onChange={(e) => setForm(f => ({ ...f, inscricaoMunicipal: e.target.value }))}
                  placeholder="Número do alvará"
                />
              </div>
            )}
            {/* Email */}
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input
                value={form.email}
                onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="contato@empresa.com.br"
              />
            </div>
            {/* Telefone e Celular */}
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <MaskedInput
                mask="telefone"
                value={form.telefone}
                onChange={(v) => setForm(f => ({ ...f, telefone: v }))}
                placeholder="(61) 3333-3333"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Celular / WhatsApp</Label>
              <MaskedInput
                mask="telefone"
                value={form.celular}
                onChange={(v) => setForm(f => ({ ...f, celular: v }))}
                placeholder="(61) 99999-9999"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nome do Contato</Label>
              <Input
                value={form.nomeContato}
                onChange={(e) => setForm(f => ({ ...f, nomeContato: e.target.value }))}
                placeholder="Responsável comercial"
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
            {/* Dados Bancários */}
            <div className="sm:col-span-2">
              <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Dados Bancários e Pix
                  <span className="ml-2 text-xs font-normal normal-case">(preenchimento automático em Pagamentos)</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Banco</Label>
                    <Input
                      value={form.banco}
                      onChange={(e) => setForm(f => ({ ...f, banco: e.target.value }))}
                      placeholder="Ex: Nubank, Bradesco, BB"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tipo de Conta</Label>
                    <Select
                      value={form.tipoConta || "_none"}
                      onValueChange={(v) => setForm(f => ({ ...f, tipoConta: v === "_none" ? "" : v as any }))}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Não informar</SelectItem>
                        <SelectItem value="corrente">Conta Corrente</SelectItem>
                        <SelectItem value="poupanca">Conta Poupança</SelectItem>
                        <SelectItem value="pagamento">Conta Pagamento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Agência</Label>
                    <Input
                      value={form.agencia}
                      onChange={(e) => setForm(f => ({ ...f, agencia: e.target.value }))}
                      placeholder="0000"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Número da Conta</Label>
                    <Input
                      value={form.conta}
                      onChange={(e) => setForm(f => ({ ...f, conta: e.target.value }))}
                      placeholder="00000-0"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tipo de Chave Pix</Label>
                    <Select
                      value={form.tipoPix || "_none"}
                      onValueChange={(v) => setForm(f => ({ ...f, tipoPix: v === "_none" ? "" : v as TipoPix }))}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Não informar</SelectItem>
                        {TIPOS_PIX.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Chave Pix</Label>
                    <Input
                      value={form.chavePix}
                      onChange={(e) => setForm(f => ({ ...f, chavePix: e.target.value }))}
                      placeholder="CPF, e-mail, telefone..."
                    />
                  </div>
                </div>
              </div>
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
          {/* Anexos do Cliente */}
          {editandoId && (
            <div className="space-y-2 px-1 pb-2">
              <p className="text-sm font-medium flex items-center gap-2">
                <span>Anexos</span>
                <span className="text-xs text-muted-foreground font-normal">(contratos, documentos, certidões)</span>
              </p>
              <AnexosPanel modulo="cliente" registroId={editandoId} podeAnexar podeExcluir />
            </div>
          )}
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

      {/* Dialog de confirmidade - alerta de possível duplicidade */}
      <Dialog open={confirmandoDuplicidade} onOpenChange={(o) => { if (!o) { setConfirmandoDuplicidade(false); setDuplicados([]); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Possível Duplicidade Detectada
            </DialogTitle>
            <DialogDescription>
              Foram encontrados cadastros com o mesmo nome ou CPF/CNPJ:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {duplicados.map(d => (
              <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg border bg-amber-50 border-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{d.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.tipo}{d.cpfCnpj ? ` · ${d.cpfCnpj}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Deseja prosseguir mesmo assim e criar um novo cadastro?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setConfirmandoDuplicidade(false); setDuplicados([]); }}>
              Cancelar
            </Button>
            <Button
              variant="default"
              className="bg-amber-600 hover:bg-amber-700"
              onClick={() => { setConfirmandoDuplicidade(false); setDuplicados([]); executarSalvar(); }}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              Prosseguir mesmo assim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão com senha master */}
      <ConfirmDeleteDialog
        open={!!confirmDeleteId}
        onOpenChange={(o) => { if (!o) setConfirmDeleteId(null); }}
        title="Excluir Cliente"
        description="Esta ação não pode ser desfeita. O cliente e todos os dados vinculados serão removidos permanentemente."
        requireMasterPassword
        loading={deleteMutation.isPending}
        onConfirm={() => { if (confirmDeleteId) deleteMutation.mutate({ id: confirmDeleteId }); }}
      />
    </div>
    </DashboardLayout>
  );
}
