import type { CookieOptions, Request, Response } from "express";
import { COOKIE_NAME } from "@shared/const";

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

/**
 * Opções canônicas do cookie de sessão.
 *
 * sameSite: "lax" — compatível com OAuth redirect de primeiro partido.
 *   - Funciona em todos os browsers modernos sem exigir Secure em localhost.
 *   - "none" exige Secure:true e causa problemas em proxies/CDNs.
 *
 * Estas opções DEVEM ser usadas tanto no set quanto no clearCookie para
 * garantir que o browser remova o cookie corretamente (path e sameSite
 * precisam ser idênticos no clear).
 */
export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: isSecureRequest(req),
  };
}

/**
 * Destrói o cookie de sessão com as opções canônicas + maxAge:0 + expires no passado.
 * Usar esta função em vez de res.clearCookie manual para garantir consistência.
 */
export function clearSessionCookie(req: Request, res: Response): void {
  const opts = getSessionCookieOptions(req);
  res.clearCookie(COOKIE_NAME, {
    ...opts,
    maxAge: 0,
    expires: new Date(0),
  });
}
