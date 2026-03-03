import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Loader2, ShieldCheck, Shield, ShieldAlert } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  operador: "Operador",
  user: "Usuário",
};

const ROLE_ICONS: Record<string, any> = {
  admin: ShieldCheck,
  operador: Shield,
  user: ShieldAlert,
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-100 text-red-700 border-red-200",
  operador: "bg-blue-100 text-blue-700 border-blue-200",
  user: "bg-gray-100 text-gray-700 border-gray-200",
};

export default function AceitarConvite() {
  const params = useParams<{ token: string }>();
  const token = params.token ?? "";
  const [, navigate] = useLocation();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [confirmado, setConfirmado] = useState(false);

  const { data: convite, isLoading, error } = trpc.convites.aceitar.useQuery(
    { token },
    { enabled: !!token, retry: false }
  );

  const confirmar = trpc.convites.confirmar.useMutation({
    onSuccess: () => {
      setConfirmado(true);
      setTimeout(() => navigate("/"), 3000);
    },
  });

  useEffect(() => {
    if (!authLoading && isAuthenticated && convite && !confirmado) {
      confirmar.mutate({ token });
    }
  }, [authLoading, isAuthenticated, convite]);

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-500">Verificando convite...</p>
        </div>
      </div>
    );
  }

  if (error || !convite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-6 text-center space-y-4">
            <XCircle className="w-16 h-16 text-red-500 mx-auto" />
            <h2 className="text-xl font-bold text-gray-900">Convite Inválido</h2>
            <p className="text-gray-500 text-sm">
              {error?.message ?? "Este convite não foi encontrado, já foi utilizado ou expirou."}
            </p>
            <Button onClick={() => navigate("/")} variant="outline">
              Ir para o início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (confirmado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-6 text-center space-y-4">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <h2 className="text-xl font-bold text-gray-900">Acesso Ativado!</h2>
            <p className="text-gray-500 text-sm">
              Seu acesso ao sistema foi ativado com sucesso. Você será redirecionado em instantes...
            </p>
            <Button onClick={() => navigate("/")} className="bg-blue-600 text-white">
              Ir para o Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const RoleIcon = ROLE_ICONS[convite.role] ?? Shield;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center pb-2">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Shield className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle className="text-xl">Convite de Acesso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Convidado para:</span>
              <span className="font-medium text-gray-900">{convite.email}</span>
            </div>
            {convite.nome && (
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Nome:</span>
                <span className="font-medium text-gray-900">{convite.nome}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Nível de acesso:</span>
              <Badge className={`text-xs border flex items-center gap-1 ${ROLE_COLORS[convite.role]}`}>
                <RoleIcon className="w-3 h-3" />
                {ROLE_LABELS[convite.role]}
              </Badge>
            </div>
          </div>

          {!isAuthenticated ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 text-center">
                Para aceitar o convite, faça login com sua conta Manus.
              </p>
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => {
                  sessionStorage.setItem("conviteToken", token);
                  window.location.href = getLoginUrl();
                }}
              >
                Fazer Login e Aceitar Convite
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 text-center">
                Você está logado como <strong>{user?.name}</strong>. Clique abaixo para ativar seu acesso.
              </p>
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={confirmar.isPending}
                onClick={() => confirmar.mutate({ token })}
              >
                {confirmar.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Ativando...
                  </>
                ) : (
                  "Aceitar Convite e Acessar o Sistema"
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
