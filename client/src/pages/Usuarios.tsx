import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Separator } from "@/components/ui/separator";
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
  Settings2,
  RotateCcw,
  Eye,
  EyeOff,
  PlusCircle,
  Pencil,
  Ban,
  Wrench,
  KeyRound,
} from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  operador: "Operador",
  operacional: "Operacional",
  user: "Usuário",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-100 text-red-700 border-red-200",
  operador: "bg-blue-100 text-blue-700 border-blue-200",
  operacional: "bg-purple-100 text-purple-700 border-purple-200",
  user: "bg-gray-100 text-gray-700 border-gray-200",
};

const STATUS_CONVITE_COLORS: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-700 border-yellow-200",
  aceito: "bg-green-100 text-green-700 border-green-200",
  expirado: "bg-gray-100 text-gray-500 border-gray-200",
};

const ACAO_LABELS = [
  { key: "podeVer", label: "Visualizar", icon: Eye },
  { key: "podeCriar", label: "Criar", icon: PlusCircle },
  { key: "podeEditar", label: "Editar", icon: Pencil },
  { key: "podeExcluir", label: "Excluir", icon: Ban },
] as const;

type PermMap = Record<string, { podeVer: boolean; podeCriar: boolean; podeEditar: boolean; podeExcluir: boolean }>;

export default function Usuarios() {
  const { user: currentUser } = useAuth();
  const utils = trpc.useUtils();

  const [showConviteDialog, setShowConviteDialog] = useState(false);
  const [conviteEmail, setConviteEmail] = useState("");
  const [conviteNome, setConviteNome] = useState("");
  const [conviteRole, setConviteRole] = useState<"admin" | "operador" | "operacional" | "user">("operacional");
  const [convitePerfilAcesso, setConvitePerfilAcesso] = useState<string>("operacional");
  const [conviteLink, setConviteLink] = useState<string | null>(null);

  // Estado para o modal de definição de senha (admin)
  const [senhaModalUser, setSenhaModalUser] = useState<{ id: number; name: string } | null>(null);
  const [novaSenhaAdmin, setNovaSenhaAdmin] = useState("");
  const [mostrarSenhaAdmin, setMostrarSenhaAdmin] = useState(false);

  // Estado para o modal de permissões
  const [permModalUser, setPermModalUser] = useState<{ id: number; name: string; role: string } | null>(null);
  const [editPerms, setEditPerms] = useState<PermMap>({});

  const { data: usuarios = [], isLoading: loadingUsuarios } = trpc.usuarios.list.useQuery();
  const { data: convites = [], isLoading: loadingConvites } = trpc.convites.list.useQuery();
  const { data: modulos = [] } = trpc.permissoes.modulos.useQuery();

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

  const setPermissions = trpc.permissoes.setPermissions.useMutation({
    onSuccess: () => {
      toast.success("Permissões salvas com sucesso!");
      setPermModalUser(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const resetPermissions = trpc.permissoes.resetPermissions.useMutation({
    onSuccess: () => {
      toast.success("Permissões resetadas para o padrão do nível de acesso.");
      setPermModalUser(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const adminSetPassword = trpc.auth.adminSetPassword.useMutation({
    onSuccess: () => {
      toast.success("Senha definida com sucesso!");
      setSenhaModalUser(null);
      setNovaSenhaAdmin("");
    },
    onError: (e) => toast.error(e.message),
  });

  const setRole = trpc.permissoes.setRole.useMutation({
    onSuccess: () => {
      utils.usuarios.list.invalidate();
      toast.success("Nível de acesso atualizado! Permissões resetadas para o padrão.");
    },
    onError: (e) => toast.error(e.message),
  });

  const { data: perfisDisponiveis = [] } = trpc.permissoes.getPerfis.useQuery();

  const applyPerfil = trpc.permissoes.applyPerfil.useMutation({
    onSuccess: (data) => {
      toast.success(`Perfil "${data.perfilLabel}" aplicado! Salve para confirmar.`);
      // Recarrega as permissões do usuário após aplicar o perfil
      utils.permissoes.getByUser.invalidate({ userId: permModalUser?.id ?? 0 });
    },
    onError: (e) => toast.error(e.message),
  });

  // Query de permissões do usuário selecionado (lazy)
  const { data: userPerms, isLoading: loadingPerms } = trpc.permissoes.getByUser.useQuery(
    { userId: permModalUser?.id ?? 0 },
    { enabled: !!permModalUser }
  );

  // Quando as permissões carregam, inicializa o estado de edição
  const openPermModal = (u: { id: number; name: string | null; role: string }) => {
    setPermModalUser({ id: u.id, name: u.name ?? "Sem nome", role: u.role });
  };

  // Sincroniza editPerms quando userPerms carrega
  if (userPerms && permModalUser && Object.keys(editPerms).length === 0) {
    setEditPerms(userPerms as PermMap);
  }

  const handleClosePermModal = () => {
    setPermModalUser(null);
    setEditPerms({});
  };

  const handleSavePerms = () => {
    if (!permModalUser) return;
    const permissions = Object.entries(editPerms).map(([modulo, perms]) => ({
      modulo,
      ...perms,
    }));
    setPermissions.mutate({ userId: permModalUser.id, permissions });
  };

  const handleResetPerms = () => {
    if (!permModalUser) return;
    if (confirm("Resetar as permissões para o padrão do nível de acesso? As customizações serão perdidas.")) {
      resetPermissions.mutate({ userId: permModalUser.id });
    }
  };

  const togglePerm = (modulo: string, acao: keyof PermMap[string]) => {
    setEditPerms(prev => ({
      ...prev,
      [modulo]: {
        ...prev[modulo],
        [acao]: !prev[modulo]?.[acao],
      },
    }));
  };

  // Marcar/desmarcar toda a linha de um módulo
  const toggleModulo = (modulo: string, value: boolean) => {
    setEditPerms(prev => ({
      ...prev,
      [modulo]: {
        podeVer: value,
        podeCriar: value,
        podeEditar: value,
        podeExcluir: value,
      },
    }));
  };

  const handleCriarConvite = () => {
    if (!conviteEmail) return toast.error("Informe o e-mail do convidado.");
    setConviteLink(null);
    criarConvite.mutate({ email: conviteEmail, nome: conviteNome || undefined, role: conviteRole as any, perfilAcesso: convitePerfilAcesso || undefined });
  };

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast.success("Link copiado para a área de transferência!");
  };

  const handleFecharConviteDialog = () => {
    setShowConviteDialog(false);
    setConviteEmail("");
    setConviteNome("");
    setConviteRole("operacional");
    setConvitePerfilAcesso("operacional");
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
              Gerencie usuários, níveis de acesso, permissões granulares e convites.
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-5 flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total</p>
                <p className="text-2xl font-bold text-gray-900">{usuarios.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <ShieldCheck className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Administradores</p>
                <p className="text-2xl font-bold text-gray-900">
                  {usuarios.filter((u) => u.role === "admin").length}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Wrench className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Operacionais</p>
                <p className="text-2xl font-bold text-gray-900">
                  {usuarios.filter((u) => u.role === "operacional").length}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Mail className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Convites Pendentes</p>
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
            <TabsTrigger value="niveis">
              <Shield className="w-4 h-4 mr-2" />
              Níveis de Acesso
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
                                      setRole.mutate({ userId: u.id, role: v as any })
                                    }
                                  >
                                    <SelectTrigger className="w-44 h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="admin">Administrador</SelectItem>
                                      <SelectItem value="operador">Operador</SelectItem>
                                      <SelectItem value="operacional">Operacional</SelectItem>
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
                                    {/* Botão de permissões granulares */}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-green-600 hover:text-green-800"
                                      title="Definir / Resetar senha"
                                      onClick={() => {
                                        setSenhaModalUser({ id: u.id, name: u.name ?? "Sem nome" });
                                        setNovaSenhaAdmin("");
                                        setMostrarSenhaAdmin(false);
                                      }}
                                    >
                                      <KeyRound className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-purple-600 hover:text-purple-800"
                                      title="Gerenciar permissões"
                                      onClick={() => openPermModal(u)}
                                    >
                                      <Settings2 className="w-4 h-4" />
                                    </Button>
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

            {/* Aviso sobre acesso */}
            <Card className="mt-4 bg-amber-50 border-amber-200">
              <CardContent className="p-4 flex gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800">Como funciona o acesso?</p>
                  <p className="text-amber-700 mt-1">
                    Convide usuários com o nível de acesso desejado. Após o primeiro login, ajuste o nível e clique no ícone <strong>⚙</strong> para personalizar as permissões por módulo — defina exatamente o que cada usuário pode visualizar, criar, editar e excluir.
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
                              <Badge className={`text-xs border ${ROLE_COLORS[c.role] ?? ROLE_COLORS.user}`}>
                                {ROLE_LABELS[c.role] ?? c.role}
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

          {/* Aba Níveis de Acesso */}
          <TabsContent value="niveis">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-red-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-red-700">
                    <ShieldCheck className="w-4 h-4" /> Administrador
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-gray-600 space-y-1">
                  <p>Acesso total ao sistema: cadastrar, editar, excluir em todos os módulos.</p>
                  <p>Gerencia usuários, convites, configurações da empresa e permissões.</p>
                  <p>Não pode ter permissões customizadas — sempre tem acesso total.</p>
                </CardContent>
              </Card>
              <Card className="border-blue-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-blue-700">
                    <Shield className="w-4 h-4" /> Operador
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-gray-600 space-y-1">
                  <p>Pode visualizar, criar e editar em todos os módulos.</p>
                  <p><strong>Não pode excluir</strong> registros em nenhum módulo por padrão.</p>
                  <p>Permissões podem ser customizadas individualmente pelo administrador.</p>
                </CardContent>
              </Card>
              <Card className="border-purple-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-purple-700">
                    <Wrench className="w-4 h-4" /> Operacional
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-gray-600 space-y-1">
                  <p><strong>Acesso padrão:</strong> criar e gerenciar Ordens de Serviço, visualizar Contratos e Materiais, cadastrar e editar Clientes/Fornecedores, visualizar Relatórios e Dashboard.</p>
                  <p><strong>Não tem acesso</strong> a Pagamentos e Recebimentos por padrão.</p>
                  <p><strong>Não pode excluir</strong> registros sem autorização do administrador.</p>
                  <p>Permissões podem ser customizadas individualmente pelo administrador.</p>
                </CardContent>
              </Card>
              <Card className="border-gray-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-gray-700">
                    <ShieldAlert className="w-4 h-4" /> Usuário
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-gray-600 space-y-1">
                  <p>Sem acesso por padrão — todas as permissões desativadas.</p>
                  <p>O administrador pode habilitar módulos específicos conforme necessário.</p>
                  <p>Ideal para usuários externos ou de auditoria com acesso pontual.</p>
                </CardContent>
              </Card>
            </div>

            <Card className="mt-4 bg-blue-50 border-blue-200">
              <CardContent className="p-4 flex gap-3">
                <Settings2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-800">Permissões Granulares</p>
                  <p className="text-blue-700 mt-1">
                    Além dos níveis de acesso, você pode personalizar as permissões de cada usuário individualmente. Na aba <strong>Usuários</strong>, clique no ícone <strong>⚙</strong> ao lado de qualquer usuário para definir exatamente quais módulos ele pode visualizar, criar, editar e excluir — independentemente do nível de acesso.
                  </p>
                </div>
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
                    <SelectItem value="operador">Operador — cadastrar e editar tudo</SelectItem>
                    <SelectItem value="operacional">Operacional — OS, clientes e relatórios</SelectItem>
                    <SelectItem value="user">Usuário — sem acesso (customizável)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="convite-perfil">Perfil de Permissões</Label>
                <Select
                  value={convitePerfilAcesso}
                  onValueChange={setConvitePerfilAcesso}
                >
                  <SelectTrigger id="convite-perfil">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="administrativo">Administrativo — acesso completo a todos os módulos</SelectItem>
                    <SelectItem value="financeiro">Financeiro — pagamentos, recebimentos e relatórios</SelectItem>
                    <SelectItem value="engenharia">Engenharia — OS, contratos e materiais</SelectItem>
                    <SelectItem value="operacional">Operacional — OS e clientes (sem financeiro)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">O perfil define quais módulos o usuário poderá acessar. Pode ser personalizado depois.</p>
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

      {/* Dialog de Permissões Granulares */}
      <Dialog open={!!permModalUser} onOpenChange={handleClosePermModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-purple-600" />
              Permissões — {permModalUser?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="py-2 space-y-4">
            {/* Info do usuário */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <span className="text-sm font-bold text-purple-600">
                  {permModalUser?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-900">{permModalUser?.name}</p>
                <Badge className={`text-xs border ${ROLE_COLORS[permModalUser?.role ?? "user"]}`}>
                  {ROLE_LABELS[permModalUser?.role ?? "user"]}
                </Badge>
              </div>
              <div className="ml-auto text-xs text-gray-500 text-right">
                <p>Permissões customizadas sobrescrevem</p>
                <p>o padrão do nível de acesso.</p>
              </div>
            </div>

            <Separator />

            {/* Seletor de Perfil Pré-definido */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs font-semibold text-blue-800 mb-2">Aplicar Perfil Pré-definido</p>
              <p className="text-xs text-blue-700 mb-3">Selecione um perfil para preencher as permissões automaticamente. Você ainda pode ajustar individualmente antes de salvar.</p>
              <div className="flex flex-wrap gap-2">
                {perfisDisponiveis.map(perfil => (
                  <button
                    key={perfil.id}
                    type="button"
                    onClick={() => {
                      if (permModalUser) {
                        applyPerfil.mutate({ userId: permModalUser.id, perfilId: perfil.id });
                      }
                    }}
                    disabled={applyPerfil.isPending}
                    title={perfil.descricao}
                    className="px-3 py-1.5 rounded-full text-xs border border-blue-300 bg-white hover:bg-blue-100 text-blue-700 font-medium transition-colors disabled:opacity-50"
                  >
                    {perfil.label}
                  </button>
                ))}
              </div>
            </div>

            {loadingPerms ? (
              <p className="text-center text-gray-500 py-4">Carregando permissões...</p>
            ) : (
              <div className="space-y-1">
                {/* Cabeçalho da tabela */}
                <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 px-3 py-2 bg-gray-100 rounded-lg text-xs font-semibold text-gray-600">
                  <span>Módulo</span>
                  {ACAO_LABELS.map(a => (
                    <span key={a.key} className="text-center w-20">{a.label}</span>
                  ))}
                </div>

                {modulos.map((modulo) => {
                  const perms = editPerms[modulo.id] ?? { podeVer: false, podeCriar: false, podeEditar: false, podeExcluir: false };
                  const allChecked = perms.podeVer && perms.podeCriar && perms.podeEditar && perms.podeExcluir;
                  const someChecked = perms.podeVer || perms.podeCriar || perms.podeEditar || perms.podeExcluir;

                  return (
                    <div
                      key={modulo.id}
                      className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 px-3 py-2.5 border rounded-lg hover:bg-gray-50 items-center"
                    >
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={allChecked}
                          onCheckedChange={(v) => toggleModulo(modulo.id, !!v)}
                          className={someChecked && !allChecked ? "opacity-50" : ""}
                        />
                        <span className="text-sm font-medium text-gray-800">{modulo.label}</span>
                      </div>
                      {ACAO_LABELS.map(acao => (
                        <div key={acao.key} className="flex justify-center w-20">
                          <Checkbox
                            checked={perms[acao.key]}
                            onCheckedChange={() => togglePerm(modulo.id, acao.key)}
                          />
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
              <strong>Atenção:</strong> Permissões customizadas têm prioridade sobre o padrão do nível de acesso. Use "Resetar para Padrão" para voltar às permissões originais do nível selecionado.
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleResetPerms}
              disabled={resetPermissions.isPending}
              className="gap-2 text-orange-600 border-orange-200 hover:bg-orange-50"
            >
              <RotateCcw className="w-4 h-4" />
              Resetar para Padrão
            </Button>
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={handleClosePermModal}>
                Cancelar
              </Button>
              <Button
                onClick={handleSavePerms}
                disabled={setPermissions.isPending}
                className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
              >
                <Shield className="w-4 h-4" />
                {setPermissions.isPending ? "Salvando..." : "Salvar Permissões"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Modal: Definir Senha (admin) */}
      <Dialog open={!!senhaModalUser} onOpenChange={(open) => { if (!open) { setSenhaModalUser(null); setNovaSenhaAdmin(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-green-600" />
              Definir Senha — {senhaModalUser?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Digite uma nova senha para este usuário. A senha anterior será substituída imediatamente.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="nova-senha-admin">Nova Senha</Label>
              <div className="relative">
                <Input
                  id="nova-senha-admin"
                  type={mostrarSenhaAdmin ? "text" : "password"}
                  placeholder="Mínimo 8 caracteres"
                  value={novaSenhaAdmin}
                  onChange={(e) => setNovaSenhaAdmin(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && novaSenhaAdmin.length >= 8 && senhaModalUser) {
                      adminSetPassword.mutate({ userId: senhaModalUser.id, novaSenha: novaSenhaAdmin });
                    }
                  }}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setMostrarSenhaAdmin((v) => !v)}
                  tabIndex={-1}
                >
                  {mostrarSenhaAdmin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {novaSenhaAdmin.length > 0 && novaSenhaAdmin.length < 8 && (
                <p className="text-xs text-red-500">Mínimo 8 caracteres ({novaSenhaAdmin.length}/8)</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSenhaModalUser(null); setNovaSenhaAdmin(""); }}>
              Cancelar
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white gap-2"
              disabled={novaSenhaAdmin.length < 8 || adminSetPassword.isPending}
              onClick={() => {
                if (senhaModalUser) adminSetPassword.mutate({ userId: senhaModalUser.id, novaSenha: novaSenhaAdmin });
              }}
            >
              <KeyRound className="w-4 h-4" />
              {adminSetPassword.isPending ? "Salvando..." : "Definir Senha"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
