import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { logError } from "../errorLogger";

// Domínio canônico registrado no Manus OAuth como redirect URI autorizado.
// Este valor DEVE corresponder exatamente ao que foi cadastrado no painel OAuth do Manus.
const CANONICAL_REDIRECT_URI = "https://atomtech-financeiro.manus.space/api/oauth/callback";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
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
    let decodedState = "";
    try {
      decodedState = atob(state);
      console.log("[OAuth Callback] Decoded state (redirectUri from state):", decodedState);
    } catch (e) {
      console.error("[OAuth Callback] Failed to decode state:", state);
    }

    // SEMPRE usar o redirectUri canônico na troca do token.
    // O state pode conter o domínio personalizado (financedash.company) se o usuário
    // acessou por lá antes do redirecionamento 301. O servidor OAuth do Manus exige
    // que o redirectUri na troca do token corresponda ao que foi enviado no início do fluxo.
    // Por isso, forçamos o valor canônico tanto no início (client/src/const.ts) quanto aqui.
    const canonicalState = btoa(CANONICAL_REDIRECT_URI);
    console.log("[OAuth Callback] Using canonical redirectUri:", CANONICAL_REDIRECT_URI);
    console.log("[OAuth Callback] Canonical state (base64):", canonicalState);

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

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

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
}
