import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions, clearSessionCookie } from "./cookies";
import { sdk } from "./sdk";
import { logError } from "../errorLogger";

// Domínio canônico registrado no Manus OAuth como redirect URI autorizado.
// Este valor DEVE corresponder exatamente ao que foi cadastrado no painel OAuth do Manus.
const CANONICAL_REDIRECT_URI = "https://atomtech-financeiro.manus.space/api/oauth/callback";

// Domínios autorizados para redirecionamento pós-login (evitar open redirect)
const ALLOWED_RETURN_ORIGINS = [
  "https://atomtech-financeiro.manus.space",
  "https://financedash.company",
  "https://www.financedash.company",
];

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
    // returnTo é um parâmetro opcional passado pelo getLoginUrl para indicar
    // para onde redirecionar após o login (ex: "https://financedash.company")
    const returnTo = getQueryParam(req, "returnTo");

    // Log completo para diagnóstico
    console.log("[OAuth Callback] Received request:", {
      host: req.hostname,
      code: code ? `${code.substring(0, 10)}...` : "MISSING",
      state: state ? `${state.substring(0, 20)}...` : "MISSING",
      returnTo: returnTo || "not set",
      error: error || "none",
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

    // O state contém btoa(redirectUri) — necessário para a troca de token com o servidor OAuth.
    // O SDK decodifica o state para extrair o redirectUri usado na troca.
    // IMPORTANTE: usar o state original recebido do OAuth server, não um state construído aqui.
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      console.log("[OAuth Callback] Token exchange successful");

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

      // Determinar para onde redirecionar após o login.
      // Prioridade: 1) parâmetro returnTo (passado pelo getLoginUrl), 2) "/"
      let redirectTarget = "/";
      if (returnTo) {
        try {
          const targetUrl = new URL(returnTo);
          const targetOrigin = `${targetUrl.protocol}//${targetUrl.host}`;
          if (ALLOWED_RETURN_ORIGINS.includes(targetOrigin)) {
            // Redirecionar para o caminho dentro do domínio autorizado
            redirectTarget = targetUrl.pathname || "/";
          } else {
            console.warn("[OAuth Callback] returnTo origin não autorizado, usando /:", targetOrigin);
          }
        } catch (e) {
          console.warn("[OAuth Callback] returnTo inválido, usando /:", returnTo);
        }
      }

      console.log("[OAuth Callback] Login successful, redirecting to:", redirectTarget);
      res.redirect(302, redirectTarget);
    } catch (err: any) {
      console.error("[OAuth Callback] Token exchange failed:", {
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
