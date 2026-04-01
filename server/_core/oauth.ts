import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions, clearSessionCookie } from "./cookies";
import { sdk } from "./sdk";
import { logError } from "../errorLogger";

// Domínio canônico registrado no Manus OAuth como redirect URI autorizado.
// Este valor DEVE corresponder exatamente ao que foi cadastrado no painel OAuth do Manus.
const CANONICAL_REDIRECT_URI = "https://atomtech-financeiro.manus.space/api/oauth/callback";

// Validade da sessão: 8 horas (duração de um expediente).
// Sessões curtas reduzem risco de token roubado permanecer válido.
// Não misturar maxAge com expires — usar apenas maxAge para evitar conflito.
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 8; // 8 horas

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  // ─── /api/oauth/callback ──────────────────────────────────────────────────
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    const error = getQueryParam(req, "error");
    const errorDescription = getQueryParam(req, "error_description");

    // Log completo para diagnóstico
    console.log("[OAuth Callback] Received request:", {
      host: req.hostname,
      headers_host: req.headers.host,
      code: code ? `${code.substring(0, 10)}...` : "MISSING",
      state: state ? `${state.substring(0, 20)}...` : "MISSING",
      error: error || "none",
      errorDescription: errorDescription || "none",
      fullUrl: `${req.protocol}://${req.headers.host}${req.originalUrl}`,
    });

    // Evitar cache do callback — sessão inconsistente com cache
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    // Se o OAuth server retornou um erro
    if (error) {
      console.error("[OAuth Callback] OAuth server returned error:", { error, errorDescription });
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
      console.error("[OAuth Callback] Missing code or state:", { code: !!code, state: !!state });
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    // Decodificar o state para diagnóstico
    try {
      const decodedState = atob(state);
      console.log("[OAuth Callback] Decoded state (redirectUri from state):", decodedState);
    } catch (e) {
      console.error("[OAuth Callback] Failed to decode state:", state);
    }

    // SEMPRE usar o redirectUri canônico na troca do token.
    // O state pode conter o domínio personalizado (financedash.company) se o usuário
    // acessou por lá antes do redirecionamento 301. O servidor OAuth do Manus exige
    // que o redirectUri na troca do token corresponda ao que foi enviado no início do fluxo.
    const canonicalState = btoa(CANONICAL_REDIRECT_URI);
    console.log("[OAuth Callback] Using canonical redirectUri:", CANONICAL_REDIRECT_URI);

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, canonicalState);
      console.log("[OAuth Callback] Token exchange successful, accessToken length:", tokenResponse.accessToken?.length);

      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      console.log("[OAuth Callback] Got user info:", { openId: userInfo.openId, name: userInfo.name });

      if (!userInfo.openId) {
        console.error("[OAuth Callback] openId missing from user info:", userInfo);
        res.status(400).json({ error: "openId missing from user info" });
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
        expiresInMs: ONE_YEAR_MS,
      });

      // Destruir qualquer cookie anterior antes de criar novo JWT.
      // Garante que sessões antigas nunca persistem após novo login.
      clearSessionCookie(req, res);

      // Setar novo cookie com sameSite:lax (via getSessionCookieOptions).
      const cookieOptions = getSessionCookieOptions(req);
      // maxAge em milissegundos (Express converte para segundos internamente).
      // Não passar expires junto com maxAge para evitar conflito de validade.
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: SESSION_MAX_AGE_MS });

      console.log("[OAuth Callback] Login successful, redirecting to /");
      res.redirect(302, "/");
    } catch (err: any) {
      console.error("[OAuth Callback] Token exchange failed:", {
        message: err?.message,
        status: err?.response?.status,
        data: err?.response?.data,
        stack: err?.stack?.substring(0, 500),
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
        error: "OAuth callback failed",
        detail: err?.message,
        oauthError: err?.response?.data,
      });
    }
  });

  // ─── /api/logout ─────────────────────────────────────────────────────────
  // Rota Express pura (GET + POST) para logout.
  // Permite que o frontend faça logout via fetch simples ou redirecionamento,
  // sem depender do cliente tRPC (útil quando a sessão já está corrompida).
  const handleLogout = (req: Request, res: Response) => {
    clearSessionCookie(req, res);
    console.log("[Logout] Sessão encerrada:", { ip: req.ip, method: req.method });
    res.status(200).json({ success: true });
  };

  app.get("/api/logout", handleLogout);
  app.post("/api/logout", handleLogout);
}
