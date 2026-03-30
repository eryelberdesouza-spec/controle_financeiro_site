import DashboardLayout from "@/components/DashboardLayout";
import { TabelaParcelas, gerarParcelas, type ParcelaLocal } from "@/components/TabelaParcelas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import AnexosPanel from "@/components/AnexosPanel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Plus, Pencil, Trash2, Search, Download, ChevronDown, ChevronUp, Layers, Printer, Building2, CheckSquare } from "lucide-react";
import MaskedInput from "@/components/MaskedInput";
import { ComprovanteViewer, type ComprovantePagamento } from "@/components/ComprovanteViewer";
import { ClienteSelect, CentroCustoSelect } from "@/components/ClienteCentroCustoSelect";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

const BANCOS = [
  "Banco do Brasil", "Bradesco", "Caixa Econômica Federal", "Itaú", "Santander",
  "Nubank", "Inter", "Sicoob", "Sicredi", "BTG Pactual", "C6 Bank", "PicPay",
  "Mercado Pago", "PagBank", "Neon", "Original", "Safra", "BRB", "Banrisul", "Outro",
];

const STATUS_COLORS: Record<string, string> = {
  Pendente: "bg-yellow-100 text-yellow-800",
  Processando: "bg-blue-100 text-blue-800",
  Pago: "bg-green-100 text-green-800",
  Cancelado: "bg-gray-100 text-gray-600",
};

function formatCurrency(value: any) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(parseFloat(value ?? 0));
}
function formatDate(date: Date | string | null | undefined) {
  if (!date) return "-";
  // Extrai YYYY-MM-DD sem conversão de fuso horário (evita recuo de 1 dia em GMT-3)
  const iso = date instanceof Date ? date.toISOString() : String(date);
  const parts = iso.substring(0, 10).split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return new Date(date).toLocaleDateString("pt-BR");
}

type FormData = {
  numeroControle: string;
  nomeCompleto: string;
  cpf: string;
  banco: string;
  tipoPix: "CPF" | "CNPJ" | "Email" | "Telefone" | "Chave Aleatória";
  chavePix: string;
  tipoServico: string;
  centroCusto: string;
  clienteId: number | null;
  centroCustoId: number | null;
  contratoId: number | null;
  projetoId: number;
  categoriaCusto: string;
  valor: string;
  valorEquipamento: string;
  valorServico: string;
  dataPagamento: string;
  status: "Pendente" | "Processando" | "Pago" | "Cancelado";
  descricao: string;
  observacao: string;
  autorizadoPor: string;
  parcelado: boolean;
  quantidadeParcelas: number;
  dataPrimeiroVencimento: string;
};

const defaultForm: FormData = {
  numeroControle: "", nomeCompleto: "", cpf: "", banco: "", tipoPix: "CPF",
  chavePix: "", tipoServico: "", centroCusto: "", clienteId: null, centroCustoId: null, contratoId: null, projetoId: 0, categoriaCusto: "", valor: "",
  valorEquipamento: "", valorServico: "",
  dataPagamento: "", status: "Pendente", descricao: "", observacao: "", autorizadoPor: "",
  parcelado: false, quantidadeParcelas: 2, dataPrimeiroVencimento: "",
};

function exportToCSV(data: any[]) {
  const headers = ["Nº Controle", "Nome", "CPF", "Banco", "Tipo Pix", "Chave Pix", "Tipo Serviço", "Centro de Custo", "Valor", "Data Pagamento", "Status", "Parcelado", "Qtd Parcelas", "Autorizado Por", "Descrição", "Observação"];
  const rows = data.map(p => [
    p.numeroControle ?? "", p.nomeCompleto, p.cpf ?? "", p.banco ?? "",
    p.tipoPix ?? "", p.chavePix ?? "", p.tipoServico ?? "", p.centroCusto ?? "",
    parseFloat(p.valor ?? 0).toFixed(2).replace(".", ","),
    formatDate(p.dataPagamento), p.status,
    p.parcelado ? "Sim" : "Não", p.quantidadeParcelas ?? 1,
    p.autorizadoPor ?? "", (p.descricao ?? "").replace(/\n/g, " "), (p.observacao ?? "").replace(/\n/g, " "),
  ]);
  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `pagamentos_${new Date().toISOString().split("T")[0]}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

function ParcelasRow({ pagamentoId }: { pagamentoId: number }) {
  const { data: parcelas = [] } = trpc.pagamentoParcelas.list.useQuery({ pagamentoId });
  const utils = trpc.useUtils();
  const updateMutation = trpc.pagamentoParcelas.update.useMutation({
    onSuccess: () => { utils.pagamentoParcelas.list.invalidate(); toast.success("Parcela atualizada!"); },
    onError: (e) => toast.error(e.message),
  });

  if (parcelas.length === 0) return <p className="text-sm text-muted-foreground py-2">Nenhuma parcela cadastrada.</p>;

  const localParcelas: ParcelaLocal[] = parcelas.map(p => ({
    id: p.id,
    numeroParcela: p.numeroParcela,
    valor: String(p.valor),
    dataVencimento: p.dataVencimento ? new Date(p.dataVencimento).toISOString().split("T")[0] : "",
    dataPagamento: p.dataPagamento ? new Date(p.dataPagamento).toISOString().split("T")[0] : undefined,
    status: p.status,
    observacao: p.observacao ?? "",
  }));

  /**
   * Valida e extrai YYYY-MM-DD de qualquer formato.
   * Retorna undefined se a data for inválida, incompleta ou o ano tiver menos de 4 dígitos.
   */
  const toValidDateOnly = (val: string | undefined | null): string | undefined => {
    if (!val) return undefined;
    const raw = val.length > 10 ? val.substring(0, 10) : val;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return undefined;
    const year = parseInt(raw.substring(0, 4), 10);
    if (year < 1900 || year > 2100) return undefined;
    const d = new Date(raw + "T12:00:00");
    if (isNaN(d.getTime())) return undefined;
    return raw;
  };

  const handleChange = (updated: ParcelaLocal[]) => {
    updated.forEach((p, i) => {
      const original = localParcelas[i];
      if (!p.id) return;
      const changed =
        p.valor !== original.valor ||
        p.dataVencimento !== original.dataVencimento ||
        p.dataPagamento !== original.dataPagamento ||
        p.status !== original.status ||
        p.observacao !== original.observacao;
      if (!changed) return;

      const dateVenc = toValidDateOnly(p.dataVencimento);
      const datePag = toValidDateOnly(p.dataPagamento);

      // Não envia se a data de vencimento ainda está incompleta
      if (!dateVenc) return;
      // Não envia enquanto o usuário está digitando a data de pagamento
      if (p.dataPagamento && !datePag) return;

      updateMutation.mutate({
        id: p.id,
        data: {
          valor: p.valor,
          dataVencimento: new Date(dateVenc + "T12:00:00"),
          dataPagamento: datePag ? new Date(datePag + "T12:00:00") : undefined,
          status: p.status as any,
          observacao: p.observacao,
        },
      });
    });
  };

  return (
    <TabelaParcelas
      tipo="pagamento"
      parcelas={localParcelas}
      onChange={handleChange}
    />
  );
}

export default function Pagamentos() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { can } = usePermissions();
  const podeCriar = can.criar("pagamentos");
  const podeEditar = can.editar("pagamentos");
  const podeExcluir = can.excluir("pagamentos");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(defaultForm);
  // Estado separado para tipo de despesa (não inferir pelo projetoId=0 que é ambiguo)
  const [tipoDespesa, setTipoDespesa] = useState<"projeto" | "administrativo">("administrativo");
  const [parcelas, setParcelas] = useState<ParcelaLocal[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [filterCC, setFilterCC] = useState<string>("todos");
  const [filterDataInicio, setFilterDataInicio] = useState<string>("");
  const [filterDataFim, setFilterDataFim] = useState<string>("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [comprovanteOpen, setComprovanteOpen] = useState(false);
  const [comprovanteRegistros, setComprovanteRegistros] = useState<ComprovantePagamento[]>([]);
  const [atribuirCCOpen, setAtribuirCCOpen] = useState(false);
  const [atribuirCCId, setAtribuirCCId] = useState<number | null>(null);
  const utils = trpc.useUtils();
  const { data: listaContratos = [] } = trpc.contratos.list.useQuery();
  const { data: listaProjetos = [] } = trpc.projetos.list.useQuery();
  const [location, setLocation] = useLocation();

  // Abre formulário automaticamente quando navegar com ?novo=1
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("novo") === "1" && podeCriar) {
      setEditId(null);
      setForm({ ...defaultForm });
      setParcelas([]);
      setTipoDespesa("administrativo");
      setOpen(true);
      // Remove o parâmetro da URL sem recarregar a página
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const handleImprimirUnico = (p: any) => {
    setComprovanteRegistros([{
      id: p.id,
      numeroControle: p.numeroControle,
      nomeCompleto: p.nomeCompleto,
      cpf: p.cpf,
      banco: p.banco,
      chavePix: p.chavePix,
      tipoChavePix: p.tipoPix,
      tipoServico: p.tipoServico,
      centroCusto: p.centroCusto,
      valor: p.valor,
      dataPagamento: p.dataPagamento,
      status: p.status,
      descricao: p.descricao,
      observacao: p.observacao,
      autorizadoPor: p.autorizadoPor,
      parcelado: p.parcelado,
      quantidadeParcelas: p.quantidadeParcelas,
    }]);
    setComprovanteOpen(true);
  };

  const handleImprimirLote = () => {
    const registros = filtered
      .filter(p => selecionados.has(p.id))
      .map(p => ({
        id: p.id,
        numeroControle: p.numeroControle,
        nomeCompleto: p.nomeCompleto,
        cpf: p.cpf,
        banco: p.banco,
        chavePix: p.chavePix,
        tipoChavePix: p.tipoPix,
        tipoServico: p.tipoServico,
        centroCusto: p.centroCusto,
        valor: p.valor,
        dataPagamento: p.dataPagamento,
        status: p.status,
        descricao: p.descricao,
        observacao: p.observacao,
        autorizadoPor: p.autorizadoPor,
        parcelado: p.parcelado,
        quantidadeParcelas: p.quantidadeParcelas,
      }));
    if (registros.length === 0) { toast.error("Selecione ao menos um pagamento."); return; }
    setComprovanteRegistros(registros);
    setComprovanteOpen(true);
  };

  const toggleSelecionado = (id: number) => {
    setSelecionados(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleTodos = () => {
    if (selecionados.size === filtered.length) {
      setSelecionados(new Set());
    } else {
      setSelecionados(new Set(filtered.map(p => p.id)));
    }
  };

  const { data: pagamentos = [], isLoading } = trpc.pagamentos.list.useQuery();
  const { data: nextNumeroControle } = trpc.pagamentos.nextNumeroControle.useQuery(undefined, {
    // Sempre busca o mais recente (staleTime: 0 garante refetch ao reabrir)
    staleTime: 0,
    refetchOnMount: true,
  });

  // Atualiza o número de controle automaticamente quando o valor chega do servidor
  // Isso corrige o problema de aparecer em branco na primeira abertura do modal
  useEffect(() => {
    if (!editId && open && nextNumeroControle) {
      setForm(prev => ({
        ...prev,
        numeroControle: prev.numeroControle || nextNumeroControle,
      }));
    }
  }, [nextNumeroControle, open, editId]);

  // Carrega parcelas existentes ao abrir edição de pagamento parcelado
  const { data: parcelasExistentes, isLoading: parcelasLoading, isFetching: parcelasFetching } = trpc.pagamentoParcelas.list.useQuery(
    { pagamentoId: editId! },
    { enabled: !!editId && open, staleTime: 0 }
  );

  // Indica se as parcelas do registro em edição ainda estão sendo carregadas
  const parcelasCarregando = !!editId && open && (parcelasLoading || parcelasFetching) && parcelas.length === 0;

  // Popula o estado local de parcelas quando os dados chegam do banco (modo edição)
  useEffect(() => {
    if (editId && parcelasExistentes && parcelasExistentes.length > 0 && parcelas.length === 0) {
      const loaded: ParcelaLocal[] = parcelasExistentes.map(p => ({
        id: p.id,
        numeroParcela: p.numeroParcela,
        valor: String(p.valor),
        dataVencimento: p.dataVencimento ? new Date(p.dataVencimento).toISOString().split("T")[0] : "",
        dataPagamento: p.dataPagamento ? new Date(p.dataPagamento).toISOString().split("T")[0] : undefined,
        status: p.status,
        observacao: p.observacao ?? "",
      }));
      setParcelas(loaded);
    }
  }, [parcelasExistentes, editId, open]);

  const createParcelasMutation = trpc.pagamentoParcelas.createBulk.useMutation();
  const deleteParcelasMutation = trpc.pagamentoParcelas.deleteBulk.useMutation();

  // Invalida todos os caches relevantes após operações de pagamento
  const invalidateAll = () => {
    utils.pagamentos.list.invalidate();
    utils.dashboard.stats.invalidate();
    utils.dashboard.vencimentosProximos.invalidate();
    utils.dashboard.historicoMensal.invalidate();
    utils.pagamentoParcelas.list.invalidate();
  };

  const createMutation = trpc.pagamentos.create.useMutation({
    onSuccess: async (data: any) => {
      if (form.parcelado && parcelas.length > 0) {
        const id = data?.insertId ?? data?.id;
        if (id) {
          await createParcelasMutation.mutateAsync({
            pagamentoId: id,
            parcelas: parcelas.map(p => ({
              ...p,
              dataVencimento: new Date(p.dataVencimento + "T12:00:00"),
              dataPagamento: p.dataPagamento ? new Date(p.dataPagamento + "T12:00:00") : undefined,
              status: p.status as any,
            })),
          });
        }
      }
      invalidateAll();
      toast.success("Pagamento cadastrado!");
      setOpen(false);
      setForm(defaultForm);
      setParcelas([]);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.pagamentos.update.useMutation({
    onSuccess: async () => {
      // Em edição: se o usuário regenerou as parcelas (parcelas.length > 0 com IDs novos),
      // apaga as antigas e recria. Se não regenerou, mantém as parcelas existentes intactas.
      if (editId && form.parcelado && parcelas.length > 0) {
        const temParcelasNovas = parcelas.some(p => !p.id);
        if (temParcelasNovas) {
          await deleteParcelasMutation.mutateAsync({ pagamentoId: editId });
          await createParcelasMutation.mutateAsync({
            pagamentoId: editId,
            parcelas: parcelas.map(p => ({
              ...p,
              dataVencimento: new Date(p.dataVencimento + "T12:00:00"),
              dataPagamento: p.dataPagamento ? new Date(p.dataPagamento + "T12:00:00") : undefined,
              status: p.status as any,
            })),
          });
        }
      }
      invalidateAll();
      toast.success("Pagamento atualizado!");
      setOpen(false);
      setEditId(null);
      setForm(defaultForm);
      setParcelas([]);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.pagamentos.delete.useMutation({
    onSuccess: () => { utils.pagamentos.list.invalidate(); utils.dashboard.stats.invalidate(); toast.success("Pagamento removido!"); },
    onError: (e) => toast.error(e.message),
  });

  const assignCCLoteMutation = trpc.pagamentos.assignCentroCustoLote.useMutation({
    onSuccess: (count) => {
      toast.success(`Centro de Custo atribuído a ${count} pagamento(s)!`);
      utils.pagamentos.list.invalidate();
      setSelecionados(new Set());
      setAtribuirCCOpen(false);
      setAtribuirCCId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleAtribuirCCLote = () => {
    if (selecionados.size === 0) { toast.error("Selecione ao menos um pagamento."); return; }
    setAtribuirCCOpen(true);
  };

  const handleGerarParcelas = () => {
    if (!form.valor || !form.dataPrimeiroVencimento || form.quantidadeParcelas < 1) {
      toast.error("Preencha o valor e a data de vencimento antes de gerar as parcelas.");
      return;
    }
    const geradas = gerarParcelas("pagamento", form.quantidadeParcelas, parseFloat(form.valor), form.dataPrimeiroVencimento);
    setParcelas(geradas);
    toast.success(`${geradas.length} parcelas geradas automaticamente!`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nomeCompleto || !form.valor) { toast.error("Preencha os campos obrigatórios"); return; }
    // Gera parcelas automaticamente se parcelado e ainda não foram geradas manualmente
    if (form.parcelado && parcelas.length === 0) {
      if (!form.dataPrimeiroVencimento) { toast.error("Informe a data do 1º vencimento para gerar as parcelas."); return; }
      const autoGeradas = gerarParcelas("pagamento", form.quantidadeParcelas, parseFloat(form.valor), form.dataPrimeiroVencimento);
      setParcelas(autoGeradas);
      // Continua o submit com as parcelas recém geradas
      const { dataPrimeiroVencimento: _d2, ...restForm2 } = form;
      const payload2 = {
        ...restForm2,
        categoriaCusto: form.categoriaCusto as any || undefined,
        dataPagamento: form.dataPagamento ? new Date(form.dataPagamento + "T12:00:00") : new Date(),
        quantidadeParcelas: form.parcelado ? form.quantidadeParcelas : 1,
      };
      if (editId) updateMutation.mutate({ id: editId, ...payload2 });
      else createMutation.mutate(payload2);
      return;
    }
    const { dataPrimeiroVencimento: _d, ...restForm } = form;
    const payload = {
      ...restForm,
      // Converter 0 para null em foreign keys para evitar violação de constraint
      projetoId: restForm.projetoId && restForm.projetoId > 0 ? restForm.projetoId : null,
      clienteId: restForm.clienteId && restForm.clienteId > 0 ? restForm.clienteId : null,
      centroCustoId: restForm.centroCustoId && restForm.centroCustoId > 0 ? restForm.centroCustoId : null,
      categoriaCusto: form.categoriaCusto as any || undefined,
      dataPagamento: form.dataPagamento ? new Date(form.dataPagamento + "T12:00:00") : new Date(),
      quantidadeParcelas: form.parcelado ? form.quantidadeParcelas : 1,
    };
    if (editId) updateMutation.mutate({ id: editId, ...payload as any });
    else createMutation.mutate(payload as any);
  };

  const handleEdit = (p: any) => {
    // Limpa parcelas ANTES de definir o editId para evitar que o useEffect
    // detecte parcelas antigas do pagamento anterior
    setParcelas([]);
    setEditId(p.id);
    const projetoIdValue = p.projetoId ?? 0;
    setForm({
      numeroControle: p.numeroControle ?? "", nomeCompleto: p.nomeCompleto ?? "",
      cpf: p.cpf ?? "", banco: p.banco ?? "", tipoPix: p.tipoPix ?? "CPF",
      chavePix: p.chavePix ?? "", tipoServico: p.tipoServico ?? "",
      centroCusto: p.centroCusto ?? "", clienteId: p.clienteId ?? null, centroCustoId: p.centroCustoId ?? null, contratoId: p.contratoId ?? null, projetoId: projetoIdValue, categoriaCusto: p.categoriaCusto ?? "", valor: String(p.valor ?? ""),
      valorEquipamento: String(p.valorEquipamento ?? ""),
      valorServico: String(p.valorServico ?? ""),
      dataPagamento: p.dataPagamento ? new Date(p.dataPagamento).toISOString().split("T")[0] : "",
      status: p.status ?? "Pendente", descricao: p.descricao ?? "",
      observacao: p.observacao ?? "", autorizadoPor: p.autorizadoPor ?? "",
      parcelado: p.parcelado ?? false,
      quantidadeParcelas: p.quantidadeParcelas ?? 2,
      dataPrimeiroVencimento: "",
    });
    // Restaurar tipo de despesa com base no projetoId do registro
    setTipoDespesa(projetoIdValue > 0 ? "projeto" : "administrativo");
    setOpen(true);
  };

  // Busca lista de centros de custo para o filtro
  const { data: centrosCustoList = [] } = trpc.centrosCusto.list.useQuery();

  const filtered = pagamentos.filter(p => {
    const matchSearch = !search ||
      p.nomeCompleto.toLowerCase().includes(search.toLowerCase()) ||
      (p.cpf ?? "").includes(search) ||
      (p.numeroControle ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "todos" || p.status === filterStatus;
      const matchCC = filterCC === "todos" || 
        (filterCC === "sem_cc" ? !p.centroCustoId : String(p.centroCustoId ?? "") === filterCC);
    const matchDataInicio = !filterDataInicio || new Date(p.dataPagamento) >= new Date(filterDataInicio);
    const matchDataFim = !filterDataFim || new Date(p.dataPagamento) <= new Date(filterDataFim + "T23:59:59");
    return matchSearch && matchStatus && matchCC && matchDataInicio && matchDataFim;
  });

  const totalFiltrado = filtered.reduce((acc, p) => acc + parseFloat(String(p.valor ?? 0)), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Compras e Pagamentos</h1>
            <p className="text-muted-foreground text-sm mt-1">Controle de compras, contratações e pagamentos via Pix</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {selecionados.size > 0 && (
              <>
                <Button variant="outline" onClick={handleAtribuirCCLote} className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50">
                  <Building2 className="h-4 w-4" /> Atribuir CC ({selecionados.size})
                </Button>
                <Button variant="outline" onClick={handleImprimirLote} className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-50">
                  <Printer className="h-4 w-4" /> Imprimir Selecionados ({selecionados.size})
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => exportToCSV(filtered)} className="gap-2">
              <Download className="h-4 w-4" /> Exportar CSV
            </Button>
            {podeCriar && (
              <Button onClick={() => { setEditId(null); setForm({ ...defaultForm, numeroControle: nextNumeroControle ?? "" }); setParcelas([]); setOpen(true); }} className="gap-2" title="O número de controle será preenchido automaticamente">
                <Plus className="h-4 w-4" /> Novo Pagamento
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome, CPF ou nº controle..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="Pendente">Pendente</SelectItem>
              <SelectItem value="Processando">Processando</SelectItem>
              <SelectItem value="Pago">Pago</SelectItem>
              <SelectItem value="Cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCC} onValueChange={setFilterCC}>
            <SelectTrigger className="w-[190px]"><SelectValue placeholder="Centro de Custo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os CC</SelectItem>
              <SelectItem value="sem_cc">Sem Centro de Custo</SelectItem>
              {centrosCustoList.map(cc => (
                <SelectItem key={cc.id} value={String(cc.id)}>{cc.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={filterDataInicio}
            onChange={e => setFilterDataInicio(e.target.value)}
            className="w-[150px]"
            title="Data inicial"
            placeholder="Data inicial"
          />
          <Input
            type="date"
            value={filterDataFim}
            onChange={e => setFilterDataFim(e.target.value)}
            className="w-[150px]"
            title="Data final"
            placeholder="Data final"
          />
          {(filterCC !== "todos" || filterDataInicio || filterDataFim) && (
            <Button variant="ghost" size="sm" onClick={() => { setFilterCC("todos"); setFilterDataInicio(""); setFilterDataFim(""); }} className="text-muted-foreground">
              Limpar filtros
            </Button>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{filtered.length} registro(s)</span>
          <span>|</span>
          <span>Total: <strong className="text-foreground">{formatCurrency(totalFiltrado)}</strong></span>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <p className="p-6 text-muted-foreground text-sm">Carregando...</p>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-muted-foreground">Nenhum pagamento encontrado.</p>
                <Button variant="outline" className="mt-4" onClick={() => { setEditId(null); setForm({ ...defaultForm, numeroControle: nextNumeroControle ?? "" }); setParcelas([]); setOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" /> Cadastrar primeiro pagamento
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-3 w-10">
                        <input type="checkbox" className="rounded" checked={selecionados.size === filtered.length && filtered.length > 0} onChange={toggleTodos} title="Selecionar todos" />
                      </th>
                      <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Nº Controle</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Nome</th>
                      <th className="text-left p-3 font-medium text-muted-foreground hidden xl:table-cell">Cliente</th>
                      <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Banco</th>
                      <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Serviço</th>
                      <th className="text-left p-3 font-medium text-muted-foreground hidden xl:table-cell">Centro de Custo</th>
                      <th className="text-left p-3 font-medium text-muted-foreground hidden 2xl:table-cell">Categoria</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Valor</th>
                      <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Data</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => (
                      <>
                        <tr key={p.id} className={`border-b hover:bg-muted/30 transition-colors ${selecionados.has(p.id) ? 'bg-blue-50' : ''}`}>
                          <td className="p-3 w-10">
                            <input type="checkbox" className="rounded" checked={selecionados.has(p.id)} onChange={() => toggleSelecionado(p.id)} />
                          </td>
                          <td className="p-3 text-muted-foreground hidden lg:table-cell font-mono text-xs">{p.numeroControle || "-"}</td>
                          <td className="p-3 font-medium">
                            <div className="flex items-center gap-1.5">
                              {p.parcelado && (
                                <span title="Parcelado">
                                  <Layers className="h-3.5 w-3.5 text-primary shrink-0" />
                                </span>
                              )}
                              {p.nomeCompleto}
                            </div>
                            {p.parcelado && (
                              <span className="text-xs text-muted-foreground">{p.quantidadeParcelas}x parcelas</span>
                            )}
                          </td>
                          <td className="p-3 text-muted-foreground hidden xl:table-cell">
                            {p.clienteNome ? (
                              <span className="inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                                {p.clienteNome}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/50">—</span>
                            )}
                          </td>
                          <td className="p-3 text-muted-foreground hidden md:table-cell">{p.banco || "-"}</td>
                          <td className="p-3 text-muted-foreground hidden lg:table-cell">{p.tipoServico || "-"}</td>
                          <td className="p-3 hidden xl:table-cell">
                            {p.centroCustoNome ? (
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                <Building2 className="h-3 w-3" />
                                {p.centroCustoNome}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground/50">Sem CC</span>
                            )}
                          </td>
                          <td className="p-3 hidden 2xl:table-cell">
                            {p.categoriaCusto ? (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 border border-green-200">
                                {p.categoriaCusto === "Mao_de_Obra" ? "Mão de Obra" : p.categoriaCusto}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground/50">—</span>
                            )}
                          </td>
                          <td className="p-3 text-right font-semibold">{formatCurrency(p.valor)}</td>
                          <td className="p-3 text-muted-foreground hidden md:table-cell">{formatDate(p.dataPagamento)}</td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[p.status]}`}>{p.status}</span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex justify-end gap-1">
                              {p.parcelado && (
                                <Button variant="ghost" size="icon" className="h-8 w-8" title="Ver parcelas"
                                  onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}>
                                  {expandedId === p.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700" title="Imprimir comprovante" onClick={() => handleImprimirUnico(p)}>
                                <Printer className="h-3.5 w-3.5" />
                              </Button>
                              {podeEditar && (
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(p)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              )}
                              {podeExcluir && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => { if (confirm("Remover este pagamento?")) deleteMutation.mutate({ id: p.id }); }}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {expandedId === p.id && (
                          <tr key={`parcelas-${p.id}`} className="bg-muted/20">
                            <td colSpan={9} className="p-4">
                              <p className="text-sm font-medium text-muted-foreground mb-3">Parcelas de {p.nomeCompleto}</p>
                              <ParcelasRow pagamentoId={p.id} />
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-4xl overflow-y-auto p-0">
          <SheetHeader className="px-6 py-4 border-b bg-muted/30 sticky top-0 z-10">
            <SheetTitle>{editId ? "Editar Pagamento" : "Novo Pagamento"}</SheetTitle>
          </SheetHeader>
          <div className="px-6 py-4">
          <form onSubmit={handleSubmit} className="space-y-5 w-full min-w-0">
            {/* Busca de cliente — preenche Nome e CPF automaticamente */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-1.5">
              <Label className="text-xs font-semibold text-primary uppercase tracking-wide">Buscar Cliente Cadastrado</Label>
              <ClienteSelect
                value={form.clienteId}
                onChange={(id, cliente) => {
                  if (id && cliente) {
                    setForm(f => ({
                      ...f,
                      clienteId: id,
                      nomeCompleto: f.nomeCompleto || cliente.nome,
                      cpf: f.cpf || (cliente.cpfCnpj ?? ""),
                      // Preenche dados de Pix/Banco do cadastro do cliente
                      banco: f.banco || (cliente.banco ?? ""),
                      tipoPix: (f.tipoPix && f.tipoPix !== "CPF") ? f.tipoPix : ((cliente.tipoPix as any) ?? f.tipoPix),
                      chavePix: f.chavePix || (cliente.chavePix ?? ""),
                    }));
                  } else {
                    setForm(f => ({ ...f, clienteId: null }));
                  }
                }}
                placeholder="Buscar por nome ou CPF/CNPJ..."
              />
              <p className="text-xs text-muted-foreground">Selecione um cliente para preencher Nome, CPF, Banco e Chave Pix automaticamente</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Nº de Controle</Label>
                <Input value={form.numeroControle} onChange={e => setForm(f => ({ ...f, numeroControle: e.target.value }))} placeholder="Ex: PAG-2024-001" />
              </div>
              <div>
                <Label>Nome Completo *</Label>
                <Input value={form.nomeCompleto} onChange={e => setForm(f => ({ ...f, nomeCompleto: e.target.value }))} placeholder="Nome do beneficiário" required />
              </div>
              <div>
                <Label>CPF / CNPJ</Label>
                <Input value={form.cpf} onChange={e => setForm(f => ({ ...f, cpf: e.target.value }))} placeholder="000.000.000-00 ou 00.000.000/0000-00" />
              </div>
              <div>
                <Label>Banco</Label>
                <Select value={form.banco} onValueChange={v => setForm(f => ({ ...f, banco: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione o banco" /></SelectTrigger>
                  <SelectContent>
                    {BANCOS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo de Chave Pix</Label>
                <Select value={form.tipoPix} onValueChange={v => setForm(f => ({ ...f, tipoPix: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["CPF", "CNPJ", "Email", "Telefone", "Chave Aleatória"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Chave Pix</Label>
                <Input value={form.chavePix} onChange={e => setForm(f => ({ ...f, chavePix: e.target.value }))} placeholder="Chave Pix" />
              </div>
              <div>
                <Label>Tipo de Serviço</Label>
                <Input value={form.tipoServico} onChange={e => setForm(f => ({ ...f, tipoServico: e.target.value }))} placeholder="Ex: Consultoria, Manutenção..." />
              </div>
              <div>
                <Label>Centro de Custo</Label>
                <CentroCustoSelect
                  value={form.centroCustoId}
                  onChange={(id) => setForm(f => ({ ...f, centroCustoId: id }))}
                />
              </div>
              <div>
                <Label>Contrato Vinculado</Label>
                <Select
                  value={form.contratoId ? String(form.contratoId) : "nenhum"}
                  onValueChange={v => setForm(f => ({ ...f, contratoId: v === "nenhum" ? null : Number(v) }))}
                >
                  <SelectTrigger><SelectValue placeholder="Selecionar contrato (opcional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nenhum">Nenhum</SelectItem>
                    {listaContratos.map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.numero} — {c.objeto?.substring(0, 40) ?? ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo de Despesa</Label>
                <Select
                  value={tipoDespesa}
                  onValueChange={v => {
                    const tipo = v as "projeto" | "administrativo";
                    setTipoDespesa(tipo);
                    if (tipo === "administrativo") {
                      setForm(f => ({ ...f, projetoId: 0 }));
                    } else {
                      // Ao mudar para "projeto", limpar projetoId para forçar seleção
                      setForm(f => ({ ...f, projetoId: 0 }));
                    }
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="projeto">📁 Vinculada a Projeto</SelectItem>
                    <SelectItem value="administrativo">🏢 Despesa Administrativa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {tipoDespesa === "projeto" && (
              <div>
                <Label>Projeto Vinculado <span className="text-red-500">*</span></Label>
                <Select
                  value={form.projetoId ? String(form.projetoId) : ""}
                  onValueChange={v => setForm(f => ({ ...f, projetoId: Number(v) }))}
                >
                  <SelectTrigger className={!form.projetoId ? "border-orange-400" : ""}>
                    <SelectValue placeholder="Selecionar projeto..." />
                  </SelectTrigger>
                  <SelectContent>
                    {listaProjetos.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">Nenhum projeto encontrado</div>
                    ) : (
                      listaProjetos.map(p => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.numero ? `${p.numero} — ` : ""}{p.nome}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {!form.projetoId && (
                  <p className="text-xs text-orange-600 mt-1">Selecione o projeto vinculado a esta despesa.</p>
                )}
              </div>
              )}
              <div>
                <Label>Categoria de Custo {form.projetoId ? <span className="text-red-500">*</span> : <span className="text-muted-foreground text-xs">(recomendado)</span>}</Label>
                <Select
                  value={form.categoriaCusto || ""}
                  onValueChange={v => setForm(f => ({ ...f, categoriaCusto: v }))}
                >
                  <SelectTrigger className={form.projetoId && !form.categoriaCusto ? "border-orange-400" : ""}>
                    <SelectValue placeholder="Selecionar categoria..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Material">📦 Material</SelectItem>
                    <SelectItem value="Mao_de_Obra">👷 Mão de Obra</SelectItem>
                    <SelectItem value="Equipamentos">🔧 Equipamentos</SelectItem>
                    <SelectItem value="Terceiros">🤝 Terceiros</SelectItem>
                    <SelectItem value="Outros">📋 Outros</SelectItem>
                  </SelectContent>
                </Select>
                {form.projetoId && !form.categoriaCusto && (
                  <p className="text-xs text-orange-600 mt-1">Informe a categoria para controle de orçamento do projeto.</p>
                )}
              </div>
              <div className="md:col-span-2">
                <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
                  <p className="text-sm font-medium">Composição do Valor</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <Label>Valor Equipamento (R$)</Label>
                      <Input
                        type="number" step="0.01" min="0"
                        value={form.valorEquipamento}
                        onChange={e => {
                          const eq = parseFloat(e.target.value) || 0;
                          const sv = parseFloat(form.valorServico) || 0;
                          setForm(f => ({ ...f, valorEquipamento: e.target.value, valor: (eq + sv).toFixed(2) }));
                        }}
                        placeholder="0,00"
                      />
                    </div>
                    <div>
                      <Label>Valor Serviços (R$)</Label>
                      <Input
                        type="number" step="0.01" min="0"
                        value={form.valorServico}
                        onChange={e => {
                          const sv = parseFloat(e.target.value) || 0;
                          const eq = parseFloat(form.valorEquipamento) || 0;
                          setForm(f => ({ ...f, valorServico: e.target.value, valor: (eq + sv).toFixed(2) }));
                        }}
                        placeholder="0,00"
                      />
                    </div>
                    <div>
                      <Label>Valor Total (R$) *</Label>
                      <Input
                        type="number" step="0.01" min="0"
                        value={form.valor}
                        onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
                        placeholder="0,00"
                        required
                        className="font-semibold"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Calculado automaticamente ou edite manualmente</p>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <Label>Data de Pagamento</Label>
                <Input type="date" value={form.dataPagamento} onChange={e => setForm(f => ({ ...f, dataPagamento: e.target.value }))} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Pendente", "Processando", "Pago", "Cancelado"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Autorizado Por</Label>
                <Input value={form.autorizadoPor} onChange={e => setForm(f => ({ ...f, autorizadoPor: e.target.value }))} placeholder="Nome do autorizador" />
              </div>
              <div className="md:col-span-2">
                <Label>Descrição</Label>
                <Textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descrição do pagamento" rows={2} />
              </div>
              <div className="md:col-span-2">
                <Label>Observação</Label>
                <Textarea value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} placeholder="Observações adicionais" rows={2} />
              </div>
            </div>

            <Separator />

            {/* Seção de Parcelamento */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">Pagamento Parcelado</p>
                  <p className="text-xs text-muted-foreground">Defina a quantidade de parcelas e gere automaticamente com datas e valores individuais</p>
                </div>
                <Switch
                  checked={form.parcelado}
                  onCheckedChange={v => {
                    setForm(f => ({
                      ...f,
                      parcelado: v,
                      quantidadeParcelas: v ? (f.quantidadeParcelas < 2 ? 2 : f.quantidadeParcelas) : 1,
                      // Pré-preenche a data do 1º vencimento com a data de pagamento existente
                      dataPrimeiroVencimento: v && !f.dataPrimeiroVencimento ? f.dataPagamento : f.dataPrimeiroVencimento,
                    }));
                    if (!v) setParcelas([]);
                  }}
                />
              </div>

              {form.parcelado && (
                <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label>Nº de Parcelas</Label>
                      <Select
                        value={String(form.quantidadeParcelas)}
                        onValueChange={v => setForm(f => ({ ...f, quantidadeParcelas: parseInt(v) }))}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Parcela Única</SelectItem>
                          {Array.from({ length: 23 }, (_, i) => i + 2).map(n => (
                            <SelectItem key={n} value={String(n)}>{n}x parcelas</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>{form.quantidadeParcelas === 1 ? "Data de Vencimento" : "1º Vencimento"}</Label>
                      <Input
                        type="date"
                        value={form.dataPrimeiroVencimento}
                        onChange={e => setForm(f => ({ ...f, dataPrimeiroVencimento: e.target.value }))}
                      />
                    </div>
                    <div className="flex items-end">
                      {editId ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full text-amber-700 border-amber-300 hover:bg-amber-50"
                          onClick={() => {
                            if (window.confirm("Isso irá substituir todas as parcelas existentes. Deseja continuar?")) {
                              handleGerarParcelas();
                            }
                          }}
                        >
                          Regenerar Parcelas
                        </Button>
                      ) : (
                        <Button type="button" variant="outline" className="w-full" onClick={handleGerarParcelas}>
                          {form.quantidadeParcelas === 1 ? "Gerar Parcela" : "Gerar Parcelas"}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Indicador de carregamento enquanto as parcelas existentes chegam do banco */}
                  {parcelasCarregando && (
                    <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Carregando parcelas cadastradas...
                    </div>
                  )}

                  {!parcelasCarregando && parcelas.length > 0 && (
                    <>
                      <p className="text-xs text-muted-foreground">
                        {editId
                          ? `${parcelas.length} parcela(s) — edite individualmente o valor, vencimento, data de pagamento e status.`
                          : parcelas.length === 1
                            ? "1 parcela gerada — edite o valor e a data conforme necessário."
                            : `${parcelas.length} parcelas geradas — edite individualmente o valor, vencimento, data de pagamento e status.`}
                      </p>
                      <TabelaParcelas
                        tipo="pagamento"
                        parcelas={parcelas}
                        onChange={setParcelas}
                      />
                    </>
                  )}

                  {!parcelasCarregando && editId && parcelas.length === 0 && (
                    <p className="text-xs text-muted-foreground py-2">
                      Nenhuma parcela cadastrada para este pagamento. Clique em "Regenerar Parcelas" para criar.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Anexos — só exibe após o registro ser salvo */}
            {editId && (
              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <span>Anexos</span>
                  <span className="text-xs text-muted-foreground font-normal">(comprovantes, notas, documentos)</span>
                </p>
                <AnexosPanel modulo="pagamento" registroId={editId} podeAnexar podeExcluir />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editId ? "Salvar Alterações" : "Cadastrar Pagamento"}
              </Button>
            </div>
          </form>
          </div>
        </SheetContent>
      </Sheet>
      <ComprovanteViewer
        open={comprovanteOpen}
        onClose={() => setComprovanteOpen(false)}
        tipo="pagamento"
        registros={comprovanteRegistros}
      />

      {/* Modal de Atribuição em Lote de Centro de Custo */}
      <Dialog open={atribuirCCOpen} onOpenChange={setAtribuirCCOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-amber-600" />
              Atribuir Centro de Custo em Lote
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Selecione o Centro de Custo para atribuir aos <strong>{selecionados.size}</strong> pagamento(s) selecionado(s).
            </p>
            <div className="space-y-2">
              <Label>Centro de Custo</Label>
              <Select
                value={atribuirCCId != null ? String(atribuirCCId) : ""}
                onValueChange={v => setAtribuirCCId(v === "" ? null : Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o Centro de Custo..." />
                </SelectTrigger>
                <SelectContent>
                  {centrosCustoList.map(cc => (
                    <SelectItem key={cc.id} value={String(cc.id)}>{cc.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => { setAtribuirCCOpen(false); setAtribuirCCId(null); }}>Cancelar</Button>
              <Button
                disabled={atribuirCCId === null || assignCCLoteMutation.isPending}
                onClick={() => {
                  if (atribuirCCId === null) return;
                  assignCCLoteMutation.mutate({ ids: Array.from(selecionados), centroCustoId: atribuirCCId });
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {assignCCLoteMutation.isPending ? "Atribuindo..." : "Atribuir CC"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
