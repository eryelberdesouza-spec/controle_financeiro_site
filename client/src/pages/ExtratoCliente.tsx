import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { ClienteSelect } from "@/components/ClienteCentroCustoSelect";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, TrendingUp, TrendingDown, DollarSign, FileText, Calendar } from "lucide-react";

function formatCurrency(value: string | number | null | undefined) {
  const n = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);
}

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

const statusColorPag: Record<string, string> = {
  Pago: "bg-green-100 text-green-800 border-green-200",
  Pendente: "bg-yellow-100 text-yellow-800 border-yellow-200",
  Processando: "bg-blue-100 text-blue-800 border-blue-200",
  Cancelado: "bg-gray-100 text-gray-600 border-gray-200",
};

const statusColorRec: Record<string, string> = {
  Recebido: "bg-green-100 text-green-800 border-green-200",
  Pendente: "bg-yellow-100 text-yellow-800 border-yellow-200",
  Atrasado: "bg-red-100 text-red-800 border-red-200",
  Cancelado: "bg-gray-100 text-gray-600 border-gray-200",
};

export default function ExtratoCliente() {
  const [clienteId, setClienteId] = useState<number | null>(null);

  const { data, isLoading } = trpc.clientes.extrato.useQuery(
    { clienteId: clienteId! },
    { enabled: !!clienteId }
  );

  const totalRecebimentos = (data?.recebimentos ?? []).reduce(
    (acc, r) => acc + parseFloat(String(r.valorTotal ?? 0)), 0
  );
  const totalPagamentos = (data?.pagamentos ?? []).reduce(
    (acc, p) => acc + parseFloat(String(p.valor ?? 0)), 0
  );
  const saldo = totalRecebimentos - totalPagamentos;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Cabeçalho */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Extrato por Cliente / Parceiro
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Selecione um cliente para visualizar todos os lançamentos vinculados
          </p>
        </div>

        {/* Seletor de cliente */}
        <Card>
          <CardContent className="pt-5">
            <label className="text-sm font-medium mb-2 block">Selecionar Cliente ou Parceiro</label>
            <div className="max-w-md">
              <ClienteSelect
                value={clienteId}
                onChange={setClienteId}
                placeholder="Buscar cliente ou parceiro..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Conteúdo do extrato */}
        {!clienteId && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Users className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-lg font-medium">Selecione um cliente para ver o extrato</p>
            <p className="text-sm">Todos os pagamentos e recebimentos vinculados serão exibidos aqui</p>
          </div>
        )}

        {clienteId && isLoading && (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3" />
            Carregando extrato...
          </div>
        )}

        {clienteId && data && (
          <>
            {/* Dados do cliente */}
            {data.cliente && (
              <Card className="border-l-4 border-l-primary">
                <CardContent className="pt-4 pb-4">
                  <div className="flex flex-wrap gap-4 items-start">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-lg">{data.cliente.nome}</p>
                      <p className="text-sm text-muted-foreground">{data.cliente.tipo}</p>
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                      {data.cliente.cpfCnpj && <span>CPF/CNPJ: <strong className="text-foreground">{data.cliente.cpfCnpj}</strong></span>}
                      {data.cliente.email && <span>E-mail: <strong className="text-foreground">{data.cliente.email}</strong></span>}
                      {data.cliente.telefone && <span>Tel: <strong className="text-foreground">{data.cliente.telefone}</strong></span>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Cards de resumo */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="border-green-200">
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    Total Recebimentos
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-4">
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(totalRecebimentos)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{data.recebimentos.length} registro(s)</p>
                </CardContent>
              </Card>

              <Card className="border-red-200">
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-600" />
                    Total Pagamentos
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-4">
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(totalPagamentos)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{data.pagamentos.length} registro(s)</p>
                </CardContent>
              </Card>

              <Card className={saldo >= 0 ? "border-blue-200" : "border-orange-200"}>
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <DollarSign className={`h-4 w-4 ${saldo >= 0 ? "text-blue-600" : "text-orange-600"}`} />
                    Saldo Líquido
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-4">
                  <p className={`text-2xl font-bold ${saldo >= 0 ? "text-blue-600" : "text-orange-600"}`}>
                    {formatCurrency(saldo)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Recebimentos − Pagamentos</p>
                </CardContent>
              </Card>
            </div>

            {/* Abas de lançamentos */}
            <Tabs defaultValue="recebimentos">
              <TabsList>
                <TabsTrigger value="recebimentos">
                  Recebimentos ({data.recebimentos.length})
                </TabsTrigger>
                <TabsTrigger value="pagamentos">
                  Pagamentos ({data.pagamentos.length})
                </TabsTrigger>
              </TabsList>

              {/* Recebimentos */}
              <TabsContent value="recebimentos">
                {data.recebimentos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border rounded-lg mt-2">
                    <FileText className="h-8 w-8 mb-2 opacity-30" />
                    <p>Nenhum recebimento vinculado a este cliente</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto mt-2 rounded-lg border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50 text-muted-foreground">
                          <th className="text-left px-4 py-3 font-medium">Nº Controle</th>
                          <th className="text-left px-4 py-3 font-medium">Descrição</th>
                          <th className="text-right px-4 py-3 font-medium">Valor Total</th>
                          <th className="text-right px-4 py-3 font-medium">Valor Líquido</th>
                          <th className="text-center px-4 py-3 font-medium">Parcelas</th>
                          <th className="text-center px-4 py-3 font-medium">Vencimento</th>
                          <th className="text-center px-4 py-3 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {data.recebimentos.map((r) => (
                          <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3 font-mono text-xs text-primary font-semibold">
                              {r.numeroControle ?? `REC-${r.id}`}
                            </td>
                                  <td className="px-4 py-3">
                              <p className="font-medium truncate">{r.nomeRazaoSocial}</p>
                              {r.descricao && (
                                <p className="text-xs text-muted-foreground truncate">{r.descricao}</p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-medium">
                              {formatCurrency(r.valorTotal)}
                            </td>
                            <td className="px-4 py-3 text-right text-green-700 font-medium">
                              {formatCurrency(r.valorTotal)}
                            </td>
                            <td className="px-4 py-3 text-center text-muted-foreground">
                              {r.quantidadeParcelas > 1 ? `${r.quantidadeParcelas}x` : "À vista"}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="flex items-center justify-center gap-1 text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {formatDate(r.dataVencimento)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Badge variant="outline" className={statusColorRec[r.status ?? "Pendente"]}>
                                {r.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-muted/50 font-semibold">
                          <td colSpan={2} className="px-4 py-3 text-right text-muted-foreground">Total:</td>
                          <td className="px-4 py-3 text-right text-green-700">{formatCurrency(totalRecebimentos)}</td>
                          <td colSpan={4} />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </TabsContent>

              {/* Pagamentos */}
              <TabsContent value="pagamentos">
                {data.pagamentos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border rounded-lg mt-2">
                    <FileText className="h-8 w-8 mb-2 opacity-30" />
                    <p>Nenhum pagamento vinculado a este cliente</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto mt-2 rounded-lg border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50 text-muted-foreground">
                          <th className="text-left px-4 py-3 font-medium">Nº Controle</th>
                          <th className="text-left px-4 py-3 font-medium">Beneficiário</th>
                          <th className="text-right px-4 py-3 font-medium">Valor</th>
                          <th className="text-center px-4 py-3 font-medium">Parcelas</th>
                          <th className="text-center px-4 py-3 font-medium">Data Pagamento</th>
                          <th className="text-center px-4 py-3 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {data.pagamentos.map((p) => (
                          <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3 font-mono text-xs text-primary font-semibold">
                              {p.numeroControle ?? `PAG-${p.id}`}
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-medium truncate">{p.nomeCompleto}</p>
                              {p.descricao && (
                                <p className="text-xs text-muted-foreground truncate">{p.descricao}</p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-medium">
                              {formatCurrency(p.valor)}
                            </td>
                            <td className="px-4 py-3 text-center text-muted-foreground">
                              {p.parcelado ? `${p.quantidadeParcelas}x` : "À vista"}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="flex items-center justify-center gap-1 text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {formatDate(p.dataPagamento)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Badge variant="outline" className={statusColorPag[p.status ?? "Pendente"]}>
                                {p.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-muted/50 font-semibold">
                          <td colSpan={2} className="px-4 py-3 text-right text-muted-foreground">Total:</td>
                          <td className="px-4 py-3 text-right text-red-700">{formatCurrency(totalPagamentos)}</td>
                          <td colSpan={3} />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
