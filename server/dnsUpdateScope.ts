export function requireExplicitDeviceIds(ids: number[]): number[] {
  const uniqueIds = Array.from(new Set(ids.filter((id) => Number.isInteger(id) && id > 0)));
  if (uniqueIds.length === 0) throw new Error("Selecione ao menos um cliente.");
  return uniqueIds;
}
