/**
 * EngenhariaImpressao
 * Componente de impressão profissional para o módulo de Engenharia.
 * Suporta: Contratos, Ordens de Serviço, Materiais e Tipos de Serviço.
 * - Preview completo no modal com logo da empresa e todos os campos
 * - Impressão A4 profissional com seções, assinaturas e rodapé
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
  if (!date) return "—";
  const iso = date instanceof Date ? date.toISOString() : String(date);
  const parts = iso.substring(0, 10).split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return "—";
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

type EnderecoItem = {
  enderecoLogradouro?: string | null;
  enderecoNumero?: string | null;
  enderecoComplemento?: string | null;
  enderecoBairro?: string | null;
  enderecoCidade?: string | null;
  enderecoEstado?: string | null;
  enderecoCep?: string | null;
};

function buildEndereco(item: EnderecoItem): string {
  const partes: string[] = [];
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
/* Cabeçalho da empresa */
.comp-header {
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 2.5px solid #1e293b;
  padding-bottom: 10px;
  margin-bottom: 14px;
}
.comp-header img {
  height: 52px !important;
  max-height: 52px !important;
  width: auto !important;
  max-width: 130px !important;
  object-fit: contain !important;
}
.comp-header-info { flex: 1; }
.comp-header-info h1 { font-size: 15px; font-weight: 800; margin-bottom: 2px; color: #0f172a; }
.comp-header-info p { font-size: 9px; color: #475569; line-height: 1.5; }
.comp-header-date { text-align: right; font-size: 8px; color: #64748b; white-space: nowrap; }
.comp-header-date strong { display: block; font-size: 10px; color: #1e293b; font-weight: 700; }
/* Título do documento */
.comp-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.comp-title { font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #0f172a; }
/* Badges */
.comp-badge-row { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
.badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 9px; font-weight: 700; }
.badge-green  { background: #dcfce7; color: #166534; }
.badge-yellow { background: #fef9c3; color: #854d0e; }
.badge-red    { background: #fee2e2; color: #991b1b; }
.badge-gray   { background: #f1f5f9; color: #475569; }
.badge-blue   { background: #dbeafe; color: #1e40af; }
.badge-orange { background: #ffedd5; color: #9a3412; }
.badge-purple { background: #f3e8ff; color: #6b21a8; }
/* Número de controle em destaque */
.ctrl-num {
  font-family: monospace;
  font-size: 18px;
  font-weight: 900;
  color: #1d4ed8;
  background: #eff6ff;
  border: 2px solid #bfdbfe;
  padding: 4px 14px;
  border-radius: 6px;
  letter-spacing: 0.06em;
}
.mono {
  font-family: monospace;
  font-size: 9px;
  color: #64748b;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  padding: 1px 5px;
  border-radius: 3px;
}
/* Seções */
.comp-section-title {
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #1e40af;
  background: #eff6ff;
  border-left: 4px solid #1d4ed8;
  padding: 5px 10px;
  margin: 14px 0 8px 0;
}
/* Grid de campos */
.comp-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 24px;
  margin-bottom: 8px;
}
.comp-grid-3 {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px 16px;
  margin-bottom: 8px;
}
.comp-field-label { font-size: 8px; color: #64748b; text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 2px; }
.comp-field-value { font-size: 10.5px; font-weight: 600; color: #0f172a; line-height: 1.4; }
.comp-field-value.highlight { font-size: 14px; font-weight: 800; color: #1d4ed8; }
.comp-field-value.value-green { font-size: 12px; font-weight: 700; color: #15803d; }
.span2 { grid-column: span 2; }
.span3 { grid-column: span 3; }
/* Separador entre documentos */
.comp-separator { border-top: 2px dashed #cbd5e1; margin: 22px 0; }
/* Bloco de endereço */
.comp-endereco {
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-left: 4px solid #64748b;
  border-radius: 4px;
  padding: 8px 12px;
  margin-bottom: 10px;
}
.comp-endereco strong {
  font-size: 8px;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #64748b;
  display: block;
  margin-bottom: 3px;
}
.comp-endereco p { font-size: 10px; color: #1e293b; font-weight: 500; }
/* Bloco de observações */
.comp-obs {
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-left: 4px solid #f59e0b;
  border-radius: 4px;
  padding: 8px 12px;
  margin-bottom: 10px;
}
.comp-obs strong { font-size: 8px; text-transform: uppercase; letter-spacing: 0.07em; color: #92400e; display: block; margin-bottom: 3px; }
.comp-obs p { font-size: 10px; color: #78350f; line-height: 1.6; }
/* Bloco de descrição */
.comp-desc {
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-left: 4px solid #0284c7;
  border-radius: 4px;
  padding: 8px 12px;
  margin-bottom: 10px;
}
.comp-desc strong { font-size: 8px; text-transform: uppercase; letter-spacing: 0.07em; color: #0369a1; display: block; margin-bottom: 3px; }
.comp-desc p { font-size: 10px; color: #0c4a6e; line-height: 1.6; }
/* Tabelas */
table { width: 100%; border-collapse: collapse; font-size: 9px; margin-bottom: 10px; }
th, td { border: 1px solid #cbd5e1; padding: 5px 8px; text-align: left; }
th { background: #f1f5f9; font-weight: 700; font-size: 8px; text-transform: uppercase; letter-spacing: 0.05em; color: #374151; }
tr:nth-child(even) td { background: #f8fafc; }
tfoot td { background: #e2e8f0; font-weight: 700; font-size: 10px; }
td.right, th.right { text-align: right; }
td.center, th.center { text-align: center; }
/* Assinaturas */
.comp-signatures {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
  margin-top: 32px;
  padding-top: 20px;
  border-top: 1.5px dashed #94a3b8;
}
.comp-sig-block { text-align: center; }
.comp-sig-line {
  border-top: 1.5px solid #374151;
  padding-top: 6px;
  margin-top: 36px;
  font-size: 9.5px;
  color: #1e293b;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.comp-sig-sub { font-size: 8.5px; color: #64748b; margin-top: 3px; }
.comp-sig-blank { font-size: 8px; color: #94a3b8; margin-top: 2px; }
/* Rodapé */
.comp-footer {
  margin-top: 24px;
  padding-top: 8px;
  border-top: 1px solid #e2e8f0;
  font-size: 8px;
  color: #94a3b8;
  text-align: center;
}
@page { size: A4 portrait; margin: 12mm; }
@media print { body { padding: 0; } html, body { height: auto; } }
`;

// ─── Builders de HTML para impressão ─────────────────────────────────────────

function buildHeaderHTML(empresa: any) {
  const now = new Date();
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
        <strong>${now.toLocaleDateString("pt-BR")}</strong>
        <span>${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
      </div>
    </div>
  `;
}

function buildContratoHTML(c: ContratoParaImpressao, empresa: any, index: number, total: number) {
  const statusBadge =
    c.status === "ativo" ? "badge-green" :
    c.status === "encerrado" ? "badge-gray" :
    c.status === "cancelado" ? "badge-red" :
    c.status === "suspenso" ? "badge-orange" : "badge-yellow";
  const endereco = buildEndereco(c);
  const now = new Date();

  return `
    ${index > 0 ? '<div class="comp-separator"></div>' : ""}
    ${buildHeaderHTML(empresa)}

    <div class="comp-title-row">
      <span class="comp-title">Contrato de ${fmtTipoContrato(c.tipo)}</span>
      ${total > 1 ? `<span class="mono">${index + 1} de ${total}</span>` : ""}
    </div>
    <div class="comp-badge-row">
      <span class="ctrl-num">${c.numero}</span>
      <span class="badge ${statusBadge}">${fmtStatusContrato(c.status)}</span>
      <span class="badge badge-blue">${fmtTipoContrato(c.tipo)}</span>
    </div>

    <p class="comp-section-title">Dados do Contrato</p>
    <div class="comp-grid">
      <div>
        <div class="comp-field-label">Número do Contrato</div>
        <div class="comp-field-value">${c.numero}</div>
      </div>
      <div>
        <div class="comp-field-label">Status</div>
        <div class="comp-field-value">${fmtStatusContrato(c.status)}</div>
      </div>
      <div>
        <div class="comp-field-label">Tipo de Contrato</div>
        <div class="comp-field-value">${fmtTipoContrato(c.tipo)}</div>
      </div>
      <div>
        <div class="comp-field-label">Valor Total do Contrato</div>
        <div class="comp-field-value highlight">${fmtCurrency(c.valorTotal)}</div>
      </div>
      <div>
        <div class="comp-field-label">Data de Início</div>
        <div class="comp-field-value">${fmtDate(c.dataInicio)}</div>
      </div>
      <div>
        <div class="comp-field-label">Data de Encerramento / Vencimento</div>
        <div class="comp-field-value">${fmtDate(c.dataFim)}</div>
      </div>
    </div>

    <p class="comp-section-title">Partes Envolvidas</p>
    <div class="comp-grid">
      <div>
        <div class="comp-field-label">Cliente / Contratante</div>
        <div class="comp-field-value">${c.clienteNome || "—"}</div>
      </div>
      <div>
        <div class="comp-field-label">Contratado (Prestador de Serviços)</div>
        <div class="comp-field-value">${empresa?.nomeEmpresa || "—"}</div>
      </div>
      ${empresa?.cnpj ? `
      <div>
        <div class="comp-field-label">CNPJ do Contratado</div>
        <div class="comp-field-value">${empresa.cnpj}</div>
      </div>
      ` : ""}
      ${empresa?.telefone ? `
      <div>
        <div class="comp-field-label">Telefone do Contratado</div>
        <div class="comp-field-value">${empresa.telefone}</div>
      </div>
      ` : ""}
    </div>

    <p class="comp-section-title">Objeto do Contrato</p>
    <div class="comp-desc">
      <strong>Descrição do Objeto</strong>
      <p>${c.objeto}</p>
    </div>

    ${c.descricao ? `
    <p class="comp-section-title">Descrição Detalhada</p>
    <div class="comp-desc">
      <strong>Detalhamento dos Serviços / Fornecimentos</strong>
      <p>${c.descricao.replace(/\n/g, "<br/>")}</p>
    </div>
    ` : ""}

    ${endereco ? `
    <p class="comp-section-title">Local de Execução</p>
    <div class="comp-endereco">
      <strong>Endereço do Local de Execução</strong>
      <p>${endereco}</p>
    </div>
    ` : ""}

    ${c.observacoes ? `
    <p class="comp-section-title">Observações e Cláusulas Adicionais</p>
    <div class="comp-obs">
      <strong>Observações</strong>
      <p>${c.observacoes.replace(/\n/g, "<br/>")}</p>
    </div>
    ` : ""}

    <p class="comp-section-title">Assinaturas</p>
    <div class="comp-signatures">
      <div class="comp-sig-block">
        <div class="comp-sig-line">Contratante</div>
        <div class="comp-sig-sub">${c.clienteNome || "Nome do Contratante"}</div>
        <div class="comp-sig-blank">CPF / CNPJ: ___________________________</div>
        <div class="comp-sig-blank">Data: _____ / _____ / _________</div>
      </div>
      <div class="comp-sig-block">
        <div class="comp-sig-line">Contratado</div>
        <div class="comp-sig-sub">${empresa?.nomeEmpresa || "Nome do Contratado"}</div>
        <div class="comp-sig-blank">CNPJ: ${empresa?.cnpj || "___________________________"}</div>
        <div class="comp-sig-blank">Data: _____ / _____ / _________</div>
      </div>
    </div>

    <div class="comp-footer">
      Documento gerado em ${now.toLocaleDateString("pt-BR")} às ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} — ${empresa?.nomeEmpresa || ""}
    </div>
  `;
}

function buildOSHTML(o: OSParaImpressao, empresa: any, index: number, total: number) {
  const statusBadge =
    o.status === "concluida" ? "badge-green" :
    o.status === "cancelada" ? "badge-red" :
    o.status === "em_execucao" ? "badge-blue" :
    o.status === "pausada" ? "badge-orange" : "badge-yellow";
  const prioridadeBadge =
    o.prioridade === "urgente" ? "badge-red" :
    o.prioridade === "alta" ? "badge-orange" :
    o.prioridade === "media" ? "badge-yellow" : "badge-gray";
  const endereco = buildEndereco(o);
  const temItens = o.itens && o.itens.length > 0;
  const totalItens = temItens ? o.itens!.reduce((s, i) => s + parseFloat(String(i.valorTotal ?? 0)), 0) : 0;
  const now = new Date();

  return `
    ${index > 0 ? '<div class="comp-separator"></div>' : ""}
    ${buildHeaderHTML(empresa)}

    <div class="comp-title-row">
      <span class="comp-title">Ordem de Serviço</span>
      ${total > 1 ? `<span class="mono">${index + 1} de ${total}</span>` : ""}
    </div>
    <div class="comp-badge-row">
      <span class="ctrl-num">${o.numero}</span>
      <span class="badge ${statusBadge}">${fmtStatusOS(o.status)}</span>
      <span class="badge ${prioridadeBadge}">Prioridade: ${fmtPrioridade(o.prioridade)}</span>
    </div>

    <p class="comp-section-title">Identificação da Ordem de Serviço</p>
    <div class="comp-grid">
      <div>
        <div class="comp-field-label">Número da OS</div>
        <div class="comp-field-value">${o.numero}</div>
      </div>
      <div>
        <div class="comp-field-label">Status</div>
        <div class="comp-field-value">${fmtStatusOS(o.status)}</div>
      </div>
      <div class="span2">
        <div class="comp-field-label">Título / Assunto da OS</div>
        <div class="comp-field-value">${o.titulo}</div>
      </div>
      <div>
        <div class="comp-field-label">Prioridade</div>
        <div class="comp-field-value">${fmtPrioridade(o.prioridade)}</div>
      </div>
      <div>
        <div class="comp-field-label">Responsável Técnico</div>
        <div class="comp-field-value">${o.responsavel || "—"}</div>
      </div>
    </div>

    <p class="comp-section-title">Partes Envolvidas</p>
    <div class="comp-grid">
      <div>
        <div class="comp-field-label">Cliente / Solicitante</div>
        <div class="comp-field-value">${o.clienteNome || "—"}</div>
      </div>
      <div>
        <div class="comp-field-label">Contrato Vinculado</div>
        <div class="comp-field-value">${o.contratoNumero || "—"}</div>
      </div>
      <div>
        <div class="comp-field-label">Prestador de Serviços</div>
        <div class="comp-field-value">${empresa?.nomeEmpresa || "—"}</div>
      </div>
      ${empresa?.cnpj ? `
      <div>
        <div class="comp-field-label">CNPJ do Prestador</div>
        <div class="comp-field-value">${empresa.cnpj}</div>
      </div>
      ` : ""}
    </div>

    <p class="comp-section-title">Datas e Prazos</p>
    <div class="comp-grid-3">
      <div>
        <div class="comp-field-label">Data de Abertura</div>
        <div class="comp-field-value">${fmtDate(o.dataAbertura)}</div>
      </div>
      <div>
        <div class="comp-field-label">Previsão de Conclusão</div>
        <div class="comp-field-value">${fmtDate(o.dataPrevisao)}</div>
      </div>
      <div>
        <div class="comp-field-label">Data de Conclusão</div>
        <div class="comp-field-value">${fmtDate(o.dataConclusao)}</div>
      </div>
    </div>

    <p class="comp-section-title">Valores</p>
    <div class="comp-grid">
      <div>
        <div class="comp-field-label">Valor Estimado</div>
        <div class="comp-field-value highlight">${o.valorEstimado ? fmtCurrency(o.valorEstimado) : "—"}</div>
      </div>
      <div>
        <div class="comp-field-label">Valor Realizado</div>
        <div class="comp-field-value value-green">${o.valorRealizado ? fmtCurrency(o.valorRealizado) : "—"}</div>
      </div>
    </div>

    ${o.descricao ? `
    <p class="comp-section-title">Descrição dos Serviços a Executar</p>
    <div class="comp-desc">
      <strong>Descrição</strong>
      <p>${o.descricao.replace(/\n/g, "<br/>")}</p>
    </div>
    ` : ""}

    ${endereco ? `
    <p class="comp-section-title">Local de Execução dos Serviços</p>
    <div class="comp-endereco">
      <strong>Endereço</strong>
      <p>${endereco}</p>
    </div>
    ` : ""}

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
            <td>${item.descricao || (item.tipo === "servico" ? item.tipoServicoNome : item.materialNome) || "—"}</td>
            <td class="right">${parseFloat(String(item.quantidade)).toLocaleString("pt-BR")}</td>
            <td class="right">${fmtCurrency(item.valorUnitario)}</td>
            <td class="right">${fmtCurrency(item.valorTotal)}</td>
          </tr>
        `).join("")}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="4" style="text-align:right">Total dos Itens</td>
          <td class="right">${fmtCurrency(totalItens)}</td>
        </tr>
      </tfoot>
    </table>
    ` : ""}

    ${o.observacoes ? `
    <p class="comp-section-title">Observações</p>
    <div class="comp-obs">
      <strong>Observações</strong>
      <p>${o.observacoes.replace(/\n/g, "<br/>")}</p>
    </div>
    ` : ""}

    <p class="comp-section-title">Assinaturas e Aprovação</p>
    <div class="comp-signatures">
      <div class="comp-sig-block">
        <div class="comp-sig-line">Responsável Técnico</div>
        <div class="comp-sig-sub">${o.responsavel || "Nome do Responsável"}</div>
        <div class="comp-sig-blank">Cargo: ___________________________</div>
        <div class="comp-sig-blank">Data: _____ / _____ / _________</div>
      </div>
      <div class="comp-sig-block">
        <div class="comp-sig-line">Cliente / Solicitante</div>
        <div class="comp-sig-sub">${o.clienteNome || "Nome do Cliente"}</div>
        <div class="comp-sig-blank">CPF / CNPJ: ___________________________</div>
        <div class="comp-sig-blank">Data: _____ / _____ / _________</div>
      </div>
    </div>

    <div class="comp-footer">
      Documento gerado em ${now.toLocaleDateString("pt-BR")} às ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} — ${empresa?.nomeEmpresa || ""}
    </div>
  `;
}

function buildMateriaisHTML(materiais: MaterialParaImpressao[], empresa: any) {
  const now = new Date();
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
          <th>Nome do Material</th>
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
            <td>${m.unidade || "—"}</td>
            <td class="right">${m.valorUnitario ? fmtCurrency(m.valorUnitario) : "—"}</td>
            <td class="right">${m.estoque != null ? parseFloat(String(m.estoque)).toLocaleString("pt-BR") : "—"}</td>
            <td class="right">${m.estoqueMinimo != null ? parseFloat(String(m.estoqueMinimo)).toLocaleString("pt-BR") : "—"}</td>
            <td class="center"><span class="badge ${m.ativo ? "badge-green" : "badge-gray"}">${m.ativo ? "Ativo" : "Inativo"}</span></td>
          </tr>
        `).join("")}
      </tbody>
    </table>
    <div class="comp-footer">
      Catálogo emitido em ${now.toLocaleDateString("pt-BR")} às ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} — ${empresa?.nomeEmpresa || ""}
    </div>
  `;
}

function buildTiposServicoHTML(tipos: TipoServicoParaImpressao[], empresa: any) {
  const now = new Date();
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
          <th>Nome do Serviço</th>
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
            <td>${t.unidade || "—"}</td>
            <td class="right">${t.valorUnitario ? fmtCurrency(t.valorUnitario) : "—"}</td>
            <td class="center"><span class="badge ${t.ativo ? "badge-green" : "badge-gray"}">${t.ativo ? "Ativo" : "Inativo"}</span></td>
          </tr>
        `).join("")}
      </tbody>
    </table>
    <div class="comp-footer">
      Catálogo emitido em ${now.toLocaleDateString("pt-BR")} às ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} — ${empresa?.nomeEmpresa || ""}
    </div>
  `;
}

// ─── Preview Cards (exibição completa no modal antes de imprimir) ─────────────

function PreviewContratoCard({ c, empresa }: { c: ContratoParaImpressao; empresa: any }) {
  const endereco = buildEndereco(c);
  const statusColor =
    c.status === "ativo" ? "bg-green-100 text-green-800 border-green-200" :
    c.status === "encerrado" ? "bg-gray-100 text-gray-600 border-gray-200" :
    c.status === "cancelado" ? "bg-red-100 text-red-800 border-red-200" :
    c.status === "suspenso" ? "bg-orange-100 text-orange-800 border-orange-200" :
    "bg-yellow-100 text-yellow-800 border-yellow-200";

  return (
    <div className="border rounded-xl bg-white overflow-hidden shadow-sm text-sm">
      {/* Cabeçalho da empresa */}
      <div className="bg-slate-900 text-white px-5 py-4 flex items-center gap-4">
        {empresa?.logoUrl && (
          <img src={empresa.logoUrl} alt="Logo" className="h-10 w-auto object-contain flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="font-bold text-base leading-tight">{empresa?.nomeEmpresa || "Empresa"}</div>
          {empresa?.cnpj && <div className="text-xs text-slate-300 mt-0.5">CNPJ: {empresa.cnpj}</div>}
          {empresa?.telefone && <div className="text-xs text-slate-300">{empresa.telefone}</div>}
        </div>
        <div className="text-right text-xs text-slate-400 flex-shrink-0">
          <div>Emitido em</div>
          <div className="font-semibold text-white text-sm">{new Date().toLocaleDateString("pt-BR")}</div>
          <div>{new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Título e badges */}
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Contrato de {fmtTipoContrato(c.tipo)}</div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono font-black text-blue-700 text-xl border-2 border-blue-200 bg-blue-50 px-4 py-1.5 rounded-lg tracking-wider">{c.numero}</span>
            <span className={`text-xs px-3 py-1 rounded-full font-semibold border ${statusColor}`}>{fmtStatusContrato(c.status)}</span>
            <span className="text-xs px-3 py-1 rounded-full font-semibold bg-blue-100 text-blue-800 border border-blue-200">{fmtTipoContrato(c.tipo)}</span>
          </div>
        </div>

        {/* Dados do Contrato */}
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border-l-4 border-blue-600 px-3 py-1.5 mb-3">Dados do Contrato</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Valor Total</p>
              <p className="font-black text-blue-700 text-lg">{fmtCurrency(c.valorTotal)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Tipo</p>
              <p className="font-semibold">{fmtTipoContrato(c.tipo)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Data de Início</p>
              <p className="font-semibold">{fmtDate(c.dataInicio)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Data de Encerramento</p>
              <p className="font-semibold">{fmtDate(c.dataFim)}</p>
            </div>
          </div>
        </div>

        {/* Partes */}
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border-l-4 border-blue-600 px-3 py-1.5 mb-3">Partes Envolvidas</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Cliente / Contratante</p>
              <p className="font-semibold">{c.clienteNome || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Contratado</p>
              <p className="font-semibold">{empresa?.nomeEmpresa || "—"}</p>
              {empresa?.cnpj && <p className="text-xs text-gray-400">CNPJ: {empresa.cnpj}</p>}
            </div>
          </div>
        </div>

        {/* Objeto */}
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border-l-4 border-blue-600 px-3 py-1.5 mb-3">Objeto do Contrato</div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm leading-relaxed">{c.objeto}</div>
        </div>

        {/* Descrição */}
        {c.descricao && (
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border-l-4 border-blue-600 px-3 py-1.5 mb-3">Descrição Detalhada</div>
            <div className="bg-sky-50 border border-sky-200 rounded-lg p-3 text-sm leading-relaxed whitespace-pre-wrap">{c.descricao}</div>
          </div>
        )}

        {/* Endereço */}
        {endereco && (
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-600 bg-slate-50 border-l-4 border-slate-500 px-3 py-1.5 mb-3">Local de Execução</div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm">{endereco}</div>
          </div>
        )}

        {/* Observações */}
        {c.observacoes && (
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border-l-4 border-amber-500 px-3 py-1.5 mb-3">Observações / Cláusulas</div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm leading-relaxed whitespace-pre-wrap">{c.observacoes}</div>
          </div>
        )}

        {/* Assinaturas */}
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-gray-500 bg-gray-50 border-l-4 border-gray-400 px-3 py-1.5 mb-4">Assinaturas</div>
          <div className="grid grid-cols-2 gap-10">
            <div className="text-center">
              <div className="border-t-2 border-gray-400 pt-2 mt-10 text-xs font-bold text-gray-700 uppercase tracking-wide">Contratante</div>
              <div className="text-xs text-gray-500 mt-1">{c.clienteNome || "Nome do Contratante"}</div>
              <div className="text-xs text-gray-300 mt-1">CPF/CNPJ: ___________________</div>
              <div className="text-xs text-gray-300">Data: _____ / _____ / _________</div>
            </div>
            <div className="text-center">
              <div className="border-t-2 border-gray-400 pt-2 mt-10 text-xs font-bold text-gray-700 uppercase tracking-wide">Contratado</div>
              <div className="text-xs text-gray-500 mt-1">{empresa?.nomeEmpresa || "Nome do Contratado"}</div>
              <div className="text-xs text-gray-300 mt-1">CNPJ: {empresa?.cnpj || "___________________"}</div>
              <div className="text-xs text-gray-300">Data: _____ / _____ / _________</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewOSCard({ o, empresa }: { o: OSParaImpressao; empresa: any }) {
  const endereco = buildEndereco(o);
  const statusColor =
    o.status === "concluida" ? "bg-green-100 text-green-800 border-green-200" :
    o.status === "cancelada" ? "bg-red-100 text-red-800 border-red-200" :
    o.status === "em_execucao" ? "bg-blue-100 text-blue-800 border-blue-200" :
    o.status === "pausada" ? "bg-orange-100 text-orange-800 border-orange-200" :
    "bg-yellow-100 text-yellow-800 border-yellow-200";
  const prioridadeColor =
    o.prioridade === "urgente" ? "bg-red-100 text-red-800 border-red-200" :
    o.prioridade === "alta" ? "bg-orange-100 text-orange-800 border-orange-200" :
    o.prioridade === "media" ? "bg-yellow-100 text-yellow-800 border-yellow-200" :
    "bg-gray-100 text-gray-600 border-gray-200";
  const temItens = o.itens && o.itens.length > 0;
  const totalItens = temItens ? o.itens!.reduce((s, i) => s + parseFloat(String(i.valorTotal ?? 0)), 0) : 0;

  return (
    <div className="border rounded-xl bg-white overflow-hidden shadow-sm text-sm">
      {/* Cabeçalho da empresa */}
      <div className="bg-slate-900 text-white px-5 py-4 flex items-center gap-4">
        {empresa?.logoUrl && (
          <img src={empresa.logoUrl} alt="Logo" className="h-10 w-auto object-contain flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="font-bold text-base leading-tight">{empresa?.nomeEmpresa || "Empresa"}</div>
          {empresa?.cnpj && <div className="text-xs text-slate-300 mt-0.5">CNPJ: {empresa.cnpj}</div>}
          {empresa?.telefone && <div className="text-xs text-slate-300">{empresa.telefone}</div>}
        </div>
        <div className="text-right text-xs text-slate-400 flex-shrink-0">
          <div>Emitido em</div>
          <div className="font-semibold text-white text-sm">{new Date().toLocaleDateString("pt-BR")}</div>
          <div>{new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Título e badges */}
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Ordem de Serviço</div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono font-black text-blue-700 text-xl border-2 border-blue-200 bg-blue-50 px-4 py-1.5 rounded-lg tracking-wider">{o.numero}</span>
            <span className={`text-xs px-3 py-1 rounded-full font-semibold border ${statusColor}`}>{fmtStatusOS(o.status)}</span>
            <span className={`text-xs px-3 py-1 rounded-full font-semibold border ${prioridadeColor}`}>Prioridade: {fmtPrioridade(o.prioridade)}</span>
          </div>
        </div>

        {/* Identificação */}
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border-l-4 border-blue-600 px-3 py-1.5 mb-3">Identificação</div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Título / Assunto da OS</p>
              <p className="font-bold text-base">{o.titulo}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Responsável Técnico</p>
              <p className="font-semibold">{o.responsavel || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Status</p>
              <p className="font-semibold">{fmtStatusOS(o.status)}</p>
            </div>
          </div>
        </div>

        {/* Partes */}
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border-l-4 border-blue-600 px-3 py-1.5 mb-3">Partes Envolvidas</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Cliente / Solicitante</p>
              <p className="font-semibold">{o.clienteNome || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Contrato Vinculado</p>
              <p className="font-mono font-semibold">{o.contratoNumero || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Prestador de Serviços</p>
              <p className="font-semibold">{empresa?.nomeEmpresa || "—"}</p>
            </div>
            {empresa?.cnpj && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">CNPJ do Prestador</p>
                <p className="font-semibold">{empresa.cnpj}</p>
              </div>
            )}
          </div>
        </div>

        {/* Datas */}
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border-l-4 border-blue-600 px-3 py-1.5 mb-3">Datas e Prazos</div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Abertura</p>
              <p className="font-semibold">{fmtDate(o.dataAbertura)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Previsão</p>
              <p className="font-semibold">{fmtDate(o.dataPrevisao)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Conclusão</p>
              <p className="font-semibold">{fmtDate(o.dataConclusao)}</p>
            </div>
          </div>
        </div>

        {/* Valores */}
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border-l-4 border-blue-600 px-3 py-1.5 mb-3">Valores</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Valor Estimado</p>
              <p className="font-black text-blue-700 text-lg">{o.valorEstimado ? fmtCurrency(o.valorEstimado) : "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Valor Realizado</p>
              <p className="font-black text-green-700 text-lg">{o.valorRealizado ? fmtCurrency(o.valorRealizado) : "—"}</p>
            </div>
          </div>
        </div>

        {/* Descrição */}
        {o.descricao && (
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border-l-4 border-blue-600 px-3 py-1.5 mb-3">Descrição dos Serviços</div>
            <div className="bg-sky-50 border border-sky-200 rounded-lg p-3 text-sm leading-relaxed whitespace-pre-wrap">{o.descricao}</div>
          </div>
        )}

        {/* Endereço */}
        {endereco && (
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-600 bg-slate-50 border-l-4 border-slate-500 px-3 py-1.5 mb-3">Local de Execução</div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm">{endereco}</div>
          </div>
        )}

        {/* Itens */}
        {temItens && (
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border-l-4 border-blue-600 px-3 py-1.5 mb-3">Itens da OS</div>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold text-gray-600">Tipo</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-600">Descrição</th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-600">Qtd</th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-600">Vl. Unit.</th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-600">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {o.itens!.map((item, idx) => (
                    <tr key={idx} className="border-t hover:bg-gray-50">
                      <td className="px-3 py-2">{item.tipo === "servico" ? "Serviço" : "Material"}</td>
                      <td className="px-3 py-2">{item.descricao || (item.tipo === "servico" ? item.tipoServicoNome : item.materialNome) || "—"}</td>
                      <td className="px-3 py-2 text-right">{parseFloat(String(item.quantidade)).toLocaleString("pt-BR")}</td>
                      <td className="px-3 py-2 text-right">{fmtCurrency(item.valorUnitario)}</td>
                      <td className="px-3 py-2 text-right font-semibold">{fmtCurrency(item.valorTotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100">
                  <tr>
                    <td colSpan={4} className="px-3 py-2 text-right font-bold">Total dos Itens</td>
                    <td className="px-3 py-2 text-right font-bold text-blue-700">{fmtCurrency(totalItens)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Observações */}
        {o.observacoes && (
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border-l-4 border-amber-500 px-3 py-1.5 mb-3">Observações</div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm leading-relaxed whitespace-pre-wrap">{o.observacoes}</div>
          </div>
        )}

        {/* Assinaturas */}
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-gray-500 bg-gray-50 border-l-4 border-gray-400 px-3 py-1.5 mb-4">Assinaturas e Aprovação</div>
          <div className="grid grid-cols-2 gap-10">
            <div className="text-center">
              <div className="border-t-2 border-gray-400 pt-2 mt-10 text-xs font-bold text-gray-700 uppercase tracking-wide">Responsável Técnico</div>
              <div className="text-xs text-gray-500 mt-1">{o.responsavel || "Nome do Responsável"}</div>
              <div className="text-xs text-gray-300 mt-1">Cargo: ___________________</div>
              <div className="text-xs text-gray-300">Data: _____ / _____ / _________</div>
            </div>
            <div className="text-center">
              <div className="border-t-2 border-gray-400 pt-2 mt-10 text-xs font-bold text-gray-700 uppercase tracking-wide">Cliente / Solicitante</div>
              <div className="text-xs text-gray-500 mt-1">{o.clienteNome || "Nome do Cliente"}</div>
              <div className="text-xs text-gray-300 mt-1">CPF/CNPJ: ___________________</div>
              <div className="text-xs text-gray-300">Data: _____ / _____ / _________</div>
            </div>
          </div>
        </div>
      </div>
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

        <div className="space-y-4">
          {tipo === "contrato" && (dados as ContratoParaImpressao[]).map(c => (
            <PreviewContratoCard key={c.id} c={c} empresa={empresa} />
          ))}
          {tipo === "os" && (dados as OSParaImpressao[]).map(o => (
            <PreviewOSCard key={o.id} o={o} empresa={empresa} />
          ))}
          {(tipo === "materiais" || tipo === "tiposServico") && (
            <div className="text-sm text-muted-foreground text-center py-8 border-2 border-dashed rounded-xl bg-muted/20">
              <Printer className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
              <p className="font-semibold text-base">{dados.length} {tipo === "materiais" ? "material(is)" : "tipo(s) de serviço"} prontos para impressão</p>
              <p className="text-xs mt-2 text-muted-foreground/70">Clique em "Imprimir / Salvar PDF" para gerar o catálogo completo com logo da empresa.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
