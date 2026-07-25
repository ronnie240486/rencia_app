import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getAvatar } from '@/src/lib/avatars';

type Props = {
  id?: string | null;
  size?: number;
  radius?: number;
};

export default function Avatar({ id, size = 56, radius }: Props) {
  const a = getAvatar(id);
  const r = radius ?? size / 2;
  return (
    <View
      style={[
        styles.wrap,
        { width: size, height: size, borderRadius: r, backgroundColor: a.bg },
      ]}
    >
      <Text style={[styles.letter, { color: a.fg, fontSize: Math.round(size * 0.42) }]}>
        {a.letter}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  letter: { fontWeight: '800', letterSpacing: 1 },
});
