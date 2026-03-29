import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, Search, Filter, RefreshCw, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const ACAO_LABELS: Record<string, { label: string; color: string }> = {
  criacao: { label: "Criação", color: "bg-green-100 text-green-800" },
  edicao: { label: "Edição", color: "bg-blue-100 text-blue-800" },
  exclusao: { label: "Exclusão", color: "bg-red-100 text-red-800" },
};

const ENTIDADE_LABELS: Record<string, string> = {
  pagamento: "Pagamento",
  recebimento: "Recebimento",
  projeto: "Projeto",
  contrato: "Contrato",
  os: "Ordem de Serviço",
  cliente: "Cliente",
  usuario: "Usuário",
};

function formatDateTime(d: Date | string) {
  return new Date(d).toLocaleString("pt-BR");
}

function JsonViewer({ data, label }: { data: string | null; label: string }) {
  if (!data) return <span className="text-muted-foreground text-xs">—</span>;
  try {
    const parsed = JSON.parse(data);
    return (
      <div>
        <p className="text-xs font-semibold mb-1 text-muted-foreground">{label}</p>
        <pre className="text-xs bg-muted rounded p-2 overflow-auto max-h-48 whitespace-pre-wrap">
          {JSON.stringify(parsed, null, 2)}
        </pre>
      </div>
    );
  } catch {
    return <span className="text-xs">{data}</span>;
  }
}

export default function Auditoria() {
  const [entidade, setEntidade] = useState<string>("todos");
  const [acao, setAcao] = useState<string>("todos");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [offset, setOffset] = useState(0);
  const [detalhe, setDetalhe] = useState<any>(null);
  const LIMIT = 50;

  const { data, isLoading, refetch } = trpc.auditoria.list.useQuery({
    entidade: entidade !== "todos" ? entidade : undefined,
    acao: acao !== "todos" ? (acao as "criacao" | "edicao" | "exclusao") : undefined,
    dataInicio: dataInicio || undefined,
    dataFim: dataFim || undefined,
    limit: LIMIT,
    offset,
  });

  const logs = data?.logs ?? [];
  const total = data?.total ?? 0;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg">
              <Shield className="h-6 w-6 text-slate-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Log de Auditoria</h1>
              <p className="text-sm text-muted-foreground">Rastreabilidade completa de todas as operações do sistema</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Atualizar
          </Button>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Filter className="h-4 w-4" /> Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Entidade</label>
                <Select value={entidade} onValueChange={(v) => { setEntidade(v); setOffset(0); }}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas</SelectItem>
                    {Object.entries(ENTIDADE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Ação</label>
                <Select value={acao} onValueChange={(v) => { setAcao(v); setOffset(0); }}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas</SelectItem>
                    <SelectItem value="criacao">Criação</SelectItem>
                    <SelectItem value="edicao">Edição</SelectItem>
                    <SelectItem value="exclusao">Exclusão</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Data início</label>
                <Input type="date" value={dataInicio} onChange={e => { setDataInicio(e.target.value); setOffset(0); }} className="h-9" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Data fim</label>
                <Input type="date" value={dataFim} onChange={e => { setDataFim(e.target.value); setOffset(0); }} className="h-9" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-40">Data/Hora</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Entidade</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-16">Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhum registro encontrado
                      </TableCell>
                    </TableRow>
                  ) : logs.map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(log.createdAt)}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {log.usuarioNome ?? <span className="text-muted-foreground text-xs">Sistema</span>}
                      </TableCell>
                      <TableCell>
                        {log.acao && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ACAO_LABELS[log.acao]?.color ?? "bg-gray-100 text-gray-800"}`}>
                            {ACAO_LABELS[log.acao]?.label ?? log.acao}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {ENTIDADE_LABELS[log.entidade] ?? log.entidade}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {log.entidadeId ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs max-w-xs truncate">
                        {log.descricao ?? log.camposAlterados ?? "—"}
                      </TableCell>
                      <TableCell>
                        {(log.valorAnterior || log.valorNovo) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => setDetalhe(log)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Paginação */}
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <span className="text-xs text-muted-foreground">
                {total} registro(s) encontrado(s)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - LIMIT))}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground">
                  {Math.floor(offset / LIMIT) + 1} / {Math.max(1, Math.ceil(total / LIMIT))}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={offset + LIMIT >= total}
                  onClick={() => setOffset(offset + LIMIT)}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de detalhes */}
      <Dialog open={!!detalhe} onOpenChange={() => setDetalhe(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Detalhes do Evento de Auditoria
            </DialogTitle>
          </DialogHeader>
          {detalhe && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="font-medium">Data/Hora:</span> {formatDateTime(detalhe.createdAt)}</div>
                <div><span className="font-medium">Usuário:</span> {detalhe.usuarioNome ?? "Sistema"}</div>
                <div><span className="font-medium">Entidade:</span> {ENTIDADE_LABELS[detalhe.entidade] ?? detalhe.entidade}</div>
                <div><span className="font-medium">ID:</span> {detalhe.entidadeId ?? "—"}</div>
                <div className="col-span-2"><span className="font-medium">Ação:</span> {ACAO_LABELS[detalhe.acao]?.label ?? detalhe.acao}</div>
                {detalhe.descricao && (
                  <div className="col-span-2"><span className="font-medium">Descrição:</span> {detalhe.descricao}</div>
                )}
                {detalhe.camposAlterados && (
                  <div className="col-span-2"><span className="font-medium">Campos alterados:</span> {detalhe.camposAlterados}</div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <JsonViewer data={detalhe.valorAnterior} label="Valor Anterior" />
                <JsonViewer data={detalhe.valorNovo} label="Valor Novo" />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
