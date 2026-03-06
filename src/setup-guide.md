# BudgetArk — Windows 11 Development Setup Guide

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
BudgetArk/
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

| Problem | Fix |
|---|---|
| `expo` command not found | Close and reopen your terminal after installing |
| QR code won't scan | Make sure phone and PC are on the same Wi-Fi network |
| Module not found errors | Run `npm install` again, then restart with `npx expo start --clear` |
| Reanimated errors | Make sure the babel plugin is added, then restart with `--clear` |
| Slow first load | Normal — subsequent loads are faster due to caching |

---

## Ready to Go!

Once you've completed Steps 1-9, you have everything you need. The next step is building out the Debt Tracker screen, which is the first file we'll create.
