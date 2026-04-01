import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions, clearSessionCookie } from "./cookies";
import { sdk } from "./sdk";
import { logError } from "../errorLogger";

/**
 * URI de callback registrada no Manus OAuth (correspondência exata obrigatória).
 * O SDK do Manus decodifica o state (btoa(redirectUri)) para usar nesta troca.
 */
const CANONICAL_REDIRECT_URI =
  "https://atomtech-financeiro.manus.space/api/oauth/callback";

/**
 * Domínios autorizados para redirecionamento pós-login.
 * Usado para evitar open redirect — apenas estes origins são aceitos.
 */
const ALLOWED_ORIGINS = [
  "https://atomtech-financeiro.manus.space",
  "https://financedash.company",
  "https://www.financedash.company",
];

/** Duração da sessão: 8 horas (um expediente de trabalho). */
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 8;

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

/**
 * Determina o origin do request para o redirect pós-login.
 * Usa o hostname do request para suportar múltiplos domínios.
 * Se o origin não estiver na lista de permitidos, usa o canônico.
 */
function getPostLoginRedirect(req: Request): string {
  const origin = `${req.protocol}://${req.hostname}`;
  return ALLOWED_ORIGINS.includes(origin)
    ? `${origin}/`
    : `https://atomtech-financeiro.manus.space/`;
}

export function registerOAuthRoutes(app: Express) {
  // ─── GET /api/oauth/callback ──────────────────────────────────────────────
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    // Evitar cache do callback — sessão inconsistente com cache
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    const error = getQueryParam(req, "error");
    const errorDescription = getQueryParam(req, "error_description");

    // Se o OAuth server retornou um erro explícito
    if (error) {
      console.error("[OAuth] Erro retornado pelo servidor OAuth:", {
        error,
        errorDescription,
      });
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

    if (!code || !state) {
      console.error("[OAuth] Parâmetros ausentes no callback:", {
        hasCode: !!code,
        hasState: !!state,
        query: req.query,
      });
      res.status(400).json({ error: "code e state são obrigatórios" });
      return;
    }

    try {
      // O state = btoa(redirectUri) — o SDK decodifica para extrair o redirectUri
      // usado na troca de token. NUNCA alterar este comportamento.
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        console.error("[OAuth] openId ausente na resposta do servidor OAuth");
        res.status(400).json({ error: "openId ausente na resposta do OAuth" });
        return;
      }

      // Sincronizar usuário no banco de dados
      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      // Criar token de sessão JWT (8 horas)
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: SESSION_MAX_AGE_MS,
      });

      // Destruir cookie anterior antes de criar novo — evita sessões fantasmas
      clearSessionCookie(req, res);

      // Setar novo cookie de sessão
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: SESSION_MAX_AGE_MS,
      });

      // Redirecionar para a raiz do domínio atual usando URL absoluta.
      // URL absoluta garante que o browser não preserve ?code=... da URL atual.
      const redirectTo = getPostLoginRedirect(req);
      console.log("[OAuth] Login bem-sucedido, redirecionando para:", redirectTo);
      res.redirect(302, redirectTo);
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

  // ─── GET + POST /api/logout ───────────────────────────────────────────────
  // Rota Express pura para logout — funciona mesmo quando o tRPC não está
  // disponível (sessão corrompida, erro de rede, cookie inválido).
  const handleLogout = (req: Request, res: Response) => {
    clearSessionCookie(req, res);
    res.status(200).json({ success: true });
  };

  app.get("/api/logout", handleLogout);
  app.post("/api/logout", handleLogout);
}
