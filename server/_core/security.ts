/**
 * security.ts — Módulo centralizado de segurança do servidor
 *
 * Implementa:
 * - Helmet: headers HTTP de segurança (XSS, clickjacking, MIME sniffing, etc.)
 * - Rate Limiting: proteção contra brute force e DDoS por IP e por usuário
 * - Sanitização XSS: limpeza de campos de texto livre
 * - CORS: restrição de origens em produção
 * - Log de acessos negados
 */

import type { Express, Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { filterXSS } from "xss";

const isProd = process.env.NODE_ENV === "production";

// === Helmet: Headers de Segurança HTTP ===
export function applyHelmet(app: Express) {
  app.use(
    helmet({
      // Content-Security-Policy: restringe origens de scripts, estilos, etc.
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'", // necessário para Vite HMR em dev
            "'unsafe-eval'",   // necessário para Vite em dev
            "https://fonts.googleapis.com",
          ],
          styleSrc: [
            "'self'",
            "'unsafe-inline'", // necessário para Tailwind/shadcn
            "https://fonts.googleapis.com",
          ],
          fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
          imgSrc: ["'self'", "data:", "blob:", "https:"],
          connectSrc: [
            "'self'",
            "https://api.manus.im",
            "https://*.manus.im",
            "wss:", // WebSocket para HMR
          ],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: isProd ? [] : null,
        },
      },
      // Previne clickjacking
      frameguard: { action: "deny" },
      // Previne MIME sniffing
      noSniff: true,
      // Força HTTPS em produção
      hsts: isProd
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : false,
      // Remove header X-Powered-By
      hidePoweredBy: true,
      // XSS Protection para browsers antigos
      xssFilter: true,
      // Referrer Policy
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    })
  );
}

// === Rate Limiting ===

/**
 * Rate limit geral: 200 req/min por IP para todas as rotas
 */
export const globalRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: isProd ? 300 : 2000, // mais permissivo em dev
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas requisições. Aguarde um momento e tente novamente." },
  skip: (req) => req.path.startsWith("/__manus__") || !isProd, // não limitar em dev
});

/**
 * Rate limit para autenticação: 20 tentativas/15min por IP (anti brute-force)
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas tentativas de autenticação. Aguarde 15 minutos." },
});

/**
 * Rate limit para API tRPC: 300 req/min por IP
 */
export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: isProd ? 500 : 5000, // mais permissivo em dev
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Limite de requisições da API atingido. Aguarde um momento." },
  skip: () => !isProd, // não limitar em dev
});

// === CORS ===
export function applyCors(app: Express) {
  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;

    // Em desenvolvimento, aceita qualquer origem local
    if (!isProd) {
      if (origin) res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Cookie");
      if (req.method === "OPTIONS") return res.sendStatus(204);
      return next();
    }

    // Em produção: domínios canônicos + Manus + portal OAuth
    // Domínio canônico: financedash.company
    // Domínio Manus (legado): atomtech-financeiro.manus.space
    const allowedOrigins = [
      "https://financedash.company",
      "https://www.financedash.company",
      "https://atomtech-financeiro.manus.space",
      "https://financedash-ecw2qmcc.manus.space",
      process.env.VITE_OAUTH_PORTAL_URL,
      "https://manus.im",
    ].filter(Boolean) as string[];

    const isAllowed =
      !origin || // requests sem origin (curl, apps mobile) são permitidos
      allowedOrigins.includes(origin);

    if (isAllowed && origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }

    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Cookie");

    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });
}

// === Log de Acessos Negados ===
export function applySecurityLogger(app: Express) {
  app.use((req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.json.bind(res);
    res.json = function (body: unknown) {
      if (res.statusCode === 401 || res.statusCode === 403) {
        const ip =
          (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
          req.ip;
        console.warn(
          `[SECURITY] ${res.statusCode} ${req.method} ${req.path} — IP: ${ip} — ${new Date().toISOString()}`
        );
      }
      return originalSend(body);
    };
    next();
  });
}

// === Sanitização XSS ===

/**
 * Sanitiza uma string removendo tags HTML e scripts maliciosos.
 * Use em campos de texto livre antes de salvar no banco.
 */
export function sanitizeText(input: string | null | undefined): string {
  if (!input) return "";
  return filterXSS(input, {
    whiteList: {}, // Nenhuma tag HTML permitida
    stripIgnoreTag: true,
    stripIgnoreTagBody: ["script", "style"],
  });
}

/**
 * Sanitiza um objeto recursivamente, aplicando sanitizeText em todos os campos string.
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj };
  for (const key in result) {
    const val = result[key];
    if (typeof val === "string") {
      (result as Record<string, unknown>)[key] = sanitizeText(val);
    } else if (val && typeof val === "object" && !Array.isArray(val) && !(val instanceof Date)) {
      (result as Record<string, unknown>)[key] = sanitizeObject(val as Record<string, unknown>);
    }
  }
  return result;
}

// === Aplicar tudo de uma vez ===
export function applySecurityMiddleware(app: Express) {
  applyHelmet(app);
  applyCors(app);
  applySecurityLogger(app);
  app.use(globalRateLimit);
}
