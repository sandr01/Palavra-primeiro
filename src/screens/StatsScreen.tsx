// src/screens/StatsScreen.tsx
import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, subDays, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { useAppStore } from '../store/appStore';
import { colors, spacing, radius, shadows } from '../constants/theme';

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const { stats, readingLog } = useAppStore();

  // Últimos 7 dias para o gráfico
  const last7Days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      const count = readingLog.filter(
        (log) => isSameDay(new Date(log.timestamp), date) && !log.skipped
      ).length;
      return {
        date,
        label: format(date, 'EEE', { locale: ptBR }),
        count,
        isToday: isSameDay(date, new Date()),
      };
    });
  }, [readingLog]);

  const maxCount = Math.max(...last7Days.map((d) => d.count), 1);

  const recentLog = readingLog.slice(0, 15);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={[colors.primaryDeep, colors.primaryDark]}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>📊 Meu progresso</Text>
        <Text style={styles.headerSub}>
          Continue firme — cada versículo importa!
        </Text>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ─── Cards de estatísticas ─── */}
        <View style={styles.statsGrid}>
          <StatCard
            value={`🔥 ${stats.currentStreak}`}
            label="Dias seguidos"
            accent
          />
          <StatCard value={`${stats.longestStreak}`} label="Maior sequência" />
          <StatCard value={`${stats.totalVersesRead}`} label="Versículos lidos" />
          <StatCard
            value={`${Math.round(
              stats.totalVersesRead /
                Math.max(stats.totalVersesRead + stats.totalSkips, 1) *
                100
            )}%`}
            label="Meditações completas"
          />
        </View>

        {/* ─── Gráfico de barras ─── */}
        <View style={[styles.card, styles.chartCard]}>
          <Text style={styles.cardTitle}>Meditações — últimos 7 dias</Text>
          <View style={styles.barsContainer}>
            {last7Days.map((day, i) => {
              const heightPct = maxCount > 0 ? day.count / maxCount : 0;
              return (
                <View key={i} style={styles.barCol}>
                  <Text style={styles.barValue}>
                    {day.count > 0 ? day.count : ''}
                  </Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { flex: heightPct },
                        day.isToday && styles.barFillToday,
                      ]}
                    />
                  </View>
                  <Text
                    style={[
                      styles.barLabel,
                      day.isToday && styles.barLabelToday,
                    ]}
                  >
                    {day.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* ─── Histórico ─── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Histórico de meditações</Text>

          {recentLog.length === 0 ? (
            <View style={styles.emptyLog}>
              <Text style={styles.emptyLogText}>
                Nenhuma meditação ainda.{'\n'}Bloqueie um app e comece! 🙏
              </Text>
            </View>
          ) : (
            recentLog.map((log) => (
              <View key={log.id} style={styles.logItem}>
                <View
                  style={[
                    styles.logDot,
                    log.skipped && styles.logDotSkipped,
                  ]}
                />
                <View style={styles.logContent}>
                  <Text style={styles.logRef}>{log.verseReference}</Text>
                  <Text style={styles.logMeta}>
                    {log.appName} •{' '}
                    {log.skipped ? (
                      <Text style={styles.logSkipped}>pulou</Text>
                    ) : (
                      <Text style={styles.logRead}>leu</Text>
                    )}
                  </Text>
                </View>
                <Text style={styles.logTime}>
                  {format(new Date(log.timestamp), 'HH:mm')}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </View>
  );
}

function StatCard({
  value,
  label,
  accent = false,
}: {
  value: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <View style={[styles.statCard, accent && styles.statCardAccent]}>
      <Text style={[styles.statNum, accent && styles.statNumAccent]}>
        {value}
      </Text>
      <Text style={[styles.statLabel, accent && styles.statLabelAccent]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.lg, paddingBottom: spacing.xl },
  headerTitle: { fontSize: 18, fontWeight: '600', color: 'white' },
  headerSub: { fontSize: 12, color: colors.textOnDarkMuted, marginTop: 4 },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.card,
  },
  statCardAccent: {
    backgroundColor: colors.primaryDeep,
  },
  statNum: { fontSize: 24, fontWeight: '600', color: colors.primaryDeep },
  statNumAccent: { color: 'white' },
  statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2, textAlign: 'center' },
  statLabelAccent: { color: colors.textOnDarkMuted },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    ...shadows.card,
  },
  chartCard: { marginBottom: spacing.lg },
  cardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: spacing.md,
  },

  barsContainer: {
    flexDirection: 'row',
    height: 80,
    gap: spacing.xs,
    alignItems: 'flex-end',
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    height: '100%',
    justifyContent: 'flex-end',
  },
  barValue: { fontSize: 10, color: colors.primary, fontWeight: '600', minHeight: 14 },
  barTrack: {
    flex: 1,
    width: '100%',
    backgroundColor: '#f0e8f8',
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    backgroundColor: '#c4b5fd',
    borderRadius: 4,
    minHeight: 4,
  },
  barFillToday: { backgroundColor: colors.primary },
  barLabel: { fontSize: 9, color: colors.textMuted },
  barLabelToday: { color: colors.primary, fontWeight: '600' },

  section: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },

  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    marginBottom: spacing.xs,
    gap: spacing.sm,
    ...shadows.card,
  },
  logDot: {
    width: 8, height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  logDotSkipped: { backgroundColor: '#d1d5db' },
  logContent: { flex: 1 },
  logRef: { fontSize: 13, fontWeight: '500', color: colors.textPrimary },
  logMeta: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  logRead: { color: colors.success },
  logSkipped: { color: colors.textMuted },
  logTime: { fontSize: 11, color: colors.textMuted },

  emptyLog: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xxl,
    alignItems: 'center',
    ...shadows.card,
  },
  emptyLogText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
});
