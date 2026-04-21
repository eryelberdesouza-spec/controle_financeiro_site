import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import cors from "cors";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./routers";
import { authRouter } from "./authRouter";
import { createContext } from "./_core/trpc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Middlewares essenciais
  app.use(cookieParser());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  // CORS para desenvolvimento local
  app.use(
    cors({
      origin: process.env.NODE_ENV === "production"
        ? process.env.FRONTEND_URL ?? true
        : "http://localhost:5173",
      credentials: true,
    })
  );

  // ─── Rotas de Auth (login/logout/me/changePassword) ───────────────────────
  app.use(
    "/api/auth",
    createExpressMiddleware({
      router: authRouter,
      createContext,
    })
  );

  // ─── Rotas tRPC principais ─────────────────────────────────────────────────
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // ─── Serve arquivos estáticos do frontend ─────────────────────────────────
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // ─── SPA fallback (DEVE ser o último) ─────────────────────────────────────
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`🚀 SIGECO Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
