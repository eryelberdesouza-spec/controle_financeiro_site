export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Domínio canônico registrado como redirect URI autorizado no Manus OAuth.
// NUNCA usar window.location.origin aqui, pois o domínio personalizado
// (financedash.company) pode não estar na lista de URIs autorizados do OAuth.
const CANONICAL_ORIGIN = "https://atomtech-financeiro.manus.space";

/**
 * Gera a URL de login OAuth.
 *
 * ARQUITETURA DO FLUXO OAuth:
 * 1. `redirectUri` = URL do callback registrada no Manus OAuth (usada na troca do código)
 * 2. `state` = btoa(redirectUri) — o SDK do Manus decodifica o state para extrair o redirectUri
 *    na troca de token. NÃO alterar este valor.
 * 3. `returnTo` = parâmetro extra na URL do callback para indicar para onde redirecionar
 *    o usuário APÓS o login (ex: "https://financedash.company"). Passado via query string
 *    no redirectUri para que o callback o receba como req.query.returnTo.
 *
 * IMPORTANTE: o state DEVE conter btoa(redirectUri) para que o SDK funcione corretamente.
 * O destino pós-login é controlado pelo parâmetro `returnTo`, não pelo `state`.
 */
export const getLoginUrl = (returnPath?: string) => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;

  // Determinar o domínio de origem do usuário (para redirecionar de volta após login)
  // Usa window.location.origin para suportar tanto atomtech-financeiro.manus.space
  // quanto financedash.company sem hardcoding
  const currentOrigin = typeof window !== "undefined"
    ? window.location.origin
    : CANONICAL_ORIGIN;

  // Construir o returnTo com o origin atual do usuário
  const returnToPath = returnPath || "/";
  const returnTo = `${currentOrigin}${returnToPath}`;

  // redirectUri: URL do callback canônica registrada no OAuth
  // Incluir returnTo como query param para que o callback saiba para onde redirecionar
  const callbackBase = `${CANONICAL_ORIGIN}/api/oauth/callback`;
  const callbackUrl = new URL(callbackBase);
  callbackUrl.searchParams.set("returnTo", returnTo);
  const redirectUri = callbackUrl.toString();

  // state: btoa(redirectUri) — necessário para o SDK do Manus trocar o código pelo token
  const state = btoa(redirectUri);

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};
