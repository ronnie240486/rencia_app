export type PlaylistAccessFields = {
  serverUrl: string;
  username: string;
  password: string;
};

/**
 * Extrai os campos que os APKs antigos usam sem converter o protocolo,
 * porta ou valores de autenticação da URL original.
 */
export function buildPlaylistAccessFields(rawUrl: string): PlaylistAccessFields {
  const value = rawUrl.trim();
  try {
    const parsed = new URL(value);
    return {
      serverUrl: `${parsed.protocol}//${parsed.host}`,
      username: parsed.searchParams.get("username") || "",
      password: parsed.searchParams.get("password") || "",
    };
  } catch {
    return { serverUrl: value, username: "", password: "" };
  }
}
