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
  // Evitar loop: só redirecionar se não estiver já no portal OAuth
  if (typeof window === "undefined") return;
  const loginUrl = getLoginUrl();
  // Verificar se já estamos sendo redirecionados (evitar loop)
  if (window.location.href.startsWith(loginUrl.split("?")[0])) return;
  window.location.href = loginUrl;
}

/**
 * Verifica se um erro é de autenticação (401 / sessão inválida).
 */
function isAuthError(error: unknown): boolean {
  if (!error) return false;

  if (error instanceof TRPCClientError) {
    if (error.message === UNAUTHED_ERR_MSG) return true;
    if (error.data?.httpStatus === 401) return true;
    if ((error as any).shape?.data?.httpStatus === 401) return true;
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("401") || msg.includes("unauthorized")) return true;
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
      redirectToLogin();
    } else {
      console.error("[API Mutation Error]", error);
    }
  }
});

/**
 * Fetch customizado que intercepta respostas HTTP 401 diretamente.
 */
async function fetchWithAuthInterceptor(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const response = await globalThis.fetch(input, {
    ...(init ?? {}),
    credentials: "include",
  });

  if (response.status === 401) {
    redirectToLogin();
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
