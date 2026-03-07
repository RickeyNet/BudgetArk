# BudgetArk — App Store Launch TODO

Work through phases in order: finish the features first, then handle store prep and submission.

---

## Phase 1 — Budget Screen

- [x] Design data model for income/expense entries (category, amount, date, type)
- [x] Create `budgetStorage.ts` following the same AsyncStorage pattern as `debtStorage.ts`
- [x] Add new types to `src/types/index.ts` (e.g., `BudgetEntry`, `BudgetCategory`)
- [x] Implement income & expense entry form (modal, similar to `AddDebtModal`)
- [x] Implement category list with monthly totals
- [x] Add budget limit per category with warning when approaching limit
- [x] Add pie/donut chart breakdown using Victory Native (already installed)
- [x] Add spending alert logic (warning color when >80% of limit reached)

---

## Phase 2 — Investment Screen

- [x] Design UI for contribution calculator (inputs: monthly amount, annual return %, years)
- [x] Wire up `calcInvestmentGrowth()` from `src/utils/calculations.ts` (already implemented)
- [x] Add interactive sliders for "what if" exploration
- [x] Add a line chart showing growth over time (SVG area chart)
- [x] Show contribution vs. interest earned breakdown
- [x] Add timeline presets (10yr, 20yr, 30yr buttons)

---

## Pre-Launch (Required Before Any Submission)

### App Configuration
- [x] Add `bundleIdentifier` to `app.json` under `expo.ios` (e.g., `com.yourname.budgetark`) — required by Apple
- [x] Add `package` to `app.json` under `expo.android` (e.g., `com.yourname.budgetark`) — required by Google
- [x] Change `userInterfaceStyle` in `app.json` from `"light"` to `"dark"` (the app uses a dark theme)
- [x] Add `expo.ios.buildNumber` and `expo.android.versionCode` fields to `app.json`

### EAS Build Setup
- [x] Create an Expo account at https://expo.dev if you don't have one
- [x] Run `eas login` and `eas build:configure` to generate `eas.json`
- [x] Configure `eas.json` with `development`, `preview`, and `production` build profiles
- [ ] Run a production build for iOS: `eas build --platform ios --profile production`
- [ ] Run a production build for Android: `eas build --platform android --profile production`

### App Icons & Splash Screen
- [ ] Verify `icon.png` is exactly 1024×1024px (required by Apple)
- [ ] Verify `adaptive-icon.png` meets Android requirements (foreground should be ~66% of frame)
- [x] Update splash screen `backgroundColor` in `app.json` from `"#ffffff"` to match the app's dark background (e.g., `"#232424"`)
- [ ] Consider adding a proper splash icon that fits the dark background

### Missing Feature: Export Data
- [x] Implement the "Export My Data" button in `ProfileScreen.tsx`
  - Exports all data (debts, payments, budget entries, limits, user) as JSON via `expo-sharing` + `expo-file-system`

### Privacy Policy
- [ ] Write a privacy policy (required by both Apple and Google)
  - Can be a simple web page or GitHub Gist — key point: state that no data leaves the device
- [ ] Add the privacy policy URL to `app.json` under `expo.ios.privacyManifests` or as a link in the store listing

---

## Apple App Store Submission

- [ ] Enroll in the Apple Developer Program ($99/year) at https://developer.apple.com
- [ ] Create an App Store Connect record for BudgetArk
- [ ] Prepare store listing assets:
  - [ ] App name and subtitle
  - [ ] Description (up to 4,000 characters)
  - [ ] Keywords (up to 100 characters)
  - [ ] Screenshots for iPhone (6.9" required; 6.5" and 5.5" recommended)
  - [ ] App icon (1024×1024, no alpha channel)
- [ ] Set the content rating (Finance category, no objectionable content)
- [ ] Submit for review via `eas submit --platform ios`

---

## Google Play Submission

### 1. Developer Account
- [ ] Create a Google Play Developer account ($25 one-time fee) at https://play.google.com/console

### 2. Build Production AAB
- [ ] Run `eas build --platform android --profile production`
- [ ] Download the `.aab` file from EAS when the build finishes

### 3. Prepare Store Assets
- [ ] App icon: 512×512 PNG
- [ ] Feature graphic: 1024×500 PNG
- [ ] Screenshots: at least 2 phone screenshots (16:9 or 9:16)
- [ ] Short description (80 characters max)
- [ ] Full description (4,000 characters max)
- [ ] Privacy policy URL (required — host on GitHub Pages for free, state no data leaves the device)

### 4. App Content Questionnaire (in Play Console)
- [ ] Complete content rating (IARC questionnaire — should be "Everyone")
- [ ] Set target audience / age group
- [ ] Complete Data Safety form (no data collected, no data shared, all data stays on device)
- [ ] Ads declaration (no ads)

### 5. Create App & Upload
- [ ] Go to Play Console > Create app
- [ ] Fill in app name, default language, app/game, free/paid
- [ ] Complete all Setup checklist items
- [ ] Go to Production > Create new release
- [ ] Upload the `.aab` file
- [ ] Add release notes
- [ ] Review and roll out

### 6. Wait for Review
- [ ] Google review typically takes a few hours to a few days for first submission
- [ ] Note: `android.package` is `com.budgetark.app` — this is your permanent Play Store identity
- [ ] Google Play App Signing manages your keys by default — no risk of losing your keystore

---

## F-Droid Submission

F-Droid is a free, open-source Android app store. Apps must be open source and built from source by F-Droid's servers.

### 1. Prerequisites
- [ ] Make your GitHub repo public (F-Droid requires open source code)
- [ ] Add an open-source license to the repo (e.g., GPL-3.0, MIT, Apache-2.0) — add a `LICENSE` file
- [ ] Remove any proprietary dependencies if possible (F-Droid prefers fully free software)
  - Note: `expo-updates` and EAS-related code may need to be optional since F-Droid builds won't use EAS
- [ ] Ensure the app can build with standard open-source tooling (Gradle)

### 2. Prepare the Build
- [ ] Run `npx expo prebuild` to generate the native `android/` folder
- [ ] Verify the app builds locally: `cd android && ./gradlew assembleRelease`
- [ ] Make sure `android/` is committed to the repo (F-Droid builds from source)
- [ ] Tag your release in git (e.g., `git tag v1.0.0`) — F-Droid uses tags to detect new versions

### 3. Create F-Droid Metadata
- [ ] Fork the F-Droid Data repo: https://gitlab.com/fdroid/fdroiddata
- [ ] Create metadata file at `metadata/com.budgetark.app.yml` with:
  - App name, summary, description
  - License type
  - Source code URL (your GitHub repo)
  - Build instructions (Gradle commands)
  - Auto-update mode (git tags)
- [ ] Example metadata structure:
  ```yaml
  Categories:
    - Money
  License: MIT
  AuthorName: RickeyNet
  SourceCode: https://github.com/RickeyNet/BudgetArk
  IssueTracker: https://github.com/RickeyNet/BudgetArk/issues

  AutoName: BudgetArk
  Description: |
    Offline-first personal finance app for debt tracking, budgeting,
    and investment projections. All data stays on your device.

  RepoType: git
  Repo: https://github.com/RickeyNet/BudgetArk.git

  Builds:
    - versionName: 1.0.0
      versionCode: 1
      commit: v1.0.0
      subdir: android/app
      gradle:
        - release

  AutoUpdateMode: Version
  UpdateCheckMode: Tags
  CurrentVersion: 1.0.0
  CurrentVersionCode: 1
  ```

### 4. Submit
- [ ] Submit a merge request to the fdroiddata repo with your metadata file
- [ ] F-Droid team reviews the app (can take weeks to months for first submission)
- [ ] They will build the app from source on their servers and sign it with their key

### 5. Things to Know
- [ ] F-Droid signs the APK with their own key — it will NOT be the same signature as your Play Store/EAS builds
- [ ] Users cannot switch between Play Store and F-Droid versions without reinstalling
- [ ] Updates go through F-Droid's build cycle — not instant like EAS OTA
- [ ] No analytics, tracking, or proprietary push services allowed (BudgetArk should be fine since it's fully offline)

---

## Nice-to-Have (Post-Launch)

- [ ] Payment history screen — the data is already being recorded, just needs a UI
- [x] Edit existing debts (currently debts can only be added or deleted, not edited)
- [x] Debt payoff order strategies (avalanche vs. snowball method)
- [ ] Push notifications for payment reminders (requires `expo-notifications`)
- [x] Additional themes beyond Forest Gold and Neon Purple (added Slate, Rose, Synthwave)
- [ ] iPad layout improvements (`supportsTablet` is already set to `true` in `app.json`)
- [ ] Localization / currency format options beyond USD





- [x] fix theme selection so it doesn't close option window until you hit done

- [x] fix the import data modal to go to the top of the screen so the keyboard doesn't cover the   window

- [x] make the debts found in the debt window reflect on your budget screens as a monthly cost automatically.

- [x] create a history for monthly budgets and allow the budget goal for each line item stay when the next month starts. keep a history of up to 6 months of budgets.

- [ ] create the ability to take a photo of a reciept from a purchase and have it enter it into a line item expense on your budget.
Tech options:
1. On-device OCR library (more private, no backend)
2. Cloud OCR/API (better accuracy, adds cost/privacy implications)
3. Hybrid: on-device first, manual fallback (best practical start)
Recommended first version:
1. Add “Scan Receipt” button in Budget.
2. Take/select photo.
3. OCR text -> extract best amount/date/merchant.
4. Open prefilled expense modal for confirmation.
5. Save only after user taps confirm.
