/**
 * ComprovanteViewer
 * Componente de comprovante para impressão individual ou em lote.
 * Abre em um modal com preview e botão de impressão.
 * Suporta pagamentos e recebimentos, incluindo parcelas.
 */
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Printer, X } from "lucide-react";
import { useRef } from "react";

function formatCurrency(value: any) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(parseFloat(value ?? 0));
}
function formatDate(date: Date | string | null | undefined) {
  if (!date) return "-";
  const iso = date instanceof Date ? date.toISOString() : String(date);
  const parts = iso.substring(0, 10).split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return new Date(date).toLocaleDateString("pt-BR");
}

export type ComprovantePagamento = {
  id: number;
  numeroControle?: string | null;
  nomeCompleto: string;
  cpf?: string | null;
  banco?: string | null;
  chavePix?: string | null;
  tipoChavePix?: string | null;
  tipoServico?: string | null;
  centroCusto?: string | null;
  valor: any;
  dataPagamento: Date | string;
  status: string;
  observacao?: string | null;
  parcelado?: boolean;
  quantidadeParcelas?: number;
  parcelaAtual?: number;
};

export type ComprovanteRecebimento = {
  id: number;
  numeroControle?: string | null;
  numeroContrato?: string | null;
  nomeRazaoSocial: string;
  tipoRecebimento: string;
  valorTotal: any;
  valorEquipamento?: any;
  valorServico?: any;
  juros?: any;
  desconto?: any;
  quantidadeParcelas?: number;
  parcelaAtual?: number;
  dataVencimento: Date | string;
  dataRecebimento?: Date | string | null;
  status: string;
  descricao?: string | null;
  observacao?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  tipo: "pagamento" | "recebimento";
  registros: ComprovantePagamento[] | ComprovanteRecebimento[];
};

function CabecalhoEmpresa({ empresa }: { empresa: any }) {
  return (
    <div className="flex items-center gap-4 border-b-2 border-gray-800 pb-4 mb-6">
      {empresa?.logoUrl && (
        <img src={empresa.logoUrl} alt="Logo" className="h-16 w-auto object-contain" />
      )}
      <div className="flex-1">
        <h1 className="text-xl font-bold text-gray-900">{empresa?.nomeEmpresa || "Empresa"}</h1>
        {empresa?.cnpj && <p className="text-sm text-gray-600">CNPJ: {empresa.cnpj}</p>}
        {empresa?.telefone && <p className="text-sm text-gray-600">Tel: {empresa.telefone}</p>}
        {empresa?.email && <p className="text-sm text-gray-600">{empresa.email}</p>}
        {empresa?.endereco && <p className="text-sm text-gray-600">{empresa.endereco}</p>}
      </div>
      <div className="text-right text-sm text-gray-500">
        <p>Emitido em</p>
        <p className="font-medium text-gray-700">{new Date().toLocaleDateString("pt-BR")}</p>
        <p>{new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
      </div>
    </div>
  );
}

function ComprovantePagamentoCard({
  registro,
  empresa,
  index,
  total,
}: {
  registro: ComprovantePagamento;
  empresa: any;
  index: number;
  total: number;
}) {
  const { data: parcelas = [] } = trpc.pagamentoParcelas.list.useQuery(
    { pagamentoId: registro.id },
    { enabled: (registro.quantidadeParcelas ?? 1) > 1 }
  );

  return (
    <div className={`${index > 0 ? "page-break-before mt-8 pt-8 border-t-2 border-dashed border-gray-300" : ""}`}>
      {/* Cabeçalho da empresa em cada página */}
      <CabecalhoEmpresa empresa={empresa} />

      {/* Título */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wide">
          Comprovante de Pagamento
        </h2>
        {total > 1 && (
          <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            {index + 1} de {total}
          </span>
        )}
      </div>

      {/* Dados principais */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
        <div className="col-span-2 flex items-center gap-2 mb-1">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
            registro.status === "Pago" ? "bg-green-100 text-green-800" :
            registro.status === "Pendente" ? "bg-yellow-100 text-yellow-800" :
            registro.status === "Cancelado" ? "bg-gray-100 text-gray-600" :
            "bg-blue-100 text-blue-800"
          }`}>
            {registro.status}
          </span>
          {registro.numeroControle && (
            <span className="font-mono text-xs text-gray-500 bg-gray-50 border border-gray-200 px-2 py-1 rounded">
              Nº {registro.numeroControle}
            </span>
          )}
        </div>

        <Field label="Nome Completo" value={registro.nomeCompleto} />
        <Field label="CPF" value={registro.cpf || "-"} />
        <Field label="Banco" value={registro.banco || "-"} />
        <Field label="Tipo de Chave Pix" value={registro.tipoChavePix || "-"} />
        <Field label="Chave Pix" value={registro.chavePix || "-"} className="col-span-2" />
        <Field label="Tipo de Serviço" value={registro.tipoServico || "-"} />
        <Field label="Centro de Custo" value={registro.centroCusto || "-"} />
        <Field label="Data de Pagamento" value={formatDate(registro.dataPagamento)} />
        <Field
          label="Valor"
          value={formatCurrency(registro.valor)}
          highlight
        />
        {(registro.quantidadeParcelas ?? 1) > 1 && (
          <Field
            label="Parcela"
            value={`${registro.parcelaAtual ?? 1} de ${registro.quantidadeParcelas}`}
          />
        )}
        {registro.observacao && (
          <Field label="Observação" value={registro.observacao} className="col-span-2" />
        )}
      </div>

      {/* Tabela de parcelas */}
      {parcelas.length > 0 && (
        <div className="mt-5">
          <p className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">Parcelas</p>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-3 py-2 text-left font-medium">Parcela</th>
                <th className="border border-gray-300 px-3 py-2 text-right font-medium">Valor</th>
                <th className="border border-gray-300 px-3 py-2 text-left font-medium">Vencimento</th>
                <th className="border border-gray-300 px-3 py-2 text-left font-medium">Pagamento</th>
                <th className="border border-gray-300 px-3 py-2 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {parcelas.map((p) => (
                <tr key={p.id} className="even:bg-gray-50">
                  <td className="border border-gray-300 px-3 py-1.5 text-center">{p.numeroParcela}</td>
                  <td className="border border-gray-300 px-3 py-1.5 text-right font-medium">{formatCurrency(p.valor)}</td>
                  <td className="border border-gray-300 px-3 py-1.5">{formatDate(p.dataVencimento)}</td>
                  <td className="border border-gray-300 px-3 py-1.5">{formatDate(p.dataPagamento)}</td>
                  <td className="border border-gray-300 px-3 py-1.5">{p.status}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-semibold">
                <td className="border border-gray-300 px-3 py-2" colSpan={1}>Total</td>
                <td className="border border-gray-300 px-3 py-2 text-right">
                  {formatCurrency(parcelas.reduce((acc, p) => acc + parseFloat(String(p.valor ?? 0)), 0))}
                </td>
                <td colSpan={3} className="border border-gray-300 px-3 py-2" />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Assinaturas */}
      <div className="grid grid-cols-2 gap-8 mt-10 pt-6">
        <div className="text-center">
          <div className="border-t border-gray-400 pt-2">
            <p className="text-xs text-gray-500">Responsável pelo Pagamento</p>
          </div>
        </div>
        <div className="text-center">
          <div className="border-t border-gray-400 pt-2">
            <p className="text-xs text-gray-500">Beneficiário / Recebedor</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ComprovanteRecebimentoCard({
  registro,
  empresa,
  index,
  total,
}: {
  registro: ComprovanteRecebimento;
  empresa: any;
  index: number;
  total: number;
}) {
  const { data: parcelas = [] } = trpc.recebimentoParcelas.list.useQuery(
    { recebimentoId: registro.id },
    { enabled: (registro.quantidadeParcelas ?? 1) > 1 }
  );

  const valorLiquido =
    parseFloat(String(registro.valorTotal ?? 0)) +
    parseFloat(String(registro.juros ?? 0)) -
    parseFloat(String(registro.desconto ?? 0));

  return (
    <div className={`${index > 0 ? "page-break-before mt-8 pt-8 border-t-2 border-dashed border-gray-300" : ""}`}>
      <CabecalhoEmpresa empresa={empresa} />

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wide">
          Comprovante de Recebimento
        </h2>
        {total > 1 && (
          <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            {index + 1} de {total}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
        <div className="col-span-2 flex items-center gap-2 mb-1">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
            registro.status === "Recebido" ? "bg-green-100 text-green-800" :
            registro.status === "Pendente" ? "bg-yellow-100 text-yellow-800" :
            registro.status === "Atrasado" ? "bg-red-100 text-red-800" :
            "bg-gray-100 text-gray-600"
          }`}>
            {registro.status}
          </span>
          {registro.numeroControle && (
            <span className="font-mono text-xs text-gray-500 bg-gray-50 border border-gray-200 px-2 py-1 rounded">
              Nº {registro.numeroControle}
            </span>
          )}
          {registro.numeroContrato && (
            <span className="text-xs text-gray-500 bg-gray-50 border border-gray-200 px-2 py-1 rounded">
              Contrato: {registro.numeroContrato}
            </span>
          )}
        </div>

        <Field label="Nome / Razão Social" value={registro.nomeRazaoSocial} className="col-span-2" />
        <Field label="Tipo de Recebimento" value={registro.tipoRecebimento} />
        <Field label="Data de Vencimento" value={formatDate(registro.dataVencimento)} />
        {registro.dataRecebimento && (
          <Field label="Data de Recebimento" value={formatDate(registro.dataRecebimento)} />
        )}
        {(registro.quantidadeParcelas ?? 1) > 1 && (
          <Field label="Parcela" value={`${registro.parcelaAtual ?? 1} de ${registro.quantidadeParcelas}`} />
        )}
        <Field label="Valor Total" value={formatCurrency(registro.valorTotal)} />
        {parseFloat(String(registro.valorEquipamento ?? 0)) > 0 && (
          <Field label="Equipamentos" value={formatCurrency(registro.valorEquipamento)} />
        )}
        {parseFloat(String(registro.valorServico ?? 0)) > 0 && (
          <Field label="Serviços" value={formatCurrency(registro.valorServico)} />
        )}
        {parseFloat(String(registro.juros ?? 0)) > 0 && (
          <Field label="Juros" value={formatCurrency(registro.juros)} />
        )}
        {parseFloat(String(registro.desconto ?? 0)) > 0 && (
          <Field label="Desconto" value={`- ${formatCurrency(registro.desconto)}`} />
        )}
        <Field label="Valor Líquido" value={formatCurrency(valorLiquido)} highlight className="col-span-2" />
        {registro.descricao && (
          <Field label="Descrição" value={registro.descricao} className="col-span-2" />
        )}
        {registro.observacao && (
          <Field label="Observação" value={registro.observacao} className="col-span-2" />
        )}
      </div>

      {/* Tabela de parcelas */}
      {parcelas.length > 0 && (
        <div className="mt-5">
          <p className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">Parcelas</p>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-3 py-2 text-left font-medium">Parcela</th>
                <th className="border border-gray-300 px-3 py-2 text-right font-medium">Valor</th>
                <th className="border border-gray-300 px-3 py-2 text-left font-medium">Vencimento</th>
                <th className="border border-gray-300 px-3 py-2 text-left font-medium">Recebimento</th>
                <th className="border border-gray-300 px-3 py-2 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {parcelas.map((p) => (
                <tr key={p.id} className="even:bg-gray-50">
                  <td className="border border-gray-300 px-3 py-1.5 text-center">{p.numeroParcela}</td>
                  <td className="border border-gray-300 px-3 py-1.5 text-right font-medium">{formatCurrency(p.valor)}</td>
                  <td className="border border-gray-300 px-3 py-1.5">{formatDate(p.dataVencimento)}</td>
                  <td className="border border-gray-300 px-3 py-1.5">{formatDate(p.dataRecebimento)}</td>
                  <td className="border border-gray-300 px-3 py-1.5">{p.status}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-semibold">
                <td className="border border-gray-300 px-3 py-2">Total</td>
                <td className="border border-gray-300 px-3 py-2 text-right">
                  {formatCurrency(parcelas.reduce((acc, p) => acc + parseFloat(String(p.valor ?? 0)), 0))}
                </td>
                <td colSpan={3} className="border border-gray-300 px-3 py-2" />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <div className="grid grid-cols-2 gap-8 mt-10 pt-6">
        <div className="text-center">
          <div className="border-t border-gray-400 pt-2">
            <p className="text-xs text-gray-500">Responsável pelo Recebimento</p>
          </div>
        </div>
        <div className="text-center">
          <div className="border-t border-gray-400 pt-2">
            <p className="text-xs text-gray-500">Cliente / Pagador</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  highlight,
  className = "",
}: {
  label: string;
  value: string;
  highlight?: boolean;
  className?: string;
}) {
  return (
    <div className={`${className}`}>
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">{label}</p>
      <p className={`font-medium text-gray-900 ${highlight ? "text-lg font-bold" : ""}`}>{value}</p>
    </div>
  );
}

export function ComprovanteViewer({ open, onClose, tipo, registros }: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const { data: empresa } = trpc.empresa.get.useQuery();

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>Comprovante${registros.length > 1 ? "s" : ""} - ${tipo === "pagamento" ? "Pagamento" : "Recebimento"}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; font-size: 13px; color: #111; background: #fff; padding: 24px; }
          h1 { font-size: 18px; font-weight: 700; }
          h2 { font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
          .page-break-before { page-break-before: always; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; font-size: 12px; }
          th { background: #f3f4f6; font-weight: 600; }
          tr:nth-child(even) td { background: #fafafa; }
          tfoot td { background: #f3f4f6; font-weight: 600; }
          .badge { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; }
          .badge-green { background: #dcfce7; color: #166534; }
          .badge-yellow { background: #fef9c3; color: #854d0e; }
          .badge-red { background: #fee2e2; color: #991b1b; }
          .badge-gray { background: #f3f4f6; color: #374151; }
          .badge-blue { background: #dbeafe; color: #1e40af; }
          .field-label { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1px; }
          .field-value { font-weight: 500; color: #111; }
          .field-value.highlight { font-size: 16px; font-weight: 700; }
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 32px; }
          .col-span-2 { grid-column: span 2; }
          .header { display: flex; align-items: center; gap: 16px; border-bottom: 2px solid #1f2937; padding-bottom: 16px; margin-bottom: 24px; }
          .header img { height: 56px; width: auto; object-fit: contain; }
          .header-info { flex: 1; }
          .header-date { text-align: right; font-size: 11px; color: #6b7280; }
          .separator { border-top: 2px dashed #d1d5db; margin: 32px 0; }
          .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 40px; padding-top: 24px; }
          .signature-line { border-top: 1px solid #9ca3af; padding-top: 8px; text-align: center; font-size: 11px; color: #6b7280; }
          .mono { font-family: monospace; font-size: 11px; color: #6b7280; background: #f9fafb; border: 1px solid #e5e7eb; padding: 2px 8px; border-radius: 4px; }
          @media print {
            body { padding: 16px; }
            .page-break-before { page-break-before: always; }
          }
        </style>
      </head>
      <body>
        ${content.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const title = tipo === "pagamento"
    ? `Comprovante${registros.length > 1 ? "s" : ""} de Pagamento`
    : `Comprovante${registros.length > 1 ? "s" : ""} de Recebimento`;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{title} ({registros.length} registro{registros.length > 1 ? "s" : ""})</DialogTitle>
          </div>
        </DialogHeader>

        {/* Botões de ação */}
        <div className="flex gap-2 pb-4 border-b no-print">
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Imprimir / Salvar PDF
          </Button>
          <Button variant="outline" onClick={onClose} className="gap-2">
            <X className="h-4 w-4" />
            Fechar
          </Button>
        </div>

        {/* Preview do comprovante */}
        <div
          ref={printRef}
          className="bg-white p-6 rounded-lg border text-gray-900 space-y-0"
          style={{ fontFamily: "Arial, sans-serif" }}
        >
          {tipo === "pagamento"
            ? (registros as ComprovantePagamento[]).map((r, i) => (
                <ComprovantePagamentoCard
                  key={r.id}
                  registro={r}
                  empresa={empresa}
                  index={i}
                  total={registros.length}
                />
              ))
            : (registros as ComprovanteRecebimento[]).map((r, i) => (
                <ComprovanteRecebimentoCard
                  key={r.id}
                  registro={r}
                  empresa={empresa}
                  index={i}
                  total={registros.length}
                />
              ))
          }
        </div>
      </DialogContent>
    </Dialog>
  );
}
