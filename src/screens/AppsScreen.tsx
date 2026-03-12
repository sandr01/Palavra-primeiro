// src/screens/AppsScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { useAppStore } from '../store/appStore';
import {
  checkUsageStatsPermission,
  checkAccessibilityPermission,
  requestUsageStatsPermission,
  requestAccessibilityPermission,
  requestScreenTimeAuthorization,
  startBlockerService,
  stopBlockerService,
  isNativeBlockerAvailable,
} from '../services/blockerService';
import { colors, spacing, radius, shadows } from '../constants/theme';

const APP_CATEGORIES = [
  {
    label: 'Redes sociais',
    ids: ['instagram', 'tiktok', 'twitter', 'facebook', 'threads'],
  },
  {
    label: 'Entretenimento',
    ids: ['youtube', 'netflix'],
  },
  {
    label: 'Comunicação',
    ids: ['whatsapp'],
  },
];

export default function AppsScreen() {
  const insets = useSafeAreaInsets();
  const { blockedApps, toggleAppBlock, triggerBlocker } = useAppStore();
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const nativeAvailable = isNativeBlockerAvailable();

  async function ensurePermission(): Promise<boolean> {
    if (!nativeAvailable) return true;
    if (Platform.OS === 'android') {
      const usageOk = await checkUsageStatsPermission();
      const accessibilityOk = await checkAccessibilityPermission();

      if (!usageOk || !accessibilityOk) {
        Alert.alert(
          'Permissão necessária',
          'Para bloquear apps, o Palavra Primeiro precisa de:\n\n• Acesso a estatísticas de uso\n• Serviço de Acessibilidade\n\nToque em Configurar para conceder.',
          [
            { text: 'Agora não', style: 'cancel' },
            {
              text: 'Configurar',
              onPress: async () => {
                if (!usageOk) await requestUsageStatsPermission();
                if (!accessibilityOk) await requestAccessibilityPermission();
              },
            },
          ]
        );
        return false;
      }
      return true;
    } else {
      // iOS
      const ok = await requestScreenTimeAuthorization();
      setPermissionGranted(ok);
      return ok;
    }
  }

  async function handleToggle(appId: string) {
    const app = blockedApps.find((a) => a.id === appId);
    if (!app) return;

    // Ao ativar bloqueio, verifica permissões
    if (!app.isBlocked) {
      const ok = await ensurePermission();
      if (!ok) return;
    }

    toggleAppBlock(appId);

    // Atualiza o serviço nativo
    const newBlockedApps = blockedApps.map((a) =>
      a.id === appId ? { ...a, isBlocked: !a.isBlocked } : a
    );
    const blockedPackages = newBlockedApps
      .filter((a) => a.isBlocked)
      .map((a) =>
        Platform.OS === 'android' ? a.packageName : a.bundleId
      );

    if (blockedPackages.length > 0) {
      startBlockerService(blockedPackages);
    } else {
      stopBlockerService();
    }
  }

  function handleDemoBlock() {
    const app =
      blockedApps.find((a) => a.isBlocked) ??
      blockedApps.find((a) => a.id === 'instagram') ??
      blockedApps[0];
    if (!app) return;
    triggerBlocker({
      packageName: app.packageName,
      displayName: app.displayName,
    });
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={[colors.primaryDeep, colors.primaryDark]}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>⚙️ Gerenciar apps</Text>
        <Text style={styles.headerSub}>
          Ative o bloqueio nos apps que mais distraem você
        </Text>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Banner de modo demo */}
        {!nativeAvailable && (
          <View style={styles.demoBanner}>
            <Feather name="zap" size={16} color="#1d4ed8" />
            <Text style={styles.demoText}>
              Modo demonstração (Expo Go). O bloqueio real funciona apenas em
              build nativo. Use o botão abaixo para simular.
            </Text>
            <TouchableOpacity style={styles.demoBtn} onPress={handleDemoBlock}>
              <Text style={styles.demoBtnText}>Simular bloqueio</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Banner de permissão */}
        {permissionGranted === false && (
          <View style={styles.permissionBanner}>
            <Feather name="alert-triangle" size={16} color="#b45309" />
            <Text style={styles.permissionText}>
              Permissão negada. O bloqueio pode não funcionar.
            </Text>
          </View>
        )}

        {APP_CATEGORIES.map((category) => {
          const appsInCategory = blockedApps.filter((a) =>
            category.ids.includes(a.id)
          );

          return (
            <View key={category.label} style={styles.section}>
              <Text style={styles.sectionLabel}>{category.label}</Text>
              {appsInCategory.map((app) => (
                <AppToggleRow
                  key={app.id}
                  app={app}
                  onToggle={() => handleToggle(app.id)}
                />
              ))}
            </View>
          );
        })}

        {/* Info sobre como funciona */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Como funciona?</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoStep}>1.</Text>
            <Text style={styles.infoText}>
              Você tenta abrir um app bloqueado
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoStep}>2.</Text>
            <Text style={styles.infoText}>
              Uma tela com um versículo bíblico aparece
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoStep}>3.</Text>
            <Text style={styles.infoText}>
              Após 5 segundos de leitura, o app é liberado
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoStep}>4.</Text>
            <Text style={styles.infoText}>
              Sua sequência de dias aumenta a cada meditação
            </Text>
          </View>
        </View>

        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </View>
  );
}

function AppToggleRow({
  app,
  onToggle,
}: {
  app: ReturnType<typeof useAppStore>['blockedApps'][0];
  onToggle: () => void;
}) {
  const emoji = getAppEmoji(app.id);
  const bgColor = getAppColor(app.id);

  return (
    <View style={styles.appRow}>
      <View style={[styles.appIcon, { backgroundColor: bgColor }]}>
        <Text style={styles.appEmoji}>{emoji}</Text>
      </View>
      <View style={styles.appInfo}>
        <Text style={styles.appName}>{app.displayName}</Text>
        <Text style={styles.appSub}>
          {app.isBlocked
            ? `${app.blockedCount} pausas realizadas`
            : 'Não bloqueado'}
        </Text>
      </View>
      <Switch
        value={app.isBlocked}
        onValueChange={onToggle}
        trackColor={{ false: '#e0d8d8', true: '#c4b5fd' }}
        thumbColor={app.isBlocked ? colors.primary : '#f5f5f5'}
        ios_backgroundColor="#e0d8d8"
      />
    </View>
  );
}

function getAppEmoji(id: string): string {
  const map: Record<string, string> = {
    instagram: '📷', tiktok: '🎵', youtube: '▶️',
    twitter: '🐦', facebook: '👥', whatsapp: '💬',
    netflix: '🎬', threads: '🔗',
  };
  return map[id] ?? '📱';
}

function getAppColor(id: string): string {
  const map: Record<string, string> = {
    instagram: '#fce8f0', tiktok: '#e8f0fc', youtube: '#fcf0e8',
    twitter: '#e8f8fc', facebook: '#e8ecfc', whatsapp: '#e8fce8',
    netflix: '#fce8e8', threads: '#f0e8fc',
  };
  return map[id] ?? '#f0ece8';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.lg, paddingBottom: spacing.xl },
  headerTitle: { fontSize: 18, fontWeight: '600', color: 'white' },
  headerSub: { fontSize: 12, color: colors.textOnDarkMuted, marginTop: 4 },

  permissionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    margin: spacing.lg,
    backgroundColor: '#fef3c7',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  permissionText: { fontSize: 12, color: '#92400e', flex: 1 },

  demoBanner: {
    margin: spacing.lg,
    marginBottom: 0,
    backgroundColor: '#e0f2fe',
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  demoText: { fontSize: 12, color: '#1e3a8a' },
  demoBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#2563eb',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  demoBtnText: { color: 'white', fontSize: 12, fontWeight: '600' },

  section: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },

  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    marginBottom: spacing.xs,
    ...shadows.card,
  },
  appIcon: {
    width: 40, height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  appEmoji: { fontSize: 20 },
  appInfo: { flex: 1 },
  appName: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  appSub: { fontSize: 11, color: colors.textMuted, marginTop: 1 },

  infoCard: {
    margin: spacing.lg,
    marginTop: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.card,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryDeep,
    marginBottom: 4,
  },
  infoRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  infoStep: { fontSize: 13, fontWeight: '600', color: colors.primary, width: 18 },
  infoText: { fontSize: 13, color: colors.textSecondary, flex: 1, lineHeight: 20 },
});
