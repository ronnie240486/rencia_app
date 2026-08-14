/** Coloca a lista de failover ativa na primeira posição entregue ao aplicativo. */
export function orderDeviceUrlsForActive<T extends { id: number }>(items: T[], activeDeviceUrlId: number | null | undefined) {
  if (!activeDeviceUrlId) return items;
  const active = items.find((item) => item.id === activeDeviceUrlId);
  return active ? [active, ...items.filter((item) => item.id !== active.id)] : items;
}
