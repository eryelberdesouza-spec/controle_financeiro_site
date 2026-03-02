import { useState } from 'react';
import { Menu, X, FileText, BarChart3, HelpCircle, Settings, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LayoutProps {
  children: React.ReactNode;
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const menuItems = [
  { id: 'overview', label: 'Visão Geral', icon: FileText },
  { id: 'payments', label: 'Pagamentos', icon: Download },
  { id: 'receivables', label: 'Recebimentos', icon: BarChart3 },
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'reports', label: 'Relatórios', icon: FileText },
  { id: 'customization', label: 'Personalizações', icon: Settings },
  { id: 'faq', label: 'Perguntas Frequentes', icon: HelpCircle },
];

export default function Layout({ children, activeSection, onSectionChange }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-0'
        } transition-all duration-300 bg-card border-r border-border overflow-hidden`}
      >
        <div className="h-full flex flex-col p-6">
          {/* Logo */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-primary">
              💰 FinControl
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Guia de Uso</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => onSectionChange(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-smooth ${
                    activeSection === item.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  <Icon size={20} />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              v1.0 • 02/03/2026
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="bg-card border-b border-border sticky top-0 z-40">
          <div className="flex items-center justify-between px-6 py-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-primary"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </Button>
            <h2 className="text-lg font-semibold text-foreground">
              Sistema de Controle Financeiro
            </h2>
            <div className="w-10" />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <div className="container py-8 max-w-6xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
