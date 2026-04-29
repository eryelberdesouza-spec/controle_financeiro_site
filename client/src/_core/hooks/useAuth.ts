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

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false } = options ?? {};
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
      // Se o tRPC falhar (sessão já inválida), destruir cookie via rota Express
      try {
        await fetch("/api/logout", {
          method: "POST",
          credentials: "include",
        });
      } catch {
        // Ignorar erros de rede
      }
    } finally {
      clearLocalSession();
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
      // Redirecionar para /login após logout
      window.location.href = "/login";
    }
  }, [logoutMutation, utils]);

  const state = useMemo(() => {
    if (meQuery.data) {
      try {
        localStorage.setItem(USER_INFO_KEY, JSON.stringify(meQuery.data));
      } catch {
        // Ignorar erros de storage
      }
    } else if (!meQuery.isLoading && meQuery.data === null) {
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

  // Redirecionar para /login quando não autenticado
  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (meQuery.isLoading || logoutMutation.isPending) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    // Não redirecionar se já estiver na página de login
    if (window.location.pathname === "/login") return;
    clearLocalSession();
    window.location.href = "/login";
  }, [
    redirectOnUnauthenticated,
    logoutMutation.isPending,
    meQuery.isLoading,
    state.user,
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
