# BudgetArk — Development Setup Guide

- [Windows 11 Setup](#windows-11-setup)
- [WSL (Windows Subsystem for Linux) Setup](#wsl-setup)
- [Linux Setup](#linux-setup)
- [Android Emulator via WSL](#android-emulator-via-wsl)
- [EAS Build & Development Builds](#eas-build--development-builds)
- [Testing on Physical Devices](#testing-on-physical-devices)
- [Troubleshooting](#troubleshooting)

---

## Windows 11 Setup

### Prerequisites & Installation (in order)

---

### Step 1: Install Node.js (LTS)

Node.js is the JavaScript runtime that powers everything.

1. Go to: **https://nodejs.org**
2. Download the **LTS** version (currently 20.x or higher)
3. Run the installer — accept all defaults
4. **Check "Automatically install necessary tools"** when prompted
5. Verify in a **new** terminal (PowerShell or Command Prompt):

```powershell
node --version
npm --version
```

You should see version numbers for both.

---

### Step 2: Install Git

Git is required for version control and many npm packages.

1. Go to: **https://git-scm.com/download/win**
2. Download and run the installer
3. Accept all defaults (the recommended settings are fine)
4. Verify:

```powershell
git --version
```

---

### Step 3: Install a Code Editor — VS Code

1. Go to: **https://code.visualstudio.com**
2. Download and install
3. Recommended extensions to install inside VS Code:
   - **ES7+ React/Redux/React-Native snippets**
   - **Prettier - Code formatter**
   - **TypeScript Importer**
   - **React Native Tools**
   - **Error Lens** (shows errors inline)

---

### Step 4: Install Expo CLI and EAS CLI

Expo simplifies React Native development. EAS handles cloud builds and app store submissions.

Open PowerShell and run:

```powershell
npm install -g expo-cli
npm install -g eas-cli
```

Verify:

```powershell
npx expo --version
eas --version
```

---

### Step 5: Install Expo Go on Your Phone

This lets you preview the app live on your actual phone (with some limitations — see [Development Builds](#eas-build--development-builds) for the full-featured option).

1. **iPhone**: Search "Expo Go" in the App Store
2. **Android**: Search "Expo Go" in the Google Play Store
3. Create a free Expo account at **https://expo.dev/signup**

---

### Step 6: Create the BudgetArk Project

Open PowerShell, navigate to where you want your project, and run:

```powershell
# Navigate to your preferred folder, e.g.:
cd C:\Users\YourName\Documents

# Create the project
npx create-expo-app BudgetArk --template blank-typescript

# Enter the project folder
cd BudgetArk
```

---

### Step 7: Install Project Dependencies

These are the libraries we'll use throughout the app:

```powershell
# Navigation (moving between screens)
npx expo install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/native-stack react-native-screens react-native-safe-area-context

# Charts and visualizations
npx expo install react-native-svg

# Animations
npx expo install react-native-reanimated

# Local storage (save data on device)
npx expo install @react-native-async-storage/async-storage

# UUID generation (for anonymous accounts)
npm install uuid
npm install --save-dev @types/uuid

# Gesture handler (required by navigation)
npx expo install react-native-gesture-handler

# Development client (for dev builds — required for advanced native features)
npx expo install expo-dev-client
```

---

### Step 8: Configure Reanimated

Open `babel.config.js` in your project root and update it:

```javascript
// File: babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: ["react-native-reanimated/plugin"], // <-- ADD THIS LINE
  };
};
```

**Important:** Reanimated also requires an import at the very top of `App.tsx`, before any other imports:

```typescript
// File: App.tsx — FIRST LINE
import "react-native-reanimated";
```

Without this, you'll get `Error: react-native-reanimated is not installed!` at runtime.

---

### Step 9: Start the Development Server

```powershell
npx expo start
```

This will show a QR code in your terminal:
- **iPhone**: Open your Camera app and scan the QR code
- **Android**: Open Expo Go and scan the QR code

Your app will load on your phone in real time!

---

## WSL Setup

If you're developing in WSL (Windows Subsystem for Linux) while running Android Studio on Windows, there are extra steps to bridge the two environments.

### WSL Networking with Expo

WSL runs on a separate network interface from Windows. This means:
- **LAN mode** (`npx expo start`) may not be reachable from your phone
- **Tunnel mode** routes through Expo's servers and avoids networking issues

**Option A: Tunnel mode (simplest)**

```bash
# Install ngrok globally (needs sudo in WSL)
sudo npm install --global @expo/ngrok@^4.1.0

# Start with tunnel
npx expo start --tunnel --clear
```

**Option B: Fix LAN mode (faster)**

Open PowerShell **as Administrator** on Windows:

```powershell
# Allow Expo through Windows Firewall
New-NetFirewallRule -DisplayName "Expo" -Direction Inbound -Protocol TCP -LocalPort 8081,19000,19006 -Action Allow

# Forward port from Windows to WSL
$wslIp = (wsl hostname -I).Trim()
netsh interface portproxy add v4tov4 listenport=8081 listenaddress=0.0.0.0 connectport=8081 connectaddress=$wslIp
```

Then start normally:

```bash
npx expo start --clear
```

---

## Android Emulator via WSL

When Android Studio is installed on Windows but you're developing in WSL, extra setup is needed because WSL can't directly find Windows executables.

### Step 1: Install Android Studio on Windows

1. Download from: **https://developer.android.com/studio**
2. Run the Windows installer
3. During install, check **"Android Virtual Device"**
4. Open Android Studio, let it finish the initial SDK download
5. The SDK installs to: `C:\Users\<YourUser>\AppData\Local\Android\Sdk`

### Step 2: Create and Start an Emulator

1. In Android Studio: **More Actions** (or **Tools**) > **Virtual Device Manager**
2. Click **Create Device**
3. Pick **Pixel 7** (or any phone), click Next
4. Select a system image — pick the latest API level from the **Recommended** tab, download if needed
5. Click **Finish**, then hit the **play button** to start the emulator

### Step 3: Set Up Environment Variables in WSL

Add these to your `~/.bashrc`:

```bash
export ANDROID_HOME=/mnt/c/Users/<YourUser>/AppData/Local/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

Then reload:

```bash
source ~/.bashrc
```

### Step 4: Create Wrapper Scripts for Windows Executables

WSL looks for Linux binaries (`adb`, `emulator`) but only Windows `.exe` files exist. Create wrapper scripts:

**ADB wrapper:**

```bash
# Create wrapper at the SDK path so Expo finds it
cat > /mnt/c/Users/<YourUser>/AppData/Local/Android/Sdk/platform-tools/adb << 'EOF'
#!/bin/bash
exec /mnt/c/Users/<YourUser>/AppData/Local/Android/Sdk/platform-tools/adb.exe "$@"
EOF
chmod +x /mnt/c/Users/<YourUser>/AppData/Local/Android/Sdk/platform-tools/adb

# Also add a global symlink
sudo ln -sf /mnt/c/Users/<YourUser>/AppData/Local/Android/Sdk/platform-tools/adb.exe /usr/local/bin/adb
```

**Emulator wrapper:**

```bash
cat > /mnt/c/Users/<YourUser>/AppData/Local/Android/Sdk/emulator/emulator << 'EOF'
#!/bin/bash
exec /mnt/c/Users/<YourUser>/AppData/Local/Android/Sdk/emulator/emulator.exe "$@"
EOF
chmod +x /mnt/c/Users/<YourUser>/AppData/Local/Android/Sdk/emulator/emulator
```

Replace `<YourUser>` with your actual Windows username in all paths above.

### Step 5: Verify

```bash
adb devices
```

Should show:

```
List of devices attached
emulator-5554    device
```

If it shows `offline`, the emulator is still booting — wait 10-20 seconds and retry.

### Step 6: Launch the App

```bash
ANDROID_HOME=/mnt/c/Users/<YourUser>/AppData/Local/Android/Sdk npx expo start --android --clear
```

**Note:** You may need to pass `ANDROID_HOME` inline like this if your `.bashrc` changes aren't picked up by the current shell session.

---

## EAS Build & Development Builds

### Why Development Builds?

**Expo Go** is a pre-built app with a fixed set of native modules. It's great for prototyping but has limitations:

| Feature | Expo Go | Dev Build |
|---|---|---|
| Custom native modules (Skia, etc.) | No | Yes |
| Push notifications (iOS) | No | Yes |
| App store submission | No | Yes |
| Code signing | No | Yes |

A **Development Build** is your own custom version of Expo Go, compiled with all the native modules your app needs. You build it once and use it like Expo Go (hot reload, QR code, etc.). You only rebuild when you add or change native dependencies.

### Step 1: Install EAS CLI

```bash
sudo npm install -g eas-cli
```

### Step 2: Log In to Expo

```bash
eas login
```

Enter your Expo account credentials.

### Step 3: Install the Dev Client Package

```bash
npx expo install expo-dev-client
```

### Step 4: Configure app.json

Add bundle identifiers and version fields:

```json
{
  "expo": {
    "name": "BudgetArk",
    "slug": "BudgetArk",
    "version": "1.0.0",
    "userInterfaceStyle": "dark",
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.budgetark.app",
      "buildNumber": "1"
    },
    "android": {
      "package": "com.budgetark.app",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#232424"
      }
    },
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#232424"
    }
  }
}
```

### Step 5: Generate eas.json

```bash
# Use EAS_NO_VCS=1 if git isn't working properly (common in WSL)
EAS_NO_VCS=1 eas build:configure
```

Select the platforms you want (iOS, Android, or both).

This generates `eas.json` with three build profiles:

```json
{
  "cli": {
    "version": ">= 18.0.6",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "resourceClass": "m-medium"
      }
    },
    "development-simulator": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```

| Profile | Purpose |
|---|---|
| `development` | Dev client for physical devices (hot reload, debugging) |
| `development-simulator` | Dev client for iOS Simulator |
| `preview` | Internal test builds (no dev tools) |
| `production` | App Store / Play Store submission |

### Step 6: Build

**Android (no paid account required):**

```bash
EAS_NO_VCS=1 eas build --profile development --platform android
```

- Let EAS generate the Android keystore when prompted
- Build takes ~10-15 minutes in the cloud
- Outputs a download URL for the `.apk`

**iOS (requires Apple Developer Program — $99/year):**

```bash
EAS_NO_VCS=1 eas build --profile development --platform ios
```

- You'll be prompted to log in with your Apple ID
- Apple Developer enrollment must be fully activated (can take up to 48 hours after payment)
- When asked about encryption: select **Yes** (standard/exempt) — the app only uses standard iOS encryption (HTTPS, AsyncStorage)

### Step 7: Install and Run

**On Android emulator:**

```bash
# If EAS offers to install automatically, say yes
# If it fails due to WSL path issues, install manually:

# 1. Find the downloaded APK
find /tmp -name "*.apk" -mmin -30

# 2. Copy to Windows filesystem (adb.exe can't see Linux paths)
cp /tmp/.../your-build.apk /mnt/c/Users/<YourUser>/budgetark-dev.apk

# 3. Install using Windows path format
adb install 'C:\Users\<YourUser>\budgetark-dev.apk'
```

**On physical Android device:**

1. Open the EAS build URL in your phone's browser
2. Download and install the APK
3. Allow installation from unknown sources if prompted

**Start the dev server:**

```bash
ANDROID_HOME=/mnt/c/Users/<YourUser>/AppData/Local/Android/Sdk npx expo start --dev-client --clear
```

Open the BudgetArk app on the device/emulator. It will show a dev client screen that auto-discovers your dev server, or you can enter the URL manually.

**For Android emulator:** use `http://10.0.2.2:8081` (special alias for host localhost).

**For physical device:** use the URL shown in the terminal (must be on same Wi-Fi).

---

## Testing on Physical Devices

### Android (any device, including GrapheneOS)

1. Build with `eas build --profile development --platform android`
2. Open the build URL on your phone's browser
3. Download and install the APK
4. Start dev server: `npx expo start --dev-client`
5. Open the app — it connects to your dev server via the URL/QR code

### iPhone (requires Apple Developer Program)

1. Build with `eas build --profile development --platform ios`
2. EAS may ask you to register your device (follow the URL on your phone to install a provisioning profile)
3. Install the build via the URL EAS provides
4. Start dev server: `npx expo start --dev-client`
5. Open the app

### Expo Go (limited, no native modules)

If you just want a quick preview without building:

```bash
# Tunnel mode (works across networks, slower)
npx expo start --tunnel --clear

# Force Expo Go even when expo-dev-client is installed
npx expo start --go --clear
```

Scan the QR code with Expo Go on your phone.

**Expo Go limitations:**
- Cannot use `@shopify/react-native-skia` or `victory-native` Skia charts
- Cannot use push notifications on iOS
- Cannot use any custom native modules
- Works fine for: AsyncStorage, react-native-svg, navigation, reanimated (basic)

---

## Troubleshooting

### General

| Problem | Fix |
|---|---|
| `expo` command not found | Close and reopen your terminal after installing |
| Module not found errors | Run `npm install`, then `npx expo start --clear` |
| Reanimated "not installed" error | Add `import "react-native-reanimated"` as the first line in `App.tsx`, then restart with `--clear` |
| Slow first load | Normal — subsequent loads are faster due to caching |
| Worklets version mismatch | You're using Expo Go with native modules that require a dev build. Use `--go` flag or build a dev client |

### WSL-Specific

| Problem | Fix |
|---|---|
| `spawn adb EACCES` | Create the adb wrapper script (see [Android Emulator via WSL](#step-4-create-wrapper-scripts-for-windows-executables)) |
| `spawn emulator EACCES` | Create the emulator wrapper script (same section) |
| `ANDROID_HOME` not found | Pass it inline: `ANDROID_HOME=/mnt/c/Users/<YourUser>/AppData/Local/Android/Sdk npx expo start --android` |
| Phone can't connect to dev server | Use tunnel mode: `npx expo start --tunnel` |
| Firewall blocking connections | Open PowerShell as admin: `New-NetFirewallRule -DisplayName "Expo" -Direction Inbound -Protocol TCP -LocalPort 8081,19000,19006 -Action Allow` |
| `adb install` fails with "No such file" | Copy the APK to the Windows filesystem first (`/mnt/c/Users/...`) and use the Windows path format (`C:\Users\...`) |

### EAS Build

| Problem | Fix |
|---|---|
| `npx eas` gives "could not determine executable" | Install globally: `sudo npm install -g eas-cli` |
| `git` errors during EAS commands | Prefix with `EAS_NO_VCS=1` (e.g., `EAS_NO_VCS=1 eas build:configure`) |
| Apple "no team associated" error | Your Apple Developer enrollment may still be processing (up to 48 hours). Check status at https://developer.apple.com/account |
| `npm install --global` permission denied | Use `sudo`: `sudo npm install --global @expo/ngrok@^4.1.0` |
| "No development build installed" | You need to build and install a dev client first, or use `--go` flag for Expo Go mode |

### Expo Go vs Dev Build Decision Tree

```
Do you need custom native modules (Skia, notifications, etc.)?
  YES → Use a Development Build (eas build --profile development)
  NO  → Expo Go is fine (npx expo start --go)

Are you submitting to app stores?
  YES → You need EAS production builds regardless
  NO  → Use whichever is more convenient for testing
```

---

## Project Folder Structure

```
BudgetArk/
├── App.tsx                    # Entry point — sets up navigation
├── app.json                   # Expo configuration (bundle IDs, splash, etc.)
├── babel.config.js            # Babel config with reanimated plugin
├── eas.json                   # EAS Build profiles (dev, preview, production)
├── src/
│   ├── navigation/
│   │   └── AppNavigator.tsx   # Bottom tab navigation setup
│   ├── screens/
│   │   ├── DebtTrackerScreen.tsx    # Debt tracking (fully implemented)
│   │   ├── BudgetScreen.tsx         # Budget tracking (fully implemented)
│   │   ├── InvestmentScreen.tsx     # Investment projections
│   │   ├── ProfileScreen.tsx        # User profile & settings
│   │   └── OnboardingScreen.tsx     # First-launch onboarding
│   ├── components/
│   │   ├── DebtCard.tsx             # Individual debt display card
│   │   ├── AddDebtModal.tsx         # Modal to add new debts
│   │   ├── AddBudgetEntryModal.tsx  # Modal to add income/expenses
│   │   ├── DonutChart.tsx           # SVG donut chart (Expo Go compatible)
│   │   └── ProgressRing.tsx         # Circular progress indicator
│   ├── storage/
│   │   ├── debtStorage.ts          # Debt AsyncStorage CRUD
│   │   ├── budgetStorage.ts        # Budget AsyncStorage CRUD
│   │   └── userStorage.ts          # User account storage
│   ├── theme/
│   │   ├── ThemeProvider.tsx        # React Context theme provider
│   │   └── themes.ts               # Color scheme definitions
│   ├── utils/
│   │   └── calculations.ts         # Pure financial math functions
│   └── types/
│       └── index.ts                # ALL shared TypeScript types
├── package.json
└── tsconfig.json
```
Step 1: Install & authenticate
npm install -g eas-cli
eas login

Step 2: Build for TestFlight
eas build --profile production --platform ios
EAS will prompt you to sign in with your Apple ID and will handle provisioning profiles and certificates automatically. The build runs on Expo's cloud servers (free tier gives one build at a time).

Step 3: Submit to App Store Connect
Once the build finishes:
eas submit --platform ios
This uploads the .ipa to App Store Connect.

Step 4: Enable TestFlight
In App Store Connect (https://appstoreconnect.apple.com), go to your app > TestFlight tab, add testers (internal or external groups), and distribute.


npx expo start --dev-client
npx expo run:android
