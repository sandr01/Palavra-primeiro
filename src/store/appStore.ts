// src/store/appStore.ts
import { create } from 'zustand';
import { MMKV } from 'react-native-mmkv';
import type { BlockedApp } from '../services/blockerService';
import type { TranslationKey } from '../services/bibleService';
import { POPULAR_APPS } from '../services/blockerService';

type KVStorage = {
  getString: (key: string) => string | undefined;
  set: (key: string, value: string) => void;
  delete: (key: string) => void;
};

let storage: KVStorage;

try {
  const mmkv = new MMKV({ id: 'palavra-primeiro' });
  storage = {
    getString: (key) => mmkv.getString(key),
    set: (key, value) => mmkv.set(key, value),
    delete: (key) => mmkv.delete(key),
  };
} catch {
  const mem = new Map<string, string>();
  storage = {
    getString: (key) => mem.get(key),
    set: (key, value) => {
      mem.set(key, value);
    },
    delete: (key) => {
      mem.delete(key);
    },
  };
  // Fallback for Expo Go / missing native module
  console.warn('MMKV unavailable; using in-memory storage.');
}

// ─── Tipos ──────────────────────────────────────────────────────────────────

export interface ReadingLog {
  id: string;
  verseReference: string;
  verseText: string;
  appName: string;
  timestamp: number;
  skipped: boolean; // true = pulou a leitura
}

export interface UserStats {
  currentStreak: number;
  longestStreak: number;
  totalVersesRead: number;
  totalBlocks: number;
  totalSkips: number;
  lastReadDate: string | null; // ISO date string
}

export interface AppState {
  // Configurações
  blockedApps: BlockedApp[];
  translation: TranslationKey;
  userName: string;
  onboardingDone: boolean;

  // Estado atual
  pendingBlockedApp: { packageName: string; displayName: string } | null;
  currentStreak: number;
  stats: UserStats;
  readingLog: ReadingLog[];

  // Ações
  setUserName: (name: string) => void;
  completeOnboarding: () => void;
  toggleAppBlock: (appId: string) => void;
  setTranslation: (t: TranslationKey) => void;
  triggerBlocker: (app: { packageName: string; displayName: string }) => void;
  dismissBlocker: () => void;
  logReading: (entry: Omit<ReadingLog, 'id' | 'timestamp'>) => void;
  loadPersistedState: () => void;
}

// ─── Helpers de persistência ─────────────────────────────────────────────────

function persist<T>(key: string, value: T) {
  storage.set(key, JSON.stringify(value));
}

function load<T>(key: string, defaultValue: T): T {
  const raw = storage.getString(key);
  if (!raw) return defaultValue;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useAppStore = create<AppState>((set, get) => ({
  blockedApps: POPULAR_APPS.map((app) => ({
    ...app,
    isBlocked: false,
    openCount: 0,
    blockedCount: 0,
  })),
  translation: 'NVI',
  userName: '',
  onboardingDone: false,
  pendingBlockedApp: null,
  currentStreak: 0,

  stats: {
    currentStreak: 0,
    longestStreak: 0,
    totalVersesRead: 0,
    totalBlocks: 0,
    totalSkips: 0,
    lastReadDate: null,
  },

  readingLog: [],

  // ─── Ações ────────────────────────────────────────────────────────────────

  setUserName: (name) => {
    set({ userName: name });
    persist('userName', name);
  },

  completeOnboarding: () => {
    set({ onboardingDone: true });
    persist('onboardingDone', true);
  },

  toggleAppBlock: (appId) => {
    const blockedApps = get().blockedApps.map((app) =>
      app.id === appId ? { ...app, isBlocked: !app.isBlocked } : app
    );
    set({ blockedApps });
    persist('blockedApps', blockedApps);
  },

  setTranslation: (translation) => {
    set({ translation });
    persist('translation', translation);
  },

  triggerBlocker: (app) => {
    const blockedApps = get().blockedApps.map((a) =>
      a.packageName === app.packageName
        ? { ...a, blockedCount: a.blockedCount + 1 }
        : a
    );
    set({ pendingBlockedApp: app, blockedApps });
    persist('blockedApps', blockedApps);

    // Atualiza stats
    const stats = { ...get().stats, totalBlocks: get().stats.totalBlocks + 1 };
    set({ stats });
    persist('stats', stats);
  },

  dismissBlocker: () => {
    set({ pendingBlockedApp: null });
  },

  logReading: (entry) => {
    const newEntry: ReadingLog = {
      ...entry,
      id: generateId(),
      timestamp: Date.now(),
    };

    const readingLog = [newEntry, ...get().readingLog].slice(0, 200); // máx 200 registros
    set({ readingLog });
    persist('readingLog', readingLog);

    if (entry.skipped) {
      const stats = { ...get().stats, totalSkips: get().stats.totalSkips + 1 };
      set({ stats });
      persist('stats', stats);
      return;
    }

    // Atualiza streak e stats de leitura
    const today = todayISO();
    const stats = { ...get().stats };
    const lastRead = stats.lastReadDate;

    stats.totalVersesRead += 1;

    if (lastRead === today) {
      // já leu hoje, não altera streak
    } else if (lastRead === getPreviousDay(today)) {
      stats.currentStreak += 1;
      stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak);
    } else {
      stats.currentStreak = 1;
    }

    stats.lastReadDate = today;
    set({ stats, currentStreak: stats.currentStreak });
    persist('stats', stats);
  },

  loadPersistedState: () => {
    const userName = load<string>('userName', '');
    const onboardingDone = load<boolean>('onboardingDone', false);
    const translation = load<TranslationKey>('translation', 'NVI');
    const stats = load<UserStats>('stats', {
      currentStreak: 0,
      longestStreak: 0,
      totalVersesRead: 0,
      totalBlocks: 0,
      totalSkips: 0,
      lastReadDate: null,
    });
    const readingLog = load<ReadingLog[]>('readingLog', []);

    const persistedApps = load<BlockedApp[]>('blockedApps', []);
    const blockedApps =
      persistedApps.length > 0
        ? persistedApps
        : POPULAR_APPS.map((app) => ({
            ...app,
            isBlocked: false,
            openCount: 0,
            blockedCount: 0,
          }));

    set({
      userName,
      onboardingDone,
      translation,
      stats,
      readingLog,
      blockedApps,
      currentStreak: stats.currentStreak,
    });
  },
}));

function getPreviousDay(dateStr: string): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() - 1);
  return date.toISOString().split('T')[0];
}
