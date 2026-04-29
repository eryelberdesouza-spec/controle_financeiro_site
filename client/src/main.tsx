import { trpc } from "@/lib/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
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

/** Redireciona para /login limpando sessão local */
function redirectToLogin() {
  if (typeof window === "undefined") return;
  // Evitar loop: não redirecionar se já estiver em /login
  if (window.location.pathname === "/login") return;
  clearLocalSession();
  window.location.href = "/login";
}

/** Verifica se um erro é de autenticação */
function isAuthError(error: unknown): boolean {
  if (!error) return false;
  if (error instanceof TRPCClientError) {
    if (error.data?.httpStatus === 401) return true;
    if ((error as any).shape?.data?.httpStatus === 401) return true;
    if (error.message?.includes("Sessão inválida") || error.message?.includes("Please login")) return true;
  }
  return false;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (isAuthError(error)) return false;
        return failureCount < 2;
      },
    },
  },
});

// Interceptar erros de queries
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

// Interceptar erros de mutations
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

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
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
