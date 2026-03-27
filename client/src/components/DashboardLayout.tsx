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
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { usePermissions } from "@/hooks/usePermissions";
import { LayoutDashboard, LogOut, PanelLeft, ArrowDownCircle, ArrowUpCircle, BarChart3, HelpCircle, BookOpen, Users, Settings, UserCircle2, Building2, Home, ChevronRight, FileSearch, HardHat, FileText, FolderOpen, ClipboardList, SlidersHorizontal } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/", modulo: "dashboard" as const },
  { icon: ArrowUpCircle, label: "Compras e Pagamentos", path: "/pagamentos", modulo: "pagamentos" as const },
  { icon: ArrowDownCircle, label: "Recebimentos", path: "/recebimentos", modulo: "recebimentos" as const },
  { icon: UserCircle2, label: "Clientes", path: "/clientes", modulo: "clientes" as const },
  { icon: FileSearch, label: "Extrato por Cliente", path: "/extrato-cliente", modulo: "clientes" as const },
  { icon: Building2, label: "Centros de Custo", path: "/centros-custo", modulo: "centros_custo" as const },
  { icon: FolderOpen, label: "Projetos", path: "/projetos", modulo: "projetos" as const },
  { icon: ClipboardList, label: "Propostas", path: "/propostas", modulo: "engenharia_contratos" as const },
  { icon: SlidersHorizontal, label: "Config. Propostas", path: "/propostas-config", modulo: "engenharia_contratos" as const },
  { icon: FileText, label: "Contratos", path: "/contratos", modulo: "engenharia_contratos" as const },
  { icon: HardHat, label: "Engenharia", path: "/engenharia", modulo: "engenharia_os" as const },
  { icon: BarChart3, label: "Relatórios", path: "/relatorios", modulo: "relatorios" as const },
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

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-2xl font-semibold tracking-tight text-center">
              Sign in to continue
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Access to this dashboard requires authentication. Continue to launch the login flow.
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
            Sign in
          </Button>
        </div>
      </div>
    );
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
                  {empresa?.logoUrl && (
                    <img
                      src={empresa.logoUrl}
                      alt="Logo"
                      className="h-7 w-7 object-contain rounded shrink-0"
                    />
                  )}
                  <span className="font-semibold tracking-tight truncate text-primary">
                    {empresa?.nomeEmpresa || "FinControl"}
                  </span>
                </div>
              ) : empresa?.logoUrl ? (
                <img src={empresa.logoUrl} alt="Logo" className="h-6 w-6 object-contain rounded mx-auto" />
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
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
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
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
