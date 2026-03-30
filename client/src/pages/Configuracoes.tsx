import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Building2, Camera, CheckCircle2, Eye, EyeOff, KeyRound, Save, Shield, Upload, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export default function Configuracoes() {
  const { data: empresa, refetch } = trpc.empresa.get.useQuery();
  const saveMutation = trpc.empresa.save.useMutation({
    onSuccess: () => {
      toast.success("Configurações salvas com sucesso!");
      refetch();
    },
    onError: (err) => toast.error("Erro ao salvar: " + err.message),
  });

  const [form, setForm] = useState({
    nomeEmpresa: "",
    cnpj: "",
    telefone: "",
    email: "",
    endereco: "",
    logoUrl: "",
    corPrimaria: "#2563eb",
  });

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (empresa) {
      setForm({
        nomeEmpresa: empresa.nomeEmpresa ?? "",
        cnpj: empresa.cnpj ?? "",
        telefone: empresa.telefone ?? "",
        email: empresa.email ?? "",
        endereco: empresa.endereco ?? "",
        logoUrl: empresa.logoUrl ?? "",
        corPrimaria: empresa.corPrimaria ?? "#2563eb",
      });
      if (empresa.logoUrl) setLogoPreview(empresa.logoUrl);
    }
  }, [empresa]);

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione um arquivo de imagem.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2MB.");
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        setLogoPreview(dataUrl);
        setForm(prev => ({ ...prev, logoUrl: dataUrl }));
        setUploading(false);
        toast.success("Logo carregado! Clique em Salvar para confirmar.");
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error("Erro ao carregar imagem.");
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(form);
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os dados da empresa e as configurações de segurança do sistema.
          </p>
        </div>

        <Tabs defaultValue="empresa">
          <TabsList className="mb-4">
            <TabsTrigger value="empresa" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Empresa
            </TabsTrigger>
            <TabsTrigger value="seguranca" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Segurança
            </TabsTrigger>
          </TabsList>

          {/* ── Aba Empresa ─────────────────────────────────────────────── */}
          <TabsContent value="empresa">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Logo */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Camera className="h-4 w-4 text-primary" />
                    Logotipo da Empresa
                  </CardTitle>
                  <CardDescription>
                    Será exibido no cabeçalho do sistema e nos relatórios impressos. Recomendado: PNG ou SVG com fundo transparente, máximo 2MB.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6">
                    <div className="w-28 h-28 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/30 overflow-hidden shrink-0">
                      {logoPreview ? (
                        <img
                          src={logoPreview}
                          alt="Logo da empresa"
                          className="w-full h-full object-contain p-2"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-muted-foreground">
                          <Building2 className="h-8 w-8" />
                          <span className="text-xs">Sem logo</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 flex-1">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="w-full sm:w-auto"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {uploading ? "Carregando..." : "Selecionar Logo"}
                      </Button>

                      <div className="space-y-1">
                        <Label htmlFor="logoUrl" className="text-xs text-muted-foreground">
                          Ou cole a URL da imagem
                        </Label>
                        <Input
                          id="logoUrl"
                          placeholder="https://exemplo.com/logo.png"
                          value={form.logoUrl.startsWith("data:") ? "" : form.logoUrl}
                          onChange={(e) => {
                            handleChange("logoUrl", e.target.value);
                            setLogoPreview(e.target.value || null);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Dados da Empresa */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Building2 className="h-4 w-4 text-primary" />
                    Dados da Empresa
                  </CardTitle>
                  <CardDescription>
                    Informações que aparecem nos relatórios e documentos gerados pelo sistema.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label htmlFor="nomeEmpresa">Nome da Empresa *</Label>
                      <Input
                        id="nomeEmpresa"
                        placeholder="Ex: Empresa XYZ Ltda."
                        value={form.nomeEmpresa}
                        onChange={(e) => handleChange("nomeEmpresa", e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="cnpj">CNPJ</Label>
                      <Input
                        id="cnpj"
                        placeholder="00.000.000/0000-00"
                        value={form.cnpj}
                        onChange={(e) => handleChange("cnpj", e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="telefone">Telefone</Label>
                      <Input
                        id="telefone"
                        placeholder="(00) 00000-0000"
                        value={form.telefone}
                        onChange={(e) => handleChange("telefone", e.target.value)}
                      />
                    </div>

                    <div className="sm:col-span-2 space-y-1.5">
                      <Label htmlFor="emailEmpresa">E-mail</Label>
                      <Input
                        id="emailEmpresa"
                        type="email"
                        placeholder="contato@empresa.com.br"
                        value={form.email}
                        onChange={(e) => handleChange("email", e.target.value)}
                      />
                    </div>

                    <div className="sm:col-span-2 space-y-1.5">
                      <Label htmlFor="endereco">Endereço</Label>
                      <Textarea
                        id="endereco"
                        placeholder="Rua, número, bairro, cidade - UF, CEP"
                        value={form.endereco}
                        onChange={(e) => handleChange("endereco", e.target.value)}
                        rows={2}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pré-visualização do cabeçalho */}
              {(form.nomeEmpresa || logoPreview) && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground font-normal">
                      Pré-visualização do cabeçalho
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                      {logoPreview && (
                        <img
                          src={logoPreview}
                          alt="Logo"
                          className="h-10 w-10 object-contain rounded"
                        />
                      )}
                      <div>
                        <p className="font-semibold text-foreground">
                          {form.nomeEmpresa || "Nome da Empresa"}
                        </p>
                        {form.cnpj && (
                          <p className="text-xs text-muted-foreground">CNPJ: {form.cnpj}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end">
                <Button type="submit" disabled={saveMutation.isPending} className="min-w-32">
                  <Save className="h-4 w-4 mr-2" />
                  {saveMutation.isPending ? "Salvando..." : "Salvar Configurações"}
                </Button>
              </div>
            </form>
          </TabsContent>

          {/* ── Aba Segurança ────────────────────────────────────────────── */}
          <TabsContent value="seguranca">
            <SenhasMasterSection />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

/** Seção de configuração da Senha Master */
function SenhasMasterSection() {
  const { data: statusSenha, refetch: refetchStatus } = trpc.config.hasMasterPassword.useQuery();
  const setMasterPasswordMutation = trpc.config.setMasterPassword.useMutation({
    onSuccess: () => {
      toast.success("Senha master definida com sucesso!");
      setFormSenha({ novaSenha: "", confirmar: "" });
      refetchStatus();
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });

  const [formSenha, setFormSenha] = useState({ novaSenha: "", confirmar: "" });
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const handleSalvarSenha = (e: React.FormEvent) => {
    e.preventDefault();
    if (formSenha.novaSenha.length < 4) {
      toast.error("A senha master deve ter pelo menos 4 caracteres.");
      return;
    }
    if (formSenha.novaSenha !== formSenha.confirmar) {
      toast.error("As senhas não conferem. Verifique e tente novamente.");
      return;
    }
    setMasterPasswordMutation.mutate({ password: formSenha.novaSenha });
  };

  return (
    <div className="space-y-6">
      {/* Status da senha master */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4 text-primary" />
            Senha Master para Exclusões
          </CardTitle>
          <CardDescription>
            A senha master é exigida para confirmar exclusões permanentes de registros críticos (clientes, contratos, projetos, propostas). Isso protege contra exclusões acidentais.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status atual */}
          <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
            {statusSenha?.configured ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-700">Senha master configurada</p>
                  <p className="text-xs text-muted-foreground">O sistema exige senha master para exclusões críticas.</p>
                </div>
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-orange-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-orange-700">Senha master não configurada</p>
                  <p className="text-xs text-muted-foreground">Sem senha master, exclusões são permitidas sem confirmação adicional. Configure abaixo para maior segurança.</p>
                </div>
              </>
            )}
          </div>

          {/* Formulário para definir/alterar senha */}
          <form onSubmit={handleSalvarSenha} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="novaSenha">
                  {statusSenha?.configured ? "Nova Senha Master" : "Definir Senha Master"}
                </Label>
                <div className="relative">
                  <Input
                    id="novaSenha"
                    type={mostrarSenha ? "text" : "password"}
                    placeholder="Mínimo 4 caracteres"
                    value={formSenha.novaSenha}
                    onChange={(e) => setFormSenha(f => ({ ...f, novaSenha: e.target.value }))}
                    className="pr-10"
                    required
                    minLength={4}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setMostrarSenha(v => !v)}
                    tabIndex={-1}
                  >
                    {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmarSenha">Confirmar Senha</Label>
                <div className="relative">
                  <Input
                    id="confirmarSenha"
                    type={mostrarSenha ? "text" : "password"}
                    placeholder="Repita a senha"
                    value={formSenha.confirmar}
                    onChange={(e) => setFormSenha(f => ({ ...f, confirmar: e.target.value }))}
                    className={`pr-10 ${formSenha.confirmar && formSenha.novaSenha !== formSenha.confirmar ? "border-red-400" : ""}`}
                    required
                  />
                </div>
                {formSenha.confirmar && formSenha.novaSenha !== formSenha.confirmar && (
                  <p className="text-xs text-red-500">As senhas não conferem.</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="submit"
                disabled={setMasterPasswordMutation.isPending || !formSenha.novaSenha || !formSenha.confirmar}
                className="bg-primary hover:bg-primary/90"
              >
                <KeyRound className="h-4 w-4 mr-2" />
                {setMasterPasswordMutation.isPending
                  ? "Salvando..."
                  : statusSenha?.configured
                    ? "Alterar Senha Master"
                    : "Definir Senha Master"}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              <strong>Atenção:</strong> Guarde a senha master em local seguro. Ela não pode ser recuperada — apenas redefinida por um administrador do sistema.
            </p>
          </form>
        </CardContent>
      </Card>

      {/* Informações sobre o uso da senha master */}
      <Card className="border-muted">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            Como funciona a Senha Master
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>A senha master é uma camada extra de proteção para operações irreversíveis. Ela é solicitada nos seguintes casos:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Exclusão permanente de clientes</li>
            <li>Exclusão permanente de propostas</li>
            <li>Exclusão permanente de contratos</li>
            <li>Exclusão permanente de projetos</li>
          </ul>
          <p className="pt-1">Para operações de arquivamento (que podem ser revertidas), a senha master não é necessária.</p>
        </CardContent>
      </Card>
    </div>
  );
}
