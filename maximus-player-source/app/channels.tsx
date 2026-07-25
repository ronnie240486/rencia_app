import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  ScrollView,
  TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { colors, spacing } from '@/src/theme';
import { getXtream } from '@/src/state/session';
import { xtream, liveStreamUrl, XtreamCategory, XtreamLive, getLastXtreamError } from '@/src/lib/xtream';

const ALL = 'Todos';

export default function ChannelsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<XtreamCategory[]>([]);
  const [streams, setStreams] = useState<XtreamLive[]>([]);
  const [selectedCat, setSelectedCat] = useState<string>(ALL);
  const [query, setQuery] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const creds = getXtream();
    if (!creds) {
      setLoading(false);
      return;
    }
    const [cats, list] = await Promise.all([
      xtream.liveCategories(creds),
      xtream.liveStreams(creds),
    ]);
    setCategories(cats || []);
    setStreams(list || []);
    setLoadError(!list?.length ? getLastXtreamError() : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const catNames = useMemo<string[]>(() => {
    return [ALL, ...categories.map((c) => c.category_name)];
  }, [categories]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const selectedCatId =
      selectedCat === ALL ? null : categories.find((c) => c.category_name === selectedCat)?.category_id;
    return streams.filter((s) => {
      const catOk = !selectedCatId || s.category_id === selectedCatId;
      const qOk = !q || s.name.toLowerCase().includes(q);
      return catOk && qOk;
    });
  }, [streams, categories, selectedCat, query]);

  const openPlayer = (s: XtreamLive) => {
    const creds = getXtream();
    if (!creds) return;
    router.push({
      pathname: '/player',
      params: {
        id: `live-${s.stream_id}`,
        name: s.name,
        stream: liveStreamUrl(creds, s.stream_id, 'm3u8'),
        logo: s.stream_icon || '',
      },
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={16} style={styles.backBtn} testID="channels-back">
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </Pressable>
        <Text style={styles.headerTitle}>Canais ao vivo</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={16} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar canal..."
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          testID="channels-search-input"
        />
      </View>

      {/* Category chips — horizontal chrome */}
      <View style={styles.chipRow} testID="channels-chip-row">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRowInner}>
          {catNames.map((cat) => {
            const active = cat === selectedCat;
            return (
              <Pressable
                key={cat}
                onPress={() => setSelectedCat(cat)}
                style={[styles.chip, active && styles.chipActive]}
                testID={`chip-${cat.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accentCyan} />
        </View>
      ) : filtered.length === 0 ? (
        <Empty errorCode={loadError} onRetry={load} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(c) => String(c.stream_id)}
          numColumns={2}
          columnWrapperStyle={{ gap: spacing.sm, paddingHorizontal: spacing.md }}
          contentContainerStyle={{ paddingTop: spacing.sm, paddingBottom: 32, gap: spacing.sm }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => openPlayer(item)}
              style={styles.card}
              testID={`channel-${item.stream_id}`}
            >
              <View style={styles.logoBox}>
                {item.stream_icon ? (
                  <Image source={{ uri: item.stream_icon }} style={styles.logoImg} contentFit="contain" />
                ) : (
                  <MaterialCommunityIcons name="television-classic" size={28} color={colors.textMuted} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                {!!item.category_id && (
                  <Text style={styles.cardCat} numberOfLines={1}>
                    {categories.find((c) => c.category_id === item.category_id)?.category_name || ''}
                  </Text>
                )}
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function Empty({ errorCode, onRetry }: { errorCode: string | null; onRetry: () => void }) {
  const blocked = errorCode === 'BLOCKED_CLOUDFLARE';
  return (
    <View style={styles.center} testID="channels-empty">
      <MaterialCommunityIcons
        name={blocked ? 'cloud-alert' : 'television-off'}
        size={44}
        color={colors.textMuted}
      />
      <Text style={styles.emptyTitle}>
        {blocked ? 'Bloqueado no preview' : 'Nenhum canal encontrado'}
      </Text>
      <Text style={styles.emptySub}>
        {blocked
          ? 'Abra o app no Expo Go pelo celular ou no APK\npra carregar os canais.'
          : 'Tente outra categoria ou verifique sua conexão.'}
      </Text>
      <Pressable onPress={onRetry} style={styles.retryBtn} testID="channels-retry">
        <Ionicons name="refresh" size={14} color={colors.accentCyan} />
        <Text style={styles.retryText}>TENTAR NOVAMENTE</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.black },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  backBtn: { padding: 4 },
  headerTitle: { color: colors.white, fontSize: 18, fontWeight: '800' },
  searchBox: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.darkSurfaceAlt,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: { flex: 1, color: colors.white, fontSize: 14 },
  chipRow: { height: 56, justifyContent: 'center' },
  chipRowInner: { gap: 8, paddingHorizontal: spacing.md, alignItems: 'center' },
  chip: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: colors.darkSurface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.darkSurfaceAlt,
    flexShrink: 0,
    maxWidth: 200,
  },
  chipActive: { borderColor: colors.accentCyan, backgroundColor: 'rgba(76,232,240,0.10)' },
  chipText: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: colors.accentCyan },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  card: {
    flex: 1,
    minHeight: 68,
    backgroundColor: colors.darkSurface,
    borderRadius: 12,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBox: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImg: { width: 44, height: 44 },
  cardName: { color: colors.white, fontSize: 13, fontWeight: '700' },
  cardCat: { color: colors.textMuted, fontSize: 10, marginTop: 2, letterSpacing: 0.5 },
  emptyTitle: { color: colors.white, fontSize: 16, fontWeight: '700', marginTop: 12 },
  emptySub: { color: colors.textSecondary, fontSize: 12, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  retryBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.accentCyan,
  },
  retryText: { color: colors.accentCyan, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
});
