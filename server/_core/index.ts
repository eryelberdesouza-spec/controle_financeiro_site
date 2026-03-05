import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import {
  applySecurityMiddleware,
  apiRateLimit,
  authRateLimit,
} from "./security";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // 1. Trust proxy: necessário para rate limit funcionar atrás de proxy/load balancer
  // 'loopback' = confia apenas em proxies locais (127.0.0.1, ::1)
  app.set("trust proxy", "loopback");

  // 2. Segurança: Helmet + CORS + Rate Limit global
  applySecurityMiddleware(app);

  // 3. Body parser (limite reduzido para mitigar ataques de payload grande)
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  // 4. Rate limit específico para autenticação (anti brute-force)
  app.use("/api/oauth", authRateLimit);

  // 5. Rate limit para API tRPC
  app.use("/api/trpc", apiRateLimit);

  // 6. OAuth callback
  registerOAuthRoutes(app);

  // 7. tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
      onError: ({ error, path }) => {
        // Log erros internos sem expor detalhes ao cliente
        if (error.code === "INTERNAL_SERVER_ERROR") {
          console.error(`[tRPC Error] ${path}:`, error.message);
        }
      },
    })
  );

  // 8. Frontend
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
