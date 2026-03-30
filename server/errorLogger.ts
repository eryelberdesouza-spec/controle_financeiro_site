/**
 * errorLogger.ts — Helper para registrar erros estruturados no banco de dados.
 *
 * Uso:
 *   import { logError } from "./errorLogger";
 *   await logError({ origem: "login", mensagem: "Token inválido", nivel: "error" });
 */
import { getDb } from "./db";
import { errorLog } from "../drizzle/schema";

export type ErrorLogInput = {
  nivel?: "info" | "warn" | "error" | "critical";
  origem: string;
  acao?: string;
  mensagem: string;
  stack?: string;
  usuarioId?: number;
  usuarioNome?: string;
  contexto?: Record<string, unknown>;
  ip?: string;
};

/**
 * Registra um erro no banco de dados.
 * Nunca lança exceção — falhas de log são silenciosas para não interromper o fluxo principal.
 */
export async function logError(input: ErrorLogInput): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(errorLog).values({
      nivel: input.nivel ?? "error",
      origem: input.origem,
      acao: input.acao,
      mensagem: input.mensagem.substring(0, 65535),
      stack: input.stack?.substring(0, 65535),
      usuarioId: input.usuarioId,
      usuarioNome: input.usuarioNome,
      contexto: input.contexto ? JSON.stringify(input.contexto) : undefined,
      ip: input.ip,
    });
  } catch {
    // Silencioso: log de erro não deve quebrar o sistema
    console.error("[errorLogger] Falha ao registrar log:", input.mensagem);
  }
}

/**
 * Captura erros de uma função async e registra no banco.
 * Relança o erro após registrar.
 */
export async function withErrorLog<T>(
  fn: () => Promise<T>,
  context: Omit<ErrorLogInput, "mensagem" | "stack">
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    await logError({
      ...context,
      mensagem: error.message,
      stack: error.stack,
    });
    throw err;
  }
}
