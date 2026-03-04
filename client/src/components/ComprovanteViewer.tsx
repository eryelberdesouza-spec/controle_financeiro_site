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
  tipoPix?: string | null;
  tipoChavePix?: string | null;
  tipoServico?: string | null;
  centroCusto?: string | null;
  valor: any;
  dataPagamento: Date | string;
  status: string;
  observacao?: string | null;
  autorizadoPor?: string | null;
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

// CSS de impressão injetado na janela de print — controla exatamente como o PDF fica
const PRINT_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11px;
    color: #111827;
    background: #fff;
    padding: 20px 24px;
  }

  /* ── Cabeçalho da empresa ── */
  .comp-header {
    display: flex;
    align-items: center;
    gap: 12px;
    border-bottom: 2px solid #1f2937;
    padding-bottom: 10px;
    margin-bottom: 14px;
  }
  .comp-header img {
    height: 52px !important;
    max-height: 52px !important;
    width: auto !important;
    max-width: 120px !important;
    object-fit: contain !important;
    display: block !important;
  }
  .comp-header-info { flex: 1; }
  .comp-header-info h1 { font-size: 14px; font-weight: 700; margin-bottom: 2px; }
  .comp-header-info p { font-size: 10px; color: #4b5563; line-height: 1.4; }
  .comp-header-date { text-align: right; font-size: 10px; color: #6b7280; white-space: nowrap; }
  .comp-header-date strong { display: block; font-size: 11px; color: #374151; }

  /* ── Título do comprovante ── */
  .comp-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }
  .comp-title {
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #111827;
  }
  .comp-badge-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
  }
  .badge {
    display: inline-block;
    padding: 2px 9px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 700;
  }
  .badge-green  { background: #dcfce7; color: #166534; }
  .badge-yellow { background: #fef9c3; color: #854d0e; }
  .badge-red    { background: #fee2e2; color: #991b1b; }
  .badge-gray   { background: #f3f4f6; color: #374151; }
  .badge-blue   { background: #dbeafe; color: #1e40af; }
  .mono {
    font-family: monospace;
    font-size: 10px;
    color: #6b7280;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    padding: 1px 6px;
    border-radius: 3px;
  }

  /* ── Grade de campos ── */
  .comp-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px 24px;
    margin-bottom: 12px;
  }
  .comp-field { }
  .comp-field.span2 { grid-column: span 2; }
  .comp-field-label {
    font-size: 9px;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 1px;
  }
  .comp-field-value {
    font-size: 11px;
    font-weight: 600;
    color: #111827;
    line-height: 1.3;
  }
  .comp-field-value.highlight {
    font-size: 14px;
    font-weight: 700;
    color: #1d4ed8;
  }

  /* ── Divisor entre comprovantes em lote ── */
  .comp-separator {
    border-top: 2px dashed #d1d5db;
    margin: 20px 0;
  }

  /* ── Tabela de parcelas ── */
  .comp-parcelas-title {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #374151;
    margin-bottom: 5px;
    margin-top: 10px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10px;
  }
  th, td {
    border: 1px solid #d1d5db;
    padding: 4px 8px;
    text-align: left;
  }
  th { background: #f3f4f6; font-weight: 700; }
  tr:nth-child(even) td { background: #fafafa; }
  tfoot td { background: #f3f4f6; font-weight: 700; }
  td.right, th.right { text-align: right; }
  td.center, th.center { text-align: center; }

  /* ── Assinaturas ── */
  .comp-signatures {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 32px;
    margin-top: 24px;
    padding-top: 16px;
  }
  .comp-sig-line {
    border-top: 1px solid #9ca3af;
    padding-top: 6px;
    text-align: center;
    font-size: 10px;
    color: #6b7280;
  }

  /* ── Forçar página única para comprovante simples ── */
  @page {
    size: A4 portrait;
    margin: 15mm 15mm 15mm 15mm;
  }
  @media print {
    body { padding: 0; }
    .comp-header img {
      height: 52px !important;
      max-height: 52px !important;
      width: auto !important;
      max-width: 120px !important;
    }
    .page-break { page-break-before: always; }
  }
`;

function buildPagamentoHTML(registro: ComprovantePagamento, empresa: any, parcelas: any[], index: number, total: number): string {
  const statusClass =
    registro.status === "Pago" ? "badge-green" :
    registro.status === "Pendente" ? "badge-yellow" :
    registro.status === "Cancelado" ? "badge-gray" : "badge-blue";

  const tipoPix = (registro as any).tipoPix || (registro as any).tipoChavePix || "-";

  const parcelasHTML = parcelas.length > 0 ? `
    <p class="comp-parcelas-title">Parcelas</p>
    <table>
      <thead>
        <tr>
          <th class="center">Nº</th>
          <th class="right">Valor</th>
          <th>Vencimento</th>
          <th>Pagamento</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${parcelas.map(p => `
          <tr>
            <td class="center">${p.numeroParcela}</td>
            <td class="right">${formatCurrency(p.valor)}</td>
            <td>${formatDate(p.dataVencimento)}</td>
            <td>${formatDate(p.dataPagamento)}</td>
            <td>${p.status}</td>
          </tr>
        `).join("")}
      </tbody>
      <tfoot>
        <tr>
          <td>Total</td>
          <td class="right">${formatCurrency(parcelas.reduce((acc: number, p: any) => acc + parseFloat(String(p.valor ?? 0)), 0))}</td>
          <td colspan="3"></td>
        </tr>
      </tfoot>
    </table>
  ` : "";

  return `
    ${index > 0 ? '<div class="comp-separator"></div>' : ""}

    <div class="comp-header">
      ${empresa?.logoUrl ? `<img src="${empresa.logoUrl}" alt="Logo" />` : ""}
      <div class="comp-header-info">
        <h1>${empresa?.nomeEmpresa || "Empresa"}</h1>
        ${empresa?.cnpj ? `<p>CNPJ: ${empresa.cnpj}</p>` : ""}
        ${empresa?.telefone ? `<p>Tel: ${empresa.telefone}</p>` : ""}
        ${empresa?.email ? `<p>${empresa.email}</p>` : ""}
        ${empresa?.endereco ? `<p>${empresa.endereco}</p>` : ""}
      </div>
      <div class="comp-header-date">
        <span>Emitido em</span>
        <strong>${new Date().toLocaleDateString("pt-BR")}</strong>
        <span>${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
      </div>
    </div>

    <div class="comp-title-row">
      <span class="comp-title">Comprovante de Pagamento</span>
      ${total > 1 ? `<span class="mono">${index + 1} de ${total}</span>` : ""}
    </div>

    <div class="comp-badge-row">
      <span class="badge ${statusClass}">${registro.status}</span>
      ${registro.numeroControle ? `<span class="mono">Nº ${registro.numeroControle}</span>` : ""}
    </div>

    <div class="comp-grid">
      <div class="comp-field">
        <div class="comp-field-label">Nome Completo</div>
        <div class="comp-field-value">${registro.nomeCompleto}</div>
      </div>
      <div class="comp-field">
        <div class="comp-field-label">CPF</div>
        <div class="comp-field-value">${registro.cpf || "-"}</div>
      </div>
      <div class="comp-field">
        <div class="comp-field-label">Banco</div>
        <div class="comp-field-value">${registro.banco || "-"}</div>
      </div>
      <div class="comp-field">
        <div class="comp-field-label">Tipo de Chave Pix</div>
        <div class="comp-field-value">${tipoPix}</div>
      </div>
      <div class="comp-field span2">
        <div class="comp-field-label">Chave Pix</div>
        <div class="comp-field-value">${registro.chavePix || "-"}</div>
      </div>
      <div class="comp-field">
        <div class="comp-field-label">Tipo de Serviço</div>
        <div class="comp-field-value">${registro.tipoServico || "-"}</div>
      </div>
      <div class="comp-field">
        <div class="comp-field-label">Centro de Custo</div>
        <div class="comp-field-value">${registro.centroCusto || "-"}</div>
      </div>
      <div class="comp-field">
        <div class="comp-field-label">Data de Pagamento</div>
        <div class="comp-field-value">${formatDate(registro.dataPagamento)}</div>
      </div>
      <div class="comp-field">
        <div class="comp-field-label">Valor</div>
        <div class="comp-field-value highlight">${formatCurrency(registro.valor)}</div>
      </div>
      ${(registro.quantidadeParcelas ?? 1) > 1 ? `
        <div class="comp-field">
          <div class="comp-field-label">Parcela</div>
          <div class="comp-field-value">${registro.parcelaAtual ?? 1} de ${registro.quantidadeParcelas}</div>
        </div>
      ` : ""}
      ${registro.autorizadoPor ? `
        <div class="comp-field">
          <div class="comp-field-label">Autorizado por</div>
          <div class="comp-field-value">${registro.autorizadoPor}</div>
        </div>
      ` : ""}
      ${registro.observacao ? `
        <div class="comp-field span2">
          <div class="comp-field-label">Observação</div>
          <div class="comp-field-value">${registro.observacao}</div>
        </div>
      ` : ""}
    </div>

    ${parcelasHTML}

    <div class="comp-signatures">
      <div class="comp-sig-line">Responsável pelo Pagamento</div>
      <div class="comp-sig-line">Beneficiário / Recebedor</div>
    </div>
  `;
}

function buildRecebimentoHTML(registro: ComprovanteRecebimento, empresa: any, parcelas: any[], index: number, total: number): string {
  const statusClass =
    registro.status === "Recebido" ? "badge-green" :
    registro.status === "Pendente" ? "badge-yellow" :
    registro.status === "Atrasado" ? "badge-red" : "badge-gray";

  const valorLiquido =
    parseFloat(String(registro.valorTotal ?? 0)) +
    parseFloat(String(registro.juros ?? 0)) -
    parseFloat(String(registro.desconto ?? 0));

  const parcelasHTML = parcelas.length > 0 ? `
    <p class="comp-parcelas-title">Parcelas</p>
    <table>
      <thead>
        <tr>
          <th class="center">Nº</th>
          <th class="right">Valor</th>
          <th>Vencimento</th>
          <th>Recebimento</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${parcelas.map(p => `
          <tr>
            <td class="center">${p.numeroParcela}</td>
            <td class="right">${formatCurrency(p.valor)}</td>
            <td>${formatDate(p.dataVencimento)}</td>
            <td>${formatDate(p.dataRecebimento)}</td>
            <td>${p.status}</td>
          </tr>
        `).join("")}
      </tbody>
      <tfoot>
        <tr>
          <td>Total</td>
          <td class="right">${formatCurrency(parcelas.reduce((acc: number, p: any) => acc + parseFloat(String(p.valor ?? 0)), 0))}</td>
          <td colspan="3"></td>
        </tr>
      </tfoot>
    </table>
  ` : "";

  return `
    ${index > 0 ? '<div class="comp-separator"></div>' : ""}

    <div class="comp-header">
      ${empresa?.logoUrl ? `<img src="${empresa.logoUrl}" alt="Logo" />` : ""}
      <div class="comp-header-info">
        <h1>${empresa?.nomeEmpresa || "Empresa"}</h1>
        ${empresa?.cnpj ? `<p>CNPJ: ${empresa.cnpj}</p>` : ""}
        ${empresa?.telefone ? `<p>Tel: ${empresa.telefone}</p>` : ""}
        ${empresa?.email ? `<p>${empresa.email}</p>` : ""}
        ${empresa?.endereco ? `<p>${empresa.endereco}</p>` : ""}
      </div>
      <div class="comp-header-date">
        <span>Emitido em</span>
        <strong>${new Date().toLocaleDateString("pt-BR")}</strong>
        <span>${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
      </div>
    </div>

    <div class="comp-title-row">
      <span class="comp-title">Comprovante de Recebimento</span>
      ${total > 1 ? `<span class="mono">${index + 1} de ${total}</span>` : ""}
    </div>

    <div class="comp-badge-row">
      <span class="badge ${statusClass}">${registro.status}</span>
      ${registro.numeroControle ? `<span class="mono">Nº ${registro.numeroControle}</span>` : ""}
      ${registro.numeroContrato ? `<span class="mono">Contrato: ${registro.numeroContrato}</span>` : ""}
    </div>

    <div class="comp-grid">
      <div class="comp-field span2">
        <div class="comp-field-label">Nome / Razão Social</div>
        <div class="comp-field-value">${registro.nomeRazaoSocial}</div>
      </div>
      <div class="comp-field">
        <div class="comp-field-label">Tipo de Recebimento</div>
        <div class="comp-field-value">${registro.tipoRecebimento}</div>
      </div>
      <div class="comp-field">
        <div class="comp-field-label">Data de Vencimento</div>
        <div class="comp-field-value">${formatDate(registro.dataVencimento)}</div>
      </div>
      ${registro.dataRecebimento ? `
        <div class="comp-field">
          <div class="comp-field-label">Data de Recebimento</div>
          <div class="comp-field-value">${formatDate(registro.dataRecebimento)}</div>
        </div>
      ` : ""}
      ${(registro.quantidadeParcelas ?? 1) > 1 ? `
        <div class="comp-field">
          <div class="comp-field-label">Parcela</div>
          <div class="comp-field-value">${registro.parcelaAtual ?? 1} de ${registro.quantidadeParcelas}</div>
        </div>
      ` : ""}
      <div class="comp-field">
        <div class="comp-field-label">Valor Total</div>
        <div class="comp-field-value">${formatCurrency(registro.valorTotal)}</div>
      </div>
      ${parseFloat(String(registro.valorEquipamento ?? 0)) > 0 ? `
        <div class="comp-field">
          <div class="comp-field-label">Equipamentos</div>
          <div class="comp-field-value">${formatCurrency(registro.valorEquipamento)}</div>
        </div>
      ` : ""}
      ${parseFloat(String(registro.valorServico ?? 0)) > 0 ? `
        <div class="comp-field">
          <div class="comp-field-label">Serviços</div>
          <div class="comp-field-value">${formatCurrency(registro.valorServico)}</div>
        </div>
      ` : ""}
      ${parseFloat(String(registro.juros ?? 0)) > 0 ? `
        <div class="comp-field">
          <div class="comp-field-label">Juros</div>
          <div class="comp-field-value">${formatCurrency(registro.juros)}</div>
        </div>
      ` : ""}
      ${parseFloat(String(registro.desconto ?? 0)) > 0 ? `
        <div class="comp-field">
          <div class="comp-field-label">Desconto</div>
          <div class="comp-field-value">- ${formatCurrency(registro.desconto)}</div>
        </div>
      ` : ""}
      <div class="comp-field span2">
        <div class="comp-field-label">Valor Líquido</div>
        <div class="comp-field-value highlight">${formatCurrency(valorLiquido)}</div>
      </div>
      ${registro.descricao ? `
        <div class="comp-field span2">
          <div class="comp-field-label">Descrição</div>
          <div class="comp-field-value">${registro.descricao}</div>
        </div>
      ` : ""}
      ${registro.observacao ? `
        <div class="comp-field span2">
          <div class="comp-field-label">Observação</div>
          <div class="comp-field-value">${registro.observacao}</div>
        </div>
      ` : ""}
    </div>

    ${parcelasHTML}

    <div class="comp-signatures">
      <div class="comp-sig-line">Responsável pelo Recebimento</div>
      <div class="comp-sig-line">Cliente / Pagador</div>
    </div>
  `;
}

// Componente de preview na tela (dentro do Dialog)
function PreviewPagamento({ registro, empresa }: { registro: ComprovantePagamento; empresa: any }) {
  const { data: parcelas = [] } = trpc.pagamentoParcelas.list.useQuery(
    { pagamentoId: registro.id },
    { enabled: (registro.quantidadeParcelas ?? 1) > 1 }
  );
  const tipoPix = (registro as any).tipoPix || (registro as any).tipoChavePix || "-";
  const statusColor =
    registro.status === "Pago" ? "bg-green-100 text-green-800" :
    registro.status === "Pendente" ? "bg-yellow-100 text-yellow-800" :
    registro.status === "Cancelado" ? "bg-gray-100 text-gray-600" : "bg-blue-100 text-blue-800";

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 text-sm text-gray-900 shadow-sm">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 border-b-2 border-gray-800 pb-3 mb-4">
        {empresa?.logoUrl && (
          <img src={empresa.logoUrl} alt="Logo" className="h-12 w-auto max-w-[100px] object-contain" />
        )}
        <div className="flex-1">
          <p className="font-bold text-base">{empresa?.nomeEmpresa || "Empresa"}</p>
          {empresa?.cnpj && <p className="text-xs text-gray-500">CNPJ: {empresa.cnpj}</p>}
          {empresa?.telefone && <p className="text-xs text-gray-500">Tel: {empresa.telefone}</p>}
          {empresa?.email && <p className="text-xs text-gray-500">{empresa.email}</p>}
        </div>
        <div className="text-right text-xs text-gray-500">
          <p>Emitido em</p>
          <p className="font-semibold text-gray-700">{new Date().toLocaleDateString("pt-BR")}</p>
          <p>{new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
        </div>
      </div>

      {/* Título */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-sm uppercase tracking-wide">Comprovante de Pagamento</h2>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-2 mb-3">
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColor}`}>{registro.status}</span>
        {registro.numeroControle && (
          <span className="font-mono text-xs text-gray-500 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded">Nº {registro.numeroControle}</span>
        )}
      </div>

      {/* Campos em grade */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-3">
        <Field label="Nome Completo" value={registro.nomeCompleto} />
        <Field label="CPF" value={registro.cpf || "-"} />
        <Field label="Banco" value={registro.banco || "-"} />
        <Field label="Tipo de Chave Pix" value={tipoPix} />
        <Field label="Chave Pix" value={registro.chavePix || "-"} className="col-span-2" />
        <Field label="Tipo de Serviço" value={registro.tipoServico || "-"} />
        <Field label="Centro de Custo" value={registro.centroCusto || "-"} />
        <Field label="Data de Pagamento" value={formatDate(registro.dataPagamento)} />
        <Field label="Valor" value={formatCurrency(registro.valor)} highlight />
        {(registro.quantidadeParcelas ?? 1) > 1 && (
          <Field label="Parcela" value={`${registro.parcelaAtual ?? 1} de ${registro.quantidadeParcelas}`} />
        )}
        {registro.autorizadoPor && <Field label="Autorizado por" value={registro.autorizadoPor} />}
        {registro.observacao && <Field label="Observação" value={registro.observacao} className="col-span-2" />}
      </div>

      {/* Parcelas */}
      {parcelas.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-600 mb-1">Parcelas</p>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-2 py-1 text-center">Nº</th>
                <th className="border border-gray-300 px-2 py-1 text-right">Valor</th>
                <th className="border border-gray-300 px-2 py-1">Vencimento</th>
                <th className="border border-gray-300 px-2 py-1">Pagamento</th>
                <th className="border border-gray-300 px-2 py-1">Status</th>
              </tr>
            </thead>
            <tbody>
              {parcelas.map((p) => (
                <tr key={p.id} className="even:bg-gray-50">
                  <td className="border border-gray-300 px-2 py-1 text-center">{p.numeroParcela}</td>
                  <td className="border border-gray-300 px-2 py-1 text-right font-medium">{formatCurrency(p.valor)}</td>
                  <td className="border border-gray-300 px-2 py-1">{formatDate(p.dataVencimento)}</td>
                  <td className="border border-gray-300 px-2 py-1">{formatDate(p.dataPagamento)}</td>
                  <td className="border border-gray-300 px-2 py-1">{p.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Assinaturas */}
      <div className="grid grid-cols-2 gap-8 mt-6 pt-4">
        <div className="text-center border-t border-gray-400 pt-2">
          <p className="text-xs text-gray-500">Responsável pelo Pagamento</p>
        </div>
        <div className="text-center border-t border-gray-400 pt-2">
          <p className="text-xs text-gray-500">Beneficiário / Recebedor</p>
        </div>
      </div>
    </div>
  );
}

function PreviewRecebimento({ registro, empresa }: { registro: ComprovanteRecebimento; empresa: any }) {
  const { data: parcelas = [] } = trpc.recebimentoParcelas.list.useQuery(
    { recebimentoId: registro.id },
    { enabled: (registro.quantidadeParcelas ?? 1) > 1 }
  );
  const valorLiquido =
    parseFloat(String(registro.valorTotal ?? 0)) +
    parseFloat(String(registro.juros ?? 0)) -
    parseFloat(String(registro.desconto ?? 0));
  const statusColor =
    registro.status === "Recebido" ? "bg-green-100 text-green-800" :
    registro.status === "Pendente" ? "bg-yellow-100 text-yellow-800" :
    registro.status === "Atrasado" ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-600";

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 text-sm text-gray-900 shadow-sm">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 border-b-2 border-gray-800 pb-3 mb-4">
        {empresa?.logoUrl && (
          <img src={empresa.logoUrl} alt="Logo" className="h-12 w-auto max-w-[100px] object-contain" />
        )}
        <div className="flex-1">
          <p className="font-bold text-base">{empresa?.nomeEmpresa || "Empresa"}</p>
          {empresa?.cnpj && <p className="text-xs text-gray-500">CNPJ: {empresa.cnpj}</p>}
          {empresa?.telefone && <p className="text-xs text-gray-500">Tel: {empresa.telefone}</p>}
          {empresa?.email && <p className="text-xs text-gray-500">{empresa.email}</p>}
        </div>
        <div className="text-right text-xs text-gray-500">
          <p>Emitido em</p>
          <p className="font-semibold text-gray-700">{new Date().toLocaleDateString("pt-BR")}</p>
          <p>{new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-sm uppercase tracking-wide">Comprovante de Recebimento</h2>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColor}`}>{registro.status}</span>
        {registro.numeroControle && (
          <span className="font-mono text-xs text-gray-500 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded">Nº {registro.numeroControle}</span>
        )}
        {registro.numeroContrato && (
          <span className="text-xs text-gray-500 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded">Contrato: {registro.numeroContrato}</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-3">
        <Field label="Nome / Razão Social" value={registro.nomeRazaoSocial} className="col-span-2" />
        <Field label="Tipo de Recebimento" value={registro.tipoRecebimento} />
        <Field label="Data de Vencimento" value={formatDate(registro.dataVencimento)} />
        {registro.dataRecebimento && <Field label="Data de Recebimento" value={formatDate(registro.dataRecebimento)} />}
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
        {registro.descricao && <Field label="Descrição" value={registro.descricao} className="col-span-2" />}
        {registro.observacao && <Field label="Observação" value={registro.observacao} className="col-span-2" />}
      </div>

      {parcelas.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-600 mb-1">Parcelas</p>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-2 py-1 text-center">Nº</th>
                <th className="border border-gray-300 px-2 py-1 text-right">Valor</th>
                <th className="border border-gray-300 px-2 py-1">Vencimento</th>
                <th className="border border-gray-300 px-2 py-1">Recebimento</th>
                <th className="border border-gray-300 px-2 py-1">Status</th>
              </tr>
            </thead>
            <tbody>
              {parcelas.map((p) => (
                <tr key={p.id} className="even:bg-gray-50">
                  <td className="border border-gray-300 px-2 py-1 text-center">{p.numeroParcela}</td>
                  <td className="border border-gray-300 px-2 py-1 text-right font-medium">{formatCurrency(p.valor)}</td>
                  <td className="border border-gray-300 px-2 py-1">{formatDate(p.dataVencimento)}</td>
                  <td className="border border-gray-300 px-2 py-1">{formatDate(p.dataRecebimento)}</td>
                  <td className="border border-gray-300 px-2 py-1">{p.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid grid-cols-2 gap-8 mt-6 pt-4">
        <div className="text-center border-t border-gray-400 pt-2">
          <p className="text-xs text-gray-500">Responsável pelo Recebimento</p>
        </div>
        <div className="text-center border-t border-gray-400 pt-2">
          <p className="text-xs text-gray-500">Cliente / Pagador</p>
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
    <div className={className}>
      <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">{label}</p>
      <p className={`font-semibold text-gray-900 ${highlight ? "text-base font-bold text-blue-700" : "text-sm"}`}>{value}</p>
    </div>
  );
}

export function ComprovanteViewer({ open, onClose, tipo, registros }: Props) {
  const { data: empresa } = trpc.empresa.get.useQuery();

  // Busca parcelas para todos os registros (necessário para o print HTML)
  const parcelasPag = registros.map((r) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { data } = trpc.pagamentoParcelas.list.useQuery(
      { pagamentoId: r.id },
      { enabled: tipo === "pagamento" && (r as ComprovantePagamento).quantidadeParcelas !== undefined && ((r as ComprovantePagamento).quantidadeParcelas ?? 1) > 1 }
    );
    return data ?? [];
  });

  const parcelasRec = registros.map((r) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { data } = trpc.recebimentoParcelas.list.useQuery(
      { recebimentoId: r.id },
      { enabled: tipo === "recebimento" && (r as ComprovanteRecebimento).quantidadeParcelas !== undefined && ((r as ComprovanteRecebimento).quantidadeParcelas ?? 1) > 1 }
    );
    return data ?? [];
  });

  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) return;

    let bodyHTML = "";
    if (tipo === "pagamento") {
      (registros as ComprovantePagamento[]).forEach((r, i) => {
        bodyHTML += buildPagamentoHTML(r, empresa, parcelasPag[i] ?? [], i, registros.length);
      });
    } else {
      (registros as ComprovanteRecebimento[]).forEach((r, i) => {
        bodyHTML += buildRecebimentoHTML(r, empresa, parcelasRec[i] ?? [], i, registros.length);
      });
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>Comprovante${registros.length > 1 ? "s" : ""} - ${tipo === "pagamento" ? "Pagamento" : "Recebimento"}</title>
        <style>${PRINT_CSS}</style>
      </head>
      <body>${bodyHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 600);
  };

  const title = tipo === "pagamento"
    ? `Comprovante${registros.length > 1 ? "s" : ""} de Pagamento`
    : `Comprovante${registros.length > 1 ? "s" : ""} de Recebimento`;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{title} ({registros.length} registro{registros.length > 1 ? "s" : ""})</DialogTitle>
          </div>
        </DialogHeader>

        {/* Botões de ação */}
        <div className="flex gap-2 pb-4 border-b">
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Imprimir / Salvar PDF
          </Button>
          <Button variant="outline" onClick={onClose} className="gap-2">
            <X className="h-4 w-4" />
            Fechar
          </Button>
        </div>

        {/* Preview dos comprovantes */}
        <div className="space-y-4">
          {tipo === "pagamento"
            ? (registros as ComprovantePagamento[]).map((r) => (
                <PreviewPagamento key={r.id} registro={r} empresa={empresa} />
              ))
            : (registros as ComprovanteRecebimento[]).map((r) => (
                <PreviewRecebimento key={r.id} registro={r} empresa={empresa} />
              ))
          }
        </div>
      </DialogContent>
    </Dialog>
  );
}
