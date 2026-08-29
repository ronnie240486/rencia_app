export type IptvServerSearchItem = {
  personName?: string | null;
  name?: string | null;
  server?: string | null;
};

export function matchesIptvServerSearch(item: IptvServerSearchItem, searchTerm: string) {
  const normalized = searchTerm.trim().toLocaleLowerCase("pt-BR");
  if (!normalized) return true;
  const searchable = [item.personName, item.name, item.server].filter(Boolean).join(" ").toLocaleLowerCase("pt-BR");
  return normalized.split(/\s+/).every((term) => searchable.includes(term));
}
