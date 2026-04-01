import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";

/** Limpa dados de sessão obsoletos do armazenamento local */
function clearLocalSession() {
  try {
    localStorage.removeItem("manus-runtime-user-info");
    sessionStorage.clear();
  } catch {
    // Ignorar erros de storage em modo privado
  }
}

/** Redireciona para login limpando sessão local */
function redirectToLogin() {
  clearLocalSession();
  // Evitar loop: só redirecionar se não estiver já na página de login
  if (typeof window !== "undefined" && !window.location.href.includes(getLoginUrl())) {
    window.location.href = getLoginUrl();
  }
}

/**
 * Verifica se um erro é de autenticação (401).
 * Trata dois casos:
 * 1. Erro tRPC com mensagem UNAUTHED_ERR_MSG (sessão inválida via protectedProcedure)
 * 2. Erro HTTP 401 real retornado pelo middleware Express JWT
 */
function isAuthError(error: unknown): boolean {
  if (!error) return false;

  // Caso 1: Erro tRPC com mensagem de não autenticado
  if (error instanceof TRPCClientError) {
    if (error.message === UNAUTHED_ERR_MSG) return true;
    // Verificar também o código HTTP dentro do erro tRPC
    if (error.data?.httpStatus === 401) return true;
    if ((error as any).shape?.data?.httpStatus === 401) return true;
  }

  // Caso 2: Erro HTTP 401 real (middleware Express retornou antes do tRPC)
  // O tRPC encapsula erros HTTP como TRPCClientError com cause
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("401") || msg.includes("unauthorized") || msg.includes("sessão inválida")) {
      return true;
    }
  }

  return false;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Não retentar em erros de autenticação — redirecionar imediatamente
      retry: (failureCount, error) => {
        if (isAuthError(error)) return false;
        return failureCount < 2;
      },
    },
  },
});

// Interceptar erros de queries (GET)
queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    if (isAuthError(error)) {
      console.warn("[Auth] Query retornou 401 — redirecionando para login:", error);
      redirectToLogin();
    } else {
      console.error("[API Query Error]", error);
    }
  }
});

// Interceptar erros de mutations (POST/PUT/DELETE)
queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    if (isAuthError(error)) {
      console.warn("[Auth] Mutation retornou 401 — redirecionando para login:", error);
      redirectToLogin();
    } else {
      console.error("[API Mutation Error]", error);
    }
  }
});

/**
 * Fetch customizado que intercepta respostas HTTP 401 diretamente.
 * Isso captura o 401 retornado pelo middleware Express ANTES do tRPC processar.
 * Sem isso, o tRPC pode engolir o 401 e retornar um erro genérico.
 */
async function fetchWithAuthInterceptor(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const response = await globalThis.fetch(input, {
    ...(init ?? {}),
    credentials: "include",
  });

  // Se o servidor retornou 401 HTTP real, redirecionar para login imediatamente
  if (response.status === 401) {
    console.warn("[Auth] Resposta HTTP 401 detectada — redirecionando para login");
    redirectToLogin();
    // Retornar a resposta mesmo assim para não quebrar o fluxo do tRPC
  }

  return response;
}

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch: fetchWithAuthInterceptor,
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
