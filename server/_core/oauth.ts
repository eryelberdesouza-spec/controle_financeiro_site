import { COOKIE_NAME } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions, clearSessionCookie } from "./cookies";
import { sdk } from "./sdk";
import { logError } from "../errorLogger";

const ALLOWED_HOSTS = [
  "atomtech-financeiro.manus.space",
  "www.financedash.company",
  "financedash.company",
];

function getCanonicalRedirectUri(req: Request): string {
  const host = req.hostname || req.headers.host || ALLOWED_HOSTS[0];
  const cleanHost = Array.isArray(host) ? host[0] : host.split(":")[0];
  const validHost = ALLOWED_HOSTS.includes(cleanHost)
    ? cleanHost
    : ALLOWED_HOSTS[0];
  return `https://${validHost}/api/oauth/callback`;
}

/** Duração da sessão: 8 horas. */
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 8;

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    const code = getQueryParam(req, "code");
    const error = getQueryParam(req, "error");
    const errorDescription = getQueryParam(req, "error_description");

    if (error) {
      console.error("[OAuth] Erro do servidor OAuth:", { error, errorDescription });
      await logError({
        nivel: "error",
        origem: "login",
        acao: "oauth_callback",
        mensagem: `OAuth server retornou erro: ${error} - ${errorDescription ?? ""}`,
        ip: req.ip,
        contexto: { error, errorDescription },
      });
      res.status(400).json({ error, error_description: errorDescription });
      return;
    }

    if (!code) {
      console.error("[OAuth] Parâmetro 'code' ausente no callback:", { query: req.query });
      res.status(400).json({ error: "code é obrigatório" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(
        code,
        getCanonicalRedirectUri(req)
      );

      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        console.error("[OAuth] openId ausente na resposta do servidor OAuth");
        res.status(400).json({ error: "openId ausente na resposta do OAuth" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: SESSION_MAX_AGE_MS,
      });

      clearSessionCookie(req, res);

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: SESSION_MAX_AGE_MS,
      });

      res.redirect(302, "/");
    } catch (err: any) {
      console.error("[OAuth] Falha na troca de token:", {
        message: err?.message,
        status: err?.response?.status,
        data: err?.response?.data,
      });
      await logError({
        nivel: "critical",
        origem: "login",
        acao: "oauth_token_exchange",
        mensagem: err?.message ?? "Falha na troca de token OAuth",
        stack: err?.stack,
        ip: req.ip,
        contexto: {
          status: err?.response?.status,
          oauthError: err?.response?.data,
        },
      });
      res.status(500).json({
        error: "OAuth callback falhou",
        detail: err?.message,
        oauthError: err?.response?.data,
      });
    }
  });

  const handleLogout = (req: Request, res: Response) => {
    clearSessionCookie(req, res);
    res.status(200).json({ success: true });
  };

  app.get("/api/logout", handleLogout);
  app.post("/api/logout", handleLogout);
}
