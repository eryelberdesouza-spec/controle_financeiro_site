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
  // Em produção (Manus), a aplicação fica atrás de um proxy reverso
  app.set("trust proxy", 1);

  // 1b. Redirecionamento de domínio personalizado para domínio OAuth autorizado
  // O domínio financedash.company não está registrado como redirect URI no OAuth do Manus.
  // Redireciona permanentemente para o domínio autorizado para garantir login funcional.
  const AUTHORIZED_DOMAIN = "atomtech-financeiro.manus.space";
  const CUSTOM_DOMAINS = ["financedash.company", "www.financedash.company"];
  app.use((req: any, res: any, next: any) => {
    const host = (req.hostname || req.headers.host || "").toLowerCase();
    const isCustomDomain = CUSTOM_DOMAINS.some(d => host === d || host.endsWith("." + d));
    if (isCustomDomain && process.env.NODE_ENV !== "development") {
      const targetUrl = `https://${AUTHORIZED_DOMAIN}${req.originalUrl}`;
      console.log(`[Domain Redirect] ${host} -> ${AUTHORIZED_DOMAIN}`);
      return res.redirect(301, targetUrl);
    }
    next();
  });

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

  // 8. Webhook ZapSign (público, sem autenticação tRPC)
  app.post("/api/webhooks/zapsign", async (req, res) => {
    try {
      const body = req.body as any;
      const externalId: string = body?.document?.external_id ?? body?.external_id ?? "";
      const docStatus: string = body?.document?.status ?? body?.status ?? "";
      const signedFileUrl: string = body?.document?.signed_file ?? body?.signed_file ?? "";

      // Identificar proposta pelo external_id (padrão: "proposta-{id}")
      const match = externalId.match(/^proposta-(\d+)$/);
      if (!match) {
        res.status(200).json({ received: true, action: "ignored", reason: "external_id não reconhecido" });
        return;
      }
      const propostaId = parseInt(match[1], 10);

      const { getDb } = await import("../db");
      const { propostas } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const { registrarAuditoria } = await import("../routers/auditoria");

      const db = await getDb();
      if (!db) { res.status(200).json({ received: true }); return; }

      const [proposta] = await db.select().from(propostas).where(eq(propostas.id, propostaId)).limit(1);
      if (!proposta) { res.status(200).json({ received: true, action: "ignored", reason: "proposta não encontrada" }); return; }

      // Evitar processamento duplicado
      if (proposta.zapsignStatus === "assinado") {
        res.status(200).json({ received: true, action: "already_processed" });
        return;
      }

      if (docStatus === "finished" || docStatus === "signed") {
        // Atualizar proposta para assinado
        await db.update(propostas).set({
          zapsignStatus: "assinado",
          zapsignAssinadoEm: new Date(),
          zapsignPdfUrl: signedFileUrl || null,
          status: "APROVADA",
        } as any).where(eq(propostas.id, propostaId));

        await registrarAuditoria({
          entidade: "proposta",
          entidadeId: propostaId,
          acao: "webhook_zapsign",
          usuarioNome: "ZapSign (webhook)",
          valorAnterior: { zapsignStatus: proposta.zapsignStatus },
          valorNovo: { zapsignStatus: "assinado", docStatus, signedFileUrl },
        });

        // Conversão automática em contrato
        try {
          const { conversaoRouter } = await import("../routers/conversao");
          // Chamar a procedure diretamente via helper interno
          const { getNextNumeroControleRecebimento, createRecebimento, createRecebimentoParcelas } = await import("../db");
          const { contratos, clientes, projetos, propostaItens } = await import("../../drizzle/schema");
          const { desc, sql } = await import("drizzle-orm");

          // Buscar itens da proposta
          const itens = await db.select().from(propostaItens).where(eq(propostaItens.propostaId, propostaId));
          if (itens.length > 0 && proposta.clienteId && !proposta.convertidaEmContrato) {
            // Gerar número do contrato
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, "0");
            const rows = await db.select({ numero: contratos.numero }).from(contratos);
            let maxNum = 0;
            for (const row of rows) {
              if (!row.numero) continue;
              const m = row.numero.match(/(\d+)\s*$/);
              if (m) { const n = parseInt(m[1], 10); if (n > maxNum) maxNum = n; }
            }
            const numeroContrato = `CTR-${year}-${month}-${String(maxNum + 1).padStart(3, "0")}`;
            const objetoContrato = proposta.escopoDetalhado ?? itens.map(i => i.descricao).join("; ");

            const [contratoResult] = await db.execute(sql`
              INSERT INTO contratos (numero, objeto, tipo, status, clienteId, projetoId, valorTotal, propostaOrigemId, origemDescricao, createdBy)
              VALUES (${numeroContrato}, ${objetoContrato}, 'prestacao_servico', 'ativo', ${proposta.clienteId}, ${proposta.projetoId ?? null}, ${proposta.valorTotal ?? "0"}, ${propostaId}, ${`Gerado automaticamente via ZapSign da proposta ${proposta.numero}`}, 1)
            `);
            const contratoId = (contratoResult as any).insertId;

            // Gerar 1 recebimento à vista (padrão)
            const valorTotal = parseFloat(proposta.valorTotal ?? "0");
            if (valorTotal > 0) {
              const numeroControle = await getNextNumeroControleRecebimento();
              const vencimento = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
              const [cliRows] = await db.select({ nome: clientes.nome }).from(clientes).where(eq(clientes.id, proposta.clienteId!)).limit(1);
              const nomeCliente = (cliRows as any)?.nome ?? "Cliente";
              const [recResult] = await createRecebimento({
                numeroControle, numeroContrato, nomeRazaoSocial: nomeCliente,
                descricao: `${objetoContrato.substring(0, 100)} — ${proposta.numero}`,
                tipoRecebimento: "Pix", clienteId: proposta.clienteId, centroCustoId: null,
                contratoId, projetoId: proposta.projetoId ?? null,
                valorTotal: valorTotal.toString(), valorEquipamento: "0", valorServico: valorTotal.toString(),
                juros: "0", desconto: "0", quantidadeParcelas: 1, parcelaAtual: 1,
                dataVencimento: vencimento, status: "Pendente", geradoAutomaticamente: true, createdBy: 1,
              } as any);
              const recebimentoId = (recResult as any).insertId;
              await createRecebimentoParcelas([{ recebimentoId, numeroParcela: 1, valor: valorTotal.toString(), dataVencimento: vencimento, status: "Pendente" } as any]);
            }

            // Marcar proposta como convertida
            await db.update(propostas).set({ convertidaEmContrato: true, contratoId, status: "EM_CONTRATACAO" } as any).where(eq(propostas.id, propostaId));

            await registrarAuditoria({
              entidade: "proposta", entidadeId: propostaId, acao: "converter_em_contrato",
              usuarioNome: "ZapSign (automático)",
              valorAnterior: { convertidaEmContrato: false },
              valorNovo: { convertidaEmContrato: true, contratoId, contratoNumero: numeroContrato },
            });
          }
        } catch (convErr: any) {
          console.error("[ZapSign Webhook] Erro na conversão automática:", convErr.message);
        }

        res.status(200).json({ received: true, action: "signed_and_converted" });
      } else if (docStatus === "refused" || docStatus === "cancelled") {
        await db.update(propostas).set({ zapsignStatus: "recusado" } as any).where(eq(propostas.id, propostaId));
        await registrarAuditoria({
          entidade: "proposta", entidadeId: propostaId, acao: "webhook_zapsign",
          usuarioNome: "ZapSign (webhook)",
          valorAnterior: { zapsignStatus: proposta.zapsignStatus },
          valorNovo: { zapsignStatus: "recusado", docStatus },
        });
        res.status(200).json({ received: true, action: "refused" });
      } else {
        res.status(200).json({ received: true, action: "status_update", docStatus });
      }
    } catch (err: any) {
      console.error("[ZapSign Webhook] Erro:", err.message);
      res.status(200).json({ received: true, error: "internal" });
    }
  });

  // 9. Frontend
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
