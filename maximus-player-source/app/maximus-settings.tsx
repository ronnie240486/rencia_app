import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { colors, spacing } from '@/src/theme';

type Settings = {
  autoLogin: boolean;
  autoPlayLastChannel: boolean;
  autoRotate: boolean;
  imageRatio: string;
  bufferSize: string;
  retryAttempts: number;
  language: string;
  contactEmail: string;
};

const DEFAULT_SETTINGS: Settings = {
  autoLogin: false,
  autoPlayLastChannel: false,
  autoRotate: false,
  imageRatio: 'Preencher',
  bufferSize: 'Médio',
  retryAttempts: 3,
  language: 'Português (Brasil)',
  contactEmail: 'support@maximus.tv',
};

export default function MaximusSettingsScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      // Aqui você chamaria o endpoint do backend
      // const response = await apiClient.get('/api/v5/maximus/settings');
      // setSettings(response.data);
      
      // Por enquanto, usar defaults
      setSettings(DEFAULT_SETTINGS);
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      // Aqui você chamaria o endpoint do backend
      // await apiClient.post('/api/v5/maximus/settings', settings);
      console.log('Configurações salvas:', settings);
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
    } finally {
      setSaving(false);
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

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={16} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </Pressable>
        <Text style={styles.headerTitle}>Configurações do Maximus</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: 40 }}>
        {/* Seção Geral */}
        <Text style={styles.sectionTitle}>Geral</Text>

        <View style={styles.settingRow}>
          <Text style={styles.label}>Sempre fazer login neste subusuário</Text>
          <Switch
            value={settings.autoLogin}
            onValueChange={(value) => setSettings({ ...settings, autoLogin: value })}
            trackColor={{ false: colors.darkSurface, true: colors.accentCyan }}
          />
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.label}>Reproduzir automaticamente o último canal</Text>
          <Switch
            value={settings.autoPlayLastChannel}
            onValueChange={(value) => setSettings({ ...settings, autoPlayLastChannel: value })}
            trackColor={{ false: colors.darkSurface, true: colors.accentCyan }}
          />
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.label}>Rotação automática</Text>
          <Switch
            value={settings.autoRotate}
            onValueChange={(value) => setSettings({ ...settings, autoRotate: value })}
            trackColor={{ false: colors.darkSurface, true: colors.accentCyan }}
          />
        </View>

        {/* Seção Configurações do Reprodutor */}
        <Text style={styles.sectionTitle}>Configurações do Reprodutor</Text>

        <View style={styles.settingRow}>
          <Text style={styles.label}>Proporção da imagem padrão</Text>
          <Pressable style={styles.selectButton}>
            <Text style={styles.selectText}>{settings.imageRatio}</Text>
            <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
          </Pressable>
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.label}>Tamanho do buffer</Text>
          <Pressable style={styles.selectButton}>
            <Text style={styles.selectText}>{settings.bufferSize}</Text>
            <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
          </Pressable>
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.label}>Tentar novamente</Text>
          <TextInput
            style={styles.input}
            value={String(settings.retryAttempts)}
            onChangeText={(value) => setSettings({ ...settings, retryAttempts: parseInt(value) || 0 })}
            keyboardType="number-pad"
            maxLength={2}
          />
        </View>

        {/* Seção Informação */}
        <Text style={styles.sectionTitle}>Informação</Text>

        <View style={styles.settingRow}>
          <Text style={styles.label}>Idioma</Text>
          <Pressable style={styles.selectButton}>
            <Text style={styles.selectText}>{settings.language}</Text>
            <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
          </Pressable>
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.label}>Fale conosco</Text>
          <TextInput
            style={styles.input}
            value={settings.contactEmail}
            onChangeText={(value) => setSettings({ ...settings, contactEmail: value })}
            placeholder="Email de contato"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        {/* Botão Salvar */}
        <Pressable
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={saveSettings}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.saveButtonText}>Salvar Configurações</Text>
          )}
        </Pressable>
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
    borderBottomWidth: 1,
    borderBottomColor: colors.darkSurface,
  },
  backBtn: { padding: 4 },
  headerTitle: { color: colors.white, fontSize: 18, fontWeight: '800' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.darkSurface,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  label: { color: colors.white, fontSize: 14, fontWeight: '500', flex: 1 },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.darkSurfaceAlt,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 6,
  },
  selectText: { color: colors.textSecondary, fontSize: 13 },
  input: {
    backgroundColor: colors.darkSurfaceAlt,
    color: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 6,
    minWidth: 60,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: colors.accentCyan,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: colors.black, fontSize: 16, fontWeight: '700' },
});
