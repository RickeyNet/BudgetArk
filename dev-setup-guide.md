# BudgetArk — Development Setup Guide

Guide for **contributing to the existing repo**, not bootstrapping a new Expo app from scratch.

- [Quick start](#quick-start)
- [Prerequisites](#prerequisites)
- [Clone and install](#clone-and-install)
- [Development builds (required)](#development-builds-required)
- [Daily workflow](#daily-workflow)
- [Contributing](#contributing)
- [Windows (native)](#windows-native)
- [WSL + Android emulator](#wsl--android-emulator)
- [Linux](#linux)
- [EAS cloud builds](#eas-cloud-builds)
- [Maintainers: store builds & OTA](#maintainers-store-builds--ota)
- [Project layout](#project-layout)
- [Troubleshooting](#troubleshooting)

---

## Quick start

BudgetArk runs on **Expo SDK 55** with a **custom development build** (local-network sync, custom config plugins, and other native modules).

1. Install [prerequisites](#prerequisites) (Node.js LTS, Git, a code editor).
2. Clone the repo and install JS dependencies (see [Clone and install](#clone-and-install)).
3. Install a **development build** on your phone or emulator (see [Development builds](#development-builds-required)).
4. Start Metro and open the app:

```bash
npm start
# or explicitly:
npx expo start --dev-client --clear
```

5. Open the **BudgetArk** dev client on the device. It should discover your dev server, or enter the URL shown in the terminal.

| Situation | Command |
|-----------|---------|
| First time after `git pull` with dependency changes | `npm install` then `npx expo start --dev-client --clear` |
| Phone and PC on different networks | `npx expo start --dev-client --tunnel --clear` |
| Android emulator (host machine) | `http://10.0.2.2:8081` in the dev client |

---

## Prerequisites

Install in any order, but verify each before moving on.

### Node.js (LTS)

Expo SDK 55 expects **Node 20.19+** or **Node 22.12+** ([Expo docs](https://docs.expo.dev/)).

1. Download LTS from **https://nodejs.org**
2. On Windows, check **“Automatically install necessary tools”** in the installer if offered.
3. Verify in a **new** terminal:

```powershell
node --version
npm --version
```

### Git

**https://git-scm.com/download/win** (or your distro package manager on Linux).

```powershell
git --version
```

### Editor (recommended: VS Code)

**https://code.visualstudio.com** — useful extensions:

- ES7+ React/Redux/React-Native snippets
- React Native Tools
- Error Lens

### Expo / EAS CLI

Use **`npx expo`** and **`npx eas`** from the project (no need for deprecated global `expo-cli`). For frequent EAS use, install EAS globally:

```bash
npm install -g eas-cli
eas login
```

Create a free Expo account at **https://expo.dev/signup** if you plan to run cloud builds.

---

## Clone and install

The Git remote is still named **BudgetBuddy** on GitHub; the app and folder are **BudgetArk**.

```bash
git clone https://github.com/RickeyNet/BudgetBuddy.git
cd BudgetBuddy   # repo folder name on disk
npm install
```

Do **not** run `create-expo-app` or hand-install the dependency list from an old tutorial — everything is already in `package.json`.

Optional sanity check (no npm script today):

```bash
npx tsc --noEmit
```

---

## Development builds (required)

A **development build** is a custom Expo dev client that includes this app’s native code — for example:

- Local partner sync (`react-native-tcp-socket`, Zeroconf)
- Custom native plugin (`plugins/withScreenGuard.js`)
- `expo-secure-store`, file export, and haptics as configured in the app

Build once (or when native deps/plugins change), then connect to Metro with `npx expo start --dev-client`.

### Option A — EAS cloud build (typical)

Requires Expo login and project access (`app.json` already points at the EAS project).

```bash
eas login

# Android APK (no Apple account needed)
eas build --profile development --platform android

# iOS device (Apple Developer Program)
eas build --profile development --platform ios

# iOS Simulator only
eas build --profile development-simulator --platform ios
```

Install the artifact from the URL EAS prints (APK on Android; link or Simulator build on iOS).

`eas.json` is already configured with `development`, `development-simulator`, `preview`, and `production` profiles.

### Option B — Local native run (Android)

With [Android Studio](https://developer.android.com/studio) and the SDK installed on the **same machine** as your terminal:

```bash
npm run android
# equivalent: npx expo run:android
```

This compiles and installs a dev client locally. Useful when you do not want to wait on EAS.

### When you must rebuild

Rebuild the dev client (EAS or `expo run:*`) when you:

- Add, remove, or upgrade a library with native code
- Change `app.json` plugins, permissions, or native identifiers
- Edit files under `plugins/`

Pure TypeScript/React changes in `src/` only need Metro reload — no native rebuild.

---

## Daily workflow

```bash
# From repo root
npm start
```

That runs `expo start`. With `expo-dev-client` installed, prefer explicitly:

```bash
npx expo start --dev-client --clear
```

Edit files under `src/` or `App.tsx`; the dev client hot-reloads. If behavior looks stale, restart with `--clear`.

### npm scripts

| Script | Purpose |
|--------|---------|
| `npm start` | Start Metro |
| `npm run android` | Local Android dev build + run |
| `npm run ios` | Local iOS dev build + run (macOS + Xcode only) |
| `npm run update:message` | Emit OTA message JSON for maintainers |

### Testing your change

There is no automated test suite in CI yet. Manually exercise the area you touched on a **dev build**:

- **Debts** — payoff, payments, goal dates
- **Budget** — entries, recurring/linked accounts, 50/30/20 card
- **Bridge** — net worth, asset accounts, emergency fund
- **Charts** — lessons, calculators
- **Profile** — export/import, settings, sync pairing (two devices on same LAN if you touch `src/sync/`)

File bugs or features via GitHub **Issues** (templates under `.github/ISSUE_TEMPLATE/`).

---

## Contributing

### Branching and PRs

1. Fork **https://github.com/RickeyNet/BudgetBuddy** (or ask for collaborator access).
2. Create a branch from `master`: `git checkout -b fix/short-description`
3. Keep changes focused; match existing patterns in the file you edit.
4. Open a PR with: what changed, how you tested (device/OS), and screenshots for UI work.

### Code conventions

- **Shared types** live in `src/types/index.ts` — add new domain types there.
- **Persistence** follows `src/storage/*Storage.ts` + AsyncStorage; see `debtStorage.ts` / `budgetStorage.ts` for patterns.
- **Pure math** belongs in `src/utils/calculations.ts` (and related utils), not in screen components.
- **Themes** — use `useTheme()` and tokens from `src/theme/`; avoid hard-coded colors in new UI.
- **Release notes** — user-facing bullets go in `src/data/releaseNotes.ts` (and often mirrored in `RELEASE_NOTES.md` for maintainers).
- **Spreadsheet import/export** — schema is documented in [`docs/SPREADSHEET_SCHEMA.md`](docs/SPREADSHEET_SCHEMA.md).

### Do not commit

- `certs/updates-code-signing-private-key.pem` or any signing secrets (see root `README.md` for OTA cert setup)
- `.env` files with credentials
- Large generated artifacts

### Areas that need two devices

Partner sync (`src/sync/`) uses local network discovery. Testing pairing usually means two physical devices (or an emulator + phone) on the same Wi‑Fi, with multicast allowed.

---

## Windows (native)

Develop entirely in **PowerShell** on Windows (no WSL) if you use Android Studio on Windows:

1. Install prerequisites above.
2. `git clone` + `npm install`.
3. Install Android Studio → SDK at `%LOCALAPPS%\Android\Sdk`.
4. Create/start an AVD in Device Manager.
5. Either `eas build --profile development --platform android` or `npm run android`.
6. `npx expo start --dev-client --clear` and open the dev client on the emulator (`http://10.0.2.2:8081` if needed).

Set `ANDROID_HOME` if commands cannot find the SDK:

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
```

---

## WSL + Android emulator

Use this when the repo lives in **WSL** but Android Studio runs on **Windows**.

### WSL networking

WSL uses a separate network interface from Windows:

- **LAN** (`npx expo start --dev-client`) may not reach a phone on Wi‑Fi
- **Tunnel** avoids that at the cost of speed:

```bash
npx expo start --dev-client --tunnel --clear
```

**LAN fix (admin PowerShell on Windows):**

```powershell
New-NetFirewallRule -DisplayName "Expo" -Direction Inbound -Protocol TCP -LocalPort 8081,19000,19006 -Action Allow
$wslIp = (wsl hostname -I).Trim()
netsh interface portproxy add v4tov4 listenport=8081 listenaddress=0.0.0.0 connectport=8081 connectaddress=$wslIp
```

### Android SDK from WSL

Add to `~/.bashrc` (replace `<YourUser>`):

```bash
export ANDROID_HOME=/mnt/c/Users/<YourUser>/AppData/Local/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools
```

WSL needs **wrapper scripts** because the SDK ships Windows `.exe` files — see the [troubleshooting](#troubleshooting) table for `spawn adb EACCES`.

Start Metro with Android:

```bash
npx expo start --dev-client --android --clear
```

Installing an EAS APK from WSL: copy the APK to `/mnt/c/Users/...` and run `adb install` with a `C:\Users\...` path.

---

## Linux

1. Install Node LTS, Git, and your editor.
2. `git clone` + `npm install`.
3. **Android:** install Android Studio / command-line SDK, set `ANDROID_HOME`, create an emulator, then `npm run android` or an EAS `development` APK.
4. **iOS:** not supported on Linux (requires macOS + Xcode for local builds; use EAS for iOS artifacts).

---

## EAS cloud builds

`eas.json` and `app.json` are already configured (`com.budgetark.app`, Expo Updates channels, plugins).

| Profile | Use |
|---------|-----|
| `development` | Dev client for physical devices |
| `development-simulator` | Dev client for iOS Simulator |
| `preview` | Internal APK-style Android test build |
| `production` | Store release (auto-increments version) |

If Git inside WSL misbehaves during EAS:

```bash
EAS_NO_VCS=1 eas build --profile development --platform android
```

**Encryption prompt (iOS):** the app uses standard HTTPS/storage only — answer **Yes** (exempt) when asked; `ITSAppUsesNonExemptEncryption` is already `false` in `app.json`.

---

## Maintainers: store builds & OTA

These steps need Apple/Google developer accounts and Expo project owner access. Contributors usually do not need them.

### Production binary

```bash
eas build --profile production --platform ios
eas build --profile production --platform android
eas submit --platform ios   # after build completes
```

TestFlight: configure testers in [App Store Connect](https://appstoreconnect.apple.com).

### Over-the-air (JS-only) updates

When `runtimeVersion` in `app.json` is unchanged, JS/asset fixes can ship without a new store binary:

```bash
eas update --branch production --message "$(npm run -s update:message)"
```

Release note text for the update modal comes from the top entry in `src/data/releaseNotes.ts` via `scripts/eas-update-message.mjs`.

### OTA code signing

See root [`README.md`](README.md) for generating and placing `certs/updates-code-signing-*.pem`. Never commit the private key.

---

## Project layout

```
BudgetArk/
├── App.tsx                 # Entry: providers, onboarding, OTA gate
├── app.json                # Expo config (SDK 55, plugins, updates)
├── eas.json                # EAS build profiles
├── babel.config.js         # Reanimated Babel plugin
├── plugins/                # Custom config plugins (e.g. screen guard)
├── docs/                   # Contributor docs (spreadsheet schema, etc.)
├── src/
│   ├── navigation/         # Bottom tabs (Debts, Budget, Bridge, Charts, Profile)
│   ├── screens/            # One screen per main tab (+ onboarding, achievements)
│   ├── components/         # Reusable UI
│   ├── storage/            # AsyncStorage persistence
│   ├── sync/               # Partner pairing / LAN sync
│   ├── theme/              # Themes, density, font scaling
│   ├── utils/              # Pure helpers (calculations, import/export, net worth)
│   ├── types/index.ts      # Shared TypeScript types
│   ├── data/               # Static content (lessons, achievements, release notes)
│   ├── lessons/            # Lesson UI building blocks
│   └── achievements/       # Achievement context
├── scripts/                # Tooling (OTA message, store screenshots)
└── package.json
```

Main tabs (see `src/navigation/AppNavigator.tsx`):

| Tab | Screen | Focus |
|-----|--------|--------|
| Debts | `DebtTrackerScreen` | Debt payoff |
| Budget | `BudgetScreen` | Income/expense, calendar |
| Bridge | `BridgeScreen` | Net worth, accounts |
| Charts | `ChartsScreen` | Lessons + calculators |
| Profile | `ProfileScreen` | Settings, export, sync |

---

## Troubleshooting

### General

| Problem | Fix |
|---------|-----|
| `expo` / `eas` not found | Use `npx expo` / `npx eas`, or reinstall global `eas-cli` and open a new terminal |
| Module not found | `npm install`, then `npx expo start --dev-client --clear` |
| Reanimated errors | `babel.config.js` must include `react-native-reanimated/plugin`; `App.tsx` already imports reanimated near the top |
| “No development build installed” | Install a dev build (EAS or `npm run android`) |
| Worklets / native module mismatch | Dev build is out of date — rebuild after `git pull` if native deps changed |
| Slow first bundle | Normal; later loads are cached |

### WSL

| Problem | Fix |
|---------|-----|
| `spawn adb EACCES` | Wrapper script for `adb.exe` under `$ANDROID_HOME/platform-tools` (bash script that `exec`s the `.exe`) |
| `ANDROID_HOME` not found | Export path in `~/.bashrc` or pass inline for one command |
| Phone cannot reach dev server | `--tunnel` or Windows firewall / portproxy rules above |
| `adb install` “No such file” | Copy APK to `/mnt/c/...` and use `C:\...` path with Windows `adb` |

### EAS

| Problem | Fix |
|---------|-----|
| Git errors during EAS | `EAS_NO_VCS=1` prefix |
| Apple “no team associated” | Wait for Developer Program activation (up to ~48h) |
| Build queue | Free tier runs one build at a time |

### When to rebuild

```
Only changing JS/TS in src/?
  → Metro reload is enough; no rebuild

Changed native deps or app.json plugins?
  → Rebuild dev client (EAS development profile or npm run android/ios)

Shipping to App Store / Play Store?
  → eas build --profile production (maintainers)
```

---

*Last aligned with Expo SDK 55 (`expo` ~55.0.x) and app version 1.7.1.*
