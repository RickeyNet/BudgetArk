# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start                  # Start Expo dev server (shows QR code for Expo Go)
npx expo start --android   # Launch on Android emulator
npx expo start --ios       # Launch on iOS simulator
npx expo start --web       # Run on web (experimental)
```

There are no lint, test, or build scripts configured. TypeScript type-checking runs via the Expo toolchain.

## Architecture

BudgetArk is a **React Native + Expo** mobile app for personal finance (debt tracking, budgeting, investment projections). It is fully offline-first — no backend, no authentication, no external API. All data lives on-device via AsyncStorage.

### Tech Stack
- **React Native 0.81.5** with **Expo 54** (New Architecture enabled)
- **React Navigation** (bottom tabs, 4 screens)
- **AsyncStorage** for all persistence
- **React Context** for theme (no Redux/Zustand)
- **Victory Native** for charts, **React Native Reanimated** for animations
- **TypeScript** with strict mode (`tsconfig.json` extends `expo/tsconfig.base`)

### Code Organization

```
src/
├── navigation/    # AppNavigator.tsx — bottom tab navigator
├── screens/       # Full-page components (one per tab)
├── components/    # Reusable UI (DebtCard, AddDebtModal, ProgressRing)
├── storage/       # AsyncStorage CRUD wrappers (debtStorage.ts, userStorage.ts)
├── theme/         # ThemeProvider (React Context) + themes.ts (Forest Gold, Neon Purple)
├── types/         # index.ts — ALL shared TypeScript types live here
└── utils/         # calculations.ts — pure financial math functions
```

### Data Flow

All types are centralized in `src/types/index.ts`. Key types: `Debt`, `Payment`, `UserAccount`, `RootTabParamList`.

Storage keys:
- `@budgetark_debts` — JSON array of debts
- `@budgetark_payments` — JSON array of payments
- `@budgetark_user` — single user object (anonymous, UUID-based)

User identity is anonymous (UUID, no sign-up). The onboarding flow gates the main app via `UserAccount.onboardingComplete`.

### Theme System

All screens/components consume colors via `useTheme()` hook from `src/theme/ThemeProvider.tsx`. Never hardcode colors — always use `colors.*` from the theme context. The `ThemeColors` type defines the full palette (`bg`, `card`, `accent`, `text`, `success`, `danger`, etc.).

### Phase Status

- **Phase 1 — Debt Tracker**: Fully implemented (`DebtTrackerScreen`, `DebtCard`, `AddDebtModal`, `debtStorage`, `calculations`)
- **Phase 2 — Budget**: Scaffolded (`BudgetScreen.tsx` is a placeholder)
- **Phase 3 — Investments**: Scaffolded (`InvestmentScreen.tsx` is a placeholder)

### Key Conventions

- `babel.config.js` must include `react-native-reanimated/plugin` — required for animations to work
- Financial calculations belong in `src/utils/calculations.ts` as pure functions
- State management is intentionally minimal: local `useState` per screen + Context for theme
- Screens use `React.memo`, `useCallback`, and `useMemo` on expensive operations
