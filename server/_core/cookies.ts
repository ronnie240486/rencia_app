import type { CookieOptions, Request } from "express";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string) {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");
  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

/**
 * Detect if the request is coming from a Manus proxy/dev environment.
 * In dev proxy environments, sameSite=none causes cookies to be blocked
 * because the OAuth redirect comes from a different origin (api.manus.im).
 * Using sameSite=lax allows cookies to be sent on top-level navigations (redirects).
 */
function isDevProxyEnv(req: Request): boolean {
  const host = req.hostname ?? "";
  // Manus dev proxy domains
  if (host.endsWith(".manus.computer") || host.endsWith(".manus.space")) return true;
  // Local development
  if (LOCAL_HOSTS.has(host) || isIpAddress(host)) return true;
  return false;
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const secure = isSecureRequest(req);
  // Use "lax" in dev/proxy environments so that cookies survive OAuth redirects.
  // Use "none" only in production with a stable domain where cross-site cookies are needed.
  const sameSite: "lax" | "none" = isDevProxyEnv(req) ? "lax" : "none";

  return {
    httpOnly: true,
    path: "/",
    sameSite,
    secure,
  };
}
