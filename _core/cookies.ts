import type { CookieOptions, Request } from "express";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string) {
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

function isLocalRequest(req: Request): boolean {
  const hostname = req.hostname || "";
  return (
    LOCAL_HOSTS.has(hostname) ||
    isIpAddress(hostname)
  );
}

function isSecureRequest(req: Request): boolean {
  // Verifica protocolo direto
  if (req.protocol === "https") return true;

  // Verifica proxy reverso (Manus, Nginx, etc.)
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const isLocal = isLocalRequest(req);
  const isSecure = isLocal ? false : isSecureRequest(req);

  // sameSite "lax" funciona em aba normal e anônima sem exigir secure.
  // sameSite "none" EXIGE secure=true — só usamos quando realmente em HTTPS.
  const sameSite: CookieOptions["sameSite"] = isSecure ? "none" : "lax";

  return {
    httpOnly: true,
    path: "/",
    sameSite,
    secure: isSecure,
  };
}
