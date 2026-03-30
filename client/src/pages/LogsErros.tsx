import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Search, RefreshCw, Trash2, AlertTriangle, AlertCircle, Info, Zap, Eye } from "lucide-react";

type NivelLog = "info" | "warn" | "error" | "critical";

const nivelConfig: Record<NivelLog, { label: string; color: string; icon: React.ReactNode }> = {
  info: { label: "Info", color: "bg-blue-100 text-blue-800 border-blue-200", icon: <Info className="h-3 w-3" /> },
  warn: { label: "Aviso", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: <AlertTriangle className="h-3 w-3" /> },
  error: { label: "Erro", color: "bg-red-100 text-red-800 border-red-200", icon: <AlertCircle className="h-3 w-3" /> },
  critical: { label: "Crítico", color: "bg-purple-100 text-purple-800 border-purple-200", icon: <Zap className="h-3 w-3" /> },
};

export default function LogsErros() {
  const { user } = useAuth();
  const [busca, setBusca] = useState("");
  const [nivelFiltro, setNivelFiltro] = useState<NivelLog | "todos">("todos");
  const [origemFiltro, setOrigemFiltro] = useState("");
  const [logSelecionado, setLogSelecionado] = useState<any | null>(null);

  const utils = trpc.useUtils();

  const { data: logs = [], isLoading, refetch } = trpc.errorLogs.list.useQuery({
    nivel: nivelFiltro !== "todos" ? nivelFiltro : undefined,
    origem: origemFiltro || undefined,
    busca: busca || undefined,
    limit: 200,
  });

  const clearOldMutation = trpc.errorLogs.clearOld.useMutation({
    onSuccess: () => {
      toast.success("Logs antigos removidos com sucesso.");
      utils.errorLogs.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  if (user?.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-2">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold">Acesso Restrito</h2>
            <p className="text-muted-foreground">Esta página é acessível apenas para administradores.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const origens = Array.from(new Set(logs.map(l => l.origem))).sort();

  const contagens = {
    total: logs.length,
    critical: logs.filter(l => l.nivel === "critical").length,
    error: logs.filter(l => l.nivel === "error").length,
    warn: logs.filter(l => l.nivel === "warn").length,
    info: logs.filter(l => l.nivel === "info").length,
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Logs de Erros</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Monitoramento de erros do sistema — login, API e backend
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-destructive hover:text-destructive"
              onClick={() => {
                if (confirm("Remover logs com mais de 90 dias?")) {
                  clearOldMutation.mutate({ diasManter: 90 });
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
              Limpar Antigos
            </Button>
          </div>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { nivel: "critical" as NivelLog, count: contagens.critical },
            { nivel: "error" as NivelLog, count: contagens.error },
            { nivel: "warn" as NivelLog, count: contagens.warn },
            { nivel: "info" as NivelLog, count: contagens.info },
          ].map(({ nivel, count }) => {
            const cfg = nivelConfig[nivel];
            return (
              <button
                key={nivel}
                onClick={() => setNivelFiltro(nivelFiltro === nivel ? "todos" : nivel)}
                className={`rounded-lg border p-3 text-left space-y-1 transition-all hover:shadow-sm ${nivelFiltro === nivel ? "ring-2 ring-primary" : ""}`}
              >
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  {cfg.icon}
                  <span className="text-xs font-medium">{cfg.label}</span>
                </div>
                <p className="text-2xl font-bold">{count}</p>
              </button>
            );
          })}
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar na mensagem..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={nivelFiltro} onValueChange={(v) => setNivelFiltro(v as NivelLog | "todos")}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Nível" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os níveis</SelectItem>
              <SelectItem value="critical">Crítico</SelectItem>
              <SelectItem value="error">Erro</SelectItem>
              <SelectItem value="warn">Aviso</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>
          <Select value={origemFiltro || "_todos"} onValueChange={(v) => setOrigemFiltro(v === "_todos" ? "" : v)}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_todos">Todas as origens</SelectItem>
              {origens.map(o => (
                <SelectItem key={o} value={o}>{o}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tabela */}
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Nível</TableHead>
                <TableHead className="w-32">Origem</TableHead>
                <TableHead>Mensagem</TableHead>
                <TableHead className="w-36">Usuário</TableHead>
                <TableHead className="w-40">Data/Hora</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Carregando logs...
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum log encontrado.
                  </TableCell>
                </TableRow>
              ) : logs.map((log) => {
                const cfg = nivelConfig[log.nivel as NivelLog] ?? nivelConfig.error;
                return (
                  <TableRow key={log.id} className="hover:bg-muted/30">
                    <TableCell>
                      <Badge variant="outline" className={`gap-1 text-xs ${cfg.color}`}>
                        {cfg.icon}
                        {cfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                        {log.origem}
                      </span>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm truncate max-w-[300px]" title={log.mensagem}>
                        {log.mensagem}
                      </p>
                      {log.acao && (
                        <p className="text-xs text-muted-foreground">{log.acao}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {log.usuarioNome ?? (log.usuarioId ? `#${log.usuarioId}` : "—")}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString("pt-BR")}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setLogSelecionado(log)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Dialog de detalhes */}
        <Dialog open={!!logSelecionado} onOpenChange={(o) => !o && setLogSelecionado(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {logSelecionado && nivelConfig[logSelecionado.nivel as NivelLog]?.icon}
                Detalhes do Log #{logSelecionado?.id}
              </DialogTitle>
            </DialogHeader>
            {logSelecionado && (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Nível</p>
                    <Badge variant="outline" className={nivelConfig[logSelecionado.nivel as NivelLog]?.color}>
                      {nivelConfig[logSelecionado.nivel as NivelLog]?.label}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Origem</p>
                    <code className="bg-muted px-2 py-0.5 rounded text-xs">{logSelecionado.origem}</code>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Ação</p>
                    <p>{logSelecionado.acao ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Data/Hora</p>
                    <p>{new Date(logSelecionado.createdAt).toLocaleString("pt-BR")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Usuário</p>
                    <p>{logSelecionado.usuarioNome ?? (logSelecionado.usuarioId ? `#${logSelecionado.usuarioId}` : "—")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">IP</p>
                    <p>{logSelecionado.ip ?? "—"}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Mensagem</p>
                  <div className="bg-muted rounded p-3 font-mono text-xs whitespace-pre-wrap break-all">
                    {logSelecionado.mensagem}
                  </div>
                </div>
                {logSelecionado.stack && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Stack Trace</p>
                    <div className="bg-muted rounded p-3 font-mono text-xs whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
                      {logSelecionado.stack}
                    </div>
                  </div>
                )}
                {logSelecionado.contexto && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Contexto</p>
                    <div className="bg-muted rounded p-3 font-mono text-xs whitespace-pre-wrap break-all">
                      {JSON.stringify(JSON.parse(logSelecionado.contexto), null, 2)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
