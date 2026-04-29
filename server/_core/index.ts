import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { sdk } from "./sdk";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions, clearSessionCookie } from "./cookies";
import { serveStatic, setupVite } from "./vite";
import * as db from "../db";
import bcrypt from "bcryptjs";

async function startServer() {
  const app = express();
  const server = createServer(app);

  // ─── Middlewares básicos ──────────────────────────────────────────────────
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  // ─── Login por email/senha ────────────────────────────────────────────────
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: "Email e senha são obrigatórios" });
        return;
      }

      const user = await db.getUserByEmail(email.toLowerCase().trim());

      if (!user || !user.passwordHash) {
        res.status(401).json({ error: "Email ou senha incorretos" });
        return;
      }

      if (!user.ativo) {
        res.status(403).json({ error: "Conta desativada. Contate o administrador." });
        return;
      }

      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) {
        res.status(401).json({ error: "Email ou senha incorretos" });
        return;
      }

      const token = await sdk.createSessionToken(user.openId, {
        name: user.name ?? user.email ?? "",
      });

      // Destruir cookie anterior antes de criar novo — evita sessões fantasmas
      clearSessionCookie(req, res);

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, cookieOptions);

      res.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (err) {
      console.error("[Login] Erro:", err);
      res.status(500).json({ error: "Erro interno. Tente novamente." });
    }
  });

  // ─── Fallback OAuth callback: redireciona para /login ─────────────────────
  // O Manus Platform pode redirecionar para esta rota com ?code=&state= quando
  // há sessões OAuth antigas no browser. Em vez de 404, redirecionamos para /login.
  app.get("/api/oauth/callback", (_req, res) => {
    res.redirect(302, "/login");
  });
  // Também capturar o login OAuth (caso algum link antigo ainda aponte)
  app.get("/api/oauth/login", (_req, res) => {
    res.redirect(302, "/login");
  });

  // ─── Logout ───────────────────────────────────────────────────────────────
  const handleLogout = (req: express.Request, res: express.Response) => {
    clearSessionCookie(req, res);
    res.status(200).json({ success: true });
  };
  app.get("/api/logout", handleLogout);
  app.post("/api/logout", handleLogout);

  // ─── tRPC API ─────────────────────────────────────────────────────────────
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
      onError: ({ error, path }) => {
        if (error.code === "INTERNAL_SERVER_ERROR") {
          console.error(`[tRPC Error] ${path}:`, error.message);
        }
      },
    })
  );

  // ─── Frontend (Vite em dev, estático em prod) ─────────────────────────────
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || "3000");
  server.listen(port, () => {
    console.log(`✅ SIGECO rodando em http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
