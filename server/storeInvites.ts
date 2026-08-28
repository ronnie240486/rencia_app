import { createHash, randomBytes } from "node:crypto";
import { isManagedAppId, MANAGED_APP_CATALOG, type ManagedAppId } from "../shared/appCatalog";

export type StoreInviteAudience = "revenda" | "cliente";

export function createStoreInviteToken() {
  return randomBytes(24).toString("base64url");
}

export function hashStoreInviteToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function normalizeStoreInviteApps(value: unknown): ManagedAppId[] {
  const raw = Array.isArray(value) ? value : typeof value === "string" ? safelyParse(value) : [];
  if (!Array.isArray(raw)) return [];
  return Array.from(new Set(raw.filter((item): item is ManagedAppId => typeof item === "string" && isManagedAppId(item))));
}

export function serializeStoreInviteApps(apps: unknown) {
  return JSON.stringify(normalizeStoreInviteApps(apps));
}

/** Mantém no convite somente os cartões de download dos aplicativos efetivamente liberados. */
export function filterDownloadsForInvite<T extends { slug: string }>(downloads: T[], allowedApps: unknown): T[] {
  const allowedSlugs = new Set<string>(normalizeStoreInviteApps(allowedApps).map((appId) => MANAGED_APP_CATALOG[appId].publicSlug));
  return downloads.filter((download) => allowedSlugs.has(download.slug));
}

function safelyParse(value: string): unknown {
  try { return JSON.parse(value); } catch { return []; }
}
