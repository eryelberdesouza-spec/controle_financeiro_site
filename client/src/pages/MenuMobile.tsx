import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  LayoutDashboard, FolderOpen, ClipboardList, DollarSign,
  TrendingUp, TrendingDown, Users, Settings, FileText,
  BarChart3, Building2, MapPin, AlertCircle, BookOpen,
  HelpCircle, LogOut, ChevronRight, Wrench
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MenuSection {
  title: string;
  items: MenuItem[];
}

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  href: string;
  adminOnly?: boolean;
}

const menuSections: MenuSection[] = [
  {
    title: "Principal",
    items: [
      { icon: <LayoutDashboard size={20} />, label: "Dashboard", href: "/" },
      { icon: <FolderOpen size={20} />, label: "Projetos", href: "/projetos" },
      { icon: <FileText size={20} />, label: "Propostas", href: "/propostas" },
    ],
  },
  {
    title: "Engenharia",
    items: [
      { icon: <ClipboardList size={20} />, label: "Ordens de Serviço", href: "/engenharia" },
      { icon: <Wrench size={20} />, label: "Contratos", href: "/contratos" },
    ],
  },
  {
    title: "Financeiro",
    items: [
      { icon: <TrendingUp size={20} />, label: "Recebimentos", href: "/recebimentos" },
      { icon: <TrendingDown size={20} />, label: "Pagamentos", href: "/pagamentos" },
      { icon: <BarChart3 size={20} />, label: "Relatórios", href: "/relatorios" },
      { icon: <MapPin size={20} />, label: "Centro de Custo", href: "/centros-custo" },
    ],
  },
  {
    title: "Cadastros",
    items: [
      { icon: <Users size={20} />, label: "Clientes", href: "/clientes" },
      { icon: <Building2 size={20} />, label: "Extrato por Cliente", href: "/extrato-cliente" },
    ],
  },
  {
    title: "Sistema",
    items: [
      { icon: <AlertCircle size={20} />, label: "Inconsistências", href: "/inconsistencias" },
      { icon: <BookOpen size={20} />, label: "Guia de Uso", href: "/guia" },
      { icon: <HelpCircle size={20} />, label: "FAQ", href: "/faq" },
      { icon: <Users size={20} />, label: "Usuários", href: "/usuarios", adminOnly: true },
      { icon: <Settings size={20} />, label: "Configurações", href: "/configuracoes", adminOnly: true },
    ],
  },
];

export default function MenuMobile() {
  const [, navigate] = useLocation();
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "admin";

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-800 to-green-600 px-4 pt-10 pb-5 text-white">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg">
            {user?.name?.charAt(0) ?? "U"}
          </div>
          <div>
            <p className="font-bold text-base leading-tight">{user?.name ?? "Usuário"}</p>
            <p className="text-green-200 text-xs">{user?.email ?? ""}</p>
            <span className={cn(
              "text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 inline-block",
              user?.role === "admin" ? "bg-yellow-400 text-yellow-900" : "bg-green-300 text-green-900"
            )}>
              {user?.role === "admin" ? "Admin" : user?.role === "operador" ? "Operador" : "Usuário"}
            </span>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-5">
        {menuSections.map((section) => {
          const visibleItems = section.items.filter(item => !item.adminOnly || isAdmin);
          if (visibleItems.length === 0) return null;
          return (
            <div key={section.title}>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">
                {section.title}
              </p>
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm divide-y divide-gray-50">
                {visibleItems.map((item) => (
                  <button
                    key={item.href}
                    onClick={() => navigate(item.href)}
                    className="flex items-center gap-3 w-full px-4 py-3.5 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors min-h-[52px]"
                  >
                    <span className="text-gray-500 shrink-0">{item.icon}</span>
                    <span className="flex-1 text-sm font-medium text-gray-800">{item.label}</span>
                    <ChevronRight size={16} className="text-gray-300 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        {/* Logout */}
        <button
          onClick={() => logout()}
          className="flex items-center gap-3 w-full px-4 py-3.5 bg-red-50 border border-red-100 rounded-xl text-red-600 font-semibold text-sm min-h-[52px] hover:bg-red-100 transition-colors"
        >
          <LogOut size={20} />
          <span>Sair do Sistema</span>
        </button>
      </div>
    </div>
  );
}
