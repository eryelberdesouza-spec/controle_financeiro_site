import express, { type Express, type Request, type Response } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);

  // Fallback SPA: apenas GET, apenas rotas não-API
  app.get("*", async (req: Request, res: Response, next) => {
    // Rotas de API devem retornar 404 JSON, não o index.html
    if (req.path.startsWith("/api")) {
      res.status(404).json({ error: "API route not found" });
      return;
    }

    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    "public"
  );

  if (!fs.existsSync(distPath)) {
    console.error(
      `[SIGECO] Build directory not found: ${distPath}. Run 'pnpm build' first.`
    );
  }

  // Servir arquivos estáticos (JS, CSS, imagens, etc.)
  app.use(express.static(distPath, {
    // Não enviar index.html automaticamente para rotas — o fallback abaixo faz isso
    index: false,
  }));

  // Fallback SPA: TODAS as rotas GET que não são /api retornam index.html
  // Isso garante que F5 em /dashboard, /usuarios, /financeiro, etc. funcione
  app.get("*", (req: Request, res: Response) => {
    // Rotas de API inexistentes retornam 404 JSON
    if (req.path.startsWith("/api")) {
      res.status(404).json({ error: "API route not found" });
      return;
    }

    const indexPath = path.resolve(distPath, "index.html");

    if (!fs.existsSync(indexPath)) {
      res.status(503).send("Application not built yet. Run 'pnpm build'.");
      return;
    }

    res.sendFile(indexPath);
  });
}
