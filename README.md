# ✝️ Palavra Primeiro

![CI](https://github.com/sandr01/Palavra-primeiro/actions/workflows/ci.yml/badge.svg)
![License](https://img.shields.io/badge/License-MIT-green.svg)

> App mobile que intercede com versículos bíblicos toda vez que você tentar abrir um app distrativo.

---

## 📱 Telas do app

| Tela | Descrição |
|------|-----------|
| **Onboarding** | 4 slides de apresentação + coleta de nome |
| **Início** | Versículo do dia, streak, resumo de apps |
| **Tela de Bloqueio** | Overlay com versículo ao abrir app bloqueado |
| **Progresso** | Gráfico semanal + histórico de meditações |
| **Gerenciar Apps** | Toggle de bloqueio por app |

---

## 🏗️ Estrutura do projeto

```
palavra-primeiro/
├── App.tsx                        # Ponto de entrada
├── app.json                       # Config Expo
├── package.json
│
├── src/
│   ├── constants/
│   │   └── theme.ts               # Cores, tipografia, espaçamento
│   │
│   ├── services/
│   │   ├── bibleService.ts        # API de versículos (api.scripture.api.bible)
│   │   └── blockerService.ts      # Bridge nativo → bloqueio de apps
│   │
│   ├── store/
│   │   └── appStore.ts            # Estado global com Zustand + MMKV
│   │
│   ├── navigation/
│   │   └── AppNavigator.tsx       # Stack + Bottom Tabs + overlay
│   │
│   └── screens/
│       ├── OnboardingScreen.tsx   # Fluxo inicial (4 slides)
│       ├── HomeScreen.tsx         # Tela principal
│       ├── BlockerOverlay.tsx     # ⭐ Tela de intercepção
│       ├── StatsScreen.tsx        # Progresso e histórico
│       └── AppsScreen.tsx         # Gerenciar apps bloqueados
│
└── android/
    └── BlockerModule.kt           # Módulo nativo Android (AccessibilityService)
```

---

## 🚀 Como rodar

### Pré-requisitos
- Node.js 18+
- Expo Go (Play Store) para rodar em dispositivo físico
- Para build nativo Android: Android Studio + SDK
- Para iOS: Xcode 15+ (somente macOS)

### Instalação

```bash
# 1. Clone o projeto
git clone https://github.com/sandr01/Palavra-primeiro.git
cd palavra-primeiro

# 2. Instale dependências
npm install

# 3. Configure a chave da API bíblica
# Crie o arquivo .env na raiz com base no exemplo
cp .env.example .env
# edite o arquivo e preencha a chave
```

### Rodar no Expo Go (modo demo)
```bash
npm run start
```

**Observação:** no Expo Go o bloqueio real não funciona (módulos nativos não carregam). O app exibe um **modo demonstração** no menu **Gerenciar Apps** para simular o bloqueio.

### Rodar build nativo (bloqueio real)
```bash
# gerar o projeto nativo (uma vez)

npx expo prebuild

# rodar no Android
npx expo run:android
```

---

## ⚙️ Como funciona o bloqueio

### Android
O bloqueio usa duas APIs nativas:

1. **UsageStatsManager** — detecta qual app está em foco
2. **AccessibilityService** — intercepta a abertura de apps em tempo real

Fluxo:
```
Usuário abre Instagram
  → BlockerAccessibilityService detecta evento TYPE_WINDOW_STATE_CHANGED
  → Compara com lista de apps bloqueados
  → Emite evento "APP_BLOCKED" para o JavaScript
  → BlockerOverlay aparece sobre o Instagram
  → Usuário lê o versículo (5s mínimo)
  → Clica em "Li e refleti"
  → Serviço nativo libera o app
```

**Permissões necessárias (Android):**
- `PACKAGE_USAGE_STATS` — leitura de estatísticas de uso
- `BIND_ACCESSIBILITY_SERVICE` — monitoramento de apps em foco
- `FOREGROUND_SERVICE` — manter o serviço ativo em background

### iOS
Usa o framework **FamilyControls** (Screen Time API):
- Requer entitlement `com.apple.developer.family-controls`
- Precisa ser assinado com perfil de distribuição Apple
- `ShieldConfiguration` customiza a tela de bloqueio nativa

---

## 📖 API Bíblica

O app usa a **API gratuita** da American Bible Society:

- Suporte a NVI, ARC, ARA, NTLH
- 5.000 requisições/dia gratuitamente
- Modo offline: 10 versículos populares embutidos no app (sem internet)

```typescript
import { getVerseOfDay } from './src/services/bibleService';

const verse = await getVerseOfDay('NVI');
// → { reference: "Filipenses 4:13", text: "Tudo posso...", translation: "NVI" }
```

---

## 🗄️ Persistência de dados

Usa **MMKV** (mais rápido que AsyncStorage). No Expo Go, o app usa armazenamento em memória (não persistente).

| Chave | Conteúdo |
|-------|----------|
| `userName` | Nome do usuário |
| `translation` | Tradução preferida |
| `blockedApps` | Lista com estado de cada app |
| `stats` | Streak, totais, última data de leitura |
| `readingLog` | Histórico de meditações (últimas 200) |

---

## 🧪 Scripts úteis

```bash
npm run start       # Expo
npm run android     # Expo Android
npm run ios         # Expo iOS
npm run typecheck   # TypeScript
```

---

## 📜 Licença

MIT — veja `LICENSE`.