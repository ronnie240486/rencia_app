import { colors } from '@/src/theme';

// 8 avatar palettes — mirrors the drawable/avatar_1..8.xml resources.
// We render a filled circle with an initial. This keeps the app fully offline-safe
// and matches the vector-style avatars from the Android build.
type AvatarStyle = {
  id: string;
  bg: string;
  fg: string;
  letter: string;
};

export const AVATARS: AvatarStyle[] = [
  { id: 'avatar_1', bg: '#4CE8F0', fg: '#0B0F1A', letter: 'A' },
  { id: 'avatar_2', bg: '#F04CC8', fg: '#0B0F1A', letter: 'B' },
  { id: 'avatar_3', bg: '#B14CF0', fg: colors.white, letter: 'C' },
  { id: 'avatar_4', bg: '#F0997B', fg: '#0B0F1A', letter: 'D' },
  { id: 'avatar_5', bg: '#7BF0B4', fg: '#0B0F1A', letter: 'E' },
  { id: 'avatar_6', bg: '#F0E67B', fg: '#0B0F1A', letter: 'F' },
  { id: 'avatar_7', bg: '#7B9DF0', fg: colors.white, letter: 'G' },
  { id: 'avatar_8', bg: '#F07B7B', fg: colors.white, letter: 'H' },
];

export function getAvatar(id?: string | null): AvatarStyle {
  if (!id) return AVATARS[0];
  return AVATARS.find((a) => a.id === id) || AVATARS[0];
}
