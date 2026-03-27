import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Edit, Trash2, CreditCard, Clock, AlertCircle, CheckCircle, XCircle } from "lucide-react";

// ─── Formas de Pagamento ──────────────────────────────────────────────────────

function FormasPagamento() {
  const utils = trpc.useUtils();
  const { data: formas = [], isLoading } = trpc.propostas.listFormasPagamentoAll.useQuery();
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ nome: "", descricao: "" });

  const createMutation = trpc.propostas.createFormaPagamento.useMutation({
    onSuccess: () => { toast.success("Forma de pagamento criada!"); utils.propostas.listFormasPagamentoAll.invalidate(); utils.propostas.listFormasPagamento.invalidate(); closeModal(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.propostas.updateFormaPagamento.useMutation({
    onSuccess: () => { toast.success("Forma de pagamento atualizada!"); utils.propostas.listFormasPagamentoAll.invalidate(); utils.propostas.listFormasPagamento.invalidate(); closeModal(); },
    onError: (e) => toast.error(e.message),
  });
  const toggleMutation = trpc.propostas.updateFormaPagamento.useMutation({
    onSuccess: () => { utils.propostas.listFormasPagamentoAll.invalidate(); utils.propostas.listFormasPagamento.invalidate(); },
  });

  function openCreate() { setEditItem(null); setForm({ nome: "", descricao: "" }); setModalOpen(true); }
  function openEdit(item: any) { setEditItem(item); setForm({ nome: item.nome, descricao: item.descricao ?? "" }); setModalOpen(true); }
  function closeModal() { setModalOpen(false); setEditItem(null); }

  function handleSubmit() {
    if (!form.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, nome: form.nome, descricao: form.descricao });
    } else {
      createMutation.mutate({ nome: form.nome, descricao: form.descricao });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Cadastre formas de pagamento para usar nas propostas (ex: Pix, Boleto, Cartão 3x)</p>
        <Button size="sm" onClick={openCreate} className="gap-2"><Plus className="w-4 h-4" /> Nova Forma</Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : (formas as any[]).length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>Nenhuma forma de pagamento cadastrada.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(formas as any[]).map((f: any) => (
            <div key={f.id} className={`flex items-center justify-between p-3 border rounded-lg ${f.ativo ? "bg-white" : "bg-muted/30 opacity-60"}`}>
              <div className="flex items-center gap-3">
                <CreditCard className="w-4 h-4 text-blue-600" />
                <div>
                  <div className="font-medium text-sm">{f.nome}</div>
                  {f.descricao && <div className="text-xs text-muted-foreground">{f.descricao}</div>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={f.ativo ? "default" : "secondary"} className="text-xs">
                  {f.ativo ? "Ativo" : "Inativo"}
                </Badge>
                <Button variant="ghost" size="sm" onClick={() => openEdit(f)}><Edit className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => toggleMutation.mutate({ id: f.id, nome: f.nome, ativo: !f.ativo })} title={f.ativo ? "Desativar" : "Ativar"}>
                  {f.ativo ? <XCircle className="w-4 h-4 text-red-500" /> : <CheckCircle className="w-4 h-4 text-green-500" />}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={(o) => { if (!o) closeModal(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editItem ? "Editar Forma de Pagamento" : "Nova Forma de Pagamento"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Ex: Pix à vista, Boleto 30 dias, Cartão 3x sem juros" />
            </div>
            <div>
              <Label>Descrição (aparece na proposta)</Label>
              <Textarea value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} rows={3} placeholder="Descreva os detalhes desta forma de pagamento..." />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={closeModal}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editItem ? "Salvar" : "Criar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Prazos ───────────────────────────────────────────────────────────────────

function Prazos() {
  const utils = trpc.useUtils();
  const { data: prazos = [], isLoading } = trpc.propostas.listPrazosAll.useQuery();
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ nome: "", descricao: "", diasPrazo: "" });

  const createMutation = trpc.propostas.createPrazo.useMutation({
    onSuccess: () => { toast.success("Prazo criado!"); utils.propostas.listPrazosAll.invalidate(); utils.propostas.listPrazos.invalidate(); closeModal(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.propostas.updatePrazo.useMutation({
    onSuccess: () => { toast.success("Prazo atualizado!"); utils.propostas.listPrazosAll.invalidate(); utils.propostas.listPrazos.invalidate(); closeModal(); },
    onError: (e) => toast.error(e.message),
  });
  const toggleMutation = trpc.propostas.updatePrazo.useMutation({
    onSuccess: () => { utils.propostas.listPrazosAll.invalidate(); utils.propostas.listPrazos.invalidate(); },
  });

  function openCreate() { setEditItem(null); setForm({ nome: "", descricao: "", diasPrazo: "" }); setModalOpen(true); }
  function openEdit(item: any) { setEditItem(item); setForm({ nome: item.nome, descricao: item.descricao ?? "", diasPrazo: item.diasPrazo ? String(item.diasPrazo) : "" }); setModalOpen(true); }
  function closeModal() { setModalOpen(false); setEditItem(null); }

  function handleSubmit() {
    if (!form.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    const payload = { nome: form.nome, descricao: form.descricao, diasPrazo: form.diasPrazo ? parseInt(form.diasPrazo) : undefined };
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Cadastre prazos de execução para usar nas propostas (ex: 30 dias corridos, imediato)</p>
        <Button size="sm" onClick={openCreate} className="gap-2"><Plus className="w-4 h-4" /> Novo Prazo</Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : (prazos as any[]).length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>Nenhum prazo cadastrado.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(prazos as any[]).map((p: any) => (
            <div key={p.id} className={`flex items-center justify-between p-3 border rounded-lg ${p.ativo ? "bg-white" : "bg-muted/30 opacity-60"}`}>
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-blue-600" />
                <div>
                  <div className="font-medium text-sm">{p.nome} {p.diasPrazo ? <span className="text-muted-foreground font-normal">({p.diasPrazo} dias)</span> : ""}</div>
                  {p.descricao && <div className="text-xs text-muted-foreground">{p.descricao}</div>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={p.ativo ? "default" : "secondary"} className="text-xs">{p.ativo ? "Ativo" : "Inativo"}</Badge>
                <Button variant="ghost" size="sm" onClick={() => openEdit(p)}><Edit className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => toggleMutation.mutate({ id: p.id, nome: p.nome, ativo: !p.ativo })} title={p.ativo ? "Desativar" : "Ativar"}>
                  {p.ativo ? <XCircle className="w-4 h-4 text-red-500" /> : <CheckCircle className="w-4 h-4 text-green-500" />}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={(o) => { if (!o) closeModal(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editItem ? "Editar Prazo" : "Novo Prazo"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Ex: 30 dias corridos, Imediato, 60 dias úteis" />
            </div>
            <div>
              <Label>Dias (opcional)</Label>
              <Input type="number" value={form.diasPrazo} onChange={(e) => setForm((f) => ({ ...f, diasPrazo: e.target.value }))} placeholder="Ex: 30" />
            </div>
            <div>
              <Label>Descrição completa (aparece na proposta)</Label>
              <Textarea value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} rows={4} placeholder="Descreva o prazo em detalhes para o cliente..." />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={closeModal}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editItem ? "Salvar" : "Criar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Informações Importantes ──────────────────────────────────────────────────

function InfosImportantes() {
  const utils = trpc.useUtils();
  const { data: infos = [], isLoading } = trpc.propostas.listInfoImportantesAll.useQuery();
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ titulo: "", conteudo: "" });

  const createMutation = trpc.propostas.createInfoImportante.useMutation({
    onSuccess: () => { toast.success("Cláusula criada!"); utils.propostas.listInfoImportantesAll.invalidate(); utils.propostas.listInfoImportantes.invalidate(); closeModal(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.propostas.updateInfoImportante.useMutation({
    onSuccess: () => { toast.success("Cláusula atualizada!"); utils.propostas.listInfoImportantesAll.invalidate(); utils.propostas.listInfoImportantes.invalidate(); closeModal(); },
    onError: (e) => toast.error(e.message),
  });
  const toggleMutation = trpc.propostas.updateInfoImportante.useMutation({
    onSuccess: () => { utils.propostas.listInfoImportantesAll.invalidate(); utils.propostas.listInfoImportantes.invalidate(); },
  });

  function openCreate() { setEditItem(null); setForm({ titulo: "", conteudo: "" }); setModalOpen(true); }
  function openEdit(item: any) { setEditItem(item); setForm({ titulo: item.titulo, conteudo: item.conteudo }); setModalOpen(true); }
  function closeModal() { setModalOpen(false); setEditItem(null); }

  function handleSubmit() {
    if (!form.titulo.trim() || !form.conteudo.trim()) { toast.error("Título e conteúdo são obrigatórios"); return; }
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, titulo: form.titulo, conteudo: form.conteudo });
    } else {
      createMutation.mutate({ titulo: form.titulo, conteudo: form.conteudo });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Cadastre cláusulas e informações padrão para inserir rapidamente nas propostas</p>
        <Button size="sm" onClick={openCreate} className="gap-2"><Plus className="w-4 h-4" /> Nova Cláusula</Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : (infos as any[]).length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>Nenhuma cláusula cadastrada.</p>
          <p className="text-xs mt-1">Crie cláusulas padrão como garantias, condições gerais, responsabilidades, etc.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(infos as any[]).map((info: any) => (
            <div key={info.id} className={`border rounded-lg p-3 ${info.ativo ? "bg-white" : "bg-muted/30 opacity-60"}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="font-semibold text-sm">{info.titulo}</span>
                    <Badge variant={info.ativo ? "default" : "secondary"} className="text-xs">{info.ativo ? "Ativo" : "Inativo"}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 ml-6 line-clamp-2">{info.conteudo}</p>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(info)}><Edit className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => toggleMutation.mutate({ id: info.id, titulo: info.titulo, conteudo: info.conteudo, ativo: !info.ativo })} title={info.ativo ? "Desativar" : "Ativar"}>
                    {info.ativo ? <XCircle className="w-4 h-4 text-red-500" /> : <CheckCircle className="w-4 h-4 text-green-500" />}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={(o) => { if (!o) closeModal(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editItem ? "Editar Cláusula" : "Nova Cláusula"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Título *</Label>
              <Input value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} placeholder="Ex: Garantia, Responsabilidades, Validade da Proposta" />
            </div>
            <div>
              <Label>Conteúdo *</Label>
              <Textarea value={form.conteudo} onChange={(e) => setForm((f) => ({ ...f, conteudo: e.target.value }))} rows={6} placeholder="Digite o texto completo da cláusula..." />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={closeModal}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editItem ? "Salvar" : "Criar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────

export default function PropostasConfig() {
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configurações de Propostas</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie formas de pagamento, prazos e cláusulas pré-cadastradas para agilizar a criação de propostas</p>
        </div>

        <Tabs defaultValue="pagamentos">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pagamentos" className="gap-2"><CreditCard className="w-4 h-4" /> Formas de Pagamento</TabsTrigger>
            <TabsTrigger value="prazos" className="gap-2"><Clock className="w-4 h-4" /> Prazos de Execução</TabsTrigger>
            <TabsTrigger value="clausulas" className="gap-2"><AlertCircle className="w-4 h-4" /> Cláusulas Padrão</TabsTrigger>
          </TabsList>

          <TabsContent value="pagamentos">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-600" /> Formas de Pagamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FormasPagamento />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prazos">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" /> Prazos de Execução
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Prazos />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clausulas">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-500" /> Cláusulas e Informações Importantes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <InfosImportantes />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
