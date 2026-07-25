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
import { xtream, XtreamCategory, XtreamSeries } from '@/src/lib/xtream';

const ALL = 'Todos';

export default function SeriesScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<XtreamCategory[]>([]);
  const [series, setSeries] = useState<XtreamSeries[]>([]);
  const [selectedCat, setSelectedCat] = useState<string>(ALL);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const creds = getXtream();
    if (!creds) {
      setLoading(false);
      return;
    }
    const [cats, list] = await Promise.all([
      xtream.seriesCategories(creds),
      xtream.seriesList(creds),
    ]);
    setCategories(cats || []);
    setSeries(list || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const catNames = useMemo<string[]>(() => [ALL, ...categories.map((c) => c.category_name)], [categories]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const catId = selectedCat === ALL ? null : categories.find((c) => c.category_name === selectedCat)?.category_id;
    return series.filter((s) => {
      const catOk = !catId || s.category_id === catId;
      const qOk = !q || s.name.toLowerCase().includes(q);
      return catOk && qOk;
    });
  }, [series, categories, selectedCat, query]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={16} style={styles.backBtn} testID="series-back">
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </Pressable>
        <Text style={styles.headerTitle}>Séries</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={16} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar série..."
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          testID="series-search-input"
        />
      </View>

      <View style={styles.chipRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRowInner}>
          {catNames.map((cat) => {
            const active = cat === selectedCat;
            return (
              <Pressable
                key={cat}
                onPress={() => setSelectedCat(cat)}
                style={[styles.chip, active && styles.chipActive]}
                testID={`series-chip-${cat.toLowerCase().replace(/\s+/g, '-')}`}
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
        <View style={styles.center} testID="series-empty">
          <MaterialCommunityIcons name="movie-off" size={44} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>Nenhuma série encontrada</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(s) => String(s.series_id)}
          numColumns={3}
          columnWrapperStyle={{ gap: spacing.sm, paddingHorizontal: spacing.md }}
          contentContainerStyle={{ paddingTop: spacing.sm, paddingBottom: 32, gap: spacing.md }}
          renderItem={({ item }) => (
            <Pressable
              style={styles.poster}
              testID={`series-${item.series_id}`}
              onPress={() =>
                router.push({
                  pathname: '/series-details',
                  params: {
                    id: String(item.series_id),
                    name: item.name,
                    cover: item.cover || '',
                  },
                })
              }
            >
              <View style={styles.posterCard}>
                {item.cover ? (
                  <Image source={{ uri: item.cover }} style={styles.posterImg} contentFit="cover" />
                ) : (
                  <Ionicons name="film" size={30} color={colors.textMuted} />
                )}
              </View>
              <Text style={styles.posterName} numberOfLines={2}>{item.name}</Text>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 8 },
  emptyTitle: { color: colors.white, fontSize: 16, fontWeight: '700', marginTop: 8 },
  emptySub: { color: colors.textSecondary, fontSize: 12, textAlign: 'center' },
  poster: { flex: 1 / 3, maxWidth: '32%' },
  posterCard: {
    aspectRatio: 2 / 3,
    borderRadius: 8,
    backgroundColor: colors.darkSurface,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterImg: { width: '100%', height: '100%' },
  posterName: { color: colors.white, fontSize: 11, marginTop: 6 },
});
