import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Building2, Camera, Save, Upload } from "lucide-react";
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
          <h1 className="text-2xl font-bold text-foreground">Configurações da Empresa</h1>
          <p className="text-muted-foreground mt-1">
            Personalize o sistema com os dados e identidade visual da sua empresa.
          </p>
        </div>

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
                {/* Preview */}
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
      </div>
    </DashboardLayout>
  );
}
