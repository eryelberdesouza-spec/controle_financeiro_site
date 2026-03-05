/**
 * ComprovanteViewer
 * Componente de comprovante para impressão individual ou em lote.
 * Regra crítica: NUNCA chamar hooks dentro de .map() ou loops.
 * Cada registro é renderizado por um componente filho que possui seus próprios hooks.
 */
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Printer, X } from "lucide-react";
import { useRef, useState } from "react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

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
  descricao?: string | null;
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

// ─── Utilitários ──────────────────────────────────────────────────────────────

function formatCurrency(value: any) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    parseFloat(String(value ?? 0))
  );
}

function formatDate(date: Date | string | null | undefined) {
  if (!date) return "-";
  const iso = date instanceof Date ? date.toISOString() : String(date);
  const parts = iso.substring(0, 10).split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return "-";
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
      <p className={`font-semibold text-gray-900 ${highlight ? "text-base font-bold text-blue-700" : "text-sm"}`}>
        {value}
      </p>
    </div>
  );
}

// ─── CSS de impressão ─────────────────────────────────────────────────────────

const PRINT_CSS = `
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: Arial, Helvetica, sans-serif;
  font-size: 10px;
  color: #111827;
  background: #fff;
  padding: 14px 18px;
}
.comp-header {
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 2px solid #1f2937;
  padding-bottom: 8px;
  margin-bottom: 10px;
}
.comp-header img {
  height: 44px !important;
  max-height: 44px !important;
  width: auto !important;
  max-width: 100px !important;
  object-fit: contain !important;
}
.comp-header-info { flex: 1; }
.comp-header-info h1 { font-size: 12px; font-weight: 700; margin-bottom: 1px; }
.comp-header-info p { font-size: 9px; color: #4b5563; line-height: 1.3; }
.comp-header-date { text-align: right; font-size: 9px; color: #6b7280; white-space: nowrap; }
.comp-header-date strong { display: block; font-size: 10px; color: #374151; }
.comp-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.comp-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
.comp-badge-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 9px; font-weight: 700; }
.badge-green  { background: #dcfce7; color: #166534; }
.badge-yellow { background: #fef9c3; color: #854d0e; }
.badge-red    { background: #fee2e2; color: #991b1b; }
.badge-gray   { background: #f3f4f6; color: #374151; }
.badge-blue   { background: #dbeafe; color: #1e40af; }
.mono {
  font-family: monospace;
  font-size: 9px;
  color: #6b7280;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  padding: 1px 5px;
  border-radius: 3px;
}
.ctrl-num {
  font-family: monospace;
  font-size: 15px;
  font-weight: 800;
  color: #1d4ed8;
  background: #eff6ff;
  border: 1.5px solid #bfdbfe;
  padding: 2px 10px;
  border-radius: 4px;
  letter-spacing: 0.04em;
}
.comp-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 20px;
  margin-bottom: 10px;
}
.comp-field-label { font-size: 8px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 1px; }
.comp-field-value { font-size: 10px; font-weight: 600; color: #111827; line-height: 1.3; }
.comp-field-value.highlight { font-size: 13px; font-weight: 700; color: #1d4ed8; }
.span2 { grid-column: span 2; }
.comp-separator { border-top: 2px dashed #d1d5db; margin: 16px 0; }
.comp-parcelas-title { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #374151; margin-bottom: 4px; margin-top: 8px; }
table { width: 100%; border-collapse: collapse; font-size: 9px; }
th, td { border: 1px solid #d1d5db; padding: 3px 6px; text-align: left; }
th { background: #f3f4f6; font-weight: 700; }
tr:nth-child(even) td { background: #fafafa; }
tfoot td { background: #f3f4f6; font-weight: 700; }
td.right, th.right { text-align: right; }
td.center, th.center { text-align: center; }
.status-pago { color: #166534; font-weight: 700; }
.status-pendente { color: #854d0e; font-weight: 700; }
.status-atrasado { color: #991b1b; font-weight: 700; }
.status-cancelado { color: #374151; }
.comp-signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-top: 20px; padding-top: 14px; }
.comp-sig-line { border-top: 1px solid #9ca3af; padding-top: 5px; text-align: center; font-size: 9px; color: #6b7280; }
@page { size: A4 portrait; margin: 12mm; }
@media print { body { padding: 0; } html, body { height: auto; } }
`;

// ─── Builders de HTML para impressão ─────────────────────────────────────────

function buildHeaderHTML(empresa: any) {
  return `
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
  `;
}

function buildParcelasTableHTML(parcelas: any[], colDataLabel: string) {
  if (!parcelas || parcelas.length === 0) return "";
  const total = parcelas.reduce((acc: number, p: any) => acc + parseFloat(String(p.valor ?? 0)), 0);
  return `
    <p class="comp-parcelas-title">Parcelas</p>
    <table>
      <thead>
        <tr>
          <th class="center">Nº</th>
          <th class="right">Valor</th>
          <th>Vencimento</th>
          <th>${colDataLabel}</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${parcelas.map((p: any) => `
          <tr>
            <td class="center">${p.numeroParcela}</td>
            <td class="right">${formatCurrency(p.valor)}</td>
            <td>${formatDate(p.dataVencimento)}</td>
            <td>${colDataLabel === "Pagamento" ? formatDate(p.dataPagamento) : formatDate(p.dataRecebimento)}</td>
            <td>${p.status}</td>
          </tr>
        `).join("")}
      </tbody>
      <tfoot>
        <tr>
          <td>Total</td>
          <td class="right">${formatCurrency(total)}</td>
          <td colspan="3"></td>
        </tr>
      </tfoot>
    </table>
  `;
}

function buildPagamentoHTML(r: ComprovantePagamento, empresa: any, parcelas: any[], index: number, total: number) {
  const statusClass = r.status === "Pago" ? "badge-green" : r.status === "Pendente" ? "badge-yellow" : r.status === "Cancelado" ? "badge-gray" : "badge-blue";
  const tipoPix = (r as any).tipoPix || (r as any).tipoChavePix || "-";
  return `
    ${index > 0 ? '<div class="comp-separator"></div>' : ""}
    ${buildHeaderHTML(empresa)}
    <div class="comp-title-row">
      <span class="comp-title">Comprovante de Pagamento</span>
      ${total > 1 ? `<span class="mono">${index + 1} de ${total}</span>` : ""}
    </div>
    <div class="comp-badge-row">
      <span class="badge ${statusClass}">${r.status}</span>
      ${r.numeroControle ? `<span class="mono">Nº ${r.numeroControle}</span>` : ""}
    </div>
    <div class="comp-grid">
      <div class="span2">
        <div class="comp-field-label">Nome Completo</div>
        <div class="comp-field-value">${r.nomeCompleto}</div>
      </div>
      <div>
        <div class="comp-field-label">CPF</div>
        <div class="comp-field-value">${r.cpf || "-"}</div>
      </div>
      <div>
        <div class="comp-field-label">Banco</div>
        <div class="comp-field-value">${r.banco || "-"}</div>
      </div>
      <div>
        <div class="comp-field-label">Tipo de Chave Pix</div>
        <div class="comp-field-value">${tipoPix}</div>
      </div>
      <div>
        <div class="comp-field-label">Chave Pix</div>
        <div class="comp-field-value">${r.chavePix || "-"}</div>
      </div>
      <div>
        <div class="comp-field-label">Tipo de Serviço</div>
        <div class="comp-field-value">${r.tipoServico || "-"}</div>
      </div>
      <div>
        <div class="comp-field-label">Centro de Custo</div>
        <div class="comp-field-value">${r.centroCusto || "-"}</div>
      </div>
      <div>
        <div class="comp-field-label">Data de Pagamento</div>
        <div class="comp-field-value">${formatDate(r.dataPagamento)}</div>
      </div>
      <div>
        <div class="comp-field-label">Valor</div>
        <div class="comp-field-value highlight">${formatCurrency(r.valor)}</div>
      </div>
      ${(r.quantidadeParcelas ?? 1) > 1 ? `
        <div>
          <div class="comp-field-label">Parcela</div>
          <div class="comp-field-value">${r.parcelaAtual ?? 1} de ${r.quantidadeParcelas}</div>
        </div>
      ` : ""}
      ${r.descricao ? `
        <div class="span2">
          <div class="comp-field-label">Descrição</div>
          <div class="comp-field-value">${r.descricao.replace(/\n/g, "<br/>")}</div>
        </div>
      ` : ""}
      ${r.autorizadoPor ? `
        <div>
          <div class="comp-field-label">Autorizado por</div>
          <div class="comp-field-value">${r.autorizadoPor}</div>
        </div>
      ` : ""}
      ${r.observacao ? `
        <div class="span2">
          <div class="comp-field-label">Observação</div>
          <div class="comp-field-value">${r.observacao}</div>
        </div>
      ` : ""}
    </div>
    ${buildParcelasTableHTML(parcelas, "Pagamento")}
    <div class="comp-signatures">
      <div class="comp-sig-line">Responsável pelo Pagamento</div>
      <div class="comp-sig-line">Beneficiário / Recebedor</div>
    </div>
  `;
}

function statusClassParcela(status: string) {
  if (status === "Recebido" || status === "Pago") return "status-pago";
  if (status === "Pendente") return "status-pendente";
  if (status === "Atrasado") return "status-atrasado";
  return "status-cancelado";
}

function buildRecebimentoHTML(r: ComprovanteRecebimento, empresa: any, parcelas: any[], index: number, total: number) {
  const statusClass = r.status === "Recebido" ? "badge-green" : r.status === "Pendente" ? "badge-yellow" : r.status === "Atrasado" ? "badge-red" : "badge-gray";
  const valorLiquido = parseFloat(String(r.valorTotal ?? 0)) + parseFloat(String(r.juros ?? 0)) - parseFloat(String(r.desconto ?? 0));
  const temParcelas = parcelas && parcelas.length > 0;

  const parcelasHTML = temParcelas ? (() => {
    const totalParcelas = parcelas.reduce((acc: number, p: any) => acc + parseFloat(String(p.valor ?? 0)), 0);
    const pagas = parcelas.filter((p: any) => p.status === "Recebido" || p.status === "Pago").length;
    return `
      <p class="comp-parcelas-title">Parcelas (${pagas} de ${parcelas.length} recebidas)</p>
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
          ${parcelas.map((p: any) => `
            <tr>
              <td class="center">${p.numeroParcela}</td>
              <td class="right">${formatCurrency(p.valor)}</td>
              <td>${formatDate(p.dataVencimento)}</td>
              <td>${formatDate(p.dataRecebimento)}</td>
              <td class="${statusClassParcela(p.status)}">${p.status}</td>
            </tr>
          `).join("")}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="1">Total</td>
            <td class="right">${formatCurrency(totalParcelas)}</td>
            <td colspan="3"></td>
          </tr>
        </tfoot>
      </table>
    `;
  })() : "";

  return `
    ${index > 0 ? '<div class="comp-separator"></div>' : ""}
    ${buildHeaderHTML(empresa)}
    <div class="comp-title-row">
      <span class="comp-title">Comprovante de Recebimento</span>
      ${total > 1 ? `<span class="mono">${index + 1} de ${total}</span>` : ""}
    </div>
    <div class="comp-badge-row">
      <span class="badge ${statusClass}">${r.status}</span>
      ${r.numeroControle ? `<span class="ctrl-num">Nº ${r.numeroControle}</span>` : ""}
      ${r.numeroContrato ? `<span class="mono">Contrato: ${r.numeroContrato}</span>` : ""}
    </div>
    <div class="comp-grid">
      <div class="span2">
        <div class="comp-field-label">Nome / Razão Social</div>
        <div class="comp-field-value">${r.nomeRazaoSocial}</div>
      </div>
      <div>
        <div class="comp-field-label">Tipo de Recebimento</div>
        <div class="comp-field-value">${r.tipoRecebimento}</div>
      </div>
      ${(r.quantidadeParcelas ?? 1) > 1 ? `
        <div>
          <div class="comp-field-label">Total de Parcelas</div>
          <div class="comp-field-value">${r.quantidadeParcelas}x parcelas</div>
        </div>
      ` : `
        <div>
          <div class="comp-field-label">Data de Vencimento</div>
          <div class="comp-field-value">${formatDate(r.dataVencimento)}</div>
        </div>
      `}
      ${r.dataRecebimento && (r.quantidadeParcelas ?? 1) === 1 ? `
        <div>
          <div class="comp-field-label">Data de Recebimento</div>
          <div class="comp-field-value">${formatDate(r.dataRecebimento)}</div>
        </div>
      ` : ""}
      <div>
        <div class="comp-field-label">Valor Total</div>
        <div class="comp-field-value">${formatCurrency(r.valorTotal)}</div>
      </div>
      ${parseFloat(String(r.valorEquipamento ?? 0)) > 0 ? `
        <div>
          <div class="comp-field-label">Equipamentos</div>
          <div class="comp-field-value">${formatCurrency(r.valorEquipamento)}</div>
        </div>
      ` : ""}
      ${parseFloat(String(r.valorServico ?? 0)) > 0 ? `
        <div>
          <div class="comp-field-label">Serviços</div>
          <div class="comp-field-value">${formatCurrency(r.valorServico)}</div>
        </div>
      ` : ""}
      ${parseFloat(String(r.juros ?? 0)) > 0 ? `
        <div>
          <div class="comp-field-label">Juros</div>
          <div class="comp-field-value">${formatCurrency(r.juros)}</div>
        </div>
      ` : ""}
      ${parseFloat(String(r.desconto ?? 0)) > 0 ? `
        <div>
          <div class="comp-field-label">Desconto</div>
          <div class="comp-field-value">- ${formatCurrency(r.desconto)}</div>
        </div>
      ` : ""}
      <div class="span2">
        <div class="comp-field-label">Valor Líquido</div>
        <div class="comp-field-value highlight">${formatCurrency(valorLiquido)}</div>
      </div>
      ${r.descricao ? `
        <div class="span2">
          <div class="comp-field-label">Descrição</div>
          <div class="comp-field-value">${r.descricao.replace(/\n/g, "<br/>")}</div>
        </div>
      ` : ""}
      ${r.observacao ? `
        <div class="span2">
          <div class="comp-field-label">Observação</div>
          <div class="comp-field-value">${r.observacao.replace(/\n/g, "<br/>")}</div>
        </div>
      ` : ""}
    </div>
    ${parcelasHTML}
  `;
}

// ─── Componentes de preview (cada um tem seus próprios hooks) ─────────────────

function PreviewPagamentoCard({
  registro,
  empresa,
  onGetParcelas,
}: {
  registro: ComprovantePagamento;
  empresa: any;
  onGetParcelas: (id: number, parcelas: any[]) => void;
}) {
  const temParcelas = (registro.quantidadeParcelas ?? 1) > 1;
  const { data: parcelas = [] } = trpc.pagamentoParcelas.list.useQuery(
    { pagamentoId: registro.id },
    { enabled: temParcelas }
  );

  // Notifica o pai sempre que as parcelas chegarem
  if (parcelas.length > 0) onGetParcelas(registro.id, parcelas);

  const tipoPix = (registro as any).tipoPix || (registro as any).tipoChavePix || "-";
  const statusColor =
    registro.status === "Pago" ? "bg-green-100 text-green-800" :
    registro.status === "Pendente" ? "bg-yellow-100 text-yellow-800" :
    registro.status === "Cancelado" ? "bg-gray-100 text-gray-600" : "bg-blue-100 text-blue-800";

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 text-sm text-gray-900 shadow-sm">
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
        <h2 className="font-bold text-sm uppercase tracking-wide">Comprovante de Pagamento</h2>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColor}`}>{registro.status}</span>
        {registro.numeroControle && (
          <span className="font-mono text-xs text-gray-500 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded">
            Nº {registro.numeroControle}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-3">
        <Field label="Nome Completo" value={registro.nomeCompleto} className="col-span-2" />
        <Field label="CPF" value={registro.cpf || "-"} />
        <Field label="Banco" value={registro.banco || "-"} />
        <Field label="Tipo de Chave Pix" value={tipoPix} />
        <Field label="Chave Pix" value={registro.chavePix || "-"} />
        <Field label="Tipo de Serviço" value={registro.tipoServico || "-"} />
        <Field label="Centro de Custo" value={registro.centroCusto || "-"} />
        <Field label="Data de Pagamento" value={formatDate(registro.dataPagamento)} />
        <Field label="Valor" value={formatCurrency(registro.valor)} highlight />
        {(registro.quantidadeParcelas ?? 1) > 1 && (
          <Field label="Parcela" value={`${registro.parcelaAtual ?? 1} de ${registro.quantidadeParcelas}`} />
        )}
        {registro.descricao && <Field label="Descrição" value={registro.descricao} className="col-span-2" />}
        {registro.autorizadoPor && <Field label="Autorizado por" value={registro.autorizadoPor} />}
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
                <th className="border border-gray-300 px-2 py-1">Pagamento</th>
                <th className="border border-gray-300 px-2 py-1">Status</th>
              </tr>
            </thead>
            <tbody>
              {parcelas.map((p: any) => (
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

function PreviewRecebimentoCard({
  registro,
  empresa,
  onGetParcelas,
}: {
  registro: ComprovanteRecebimento;
  empresa: any;
  onGetParcelas: (id: number, parcelas: any[]) => void;
}) {
  // Sempre busca parcelas (mesmo parcela única pode ter sido gerada)
  const { data: parcelas = [] } = trpc.recebimentoParcelas.list.useQuery(
    { recebimentoId: registro.id }
  );

  // Notifica o pai sempre que as parcelas chegarem
  if (parcelas.length > 0) onGetParcelas(registro.id, parcelas);

  const valorLiquido =
    parseFloat(String(registro.valorTotal ?? 0)) +
    parseFloat(String(registro.juros ?? 0)) -
    parseFloat(String(registro.desconto ?? 0));

  const statusColor =
    registro.status === "Recebido" ? "bg-green-100 text-green-800" :
    registro.status === "Pendente" ? "bg-yellow-100 text-yellow-800" :
    registro.status === "Atrasado" ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-600";

  const statusParcelaColor = (s: string) =>
    s === "Recebido" || s === "Pago" ? "text-green-700 font-semibold" :
    s === "Pendente" ? "text-yellow-700 font-semibold" :
    s === "Atrasado" ? "text-red-700 font-semibold" : "text-gray-500";

  const pagas = parcelas.filter((p: any) => p.status === "Recebido" || p.status === "Pago").length;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 text-sm text-gray-900 shadow-sm">
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

      {/* Badge de status + Nº Controle em destaque azul */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColor}`}>{registro.status}</span>
        {registro.numeroControle && (
          <span className="font-mono text-base font-extrabold text-blue-700 bg-blue-50 border-2 border-blue-200 px-3 py-0.5 rounded">
            Nº {registro.numeroControle}
          </span>
        )}
        {registro.numeroContrato && (
          <span className="text-xs text-gray-500 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded">
            Contrato: {registro.numeroContrato}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-3">
        <Field label="Nome / Razão Social" value={registro.nomeRazaoSocial} className="col-span-2" />
        <Field label="Tipo de Recebimento" value={registro.tipoRecebimento} />
        {(registro.quantidadeParcelas ?? 1) > 1 ? (
          <Field label="Total de Parcelas" value={`${registro.quantidadeParcelas}x parcelas`} />
        ) : (
          <Field label="Data de Vencimento" value={formatDate(registro.dataVencimento)} />
        )}
        {registro.dataRecebimento && (registro.quantidadeParcelas ?? 1) === 1 && (
          <Field label="Data de Recebimento" value={formatDate(registro.dataRecebimento)} />
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
          <p className="text-xs font-bold uppercase tracking-wide text-gray-600 mb-1">
            Parcelas ({pagas} de {parcelas.length} recebidas)
          </p>
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
              {parcelas.map((p: any) => (
                <tr key={p.id} className="even:bg-gray-50">
                  <td className="border border-gray-300 px-2 py-1 text-center">{p.numeroParcela}</td>
                  <td className="border border-gray-300 px-2 py-1 text-right font-medium">{formatCurrency(p.valor)}</td>
                  <td className="border border-gray-300 px-2 py-1">{formatDate(p.dataVencimento)}</td>
                  <td className="border border-gray-300 px-2 py-1">{formatDate(p.dataRecebimento)}</td>
                  <td className={`border border-gray-300 px-2 py-1 ${statusParcelaColor(p.status)}`}>{p.status}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-bold">
                <td className="border border-gray-300 px-2 py-1">Total</td>
                <td className="border border-gray-300 px-2 py-1 text-right">
                  {formatCurrency(parcelas.reduce((acc: number, p: any) => acc + parseFloat(String(p.valor ?? 0)), 0))}
                </td>
                <td colSpan={3} className="border border-gray-300 px-2 py-1"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function ComprovanteViewer({ open, onClose, tipo, registros }: Props) {
  const { data: empresa } = trpc.empresa.get.useQuery();
  const [printing, setPrinting] = useState(false);

  // useRef garante que o mapa persiste entre re-renders sem causar re-renders
  const parcelasMapRef = useRef<Map<number, any[]>>(new Map());
  const handleGetParcelas = (id: number, parcelas: any[]) => {
    parcelasMapRef.current.set(id, parcelas);
  };

  const handlePrint = async () => {
    setPrinting(true);
    try {
      // Para recebimentos, garante que todas as parcelas foram carregadas
      // buscando via fetch direto para os registros que ainda não têm parcelas no mapa
      if (tipo === "recebimento") {
        const pendentes = (registros as ComprovanteRecebimento[]).filter(
          r => !parcelasMapRef.current.has(r.id)
        );
        if (pendentes.length > 0) {
          await Promise.all(
            pendentes.map(async (r) => {
              try {
                const res = await fetch(`/api/trpc/recebimentoParcelas.list?input=${encodeURIComponent(JSON.stringify({ json: { recebimentoId: r.id } }))}`, {
                  credentials: "include",
                });
                const json = await res.json();
                const parcelas = json?.result?.data?.json ?? [];
                if (parcelas.length > 0) parcelasMapRef.current.set(r.id, parcelas);
              } catch {}
            })
          );
        }
      }

      const printWindow = window.open("", "_blank", "width=900,height=700");
      if (!printWindow) return;

      let bodyHTML = "";
      if (tipo === "pagamento") {
        (registros as ComprovantePagamento[]).forEach((r, i) => {
          bodyHTML += buildPagamentoHTML(r, empresa, parcelasMapRef.current.get(r.id) ?? [], i, registros.length);
        });
      } else {
        (registros as ComprovanteRecebimento[]).forEach((r, i) => {
          bodyHTML += buildRecebimentoHTML(r, empresa, parcelasMapRef.current.get(r.id) ?? [], i, registros.length);
        });
      }

      printWindow.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Comprovante${registros.length > 1 ? "s" : ""} de ${tipo === "pagamento" ? "Pagamento" : "Recebimento"}</title>
  <style>${PRINT_CSS}</style>
</head>
<body>${bodyHTML}</body>
</html>`);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => { printWindow.print(); }, 600);
    } finally {
      setPrinting(false);
    }
  };

  const title = tipo === "pagamento"
    ? `Comprovante${registros.length > 1 ? "s" : ""} de Pagamento`
    : `Comprovante${registros.length > 1 ? "s" : ""} de Recebimento`;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {title} ({registros.length} registro{registros.length > 1 ? "s" : ""})
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 pb-4 border-b">
          <Button onClick={handlePrint} disabled={printing} className="gap-2">
            <Printer className="h-4 w-4" />
            {printing ? "Preparando..." : "Imprimir / Salvar PDF"}
          </Button>
          <Button variant="outline" onClick={onClose} className="gap-2">
            <X className="h-4 w-4" />
            Fechar
          </Button>
        </div>

        <div className="space-y-4">
          {tipo === "pagamento"
            ? (registros as ComprovantePagamento[]).map((r) => (
                <PreviewPagamentoCard
                  key={r.id}
                  registro={r}
                  empresa={empresa}
                  onGetParcelas={handleGetParcelas}
                />
              ))
            : (registros as ComprovanteRecebimento[]).map((r) => (
                <PreviewRecebimentoCard
                  key={r.id}
                  registro={r}
                  empresa={empresa}
                  onGetParcelas={handleGetParcelas}
                />
              ))
          }
        </div>
      </DialogContent>
    </Dialog>
  );
}
