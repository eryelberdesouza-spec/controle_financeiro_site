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

    // Se havia um cookie de sessão mas ele é inválido/expirado,
    // limpar o cookie automaticamente para evitar loop de bloqueio.
    // O navegador ficaria preso enviando o cookie corrompido em todas
    // as requisições sem conseguir acessar o sistema.
    const cookieHeader = opts.req.headers.cookie;
    if (cookieHeader && cookieHeader.includes(COOKIE_NAME)) {
      opts.res.clearCookie(COOKIE_NAME, {
        httpOnly: true,
        path: "/",
        sameSite: "none",
        secure: true,
      });
      console.log("[Auth] Cleared invalid/expired session cookie");
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
