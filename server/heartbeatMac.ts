import { normalizeMacAddress } from "./ultraPlayerConfig";

export function buildHeartbeatMacLookup(macInput: string) {
  const raw = macInput.trim();
  const canonical = normalizeMacAddress(raw) ?? raw.toUpperCase();
  const candidates = Array.from(new Set([
    canonical,
    canonical.toLowerCase(),
    raw,
    raw.toLowerCase(),
    raw.toUpperCase(),
  ].filter(Boolean)));
  return { canonical, candidates };
}
