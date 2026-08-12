export function getEnforcedDeviceLimit(value: number | string | null | undefined): number {
  const limit = typeof value === "string" ? Number(value) : value;
  if (!Number.isInteger(limit) || !limit || limit < 1) {
    throw new Error("Limite de dispositivos inválido para esta conta.");
  }
  return limit;
}
