import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, User, Building2, Phone, Mail, MapPin, CreditCard,
  FileText, FolderOpen, ClipboardList, Archive, CheckCircle2, Clock, XCircle
} from "lucide-react";

function formatCurrency(value: string | number | null | undefined) {
  if (value == null) return "—";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "—";
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(date: Date | string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("pt-BR");
}

const statusPropostaBadge: Record<string, { label: string; className: string }> = {
  RASCUNHO: { label: "Rascunho", className: "bg-gray-100 text-gray-700" },
  ENVIADA: { label: "Enviada", className: "bg-blue-100 text-blue-700" },
  APROVADA: { label: "Aprovada", className: "bg-green-100 text-green-700" },
  REPROVADA: { label: "Reprovada", className: "bg-red-100 text-red-700" },
  CANCELADA: { label: "Cancelada", className: "bg-orange-100 text-orange-700" },
};

const statusContratoBadge: Record<string, { label: string; className: string }> = {
  ATIVO: { label: "Ativo", className: "bg-green-100 text-green-700" },
  CONCLUIDO: { label: "Concluído", className: "bg-blue-100 text-blue-700" },
  CANCELADO: { label: "Cancelado", className: "bg-red-100 text-red-700" },
  SUSPENSO: { label: "Suspenso", className: "bg-yellow-100 text-yellow-700" },
};

const statusProjetoBadge: Record<string, { label: string; className: string }> = {
  PLANEJAMENTO: { label: "Planejamento", className: "bg-gray-100 text-gray-700" },
  EM_EXECUCAO: { label: "Em Execução", className: "bg-blue-100 text-blue-700" },
  PARALISADO: { label: "Paralisado", className: "bg-yellow-100 text-yellow-700" },
  CONCLUIDO: { label: "Concluído", className: "bg-green-100 text-green-700" },
  CANCELADO: { label: "Cancelado", className: "bg-red-100 text-red-700" },
};

function StatusBadge({ status, map }: { status: string | null | undefined; map: Record<string, { label: string; className: string }> }) {
  if (!status) return <span className="text-muted-foreground text-sm">—</span>;
  const cfg = map[status] ?? { label: status, className: "bg-gray-100 text-gray-700" };
  return <Badge className={`${cfg.className} border-0 text-xs font-medium`}>{cfg.label}</Badge>;
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value || "—"}</span>
    </div>
  );
}

export default function ClienteDetalhado() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "0", 10);

  const { data, isLoading, error } = trpc.clientes.getDetalhado.useQuery({ id }, { enabled: !!id });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !data) {
    return (
      <DashboardLayout>
        <div className="p-6 flex flex-col items-center gap-4 text-center">
          <XCircle className="h-12 w-12 text-destructive" />
          <p className="text-muted-foreground">Cliente não encontrado.</p>
          <Link href="/clientes">
            <Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" />Voltar</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const { cliente, propostas, contratos, projetos } = data;
  const isPJ = cliente.tipoPessoa === "PJ";

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
        {/* Cabeçalho */}
        <div className="flex items-center gap-3">
          <Link href="/clientes">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{cliente.nome}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="outline" className="text-xs">{cliente.tipo}</Badge>
              {cliente.statusRegistro === "arquivado" && (
                <Badge className="bg-yellow-100 text-yellow-700 border-0 text-xs">
                  <Archive className="h-3 w-3 mr-1" />Arquivado
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Dados Cadastrais */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              {isPJ ? <Building2 className="h-4 w-4" /> : <User className="h-4 w-4" />}
              Dados Cadastrais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <InfoRow label="Tipo de Pessoa" value={isPJ ? "Pessoa Jurídica" : "Pessoa Física"} />
              <InfoRow label={isPJ ? "CNPJ" : "CPF"} value={cliente.cpfCnpj} />
              {isPJ && <InfoRow label="Insc. Estadual" value={cliente.inscricaoEstadual} />}
              {isPJ && <InfoRow label="Insc. Municipal" value={cliente.inscricaoMunicipal} />}
              <InfoRow label="Segmento" value={cliente.segmento} />
              <InfoRow label="Contato" value={cliente.nomeContato} />
            </div>
            <Separator className="my-4" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <InfoRow label="Telefone" value={cliente.telefone} />
              <InfoRow label="Celular" value={cliente.celular} />
              <InfoRow label="E-mail" value={cliente.email} />
              <InfoRow label="Endereço" value={cliente.endereco} />
              <InfoRow label="Cidade" value={cliente.cidade} />
              <InfoRow label="Estado" value={cliente.estado} />
            </div>
            {(cliente.banco || cliente.chavePix) && (
              <>
                <Separator className="my-4" />
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <InfoRow label="Banco" value={cliente.banco} />
                  <InfoRow label="Agência" value={cliente.agencia} />
                  <InfoRow label="Conta" value={cliente.conta ? `${cliente.conta} (${cliente.tipoConta ?? ""})` : null} />
                  {cliente.chavePix && <InfoRow label={`Pix (${cliente.tipoPix ?? ""})`} value={cliente.chavePix} />}
                </div>
              </>
            )}
            {cliente.observacao && (
              <>
                <Separator className="my-4" />
                <InfoRow label="Observações" value={cliente.observacao} />
              </>
            )}
          </CardContent>
        </Card>

        {/* Propostas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Propostas
              <Badge variant="secondary" className="ml-auto">{propostas.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {propostas.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4">Nenhuma proposta registrada.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {propostas.map((p) => (
                    <TableRow key={p.id} className={p.statusRegistro === "arquivado" ? "opacity-60" : ""}>
                      <TableCell className="font-mono text-xs">{p.numero}</TableCell>
                      <TableCell><StatusBadge status={p.status} map={statusPropostaBadge} /></TableCell>
                      <TableCell className="text-sm">{formatDate(p.dataGeracao)}</TableCell>
                      <TableCell className="text-sm">{formatDate(p.dataValidade)}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{formatCurrency(p.valorTotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Contratos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Contratos
              <Badge variant="secondary" className="ml-auto">{contratos.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {contratos.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4">Nenhum contrato registrado.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Objeto</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contratos.map((c) => (
                    <TableRow key={c.id} className={c.statusRegistro === "arquivado" ? "opacity-60" : ""}>
                      <TableCell className="font-mono text-xs">{c.numero}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{c.objeto}</TableCell>
                      <TableCell><StatusBadge status={c.status} map={statusContratoBadge} /></TableCell>
                      <TableCell className="text-sm">{formatDate(c.dataInicio)}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{formatCurrency(c.valorTotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Projetos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Projetos
              <Badge variant="secondary" className="ml-auto">{projetos.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {projetos.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4">Nenhum projeto registrado.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Início Prev.</TableHead>
                    <TableHead className="text-right">Valor Contratado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projetos.map((p) => (
                    <TableRow key={p.id} className={p.statusRegistro === "arquivado" ? "opacity-60" : ""}>
                      <TableCell className="font-mono text-xs">{p.numero}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{p.nome}</TableCell>
                      <TableCell><StatusBadge status={p.statusOperacional} map={statusProjetoBadge} /></TableCell>
                      <TableCell className="text-sm">{formatDate(p.dataInicioPrevista)}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{formatCurrency(p.valorContratado)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
