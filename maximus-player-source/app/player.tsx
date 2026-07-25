import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';

import { colors, spacing } from '@/src/theme';

const HIDE_AFTER_MS = 3500;

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '00:00';
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

export default function PlayerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id: string;
    name?: string;
    stream: string;
    logo?: string;
  }>();

  const [buffering, setBuffering] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isLive = String(params.id || '').startsWith('live-');

  const player = useVideoPlayer(params.stream || '', (p) => {
    p.loop = false;
    p.play();
  });

  const scheduleHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), HIDE_AFTER_MS);
  }, []);

  const revealControls = useCallback(() => {
    setShowControls(true);
    scheduleHide();
  }, [scheduleHide]);

  useEffect(() => {
    scheduleHide();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [scheduleHide]);

  useEffect(() => {
    const statusSub = player.addListener('statusChange', (s) => {
      setBuffering(s.status === 'loading');
      if (s.status === 'error') {
        setError('Não foi possível reproduzir esta transmissão.');
      } else {
        setError(null);
      }
    });
    const playingSub = player.addListener('playingChange', (e) => {
      setPlaying(e.isPlaying);
    });
    return () => {
      statusSub.remove();
      playingSub.remove();
    };
  }, [player]);

  // Poll current time / duration for VOD content.
  useEffect(() => {
    if (isLive) return;
    const t = setInterval(() => {
      try {
        setCurrentTime(player.currentTime || 0);
        setDuration(player.duration || 0);
      } catch {}
    }, 500);
    return () => clearInterval(t);
  }, [player, isLive]);

  const togglePlay = () => {
    if (playing) player.pause();
    else player.play();
    revealControls();
  };

  const seekBy = (delta: number) => {
    try {
      const target = Math.max(0, Math.min((player.duration || 0), (player.currentTime || 0) + delta));
      player.currentTime = target;
    } catch {}
    revealControls();
  };

  const seekToPercent = (pct: number) => {
    if (!duration) return;
    try {
      player.currentTime = Math.max(0, Math.min(duration, duration * pct));
    } catch {}
    revealControls();
  };

  const channelName = params.name || 'Reprodução';
  const logo = params.logo;
  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;

  return (
    <View style={styles.root} testID="player-root">
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
        nativeControls={false}
      />

      {/* Tap layer to toggle controls */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={() => (showControls ? setShowControls(false) : revealControls())}
        testID="player-tap-surface"
      />

      {buffering && !error && (
        <View style={[styles.centerOverlay, { pointerEvents: 'none' }]}>
          <ActivityIndicator color={colors.accentCyan} size="large" />
        </View>
      )}

      {!!error && (
        <View style={styles.errorOverlay}>
          <MaterialCommunityIcons name="alert-circle" size={40} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => router.back()} style={styles.errorBtn}>
            <Text style={styles.errorBtnText}>VOLTAR</Text>
          </Pressable>
        </View>
      )}

      {showControls && !error && (
        <>
          <LinearGradient
            colors={['rgba(11,15,26,0.85)', 'transparent']}
            style={styles.topScrim}
            pointerEvents="none"
          />
          <LinearGradient
            colors={['transparent', 'rgba(11,15,26,0.9)', colors.black]}
            style={styles.bottomScrim}
            pointerEvents="none"
          />

          <SafeAreaView style={styles.safe} edges={['top', 'bottom']} pointerEvents="box-none">
            <View style={styles.topBar} pointerEvents="box-none">
              <Pressable onPress={() => router.back()} hitSlop={12} style={styles.topBtn} testID="player-back">
                <Ionicons name="chevron-back" size={22} color={colors.white} />
              </Pressable>
              <Text style={styles.topTitle} numberOfLines={1}>{channelName}</Text>
              <View style={{ width: 36 }} />
            </View>

            <View style={styles.centerControls} pointerEvents="box-none">
              <Pressable
                onPress={() => seekBy(-10)}
                style={[styles.sideBtn, isLive && { opacity: 0.4 }]}
                disabled={isLive}
                testID="player-seek-back"
              >
                <MaterialCommunityIcons name="rewind-10" size={32} color={colors.white} />
              </Pressable>
              <Pressable
                onPress={togglePlay}
                style={styles.playBtn}
                testID="player-play-pause"
              >
                <Ionicons
                  name={playing ? 'pause' : 'play'}
                  size={40}
                  color={colors.white}
                />
              </Pressable>
              <Pressable
                onPress={() => seekBy(10)}
                style={[styles.sideBtn, isLive && { opacity: 0.4 }]}
                disabled={isLive}
                testID="player-seek-fwd"
              >
                <MaterialCommunityIcons name="fast-forward-10" size={32} color={colors.white} />
              </Pressable>
            </View>

            <View style={styles.bottomWrap} pointerEvents="box-none">
              <View style={styles.logoBlock}>
                <View style={styles.logoCard}>
                  {logo ? (
                    <Image source={{ uri: logo }} style={{ width: 56, height: 56 }} contentFit="contain" />
                  ) : (
                    <MaterialCommunityIcons name="television-classic" size={32} color={colors.black} />
                  )}
                </View>
              </View>

              <View style={styles.infoBlock}>
                <Text style={styles.channelName} numberOfLines={1}>{channelName}</Text>
                {isLive ? (
                  <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>AO VIVO</Text>
                  </View>
                ) : (
                  <>
                    <View style={styles.progressRow}>
                      <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
                      <SeekBar progress={progress} onSeek={seekToPercent} />
                      <Text style={styles.timeText}>{formatTime(duration)}</Text>
                    </View>
                  </>
                )}
              </View>

              <View style={styles.controlsColumn}>
                <Pressable style={styles.ctrlBtn} testID="player-list">
                  <Ionicons name="list" size={20} color={colors.white} />
                </Pressable>
                <Pressable onPress={() => router.back()} style={styles.ctrlBtn} testID="player-close">
                  <Ionicons name="close" size={20} color={colors.white} />
                </Pressable>
              </View>
            </View>
          </SafeAreaView>
        </>
      )}
    </View>
  );
}

function SeekBar({ progress, onSeek }: { progress: number; onSeek: (pct: number) => void }) {
  const [width, setWidth] = useState(1);
  return (
    <Pressable
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      onPress={(e) => {
        const x = e.nativeEvent.locationX;
        onSeek(Math.max(0, Math.min(1, x / width)));
      }}
      style={styles.seekTouch}
      testID="player-seek-bar"
    >
      <View style={styles.seekTrack}>
        <View style={[styles.seekFill, { width: `${progress * 100}%` }]} />
        <View style={[styles.seekThumb, { left: `${progress * 100}%` }]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.black },
  safe: { flex: 1 },
  centerOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(11,15,26,0.85)',
    gap: 12,
    paddingHorizontal: 32,
  },
  errorText: { color: colors.white, fontSize: 14, textAlign: 'center' },
  errorBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.accentCyan,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 20,
  },
  errorBtnText: { color: colors.accentCyan, fontWeight: '800', letterSpacing: 1.2 },
  topScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 120,
  },
  bottomScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 220,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: 12,
  },
  topBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(11,15,26,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    flex: 1,
    color: colors.white,
    fontWeight: '700',
    textAlign: 'center',
    fontSize: 15,
  },
  centerControls: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 40,
  },
  sideBtn: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: 'rgba(76,232,240,0.15)',
    borderWidth: 2,
    borderColor: colors.accentCyan,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  logoBlock: { width: 72, alignItems: 'center' },
  logoCard: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  infoBlock: { flex: 1 },
  channelName: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accentCyan,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.black },
  liveText: { color: colors.black, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    minWidth: 44,
    textAlign: 'center',
  },
  seekTouch: { flex: 1, paddingVertical: 12, justifyContent: 'center' },
  seekTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 2,
    overflow: 'visible',
  },
  seekFill: {
    height: '100%',
    backgroundColor: colors.accentCyan,
    borderRadius: 2,
  },
  seekThumb: {
    position: 'absolute',
    top: -5,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.white,
    marginLeft: -7,
  },
  controlsColumn: { alignItems: 'flex-end', gap: 8 },
  ctrlBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(30,36,56,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
