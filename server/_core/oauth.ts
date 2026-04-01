import { COOKIE_NAME } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions, clearSessionCookie } from "./cookies";
import { sdk } from "./sdk";
import { logError } from "../errorLogger";

/**
 * URI de callback registrada no Manus OAuth.
 * DEVE ser exatamente igual ao valor cadastrado no painel OAuth — sem query params.
 * O Manus OAuth valida o redirectUri por correspondência exata.
 *
 * Este valor é passado diretamente para exchangeCodeForToken.
 * O state recebido no callback é ignorado na troca de token (é apenas CSRF).
 */
const CANONICAL_REDIRECT_URI =
  "https://atomtech-financeiro.manus.space/api/oauth/callback";

/** Duração da sessão: 8 horas. */
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 8;

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  // ─── GET /api/oauth/callback ──────────────────────────────────────────────
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    // Sem cache — evita sessão inconsistente
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    const code = getQueryParam(req, "code");
    const error = getQueryParam(req, "error");
    const errorDescription = getQueryParam(req, "error_description");
    // state é recebido mas ignorado na troca de token — é apenas CSRF
    // O redirectUri canônico é usado diretamente na troca

    // Se o OAuth server retornou um erro explícito
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
      console.error("[OAuth] Parâmetro 'code' ausente no callback:", {
        query: req.query,
      });
      res.status(400).json({ error: "code é obrigatório" });
      return;
    }

    try {
      // Troca o código pelo token usando o redirectUri canônico diretamente.
      // O state NÃO é usado aqui — o SDK foi corrigido para aceitar redirectUri.
      const tokenResponse = await sdk.exchangeCodeForToken(
        code,
        CANONICAL_REDIRECT_URI
      );

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

      // Setar novo cookie de sessão (HttpOnly, SameSite:Lax, Secure, 8h)
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: SESSION_MAX_AGE_MS,
      });

      // Redirect fixo para a raiz — URL absoluta para limpar ?code= da barra de endereços
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

  // ─── GET + POST /api/logout ───────────────────────────────────────────────
  const handleLogout = (req: Request, res: Response) => {
    clearSessionCookie(req, res);
    res.status(200).json({ success: true });
  };

  app.get("/api/logout", handleLogout);
  app.post("/api/logout", handleLogout);
}
