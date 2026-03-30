export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Domínio canônico registrado como redirect URI autorizado no Manus OAuth.
// NUNCA usar window.location.origin aqui, pois o domínio personalizado
// (financedash.company) não está na lista de URIs autorizados do OAuth.
const CANONICAL_ORIGIN = "https://atomtech-financeiro.manus.space";

// Generate login URL always using the canonical origin as redirectUri,
// so the OAuth server always receives an authorized redirect URI.
export const getLoginUrl = (returnPath?: string) => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  const redirectUri = `${CANONICAL_ORIGIN}/api/oauth/callback`;
  const state = btoa(redirectUri);

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};
