import * as Crypto from 'expo-crypto';
import { storage } from '@/src/utils/storage';

const KEY = 'device_mac_id_v1';
const MAC_RE = /^[0-9A-F]{2}(:[0-9A-F]{2}){5}$/;

let cachedMac: string | null = null;

/**
 * Returns a stable MAC-style device ID (AA:BB:CC:DD:EE:FF).
 *
 * - Generated once per install and persisted via `storage.secureSet` — this
 *   uses Keychain/EncryptedSharedPreferences on native and AsyncStorage
 *   (IndexedDB-backed) on web, so the value survives reloads on every target.
 * - The in-memory cache guards against races on the very first launch, where
 *   two callers could otherwise each read an empty store and generate their
 *   own MAC.
 */
export async function getDeviceMac(): Promise<string> {
  if (cachedMac && MAC_RE.test(cachedMac)) return cachedMac;

  const stored = await storage.secureGet<string>(KEY, '');
  if (stored && MAC_RE.test(stored)) {
    cachedMac = stored;
    return stored;
  }

  const bytes = await Crypto.getRandomBytesAsync(6);
  const mac = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
    .join(':');

  cachedMac = mac;
  await storage.secureSet<string>(KEY, mac);
  return mac;
}

export async function resetDeviceMac(): Promise<string> {
  cachedMac = null;
  await storage.secureRemove(KEY);
  return getDeviceMac();
}
