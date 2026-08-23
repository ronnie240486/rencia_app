export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL at runtime so redirect URI reflects the current origin.
// returnPath: the frontend path to redirect to after successful login (e.g. "/dashboard")
export const getLoginUrl = (returnPath = "/dashboard") => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;

  // Quando o app roda fora do ambiente da Manus (ex: Railway) essas
  // variáveis de build não existem. Nesse caso, em vez de tentar montar
  // uma URL inválida e quebrar a aplicação, usamos a página de login
  // local (email/senha) que já existe no app.
  if (!oauthPortalUrl || !appId) {
    return "/login";
  }

  try {
    const redirectUri = `${window.location.origin}/api/oauth/callback`;
    // Encode both the redirectUri and the returnPath so the server can redirect correctly
    const statePayload = JSON.stringify({ redirectUri, returnPath });
    const state = btoa(statePayload);

    const url = new URL(`${oauthPortalUrl}/app-auth`);
    url.searchParams.set("appId", appId);
    url.searchParams.set("redirectUri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("type", "signIn");

    return url.toString();
  } catch (error) {
    // Qualquer falha ao montar a URL do OAuth da Manus não deve derrubar
    // a aplicação — caímos para o login local como rede de segurança.
    console.error("[Auth] Failed to build Manus OAuth URL, falling back to local login", error);
    return "/login";
  }
};
