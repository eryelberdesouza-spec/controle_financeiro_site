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
 * DESIGN DO FLUXO:
 * - redirectUri: URI canônico fixo, sem query params extras.
 * - state: UUID aleatório gerado a cada chamada (token CSRF puro).
 *   O servidor ignora o state na troca de token — o redirectUri é passado diretamente.
 * - Após o login, o callback redireciona fixamente para "/".
 * - Não existe parâmetro returnTo em nenhuma parte do fluxo.
 */
export const getLoginUrl = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;

  const redirectUri = CANONICAL_REDIRECT_URI;

  // State é um UUID aleatório — token CSRF puro, sem dados embutidos.
  // O servidor NÃO decodifica o state para extrair o redirectUri.
  const state = crypto.randomUUID();

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};
