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

- [ ] Create a Google Play Developer account ($25 one-time fee) at https://play.google.com/console
- [ ] Create a new app in Play Console
- [ ] Prepare store listing assets:
  - [ ] Short description (80 characters max)
  - [ ] Full description (4,000 characters max)
  - [ ] Screenshots (at least 2, phone screenshots required)
  - [ ] Feature graphic (1024×500px banner)
  - [ ] Hi-res icon (512×512px)
- [ ] Complete the Data Safety form (answers: no data collected, no data shared)
- [ ] Submit via `eas submit --platform android`

---

## Nice-to-Have (Post-Launch)

- [ ] Payment history screen — the data is already being recorded, just needs a UI
- [ ] Edit existing debts (currently debts can only be added or deleted, not edited)
- [ ] Debt payoff order strategies (avalanche vs. snowball method)
- [ ] Push notifications for payment reminders (requires `expo-notifications`)
- [x] Additional themes beyond Forest Gold and Neon Purple (added Slate, Rose, Synthwave)
- [ ] iPad layout improvements (`supportsTablet` is already set to `true` in `app.json`)
- [ ] Localization / currency format options beyond USD





- [x] fix theme selection so it doesn't close option window until you hit done

- [x] fix the import data modal to go to the top of the screen so the keyboard doesn't cover the   window

- [x] make the debts found in the debt window reflect on your budget screens as a monthly cost automatically.

- [ ] create a history for monthly budgets and allow the budget goal for each line item stay when the next month starts. keep a history of up to 6 months of budgets.

- [ ] create the ability to take a photo of a reciept from a purchase and have it enter it into a line item expense on your budget.


