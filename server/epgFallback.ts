export type EpgFallbackSource = "device" | "default" | "none";

export function resolveEpgUrl(deviceUrl: string | null | undefined, defaultUrl: string | null | undefined) {
  const individual = deviceUrl?.trim();
  if (individual) return { url: individual, source: "device" as const };
  const fallback = defaultUrl?.trim();
  if (fallback) return { url: fallback, source: "default" as const };
  return { url: "", source: "none" as const };
}
