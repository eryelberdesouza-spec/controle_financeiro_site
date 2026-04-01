export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Domínio canônico registrado como redirect URI autorizado no Manus OAuth.
// NUNCA usar window.location.origin aqui, pois o domínio personalizado
// (financedash.company) não está na lista de URIs autorizados do OAuth.
const CANONICAL_ORIGIN = "https://atomtech-financeiro.manus.space";

/**
 * Gera a URL de login OAuth.
 *
 * O campo `state` é usado pelo servidor de callback para saber para onde
 * redirecionar o usuário APÓS o login bem-sucedido.
 *
 * IMPORTANTE: o `state` deve conter o ORIGIN do frontend (não a URL do callback).
 * O servidor OAuth devolve o state intacto ao callback, e o callback usa esse
 * valor para construir o redirect final para o usuário.
 *
 * O `redirectUri` é a URL do callback registrada no Manus OAuth — usada apenas
 * para a troca do código de autorização pelo token de acesso.
 */
export const getLoginUrl = (returnPath?: string) => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;

  // redirectUri: URL do callback registrada no OAuth (usada na troca do código)
  const redirectUri = `${CANONICAL_ORIGIN}/api/oauth/callback`;

  // state: origin do frontend + caminho de retorno (usado pelo callback para redirecionar após login)
  // NÃO usar a URL do callback como state — isso causaria loop infinito
  const returnTo = returnPath ? `${CANONICAL_ORIGIN}${returnPath}` : CANONICAL_ORIGIN;
  const state = btoa(returnTo);

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};
