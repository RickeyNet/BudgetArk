# BudgetBuddy — Development Setup Guide

- [Windows 11 Setup](#windows-11-setup)
- [Linux Setup](#linux-setup)

---

## Windows 11 Setup

## Prerequisites & Installation (in order)

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

### Step 4: Install Expo CLI

Expo simplifies React Native development — no Android Studio or Xcode needed to start.

Open PowerShell and run:

```powershell
npm install -g expo-cli
npm install -g eas-cli
```

Verify:

```powershell
npx expo --version
```

---

### Step 5: Install Expo Go on Your Phone

This lets you preview the app live on your actual phone.

1. **iPhone**: Search "Expo Go" in the App Store
2. **Android**: Search "Expo Go" in the Google Play Store
3. Create a free Expo account at **https://expo.dev/signup**

---

### Step 6: Create the BudgetBuddy Project

Open PowerShell, navigate to where you want your project, and run:

```powershell
# Navigate to your preferred folder, e.g.:
cd C:\Users\YourName\Documents

# Create the project
npx create-expo-app BudgetBuddy --template blank-typescript

# Enter the project folder
cd BudgetBuddy
```

---

### Step 7: Install Project Dependencies

These are the libraries we'll use throughout the app:

```powershell
# Navigation (moving between screens)
npx expo install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/native-stack react-native-screens react-native-safe-area-context

# Charts and visualizations
npx expo install react-native-svg
npm install victory-native

# Animations
npx expo install react-native-reanimated

# Local storage (save data on device)
npx expo install @react-native-async-storage/async-storage

# UUID generation (for anonymous accounts)
npm install uuid
npm install --save-dev @types/uuid

# Gesture handler (required by navigation)
npx expo install react-native-gesture-handler
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

### Step 10 (Optional): Install Android Emulator

If you want to test without a physical phone:

1. Download **Android Studio** from: **https://developer.android.com/studio**
2. During install, check **"Android Virtual Device"**
3. Open Android Studio → **More Actions** → **Virtual Device Manager**
4. Create a new device (Pixel 7 or similar) with a recent API level
5. Start the emulator, then in your Expo terminal press **`a`** to open on Android

---

## Project Folder Structure (what we'll build)

```
BudgetBuddy/
├── App.tsx                    # Entry point — sets up navigation
├── babel.config.js            # Babel config with reanimated plugin
├── src/
│   ├── navigation/
│   │   └── AppNavigator.tsx   # Bottom tab navigation setup
│   ├── screens/
│   │   ├── DebtTrackerScreen.tsx    # Phase 1 — we start here
│   │   ├── BudgetScreen.tsx         # Phase 2
│   │   └── InvestmentScreen.tsx     # Phase 3
│   ├── components/
│   │   ├── DebtCard.tsx             # Individual debt display card
│   │   ├── AddDebtModal.tsx         # Modal to add new debts
│   │   ├── ProgressRing.tsx         # Circular progress indicator
│   │   └── AnimatedCounter.tsx      # Animated number display
│   ├── storage/
│   │   └── debtStorage.ts          # AsyncStorage read/write helpers
│   ├── utils/
│   │   └── calculations.ts         # Payoff math, compound interest
│   └── types/
│       └── index.ts                # TypeScript type definitions
├── package.json
└── tsconfig.json
```

---

## Troubleshooting Common Issues

| Problem                  | Fix                                                                 |
|--------------------------|---------------------------------------------------------------------|
| `expo` command not found | Close and reopen your terminal after installing                     |
| QR code won't scan       | Make sure phone and PC are on the same Wi-Fi network                |
| Module not found errors  | Run `npm install` again, then restart with `npx expo start --clear` |
| Reanimated errors        | Make sure the babel plugin is added, then restart with `--clear`    |
| Slow first load          | Normal — subsequent loads are faster due to caching                 |

---

## Ready to Go! (Windows)

---

## Linux Setup

These instructions cover Ubuntu/Debian-based distros. For Fedora/RHEL, swap `apt` for `dnf`.

---

### Step 1: Install Node.js via nvm

Using nvm is the recommended way to manage Node on Linux.

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

# Reload your shell
source ~/.bashrc   # or ~/.zshrc if you use zsh

# Install and use the LTS version
nvm install --lts
nvm use --lts

# Verify
node --version
npm --version
```

---

### Step 2: Install Git

Git is usually pre-installed. If not:

```bash
sudo apt update && sudo apt install -y git

# Verify
git --version
```

---

### Step 3: Install a Code Editor — VS Code

```bash
# Install via snap (simplest)
sudo snap install --classic code

# Or download the .deb from https://code.visualstudio.com and run:
sudo dpkg -i code_*.deb
```

Recommended extensions (same as Windows):
- **ES7+ React/Redux/React-Native snippets**
- **Prettier - Code formatter**
- **TypeScript Importer**
- **React Native Tools**
- **Error Lens**

---

### Step 4: Install Expo CLI

```bash
npm install -g expo-cli
npm install -g eas-cli

# Verify
npx expo --version
```

---

### Step 5: Install Expo Go on Your Phone

Same as Windows — search "Expo Go" in the App Store or Google Play Store.

---

### Step 6: Clone the BudgetBuddy Project

```bash
git clone <your-repo-url> BudgetBuddy
cd BudgetBuddy
npm install
```

---

### Step 7: Start the Development Server

```bash
npx expo start
```

Scan the QR code with your phone (Camera app on iPhone, Expo Go on Android). Make sure your phone and computer are on the same Wi-Fi network.

---

### Step 8 (Optional): Install Android Emulator

1. Download Android Studio from: **https://developer.android.com/studio**
2. Extract and run the installer:
   ```bash
   tar -xzf android-studio-*.tar.gz
   cd android-studio/bin
   ./studio.sh
   ```
3. During setup, install the **Android Virtual Device** component
4. Open **Virtual Device Manager**, create a device (Pixel 7 or similar)
5. Start the emulator, then press **`a`** in your Expo terminal

**Required environment variables** — add to your `~/.bashrc` or `~/.zshrc`:

```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

Then reload: `source ~/.bashrc`

---

## Troubleshooting Common Issues (Linux)

| Problem                  | Fix                                                                                      |
|--------------------------|------------------------------------------------------------------------------------------|
| `nvm: command not found` | Run `source ~/.bashrc` or open a new terminal                                            |
| QR code won't scan       | Ensure phone and PC are on the same Wi-Fi network                                        |
| Module not found errors  | Run `npm install`, then `npx expo start --clear`                                         |
| Reanimated errors        | Confirm `react-native-reanimated/plugin` is in `babel.config.js`, restart with `--clear` |
| Watchman errors          | Install watchman: `sudo apt install watchman`                                            |
| Port 19000 blocked       | Allow it: `sudo ufw allow 19000`                                                         |

---

## Ready to Go!