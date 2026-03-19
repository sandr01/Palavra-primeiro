// src/screens/OnboardingScreen.tsx
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppStore } from '../store/appStore';
import { colors, spacing, radius } from '../constants/theme';

const STEPS = [
  {
    emoji: '✝️',
    title: 'Bem-vindo ao\nPalavra Primeiro',
    description:
      'Transforme cada pausa no celular em um momento de conexão com Deus.',
  },
  {
    emoji: '🛡️',
    title: 'Bloqueio com\npropósito',
    description:
      'Quando tentar abrir um app bloqueado, você vai ver um versículo bíblico antes de continuar.',
  },
  {
    emoji: '🔥',
    title: 'Construa um\nhábito diário',
    description:
      'Mantenha sua sequência e veja quantos versículos você meditou ao longo da semana.',
  },
  {
    emoji: '🙏',
    title: 'Pronto para\ncomeçar?',
    description: 'Como você quer ser chamado?',
    hasInput: true,
  },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { setUserName, completeOnboarding } = useAppStore();

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const progressAnim = useRef(new Animated.Value(0)).current;
  const currentStep = STEPS[step];

  function goNext() {
    if (step < STEPS.length - 1) {
      const next = step + 1;
      setStep(next);
      Animated.timing(progressAnim, {
        toValue: next / (STEPS.length - 1),
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else {
      handleFinish();
    }
  }

  function handleFinish() {
    if (name.trim()) setUserName(name.trim());
    completeOnboarding();
  }

  const isLastStep = step === STEPS.length - 1;

  return (
    <LinearGradient
      colors={[colors.primaryDeep, colors.primaryDark, '#5a2a9a']}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      {/* Indicador de progresso */}
      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>

      {/* Slides */}
      <View style={styles.slide}>
        <Text style={styles.emoji}>{currentStep.emoji}</Text>
        <Text style={styles.title}>{currentStep.title}</Text>
        <Text style={styles.description}>{currentStep.description}</Text>

        {currentStep.hasInput && (
          <TextInput
            style={styles.input}
            placeholder="Seu nome..."
            placeholderTextColor="rgba(200,180,220,0.5)"
            value={name}
            onChangeText={setName}
            autoFocus
            maxLength={30}
          />
        )}
      </View>

      {/* Botão */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        {/* Dots */}
        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === step && styles.dotActive]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.btn,
            isLastStep && !name.trim() && styles.btnDisabled,
          ]}
          onPress={goNext}
          disabled={isLastStep && !name.trim()}
        >
          <Text style={styles.btnText}>
            {isLastStep ? 'Começar →' : 'Próximo →'}
          </Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#a78bfa',
    borderRadius: 2,
  },

  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    gap: spacing.lg,
  },
  emoji: { fontSize: 72 },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
    lineHeight: 36,
  },
  description: {
    fontSize: 16,
    color: colors.textOnDarkMuted,
    textAlign: 'center',
    lineHeight: 24,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: 'white',
    fontSize: 16,
    width: '100%',
    textAlign: 'center',
    marginTop: spacing.sm,
  },

  footer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  dotActive: { backgroundColor: 'white', width: 20 },

  btn: {
    backgroundColor: 'white',
    borderRadius: radius.lg,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { fontSize: 16, fontWeight: '700', color: colors.primaryDeep },
});
