export type IptvServerSearchItem = {
  personName?: string | null;
  name?: string | null;
  server?: string | null;
};

export function matchesIptvServerSearch(item: IptvServerSearchItem, searchTerm: string) {
  const normalized = searchTerm.trim().toLocaleLowerCase("pt-BR");
  if (!normalized) return true;
  return [item.personName, item.name, item.server].some((value) => value?.toLocaleLowerCase("pt-BR").includes(normalized));
}
