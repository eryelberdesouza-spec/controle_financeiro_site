import { useLocation } from "wouter";
import { LayoutDashboard, FolderOpen, ClipboardList, DollarSign, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  icon: React.ReactNode;
  href: string;
  exact?: boolean;
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    icon: <LayoutDashboard size={22} />,
    href: "/",
    exact: true,
  },
  {
    label: "Projetos",
    icon: <FolderOpen size={22} />,
    href: "/projetos",
  },
  {
    label: "OS",
    icon: <ClipboardList size={22} />,
    href: "/engenharia",
  },
  {
    label: "Financeiro",
    icon: <DollarSign size={22} />,
    href: "/recebimentos",
  },
  {
    label: "Menu",
    icon: <Menu size={22} />,
    href: "/menu-mobile",
  },
];

export function BottomNavigation() {
  const [location, navigate] = useLocation();

  const isActive = (item: NavItem) => {
    if (item.exact) return location === item.href;
    return location.startsWith(item.href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg safe-area-pb">
      <div className="flex items-stretch h-16">
        {navItems.map((item) => {
          const active = isActive(item);
          return (
            <button
              key={item.href}
              onClick={() => navigate(item.href)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[48px] transition-colors",
                active
                  ? "text-green-700 bg-green-50"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              )}
              aria-label={item.label}
            >
              <span className={cn("transition-transform", active && "scale-110")}>
                {item.icon}
              </span>
              <span className={cn("text-[10px] font-medium leading-tight", active && "font-semibold")}>
                {item.label}
              </span>
              {active && (
                <span className="absolute bottom-0 w-8 h-0.5 bg-green-600 rounded-t-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
