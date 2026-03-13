// src/navigation/AppNavigator.tsx
import React, { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';

import HomeScreen from '../screens/HomeScreen';
import AppsScreen from '../screens/AppsScreen';
import StatsScreen from '../screens/StatsScreen';
import BlockerOverlay from '../screens/BlockerOverlay';
import OnboardingScreen from '../screens/OnboardingScreen';

import { useAppStore } from '../store/appStore';
import { subscribeToBlockerEvents } from '../services/blockerService';
import { colors } from '../constants/theme';

type MainTabParamList = {
  Início: undefined;
  Progresso: undefined;
  Apps: undefined;
};

type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const Root = createNativeStackNavigator<RootStackParamList>();

// ─── Tab Navigator (telas principais) ─────────────────────────────────────────

function MainTabs() {
  return (
    <Tab.Navigator
      id="MainTabs"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopColor: '#e8e0d8',
          borderTopWidth: 0.5,
          paddingTop: 4,
          height: Platform.OS === 'ios' ? 85 : 64,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#9080a0',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, keyof typeof Feather.glyphMap> = {
            Início: 'home',
            Progresso: 'bar-chart-2',
            Apps: 'shield',
          };
          return (
            <Feather name={icons[route.name] ?? 'circle'} size={size} color={color} />
          );
        },
      })}
    >
      <Tab.Screen name="Início" component={HomeScreen} />
      <Tab.Screen name="Progresso" component={StatsScreen} />
      <Tab.Screen name="Apps" component={AppsScreen} />
    </Tab.Navigator>
  );
}

// ─── Root Navigator (com overlay de bloqueio) ─────────────────────────────────

function AppWithBlocker() {
  const { pendingBlockedApp, triggerBlocker, dismissBlocker } = useAppStore();

  // Escuta eventos do serviço nativo (quando um app bloqueado é aberto)
  useEffect(() => {
    const unsubscribe = subscribeToBlockerEvents((event) => {
      triggerBlocker({
        packageName: event.packageName,
        displayName: event.displayName,
      });
    });
    return unsubscribe;
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <MainTabs />

      {pendingBlockedApp && (
        <BlockerOverlay
          appPackage={pendingBlockedApp.packageName}
          appName={pendingBlockedApp.displayName}
          onRelease={() => {
            // App é liberado — o serviço nativo recebe o sinal para abrir
            dismissBlocker();
          }}
          onDismiss={() => {
            dismissBlocker();
          }}
        />
      )}
    </View>
  );
}

// ─── Navigator raiz (com onboarding) ──────────────────────────────────────────

export default function AppNavigator() {
  const { onboardingDone, loadPersistedState } = useAppStore();

  useEffect(() => {
    loadPersistedState();
  }, []);

  return (
    <NavigationContainer>
      <Root.Navigator id="Root" screenOptions={{ headerShown: false }}>
        {!onboardingDone ? (
          <Root.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <Root.Screen name="Main" component={AppWithBlocker} />
        )}
      </Root.Navigator>
    </NavigationContainer>
  );
}