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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { colors, spacing } from '@/src/theme';

interface MovieData {
  id: string;
  title: string;
  genre: string;
  year: number;
  description: string;
  rating: number;
  poster: string;
  duration: string;
  currentTime: string;
  isFavorite: boolean;
  isWatched: boolean;
  cast: Array<{
    id: string;
    name: string;
    image: string;
  }>;
}

export default function MovieDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [movie, setMovie] = useState<MovieData | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isWatched, setIsWatched] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMovieDetails();
  }, [id]);

  const loadMovieDetails = async () => {
    try {
      setLoading(true);
      // Aqui você chamaria o endpoint do backend
      // const response = await apiClient.get(`/api/v5/movie/${id}`);
      
      // Mock data para demonstração
      const mockMovie: MovieData = {
        id: id || '1',
        title: 'Silo',
        genre: 'Sci-Fi & Fantasy & Drama',
        year: 2023,
        description:
          'Em um futuro destruído e tóxico, existe uma comunidade que vive dentro de um gigantesco silo subterrâneo com centenas de andares de profundidade. Lá, homens e mulheres vivem numa sociedade cheia de regras que acreditam existir para protegê-los.',
        rating: 8,
        poster: 'https://via.placeholder.com/400x600',
        duration: '00:16:44',
        currentTime: '00:00:00',
        isFavorite: false,
        isWatched: false,
        cast: [
          { id: '1', name: 'Rebecca', image: 'https://via.placeholder.com/100x100' },
          { id: '2', name: 'Gemma', image: 'https://via.placeholder.com/100x100' },
          { id: '3', name: 'Chinaza', image: 'https://via.placeholder.com/100x100' },
          { id: '4', name: 'Ashley', image: 'https://via.placeholder.com/100x100' },
        ],
      };

      setMovie(mockMovie);
      setIsFavorite(mockMovie.isFavorite);
      setIsWatched(mockMovie.isWatched);
    } catch (error) {
      console.error('Erro ao carregar detalhes do filme:', error);
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

  if (!movie) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Filme não encontrado</Text>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Voltar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const progressPercentage = 25; // Exemplo: 25% do filme assistido

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={16}>
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </Pressable>
        <Text style={styles.headerTitle}>maxplayer</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Poster com Player */}
        <ImageBackground
          source={{ uri: movie.poster }}
          style={styles.posterContainer}
          imageStyle={{ opacity: 0.5 }}
        >
          <View style={styles.playButtonContainer}>
            <View style={styles.playButton}>
              <MaterialCommunityIcons name="play" size={32} color={colors.white} />
            </View>
          </View>

          {/* Rating Badge */}
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingText}>{movie.rating}</Text>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progressPercentage}%` }]} />
          </View>

          {/* Time Display */}
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>
              {movie.currentTime} / {movie.duration}
            </Text>
          </View>
        </ImageBackground>

        {/* Content */}
        <View style={styles.content}>
          {/* Title */}
          <Text style={styles.title}>{movie.title}</Text>
          <Text style={styles.metadata}>
            {movie.genre} | {movie.year}
          </Text>

          {/* Description */}
          <Text style={styles.description}>{movie.description}</Text>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <Pressable
              style={styles.actionButton}
              onPress={() => setIsFavorite(!isFavorite)}
            >
              <MaterialCommunityIcons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={24}
                color={isFavorite ? colors.danger : colors.textMuted}
              />
              <Text style={[styles.actionLabel, isFavorite && { color: colors.danger }]}>
                Favorito
              </Text>
            </Pressable>

            <Pressable
              style={styles.actionButton}
              onPress={() => setIsWatched(!isWatched)}
            >
              <MaterialCommunityIcons
                name={isWatched ? 'check-circle' : 'check-circle-outline'}
                size={24}
                color={isWatched ? colors.accentCyan : colors.textMuted}
              />
              <Text style={[styles.actionLabel, isWatched && { color: colors.accentCyan }]}>
                Assistido
              </Text>
            </Pressable>

            <Pressable style={styles.actionButton}>
              <MaterialCommunityIcons name="filmstrip" size={24} color={colors.textMuted} />
              <Text style={styles.actionLabel}>Trailer</Text>
            </Pressable>
          </View>

          {/* Cast Section */}
          <View style={styles.castSection}>
            <Text style={styles.castTitle}>Elenco</Text>
            <View style={styles.castGrid}>
              {movie.cast.map((actor) => (
                <View key={actor.id} style={styles.castItem}>
                  <Image source={{ uri: actor.image }} style={styles.castImage} />
                  <Text style={styles.castName} numberOfLines={1}>
                    {actor.name}
                  </Text>
                </View>
              ))}
            </View>
          </View>
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
          <Text style={styles.navLabel}>Canais</Text>
        </Pressable>
        <Pressable style={styles.navItem}>
          <MaterialCommunityIcons name="filmstrip" size={20} color={colors.white} />
          <Text style={[styles.navLabel, { color: colors.white }]}>Filmes</Text>
        </Pressable>
        <Pressable style={styles.navItem}>
          <MaterialCommunityIcons name="play-box-outline" size={20} color={colors.accentCyan} />
          <Text style={[styles.navLabel, { color: colors.accentCyan }]}>Séries</Text>
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  headerTitle: { color: colors.white, fontSize: 18, fontWeight: '800' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: colors.danger, fontSize: 16, marginBottom: spacing.md },
  backButton: {
    backgroundColor: colors.accentCyan,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  backButtonText: { color: colors.black, fontWeight: '700' },
  posterContainer: {
    width: '100%',
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  playButtonContainer: { justifyContent: 'center', alignItems: 'center' },
  playButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingBadge: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: colors.accentCyan,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 4,
  },
  ratingText: { color: colors.black, fontWeight: '700', fontSize: 14 },
  progressBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: colors.darkSurface,
  },
  progressBar: { height: '100%', backgroundColor: colors.accentCyan },
  timeContainer: { position: 'absolute', bottom: 16, left: 16 },
  timeText: { color: colors.white, fontSize: 12 },
  content: { paddingHorizontal: spacing.md, paddingVertical: spacing.lg },
  title: { color: colors.white, fontSize: 28, fontWeight: '800', marginBottom: spacing.sm },
  metadata: { color: colors.textSecondary, fontSize: 13, marginBottom: spacing.md },
  description: { color: colors.textSecondary, fontSize: 13, lineHeight: 20, marginBottom: spacing.lg },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.darkSurface,
  },
  actionButton: { alignItems: 'center', gap: spacing.sm },
  actionLabel: { color: colors.textMuted, fontSize: 12 },
  castSection: { marginTop: spacing.lg },
  castTitle: { color: colors.white, fontSize: 16, fontWeight: '700', marginBottom: spacing.md },
  castGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  castItem: { width: '23%', alignItems: 'center' },
  castImage: { width: 60, height: 60, borderRadius: 8, marginBottom: spacing.sm },
  castName: { color: colors.textSecondary, fontSize: 11, textAlign: 'center' },
  bottomNav: {
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
