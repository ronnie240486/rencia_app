import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { colors, spacing } from '@/src/theme';
import { getDeviceMac, resetDeviceMac } from '@/src/lib/device';
import { clearSession, loadSession } from '@/src/state/session';
import { MacStatus } from '@/src/api/client';

type Row = {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  onPress?: () => void;
  danger?: boolean;
};

export default function SettingsScreen() {
  const router = useRouter();
  const [mac, setMac] = useState('');
  const [session, setSession] = useState<MacStatus | null>(null);

  useEffect(() => {
    (async () => {
      const [m, s] = await Promise.all([getDeviceMac(), loadSession()]);
      setMac(m);
      setSession(s);
    })();
  }, []);

  const openWhatsapp = () => {
    if (session?.whatsapp_url) Linking.openURL(session.whatsapp_url).catch(() => {});
  };

  const rows: Row[] = [
    {
      id: 'account',
      title: 'Conta',
      subtitle: session?.status
        ? `${session.status}${session.expire_date ? ` • até ${session.expire_date}` : ''}`
        : mac || 'Carregando...',
      icon: <Ionicons name="person-circle-outline" size={22} color={colors.accentCyan} />,
    },
    {
      id: 'mac',
      title: 'ID do dispositivo',
      subtitle: mac,
      icon: <MaterialCommunityIcons name="identifier" size={20} color={colors.accentCyan} />,
    },
    ...(session?.reseller_whatsapp
      ? [
          {
            id: 'support',
            title: 'Suporte / Revendedor',
            subtitle: session.reseller_contact || session.reseller_whatsapp,
            icon: <Ionicons name="logo-whatsapp" size={20} color={colors.accentCyan} />,
            onPress: openWhatsapp,
          } as Row,
        ]
      : []),
    {
      id: 'cache',
      title: 'Cache',
      subtitle: 'Limpar cache do app',
      icon: <Ionicons name="trash-outline" size={20} color={colors.accentCyan} />,
    },
    {
      id: 'language',
      title: 'Idioma',
      subtitle: 'Português (Brasil)',
      icon: <Ionicons name="language" size={20} color={colors.accentCyan} />,
    },
    {
      id: 'parental',
      title: 'Controle parental',
      subtitle: 'Bloquear conteúdo adulto',
      icon: <MaterialCommunityIcons name="shield-lock-outline" size={20} color={colors.accentCyan} />,
    },
    {
      id: 'player',
      title: 'Player',
      subtitle: 'Preferências de reprodução',
      icon: <Ionicons name="play-circle-outline" size={20} color={colors.accentCyan} />,
    },
    {
      id: 'maximus',
      title: 'Configurações do Maximus',
      subtitle: 'Personalizar app',
      icon: <MaterialCommunityIcons name="cog" size={20} color={colors.accentCyan} />,
      onPress: () => router.push('/maximus-settings'),
    },
    {
      id: 'diagnostic',
      title: 'Diagnóstico',
      subtitle: 'Testar conexão com o backend',
      icon: <MaterialCommunityIcons name="stethoscope" size={20} color={colors.accentCyan} />,
      onPress: () => router.push('/diagnostic'),
    },
    {
      id: 'version',
      title: 'Versão',
      subtitle: `${session?.app_name || 'App'} v${session?.version || '1.0'}`,
      icon: <Ionicons name="information-circle-outline" size={20} color={colors.accentCyan} />,
    },
    {
      id: 'logout',
      title: 'Sair / Trocar dispositivo',
      subtitle: 'Gerar um novo ID',
      icon: <Ionicons name="log-out-outline" size={20} color={colors.danger} />,
      danger: true,
      onPress: async () => {
        await clearSession();
        await resetDeviceMac();
        router.replace('/');
      },
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={16} style={styles.backBtn} testID="settings-back">
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </Pressable>
        <Text style={styles.headerTitle}>Configurações</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: 40 }}>
        {rows.map((r) => (
          <Pressable
            key={r.id}
            onPress={r.onPress}
            style={styles.row}
            testID={`setting-${r.id}`}
          >
            <View style={styles.iconWrap}>{r.icon}</View>
            <View style={styles.textWrap}>
              <Text style={[styles.title, r.danger && { color: colors.danger }]}>{r.title}</Text>
              {!!r.subtitle && <Text style={styles.sub} numberOfLines={1}>{r.subtitle}</Text>}
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        ))}
      </ScrollView>
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
  headerTitle: { color: colors.white, fontSize: 20, fontWeight: '800' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.darkSurface,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.darkSurfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: { flex: 1 },
  title: { color: colors.white, fontSize: 15, fontWeight: '700' },
  sub: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
});
