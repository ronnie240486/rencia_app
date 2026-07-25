// In-memory session cache for the MAC status/branding, plus persistence via
// the universal storage helper. Screens read `getSession()` synchronously
// after login; `loadSession()` rehydrates from disk on cold start.

import { storage } from '@/src/utils/storage';
import { MacStatus } from '@/src/api/client';
import { parsePlaylistUrl, XtreamCreds } from '@/src/lib/xtream';

const STORAGE_KEY = 'mac_status_v1';

let cached: MacStatus | null = null;
let cachedCreds: XtreamCreds | null = null;

export function getSession(): MacStatus | null {
  return cached;
}

export function getXtream(): XtreamCreds | null {
  if (cachedCreds) return cachedCreds;
  const first = cached?.playlists?.[0]?.url;
  if (!first) return null;
  cachedCreds = parsePlaylistUrl(first);
  return cachedCreds;
}

export async function saveSession(status: MacStatus): Promise<void> {
  cached = status;
  cachedCreds = null;
  await storage.setItem(STORAGE_KEY, JSON.stringify(status));
}

export async function loadSession(): Promise<MacStatus | null> {
  if (cached) return cached;
  const raw = await storage.getItem<string>(STORAGE_KEY, '');
  if (!raw) return null;
  try {
    cached = JSON.parse(raw) as MacStatus;
    return cached;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  cached = null;
  cachedCreds = null;
  await storage.removeItem(STORAGE_KEY);
}
