import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
  ActivityIndicator,
  ImageBackground,
  FlatList,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { colors, spacing } from '@/src/theme';

interface Episode {
  id: string;
  title: string;
  episodeCode: string; // S01E01
  duration: string;
  thumbnail: string;
  watched: boolean;
  progress?: number;
  description?: string;
}

interface Season {
  id: string;
  seasonNumber: number;
  episodes: Episode[];
}

interface SeriesData {
  id: string;
  title: string;
  seasons: Season[];
  currentSeasonIndex: number;
}

const { width } = Dimensions.get('window');

export default function SeriesEpisodesScreen() {
  const router = useRouter();
  const { id, seriesTitle } = useLocalSearchParams<{ id: string; seriesTitle: string }>();
  const [series, setSeries] = useState<SeriesData | null>(null);
  const [currentSeasonIndex, setCurrentSeasonIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSeriesData();
  }, [id]);

  const loadSeriesData = async () => {
    try {
      setLoading(true);
      // Aqui você chamaria o endpoint do backend
      // const response = await apiClient.get(`/api/v5/series/${id}/episodes`);

      // Mock data para demonstração
      const mockSeries: SeriesData = {
        id: id || '1',
        title: seriesTitle || 'Silo',
        currentSeasonIndex: 0,
        seasons: [
          {
            id: 's1',
            seasonNumber: 1,
            episodes: [
              {
                id: 'e1',
                title: 'Dia da liberdade',
                episodeCode: 'S01E01',
                duration: '00:00:00',
                thumbnail: 'https://via.placeholder.com/300x170',
                watched: true,
                progress: 100,
                description: 'O primeiro episódio da série',
              },
              {
                id: 'e2',
                title: 'A escolha de Holston',
                episodeCode: 'S01E02',
                duration: '00:00:00',
                thumbnail: 'https://via.placeholder.com/300x170',
                watched: true,
                progress: 100,
                description: 'Segundo episódio',
              },
              {
                id: 'e3',
                title: 'Máquinas',
                episodeCode: 'S01E03',
                duration: '00:59:22',
                thumbnail: 'https://via.placeholder.com/300x170',
                watched: false,
                progress: 0,
                description: 'Terceiro episódio',
              },
              {
                id: 'e4',
                title: 'O Nível Profundo',
                episodeCode: 'S01E04',
                duration: '00:00:00',
                thumbnail: 'https://via.placeholder.com/300x170',
                watched: false,
                progress: 0,
              },
            ],
          },
          {
            id: 's2',
            seasonNumber: 2,
            episodes: [
              {
                id: 'e5',
                title: 'Novo começo',
                episodeCode: 'S02E01',
                duration: '00:00:00',
                thumbnail: 'https://via.placeholder.com/300x170',
                watched: false,
                progress: 0,
              },
            ],
          },
        ],
      };

      setSeries(mockSeries);
    } catch (error) {
      console.error('Erro ao carregar episódios:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accentCyan} />
        </View>
      </SafeAreaView>
    );
  }

  if (!series) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Série não encontrada</Text>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Voltar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const currentSeason = series.seasons[currentSeasonIndex];

  const renderEpisodeItem = ({ item }: { item: Episode }) => (
    <Pressable style={styles.episodeContainer}>
      {/* Thumbnail */}
      <ImageBackground
        source={{ uri: item.thumbnail }}
        style={styles.episodeThumbnail}
        imageStyle={{ borderRadius: 8 }}
      >
        {/* Overlay */}
        <View style={styles.thumbnailOverlay} />

        {/* Watched indicator or Play button */}
        {item.watched ? (
          <View style={styles.watchedBadge}>
            <Ionicons name="checkmark-circle" size={32} color={colors.accentCyan} />
          </View>
        ) : (
          <View style={styles.playButton}>
            <MaterialCommunityIcons name="play" size={24} color={colors.white} />
          </View>
        )}

        {/* Duration in corner */}
        {item.duration && (
          <Text style={styles.durationBadge}>{item.duration}</Text>
        )}
      </ImageBackground>

      {/* Episode Info */}
      <View style={styles.episodeInfo}>
        <View style={styles.episodeHeader}>
          <Text style={styles.episodeCode}>{item.episodeCode}</Text>
          {item.watched && (
            <View style={styles.watchedIndicator}>
              <Ionicons name="checkmark" size={12} color={colors.accentCyan} />
            </View>
          )}
        </View>

        <Text style={styles.episodeTitle} numberOfLines={2}>
          {item.title}
        </Text>

        {/* Progress bar for partially watched */}
        {item.progress && item.progress > 0 && item.progress < 100 && (
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${item.progress}%` }]} />
          </View>
        )}
      </View>

      {/* Right side actions */}
      <View style={styles.episodeActions}>
        <Pressable hitSlop={16}>
          <MaterialCommunityIcons name="play" size={28} color={colors.accentCyan} />
        </Pressable>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={16}>
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </Pressable>
        <View style={styles.headerContent}>
          <Text style={styles.headerSubtitle}>Temporada {currentSeason.seasonNumber}</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {series.title}
          </Text>
        </View>
        <Pressable hitSlop={16}>
          <View style={styles.profileIcon}>
            <Ionicons name="person" size={14} color={colors.white} />
          </View>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        {/* Season Selector */}
        {series.seasons.length > 1 && (
          <View style={styles.seasonSelector}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.seasonList}
            >
              {series.seasons.map((season, index) => (
                <Pressable
                  key={season.id}
                  onPress={() => setCurrentSeasonIndex(index)}
                  style={[
                    styles.seasonButton,
                    currentSeasonIndex === index && styles.seasonButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.seasonButtonText,
                      currentSeasonIndex === index && styles.seasonButtonTextActive,
                    ]}
                  >
                    T{season.seasonNumber}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Episodes List */}
        <View style={styles.episodesContainer}>
          <FlatList
            data={currentSeason.episodes}
            renderItem={renderEpisodeItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            contentContainerStyle={styles.episodesList}
          />
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <Pressable style={styles.navItem}>
          <Ionicons name="home-outline" size={20} color={colors.textMuted} />
          <Text style={styles.navLabel}>Início</Text>
        </Pressable>
        <Pressable style={styles.navItem}>
          <MaterialCommunityIcons name="television-box" size={20} color={colors.textMuted} />
          <Text style={styles.navLabel}>Canais de TV</Text>
        </Pressable>
        <Pressable style={styles.navItem}>
          <MaterialCommunityIcons name="filmstrip" size={20} color={colors.white} />
          <Text style={[styles.navLabel, { color: colors.white }]}>Filmes</Text>
        </Pressable>
        <Pressable style={styles.navItem}>
          <MaterialCommunityIcons name="play-box-outline" size={20} color={colors.textMuted} />
          <Text style={styles.navLabel}>Séries de TV</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.black },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  headerContent: { flex: 1 },
  headerSubtitle: { color: colors.textSecondary, fontSize: 12 },
  headerTitle: { color: colors.white, fontSize: 16, fontWeight: '700' },
  profileIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: colors.danger, fontSize: 16, marginBottom: spacing.md },
  backButton: {
    backgroundColor: colors.accentCyan,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  backButtonText: { color: colors.black, fontWeight: '700' },
  seasonSelector: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.darkSurface,
  },
  seasonList: { gap: spacing.sm },
  seasonButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.darkSurface,
  },
  seasonButtonActive: { backgroundColor: colors.accentCyan },
  seasonButtonText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  seasonButtonTextActive: { color: colors.black, fontWeight: '700' },
  episodesContainer: { paddingHorizontal: spacing.md, paddingVertical: spacing.lg },
  episodesList: { gap: spacing.lg },
  episodeContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  episodeThumbnail: {
    width: 120,
    height: 70,
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  watchedBadge: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: colors.white,
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 3,
  },
  episodeInfo: { flex: 1 },
  episodeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  episodeCode: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  watchedIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 255, 200, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  episodeTitle: { color: colors.white, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  progressBarContainer: {
    height: 2,
    backgroundColor: colors.darkSurfaceAlt,
    borderRadius: 1,
    marginTop: spacing.sm,
  },
  progressBar: { height: '100%', backgroundColor: colors.accentCyan, borderRadius: 1 },
  episodeActions: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
    backgroundColor: colors.black,
    borderTopWidth: 1,
    borderTopColor: colors.darkSurface,
  },
  navItem: { alignItems: 'center', gap: spacing.sm },
  navLabel: { color: colors.textMuted, fontSize: 11 },
});
