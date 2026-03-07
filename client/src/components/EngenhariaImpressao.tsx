/**
 * EngenhariaImpressao
 * Componente de impressão profissional para o módulo de Engenharia.
 * Suporta: Contratos, Ordens de Serviço, Materiais e Tipos de Serviço.
 * Segue o mesmo padrão do ComprovanteViewer: abre janela de impressão com HTML/CSS otimizado para A4.
 */
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Printer, X } from "lucide-react";
import { useState } from "react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type ContratoParaImpressao = {
  id: number;
  numero: string;
  objeto: string;
  tipo: string;
  status: string;
  valorTotal: any;
  dataInicio?: any;
  dataFim?: any;
  descricao?: string | null;
  observacoes?: string | null;
  clienteNome?: string | null;
  enderecoLogradouro?: string | null;
  enderecoNumero?: string | null;
  enderecoComplemento?: string | null;
  enderecoBairro?: string | null;
  enderecoCidade?: string | null;
  enderecoEstado?: string | null;
  enderecoCep?: string | null;
};

export type OSParaImpressao = {
  id: number;
  numero: string;
  titulo: string;
  descricao?: string | null;
  status: string;
  prioridade: string;
  responsavel?: string | null;
  dataAbertura?: any;
  dataPrevisao?: any;
  dataConclusao?: any;
  valorEstimado?: any;
  valorRealizado?: any;
  observacoes?: string | null;
  clienteNome?: string | null;
  contratoNumero?: string | null;
  enderecoLogradouro?: string | null;
  enderecoNumero?: string | null;
  enderecoComplemento?: string | null;
  enderecoBairro?: string | null;
  enderecoCidade?: string | null;
  enderecoEstado?: string | null;
  enderecoCep?: string | null;
  itens?: Array<{
    tipo: string;
    descricao?: string | null;
    tipoServicoNome?: string | null;
    materialNome?: string | null;
    quantidade: any;
    valorUnitario: any;
    valorTotal: any;
  }>;
};

export type MaterialParaImpressao = {
  id: number;
  codigo: string;
  nome: string;
  descricao?: string | null;
  unidade?: string | null;
  valorUnitario?: any;
  estoque?: any;
  estoqueMinimo?: any;
  ativo: boolean;
};

export type TipoServicoParaImpressao = {
  id: number;
  codigo: string;
  nome: string;
  descricao?: string | null;
  unidade?: string | null;
  valorUnitario?: any;
  ativo: boolean;
};

export type TipoImpressaoEngenharia = "contrato" | "os" | "materiais" | "tiposServico";

type Props = {
  open: boolean;
  onClose: () => void;
  tipo: TipoImpressaoEngenharia;
  dados: ContratoParaImpressao[] | OSParaImpressao[] | MaterialParaImpressao[] | TipoServicoParaImpressao[];
};

// ─── Utilitários ──────────────────────────────────────────────────────────────

function fmtCurrency(value: any) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    parseFloat(String(value ?? 0))
  );
}

function fmtDate(date: any) {
  if (!date) return "-";
  const iso = date instanceof Date ? date.toISOString() : String(date);
  const parts = iso.substring(0, 10).split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return "-";
}

function fmtTipoContrato(tipo: string) {
  const map: Record<string, string> = {
    prestacao_servico: "Prestação de Serviço",
    fornecimento: "Fornecimento",
    locacao: "Locação",
    misto: "Misto",
  };
  return map[tipo] ?? tipo;
}

function fmtStatusContrato(status: string) {
  const map: Record<string, string> = {
    negociacao: "Em Negociação",
    ativo: "Ativo",
    suspenso: "Suspenso",
    encerrado: "Encerrado",
    cancelado: "Cancelado",
  };
  return map[status] ?? status;
}

function fmtStatusOS(status: string) {
  const map: Record<string, string> = {
    aberta: "Aberta",
    em_execucao: "Em Execução",
    concluida: "Concluída",
    cancelada: "Cancelada",
    pausada: "Pausada",
  };
  return map[status] ?? status;
}

function fmtPrioridade(p: string) {
  const map: Record<string, string> = {
    baixa: "Baixa",
    media: "Média",
    alta: "Alta",
    urgente: "Urgente",
  };
  return map[p] ?? p;
}

function buildEndereco(item: { enderecoLogradouro?: string | null; enderecoNumero?: string | null; enderecoComplemento?: string | null; enderecoBairro?: string | null; enderecoCidade?: string | null; enderecoEstado?: string | null; enderecoCep?: string | null }) {
  const partes = [];
  if (item.enderecoLogradouro) {
    let linha1 = item.enderecoLogradouro;
    if (item.enderecoNumero) linha1 += `, ${item.enderecoNumero}`;
    if (item.enderecoComplemento) linha1 += ` — ${item.enderecoComplemento}`;
    partes.push(linha1);
  }
  if (item.enderecoBairro) partes.push(item.enderecoBairro);
  if (item.enderecoCidade || item.enderecoEstado) {
    let linha3 = "";
    if (item.enderecoCidade) linha3 += item.enderecoCidade;
    if (item.enderecoEstado) linha3 += (linha3 ? ` — ${item.enderecoEstado}` : item.enderecoEstado);
    partes.push(linha3);
  }
  if (item.enderecoCep) partes.push(`CEP: ${item.enderecoCep}`);
  return partes.join(" | ");
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
.badge-orange { background: #ffedd5; color: #9a3412; }
.badge-purple { background: #f3e8ff; color: #6b21a8; }
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
.comp-grid-3 {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 6px 16px;
  margin-bottom: 10px;
}
.comp-field-label { font-size: 8px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 1px; }
.comp-field-value { font-size: 10px; font-weight: 600; color: #111827; line-height: 1.3; }
.comp-field-value.highlight { font-size: 13px; font-weight: 700; color: #1d4ed8; }
.span2 { grid-column: span 2; }
.span3 { grid-column: span 3; }
.comp-separator { border-top: 2px dashed #d1d5db; margin: 16px 0; }
.comp-section-title { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #374151; margin-bottom: 4px; margin-top: 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 3px; }
.comp-endereco { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 6px 10px; margin-bottom: 8px; font-size: 9px; color: #374151; }
.comp-endereco strong { display: block; font-size: 8px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 2px; }
table { width: 100%; border-collapse: collapse; font-size: 9px; }
th, td { border: 1px solid #d1d5db; padding: 3px 6px; text-align: left; }
th { background: #f3f4f6; font-weight: 700; }
tr:nth-child(even) td { background: #fafafa; }
tfoot td { background: #f3f4f6; font-weight: 700; }
td.right, th.right { text-align: right; }
td.center, th.center { text-align: center; }
.comp-signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-top: 20px; padding-top: 14px; }
.comp-sig-line { border-top: 1px solid #9ca3af; padding-top: 5px; text-align: center; font-size: 9px; color: #6b7280; }
@page { size: A4 portrait; margin: 12mm; }
@media print { body { padding: 0; } html, body { height: auto; } }
`;

// ─── Builders de HTML ─────────────────────────────────────────────────────────

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

function buildContratoHTML(c: ContratoParaImpressao, empresa: any, index: number, total: number) {
  const statusBadge = c.status === "ativo" ? "badge-green" : c.status === "encerrado" ? "badge-gray" : c.status === "cancelado" ? "badge-red" : c.status === "suspenso" ? "badge-orange" : "badge-yellow";
  const endereco = buildEndereco(c);
  return `
    ${index > 0 ? '<div class="comp-separator"></div>' : ""}
    ${buildHeaderHTML(empresa)}
    <div class="comp-title-row">
      <span class="comp-title">Contrato</span>
      ${total > 1 ? `<span class="mono">${index + 1} de ${total}</span>` : ""}
    </div>
    <div class="comp-badge-row">
      <span class="badge ${statusBadge}">${fmtStatusContrato(c.status)}</span>
      <span class="ctrl-num">${c.numero}</span>
      <span class="badge badge-blue">${fmtTipoContrato(c.tipo)}</span>
    </div>
    <div class="comp-grid">
      <div class="span2">
        <div class="comp-field-label">Objeto / Descrição do Contrato</div>
        <div class="comp-field-value">${c.objeto}</div>
      </div>
      <div>
        <div class="comp-field-label">Cliente / Parceiro</div>
        <div class="comp-field-value">${c.clienteNome || "-"}</div>
      </div>
      <div>
        <div class="comp-field-label">Valor Total</div>
        <div class="comp-field-value highlight">${fmtCurrency(c.valorTotal)}</div>
      </div>
      <div>
        <div class="comp-field-label">Data de Início</div>
        <div class="comp-field-value">${fmtDate(c.dataInicio)}</div>
      </div>
      <div>
        <div class="comp-field-label">Data de Fim / Vencimento</div>
        <div class="comp-field-value">${fmtDate(c.dataFim)}</div>
      </div>
      ${c.descricao ? `<div class="span2"><div class="comp-field-label">Descrição Detalhada</div><div class="comp-field-value">${c.descricao}</div></div>` : ""}
      ${c.observacoes ? `<div class="span2"><div class="comp-field-label">Observações</div><div class="comp-field-value">${c.observacoes}</div></div>` : ""}
    </div>
    ${endereco ? `<div class="comp-endereco"><strong>Local de Execução</strong>${endereco}</div>` : ""}
    <div class="comp-signatures">
      <div class="comp-sig-line">Contratante</div>
      <div class="comp-sig-line">Contratado</div>
    </div>
  `;
}

function buildOSHTML(o: OSParaImpressao, empresa: any, index: number, total: number) {
  const statusBadge = o.status === "concluida" ? "badge-green" : o.status === "cancelada" ? "badge-red" : o.status === "em_execucao" ? "badge-blue" : o.status === "pausada" ? "badge-orange" : "badge-yellow";
  const prioridadeBadge = o.prioridade === "urgente" ? "badge-red" : o.prioridade === "alta" ? "badge-orange" : o.prioridade === "media" ? "badge-yellow" : "badge-gray";
  const endereco = buildEndereco(o);
  const temItens = o.itens && o.itens.length > 0;
  const totalItens = temItens ? o.itens!.reduce((s, i) => s + parseFloat(String(i.valorTotal ?? 0)), 0) : 0;
  return `
    ${index > 0 ? '<div class="comp-separator"></div>' : ""}
    ${buildHeaderHTML(empresa)}
    <div class="comp-title-row">
      <span class="comp-title">Ordem de Serviço</span>
      ${total > 1 ? `<span class="mono">${index + 1} de ${total}</span>` : ""}
    </div>
    <div class="comp-badge-row">
      <span class="badge ${statusBadge}">${fmtStatusOS(o.status)}</span>
      <span class="ctrl-num">${o.numero}</span>
      <span class="badge ${prioridadeBadge}">Prioridade: ${fmtPrioridade(o.prioridade)}</span>
    </div>
    <div class="comp-grid">
      <div class="span2">
        <div class="comp-field-label">Título</div>
        <div class="comp-field-value">${o.titulo}</div>
      </div>
      <div>
        <div class="comp-field-label">Cliente</div>
        <div class="comp-field-value">${o.clienteNome || "-"}</div>
      </div>
      <div>
        <div class="comp-field-label">Contrato Vinculado</div>
        <div class="comp-field-value">${o.contratoNumero || "-"}</div>
      </div>
      <div>
        <div class="comp-field-label">Responsável</div>
        <div class="comp-field-value">${o.responsavel || "-"}</div>
      </div>
      <div>
        <div class="comp-field-label">Valor Estimado</div>
        <div class="comp-field-value highlight">${o.valorEstimado ? fmtCurrency(o.valorEstimado) : "-"}</div>
      </div>
      <div>
        <div class="comp-field-label">Data de Abertura</div>
        <div class="comp-field-value">${fmtDate(o.dataAbertura)}</div>
      </div>
      <div>
        <div class="comp-field-label">Previsão de Conclusão</div>
        <div class="comp-field-value">${fmtDate(o.dataPrevisao)}</div>
      </div>
      ${o.dataConclusao ? `<div><div class="comp-field-label">Data de Conclusão</div><div class="comp-field-value">${fmtDate(o.dataConclusao)}</div></div>` : ""}
      ${o.valorRealizado ? `<div><div class="comp-field-label">Valor Realizado</div><div class="comp-field-value">${fmtCurrency(o.valorRealizado)}</div></div>` : ""}
      ${o.descricao ? `<div class="span2"><div class="comp-field-label">Descrição</div><div class="comp-field-value">${o.descricao}</div></div>` : ""}
      ${o.observacoes ? `<div class="span2"><div class="comp-field-label">Observações</div><div class="comp-field-value">${o.observacoes}</div></div>` : ""}
    </div>
    ${endereco ? `<div class="comp-endereco"><strong>Local de Execução</strong>${endereco}</div>` : ""}
    ${temItens ? `
      <p class="comp-section-title">Itens da Ordem de Serviço</p>
      <table>
        <thead>
          <tr>
            <th>Tipo</th>
            <th>Descrição / Item</th>
            <th class="right">Qtd</th>
            <th class="right">Vl. Unit.</th>
            <th class="right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${o.itens!.map(item => `
            <tr>
              <td>${item.tipo === "servico" ? "Serviço" : "Material"}</td>
              <td>${item.descricao || (item.tipo === "servico" ? item.tipoServicoNome : item.materialNome) || "-"}</td>
              <td class="right">${parseFloat(String(item.quantidade)).toLocaleString("pt-BR")}</td>
              <td class="right">${fmtCurrency(item.valorUnitario)}</td>
              <td class="right">${fmtCurrency(item.valorTotal)}</td>
            </tr>
          `).join("")}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="4">Total</td>
            <td class="right">${fmtCurrency(totalItens)}</td>
          </tr>
        </tfoot>
      </table>
    ` : ""}
    <div class="comp-signatures">
      <div class="comp-sig-line">Responsável pela OS</div>
      <div class="comp-sig-line">Cliente / Solicitante</div>
    </div>
  `;
}

function buildMateriaisHTML(materiais: MaterialParaImpressao[], empresa: any) {
  return `
    ${buildHeaderHTML(empresa)}
    <div class="comp-title-row">
      <span class="comp-title">Catálogo de Materiais</span>
      <span class="mono">${materiais.length} registro${materiais.length !== 1 ? "s" : ""}</span>
    </div>
    <table>
      <thead>
        <tr>
          <th>Código</th>
          <th>Nome</th>
          <th>Unidade</th>
          <th class="right">Vl. Unitário</th>
          <th class="right">Estoque</th>
          <th class="right">Est. Mínimo</th>
          <th class="center">Status</th>
        </tr>
      </thead>
      <tbody>
        ${materiais.map(m => `
          <tr>
            <td class="mono">${m.codigo}</td>
            <td>${m.nome}${m.descricao ? `<br/><span style="font-size:8px;color:#6b7280">${m.descricao}</span>` : ""}</td>
            <td>${m.unidade || "-"}</td>
            <td class="right">${m.valorUnitario ? fmtCurrency(m.valorUnitario) : "-"}</td>
            <td class="right">${m.estoque != null ? parseFloat(String(m.estoque)).toLocaleString("pt-BR") : "-"}</td>
            <td class="right">${m.estoqueMinimo != null ? parseFloat(String(m.estoqueMinimo)).toLocaleString("pt-BR") : "-"}</td>
            <td class="center"><span class="badge ${m.ativo ? "badge-green" : "badge-gray"}">${m.ativo ? "Ativo" : "Inativo"}</span></td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function buildTiposServicoHTML(tipos: TipoServicoParaImpressao[], empresa: any) {
  return `
    ${buildHeaderHTML(empresa)}
    <div class="comp-title-row">
      <span class="comp-title">Catálogo de Tipos de Serviço</span>
      <span class="mono">${tipos.length} registro${tipos.length !== 1 ? "s" : ""}</span>
    </div>
    <table>
      <thead>
        <tr>
          <th>Código</th>
          <th>Nome</th>
          <th>Unidade</th>
          <th class="right">Vl. Unitário</th>
          <th class="center">Status</th>
        </tr>
      </thead>
      <tbody>
        ${tipos.map(t => `
          <tr>
            <td class="mono">${t.codigo}</td>
            <td>${t.nome}${t.descricao ? `<br/><span style="font-size:8px;color:#6b7280">${t.descricao}</span>` : ""}</td>
            <td>${t.unidade || "-"}</td>
            <td class="right">${t.valorUnitario ? fmtCurrency(t.valorUnitario) : "-"}</td>
            <td class="center"><span class="badge ${t.ativo ? "badge-green" : "badge-gray"}">${t.ativo ? "Ativo" : "Inativo"}</span></td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

// ─── Preview Cards (para exibição no modal antes de imprimir) ─────────────────

function PreviewContratoCard({ c }: { c: ContratoParaImpressao }) {
  const endereco = buildEndereco(c);
  const statusColor = c.status === "ativo" ? "bg-green-100 text-green-800" : c.status === "encerrado" ? "bg-gray-100 text-gray-700" : c.status === "cancelado" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800";
  return (
    <div className="border rounded-lg p-4 bg-white space-y-3 text-sm">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-mono font-bold text-blue-700 text-base">{c.numero}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>{fmtStatusContrato(c.status)}</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">{fmtTipoContrato(c.tipo)}</span>
      </div>
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide">Objeto</p>
        <p className="font-medium">{c.objeto}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Cliente</p>
          <p className="font-medium">{c.clienteNome || "—"}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Valor Total</p>
          <p className="font-bold text-blue-700">{fmtCurrency(c.valorTotal)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Início</p>
          <p>{fmtDate(c.dataInicio)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Fim / Vencimento</p>
          <p>{fmtDate(c.dataFim)}</p>
        </div>
      </div>
      {endereco && (
        <div className="bg-slate-50 rounded p-2">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Local de Execução</p>
          <p className="text-xs">{endereco}</p>
        </div>
      )}
    </div>
  );
}

function PreviewOSCard({ o }: { o: OSParaImpressao }) {
  const endereco = buildEndereco(o);
  const statusColor = o.status === "concluida" ? "bg-green-100 text-green-800" : o.status === "cancelada" ? "bg-red-100 text-red-800" : o.status === "em_execucao" ? "bg-blue-100 text-blue-800" : "bg-yellow-100 text-yellow-800";
  return (
    <div className="border rounded-lg p-4 bg-white space-y-3 text-sm">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-mono font-bold text-blue-700 text-base">{o.numero}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>{fmtStatusOS(o.status)}</span>
      </div>
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide">Título</p>
        <p className="font-medium">{o.titulo}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Cliente</p>
          <p className="font-medium">{o.clienteNome || "—"}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Contrato</p>
          <p>{o.contratoNumero || "—"}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Responsável</p>
          <p>{o.responsavel || "—"}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Valor Estimado</p>
          <p className="font-bold text-blue-700">{o.valorEstimado ? fmtCurrency(o.valorEstimado) : "—"}</p>
        </div>
      </div>
      {endereco && (
        <div className="bg-slate-50 rounded p-2">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Local de Execução</p>
          <p className="text-xs">{endereco}</p>
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function EngenhariaImpressao({ open, onClose, tipo, dados }: Props) {
  const { data: empresa } = trpc.empresa.get.useQuery();
  const [printing, setPrinting] = useState(false);

  const titulos: Record<TipoImpressaoEngenharia, string> = {
    contrato: "Contrato",
    os: "Ordem de Serviço",
    materiais: "Catálogo de Materiais",
    tiposServico: "Catálogo de Tipos de Serviço",
  };

  const handlePrint = async () => {
    setPrinting(true);
    try {
      const printWindow = window.open("", "_blank", "width=900,height=700");
      if (!printWindow) return;

      let bodyHTML = "";
      if (tipo === "contrato") {
        (dados as ContratoParaImpressao[]).forEach((c, i) => {
          bodyHTML += buildContratoHTML(c, empresa, i, dados.length);
        });
      } else if (tipo === "os") {
        (dados as OSParaImpressao[]).forEach((o, i) => {
          bodyHTML += buildOSHTML(o, empresa, i, dados.length);
        });
      } else if (tipo === "materiais") {
        bodyHTML = buildMateriaisHTML(dados as MaterialParaImpressao[], empresa);
      } else if (tipo === "tiposServico") {
        bodyHTML = buildTiposServicoHTML(dados as TipoServicoParaImpressao[], empresa);
      }

      const docTitle = dados.length === 1 && (tipo === "contrato" || tipo === "os")
        ? `${titulos[tipo]} — ${(dados[0] as any).numero}`
        : titulos[tipo];

      printWindow.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>${docTitle}</title>
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

  const titulo = tipo === "contrato" || tipo === "os"
    ? `${titulos[tipo]}${dados.length > 1 ? "s" : ""} (${dados.length})`
    : titulos[tipo];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Impressão — {titulo}</DialogTitle>
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

        <div className="space-y-3">
          {tipo === "contrato" && (dados as ContratoParaImpressao[]).map(c => (
            <PreviewContratoCard key={c.id} c={c} />
          ))}
          {tipo === "os" && (dados as OSParaImpressao[]).map(o => (
            <PreviewOSCard key={o.id} o={o} />
          ))}
          {(tipo === "materiais" || tipo === "tiposServico") && (
            <div className="text-sm text-muted-foreground text-center py-4 border rounded-lg bg-muted/30">
              <Printer className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p>{dados.length} {tipo === "materiais" ? "material(is)" : "tipo(s) de serviço"} prontos para impressão.</p>
              <p className="text-xs mt-1">Clique em "Imprimir / Salvar PDF" para gerar o relatório completo.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
