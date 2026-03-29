import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CheckCircle2, RefreshCw, Wrench } from "lucide-react";
import { toast } from "sonner";

function formatCurrency(v: any) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(parseFloat(v ?? 0));
}
function formatDate(d: any) {
  if (!d) return "-";
  const iso = d instanceof Date ? d.toISOString() : String(d);
  const p = iso.substring(0, 10).split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : "-";
}

// ─── Linha de correção de Pagamento ────────────────────────────────────────
function CorrigirPagamento({ item, projetos, onFixed }: { item: any; projetos: any[]; onFixed: () => void }) {
  const [projetoId, setProjetoId] = useState<string>("");
  const utils = trpc.useUtils();
  const corrigir = trpc.inconsistencias.corrigirPagamento.useMutation({
    onSuccess: () => {
      toast.success("Pagamento vinculado ao projeto!");
      utils.inconsistencias.resumo.invalidate();
      utils.inconsistencias.listPagamentos.invalidate();
      onFixed();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="flex items-center gap-2 mt-2">
      <Select value={projetoId} onValueChange={setProjetoId}>
        <SelectTrigger className="w-56 h-8 text-xs">
          <SelectValue placeholder="Selecionar projeto..." />
        </SelectTrigger>
        <SelectContent>
          {projetos.map(p => (
            <SelectItem key={p.id} value={String(p.id)}>
              {p.numero ? `${p.numero} — ` : ""}{p.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        disabled={!projetoId || corrigir.isPending}
        onClick={() => corrigir.mutate({ id: item.id, projetoId: Number(projetoId) })}
        className="h-8 text-xs"
      >
        <Wrench className="w-3 h-3 mr-1" /> Corrigir
      </Button>
    </div>
  );
}

// ─── Linha de correção de Recebimento ──────────────────────────────────────
function CorrigirRecebimento({ item, projetos, contratos, onFixed }: { item: any; projetos: any[]; contratos: any[]; onFixed: () => void }) {
  const [projetoId, setProjetoId] = useState<string>("");
  const [contratoId, setContratoId] = useState<string>("");
  const utils = trpc.useUtils();
  const corrigir = trpc.inconsistencias.corrigirRecebimento.useMutation({
    onSuccess: () => {
      toast.success("Recebimento vinculado!");
      utils.inconsistencias.resumo.invalidate();
      utils.inconsistencias.listRecebimentos.invalidate();
      onFixed();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="flex flex-wrap items-center gap-2 mt-2">
      <Select value={projetoId} onValueChange={setProjetoId}>
        <SelectTrigger className="w-52 h-8 text-xs">
          <SelectValue placeholder="Projeto (obrigatório)..." />
        </SelectTrigger>
        <SelectContent>
          {projetos.map(p => (
            <SelectItem key={p.id} value={String(p.id)}>
              {p.numero ? `${p.numero} — ` : ""}{p.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={contratoId} onValueChange={setContratoId}>
        <SelectTrigger className="w-52 h-8 text-xs">
          <SelectValue placeholder="Contrato (opcional)..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="0">Sem contrato</SelectItem>
          {contratos.map(c => (
            <SelectItem key={c.id} value={String(c.id)}>
              {c.numero} — {c.objeto?.substring(0, 30)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        disabled={!projetoId || corrigir.isPending}
        onClick={() => corrigir.mutate({ id: item.id, projetoId: Number(projetoId), contratoId: contratoId && contratoId !== "0" ? Number(contratoId) : undefined })}
        className="h-8 text-xs"
      >
        <Wrench className="w-3 h-3 mr-1" /> Corrigir
      </Button>
    </div>
  );
}

// ─── Linha de correção de Contrato ─────────────────────────────────────────
function CorrigirContrato({ item, projetos, onFixed }: { item: any; projetos: any[]; onFixed: () => void }) {
  const [projetoId, setProjetoId] = useState<string>("");
  const utils = trpc.useUtils();
  const corrigir = trpc.inconsistencias.corrigirContrato.useMutation({
    onSuccess: () => {
      toast.success("Contrato vinculado ao projeto!");
      utils.inconsistencias.resumo.invalidate();
      utils.inconsistencias.listContratos.invalidate();
      onFixed();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="flex items-center gap-2 mt-2">
      <Select value={projetoId} onValueChange={setProjetoId}>
        <SelectTrigger className="w-56 h-8 text-xs">
          <SelectValue placeholder="Selecionar projeto..." />
        </SelectTrigger>
        <SelectContent>
          {projetos.map(p => (
            <SelectItem key={p.id} value={String(p.id)}>
              {p.numero ? `${p.numero} — ` : ""}{p.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        disabled={!projetoId || corrigir.isPending}
        onClick={() => corrigir.mutate({ id: item.id, projetoId: Number(projetoId) })}
        className="h-8 text-xs"
      >
        <Wrench className="w-3 h-3 mr-1" /> Corrigir
      </Button>
    </div>
  );
}

// ─── Linha de correção de OS ────────────────────────────────────────────────
function CorrigirOS({ item, projetos, onFixed }: { item: any; projetos: any[]; onFixed: () => void }) {
  const [projetoId, setProjetoId] = useState<string>("");
  const utils = trpc.useUtils();
  const corrigir = trpc.inconsistencias.corrigirOS.useMutation({
    onSuccess: () => {
      toast.success("OS vinculada ao projeto!");
      utils.inconsistencias.resumo.invalidate();
      utils.inconsistencias.listOS.invalidate();
      onFixed();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="flex items-center gap-2 mt-2">
      <Select value={projetoId} onValueChange={setProjetoId}>
        <SelectTrigger className="w-56 h-8 text-xs">
          <SelectValue placeholder="Selecionar projeto..." />
        </SelectTrigger>
        <SelectContent>
          {projetos.map(p => (
            <SelectItem key={p.id} value={String(p.id)}>
              {p.numero ? `${p.numero} — ` : ""}{p.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        disabled={!projetoId || corrigir.isPending}
        onClick={() => corrigir.mutate({ id: item.id, projetoId: Number(projetoId) })}
        className="h-8 text-xs"
      >
        <Wrench className="w-3 h-3 mr-1" /> Corrigir
      </Button>
    </div>
  );
}

// ─── Componente principal ───────────────────────────────────────────────────
export default function Inconsistencias() {
  const [activeTab, setActiveTab] = useState<"pagamentos" | "recebimentos" | "contratos" | "os">("pagamentos");

  const { data: resumo, refetch: refetchResumo } = trpc.inconsistencias.resumo.useQuery();
  const { data: pagamentos = [], refetch: refetchPag } = trpc.inconsistencias.listPagamentos.useQuery();
  const { data: recebimentos = [], refetch: refetchRec } = trpc.inconsistencias.listRecebimentos.useQuery();
  const { data: contratosInc = [], refetch: refetchCtr } = trpc.inconsistencias.listContratos.useQuery();
  const { data: osInc = [], refetch: refetchOS } = trpc.inconsistencias.listOS.useQuery();
  const { data: listaProjetos = [] } = trpc.projetos.list.useQuery(undefined as any);
  const { data: listaContratos = [] } = trpc.engenharia.listContratos.useQuery();

  const total = resumo?.total ?? 0;

  const tabs = [
    { key: "pagamentos" as const, label: "Pagamentos", count: resumo?.pagamentos ?? 0, color: "bg-red-100 text-red-700" },
    { key: "recebimentos" as const, label: "Recebimentos", count: resumo?.recebimentos ?? 0, color: "bg-orange-100 text-orange-700" },
    { key: "contratos" as const, label: "Contratos", count: resumo?.contratos ?? 0, color: "bg-yellow-100 text-yellow-700" },
    { key: "os" as const, label: "Ordens de Serviço", count: resumo?.ordensServico ?? 0, color: "bg-purple-100 text-purple-700" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-orange-500" />
              Painel de Inconsistências
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Registros legados sem vínculo com Projeto. Corrija-os para garantir a integridade do sistema.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { refetchResumo(); refetchPag(); refetchRec(); refetchCtr(); refetchOS(); }}>
            <RefreshCw className="w-4 h-4 mr-1" /> Atualizar
          </Button>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {tabs.map(t => (
            <Card key={t.key} className={`cursor-pointer border-2 transition-all ${activeTab === t.key ? "border-primary" : "border-transparent"}`} onClick={() => setActiveTab(t.key)}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">{t.label}</span>
                  <Badge className={t.color}>{t.count}</Badge>
                </div>
                <p className="text-2xl font-bold mt-1">{t.count}</p>
                <p className="text-xs text-muted-foreground">registros pendentes</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Mensagem de sucesso */}
        {total === 0 && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-4 pb-3 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-green-800">Nenhuma inconsistência encontrada!</p>
                <p className="text-sm text-green-700">Todos os registros estão devidamente vinculados a projetos.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabela de inconsistências */}
        {total > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                {tabs.find(t => t.key === activeTab)?.label} — {tabs.find(t => t.key === activeTab)?.count} registros inconsistentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Pagamentos */}
              {activeTab === "pagamentos" && (
                <div className="space-y-3">
                  {pagamentos.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4 flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" /> Nenhum pagamento inconsistente.
                    </p>
                  ) : pagamentos.map((item: any) => (
                    <div key={item.id} className="border rounded-lg p-3 bg-red-50/40">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-xs font-mono bg-red-100 text-red-700 px-2 py-0.5 rounded">{item.numeroControle || `#${item.id}`}</span>
                        <span className="font-medium text-sm">{item.nomeCompleto}</span>
                        <span className="text-sm text-muted-foreground">{formatCurrency(item.valor)}</span>
                        <span className="text-xs text-muted-foreground">{formatDate(item.dataPagamento)}</span>
                        <Badge variant="outline" className="text-xs">{item.status}</Badge>
                      </div>
                      {item.motivoInconsistencia && (
                        <p className="text-xs text-orange-600 mt-1">⚠ {item.motivoInconsistencia}</p>
                      )}
                      <CorrigirPagamento item={item} projetos={listaProjetos} onFixed={() => { refetchPag(); refetchResumo(); }} />
                    </div>
                  ))}
                </div>
              )}

              {/* Recebimentos */}
              {activeTab === "recebimentos" && (
                <div className="space-y-3">
                  {recebimentos.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4 flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" /> Nenhum recebimento inconsistente.
                    </p>
                  ) : recebimentos.map((item: any) => (
                    <div key={item.id} className="border rounded-lg p-3 bg-orange-50/40">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-xs font-mono bg-orange-100 text-orange-700 px-2 py-0.5 rounded">{item.numeroControle || `#${item.id}`}</span>
                        <span className="font-medium text-sm">{item.nomeRazaoSocial}</span>
                        <span className="text-sm text-muted-foreground">{formatCurrency(item.valorTotal)}</span>
                        <span className="text-xs text-muted-foreground">Venc: {formatDate(item.dataVencimento)}</span>
                        <Badge variant="outline" className="text-xs">{item.status}</Badge>
                      </div>
                      {item.motivoInconsistencia && (
                        <p className="text-xs text-orange-600 mt-1">⚠ {item.motivoInconsistencia}</p>
                      )}
                      <CorrigirRecebimento item={item} projetos={listaProjetos} contratos={listaContratos} onFixed={() => { refetchRec(); refetchResumo(); }} />
                    </div>
                  ))}
                </div>
              )}

              {/* Contratos */}
              {activeTab === "contratos" && (
                <div className="space-y-3">
                  {contratosInc.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4 flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" /> Nenhum contrato inconsistente.
                    </p>
                  ) : contratosInc.map((item: any) => (
                    <div key={item.id} className="border rounded-lg p-3 bg-yellow-50/40">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-xs font-mono bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">{item.numero || `#${item.id}`}</span>
                        <span className="font-medium text-sm">{item.objeto?.substring(0, 60)}</span>
                        <span className="text-sm text-muted-foreground">{formatCurrency(item.valorTotal)}</span>
                        <Badge variant="outline" className="text-xs">{item.status}</Badge>
                      </div>
                      {item.motivoInconsistencia && (
                        <p className="text-xs text-orange-600 mt-1">⚠ {item.motivoInconsistencia}</p>
                      )}
                      <CorrigirContrato item={item} projetos={listaProjetos} onFixed={() => { refetchCtr(); refetchResumo(); }} />
                    </div>
                  ))}
                </div>
              )}

              {/* OS */}
              {activeTab === "os" && (
                <div className="space-y-3">
                  {osInc.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4 flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" /> Nenhuma OS inconsistente.
                    </p>
                  ) : osInc.map((item: any) => (
                    <div key={item.id} className="border rounded-lg p-3 bg-purple-50/40">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-xs font-mono bg-purple-100 text-purple-700 px-2 py-0.5 rounded">{item.numero || `#${item.id}`}</span>
                        <span className="font-medium text-sm">{item.titulo}</span>
                        <Badge variant="outline" className="text-xs">{item.status}</Badge>
                      </div>
                      {item.motivoInconsistencia && (
                        <p className="text-xs text-orange-600 mt-1">⚠ {item.motivoInconsistencia}</p>
                      )}
                      <CorrigirOS item={item} projetos={listaProjetos} onFixed={() => { refetchOS(); refetchResumo(); }} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Legenda */}
        <Card className="bg-muted/30">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Como funciona a padronização:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• <strong>Novos registros</strong> exigem obrigatoriamente vínculo com Projeto</li>
              <li>• <strong>Registros legados</strong> (anteriores à padronização) foram sinalizados como inconsistentes e aparecem aqui</li>
              <li>• <strong>Corrija</strong> cada registro selecionando o Projeto correspondente — o sistema removerá o flag de inconsistência</li>
              <li>• <strong>Recebimentos</strong> também devem ser vinculados ao Contrato correspondente</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
