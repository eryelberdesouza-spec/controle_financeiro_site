import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  BarChart3,
  Save,
  RefreshCw,
} from "lucide-react";

const CATEGORIAS = [
  { key: "Material", label: "Material", icon: "📦", color: "bg-blue-500" },
  { key: "Mao_de_Obra", label: "Mão de Obra", icon: "👷", color: "bg-orange-500" },
  { key: "Equipamentos", label: "Equipamentos", icon: "🔧", color: "bg-purple-500" },
  { key: "Terceiros", label: "Terceiros", icon: "🤝", color: "bg-teal-500" },
  { key: "Outros", label: "Outros", icon: "📋", color: "bg-gray-500" },
] as const;

type CategoriaKey = typeof CATEGORIAS[number]["key"];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatPercent(value: number | null) {
  if (value === null) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function DesvioIndicator({ desvio }: { desvio: number | null }) {
  if (desvio === null) return <span className="text-muted-foreground text-sm">Sem orçamento</span>;
  if (Math.abs(desvio) <= 5) return (
    <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
      <CheckCircle2 className="h-4 w-4" /> {formatPercent(desvio)}
    </span>
  );
  if (desvio > 5 && desvio <= 10) return (
    <span className="flex items-center gap-1 text-yellow-600 text-sm font-medium">
      <AlertTriangle className="h-4 w-4" /> {formatPercent(desvio)}
    </span>
  );
  if (desvio > 10) return (
    <span className="flex items-center gap-1 text-red-600 text-sm font-medium">
      <TrendingUp className="h-4 w-4" /> {formatPercent(desvio)}
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
      <TrendingDown className="h-4 w-4" /> {formatPercent(desvio)}
    </span>
  );
}

export default function OrcamentoProjeto() {
  const [, params] = useRoute("/projetos/:id/orcamento");
  const [, navigate] = useLocation();
  const projetoId = params?.id ? parseInt(params.id) : null;

  const [orcamentoForm, setOrcamentoForm] = useState<
    Record<CategoriaKey, { valorPrevisto: string; observacao: string }>
  >({
    Material: { valorPrevisto: "", observacao: "" },
    Mao_de_Obra: { valorPrevisto: "", observacao: "" },
    Equipamentos: { valorPrevisto: "", observacao: "" },
    Terceiros: { valorPrevisto: "", observacao: "" },
    Outros: { valorPrevisto: "", observacao: "" },
  });
  const [ativarExigencia, setAtivarExigencia] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { data, isLoading, refetch } = trpc.orcamento.getByProjeto.useQuery(
    { projetoId: projetoId! },
    { enabled: !!projetoId }
  );

  const saveAllMutation = trpc.orcamento.saveAll.useMutation({
    onSuccess: () => {
      toast.success("Orçamento salvo com sucesso!");
      refetch();
      setIsSaving(false);
    },
    onError: (err) => {
      toast.error("Erro ao salvar orçamento: " + err.message);
      setIsSaving(false);
    },
  });

  // Preencher formulário com dados existentes
  useEffect(() => {
    if (data) {
      const newForm = { ...orcamentoForm };
      for (const cat of data.categorias) {
        newForm[cat.categoria as CategoriaKey] = {
          valorPrevisto: cat.valorPrevisto > 0 ? cat.valorPrevisto.toFixed(2) : "",
          observacao: cat.observacao ?? "",
        };
      }
      setOrcamentoForm(newForm);
      setAtivarExigencia(data.projeto.exigeOrcamento);
    }
  }, [data]);

  const handleSave = () => {
    if (!projetoId) return;
    setIsSaving(true);
    const categorias = CATEGORIAS.map((cat) => ({
      categoria: cat.key,
      valorPrevisto: parseFloat(orcamentoForm[cat.key].valorPrevisto || "0"),
      observacao: orcamentoForm[cat.key].observacao || undefined,
    }));
    saveAllMutation.mutate({
      projetoId,
      categorias,
      ativarExigencia,
    });
  };

  if (!projetoId) {
    return (
      <DashboardLayout>
        <div className="p-6 text-center text-muted-foreground">Projeto não encontrado.</div>
      </DashboardLayout>
    );
  }

  const totais = data?.totais;
  const projeto = data?.projeto;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        {/* Cabeçalho */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/projetos")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-green-600" />
              Orçamento do Projeto
            </h1>
            {projeto && (
              <p className="text-muted-foreground text-sm mt-0.5">
                {projeto.nome}
                {projeto.valorContratado > 0 && (
                  <span className="ml-2 text-green-600 font-medium">
                    · Valor contratado: {formatCurrency(projeto.valorContratado)}
                  </span>
                )}
              </p>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            <RefreshCw className="h-5 w-5 animate-spin mr-2" /> Carregando orçamento...
          </div>
        ) : (
          <>
            {/* Cards de Resumo */}
            {totais && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Custo Previsto</p>
                    <p className="text-lg font-bold text-blue-700">{formatCurrency(totais.totalPrevisto)}</p>
                  </CardContent>
                </Card>
                <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Custo Realizado</p>
                    <p className="text-lg font-bold text-orange-700">{formatCurrency(totais.totalRealizado)}</p>
                  </CardContent>
                </Card>
                <Card className={`border-2 ${totais.totalDesvioPercentual !== null && totais.totalDesvioPercentual > 10 ? "border-red-300 bg-red-50 dark:bg-red-950/20" : "border-green-200 bg-green-50 dark:bg-green-950/20"}`}>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Desvio Total</p>
                    <p className={`text-lg font-bold ${totais.totalDesvioPercentual !== null && totais.totalDesvioPercentual > 10 ? "text-red-700" : "text-green-700"}`}>
                      {formatPercent(totais.totalDesvioPercentual)}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(totais.totalDesvio)}</p>
                  </CardContent>
                </Card>
                <Card className={`border-2 ${totais.margemPercentual !== null && totais.margemPercentual < 10 ? "border-red-300 bg-red-50 dark:bg-red-950/20" : "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20"}`}>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Margem Bruta</p>
                    <p className={`text-lg font-bold ${totais.margemPercentual !== null && totais.margemPercentual < 10 ? "text-red-700" : "text-emerald-700"}`}>
                      {totais.margemPercentual !== null ? `${totais.margemPercentual.toFixed(1)}%` : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(totais.margemBruta)}</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Formulário de Orçamento por Categoria */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  Orçamento por Categoria de Custo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {CATEGORIAS.map((cat) => {
                  const catData = data?.categorias.find((c) => c.categoria === cat.key);
                  const previsto = parseFloat(orcamentoForm[cat.key].valorPrevisto || "0");
                  const realizado = catData?.valorRealizado ?? 0;
                  const progressPercent = previsto > 0 ? Math.min((realizado / previsto) * 100, 150) : 0;
                  const isOver = realizado > previsto && previsto > 0;

                  return (
                    <div key={cat.key} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{cat.icon}</span>
                          <span className="font-medium">{cat.label}</span>
                          {catData?.alerta && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" /> Desvio &gt;10%
                            </Badge>
                          )}
                        </div>
                        <DesvioIndicator desvio={catData?.desvioPercentual ?? null} />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">Valor Previsto (R$)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0,00"
                            value={orcamentoForm[cat.key].valorPrevisto}
                            onChange={(e) =>
                              setOrcamentoForm((prev) => ({
                                ...prev,
                                [cat.key]: { ...prev[cat.key], valorPrevisto: e.target.value },
                              }))
                            }
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Custo Realizado</Label>
                          <div className="mt-1 h-9 flex items-center px-3 rounded-md border bg-muted/50 text-sm font-medium">
                            {formatCurrency(realizado)}
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Observação</Label>
                          <Input
                            placeholder="Observação opcional..."
                            value={orcamentoForm[cat.key].observacao}
                            onChange={(e) =>
                              setOrcamentoForm((prev) => ({
                                ...prev,
                                [cat.key]: { ...prev[cat.key], observacao: e.target.value },
                              }))
                            }
                            className="mt-1"
                          />
                        </div>
                      </div>

                      {/* Barra de progresso */}
                      {previsto > 0 && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Utilizado: {formatCurrency(realizado)}</span>
                            <span>Previsto: {formatCurrency(previsto)}</span>
                          </div>
                          <Progress
                            value={Math.min(progressPercent, 100)}
                            className={`h-2 ${isOver ? "[&>div]:bg-red-500" : "[&>div]:bg-green-500"}`}
                          />
                          {isOver && (
                            <p className="text-xs text-red-600 font-medium">
                              ⚠ Excedeu o orçamento em {formatCurrency(realizado - previsto)}
                            </p>
                          )}
                        </div>
                      )}
                      <Separator />
                    </div>
                  );
                })}

                {/* Totais */}
                {totais && (
                  <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Total Previsto:</span>
                      <span className="font-bold text-blue-700">{formatCurrency(totais.totalPrevisto)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Total Realizado:</span>
                      <span className={`font-bold ${totais.totalRealizado > totais.totalPrevisto && totais.totalPrevisto > 0 ? "text-red-700" : "text-orange-700"}`}>
                        {formatCurrency(totais.totalRealizado)}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Receita Realizada:</span>
                      <span className="font-bold text-green-700">{formatCurrency(totais.receitaRealizada)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Margem Bruta:</span>
                      <span className={`font-bold ${totais.margemBruta < 0 ? "text-red-700" : "text-emerald-700"}`}>
                        {formatCurrency(totais.margemBruta)}
                        {totais.margemPercentual !== null && (
                          <span className="ml-1 text-xs">({totais.margemPercentual.toFixed(1)}%)</span>
                        )}
                      </span>
                    </div>
                  </div>
                )}

                {/* Opção de exigir orçamento */}
                <div className="flex items-center justify-between p-3 rounded-lg border bg-amber-50 dark:bg-amber-950/20 border-amber-200">
                  <div>
                    <p className="text-sm font-medium">Exigir orçamento antes da execução</p>
                    <p className="text-xs text-muted-foreground">
                      Quando ativo, novos pagamentos vinculados a este projeto exigirão categoria de custo obrigatória.
                    </p>
                  </div>
                  <Switch
                    checked={ativarExigencia}
                    onCheckedChange={setAtivarExigencia}
                  />
                </div>

                {/* Botão Salvar */}
                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="outline" onClick={() => navigate("/projetos")}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isSaving ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Salvar Orçamento
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
