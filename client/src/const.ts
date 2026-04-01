export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * URL do callback registrada no Manus OAuth.
 * DEVE ser exatamente igual ao valor cadastrado no painel OAuth — sem query params.
 * O Manus OAuth valida o redirectUri por correspondência exata.
 */
const CANONICAL_REDIRECT_URI = "https://atomtech-financeiro.manus.space/api/oauth/callback";

/**
 * Gera a URL de login OAuth.
 *
 * REGRAS IMPORTANTES:
 * 1. `redirectUri` DEVE ser a URL limpa do callback (sem ?returnTo ou qualquer query param).
 *    O Manus OAuth valida por correspondência exata com o URI cadastrado no painel.
 * 2. `state` = btoa(redirectUri) — o SDK do Manus decodifica o state para extrair o
 *    redirectUri na troca de token. NUNCA alterar este valor.
 * 3. Após o login, o callback redireciona para a raiz do domínio atual via req.hostname.
 *    Não é necessário passar returnTo — o redirect pós-login é sempre para "/".
 */
export const getLoginUrl = (returnPath?: string) => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;

  // redirectUri limpo — sem query params extras
  const redirectUri = CANONICAL_REDIRECT_URI;

  // state = btoa(redirectUri) — necessário para o SDK do Manus trocar o código pelo token
  const state = btoa(redirectUri);

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};
