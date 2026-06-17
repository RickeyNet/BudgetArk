# BudgetArk

A private, local-first personal finance app for budgeting, debt payoff, and net worth tracking — built with React Native and Expo. All your financial data stays on your device; nothing is sent to a server. Optional peer-to-peer sync lets you share data with a partner's device directly over your local Wi-Fi.

> **Platforms:** iOS & Android (Expo / React Native) · **Status:** v1.7.2 · Private project.

## Features

- **Budget** (💰) — track income and expenses with customizable category buckets and zero-based budgeting.
- **Debt Tracker** (⛓️) — plan payoffs with snowball/avalanche strategies, payment history, and milestone celebrations.
- **Bridge** (🧭) — net worth dashboard with accounts, history snapshots, and progress over time.
- **Charts** (🗺️) — a learning hub of built-in finance lessons plus charting/analysis tools.
- **Profile** (👤) — anonymous account, themes, and settings.
- **Partner sync** — pair with a second device and sync over the local network (no cloud, no account). See [Privacy & security](#privacy--security).
- **Import / export** — read and write spreadsheets (`.xlsx`) for backups and migration.
- **Extras** — achievements/gamification, multiple themes with ambient backgrounds, haptics, and configurable display density.

## Requirements

- **Node.js** 18+ and npm
- **Expo CLI** (invoked via `npx`, no global install required)
- For native builds:
  - **iOS:** macOS with Xcode
  - **Android:** Android Studio + SDK
- A physical device or simulator/emulator. The app uses native modules (TCP sockets, zeroconf, secure store), so it requires a **development build** — it will **not** run in the standard Expo Go client.

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Start the Metro bundler
npm start

# 3. Build & run on a device/simulator (first run compiles native code)
npm run ios       # iOS
npm run android   # Android
```

Because BudgetArk relies on custom native modules, use `npm run ios` / `npm run android` to produce a dev build rather than scanning the QR code into Expo Go.

## Scripts

| Script | Description |
| --- | --- |
| `npm start` | Start the Expo dev server / Metro bundler. |
| `npm run ios` | Build and run on iOS (`expo run:ios`). |
| `npm run android` | Build and run on Android (`expo run:android`). |
| `npm run web` | Start the web target (`expo start --web`). |
| `npm run screenshots:generate` | Generate App Store screenshots. |
| `npm run update:message` | Compose an EAS Update release message. |

## Project structure

```
src/
  screens/      Top-level tab screens (Budget, DebtTracker, Bridge, Charts, Profile)
  navigation/   Bottom-tab navigator and layout
  components/   Reusable UI (charts, cards, modals)
  storage/      AsyncStorage-backed persistence per feature
  sync/         Peer-to-peer pairing, discovery, and auto-sync
  currency/     Currency provider & preferences
  categories/   Custom budget categories
  data/         Static content: lessons, category icons, buckets
  lessons/      Learning-hub rendering and screens
  theme/        Themes, density, surfaces, background effects
  utils/        Net worth, recurrence, budget math, haptics, helpers
  onboarding/   Coachmarks and spotlight tour
plugins/        Custom Expo config plugins (e.g. screen guard)
scripts/        Build/release tooling
assets/         Icons, splash, images
```

## Tech stack

- **React Native** 0.83 + **React** 19, managed with **Expo** SDK 55
- **TypeScript**
- **React Navigation** (bottom tabs) for navigation
- **react-native-reanimated** + **react-native-svg** for animation and charts
- **react-native-tcp-socket** + **react-native-zeroconf** for local-network peer discovery and sync
- **expo-secure-store**, **expo-crypto**, **crypto-js** for encryption and secure storage
- **xlsx (SheetJS)** for spreadsheet import/export
- **AsyncStorage** for local persistence
- **expo-updates** for over-the-air updates

## Privacy & security

BudgetArk is local-first by design:

- Financial data is stored **on the device only** — there is no backend server and no account sign-in.
- Partner sync is **device-to-device over your local Wi-Fi** using Bonjour/zeroconf discovery and a direct TCP connection. Synced data is encrypted in transit.
- Sensitive values are kept in the OS secure store; Android backups are disabled (`allowBackup: false`).
- The app declares no usage of non-exempt encryption for App Store purposes.

## OTA updates & code signing

Over-the-air updates are delivered via **expo-updates** (EAS). Code-signing files for OTA updates live in `certs/`:

- Public certificate (safe to commit): `certs/updates-code-signing-cert.pem`
- Private key (**never commit**): `certs/updates-code-signing-private-key.pem`

Generate both with:

```bash
npx expo-updates codesigning:generate
```

Copy/rename the generated files to the names above, then build a new binary so the certificate is embedded.

## License

Private project — all rights reserved. Not licensed for redistribution.
