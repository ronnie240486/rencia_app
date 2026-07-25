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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { colors, spacing } from '@/src/theme';

interface EPGItem {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  isLive: boolean;
  progress?: number;
}

interface ChannelData {
  id: string;
  name: string;
  category: string;
  description: string;
  poster: string;
  channelLogo: string;
  isFavorite: boolean;
  epg: EPGItem[];
}

export default function ChannelDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [channel, setChannel] = useState<ChannelData | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChannelDetails();
  }, [id]);

  const loadChannelDetails = async () => {
    try {
      setLoading(true);
      // Aqui você chamaria o endpoint do backend
      // const response = await apiClient.get(`/api/v5/channel/${id}`);
      
      // Mock data para demonstração
      const mockChannel: ChannelData = {
        id: id || '1',
        name: 'Cartoon Network FHD',
        category: 'INFANTIL',
        description: 'Desenhos animados e conteúdo infantil',
        poster: 'https://via.placeholder.com/400x300',
        channelLogo: 'https://via.placeholder.com/100x100',
        isFavorite: false,
        epg: [
          {
            id: '1',
            title: 'O Incrível Mundo de Gu...',
            startTime: '01:00',
            endTime: '02:00',
            isLive: true,
            progress: 30,
          },
          {
            id: '2',
            title: 'Looney Tunes Cartoons',
            startTime: '02:00',
            endTime: '03:00',
            isLive: false,
          },
          {
            id: '3',
            title: 'Hora de Aventura',
            startTime: '03:00',
            endTime: '04:00',
            isLive: false,
          },
          {
            id: '4',
            title: 'Gumball',
            startTime: '04:00',
            endTime: '05:00',
            isLive: false,
          },
        ],
      };

      setChannel(mockChannel);
      setIsFavorite(mockChannel.isFavorite);
    } catch (error) {
      console.error('Erro ao carregar detalhes do canal:', error);
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

  if (!channel) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Canal não encontrado</Text>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Voltar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const renderEPGItem = ({ item }: { item: EPGItem }) => (
    <Pressable style={styles.epgItem}>
      {item.isLive && item.progress !== undefined && (
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${item.progress}%` }]} />
        </View>
      )}
      <Text style={styles.epgTitle} numberOfLines={2}>
        {item.title}
      </Text>
      <Text style={styles.epgTime}>
        {item.startTime} - {item.endTime}
      </Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={16}>
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </Pressable>
        <Text style={styles.headerTitle}>MAXIMUS</Text>
        <View style={styles.headerRight}>
          <Pressable hitSlop={16} style={{ marginRight: spacing.md }}>
            <Ionicons name="search" size={20} color={colors.white} />
          </Pressable>
          <Pressable hitSlop={16}>
            <View style={styles.profileIcon}>
              <Ionicons name="person" size={14} color={colors.white} />
            </View>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        {/* Channel Poster */}
        <ImageBackground
          source={{ uri: channel.poster }}
          style={styles.posterContainer}
          imageStyle={{ opacity: 0.6 }}
        >
          <View style={styles.posterOverlay} />
        </ImageBackground>

        {/* Channel Info */}
        <View style={styles.channelInfo}>
          {/* Title with Favorite Button */}
          <View style={styles.titleRow}>
            <Text style={styles.channelName}>{channel.name}</Text>
            <Pressable onPress={() => setIsFavorite(!isFavorite)}>
              <MaterialCommunityIcons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={24}
                color={isFavorite ? colors.danger : colors.textMuted}
              />
            </Pressable>
          </View>

          {/* Category */}
          <Text style={styles.category}>{channel.category}</Text>

          {/* EPG Header */}
          <View style={styles.epgHeader}>
            <Text style={styles.epgHeaderTitle}>Guia de programação</Text>
            <View style={styles.todayBadge}>
              <MaterialCommunityIcons name="calendar" size={16} color={colors.accentCyan} />
              <Text style={styles.todayText}>Hoje</Text>
            </View>
          </View>

          {/* EPG List */}
          <FlatList
            data={channel.epg}
            renderItem={renderEPGItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            contentContainerStyle={styles.epgList}
          />

          {/* Category Section */}
          <View style={styles.categorySection}>
            <View style={styles.categorySectionHeader}>
              <Text style={styles.categorySectionTitle}>{channel.category}</Text>
              <Pressable>
                <Text style={styles.viewAllLink}>Ver todos ></Text>
              </Pressable>
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
          <MaterialCommunityIcons name="television-box" size={20} color={colors.white} />
          <Text style={[styles.navLabel, { color: colors.white }]}>Canais de TV</Text>
        </Pressable>
        <Pressable style={styles.navItem}>
          <MaterialCommunityIcons name="filmstrip" size={20} color={colors.textMuted} />
          <Text style={styles.navLabel}>Filmes</Text>
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
  headerTitle: { color: colors.white, fontSize: 18, fontWeight: '800' },
  headerLogo: { width: 80, height: 32 },
  headerRight: { flexDirection: 'row', alignItems: 'center', marginLeft: 'auto' },
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
  posterContainer: {
    width: '100%',
    height: 250,
  },
  posterOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  channelInfo: { paddingHorizontal: spacing.md, paddingVertical: spacing.lg },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  channelName: { color: colors.white, fontSize: 24, fontWeight: '800', flex: 1 },
  category: { color: colors.textSecondary, fontSize: 13, marginBottom: spacing.lg },
  epgHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  epgHeaderTitle: { color: colors.white, fontSize: 16, fontWeight: '700' },
  todayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.darkSurface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 6,
  },
  todayText: { color: colors.accentCyan, fontSize: 12, fontWeight: '600' },
  epgList: { gap: spacing.sm, marginBottom: spacing.lg },
  epgItem: {
    backgroundColor: colors.darkSurface,
    padding: spacing.md,
    borderRadius: 8,
  },
  progressBarContainer: {
    height: 2,
    backgroundColor: colors.darkSurfaceAlt,
    borderRadius: 1,
    marginBottom: spacing.sm,
  },
  progressBar: { height: '100%', backgroundColor: colors.accentCyan, borderRadius: 1 },
  epgTitle: { color: colors.white, fontSize: 13, fontWeight: '600', marginBottom: spacing.sm },
  epgTime: { color: colors.textSecondary, fontSize: 12 },
  categorySection: { marginTop: spacing.lg },
  categorySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categorySectionTitle: { color: colors.white, fontSize: 16, fontWeight: '700' },
  viewAllLink: { color: colors.accentCyan, fontSize: 13, fontWeight: '600' },
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
