import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { COOKIE_NAME } from "@shared/const";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { clearSessionCookie } from "./cookies";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Autenticação é opcional para procedures públicas.
    user = null;

    // Se havia um cookie de sessão mas ele é inválido/expirado,
    // destruí-lo imediatamente usando clearSessionCookie (mesmas opções do set).
    // Sem isso, o browser fica preso enviando o cookie corrompido em loop
    // e o usuário precisa limpar o cache manualmente para conseguir logar.
    const cookieHeader = opts.req.headers.cookie;
    if (cookieHeader && cookieHeader.includes(COOKIE_NAME)) {
      clearSessionCookie(opts.req as any, opts.res as any);
      console.warn("[Auth] Sessão inválida/expirada — cookie destruído:", {
        ip: opts.req.ip,
        url: opts.req.originalUrl,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
