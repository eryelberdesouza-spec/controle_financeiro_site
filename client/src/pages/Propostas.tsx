import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Plus, Search, Edit, Trash2, Copy, FileText, Eye, CheckCircle,
  XCircle, Send, Clock, AlertCircle, Printer, ChevronDown, ChevronUp,
  Link2, Package, Wrench, X, GripVertical
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type StatusProposta = "RASCUNHO" | "ENVIADA" | "EM_NEGOCIACAO" | "APROVADA" | "RECUSADA" | "EM_CONTRATACAO" | "EXPIRADA" | "CANCELADA";

interface EscopoItem { id?: number; descricao: string; ordem: number; }
interface PropostaItem { id?: number; tipo: "MATERIAL" | "SERVICO" | "OUTRO"; materialId?: number | null; tipoServicoId?: number | null; descricao: string; unidade: string; quantidade: string; valorUnitario: string; valorSubtotal: string; ordem: number; }
interface PagamentoOpcao { id?: number; formaPagamentoId?: number | null; textoCustomizado?: string | null; ordem: number; }
interface InfoImportante { id?: number; infoImportanteId?: number | null; titulo: string; conteudo: string; exclusiva: boolean; ordem: number; }

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<StatusProposta, { label: string; color: string; icon: any }> = {
  RASCUNHO: { label: "Rascunho", color: "bg-gray-100 text-gray-700 border-gray-200", icon: FileText },
  ENVIADA: { label: "Enviada", color: "bg-blue-100 text-blue-700 border-blue-200", icon: Send },
  EM_NEGOCIACAO: { label: "Em Negociação", color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: Clock },
  APROVADA: { label: "Aprovada", color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle },
  RECUSADA: { label: "Recusada", color: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
  EM_CONTRATACAO: { label: "Em Contratação", color: "bg-purple-100 text-purple-700 border-purple-200", icon: Link2 },
  EXPIRADA: { label: "Expirada", color: "bg-orange-100 text-orange-700 border-orange-200", icon: AlertCircle },
  CANCELADA: { label: "Cancelada", color: "bg-gray-200 text-gray-600 border-gray-300", icon: XCircle },
};

function formatCurrency(v: string | number | null | undefined): string {
  const n = parseFloat(String(v ?? "0")) || 0;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatCpfCnpj(v: string): string {
  const digits = v.replace(/\D/g, "");
  if (digits.length <= 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}

function calcSubtotal(qtd: string, vu: string): string {
  const q = parseFloat(qtd) || 0;
  const v = parseFloat(vu) || 0;
  return (q * v).toFixed(2);
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function Propostas() {
  const utils = trpc.useUtils();

  // Listagem
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const { data: propostas = [], isLoading } = trpc.propostas.list.useQuery({
    search: search || undefined,
    status: filterStatus !== "todos" ? filterStatus : undefined,
  });

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [viewId, setViewId] = useState<number | null>(null);
  const [statusModalId, setStatusModalId] = useState<number | null>(null);

  // Formulário
  const [form, setForm] = useState(getEmptyForm());
  const [escopos, setEscopos] = useState<EscopoItem[]>([]);
  const [itens, setItens] = useState<PropostaItem[]>([]);
  const [pagamentosOpcoes, setPagamentosOpcoes] = useState<PagamentoOpcao[]>([]);
  const [infoImportantes, setInfoImportantes] = useState<InfoImportante[]>([]);

  // Dados auxiliares
  const { data: clientes = [] } = trpc.clientes.list.useQuery();
  const { data: formasPagamento = [] } = trpc.propostas.listFormasPagamento.useQuery();
  const { data: prazos = [] } = trpc.propostas.listPrazos.useQuery();
  const { data: infosPadrao = [] } = trpc.propostas.listInfoImportantes.useQuery();
  const { data: materiais = [] } = trpc.materiais.list.useQuery({ busca: undefined });
  const { data: tiposServico = [] } = trpc.tiposServico.list.useQuery({ busca: undefined });
  const { data: proximoNumero } = trpc.propostas.getProximoNumero.useQuery();
  const { data: sobreNosData } = trpc.propostas.getSobreNosPadrao.useQuery();
  const { data: propostaDetalhes } = trpc.propostas.getById.useQuery(
    { id: editId ?? viewId ?? 0 },
    { enabled: !!(editId || viewId) }
  );

  // Mutations
  const createMutation = trpc.propostas.create.useMutation({
    onSuccess: () => { toast.success("Proposta criada com sucesso!"); utils.propostas.list.invalidate(); closeModal(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.propostas.update.useMutation({
    onSuccess: () => { toast.success("Proposta atualizada!"); utils.propostas.list.invalidate(); closeModal(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.propostas.delete.useMutation({
    onSuccess: () => { toast.success("Proposta excluída."); utils.propostas.list.invalidate(); },
  });
  const duplicarMutation = trpc.propostas.duplicar.useMutation({
    onSuccess: (d) => { toast.success(`Proposta duplicada: ${d.numero}`); utils.propostas.list.invalidate(); },
  });
  const mudarStatusMutation = trpc.propostas.mudarStatus.useMutation({
    onSuccess: () => { toast.success("Status atualizado!"); utils.propostas.list.invalidate(); setStatusModalId(null); },
  });

  function getEmptyForm() {
    const today = new Date();
    return {
      numero: "",
      clienteId: "",
      clienteNome: "",
      clienteCpfCnpj: "",
      clienteEndereco: "",
      clienteCep: "",
      clienteTelefone: "",
      clienteEmail: "",
      clienteResponsavel: "",
      dataGeracao: today.toISOString().split("T")[0],
      validadeDias: "30",
      sobreNosTexto: "",
      prazoPadraoId: "",
      prazoPadraoTexto: "",
      descontoPercentual: "0",
      descontoValor: "0",
      observacoes: "",
    };
  }

  function openCreate() {
    setEditId(null);
    setViewId(null);
    setForm({ ...getEmptyForm(), numero: proximoNumero?.numero ?? "", sobreNosTexto: sobreNosData?.texto ?? "" });
    setEscopos([]);
    setItens([]);
    setPagamentosOpcoes([]);
    setInfoImportantes([]);
    setModalOpen(true);
  }

  function openEdit(id: number) {
    setEditId(id);
    setViewId(null);
    setModalOpen(true);
  }

  function openView(id: number) {
    setViewId(id);
    setEditId(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditId(null);
    setViewId(null);
  }

  // Carregar dados ao editar
  useEffect(() => {
    if (propostaDetalhes && (editId || viewId)) {
      const p = propostaDetalhes;
      setForm({
        numero: p.numero,
        clienteId: p.clienteId ? String(p.clienteId) : "",
        clienteNome: p.clienteNome ?? "",
        clienteCpfCnpj: p.clienteCpfCnpj ?? "",
        clienteEndereco: p.clienteEndereco ?? "",
        clienteCep: p.clienteCep ?? "",
        clienteTelefone: p.clienteTelefone ?? "",
        clienteEmail: p.clienteEmail ?? "",
        clienteResponsavel: p.clienteResponsavel ?? "",
        dataGeracao: p.dataGeracao ? new Date(p.dataGeracao).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
        validadeDias: String(p.validadeDias ?? 30),
        sobreNosTexto: p.sobreNosTexto ?? "",
        prazoPadraoId: p.prazoPadraoId ? String(p.prazoPadraoId) : "",
        prazoPadraoTexto: p.prazoPadraoTexto ?? "",
        descontoPercentual: p.descontoPercentual ?? "0",
        descontoValor: p.descontoValor ?? "0",
        observacoes: p.observacoes ?? "",
      });
      setEscopos(p.escopos.map((e) => ({ id: e.id, descricao: e.descricao, ordem: e.ordem })));
      setItens(p.itens.map((it) => ({
        id: it.id,
        tipo: it.tipo as any,
        materialId: it.materialId,
        tipoServicoId: it.tipoServicoId,
        descricao: it.descricao,
        unidade: it.unidade ?? "un",
        quantidade: it.quantidade,
        valorUnitario: it.valorUnitario,
        valorSubtotal: it.valorSubtotal,
        ordem: it.ordem,
      })));
      setPagamentosOpcoes(p.pagamentosOpcoes.map((pg) => ({
        id: pg.id,
        formaPagamentoId: pg.formaPagamentoId,
        textoCustomizado: pg.textoCustomizado,
        ordem: pg.ordem,
      })));
      setInfoImportantes(p.infoImportantes.map((inf) => ({
        id: inf.id,
        infoImportanteId: inf.infoImportanteId,
        titulo: inf.titulo,
        conteudo: inf.conteudo,
        exclusiva: inf.exclusiva,
        ordem: inf.ordem,
      })));
    }
  }, [propostaDetalhes, editId, viewId]);

  // Cálculos automáticos
  const subtotal = itens.reduce((acc, it) => acc + (parseFloat(it.valorSubtotal) || 0), 0);
  const descontoV = parseFloat(form.descontoValor) || 0;
  const descontoP = parseFloat(form.descontoPercentual) || 0;
  const descontoFinal = descontoV > 0 ? descontoV : (subtotal * descontoP / 100);
  const total = Math.max(0, subtotal - descontoFinal);

  // Ao selecionar cliente, preencher campos automaticamente
  function handleClienteSelect(clienteId: string) {
    const cliente = (clientes as any[]).find((c: any) => String(c.id) === clienteId);
    if (!cliente) { setForm((f) => ({ ...f, clienteId })); return; }
    const endereco = [cliente.logradouro, cliente.numero, cliente.complemento, cliente.bairro, cliente.cidade, cliente.estado].filter(Boolean).join(", ");
    setForm((f) => ({
      ...f,
      clienteId,
      clienteNome: cliente.nome ?? "",
      clienteCpfCnpj: cliente.cpfCnpj ?? "",
      clienteEndereco: endereco,
      clienteCep: cliente.cep ?? "",
      clienteTelefone: cliente.telefone ?? cliente.celular ?? "",
      clienteEmail: cliente.email ?? "",
      clienteResponsavel: cliente.nomeContato ?? "",
    }));
  }

  // Ao selecionar prazo pré-cadastrado
  function handlePrazoSelect(prazoId: string) {
    const prazo = (prazos as any[]).find((p: any) => String(p.id) === prazoId);
    setForm((f) => ({
      ...f,
      prazoPadraoId: prazoId,
      prazoPadraoTexto: prazo ? (prazo.descricao ?? prazo.nome) : f.prazoPadraoTexto,
    }));
  }

  // Ao selecionar material no item
  function handleMaterialSelect(idx: number, materialId: string) {
    const mat = (materiais as any[]).find((m: any) => String(m.id) === materialId);
    if (!mat) return;
    setItens((prev) => prev.map((it, i) => {
      if (i !== idx) return it;
      const vu = mat.precoVenda ?? mat.valorUnitario ?? "0";
      return { ...it, materialId: mat.id, descricao: mat.nome, unidade: mat.unidade ?? "un", valorUnitario: String(vu), valorSubtotal: calcSubtotal(it.quantidade, String(vu)) };
    }));
  }

  // Ao selecionar tipo de serviço no item
  function handleServicoSelect(idx: number, servicoId: string) {
    const svc = (tiposServico as any[]).find((s: any) => String(s.id) === servicoId);
    if (!svc) return;
    setItens((prev) => prev.map((it, i) => {
      if (i !== idx) return it;
      const vu = svc.valorUnitario ?? "0";
      return { ...it, tipoServicoId: svc.id, descricao: svc.nome, unidade: svc.unidade ?? "un", valorUnitario: String(vu), valorSubtotal: calcSubtotal(it.quantidade, String(vu)) };
    }));
  }

  function handleSubmit() {
    const payload = {
      clienteId: form.clienteId ? parseInt(form.clienteId) : null,
      clienteNome: form.clienteNome || null,
      clienteCpfCnpj: form.clienteCpfCnpj || null,
      clienteEndereco: form.clienteEndereco || null,
      clienteCep: form.clienteCep || null,
      clienteTelefone: form.clienteTelefone || null,
      clienteEmail: form.clienteEmail || null,
      clienteResponsavel: form.clienteResponsavel || null,
      dataGeracao: form.dataGeracao,
      validadeDias: parseInt(form.validadeDias) || 30,
      sobreNosTexto: form.sobreNosTexto || null,
      prazoPadraoId: form.prazoPadraoId ? parseInt(form.prazoPadraoId) : null,
      prazoPadraoTexto: form.prazoPadraoTexto || null,
      valorSubtotal: subtotal.toFixed(2),
      descontoPercentual: form.descontoPercentual,
      descontoValor: descontoFinal.toFixed(2),
      valorTotal: total.toFixed(2),
      observacoes: form.observacoes || null,
      escopos,
      itens,
      pagamentosOpcoes,
      infoImportantes,
    };

    if (editId) {
      updateMutation.mutate({ ...payload, id: editId });
    } else {
      createMutation.mutate(payload);
    }
  }

  // ─── Geração de PDF ──────────────────────────────────────────────────────────

  function gerarPDF(proposta: any) {
    if (!propostaDetalhes && !proposta) return;
    const p = propostaDetalhes ?? proposta;
    const win = window.open("", "_blank");
    if (!win) return;

    const formatDate = (d: any) => d ? new Date(d).toLocaleDateString("pt-BR") : "—";
    const fmtCurrency = (v: any) => parseFloat(String(v ?? "0")).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    const itensHtml = (p.itens ?? []).map((it: any, i: number) => `
      <tr>
        <td style="padding:6px 8px;border:1px solid #e5e7eb;">${i + 1}</td>
        <td style="padding:6px 8px;border:1px solid #e5e7eb;">${it.descricao}</td>
        <td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:center;">${it.unidade ?? "un"}</td>
        <td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right;">${parseFloat(it.quantidade).toLocaleString("pt-BR")}</td>
        <td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right;">${fmtCurrency(it.valorUnitario)}</td>
        <td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right;font-weight:600;">${fmtCurrency(it.valorSubtotal)}</td>
      </tr>`).join("");

    const escoposHtml = (p.escopos ?? []).map((e: any, i: number) => `<li style="margin-bottom:6px;">${i + 1}. ${e.descricao}</li>`).join("");
    const pagamentosHtml = (p.pagamentosOpcoes ?? []).map((pg: any, i: number) => `<div style="margin-bottom:6px;"><strong>Opção ${i + 1}:</strong> ${pg.formaNome ?? pg.textoCustomizado ?? "—"}</div>`).join("");
    const infosHtml = (p.infoImportantes ?? []).map((inf: any) => `<div style="margin-bottom:12px;"><strong>${inf.titulo}</strong><p style="margin:4px 0 0;color:#374151;">${inf.conteudo}</p></div>`).join("");

    const subtotalVal = (p.itens ?? []).reduce((acc: number, it: any) => acc + (parseFloat(it.valorSubtotal) || 0), 0);
    const descontoVal = parseFloat(p.descontoValor ?? "0");
    const totalVal = parseFloat(p.valorTotal ?? "0");

    win.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Proposta ${p.numero}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; font-size: 13px; line-height: 1.5; }
  .page { max-width: 800px; margin: 0 auto; padding: 40px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; border-bottom: 3px solid #1d4ed8; padding-bottom: 20px; }
  .logo-area { display: flex; flex-direction: column; }
  .logo-name { font-size: 28px; font-weight: 800; color: #1d4ed8; letter-spacing: -0.5px; }
  .logo-sub { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; }
  .proposta-info { text-align: right; }
  .proposta-numero { font-size: 18px; font-weight: 700; color: #1d4ed8; }
  .proposta-data { font-size: 12px; color: #6b7280; margin-top: 4px; }
  .section { margin-bottom: 28px; }
  .section-title { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #1d4ed8; border-bottom: 2px solid #dbeafe; padding-bottom: 6px; margin-bottom: 14px; }
  .client-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .client-field { margin-bottom: 6px; }
  .client-label { font-size: 10px; text-transform: uppercase; color: #9ca3af; font-weight: 600; }
  .client-value { font-size: 13px; color: #1f2937; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #1d4ed8; color: white; padding: 8px; text-align: left; font-weight: 600; }
  .total-row td { font-weight: 700; background: #f0f9ff; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
  .badge-validade { background: #fef3c7; color: #92400e; }
  .assinatura { margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 20px; }
  .assinatura-line { border-bottom: 1px solid #374151; width: 300px; margin-bottom: 6px; height: 40px; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
<div class="page">
  <!-- CABEÇALHO -->
  <div class="header">
    <div class="logo-area">
      <div class="logo-name">⚡ ATOM TECH</div>
      <div class="logo-sub">Engenharia Elétrica &amp; Tecnologia</div>
      <div style="margin-top:8px;font-size:11px;color:#6b7280;">Brasília – DF</div>
    </div>
    <div class="proposta-info">
      <div class="proposta-numero">${p.numero}</div>
      <div class="proposta-data">Emitida em: ${formatDate(p.dataGeracao)}</div>
      <div class="proposta-data">Validade: <span class="badge badge-validade">${p.validadeDias ?? 30} dias</span></div>
    </div>
  </div>

  <!-- SOBRE VOCÊ -->
  <div class="section">
    <div class="section-title">Sobre Você</div>
    <div class="client-grid">
      <div class="client-field"><div class="client-label">Nome / Razão Social</div><div class="client-value">${p.clienteNome ?? "—"}</div></div>
      <div class="client-field"><div class="client-label">CPF / CNPJ</div><div class="client-value">${p.clienteCpfCnpj ? formatCpfCnpj(p.clienteCpfCnpj) : "—"}</div></div>
      <div class="client-field"><div class="client-label">Responsável</div><div class="client-value">${p.clienteResponsavel ?? "—"}</div></div>
      <div class="client-field"><div class="client-label">Telefone</div><div class="client-value">${p.clienteTelefone ?? "—"}</div></div>
      <div class="client-field"><div class="client-label">E-mail</div><div class="client-value">${p.clienteEmail ?? "—"}</div></div>
      <div class="client-field"><div class="client-label">CEP</div><div class="client-value">${p.clienteCep ?? "—"}</div></div>
      <div class="client-field" style="grid-column:1/-1;"><div class="client-label">Endereço</div><div class="client-value">${p.clienteEndereco ?? "—"}</div></div>
    </div>
  </div>

  <!-- SOBRE NÓS -->
  ${p.sobreNosTexto ? `<div class="section"><div class="section-title">Sobre Nós</div><div style="white-space:pre-line;color:#374151;">${p.sobreNosTexto}</div></div>` : ""}

  <!-- O QUE PROPOMOS ENTREGAR -->
  ${escoposHtml ? `<div class="section"><div class="section-title">O Que Propomos Entregar</div><ul style="list-style:none;padding:0;">${escoposHtml}</ul></div>` : ""}

  <!-- ITENS E VALORES -->
  <div class="section">
    <div class="section-title">Itens e Valores</div>
    <table>
      <thead><tr><th style="width:40px;">#</th><th>Descrição</th><th style="width:60px;text-align:center;">Unid.</th><th style="width:70px;text-align:right;">Qtd.</th><th style="width:110px;text-align:right;">Valor Unit.</th><th style="width:110px;text-align:right;">Subtotal</th></tr></thead>
      <tbody>${itensHtml}</tbody>
      <tfoot>
        <tr><td colspan="5" style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right;">Subtotal</td><td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right;">${fmtCurrency(subtotalVal)}</td></tr>
        ${descontoVal > 0 ? `<tr><td colspan="5" style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right;color:#dc2626;">Desconto</td><td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right;color:#dc2626;">- ${fmtCurrency(descontoVal)}</td></tr>` : ""}
        <tr class="total-row"><td colspan="5" style="padding:8px;border:1px solid #e5e7eb;text-align:right;font-size:14px;">TOTAL</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:right;font-size:14px;color:#1d4ed8;">${fmtCurrency(totalVal)}</td></tr>
      </tfoot>
    </table>
  </div>

  <!-- CONDIÇÕES DE PAGAMENTO -->
  ${pagamentosHtml ? `<div class="section"><div class="section-title">Condições de Pagamento</div>${pagamentosHtml}</div>` : ""}

  <!-- PRAZO DE EXECUÇÃO -->
  ${p.prazoPadraoTexto ? `<div class="section"><div class="section-title">Prazo de Execução</div><p>${p.prazoPadraoTexto}</p></div>` : ""}

  <!-- INFORMAÇÕES IMPORTANTES -->
  ${infosHtml ? `<div class="section"><div class="section-title">⚠ Leia com Atenção — Informações Importantes</div>${infosHtml}</div>` : ""}

  <!-- ASSINATURA -->
  <div class="assinatura">
    <div class="section-title">Assinatura de Aprovação</div>
    <p style="margin-bottom:20px;color:#6b7280;font-size:12px;">Ao assinar abaixo, o cliente declara estar de acordo com todos os termos desta proposta.</p>
    <div style="display:flex;gap:60px;">
      <div>
        <div class="assinatura-line"></div>
        <div style="font-size:11px;color:#6b7280;">Assinatura do Cliente</div>
        <div style="font-size:12px;margin-top:4px;">${p.assinaturaNome ?? "___________________________"}</div>
      </div>
      <div>
        <div class="assinatura-line"></div>
        <div style="font-size:11px;color:#6b7280;">Data</div>
        <div style="font-size:12px;margin-top:4px;">${p.assinaturaData ? formatDate(p.assinaturaData) : "____/____/________"}</div>
      </div>
    </div>
  </div>

  <div style="margin-top:32px;text-align:center;font-size:10px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:12px;">
    ATOM TECH — Engenharia Elétrica &amp; Tecnologia — Brasília, DF
  </div>
</div>
<script>window.onload = () => window.print();</script>
</body>
</html>`);
    win.document.close();
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  const isReadOnly = !!viewId;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Propostas Comerciais</h1>
            <p className="text-sm text-muted-foreground mt-1">Gerencie propostas com numeração automática PRO-AAAA-MM-XXXX</p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" /> Nova Proposta
          </Button>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar por número, cliente..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Filtrar por status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Listagem */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Carregando...</div>
            ) : propostas.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Nenhuma proposta encontrada.</p>
                <Button variant="outline" className="mt-3" onClick={openCreate}>Criar primeira proposta</Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-left p-3 font-medium">Número</th>
                      <th className="text-left p-3 font-medium">Cliente</th>
                      <th className="text-left p-3 font-medium">Data</th>
                      <th className="text-left p-3 font-medium">Validade</th>
                      <th className="text-right p-3 font-medium">Valor Total</th>
                      <th className="text-center p-3 font-medium">Status</th>
                      <th className="text-center p-3 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(propostas as any[]).map((p: any) => {
                      const cfg = STATUS_CONFIG[p.status as StatusProposta] ?? STATUS_CONFIG.RASCUNHO;
                      const Icon = cfg.icon;
                      return (
                        <tr key={p.id} className="border-b hover:bg-muted/20 transition-colors">
                          <td className="p-3 font-mono font-semibold text-blue-700">{p.numero}</td>
                          <td className="p-3">
                            <div className="font-medium">{p.clienteNome ?? "—"}</div>
                            {p.clienteCpfCnpj && <div className="text-xs text-muted-foreground">{formatCpfCnpj(p.clienteCpfCnpj)}</div>}
                          </td>
                          <td className="p-3 text-muted-foreground">{p.dataGeracao ? new Date(p.dataGeracao).toLocaleDateString("pt-BR") : "—"}</td>
                          <td className="p-3 text-muted-foreground">{p.validadeDias ?? 30} dias</td>
                          <td className="p-3 text-right font-semibold">{formatCurrency(p.valorTotal)}</td>
                          <td className="p-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${cfg.color}`}>
                              <Icon className="w-3 h-3" /> {cfg.label}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-center gap-1">
                              <Button variant="ghost" size="sm" title="Visualizar" onClick={() => openView(p.id)}><Eye className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="sm" title="Editar" onClick={() => openEdit(p.id)}><Edit className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="sm" title="Imprimir PDF" onClick={() => { setViewId(p.id); setTimeout(() => gerarPDF(p), 500); }}><Printer className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="sm" title="Duplicar" onClick={() => duplicarMutation.mutate({ id: p.id })}><Copy className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="sm" title="Mudar Status" onClick={() => setStatusModalId(p.id)}><ChevronDown className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="sm" title="Excluir" className="text-red-500 hover:text-red-700" onClick={() => { if (confirm("Excluir esta proposta?")) deleteMutation.mutate({ id: p.id }); }}><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de Formulário */}
      <Dialog open={modalOpen} onOpenChange={(o) => { if (!o) closeModal(); }}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5 text-blue-600" />
              {isReadOnly ? `Visualizar Proposta — ${form.numero}` : editId ? `Editar Proposta — ${form.numero}` : `Nova Proposta — ${form.numero}`}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Cabeçalho da Proposta */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div>
                <Label className="text-xs text-blue-700 font-semibold uppercase">Número</Label>
                <div className="font-mono font-bold text-blue-800 text-lg">{form.numero}</div>
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase">Data de Geração</Label>
                <Input type="date" value={form.dataGeracao} onChange={(e) => setForm((f) => ({ ...f, dataGeracao: e.target.value }))} disabled={isReadOnly} />
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase">Validade (dias)</Label>
                <Input type="number" value={form.validadeDias} onChange={(e) => setForm((f) => ({ ...f, validadeDias: e.target.value }))} disabled={isReadOnly} />
              </div>
            </div>

            {/* SEÇÃO 1: SOBRE VOCÊ */}
            <SectionCard title="SOBRE VOCÊ" subtitle="Dados do cliente para esta proposta">
              <div className="space-y-4">
                <div>
                  <Label>Buscar Cliente Cadastrado</Label>
                  <Select value={form.clienteId} onValueChange={handleClienteSelect} disabled={isReadOnly}>
                    <SelectTrigger><SelectValue placeholder="Selecionar cliente existente..." /></SelectTrigger>
                    <SelectContent>
                      {(clientes as any[]).map((c: any) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.nome} {c.cpfCnpj ? `— ${c.cpfCnpj}` : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nome / Razão Social *</Label>
                    <Input value={form.clienteNome} onChange={(e) => setForm((f) => ({ ...f, clienteNome: e.target.value }))} disabled={isReadOnly} />
                  </div>
                  <div>
                    <Label>CPF / CNPJ</Label>
                    <Input
                      value={form.clienteCpfCnpj}
                      onChange={(e) => setForm((f) => ({ ...f, clienteCpfCnpj: e.target.value }))}
                      placeholder="000.000.000-00 ou 00.000.000/0000-00"
                      disabled={isReadOnly}
                    />
                    {form.clienteCpfCnpj && <p className="text-xs text-muted-foreground mt-1">{formatCpfCnpj(form.clienteCpfCnpj)}</p>}
                  </div>
                  <div>
                    <Label>Responsável / Contato</Label>
                    <Input value={form.clienteResponsavel} onChange={(e) => setForm((f) => ({ ...f, clienteResponsavel: e.target.value }))} disabled={isReadOnly} />
                  </div>
                  <div>
                    <Label>Telefone</Label>
                    <Input value={form.clienteTelefone} onChange={(e) => setForm((f) => ({ ...f, clienteTelefone: e.target.value }))} disabled={isReadOnly} />
                  </div>
                  <div>
                    <Label>E-mail</Label>
                    <Input type="email" value={form.clienteEmail} onChange={(e) => setForm((f) => ({ ...f, clienteEmail: e.target.value }))} disabled={isReadOnly} />
                  </div>
                  <div>
                    <Label>CEP</Label>
                    <Input value={form.clienteCep} onChange={(e) => setForm((f) => ({ ...f, clienteCep: e.target.value }))} disabled={isReadOnly} />
                  </div>
                  <div className="col-span-2">
                    <Label>Endereço Completo</Label>
                    <Input value={form.clienteEndereco} onChange={(e) => setForm((f) => ({ ...f, clienteEndereco: e.target.value }))} disabled={isReadOnly} />
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* SEÇÃO 2: SOBRE NÓS */}
            <SectionCard title="SOBRE NÓS" subtitle="Apresentação da Atom Tech">
              <Textarea
                value={form.sobreNosTexto}
                onChange={(e) => setForm((f) => ({ ...f, sobreNosTexto: e.target.value }))}
                rows={6}
                disabled={isReadOnly}
                className="font-sans text-sm"
              />
            </SectionCard>

            {/* SEÇÃO 3: O QUE PROPOMOS ENTREGAR */}
            <SectionCard title="O QUE PROPOMOS ENTREGAR" subtitle="Itens numerados do escopo de fornecimento">
              <div className="space-y-2">
                {escopos.map((e, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <span className="mt-2 text-sm font-bold text-blue-700 w-6 shrink-0">{i + 1}.</span>
                    <Textarea
                      value={e.descricao}
                      onChange={(ev) => setEscopos((prev) => prev.map((x, j) => j === i ? { ...x, descricao: ev.target.value } : x))}
                      rows={2}
                      disabled={isReadOnly}
                      className="flex-1"
                    />
                    {!isReadOnly && (
                      <Button variant="ghost" size="sm" onClick={() => setEscopos((prev) => prev.filter((_, j) => j !== i))} className="text-red-500 mt-1">
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {!isReadOnly && (
                  <Button variant="outline" size="sm" onClick={() => setEscopos((prev) => [...prev, { descricao: "", ordem: prev.length + 1 }])}>
                    <Plus className="w-4 h-4 mr-1" /> Adicionar Item de Escopo
                  </Button>
                )}
              </div>
            </SectionCard>

            {/* SEÇÃO 4: ITENS E VALORES */}
            <SectionCard title="ITENS E VALORES" subtitle="Quantitativos, valores unitários e subtotais">
              <div className="space-y-3">
                {itens.map((item, i) => (
                  <div key={i} className="border rounded-lg p-3 space-y-2 bg-muted/20">
                    <div className="flex gap-2 items-center">
                      <span className="text-xs font-bold text-blue-700 w-5">{i + 1}</span>
                      <Select value={item.tipo} onValueChange={(v) => setItens((prev) => prev.map((x, j) => j === i ? { ...x, tipo: v as any } : x))} disabled={isReadOnly}>
                        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SERVICO"><span className="flex items-center gap-1"><Wrench className="w-3 h-3" /> Serviço</span></SelectItem>
                          <SelectItem value="MATERIAL"><span className="flex items-center gap-1"><Package className="w-3 h-3" /> Material</span></SelectItem>
                          <SelectItem value="OUTRO">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                      {item.tipo === "MATERIAL" && !isReadOnly && (
                        <Select value={item.materialId ? String(item.materialId) : ""} onValueChange={(v) => handleMaterialSelect(i, v)}>
                          <SelectTrigger className="flex-1"><SelectValue placeholder="Buscar material do catálogo..." /></SelectTrigger>
                          <SelectContent>
                            {(materiais as any[]).map((m: any) => (
                              <SelectItem key={m.id} value={String(m.id)}>{m.codigo} — {m.nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {item.tipo === "SERVICO" && !isReadOnly && (
                        <Select value={item.tipoServicoId ? String(item.tipoServicoId) : ""} onValueChange={(v) => handleServicoSelect(i, v)}>
                          <SelectTrigger className="flex-1"><SelectValue placeholder="Buscar serviço do catálogo..." /></SelectTrigger>
                          <SelectContent>
                            {(tiposServico as any[]).map((s: any) => (
                              <SelectItem key={s.id} value={String(s.id)}>{s.codigo} — {s.nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {!isReadOnly && (
                        <Button variant="ghost" size="sm" onClick={() => setItens((prev) => prev.filter((_, j) => j !== i))} className="text-red-500 shrink-0">
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      <div className="col-span-2">
                        <Label className="text-xs">Descrição</Label>
                        <Input value={item.descricao} onChange={(e) => setItens((prev) => prev.map((x, j) => j === i ? { ...x, descricao: e.target.value } : x))} disabled={isReadOnly} />
                      </div>
                      <div>
                        <Label className="text-xs">Unidade</Label>
                        <Input value={item.unidade} onChange={(e) => setItens((prev) => prev.map((x, j) => j === i ? { ...x, unidade: e.target.value } : x))} disabled={isReadOnly} />
                      </div>
                      <div>
                        <Label className="text-xs">Quantidade</Label>
                        <Input type="number" value={item.quantidade} onChange={(e) => {
                          const q = e.target.value;
                          setItens((prev) => prev.map((x, j) => j === i ? { ...x, quantidade: q, valorSubtotal: calcSubtotal(q, x.valorUnitario) } : x));
                        }} disabled={isReadOnly} />
                      </div>
                      <div>
                        <Label className="text-xs">Valor Unitário (R$)</Label>
                        <Input type="number" value={item.valorUnitario} onChange={(e) => {
                          const vu = e.target.value;
                          setItens((prev) => prev.map((x, j) => j === i ? { ...x, valorUnitario: vu, valorSubtotal: calcSubtotal(x.quantidade, vu) } : x));
                        }} disabled={isReadOnly} />
                      </div>
                    </div>
                    <div className="text-right text-sm font-semibold text-blue-700">
                      Subtotal: {formatCurrency(item.valorSubtotal)}
                    </div>
                  </div>
                ))}
                {!isReadOnly && (
                  <Button variant="outline" size="sm" onClick={() => setItens((prev) => [...prev, { tipo: "SERVICO", descricao: "", unidade: "un", quantidade: "1", valorUnitario: "0", valorSubtotal: "0", ordem: prev.length + 1 }])}>
                    <Plus className="w-4 h-4 mr-1" /> Adicionar Item
                  </Button>
                )}

                {/* Totais */}
                <div className="mt-4 border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">{formatCurrency(subtotal)}</span>
                  </div>
                  {!isReadOnly && (
                    <div className="flex gap-4 items-center">
                      <div className="flex-1">
                        <Label className="text-xs">Desconto (%)</Label>
                        <Input type="number" value={form.descontoPercentual} onChange={(e) => setForm((f) => ({ ...f, descontoPercentual: e.target.value, descontoValor: "0" }))} disabled={isReadOnly} />
                      </div>
                      <div className="text-muted-foreground text-sm self-end pb-2">ou</div>
                      <div className="flex-1">
                        <Label className="text-xs">Desconto (R$)</Label>
                        <Input type="number" value={form.descontoValor} onChange={(e) => setForm((f) => ({ ...f, descontoValor: e.target.value, descontoPercentual: "0" }))} disabled={isReadOnly} />
                      </div>
                    </div>
                  )}
                  {descontoFinal > 0 && (
                    <div className="flex justify-between text-sm text-red-600">
                      <span>Desconto</span>
                      <span>- {formatCurrency(descontoFinal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold text-blue-700 border-t pt-2">
                    <span>TOTAL</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* SEÇÃO 5: CONDIÇÕES DE PAGAMENTO */}
            <SectionCard title="CONDIÇÕES DE PAGAMENTO" subtitle="Selecione até 4 formas de pagamento">
              <div className="space-y-2">
                {pagamentosOpcoes.map((pg, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <span className="text-sm font-bold text-blue-700 w-16 shrink-0">Opção {i + 1}:</span>
                    <Select
                      value={pg.formaPagamentoId ? String(pg.formaPagamentoId) : "custom"}
                      onValueChange={(v) => {
                        if (v === "custom") {
                          setPagamentosOpcoes((prev) => prev.map((x, j) => j === i ? { ...x, formaPagamentoId: null } : x));
                        } else {
                          const forma = (formasPagamento as any[]).find((f: any) => String(f.id) === v);
                          setPagamentosOpcoes((prev) => prev.map((x, j) => j === i ? { ...x, formaPagamentoId: parseInt(v), textoCustomizado: forma?.descricao ?? null } : x));
                        }
                      }}
                      disabled={isReadOnly}
                    >
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Selecionar forma de pagamento..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="custom">Digitar manualmente...</SelectItem>
                        {(formasPagamento as any[]).map((f: any) => (
                          <SelectItem key={f.id} value={String(f.id)}>{f.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!pg.formaPagamentoId && (
                      <Input
                        placeholder="Descrever forma de pagamento..."
                        value={pg.textoCustomizado ?? ""}
                        onChange={(e) => setPagamentosOpcoes((prev) => prev.map((x, j) => j === i ? { ...x, textoCustomizado: e.target.value } : x))}
                        disabled={isReadOnly}
                        className="flex-1"
                      />
                    )}
                    {!isReadOnly && (
                      <Button variant="ghost" size="sm" onClick={() => setPagamentosOpcoes((prev) => prev.filter((_, j) => j !== i))} className="text-red-500">
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {!isReadOnly && pagamentosOpcoes.length < 4 && (
                  <Button variant="outline" size="sm" onClick={() => setPagamentosOpcoes((prev) => [...prev, { formaPagamentoId: null, textoCustomizado: null, ordem: prev.length + 1 }])}>
                    <Plus className="w-4 h-4 mr-1" /> Adicionar Opção de Pagamento
                  </Button>
                )}
              </div>
            </SectionCard>

            {/* SEÇÃO 6: PRAZO DE EXECUÇÃO */}
            <SectionCard title="PRAZO DE EXECUÇÃO" subtitle="Quando os serviços/fornecimentos serão realizados">
              <div className="space-y-3">
                <div>
                  <Label>Selecionar Prazo Pré-cadastrado</Label>
                  <Select value={form.prazoPadraoId} onValueChange={handlePrazoSelect} disabled={isReadOnly}>
                    <SelectTrigger><SelectValue placeholder="Selecionar prazo..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom_prazo">Digitar manualmente...</SelectItem>
                      {(prazos as any[]).map((p: any) => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.nome} {p.diasPrazo ? `(${p.diasPrazo} dias)` : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Descrição do Prazo</Label>
                  <Textarea
                    value={form.prazoPadraoTexto}
                    onChange={(e) => setForm((f) => ({ ...f, prazoPadraoTexto: e.target.value }))}
                    rows={3}
                    disabled={isReadOnly}
                    placeholder="Descreva o prazo de execução..."
                  />
                </div>
              </div>
            </SectionCard>

            {/* SEÇÃO 7: INFORMAÇÕES IMPORTANTES */}
            <SectionCard title="⚠ LEIA COM ATENÇÃO — INFORMAÇÕES IMPORTANTES" subtitle="Cláusulas e informações relevantes para o cliente">
              <div className="space-y-3">
                {/* Adicionar cláusula padrão */}
                {!isReadOnly && (
                  <div>
                    <Label>Adicionar Cláusula Padrão</Label>
                    <Select
                      value=""
                      onValueChange={(v) => {
                        const info = (infosPadrao as any[]).find((i: any) => String(i.id) === v);
                        if (info) {
                          setInfoImportantes((prev) => [...prev, { infoImportanteId: info.id, titulo: info.titulo, conteudo: info.conteudo, exclusiva: false, ordem: prev.length + 1 }]);
                        }
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecionar cláusula pré-cadastrada..." /></SelectTrigger>
                      <SelectContent>
                        {(infosPadrao as any[]).map((i: any) => (
                          <SelectItem key={i.id} value={String(i.id)}>{i.titulo}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Lista de informações */}
                {infoImportantes.map((info, i) => (
                  <div key={i} className="border rounded-lg p-3 space-y-2 bg-amber-50/50">
                    <div className="flex gap-2 items-center">
                      <Input
                        value={info.titulo}
                        onChange={(e) => setInfoImportantes((prev) => prev.map((x, j) => j === i ? { ...x, titulo: e.target.value } : x))}
                        placeholder="Título da cláusula"
                        disabled={isReadOnly}
                        className="font-semibold"
                      />
                      {info.exclusiva && <Badge variant="outline" className="text-xs shrink-0">Exclusiva</Badge>}
                      {!isReadOnly && (
                        <Button variant="ghost" size="sm" onClick={() => setInfoImportantes((prev) => prev.filter((_, j) => j !== i))} className="text-red-500 shrink-0">
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <Textarea
                      value={info.conteudo}
                      onChange={(e) => setInfoImportantes((prev) => prev.map((x, j) => j === i ? { ...x, conteudo: e.target.value } : x))}
                      rows={3}
                      disabled={isReadOnly}
                    />
                  </div>
                ))}

                {!isReadOnly && (
                  <Button variant="outline" size="sm" onClick={() => setInfoImportantes((prev) => [...prev, { titulo: "", conteudo: "", exclusiva: true, ordem: prev.length + 1 }])}>
                    <Plus className="w-4 h-4 mr-1" /> Adicionar Cláusula Exclusiva
                  </Button>
                )}
              </div>
            </SectionCard>

            {/* SEÇÃO 8: ASSINATURA */}
            <SectionCard title="ASSINATURA DE APROVAÇÃO" subtitle="Campo para aprovação formal do cliente">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nome do Signatário</Label>
                  <Input
                    value={form.observacoes}
                    onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                    placeholder="Nome completo do responsável pela aprovação"
                    disabled={isReadOnly}
                  />
                </div>
                <div>
                  <Label>Observações Gerais</Label>
                  <Input
                    value={form.observacoes}
                    onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                    placeholder="Observações adicionais..."
                    disabled={isReadOnly}
                  />
                </div>
              </div>
              <div className="mt-4 p-4 border-2 border-dashed border-gray-200 rounded-lg text-center text-muted-foreground text-sm">
                <div className="w-48 border-b border-gray-400 mx-auto mb-2 h-8"></div>
                <p>Assinatura do Cliente</p>
                <p className="text-xs mt-1">Data: ____/____/________</p>
              </div>
            </SectionCard>
          </div>

          {/* Botões do Modal */}
          <div className="flex justify-between pt-4 border-t">
            <div className="flex gap-2">
              {(editId || viewId) && (
                <Button variant="outline" onClick={() => gerarPDF(propostaDetalhes)} className="gap-2">
                  <Printer className="w-4 h-4" /> Gerar PDF
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={closeModal}>Fechar</Button>
              {!isReadOnly && (
                <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} className="gap-2">
                  {(createMutation.isPending || updateMutation.isPending) ? "Salvando..." : editId ? "Salvar Alterações" : "Criar Proposta"}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Mudança de Status */}
      {statusModalId && (
        <Dialog open={!!statusModalId} onOpenChange={() => setStatusModalId(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Alterar Status da Proposta</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-2 py-4">
              {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
                const Icon = cfg.icon;
                return (
                  <Button
                    key={status}
                    variant="outline"
                    className={`justify-start gap-2 ${cfg.color}`}
                    onClick={() => mudarStatusMutation.mutate({ id: statusModalId, status: status as StatusProposta })}
                  >
                    <Icon className="w-4 h-4" /> {cfg.label}
                  </Button>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </DashboardLayout>
  );
}

// ─── Componente auxiliar SectionCard ─────────────────────────────────────────

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <Card className="border-l-4 border-l-blue-600">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold uppercase tracking-wide text-blue-700">{title}</CardTitle>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
