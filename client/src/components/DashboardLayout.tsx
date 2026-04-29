import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/useMobile";
import { usePermissions } from "@/hooks/usePermissions";
import {
  LayoutDashboard, LogOut, ArrowDownCircle, ArrowUpCircle, BarChart3, HelpCircle,
  BookOpen, Users, Settings, UserCircle2, Building2, Home, ChevronRight,
  FileSearch, HardHat, FileText, FolderOpen, ClipboardList, AlertTriangle,
  Shield, Bug, Plus, Zap, KeyRound, Eye, EyeOff, DollarSign, Menu, X,
  Wallet, TrendingUp, FileBarChart, CheckSquare, GitMerge, PieChart,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";

// ─── Tipos ───────────────────────────────────────────────────────────────────

type SubItem = {
  icon: React.ElementType;
  label: string;
  path: string;
  modulo?: string;
  adminOnly?: boolean;
};

type MenuItem = {
  icon: React.ElementType;
  label: string;
  path: string;
  modulo?: string;
  adminOnly?: boolean;
  children?: SubItem[];
};

// ─── Definição do menu ────────────────────────────────────────────────────────

const menuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  {
    icon: UserCircle2, label: "Cadastros", path: "/cadastros",
    children: [
      { icon: UserCircle2, label: "Clientes", path: "/clientes" },
      { icon: Building2, label: "Fornecedores", path: "/cadastros?tipo=Fornecedor" },
      { icon: HardHat, label: "Prestadores", path: "/cadastros?tipo=Prestador de Serviço" },
      { icon: GitMerge, label: "Parceiros", path: "/cadastros?tipo=Parceiro" },
      { icon: Users, label: "Contatos", path: "/cadastros?tipo=Outro" },
    ],
  },
  { icon: ClipboardList, label: "Propostas", path: "/propostas", modulo: "engenharia_contratos" },
  { icon: FileText, label: "Contratos", path: "/contratos", modulo: "engenharia_contratos" },
  { icon: FolderOpen, label: "Projetos", path: "/projetos", modulo: "projetos" },
  { icon: HardHat, label: "Execução / OS", path: "/engenharia", modulo: "engenharia_os" },
  { icon: Building2, label: "Centros de Custo", path: "/centros-custo", modulo: "centros_custo" },
  {
    icon: DollarSign, label: "Financeiro", path: "/financeiro",
    children: [
      { icon: PieChart, label: "Visão Geral", path: "/financeiro" },
      { icon: ArrowUpCircle, label: "Contas a Pagar", path: "/pagamentos" },
      { icon: ArrowDownCircle, label: "Contas a Receber", path: "/recebimentos" },
      { icon: Wallet, label: "Lançamentos", path: "/lancamentos" },
      { icon: CheckSquare, label: "Aprovações", path: "/aprovacoes" },
      { icon: TrendingUp, label: "Fluxo de Caixa", path: "/fluxo-caixa" },
      { icon: FileBarChart, label: "Conciliação", path: "/conciliacao" },
      { icon: BarChart3, label: "Relatórios Fin.", path: "/relatorios" },
    ],
  },
  { icon: BarChart3, label: "Relatórios", path: "/relatorios" },
  { icon: FileSearch, label: "Extrato por Cliente", path: "/extrato-cliente" },
  { icon: AlertTriangle, label: "Inconsistências", path: "/inconsistencias" },
  { icon: Shield, label: "Auditoria", path: "/auditoria", adminOnly: true },
  { icon: Bug, label: "Logs de Erros", path: "/logs-erros", adminOnly: true },
  { icon: Users, label: "Usuários", path: "/usuarios", adminOnly: true },
  { icon: Settings, label: "Configurações", path: "/configuracoes", adminOnly: true },
  { icon: BookOpen, label: "Guia de Uso", path: "/guia" },
  { icon: HelpCircle, label: "FAQ", path: "/faq" },
];

// ─── Componente principal ─────────────────────────────────────────────────────

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = "/login";
    }
  }, [loading, user]);

  if (loading || !user) return <DashboardLayoutSkeleton />;

  return <DashboardLayoutContent>{children}</DashboardLayoutContent>;
}

// ─── Layout interno ───────────────────────────────────────────────────────────

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { can, isAdmin } = usePermissions();
  const [location, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const { data: empresa } = trpc.empresa.get.useQuery();

  // Sidebar principal: colapsada ou expandida (mobile: oculta)
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  // Sub-sidebar: qual grupo está ativo (null = nenhum)
  const [activeGroup, setActiveGroup] = useState<string | null>(() => {
    // Abrir automaticamente o grupo cujo filho está ativo
    for (const item of menuItems) {
      if (item.children?.some(c => location === c.path || location.startsWith(c.path + "?"))) {
        return item.path;
      }
    }
    return null;
  });

  // Modal de alteração de senha
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [pwdForm, setPwdForm] = useState({ senhaAtual: "", novaSenha: "", confirmar: "" });
  const [showPwdFields, setShowPwdFields] = useState({ senhaAtual: false, novaSenha: false, confirmar: false });

  const changePassword = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      import("sonner").then(({ toast }) => toast.success("Senha alterada com sucesso!"));
      setShowChangePwd(false);
      setPwdForm({ senhaAtual: "", novaSenha: "", confirmar: "" });
    },
    onError: (e) => import("sonner").then(({ toast }) => toast.error(e.message)),
  });

  // Fechar sidebar no mobile ao navegar
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [location, isMobile]);

  // Filtrar itens do menu por permissão
  const visibleItems = menuItems.filter(item => {
    if (item.adminOnly) return user?.role === "admin";
    if (isAdmin) return true;
    if (!item.modulo) return true;
    return can.ver(item.modulo as Parameters<typeof can.ver>[0]);
  });

  // Grupo ativo atual
  const activeGroupItem = visibleItems.find(i => i.path === activeGroup && i.children);

  // Verificar se um item de primeiro nível está ativo
  const isItemActive = (item: MenuItem) => {
    if (item.children) {
      return item.children.some(c => location === c.path || location.startsWith(c.path + "?"));
    }
    return location === item.path;
  };

  // Clicar em item do menu principal
  const handleMainItemClick = (item: MenuItem) => {
    if (item.children) {
      // Toggle do grupo: se já está ativo, fecha; senão abre
      setActiveGroup(prev => prev === item.path ? null : item.path);
    } else {
      setActiveGroup(null);
      setLocation(item.path);
    }
  };

  // Clicar em item do submenu
  const handleSubItemClick = (path: string) => {
    setLocation(path);
    if (isMobile) setSidebarOpen(false);
  };

  const logoUrl = empresa?.logoUrl || "https://d2xsxph8kpxj0f.cloudfront.net/310519663389577190/eCW2qMCc4P3oBzxQMhj7Zi/logo-atomtech-horizontal_7749c840.png";

  // Breadcrumb: encontrar label da página atual
  const currentLabel = (() => {
    for (const item of menuItems) {
      if (item.children) {
        const child = item.children.find(c => location === c.path || location.startsWith(c.path + "?"));
        if (child) return { group: item.label, page: child.label };
      }
      if (location === item.path) return { group: null, page: item.label };
    }
    return { group: null, page: "Página" };
  })();

  return (
    <div className="flex h-screen overflow-hidden bg-background">

      {/* ── Overlay mobile ── */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar Principal ── */}
      <aside
        className={`
          flex flex-col shrink-0 bg-sidebar border-r border-sidebar-border
          transition-all duration-200 z-40
          ${isMobile ? "fixed top-0 left-0 h-full" : "relative h-full"}
          ${sidebarOpen ? "w-56" : isMobile ? "-translate-x-full w-56" : "w-14"}
        `}
      >
        {/* Header da sidebar */}
        <div className="flex items-center h-14 px-3 border-b border-sidebar-border shrink-0 gap-2">
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-sidebar-accent transition-colors shrink-0"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen && isMobile ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
          {sidebarOpen && (
            <div className="flex items-center gap-2 min-w-0 overflow-hidden">
              <img src={logoUrl} alt="Logo" className="h-7 object-contain shrink-0" />
              <div className="min-w-0">
                <p className="font-bold text-xs leading-none text-primary truncate">SIGECO</p>
                <p className="text-[9px] text-muted-foreground leading-tight truncate">Gestão de Engenharia</p>
              </div>
            </div>
          )}
        </div>

        {/* Atalhos rápidos */}
        {sidebarOpen && (
          <div className="px-2 pt-3 pb-1 shrink-0">
            <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center gap-1 px-1">
              <Zap className="h-3 w-3" /> Criar Novo
            </p>
            <div className="flex flex-col gap-1">
              {can.criar("engenharia_contratos" as Parameters<typeof can.criar>[0]) && (
                <button
                  onClick={() => { setActiveGroup(null); setLocation("/propostas?novo=1"); }}
                  className="flex items-center gap-2 text-[11px] px-2 py-1.5 rounded-md text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 transition-colors font-medium w-full text-left"
                >
                  <Plus className="h-3 w-3 shrink-0" /> Nova Proposta
                </button>
              )}
              {can.criar("projetos" as Parameters<typeof can.criar>[0]) && (
                <button
                  onClick={() => { setActiveGroup(null); setLocation("/projetos?novo=1"); }}
                  className="flex items-center gap-2 text-[11px] px-2 py-1.5 rounded-md text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 transition-colors font-medium w-full text-left"
                >
                  <Plus className="h-3 w-3 shrink-0" /> Novo Projeto
                </button>
              )}
              {can.criar("engenharia_contratos" as Parameters<typeof can.criar>[0]) && (
                <button
                  onClick={() => { setActiveGroup(null); setLocation("/contratos?novo=1"); }}
                  className="flex items-center gap-2 text-[11px] px-2 py-1.5 rounded-md text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 transition-colors font-medium w-full text-left"
                >
                  <Plus className="h-3 w-3 shrink-0" /> Novo Contrato
                </button>
              )}
            </div>
          </div>
        )}

        {/* Itens do menu principal */}
        <nav className="flex-1 overflow-y-auto py-2 px-1.5 space-y-0.5">
          {visibleItems.map(item => {
            const active = isItemActive(item);
            const groupOpen = activeGroup === item.path;
            const hasChildren = !!item.children?.length;

            return (
              <button
                key={item.path}
                onClick={() => handleMainItemClick(item)}
                title={!sidebarOpen ? item.label : undefined}
                className={`
                  flex items-center gap-2.5 w-full rounded-lg px-2 py-2 text-sm transition-colors text-left
                  ${active || groupOpen
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }
                  ${!sidebarOpen ? "justify-center" : ""}
                `}
              >
                <item.icon className={`h-4 w-4 shrink-0 ${active || groupOpen ? "text-primary" : ""}`} />
                {sidebarOpen && (
                  <>
                    <span className="flex-1 truncate">{item.label}</span>
                    {hasChildren && (
                      <ChevronRight className={`h-3.5 w-3.5 shrink-0 transition-transform ${groupOpen ? "rotate-90" : ""}`} />
                    )}
                  </>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer: avatar + menu do usuário */}
        <div className="shrink-0 border-t border-sidebar-border p-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={`flex items-center gap-2 rounded-lg px-1.5 py-1.5 hover:bg-sidebar-accent transition-colors w-full text-left ${!sidebarOpen ? "justify-center" : ""}`}>
                <Avatar className="h-8 w-8 border shrink-0">
                  <AvatarFallback className="text-xs font-medium">
                    {user?.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {sidebarOpen && (
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate leading-none">{user?.name || "-"}</p>
                    <p className="text-[10px] text-muted-foreground truncate mt-1">{user?.email || "-"}</p>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem
                onClick={() => { setShowChangePwd(true); setPwdForm({ senhaAtual: "", novaSenha: "", confirmar: "" }); }}
                className="cursor-pointer"
              >
                <KeyRound className="mr-2 h-4 w-4 text-green-600" />
                <span>Alterar minha senha</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={logout}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* ── Sub-Sidebar (segundo nível) ── */}
      {activeGroupItem && (
        <aside
          className={`
            flex flex-col shrink-0 bg-sidebar/60 border-r border-sidebar-border
            transition-all duration-200 z-30
            ${isMobile ? "fixed top-0 h-full" : "relative h-full"}
            w-48
          `}
          style={isMobile ? { left: sidebarOpen ? "14rem" : "0" } : undefined}
        >
          {/* Header do submenu */}
          <div className="flex items-center h-14 px-4 border-b border-sidebar-border shrink-0">
            <activeGroupItem.icon className="h-4 w-4 text-primary mr-2 shrink-0" />
            <span className="font-semibold text-sm text-foreground truncate">{activeGroupItem.label}</span>
          </div>

          {/* Itens do submenu */}
          <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
            {activeGroupItem.children!.map(child => {
              const childActive = location === child.path || location.startsWith(child.path + "?");
              return (
                <button
                  key={child.path}
                  onClick={() => handleSubItemClick(child.path)}
                  className={`
                    flex items-center gap-2.5 w-full rounded-lg px-3 py-2 text-sm transition-colors text-left
                    ${childActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    }
                  `}
                >
                  <child.icon className={`h-4 w-4 shrink-0 ${childActive ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="truncate">{child.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>
      )}

      {/* ── Área principal ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Topbar */}
        <header className="flex items-center h-14 px-4 border-b border-border bg-background/95 backdrop-blur shrink-0 gap-3">
          {/* Botão menu mobile */}
          {isMobile && (
            <button
              onClick={() => setSidebarOpen(o => !o)}
              className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-accent transition-colors"
            >
              <Menu className="h-4 w-4" />
            </button>
          )}

          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground min-w-0">
            {location !== "/" && (
              <>
                <button
                  onClick={() => { setActiveGroup(null); setLocation("/"); }}
                  className="flex items-center gap-1 hover:text-foreground transition-colors shrink-0"
                >
                  <Home className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Dashboard</span>
                </button>
                {currentLabel.group && (
                  <>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                    <span className="hidden sm:inline truncate">{currentLabel.group}</span>
                  </>
                )}
                <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                <span className="text-foreground font-medium truncate">{currentLabel.page}</span>
              </>
            )}
            {location === "/" && (
              <span className="text-foreground font-medium">Dashboard</span>
            )}
          </div>
        </header>

        {/* Conteúdo da página */}
        <main className="flex-1 overflow-y-auto p-4">
          {children}
        </main>
      </div>

      {/* ── Modal: Alterar minha senha ── */}
      <Dialog open={showChangePwd} onOpenChange={(open) => { if (!open) setShowChangePwd(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-green-600" />
              Alterar minha senha
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {([
              { key: "senhaAtual", label: "Senha atual" },
              { key: "novaSenha", label: "Nova senha (mín. 8 caracteres)" },
              { key: "confirmar", label: "Confirmar nova senha" },
            ] as { key: keyof typeof pwdForm; label: string }[]).map(({ key, label }) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={`pwd-${key}`}>{label}</Label>
                <div className="relative">
                  <Input
                    id={`pwd-${key}`}
                    type={showPwdFields[key] ? "text" : "password"}
                    value={pwdForm[key]}
                    onChange={(e) => setPwdForm(prev => ({ ...prev, [key]: e.target.value }))}
                    className="pr-10"
                    placeholder={key === "senhaAtual" ? "Sua senha atual" : "Mínimo 8 caracteres"}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPwdFields(prev => ({ ...prev, [key]: !prev[key] }))}
                    tabIndex={-1}
                  >
                    {showPwdFields[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}
            {pwdForm.novaSenha && pwdForm.confirmar && pwdForm.novaSenha !== pwdForm.confirmar && (
              <p className="text-xs text-red-500">As senhas não coincidem.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChangePwd(false)}>Cancelar</Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white gap-2"
              disabled={
                !pwdForm.senhaAtual ||
                pwdForm.novaSenha.length < 8 ||
                pwdForm.novaSenha !== pwdForm.confirmar ||
                changePassword.isPending
              }
              onClick={() => changePassword.mutate({ senhaAtual: pwdForm.senhaAtual, novaSenha: pwdForm.novaSenha })}
            >
              <KeyRound className="w-4 h-4" />
              {changePassword.isPending ? "Salvando..." : "Alterar Senha"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
