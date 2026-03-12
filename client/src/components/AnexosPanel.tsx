import { useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Paperclip, Upload, Trash2, Download, FileText, FileImage,
  File, Loader2, X, AlertCircle
} from "lucide-react";

export type AnexoModulo = "pagamento" | "recebimento" | "contrato" | "os" | "cliente";

interface AnexosPanelProps {
  modulo: AnexoModulo;
  registroId: number;
  /** Se false, oculta botão de upload (modo somente leitura) */
  podeAnexar?: boolean;
  /** Se false, oculta botão de excluir */
  podeExcluir?: boolean;
}

const MAX_FILE_SIZE_MB = 15;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const MIME_ICONS: Record<string, React.ReactNode> = {
  "application/pdf": <FileText className="h-4 w-4 text-red-500" />,
  "image/jpeg": <FileImage className="h-4 w-4 text-blue-500" />,
  "image/png": <FileImage className="h-4 w-4 text-blue-500" />,
  "image/gif": <FileImage className="h-4 w-4 text-blue-500" />,
  "image/webp": <FileImage className="h-4 w-4 text-blue-500" />,
};

function getIcon(mimeType?: string | null) {
  if (!mimeType) return <File className="h-4 w-4 text-muted-foreground" />;
  return MIME_ICONS[mimeType] ?? <File className="h-4 w-4 text-muted-foreground" />;
}

function formatBytes(bytes?: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Converte File para base64 string */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove o prefixo "data:...;base64,"
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AnexosPanel({
  modulo,
  registroId,
  podeAnexar = true,
  podeExcluir = true,
}: AnexosPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const utils = trpc.useUtils();

  const { data: anexos = [], isLoading } = trpc.anexos.list.useQuery(
    { modulo, registroId },
    { enabled: registroId > 0 }
  );

  const uploadMutation = trpc.anexos.upload.useMutation({
    onSuccess: () => {
      utils.anexos.list.invalidate({ modulo, registroId });
    },
    onError: (e) => toast.error(`Erro ao enviar arquivo: ${e.message}`),
  });

  const deleteMutation = trpc.anexos.delete.useMutation({
    onSuccess: () => {
      toast.success("Anexo removido.");
      utils.anexos.list.invalidate({ modulo, registroId });
    },
    onError: (e) => toast.error(e.message),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const validos = files.filter(f => {
      if (f.size > MAX_FILE_SIZE_BYTES) {
        toast.error(`"${f.name}" excede ${MAX_FILE_SIZE_MB} MB e foi ignorado.`);
        return false;
      }
      return true;
    });
    setPendingFiles(prev => [...prev, ...validos]);
    // Reset input para permitir re-selecionar o mesmo arquivo
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePending = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (pendingFiles.length === 0) return;
    setUploading(true);
    let successCount = 0;
    for (const file of pendingFiles) {
      try {
        const fileBase64 = await fileToBase64(file);
        await uploadMutation.mutateAsync({
          modulo,
          registroId,
          nomeOriginal: file.name,
          mimeType: file.type || "application/octet-stream",
          tamanho: file.size,
          descricao: descricao || undefined,
          fileBase64,
        });
        successCount++;
      } catch {
        // Erro já tratado no onError do mutation
      }
    }
    if (successCount > 0) {
      toast.success(`${successCount} arquivo(s) enviado(s) com sucesso!`);
      setPendingFiles([]);
      setDescricao("");
    }
    setUploading(false);
  };

  if (registroId <= 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <AlertCircle className="h-4 w-4" />
        Salve o registro primeiro para poder anexar arquivos.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Lista de anexos existentes */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando anexos...
        </div>
      ) : anexos.length === 0 ? (
        <p className="text-sm text-muted-foreground py-1">Nenhum arquivo anexado.</p>
      ) : (
        <ul className="divide-y rounded-lg border overflow-hidden">
          {anexos.map(a => (
            <li key={a.id} className="flex items-center gap-3 px-3 py-2 bg-card hover:bg-muted/30 transition-colors">
              <span className="shrink-0">{getIcon(a.mimeType)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{a.nomeOriginal}</p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(a.tamanho)}
                  {a.descricao && ` · ${a.descricao}`}
                  {" · "}
                  {new Date(a.createdAt).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={a.nomeOriginal}
                  className="inline-flex items-center justify-center h-7 w-7 rounded hover:bg-muted transition-colors"
                  title="Baixar arquivo"
                >
                  <Download className="h-3.5 w-3.5 text-blue-500" />
                </a>
                {podeExcluir && (
                  <button
                    onClick={() => deleteMutation.mutate({ id: a.id })}
                    disabled={deleteMutation.isPending}
                    className="inline-flex items-center justify-center h-7 w-7 rounded hover:bg-destructive/10 transition-colors"
                    title="Remover anexo"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Upload de novos arquivos */}
      {podeAnexar && (
        <div className="space-y-2">
          {/* Arquivos pendentes */}
          {pendingFiles.length > 0 && (
            <ul className="space-y-1">
              {pendingFiles.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm bg-muted/40 rounded px-2 py-1">
                  {getIcon(f.type)}
                  <span className="flex-1 truncate">{f.name}</span>
                  <span className="text-xs text-muted-foreground">{formatBytes(f.size)}</span>
                  <button onClick={() => removePending(i)} className="text-muted-foreground hover:text-destructive">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Descrição opcional */}
          {pendingFiles.length > 0 && (
            <Input
              placeholder="Descrição dos arquivos (opcional)..."
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              className="text-sm h-8"
            />
          )}

          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileChange}
              accept="*/*"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="gap-2"
            >
              <Paperclip className="h-4 w-4" />
              Selecionar Arquivos
            </Button>
            {pendingFiles.length > 0 && (
              <Button
                type="button"
                size="sm"
                onClick={handleUpload}
                disabled={uploading}
                className="gap-2"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {uploading ? "Enviando..." : `Enviar ${pendingFiles.length} arquivo(s)`}
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Tamanho máximo por arquivo: {MAX_FILE_SIZE_MB} MB. Formatos aceitos: qualquer tipo.
          </p>
        </div>
      )}
    </div>
  );
}
