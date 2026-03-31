import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { COOKIE_NAME } from "@shared/const";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

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
    // Authentication is optional for public procedures.
    user = null;

    // Bloco 3: Se havia um cookie de sessão mas ele é inválido/expirado,
    // destruir o cookie imediatamente com as MESMAS opções usadas no set.
    // Sem isso, o browser fica preso enviando o cookie corrompido em loop.
    const cookieHeader = opts.req.headers.cookie;
    if (cookieHeader && cookieHeader.includes(COOKIE_NAME)) {
      opts.res.clearCookie(COOKIE_NAME, {
        httpOnly: true,
        path: "/",
        sameSite: "none",
        secure: true,
        maxAge: 0,
        expires: new Date(0),
      });
      console.warn("[Auth] Sessão inválida/expirada detectada — cookie destruído:", {
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
