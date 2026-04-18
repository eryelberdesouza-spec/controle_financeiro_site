import { COOKIE_NAME } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions, clearSessionCookie } from "./cookies";
import { sdk } from "./sdk";
import { logError } from "../errorLogger";

const ALLOWED_HOSTS = [
  "atomtech-financeiro.manus.space",
  "www.financedash.company",
  "financedash.company",
];

function getCanonicalRedirectUri(req: Request): string {
  const host = req.hostname || req.headers.host || ALLOWED_HOSTS[0];
  const cleanHost = Array.isArray(host) ? host[0] : host.split(":")[0];
  const validHost = ALLOWED_HOSTS.includes(cleanHost)
    ? cleanHost
    : ALLOWED_HOSTS[0];
  return `https://${validHost}/api/oauth/callback`;
}

/** Duração da sessão: 8 horas. */
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 8;

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export fun
