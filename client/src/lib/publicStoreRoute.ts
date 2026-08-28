export function resolveRequestedDownloadSlug(location: string, shortSlugs: Record<string, string>) {
  if (location.startsWith("/convite/")) return "";
  if (shortSlugs[location]) return shortSlugs[location];
  return location.startsWith("/d/") ? location.split("/")[2] || "" : "";
}
