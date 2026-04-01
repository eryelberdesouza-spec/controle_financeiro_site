export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * URI de callback registrada no Manus OAuth.
 * DEVE ser exatamente igual ao valor cadastrado no painel OAuth — sem query params.
 * O Manus OAuth valida o redirectUri por correspondência exata.
 */
const CANONICAL_REDIRECT_URI =
  "https://atomtech-financeiro.manus.space/api/oauth/callback";

/**
 * Gera a URL de login OAuth.
 *
 * REGRAS IMPORTANTES:
 * 1. `redirectUri` é a URL canônica do callback (sem query params).
 *    O Manus OAuth valida por correspondência exata com o URI cadastrado.
 * 2. `state` = btoa(redirectUri) — o SDK do Manus decodifica o state para
 *    extrair o redirectUri na troca de token. NUNCA alterar este valor.
 * 3. Após o login, o callback redireciona para a raiz do domínio (/).
 *    O destino pós-login é sempre "/" (raiz do domínio atual).
 */
export const getLoginUrl = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;

  const redirectUri = CANONICAL_REDIRECT_URI;
  const state = btoa(redirectUri);

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};
