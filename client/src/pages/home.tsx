import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ImageBackground,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { colors, spacing } from '@/src/theme';
import { getDeviceMac } from '@/src/lib/device';
import { loadSession, getXtream } from '@/src/state/session';
import {
  xtream,
  liveStreamUrl,
  movieStreamUrl,
  XtreamLive,
  XtreamMovie,
  XtreamSeries,
  getLastXtreamError,
} from '@/src/lib/xtream';

type NavItem = {
  key: string;
  icon: React.ReactNode;
  testID: string;
  onPress?: () => void;
};

type HomeItem = {
  id: string;
  name: string;
  logo?: string;
  stream: string;
  circular?: boolean;
  seriesId?: number;
  cover?: string;
};

type Section = { title: string; items: HomeItem[] };

export default function HomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ profileId?: string; profileName?: string }>();

  const [mac, setMac] = useState('');
  const [sections, setSections] = useState<Section[]>([]);
  const [bg, setBg] = useState<string | undefined>();
  const [logo, setLogo] = useState<string | undefined>();
  const [appName, setAppName] = useState<string>('Interactive Player');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeNav, setActiveNav] = useState<string>('home');

  const load = useCallback(async () => {
    setLoading(true);
    const [m, session] = await Promise.all([getDeviceMac(), loadSession()]);
    setMac(m);
    setBg(session?.bg_url);
    setLogo(session?.logo_url);
    setAppName(session?.app_name || 'Interactive Player');

    const creds = getXtream();
    if (!creds) {
      setSections([]);
      setLoading(false);
      return;
    }

    // Pull live, movies, series in parallel — first 12 of each go on Home.
    const [live, movies, series] = await Promise.all([
      xtream.liveStreams(creds),
      xtream.vodStreams(creds),
      xtream.seriesList(creds),
    ]);

    const built: Section[] = [];

    if (live && live.length) {
      built.push({
        title: 'TOP CANAIS',
        items: live.slice(0, 12).map((s: XtreamLive) => ({
          id: `live-${s.stream_id}`,
          name: s.name,
          logo: s.stream_icon || undefined,
          stream: liveStreamUrl(creds, s.stream_id, 'm3u8'),
          circular: true,
        })),
      });
    }

    if (movies && movies.length) {
      built.push({
        title: 'FILMES EM ALTA',
        items: movies.slice(0, 20).map((m: XtreamMovie) => ({
          id: `movie-${m.stream_id}`,
          name: m.name,
          logo: m.stream_icon || undefined,
          stream: movieStreamUrl(creds, m.stream_id, m.container_extension),
        })),
      });
    }

    if (series && series.length) {
      built.push({
        title: 'SÉRIES POPULARES',
        items: series.slice(0, 20).map((s: XtreamSeries) => ({
          id: `series-${s.series_id}`,
          name: s.name,
          logo: s.cover || undefined,
          stream: '', // series need episode picker
          seriesId: s.series_id,
          cover: s.cover || undefined,
        })),
      });
    }

    setSections(built);
    // If all 3 fetches returned no data, capture the specific error to show
    // in the empty state (e.g. Cloudflare block on the preview).
    const allEmpty = !live?.length && !movies?.length && !series?.length;
    setLoadError(allEmpty ? getLastXtreamError() : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openItem = (item: HomeItem) => {
    if (item.seriesId) {
      router.push({
        pathname: '/series-details',
        params: { id: String(item.seriesId), name: item.name, cover: item.cover || '' },
      });
      return;
    }
    if (!item.stream) return;
    router.push({
      pathname: '/player',
      params: {
        id: item.id,
        name: item.name,
        stream: item.stream,
        logo: item.logo || '',
      },
    });
  };

  const navItems: NavItem[] = [
    { key: 'home', testID: 'nav-home', icon: <Ionicons name="home" size={18} color={colors.white} /> },
    {
      key: 'live',
      testID: 'nav-live',
      icon: <MaterialCommunityIcons name="television-classic" size={18} color={colors.white} />,
      onPress: () => router.push('/channels'),
    },
    {
      key: 'movies',
      testID: 'nav-movies',
      icon: <MaterialCommunityIcons name="movie-open" size={18} color={colors.white} />,
      onPress: () => router.push('/movies'),
    },
    {
      key: 'series',
      testID: 'nav-series',
      icon: <Ionicons name="film" size={18} color={colors.white} />,
      onPress: () => router.push('/series'),
    },
    {
      key: 'search',
      testID: 'nav-search',
      icon: <Ionicons name="search" size={18} color={colors.white} />,
      onPress: () => router.push('/search'),
    },
  ];

  const footerItems: NavItem[] = [
    {
      key: 'diagnostic',
      testID: 'nav-diagnostic',
      icon: <Ionicons name="pulse" size={18} color={colors.white} />,
      onPress: () => router.push('/diagnostic'),
    },
    {
      key: 'settings',
      testID: 'nav-settings',
      icon: <Ionicons name="settings" size={18} color={colors.white} />,
      onPress: () => router.push('/settings'),
    },
  ];

  return (
    <ImageBackground
      source={bg ? { uri: bg } : undefined}
      style={styles.bg}
      imageStyle={{ opacity: 0.35 }}
    >
      <View style={styles.overlay} />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.row}>
          {/* Left icon rail */}
          <View style={styles.rail} testID="left-rail">
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.railInner}>
              {navItems.map((it) => (
                <Pressable
                  key={it.key}
                  onPress={() => {
                    setActiveNav(it.key);
                    it.onPress?.();
                  }}
                  style={[styles.chip, activeNav === it.key && styles.chipActive]}
                  testID={it.testID}
                >
                  {it.icon}
                </Pressable>
              ))}
              <View style={{ height: spacing.xl }} />
              {footerItems.map((it) => (
                <Pressable key={it.key} onPress={it.onPress} style={styles.chip} testID={it.testID}>
                  {it.icon}
                </Pressable>
              ))}
              <Pressable
                onPress={() => router.replace('/profiles')}
                style={styles.profileChip}
                testID="nav-profile"
              >
                {logo ? (
                  <Image source={{ uri: logo }} style={{ width: 34, height: 34 }} contentFit="cover" />
                ) : (
                  <View style={styles.profileFallback}>
                    <Ionicons name="person" size={16} color={colors.black} />
                  </View>
                )}
              </Pressable>
            </ScrollView>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <View style={styles.topBar}>
              <View>
                <Text style={styles.hello} testID="home-hello">
                  Olá, {params.profileName || 'usuário'}
                </Text>
                <Text style={styles.appNameSmall}>{appName}</Text>
              </View>
              <Text style={styles.macText}>{mac}</Text>
            </View>

            {loading ? (
              <View style={styles.center}>
                <ActivityIndicator color={colors.accentCyan} />
                <Text style={styles.loadingText}>Carregando conteúdo...</Text>
              </View>
            ) : sections.length === 0 ? (
              <EmptyHome errorCode={loadError} onRetry={load} />
            ) : (
              <FlatList
                data={sections}
                keyExtractor={(_, idx) => `section-${idx}`}
                contentContainerStyle={{ paddingBottom: 24 }}
                renderItem={({ item }) => <SectionRow section={item} onOpen={openItem} />}
              />
            )}
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

function SectionRow({ section, onOpen }: { section: Section; onOpen: (item: HomeItem) => void }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionBar} />
        <Text style={styles.sectionTitle}>{section.title}</Text>
      </View>
      <FlatList
        horizontal
        data={section.items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <Pressable onPress={() => onOpen(item)} testID={`home-item-${item.id}`}>
            {item.circular ? (
              <View style={styles.circularItem}>
                <View style={styles.circularCard}>
                  {item.logo ? (
                    <Image source={{ uri: item.logo }} style={styles.circularImg} contentFit="contain" />
                  ) : (
                    <Ionicons name="tv" size={22} color={colors.black} />
                  )}
                </View>
                <Text style={styles.circularName} numberOfLines={1}>{item.name}</Text>
              </View>
            ) : (
              <View style={styles.posterItem}>
                <View style={styles.posterCard}>
                  {item.logo ? (
                    <Image source={{ uri: item.logo }} style={styles.posterImg} contentFit="cover" />
                  ) : (
                    <Ionicons name="image" size={26} color={colors.textMuted} />
                  )}
                </View>
                <Text style={styles.posterName} numberOfLines={1}>{item.name}</Text>
              </View>
            )}
          </Pressable>
        )}
      />
    </View>
  );
}

function EmptyHome({ errorCode, onRetry }: { errorCode: string | null; onRetry: () => void }) {
  const blocked = errorCode === 'BLOCKED_CLOUDFLARE';
  return (
    <View style={styles.emptyWrap} testID="home-empty">
      <MaterialCommunityIcons
        name={blocked ? 'cloud-alert' : 'television-off'}
        size={48}
        color={colors.textMuted}
      />
      <Text style={styles.emptyTitle}>
        {blocked ? 'Conteúdo indisponível no preview' : 'Nada disponível ainda'}
      </Text>
      <Text style={styles.emptySub}>
        {blocked
          ? 'O servidor IPTV está bloqueando o IP do preview (Cloudflare).\nAbra o app no Expo Go pelo celular ou pelo APK — vai carregar tudo normal.'
          : 'Sem conteúdo para exibir agora.\nVerifique sua conexão ou fale com o revendedor.'}
      </Text>
      <Pressable onPress={onRetry} style={styles.retryBtn} testID="home-retry">
        <Ionicons name="refresh" size={14} color={colors.accentCyan} />
        <Text style={styles.retryText}>TENTAR NOVAMENTE</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.black },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  safe: { flex: 1 },
  row: { flex: 1, flexDirection: 'row' },
  rail: { width: 56, backgroundColor: colors.darkSurfaceAlt },
  railInner: { alignItems: 'center', paddingVertical: spacing.md, gap: 12 },
  chip: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#242A45',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: colors.accentCyan },
  profileChip: {
    marginTop: spacing.md,
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: 'hidden',
    backgroundColor: colors.accentCyan,
  },
  profileFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, paddingTop: spacing.md },
  topBar: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hello: { color: colors.white, fontSize: 16, fontWeight: '700' },
  appNameSmall: { color: colors.accentCyan, fontSize: 10, marginTop: 2, letterSpacing: 1.5 },
  macText: { color: colors.textMuted, fontSize: 10, letterSpacing: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: colors.textSecondary, fontSize: 12 },
  section: { marginBottom: 18 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 16,
    gap: 8,
  },
  sectionBar: { width: 3, height: 14, backgroundColor: colors.accentCyan, borderRadius: 2 },
  sectionTitle: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  circularItem: { alignItems: 'center', width: 64 },
  circularCard: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  circularImg: { width: 44, height: 44 },
  circularName: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
  },
  posterItem: { width: 90 },
  posterCard: {
    width: 90,
    height: 130,
    borderRadius: 8,
    backgroundColor: colors.darkSurface,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterImg: { width: '100%', height: '100%' },
  posterName: { color: colors.white, fontSize: 11, marginTop: 6 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  emptyTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  emptySub: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.accentCyan,
  },
  retryText: {
    color: colors.accentCyan,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
});
