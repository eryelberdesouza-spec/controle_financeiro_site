import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import { usePermissions } from "@/hooks/usePermissions";
import { LayoutDashboard, LogOut, PanelLeft, ArrowDownCircle, ArrowUpCircle, BarChart3, HelpCircle, BookOpen, Users, Settings, UserCircle2, Building2, Home, ChevronRight, FileSearch, HardHat, FileText, FolderOpen, ClipboardList, AlertTriangle, Shield, GitBranch, Plus, Zap, Bug, KeyRound, Eye, EyeOff } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState, Fragment } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/", modulo: "dashboard" as const },
  { icon: UserCircle2, label: "Cadastros", path: "/cadastros", modulo: "clientes" as const },
  { icon: ClipboardList, label: "Propostas", path: "/propostas", modulo: "engenharia_contratos" as const },
  { icon: FileText, label: "Contratos", path: "/contratos", modulo: "engenharia_contratos" as const },
  { icon: FolderOpen, label: "Projetos", path: "/projetos", modulo: "projetos" as const },
  { icon: HardHat, label: "Execução / OS", path: "/engenharia", modulo: "engenharia_os" as const },
  { icon: Building2, label: "Centros de Custo", path: "/centros-custo", modulo: "centros_custo" as const },
  { icon: ArrowUpCircle, label: "Financeiro", path: "/financeiro", modulo: "pagamentos" as const },
  { icon: BarChart3, label: "Relatórios", path: "/relatorios", modulo: "relatorios" as const },
  { icon: FileSearch, label: "Extrato por Cliente", path: "/extrato-cliente", modulo: "clientes" as const },
  { icon: AlertTriangle, label: "Inconsistências", path: "/inconsistencias", modulo: "pagamentos" as const },
  { icon: Shield, label: "Auditoria", path: "/auditoria", adminOnly: true },
  { icon: Bug, label: "Logs de Erros", path: "/logs-erros", adminOnly: true },
  { icon: Users, label: "Usuários", path: "/usuarios", adminOnly: true },
  { icon: Settings, label: "Configurações", path: "/configuracoes", adminOnly: true },
  { icon: BookOpen, label: "Guia de Uso", path: "/guia" },
  { icon: HelpCircle, label: "FAQ", path: "/faq" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  // Redirecionar automaticamente para login quando não autenticado.
  // Isso evita que o usuário fique preso na tela de "Sign in" quando
  // há um cookie de sessão inválido/expirado no navegador.
  useEffect(() => {
    if (!loading && !user) {
      window.location.href = "/login";
    }
  }, [loading, user]);

  if (loading || !user) {
    return <DashboardLayoutSkeleton />
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
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
  const { can, isAdmin } = usePermissions();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find(item => item.path === location);
  const isMobile = useIsMobile();
  const { data: empresa } = trpc.empresa.get.useQuery();

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <img
                    src={empresa?.logoUrl || "https://d2xsxph8kpxj0f.cloudfront.net/310519663389577190/eCW2qMCc4P3oBzxQMhj7Zi/logo-atomtech-horizontal_7749c840.png"}
                    alt="Logo SIGECO"
                    className="h-8 object-contain shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="font-bold tracking-tight text-sm leading-none text-primary">SIGECO</p>
                    <p className="text-[9px] text-muted-foreground leading-tight truncate">Gestão de Engenharia</p>
                  </div>
                </div>
              ) : (
                <img
                  src={empresa?.logoUrl || "https://d2xsxph8kpxj0f.cloudfront.net/310519663389577190/eCW2qMCc4P3oBzxQMhj7Zi/logo-atomtech-horizontal_7749c840.png"}
                  alt="Logo"
                  className="h-6 object-contain mx-auto"
                />
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 overflow-y-auto">
            {/* Atalhos Rápidos — só exibe quando sidebar expandida */}
            {!isCollapsed && (
              <div className="px-3 pt-3 pb-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center gap-1">
                  <Zap className="h-3 w-3" /> Criar Novo
                </p>
                <div className="flex flex-col gap-1">
                  {can.criar("engenharia_contratos") && (
                    <button
                      onClick={() => setLocation("/propostas?novo=1")}
                      className="flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-md text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 transition-colors font-medium w-full text-left"
                    >
                      <Plus className="h-3 w-3 shrink-0" /> Nova Proposta
                    </button>
                  )}
                  {can.criar("projetos") && (
                    <button
                      onClick={() => setLocation("/projetos?novo=1")}
                      className="flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-md text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 transition-colors font-medium w-full text-left"
                    >
                      <Plus className="h-3 w-3 shrink-0" /> Novo Projeto
                    </button>
                  )}
                  {can.criar("engenharia_contratos") && (
                    <button
                      onClick={() => setLocation("/contratos?novo=1")}
                      className="flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-md text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 transition-colors font-medium w-full text-left"
                    >
                      <Plus className="h-3 w-3 shrink-0" /> Novo Contrato
                    </button>
                  )}
                </div>
              </div>
            )}
            <SidebarMenu className="px-2 py-1">
              {menuItems.filter(item => {
                // Itens somente admin
                if ('adminOnly' in item && item.adminOnly) return user?.role === 'admin';
                // Admin tem acesso a tudo
                if (isAdmin) return true;
                // Itens sem módulo associado (Guia, FAQ) sempre visíveis
                if (!('modulo' in item) || !item.modulo) return true;
                // Verificar permissão de visualização do módulo
                return can.ver(item.modulo);
              }).map(item => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={`h-10 transition-all font-normal`}
                    >
                      <item.icon
                        className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                      />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-medium">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
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
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      {/* Modal: Alterar minha senha */}
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

      <SidebarInset>
        {/* Cabeçalho mobile */}
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <span className="tracking-tight text-foreground">
                    {activeMenuItem?.label ?? "Menu"}
                  </span>
                </div>
              </div>
            </div>
            {/* Botão Home mobile — só aparece fora do Dashboard */}
            {location !== "/" && (
              <button
                onClick={() => setLocation("/")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                title="Voltar ao Dashboard"
              >
                <Home className="h-4 w-4" />
                <span>Dashboard</span>
              </button>
            )}
          </div>
        )}
        {/* Breadcrumb desktop — só aparece fora do Dashboard */}
        {!isMobile && location !== "/" && (
          <div className="flex items-center gap-1.5 px-5 pt-4 pb-0 text-sm text-muted-foreground">
            <button
              onClick={() => setLocation("/")}
              className="flex items-center gap-1 hover:text-foreground transition-colors group"
              title="Voltar ao Dashboard"
            >
              <Home className="h-3.5 w-3.5 group-hover:text-primary transition-colors" />
              <span className="group-hover:text-primary transition-colors">Dashboard</span>
            </button>
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            <span className="text-foreground font-medium">{activeMenuItem?.label ?? "Página"}</span>
          </div>
        )}
        <main className="flex-1 p-4">{children}</main>
      </SidebarInset>
    </>
  );
}
