// src/screens/HomeScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { useAppStore } from '../store/appStore';
import { getVerseOfDay, type Verse } from '../services/bibleService';
import { colors, spacing, radius, fonts, shadows } from '../constants/theme';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const { userName, stats, blockedApps, translation } = useAppStore();
  const [verse, setVerse] = useState<Verse | null>(null);
  const [loadingVerse, setLoadingVerse] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const blockedActiveApps = blockedApps.filter((a) => a.isBlocked);
  const todayBlocks = blockedApps.reduce((acc, a) => acc + a.blockedCount, 0);

  const greeting = getGreeting();
  const dateStr = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });

  async function fetchVerse() {
    setLoadingVerse(true);
    const v = await getVerseOfDay(translation);
    setVerse(v);
    setLoadingVerse(false);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetchVerse();
    setRefreshing(false);
  }

  useEffect(() => {
    fetchVerse();
  }, [translation]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* ─── Header ─── */}
        <LinearGradient
          colors={[colors.primaryDeep, colors.primaryDark, '#5a2a9a']}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>
                {greeting}, {userName || 'irmão(ã)'} 🌅
              </Text>
              <Text style={styles.dateStr}>
                {dateStr.charAt(0).toUpperCase() + dateStr.slice(1)}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('Settings')}
              style={styles.settingsBtn}
            >
              <Feather name="settings" size={20} color={colors.textOnDarkMuted} />
            </TouchableOpacity>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <StatCard
              value={`🔥 ${stats.currentStreak}`}
              label="dias seguidos"
            />
            <StatCard value={`${stats.totalVersesRead}`} label="versículos lidos" />
            <StatCard value={`${todayBlocks}`} label="pausas hoje" />
          </View>
        </LinearGradient>

        {/* ─── Versículo do Dia ─── */}
        <View style={styles.section}>
          <SectionLabel text="✦ Versículo do dia" />

          <View style={styles.verseCard}>
            {loadingVerse ? (
              <ActivityIndicator color={colors.primary} style={{ padding: 24 }} />
            ) : verse ? (
              <>
                <Text style={styles.verseText}>"{verse.text}"</Text>
                <View style={styles.verseFooter}>
                  <Text style={styles.verseRef}>{verse.reference}</Text>
                  <Text style={styles.verseTrans}>{verse.translation}</Text>
                </View>
                <TouchableOpacity
                  style={styles.meditateBtnContainer}
                  onPress={() => navigation.navigate('Meditation', { verse })}
                >
                  <LinearGradient
                    colors={[colors.primary, colors.primaryDark]}
                    style={styles.meditateBtn}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.meditateBtnText}>
                      Meditar neste versículo
                    </Text>
                    <Feather name="arrow-right" size={16} color="white" />
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        </View>

        {/* ─── Apps bloqueados ─── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <SectionLabel text="Apps bloqueados" />
            <TouchableOpacity onPress={() => navigation.navigate('Apps')}>
              <Text style={styles.seeAll}>Gerenciar →</Text>
            </TouchableOpacity>
          </View>

          {blockedActiveApps.length === 0 ? (
            <TouchableOpacity
              style={styles.emptyAppsCard}
              onPress={() => navigation.navigate('Apps')}
            >
              <Feather name="shield-off" size={32} color={colors.textMuted} />
              <Text style={styles.emptyAppsText}>
                Nenhum app bloqueado ainda.{'\n'}Toque para configurar.
              </Text>
            </TouchableOpacity>
          ) : (
            blockedActiveApps.map((app) => (
              <AppRow key={app.id} app={app} />
            ))
          )}
        </View>

        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </View>
  );
}

// ─── Sub-componentes ─────────────────────────────────────────────────────────

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statNum}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SectionLabel({ text }: { text: string }) {
  return <Text style={styles.sectionLabel}>{text}</Text>;
}

function AppRow({ app }: { app: ReturnType<typeof useAppStore>['blockedApps'][0] }) {
  const appEmoji = getAppEmoji(app.id);
  return (
    <View style={styles.appRow}>
      <View style={[styles.appIconCircle, { backgroundColor: getAppColor(app.id) }]}>
        <Text style={styles.appEmoji}>{appEmoji}</Text>
      </View>
      <View style={styles.appInfo}>
        <Text style={styles.appName}>{app.displayName}</Text>
        <Text style={styles.appSub}>
          {app.blockedCount} pausas • {app.openCount} acessos
        </Text>
      </View>
      <View style={styles.activeBadge}>
        <Text style={styles.activeBadgeText}>ativo</Text>
      </View>
    </View>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

function getAppEmoji(id: string): string {
  const emojis: Record<string, string> = {
    instagram: '📷', tiktok: '🎵', youtube: '▶️',
    twitter: '🐦', facebook: '👥', whatsapp: '💬',
    netflix: '🎬', threads: '🔗',
  };
  return emojis[id] ?? '📱';
}

function getAppColor(id: string): string {
  const colors_map: Record<string, string> = {
    instagram: '#fce8f0', tiktok: '#e8f0fc', youtube: '#fcf0e8',
    twitter: '#e8f8fc', facebook: '#e8ecfc', whatsapp: '#e8fce8',
    netflix: '#fce8e8', threads: '#f0e8fc',
  };
  return colors_map[id] ?? '#f0ece8';
}

// ─── Estilos ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: { padding: spacing.lg, paddingBottom: spacing.xl },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  greeting: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textOnDark,
  },
  dateStr: {
    fontSize: 12,
    color: colors.textOnDarkMuted,
    marginTop: 2,
  },
  settingsBtn: { padding: 4 },

  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  statNum: { fontSize: 18, fontWeight: '600', color: colors.textOnDark },
  statLabel: { fontSize: 9, color: colors.textOnDarkMuted, marginTop: 2, textAlign: 'center' },

  section: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  seeAll: { fontSize: 12, color: colors.primary, marginBottom: spacing.sm },

  verseCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadows.card,
  },
  verseText: {
    fontSize: 15,
    color: colors.primaryDeep,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  verseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  verseRef: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
  verseTrans: {
    fontSize: 10,
    color: colors.primary,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  meditateBtnContainer: { marginTop: spacing.md },
  meditateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radius.md,
    paddingVertical: 10,
  },
  meditateBtnText: { color: 'white', fontWeight: '600', fontSize: 13 },

  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    marginBottom: spacing.xs,
    ...shadows.card,
  },
  appIconCircle: {
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
  activeBadge: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  activeBadgeText: { fontSize: 10, fontWeight: '600', color: colors.primary },

  emptyAppsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xxl,
    alignItems: 'center',
    gap: spacing.md,
    ...shadows.card,
  },
  emptyAppsText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
