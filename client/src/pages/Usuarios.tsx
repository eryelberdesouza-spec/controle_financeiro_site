import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Shield, ShieldCheck, User, Trash2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: any; desc: string }> = {
  admin: {
    label: "Administrador",
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    icon: ShieldCheck,
    desc: "Acesso total: cadastrar, editar, excluir e gerenciar usuários",
  },
  operador: {
    label: "Operador",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    icon: Shield,
    desc: "Pode cadastrar e editar registros, mas não pode excluir",
  },
  user: {
    label: "Usuário",
    color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
    icon: User,
    desc: "Acesso somente leitura (sem permissão para cadastrar)",
  },
};

export default function Usuarios() {
  const { user: currentUser } = useAuth();
  const utils = trpc.useUtils();

  const { data: usuarios = [], isLoading } = trpc.usuarios.list.useQuery();

  const updateRoleMutation = trpc.usuarios.updateRole.useMutation({
    onSuccess: () => { utils.usuarios.list.invalidate(); toast.success("Perfil atualizado com sucesso!"); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.usuarios.delete.useMutation({
    onSuccess: () => { utils.usuarios.list.invalidate(); toast.success("Usuário removido!"); },
    onError: (e) => toast.error(e.message),
  });

  if (currentUser?.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <AlertCircle className="h-12 w-12 text-muted-foreground" />
          <h2 className="text-xl font-semibold text-foreground">Acesso Restrito</h2>
          <p className="text-muted-foreground text-center max-w-sm">
            Apenas administradores podem gerenciar usuários. Entre em contato com o administrador do sistema.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Usuários</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie os perfis de acesso da equipe</p>
        </div>

        {/* Legenda de perfis */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Object.entries(ROLE_CONFIG).map(([role, config]) => {
            const Icon = config.icon;
            return (
              <Card key={role} className="border-2 border-transparent hover:border-primary/20 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>{config.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{config.desc}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Tabela de usuários */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Usuários Cadastrados ({usuarios.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <p className="p-6 text-muted-foreground text-sm">Carregando...</p>
            ) : usuarios.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-muted-foreground">Nenhum usuário encontrado.</p>
                <p className="text-xs text-muted-foreground mt-2">Os usuários aparecem aqui após o primeiro login.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium text-muted-foreground">Usuário</th>
                      <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">E-mail</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Perfil</th>
                      <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Último Acesso</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuarios.map((u) => {
                      const roleConfig = ROLE_CONFIG[u.role] ?? ROLE_CONFIG.user;
                      const RoleIcon = roleConfig.icon;
                      const isSelf = u.id === currentUser?.id;
                      return (
                        <tr key={u.id} className="border-b hover:bg-muted/30 transition-colors">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-bold text-primary">
                                  {(u.name ?? "?").charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-foreground">{u.name ?? "Sem nome"}</p>
                                {isSelf && <p className="text-xs text-muted-foreground">(você)</p>}
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-muted-foreground hidden md:table-cell">{u.email ?? "-"}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleConfig.color}`}>
                                {roleConfig.label}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-muted-foreground hidden lg:table-cell text-xs">
                            {u.lastSignedIn ? new Date(u.lastSignedIn).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-"}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex justify-end items-center gap-2">
                              {!isSelf && (
                                <>
                                  <Select
                                    value={u.role}
                                    onValueChange={(v) => updateRoleMutation.mutate({ id: u.id, role: v as any })}
                                  >
                                    <SelectTrigger className="w-[140px] h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="admin">Administrador</SelectItem>
                                      <SelectItem value="operador">Operador</SelectItem>
                                      <SelectItem value="user">Usuário</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => { if (confirm(`Remover o usuário "${u.name}"?`)) deleteMutation.mutate({ id: u.id }); }}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}
                              {isSelf && (
                                <span className="text-xs text-muted-foreground pr-2">Seu perfil</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Informações sobre acesso */}
        <Card className="bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4 flex gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-800 dark:text-amber-400">Como funciona o acesso?</p>
              <p className="text-amber-700 dark:text-amber-500 mt-1">
                Os usuários precisam fazer login com sua conta Manus. Após o primeiro acesso, eles aparecem nesta lista com o perfil padrão <strong>Operador</strong>. 
                Altere o perfil conforme necessário. O proprietário do sistema sempre terá perfil <strong>Administrador</strong>.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
