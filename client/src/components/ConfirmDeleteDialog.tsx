/**
 * ConfirmDeleteDialog — Dialog de confirmação para exclusão de registros críticos.
 *
 * Quando requireMasterPassword=true, exige que o usuário informe a senha master
 * configurada em Configurações → Empresa antes de prosseguir com a exclusão.
 *
 * Uso:
 *   <ConfirmDeleteDialog
 *     open={open}
 *     onOpenChange={setOpen}
 *     title="Excluir Cliente"
 *     description="Esta ação não pode ser desfeita."
 *     onConfirm={handleDelete}
 *     requireMasterPassword
 *   />
 */
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, ShieldAlert } from "lucide-react";

interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  /** Se true, exige senha master antes de confirmar */
  requireMasterPassword?: boolean;
  /** Callback chamado após confirmação (e validação de senha, se aplicável) */
  onConfirm: () => void | Promise<void>;
  /** Texto do botão de confirmação */
  confirmLabel?: string;
  /** Se true, mostra spinner no botão de confirmação */
  loading?: boolean;
}

export default function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title = "Confirmar Exclusão",
  description = "Esta ação não pode ser desfeita. Tem certeza que deseja continuar?",
  requireMasterPassword = false,
  onConfirm,
  confirmLabel = "Excluir",
  loading = false,
}: ConfirmDeleteDialogProps) {
  const [password, setPassword] = useState("");
  const [checking, setChecking] = useState(false);

  const verifyMutation = trpc.config.verifyMasterPassword.useMutation();

  const handleConfirm = async () => {
    if (requireMasterPassword) {
      if (!password.trim()) {
        toast.error("Informe a senha master para continuar.");
        return;
      }
      setChecking(true);
      try {
        const result = await verifyMutation.mutateAsync({ password });
        if (!result.valid) {
          toast.error("Senha master incorreta. Operação cancelada.");
          setPassword("");
          setChecking(false);
          return;
        }
      } catch {
        toast.error("Erro ao verificar senha master.");
        setChecking(false);
        return;
      }
      setChecking(false);
    }
    setPassword("");
    await onConfirm();
    onOpenChange(false);
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) setPassword("");
    onOpenChange(v);
  };

  const isBusy = loading || checking;

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="w-5 h-5" />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {requireMasterPassword && (
          <div className="space-y-2 py-2">
            <Label htmlFor="master-password" className="text-sm font-medium">
              Senha Master
            </Label>
            <Input
              id="master-password"
              type="password"
              placeholder="Digite a senha master para confirmar"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleConfirm();
              }}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              A senha master é configurada em Configurações → Empresa.
            </p>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isBusy}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={isBusy}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isBusy ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verificando...
              </>
            ) : (
              confirmLabel
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
