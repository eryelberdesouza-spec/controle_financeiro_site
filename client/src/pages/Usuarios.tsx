import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Copy,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  AlertCircle,
} from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  operador: "Operador",
  user: "Usuário",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-100 text-red-700 border-red-200",
  operador: "bg-blue-100 text-blue-700 border-blue-200",
  user: "bg-gray-100 text-gray-700 border-gray-200",
};

const STATUS_CONVITE_COLORS: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-700 border-yellow-200",
  aceito: "bg-green-100 text-green-700 border-green-200",
  expirado: "bg-gray-100 text-gray-500 border-gray-200",
};

export default function Usuarios() {
  const { user: currentUser } = useAuth();
  const utils = trpc.useUtils();

  const [showConviteDialog, setShowConviteDialog] = useState(false);
  const [conviteEmail, setConviteEmail] = useState("");
  const [conviteNome, setConviteNome] = useState("");
  const [conviteRole, setConviteRole] = useState<"admin" | "operador" | "user">("operador");
  const [conviteLink, setConviteLink] = useState<string | null>(null);

  const { data: usuarios = [], isLoading: loadingUsuarios } = trpc.usuarios.list.useQuery();
  const { data: convites = [], isLoading: loadingConvites } = trpc.convites.list.useQuery();

  const updateRole = trpc.usuarios.updateRole.useMutation({
    onSuccess: () => { utils.usuarios.list.invalidate(); toast.success("Nível de acesso atualizado!"); },
    onError: (e) => toast.error(e.message),
  });

  const toggleAtivo = trpc.usuarios.toggleAtivo.useMutation({
    onSuccess: (_, vars) => {
      utils.usuarios.list.invalidate();
      toast.success(vars.ativo ? "Usuário ativado!" : "Usuário desativado!");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteUsuario = trpc.usuarios.delete.useMutation({
    onSuccess: () => { utils.usuarios.list.invalidate(); toast.success("Usuário removido."); },
    onError: (e) => toast.error(e.message),
  });

  const criarConvite = trpc.convites.create.useMutation({
    onSuccess: (data) => {
      utils.convites.list.invalidate();
      setConviteLink(data.link);
      toast.success("Convite criado! Copie o link abaixo.");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteConvite = trpc.convites.delete.useMutation({
    onSuccess: () => { utils.convites.list.invalidate(); toast.success("Convite removido."); },
    onError: (e) => toast.error(e.message),
  });

  const handleCriarConvite = () => {
    if (!conviteEmail) return toast.error("Informe o e-mail do convidado.");
    setConviteLink(null);
    criarConvite.mutate({ email: conviteEmail, nome: conviteNome || undefined, role: conviteRole });
  };

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast.success("Link copiado para a área de transferência!");
  };

  const handleFecharConviteDialog = () => {
    setShowConviteDialog(false);
    setConviteEmail("");
    setConviteNome("");
    setConviteRole("operador");
    setConviteLink(null);
  };

  const formatDate = (d: Date | string | null | undefined) =>
    d ? new Date(d).toLocaleDateString("pt-BR") : "—";

  if (currentUser?.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <AlertCircle className="h-12 w-12 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Acesso Restrito</h2>
          <p className="text-muted-foreground text-center max-w-sm">
            Apenas administradores podem gerenciar usuários.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-600" />
              Gestão de Usuários
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Gerencie usuários, níveis de acesso e convites de acesso ao sistema.
            </p>
          </div>
          <Button
            onClick={() => setShowConviteDialog(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Convidar Usuário
          </Button>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-5 flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total de Usuários</p>
                <p className="text-2xl font-bold text-gray-900">{usuarios.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <ShieldCheck className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Administradores</p>
                <p className="text-2xl font-bold text-gray-900">
                  {usuarios.filter((u) => u.role === "admin").length}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Mail className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Convites Pendentes</p>
                <p className="text-2xl font-bold text-gray-900">
                  {convites.filter((c) => c.status === "pendente").length}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="usuarios">
          <TabsList>
            <TabsTrigger value="usuarios">
              <Users className="w-4 h-4 mr-2" />
              Usuários ({usuarios.length})
            </TabsTrigger>
            <TabsTrigger value="convites">
              <Mail className="w-4 h-4 mr-2" />
              Convites ({convites.length})
            </TabsTrigger>
          </TabsList>

          {/* Aba Usuários */}
          <TabsContent value="usuarios">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Usuários Cadastrados</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loadingUsuarios ? (
                  <p className="p-6 text-gray-500 text-sm">Carregando...</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead className="hidden md:table-cell">E-mail</TableHead>
                          <TableHead>Nível de Acesso</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="hidden lg:table-cell">Último Acesso</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {usuarios.map((u) => {
                          const isSelf = u.id === currentUser?.id;
                          const ativo = (u as any).ativo !== false;
                          return (
                            <TableRow key={u.id} className={!ativo ? "opacity-50" : ""}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                    <span className="text-xs font-bold text-blue-600">
                                      {(u.name ?? "?").charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <div>
                                    <p>{u.name ?? "Sem nome"}</p>
                                    {isSelf && (
                                      <p className="text-xs text-gray-400">(você)</p>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-gray-600 hidden md:table-cell">
                                {u.email ?? "—"}
                              </TableCell>
                              <TableCell>
                                {isSelf ? (
                                  <Badge className={`text-xs border ${ROLE_COLORS[u.role]}`}>
                                    {ROLE_LABELS[u.role]}
                                  </Badge>
                                ) : (
                                  <Select
                                    value={u.role}
                                    onValueChange={(v) =>
                                      updateRole.mutate({ id: u.id, role: v as any })
                                    }
                                  >
                                    <SelectTrigger className="w-40 h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="admin">Administrador</SelectItem>
                                      <SelectItem value="operador">Operador</SelectItem>
                                      <SelectItem value="user">Usuário</SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={`text-xs border ${
                                    ativo
                                      ? "bg-green-100 text-green-700 border-green-200"
                                      : "bg-gray-100 text-gray-500 border-gray-200"
                                  }`}
                                >
                                  {ativo ? "Ativo" : "Inativo"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-gray-500 text-sm hidden lg:table-cell">
                                {formatDate(u.lastSignedIn)}
                              </TableCell>
                              <TableCell className="text-right">
                                {!isSelf && (
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      title={ativo ? "Desativar usuário" : "Ativar usuário"}
                                      onClick={() =>
                                        toggleAtivo.mutate({ id: u.id, ativo: !ativo })
                                      }
                                    >
                                      {ativo ? (
                                        <ToggleRight className="w-4 h-4 text-green-600" />
                                      ) : (
                                        <ToggleLeft className="w-4 h-4 text-gray-400" />
                                      )}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                                      title="Remover usuário"
                                      onClick={() => {
                                        if (
                                          confirm(
                                            `Remover o usuário "${u.name}"? Esta ação não pode ser desfeita.`
                                          )
                                        )
                                          deleteUsuario.mutate({ id: u.id });
                                      }}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {!loadingUsuarios && usuarios.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                              Nenhum usuário encontrado. Os usuários aparecem aqui após o primeiro login.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Legenda de níveis */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4 text-gray-500" />
                  Níveis de Acesso
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                    <div className="flex items-center gap-2 font-semibold text-red-700 mb-1">
                      <ShieldCheck className="w-4 h-4" /> Administrador
                    </div>
                    <p className="text-gray-600 text-xs">
                      Acesso total: cadastrar, editar, excluir, aprovar pagamentos, gerenciar
                      usuários e configurações da empresa.
                    </p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="flex items-center gap-2 font-semibold text-blue-700 mb-1">
                      <Shield className="w-4 h-4" /> Operador
                    </div>
                    <p className="text-gray-600 text-xs">
                      Pode cadastrar e editar pagamentos e recebimentos. Não pode excluir registros
                      nem gerenciar usuários.
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex items-center gap-2 font-semibold text-gray-700 mb-1">
                      <ShieldAlert className="w-4 h-4" /> Usuário
                    </div>
                    <p className="text-gray-600 text-xs">
                      Somente leitura: visualiza pagamentos, recebimentos e relatórios, mas não pode
                      realizar alterações.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Aviso sobre acesso */}
            <Card className="mt-4 bg-amber-50 border-amber-200">
              <CardContent className="p-4 flex gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800">Como funciona o acesso?</p>
                  <p className="text-amber-700 mt-1">
                    Para convidar um novo usuário, clique em <strong>"Convidar Usuário"</strong> e
                    informe o e-mail e o nível de acesso. Um link único será gerado — compartilhe-o
                    com o convidado. Após o primeiro login, o usuário aparecerá nesta lista e você
                    poderá ajustar o nível de acesso a qualquer momento.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Convites */}
          <TabsContent value="convites">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Convites Enviados</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loadingConvites ? (
                  <p className="p-6 text-gray-500 text-sm">Carregando...</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>E-mail</TableHead>
                          <TableHead>Nível</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Expira em</TableHead>
                          <TableHead>Criado em</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {convites.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell className="font-medium">{c.nome ?? "—"}</TableCell>
                            <TableCell className="text-gray-600">{c.email}</TableCell>
                            <TableCell>
                              <Badge className={`text-xs border ${ROLE_COLORS[c.role]}`}>
                                {ROLE_LABELS[c.role]}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={`text-xs border flex items-center gap-1 w-fit ${STATUS_CONVITE_COLORS[c.status]}`}
                              >
                                {c.status === "pendente" && <Clock className="w-3 h-3" />}
                                {c.status === "aceito" && <CheckCircle className="w-3 h-3" />}
                                {c.status === "expirado" && <XCircle className="w-3 h-3" />}
                                {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-gray-500">
                              {formatDate(c.expiresAt)}
                            </TableCell>
                            <TableCell className="text-sm text-gray-500">
                              {formatDate(c.createdAt)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {c.status === "pendente" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-blue-500"
                                    title="Copiar link do convite"
                                    onClick={() => {
                                      const link = `${window.location.origin}/convite/${c.token}`;
                                      handleCopyLink(link);
                                    }}
                                  >
                                    <Copy className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                                  title="Remover convite"
                                  onClick={() => deleteConvite.mutate({ id: c.id })}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {!loadingConvites && convites.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                              Nenhum convite enviado ainda. Clique em "Convidar Usuário" para começar.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog de Criar Convite */}
      <Dialog open={showConviteDialog} onOpenChange={handleFecharConviteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-600" />
              Convidar Novo Usuário
            </DialogTitle>
          </DialogHeader>

          {!conviteLink ? (
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <Label htmlFor="convite-nome">Nome (opcional)</Label>
                <Input
                  id="convite-nome"
                  placeholder="Nome do convidado"
                  value={conviteNome}
                  onChange={(e) => setConviteNome(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="convite-email">
                  E-mail <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="convite-email"
                  type="email"
                  placeholder="email@empresa.com"
                  value={conviteEmail}
                  onChange={(e) => setConviteEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="convite-role">Nível de Acesso</Label>
                <Select
                  value={conviteRole}
                  onValueChange={(v) => setConviteRole(v as any)}
                >
                  <SelectTrigger id="convite-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador — acesso total</SelectItem>
                    <SelectItem value="operador">Operador — cadastrar e editar</SelectItem>
                    <SelectItem value="user">Usuário — somente leitura</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-gray-500">
                Um link de convite será gerado com validade de <strong>7 dias</strong>. Compartilhe
                o link com o convidado para que ele possa acessar o sistema.
              </p>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700 font-medium mb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Convite criado com sucesso!
                </p>
                <p className="text-xs text-gray-600 mb-3">
                  Copie o link abaixo e envie para <strong>{conviteEmail}</strong>. O link expira em
                  7 dias.
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    value={conviteLink}
                    readOnly
                    className="text-xs font-mono bg-white"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => handleCopyLink(conviteLink)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                O usuário precisará acessar o link e fazer login com a conta Manus para ativar o
                acesso.
              </p>
            </div>
          )}

          <DialogFooter>
            {!conviteLink ? (
              <>
                <Button variant="outline" onClick={handleFecharConviteDialog}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleCriarConvite}
                  disabled={criarConvite.isPending || !conviteEmail}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {criarConvite.isPending ? "Gerando..." : "Gerar Link de Convite"}
                </Button>
              </>
            ) : (
              <Button onClick={handleFecharConviteDialog} className="bg-blue-600 text-white">
                Fechar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
