// src/services/blockerService.ts
//
// ANDROID: usa UsageStatsManager + AccessibilityService
// iOS:     usa FamilyControls / ScreenTime API (Swift nativo)
//
// Este arquivo é o bridge React Native ↔ código nativo.
// Ver /android/app/src/main/java/.../BlockerModule.kt para o nativo.

import { NativeModules, Platform, AppState, NativeEventEmitter } from 'react-native';

const { BlockerModule } = NativeModules;

export function isNativeBlockerAvailable(): boolean {
  return Boolean(
    BlockerModule?.startForegroundService ||
      BlockerModule?.applyScreenTimeRestrictions
  );
}

export interface BlockedApp {
  id: string;
  packageName: string; // Android: "com.instagram.android"
  bundleId: string;    // iOS:     "com.burbn.instagram"
  displayName: string;
  icon?: string;       // base64 icon
  isBlocked: boolean;
  openCount: number;   // quantas vezes tentou abrir hoje
  blockedCount: number; // quantas vezes foi barrado
}

export const POPULAR_APPS: Omit<BlockedApp, 'isBlocked' | 'openCount' | 'blockedCount'>[] = [
  {
    id: 'instagram',
    packageName: 'com.instagram.android',
    bundleId: 'com.burbn.instagram',
    displayName: 'Instagram',
  },
  {
    id: 'tiktok',
    packageName: 'com.zhiliaoapp.musically',
    bundleId: 'com.zhiliaoapp.musically',
    displayName: 'TikTok',
  },
  {
    id: 'youtube',
    packageName: 'com.google.android.youtube',
    bundleId: 'com.google.ios.youtube',
    displayName: 'YouTube',
  },
  {
    id: 'twitter',
    packageName: 'com.twitter.android',
    bundleId: 'com.atebits.Tweetie2',
    displayName: 'X / Twitter',
  },
  {
    id: 'facebook',
    packageName: 'com.facebook.katana',
    bundleId: 'com.facebook.Facebook',
    displayName: 'Facebook',
  },
  {
    id: 'whatsapp',
    packageName: 'com.whatsapp',
    bundleId: 'net.whatsapp.WhatsApp',
    displayName: 'WhatsApp',
  },
  {
    id: 'netflix',
    packageName: 'com.netflix.mediaclient',
    bundleId: 'com.netflix.Netflix',
    displayName: 'Netflix',
  },
  {
    id: 'threads',
    packageName: 'com.instagram.barcelona',
    bundleId: 'com.burbn.barcelona',
    displayName: 'Threads',
  },
];

// ─── Android: Permissões ────────────────────────────────────────────────────

export async function checkUsageStatsPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  return BlockerModule?.hasUsageStatsPermission?.() ?? false;
}

export async function requestUsageStatsPermission(): Promise<void> {
  if (Platform.OS !== 'android') return;
  BlockerModule?.openUsageStatsSettings?.();
}

export async function checkAccessibilityPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  return BlockerModule?.isAccessibilityServiceEnabled?.() ?? false;
}

export async function requestAccessibilityPermission(): Promise<void> {
  if (Platform.OS !== 'android') return;
  BlockerModule?.openAccessibilitySettings?.();
}

// ─── iOS: Screen Time API ───────────────────────────────────────────────────

export async function requestScreenTimeAuthorization(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  return BlockerModule?.requestFamilyControlsAuthorization?.() ?? false;
}

// ─── Bloqueio ───────────────────────────────────────────────────────────────

export function startBlockerService(blockedPackages: string[]): void {
  if (Platform.OS === 'android') {
    BlockerModule?.startForegroundService?.(blockedPackages);
  } else {
    // iOS: aplica restrições via FamilyControls
    BlockerModule?.applyScreenTimeRestrictions?.(blockedPackages);
  }
}

export function stopBlockerService(): void {
  if (Platform.OS === 'android') {
    BlockerModule?.stopForegroundService?.();
  } else {
    BlockerModule?.removeScreenTimeRestrictions?.();
  }
}

// ─── Eventos (nativo → JS) ──────────────────────────────────────────────────

export type BlockerEvent = {
  packageName: string;
  displayName: string;
  timestamp: number;
};

let eventEmitter: NativeEventEmitter | null = null;

export function subscribeToBlockerEvents(
  callback: (event: BlockerEvent) => void
): () => void {
  if (!BlockerModule) {
    // Modo desenvolvimento: simula evento após 3s
    const timer = setTimeout(() => {
      callback({
        packageName: 'com.instagram.android',
        displayName: 'Instagram',
        timestamp: Date.now(),
      });
    }, 3000);
    return () => clearTimeout(timer);
  }

  if (!eventEmitter) {
    eventEmitter = new NativeEventEmitter(BlockerModule);
  }

  const subscription = eventEmitter.addListener('APP_BLOCKED', callback);
  return () => subscription.remove();
}

// ─── Estatísticas de uso ────────────────────────────────────────────────────

export async function getUsageStats(
  startTime: Date,
  endTime: Date
): Promise<Record<string, number>> {
  if (Platform.OS !== 'android' || !BlockerModule) return {};

  return BlockerModule.getUsageStats(
    startTime.getTime(),
    endTime.getTime()
  );
}
