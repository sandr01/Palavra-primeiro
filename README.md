# ✝️ Palavra Primeiro

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
- Expo CLI: `npm install -g expo-cli`
- Para Android: Android Studio + emulador ou dispositivo físico
- Para iOS: Xcode 15+ (somente macOS)

### Instalação

```bash
# 1. Clone o projeto
git clone <url> && cd palavra-primeiro

# 2. Instale dependências
npm install

# 3. Configure a chave da API bíblica
# Crie uma conta gratuita em https://scripture.api.bible/signup
# Crie o arquivo .env na raiz:
echo 'EXPO_PUBLIC_BIBLE_API_KEY=sua_chave_aqui' > .env

# 4. Rode no Android
npm run android

# 5. Rode no iOS
npm run ios
```

---

## ⚙️ Como funciona o bloqueio

### Android
O bloqueio usa duas APIs nativas:

1. **`UsageStatsManager`** — detecta qual app está em foco
2. **`AccessibilityService`** — intercepta a abertura de apps em tempo real

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

**Importante:** No iOS, a tela de bloqueio é a tela nativa do Screen Time personalizada. O desbloqueio requer um `ShieldActionDelegate` que chama de volta ao app para verificar se o versículo foi lido.

---

## 📖 API Bíblica

O app usa a **API gratuita** da [American Bible Society](https://scripture.api.bible):

- Suporte a NVI, ARC, ARA, NTLH
- 5.000 requisições/dia gratuitamente
- Modo offline: 10 versículos populares embutidos no app (sem internet)

```typescript
// Exemplo de uso
import { getVerseOfDay, getRandomVerse } from './src/services/bibleService';

const verse = await getVerseOfDay('NVI');
// → { reference: "Filipenses 4:13", text: "Tudo posso...", translation: "NVI" }
```

---

## 🗄️ Persistência de dados

Usa **MMKV** (muito mais rápido que AsyncStorage):

| Chave | Conteúdo |
|-------|----------|
| `userName` | Nome do usuário |
| `translation` | Tradução preferida |
| `blockedApps` | Lista com estado de cada app |
| `stats` | Streak, totais, última data de leitura |
| `readingLog` | Histórico de meditações (últimas 200) |

---

## 🛠️ Próximas funcionalidades (roadmap)

- [ ] Planos de leitura bíblica (cronológico, temático)
- [ ] Notificações de encorajamento diário
- [ ] Compartilhar versículo por WhatsApp
- [ ] Widget na tela de bloqueio do celular
- [ ] Modo família (bloquear para filhos)
- [ ] Estatísticas mensais e anuais
- [ ] Marcação de versículos favoritos

---

## 📦 Dependências principais

| Pacote | Uso |
|--------|-----|
| `expo` + `expo-router` | Framework React Native |
| `zustand` | Estado global simples e performático |
| `react-native-mmkv` | Armazenamento local ultra-rápido |
| `expo-linear-gradient` | Gradientes da UI |
| `@react-navigation` | Navegação entre telas |
| `date-fns` | Manipulação de datas (streak) |
| `axios` | Requisições HTTP para a API bíblica |
| `@expo/vector-icons` | Ícones Feather |

---

## 🔨 Build para produção

```bash
# Instale EAS CLI
npm install -g eas-cli
eas login

# Configure
eas build:configure

# Build Android (.aab para Play Store)
eas build --platform android

# Build iOS (.ipa para App Store)
eas build --platform ios
```

---

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch: `git checkout -b feature/nova-funcionalidade`
3. Commit: `git commit -m 'feat: adiciona nova funcionalidade'`
4. Push: `git push origin feature/nova-funcionalidade`
5. Abra um Pull Request

---

*Feito com ❤️ e fé para a comunidade cristã brasileira*
