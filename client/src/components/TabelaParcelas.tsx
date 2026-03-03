import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarIcon, CheckCircle2, Clock, XCircle, AlertCircle } from "lucide-react";

export type TipoParcela = "pagamento" | "recebimento";

export type ParcelaLocal = {
  id?: number;
  numeroParcela: number;
  valor: string;
  dataVencimento: string; // ISO string YYYY-MM-DD
  dataPagamento?: string;
  dataRecebimento?: string;
  status: string;
  observacao?: string;
};

type Props = {
  tipo: TipoParcela;
  parcelas: ParcelaLocal[];
  onChange: (parcelas: ParcelaLocal[]) => void;
  readOnly?: boolean;
};

const statusColors: Record<string, string> = {
  Pendente: "bg-yellow-100 text-yellow-800 border-yellow-200",
  Pago: "bg-green-100 text-green-800 border-green-200",
  Recebido: "bg-green-100 text-green-800 border-green-200",
  Atrasado: "bg-red-100 text-red-800 border-red-200",
  Cancelado: "bg-gray-100 text-gray-600 border-gray-200",
};

const StatusIcon = ({ status }: { status: string }) => {
  if (status === "Pago" || status === "Recebido") return <CheckCircle2 className="h-3.5 w-3.5" />;
  if (status === "Atrasado") return <AlertCircle className="h-3.5 w-3.5" />;
  if (status === "Cancelado") return <XCircle className="h-3.5 w-3.5" />;
  return <Clock className="h-3.5 w-3.5" />;
};

export function TabelaParcelas({ tipo, parcelas, onChange, readOnly = false }: Props) {
  const statusOptions = tipo === "pagamento"
    ? ["Pendente", "Pago", "Atrasado", "Cancelado"]
    : ["Pendente", "Recebido", "Atrasado", "Cancelado"];

  const dataEfetivadaLabel = tipo === "pagamento" ? "Data Pagamento" : "Data Recebimento";
  const dataEfetivadaKey = tipo === "pagamento" ? "dataPagamento" : "dataRecebimento";

  const updateParcela = (index: number, field: keyof ParcelaLocal, value: string) => {
    const updated = parcelas.map((p, i) =>
      i === index ? { ...p, [field]: value } : p
    );
    onChange(updated);
  };

  const totalParcelas = parcelas.reduce((sum, p) => sum + parseFloat(p.valor || "0"), 0);
  const totalPago = parcelas
    .filter(p => p.status === "Pago" || p.status === "Recebido")
    .reduce((sum, p) => sum + parseFloat(p.valor || "0"), 0);
  const totalPendente = parcelas
    .filter(p => p.status === "Pendente")
    .reduce((sum, p) => sum + parseFloat(p.valor || "0"), 0);
  const totalAtrasado = parcelas
    .filter(p => p.status === "Atrasado")
    .reduce((sum, p) => sum + parseFloat(p.valor || "0"), 0);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  if (parcelas.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="rounded-lg border bg-muted/30 p-2.5 text-center">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="font-semibold text-sm">{fmt(totalParcelas)}</p>
        </div>
        <div className="rounded-lg border bg-green-50 p-2.5 text-center">
          <p className="text-xs text-green-700">{tipo === "pagamento" ? "Pago" : "Recebido"}</p>
          <p className="font-semibold text-sm text-green-800">{fmt(totalPago)}</p>
        </div>
        <div className="rounded-lg border bg-yellow-50 p-2.5 text-center">
          <p className="text-xs text-yellow-700">Pendente</p>
          <p className="font-semibold text-sm text-yellow-800">{fmt(totalPendente)}</p>
        </div>
        <div className="rounded-lg border bg-red-50 p-2.5 text-center">
          <p className="text-xs text-red-700">Atrasado</p>
          <p className="font-semibold text-sm text-red-800">{fmt(totalAtrasado)}</p>
        </div>
      </div>

      {/* Tabela */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-12 text-center">#</TableHead>
              <TableHead>Valor (R$)</TableHead>
              <TableHead>
                <span className="flex items-center gap-1">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  Vencimento
                </span>
              </TableHead>
              <TableHead>
                <span className="flex items-center gap-1">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {dataEfetivadaLabel}
                </span>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Observação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {parcelas.map((parcela, index) => (
              <TableRow key={index} className={parcela.status === "Atrasado" ? "bg-red-50/50" : ""}>
                <TableCell className="text-center font-medium text-muted-foreground text-sm">
                  {parcela.numeroParcela}/{parcelas.length}
                </TableCell>
                <TableCell>
                  {readOnly ? (
                    <span className="font-medium">{fmt(parseFloat(parcela.valor || "0"))}</span>
                  ) : (
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={parcela.valor}
                      onChange={(e) => updateParcela(index, "valor", e.target.value)}
                      className="h-8 w-28 text-sm"
                    />
                  )}
                </TableCell>
                <TableCell>
                  {readOnly ? (
                    <span className="text-sm">{parcela.dataVencimento}</span>
                  ) : (
                    <Input
                      type="date"
                      value={parcela.dataVencimento}
                      onChange={(e) => updateParcela(index, "dataVencimento", e.target.value)}
                      className="h-8 w-36 text-sm"
                    />
                  )}
                </TableCell>
                <TableCell>
                  {readOnly ? (
                    <span className="text-sm text-muted-foreground">
                      {parcela[dataEfetivadaKey as keyof ParcelaLocal] || "—"}
                    </span>
                  ) : (
                    <Input
                      type="date"
                      value={(parcela[dataEfetivadaKey as keyof ParcelaLocal] as string) || ""}
                      onChange={(e) => updateParcela(index, dataEfetivadaKey as keyof ParcelaLocal, e.target.value)}
                      className="h-8 w-36 text-sm"
                    />
                  )}
                </TableCell>
                <TableCell>
                  {readOnly ? (
                    <Badge className={`${statusColors[parcela.status] || ""} flex items-center gap-1 w-fit text-xs border`} variant="outline">
                      <StatusIcon status={parcela.status} />
                      {parcela.status}
                    </Badge>
                  ) : (
                    <Select
                      value={parcela.status}
                      onValueChange={(v) => updateParcela(index, "status", v)}
                    >
                      <SelectTrigger className="h-8 w-32 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </TableCell>
                <TableCell>
                  {readOnly ? (
                    <span className="text-sm text-muted-foreground">{parcela.observacao || "—"}</span>
                  ) : (
                    <Input
                      value={parcela.observacao || ""}
                      onChange={(e) => updateParcela(index, "observacao", e.target.value)}
                      placeholder="Opcional"
                      className="h-8 text-sm"
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/**
 * Gera parcelas automaticamente com base no valor total, quantidade e data inicial.
 * Distribui qualquer centavo residual na última parcela.
 */
export function gerarParcelas(
  tipo: TipoParcela,
  qtd: number,
  valorTotal: number,
  dataInicial: string // YYYY-MM-DD
): ParcelaLocal[] {
  if (qtd <= 0 || valorTotal <= 0 || !dataInicial) return [];

  const valorParcela = Math.floor((valorTotal / qtd) * 100) / 100;
  const residuo = Math.round((valorTotal - valorParcela * qtd) * 100) / 100;

  return Array.from({ length: qtd }, (_, i) => {
    const data = new Date(dataInicial + "T12:00:00");
    data.setMonth(data.getMonth() + i);
    const dataStr = data.toISOString().split("T")[0];
    const valor = i === qtd - 1
      ? (valorParcela + residuo).toFixed(2)
      : valorParcela.toFixed(2);

    return {
      numeroParcela: i + 1,
      valor,
      dataVencimento: dataStr,
      status: tipo === "pagamento" ? "Pendente" : "Pendente",
      observacao: "",
    };
  });
}
