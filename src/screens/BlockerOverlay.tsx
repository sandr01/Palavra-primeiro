// src/screens/BlockerOverlay.tsx
//
// Esta é a tela mais importante do app!
// Aparece automaticamente quando o usuário tenta abrir um app bloqueado.
// No Android: exibida via AccessibilityService como Activity overlay.
// No iOS: exibida via FamilyControls ShieldConfiguration.

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  StatusBar,
  BackHandler,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { useAppStore } from '../store/appStore';
import { getRandomVerse, type Verse } from '../services/bibleService';
import { releaseBlockedApp } from '../services/blockerService';
import { colors, spacing, radius } from '../constants/theme';

interface Props {
  appPackage: string;
  appName: string;
  onRelease: () => void;  // libera o app
  onDismiss: () => void;  // fecha sem abrir
}

export default function BlockerOverlay({
  appPackage,
  appName,
  onRelease,
  onDismiss,
}: Props) {
  const insets = useSafeAreaInsets();
  const { translation, logReading } = useAppStore();

  const [verse, setVerse] = useState<Verse | null>(null);
  const [hasRead, setHasRead] = useState(false);
  const [readTime, setReadTime] = useState(0); // segundos lendo

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Bloqueia botão físico Voltar
  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => handler.remove();
  }, []);

  // Busca versículo
  useEffect(() => {
    getRandomVerse(translation).then((v) => {
      setVerse(v);
      // Inicia timer de leitura
      timerRef.current = setInterval(() => {
        setReadTime((t) => {
          const next = t + 1;
          if (next >= 5) setHasRead(true); // libera o botão após 5s
          return next;
        });
      }, 1000);
    });

    // Animação de entrada
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 60,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [translation]);

  async function handleRelease() {
    if (!hasRead || !verse) return;

    logReading({
      verseReference: verse.reference,
      verseText: verse.text,
      appName,
      skipped: false,
    });

    const openedApp = await releaseBlockedApp(appPackage);
    if (Platform.OS === 'android' && !openedApp) {
      return;
    }
    onRelease();
  }

  function handleSkip() {
    if (verse) {
      logReading({
        verseReference: verse.reference,
        verseText: verse.text,
        appName,
        skipped: true,
      });
    }
    onDismiss();
  }

  const appEmoji = getAppEmoji(appPackage);
  const readProgress = Math.min(readTime / 5, 1);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[colors.overlayStart, colors.primaryDeep, colors.primaryDark]}
        style={[styles.gradient, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}
      >
        {/* App bloqueado */}
        <View style={styles.topSection}>
          <View style={styles.appIconWrapper}>
            <Text style={styles.appEmoji}>{appEmoji}</Text>
          </View>
          <Text style={styles.blockedLabel}>{appName} está pausado</Text>
        </View>

        {/* Versículo */}
        <Animated.View
          style={[styles.verseCard, { transform: [{ translateY: slideAnim }] }]}
        >
          {verse ? (
            <>
              <View style={styles.verseHeader}>
                <View style={styles.crossIcon}>
                  <Text style={styles.crossText}>✝</Text>
                </View>
                <Text style={styles.verseLabel}>Palavra para você</Text>
              </View>

              <Text style={styles.verseText}>"{verse.text}"</Text>

              <View style={styles.verseFooter}>
                <Text style={styles.verseRef}>{verse.reference}</Text>
                <Text style={styles.verseTrans}>{verse.translation}</Text>
              </View>

              {/* Barra de progresso de leitura */}
              <View style={styles.progressBar}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    { width: `${readProgress * 100}%` },
                  ]}
                />
              </View>
              {!hasRead && (
                <Text style={styles.progressHint}>
                  Leia o versículo ({Math.max(0, 5 - readTime)}s)...
                </Text>
              )}
            </>
          ) : (
            <View style={styles.loadingVerse}>
              <Text style={styles.loadingText}>Buscando versículo...</Text>
            </View>
          )}
        </Animated.View>

        {/* Reflexão rápida */}
        {hasRead && verse && (
          <Animated.View style={styles.reflectionCard}>
            <Text style={styles.reflectionText}>
              Respira, lê mais uma vez e vai com Deus. 🙏
            </Text>
          </Animated.View>
        )}

        {/* Botões */}
        <View style={styles.buttons}>
          <TouchableOpacity
            style={[styles.btnPrimary, !hasRead && styles.btnDisabled]}
            onPress={handleRelease}
            disabled={!hasRead}
            activeOpacity={0.85}
          >
            <Feather name="check-circle" size={18} color={hasRead ? colors.primaryDeep : '#aaa'} />
            <Text style={[styles.btnPrimaryText, !hasRead && styles.btnDisabledText]}>
              {hasRead ? 'Li e refleti — abrir app' : `Aguarde ${Math.max(0, 5 - readTime)}s...`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnGhost}
            onPress={handleSkip}
            activeOpacity={0.7}
          >
            <Text style={styles.btnGhostText}>Não quero abrir agora</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getAppEmoji(packageName: string): string {
  if (packageName.includes('instagram')) return '📷';
  if (packageName.includes('tiktok') || packageName.includes('musically')) return '🎵';
  if (packageName.includes('youtube')) return '▶️';
  if (packageName.includes('twitter')) return '🐦';
  if (packageName.includes('facebook')) return '👥';
  if (packageName.includes('whatsapp')) return '💬';
  if (packageName.includes('netflix')) return '🎬';
  return '📱';
}

// ─── Estilos ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  gradient: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },

  topSection: { alignItems: 'center', gap: spacing.xs },
  appIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appEmoji: { fontSize: 32 },
  blockedLabel: {
    fontSize: 13,
    color: 'rgba(200,180,220,0.8)',
    marginTop: 4,
  },

  verseCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  verseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  crossIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  crossText: { fontSize: 14, color: 'white' },
  verseLabel: { fontSize: 11, color: colors.textOnDarkMuted, fontWeight: '500' },

  verseText: {
    fontSize: 16,
    color: 'white',
    lineHeight: 26,
    fontStyle: 'italic',
  },
  verseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  verseRef: { fontSize: 12, color: colors.textOnDarkMuted, fontWeight: '500' },
  verseTrans: { fontSize: 10, color: 'rgba(200,180,220,0.6)' },

  progressBar: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#a78bfa',
    borderRadius: 2,
  },
  progressHint: {
    fontSize: 10,
    color: 'rgba(200,180,220,0.6)',
    textAlign: 'center',
    marginTop: 4,
  },

  loadingVerse: { alignItems: 'center', padding: spacing.lg },
  loadingText: { color: colors.textOnDarkMuted, fontSize: 13 },

  reflectionCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: radius.md,
    padding: spacing.md,
    width: '100%',
  },
  reflectionText: {
    fontSize: 13,
    color: colors.textOnDarkMuted,
    textAlign: 'center',
    lineHeight: 20,
  },

  buttons: { width: '100%', gap: spacing.sm },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'white',
    borderRadius: radius.lg,
    paddingVertical: 14,
  },
  btnDisabled: { backgroundColor: 'rgba(255,255,255,0.2)' },
  btnPrimaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryDeep,
  },
  btnDisabledText: { color: 'rgba(255,255,255,0.4)' },
  btnGhost: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: radius.lg,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  btnGhostText: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
});
