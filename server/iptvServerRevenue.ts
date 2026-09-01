export function parseIptvServerValue(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(String(value ?? "0").replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(parsed * 100) / 100;
}

export function addIptvServerRevenue(currentRevenue: number, serverRevenue: unknown): number {
  return Math.round((parseIptvServerValue(currentRevenue) + parseIptvServerValue(serverRevenue)) * 100) / 100;
}
