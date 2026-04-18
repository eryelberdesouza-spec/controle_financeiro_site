import { COOKIE_NAME } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions, clearSessionCookie } from "./cookies";
import { sdk } from "./sdk";
import { logError } from "../errorLogger";

/** Duração da sessão: 8 horas. */
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 8;

export function registerOAuthRoutes(app: Express) {

  // ─── POST /api/auth/login ─────────────────────────────────────────────────
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: "Email e senha são obrigatórios" });
        return;
      }

      // Busca usuário pelo email
      const user = await db.getUserByEmail(email);

      if (!user) {
        res.status(401).json({ error: "Email ou senha inválidos" });
        return;
      }

      if (!user.ativo) {
        res.status(401).json({ error: "Usuário inativo" });
        return;
      }

      // Verifica senha
      const bcrypt = await import("bcryptjs");
      const senhaValida = await bcrypt.compare(password, user.passwordHash || "");

      if (!senhaValida) {
        res.status(401).json({ error: "Email ou senha inválidos" });
        return;
      }

      // Atualiza último login
      await db.upsertUser({
        openId: user.openId,
        lastSignedIn: new Date(),
      });

      // Cria sessão JWT
      const sessionToken = await sdk.createSessionToken(user.openId, {
        name: user.name || "",
        expiresInMs: SESSION_MAX_AGE_MS,
      });

      clearSessionCookie(req, res);

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: SESSION_MAX_AGE_MS,
      });

      res.status(200).json({ success: true });
    } catch (err: any) {
      console.error("[Auth] Falha no login:", err?.message);
      await logError({
        nivel: "error",
        origem: "login",
        acao: "email_login",
        mensagem: err?.message ?? "Falha no login",
        stack: err?.stack,
        ip: req.ip,
        contexto: {},
      });
      res.status(500).json({ error: "Erro interno no login" });
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
