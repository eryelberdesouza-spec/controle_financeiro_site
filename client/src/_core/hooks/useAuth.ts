import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { useCallback, useEffect, useMemo } from "react";

const USER_INFO_KEY = "manus-runtime-user-info";

/** Limpa todos os dados de sessão do armazenamento local do navegador */
function clearLocalSession() {
  try {
    localStorage.removeItem(USER_INFO_KEY);
    sessionStorage.clear();
  } catch {
    // Ignorar erros de acesso ao storage (modo privado restrito)
  }
}

/**
 * Faz logout via rota Express /api/logout (POST).
 * Usado como fallback quando o cliente tRPC não consegue chamar a mutation
 * (ex: sessão já corrompida, erro de rede, cookie inválido).
 */
async function logoutViaExpressRoute(): Promise<void> {
  try {
    await fetch("/api/logout", {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // Ignorar erros de rede — o cookie será destruído pelo servidor
    // na próxima requisição via context.ts (clearSessionCookie)
  }
}

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false } = options ?? {};

  const loginUrl = getLoginUrl();
  const utils = trpc.useUtils();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
      clearLocalSession();
    },
  });

  const logout = useCallback(async () => {
    // Limpar dados locais imediatamente (não esperar resposta do servidor)
    clearLocalSession();
    utils.auth.me.setData(undefined, null);

    try {
      await logoutMutation.mutateAsync();
    } catch {
      // Se o tRPC falhar (sessão já inválida), usar rota Express como fallback
      await logoutViaExpressRoute();
    } finally {
      // Garantir limpeza e invalidação independente do resultado
      clearLocalSession();
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
    }
  }, [logoutMutation, utils]);

  const state = useMemo(() => {
    // Atualizar localStorage apenas quando há dados válidos do usuário
    if (meQuery.data) {
      try {
        localStorage.setItem(USER_INFO_KEY, JSON.stringify(meQuery.data));
      } catch {
        // Ignorar erros de storage
      }
    } else if (!meQuery.isLoading && meQuery.data === null) {
      // Usuário não autenticado: limpar dados obsoletos do storage
      clearLocalSession();
    }

    return {
      user: meQuery.data ?? null,
      loading: meQuery.isLoading || logoutMutation.isPending,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(meQuery.data),
    };
  }, [
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    logoutMutation.error,
    logoutMutation.isPending,
  ]);

  // Redirecionar para login quando não autenticado (token expirado ou inválido)
  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (meQuery.isLoading || logoutMutation.isPending) return;
    if (state.user) return;
    if (typeof window === "undefined") return;

    // Limpar dados locais antes de redirecionar para evitar estado obsoleto
    clearLocalSession();
    window.location.href = loginUrl;
  }, [
    redirectOnUnauthenticated,
    loginUrl,
    logoutMutation.isPending,
    meQuery.isLoading,
    state.user,
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
    getLoginUrl,
  };
}
