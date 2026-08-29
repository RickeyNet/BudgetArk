# BudgetArk - App Store Launch TODO

Work through phases in order: finish the features first, then handle store prep and submission.

---

## Pre-Launch (Required Before Any Submission)

### App Configuration
- [x] Add `bundleIdentifier` to `app.json` under `expo.ios` (e.g., `com.yourname.budgetark`) - required by Apple
- [x] Add `package` to `app.json` under `expo.android` (e.g., `com.yourname.budgetark`) - required by Google
- [x] Change `userInterfaceStyle` in `app.json` from `"light"` to `"dark"` (the app uses a dark theme)
- [x] Add `expo.ios.buildNumber` and `expo.android.versionCode` fields to `app.json`

### EAS Build Setup
- [x] Create an Expo account at https://expo.dev if you don't have one
- [x] Run `eas login` and `eas build:configure` to generate `eas.json`
- [x] Configure `eas.json` with `development`, `preview`, and `production` build profiles
- [x] Run a production build for iOS: `eas build --platform ios --profile production`
- [x] Run a production build for Android: `eas build --platform android --profile production`

### App Icons & Splash Screen
- [x] Verify `icon.png` is exactly 1024×1024px (required by Apple)
- [x] Verify `adaptive-icon.png` meets Android requirements (foreground should be ~66% of frame)
- [x] Update splash screen `backgroundColor` in `app.json` from `"#ffffff"` to match the app's dark background (e.g., `"#232424"`)
- [x] Consider adding a proper splash icon that fits the dark background

### Missing Feature: Export Data
- [x] Implement the "Export My Data" button in `ProfileScreen.tsx`
  - Exports all data (debts, payments, budget entries, limits, user) as JSON via `expo-sharing` + `expo-file-system`

### Privacy Policy
- [x] Write a privacy policy (required by both Apple and Google)
  - Can be a simple web page or GitHub Gist - key point: state that no data leaves the device
- [x] Add the privacy policy URL to `app.json` under `expo.ios.privacyManifests` or as a link in the store listing

===========================================================================================================================================================================================

## Apple App Store Submission

- [x] Enroll in the Apple Developer Program ($99/year) at https://developer.apple.com
- [x] Create an App Store Connect record for BudgetArk
- [x] Prepare store listing assets:
  - [x] App name and subtitle
  - [x] Description (up to 4,000 characters)
  - [x] Keywords (up to 100 characters)
  - [x] Screenshots for iPhone (6.9" required; 6.5" and 5.5" recommended)
  - [x] App icon (1024×1024, no alpha channel)
- [x] Set the content rating (Finance category, no objectionable content)
- [x] Submit for review via `eas submit --platform ios`

==============================================================================================================================================================================================

## Google Play Submission

### 1. Developer Account
- [x] Create a Google Play Developer account ($25 one-time fee) at https://play.google.com/console

### 2. Build Production AAB
- [x] Run `eas build --platform android --profile production`
- [x] Download the `.aab` file from EAS when the build finishes

### 3. Prepare Store Assets
- [x] App icon: 512×512 PNG
- [x] Feature graphic: 1024×500 PNG
- [x] Screenshots: at least 2 phone screenshots (16:9 or 9:16)
- [x] Short description (80 characters max)
- [x] Full description (4,000 characters max)
- [x] Privacy policy URL (required - host on GitHub Pages for free, state no data leaves the device)

### 4. App Content Questionnaire (in Play Console)
- [x] Complete content rating (IARC questionnaire - should be "Everyone")
- [x] Set target audience / age group
- [x] Complete Data Safety form (no data collected, no data shared, all data stays on device)
- [x] Ads declaration (no ads)

### 5. Create App & Upload
- [x] Go to Play Console > Create app
- [x] Fill in app name, default language, app/game, free/paid
- [x] Complete all Setup checklist items
- [x] Go to Testing > Create new release for closed testing
- [x] Upload the `.aab` file
- [x] Add release notes
- [x] Review and roll out
- [ ] Get 12 testers for 14 days
- [ ] Once approved, go to Production > Create new release

### 6. Wait for Review
- [ ] Google review typically takes a few hours to a few days for first submission
- [ ] Note: `android.package` is `com.budgetark.app` - this is your permanent Play Store identity
- [ ] Google Play App Signing manages your keys by default - no risk of losing your keystore

==============================================================================================================================================================================================

## Security Hardening

(The initial hardening pass - Critical / High / Medium / Low / Info items - is complete and moved to the Done section at the bottom of this file.)

### v1.4.16 Audit Follow-ups

#### High
- [~] Add app-launch biometric / PIN gate - PIN gate SHIPPED app-side (2026-07-26); biometric layer deliberately NOT built (decision: app-specific PIN, no `expo-local-authentication`, keeps it pure JS / OTA-eligible - no new native dep after all). Off by default, opt-in from Profile → Settings → App Lock (Option B posture; no first-launch prompt).

  What shipped:
  - `src/utils/appLock.ts` (pure, unit-tested): 4-8 digit PIN, PBKDF2-SHA256 (250k, native quick-crypto) + random salt, constant-time verify, versioned record parsing (fail-closed on malformed, ACCEPTS future versions/unknown fields - forward compat is the contract so an app update can never lock a user out), escalating lockout math (4 free misses → 30s doubling, 5min cap).
  - `src/storage/appLockStorage.ts` - `@budgetark_app_lock` in EncryptedStorage. Per-device by contract: not exported (exportData regression test extended), not in SyncDiff, in RESET_KEYS. Fail-open on unreadable record (privacy gate, not an encryption factor - documented in code).
  - `components/AppLockGate.tsx` (mounted in App.tsx): locks on cold start + return from >15s background ('inactive' never locks); locked = app tree UNMOUNTED (no overlay-under-Modal risk); record re-read each foreground so Profile changes apply live. `components/PinPad.tsx` custom keypad (no system keyboard). "Forgot PIN?" = reinstall + restore explainer (no self-service reset in v1).
  - `components/AppLockSetupModal.tsx` + row in Profile → Settings: set / change / turn off, current-PIN verify first (feeds the same persisted lockout counter), no-recovery trade-off stated at enable time.
  - Release notes: in-app 1.9.0 highlight + RELEASE_NOTES.md section added 2026-07-26.

  Still TODO:
  - Device-test: cold-start lock, 15s grace matrix (quick switch vs long background), lockout countdown + persistence across force-quit, set/change/disable flows, Reset All Data clears the PIN, theme/density/large-text rendering of the pad.
  - Possible fast-follows: biometric unlock ON TOP of the PIN (`expo-local-authentication`, native dep - bundle with the next store build), ~~a FEATURE_SPOTLIGHTS debut slide~~ DONE 2026-07-27 (`app-lock` slide + `appLock` openSection deep link via SettingsSection ref), ~~onboarding-guide entry~~ DONE 2026-07-27 (profile-extras topic: App Lock sentence + "app lock"/"pin"/"passcode" keywords).

#### Medium
- [x] Add MAC to encrypted exports (or switch to AES-GCM) - DONE (2026-07-26): Option B shipped as `src/utils/exportEncryption.ts` - new `__BUDGETARK_ENC3__:` encrypt-then-MAC format (`salt.iv.ct.mac`; ONE PBKDF2-SHA256 250k call derives 64 bytes, split into AES-256-CBC key + HMAC-SHA256 key; MAC verified constant-time BEFORE decrypting). Write path is v3-only; import reads v1/v2/v3 forever. Golden v3 fixture pins the format (`exportEncryption.test.ts` + `importData.test.ts`). Known cost: an app older than v3-support can't read a NEW password-protected export.

- [x] Pin `expo-secure-store` to device-only accessibility - DONE (2026-07-26): Option A shipped. New keys are created with `WHEN_UNLOCKED_THIS_DEVICE_ONLY`; existing installs get a one-time DELETE + RE-ADD (expo-secure-store's duplicate-item path never updates `kSecAttrAccessible`, so an in-place set is a silent no-op - verified in `SecureStoreModule.swift`), crash-bracketed by a recovery copy under `budgetark_encryption_key_migration_backup` plus a restore check in `loadOrCreateKey` so an interrupted migration can never mint a fresh key over existing data. iOS-gated (`Platform.OS`); `@budgetark_master_key_device_only` marker prevents re-runs. Trade-off accepted: a device-backup restore to a new phone won't carry the key - the export file is the migration path (auto-backup + export UI already say so). MUST device-test the upgrade path on iOS: install old build, add data, upgrade, confirm data reads + no re-migration on relaunch.

#### Low
- [ ] Pass crypto keys as `WordArray`, not hex string passphrases
  Files: `src/storage/encryptedStorage.ts:154-198`, `src/sync/transportService.ts:39-51`
  `CryptoJS.AES.encrypt(plaintext, hexKeyString)` triggers OpenSSL's EVP_BytesToKey (single-round MD5) to re-derive the AES key + IV from a string treated as a passphrase. Inputs already have full 256-bit entropy so it's not exploitable, but the weak-KDF flag will surface on every audit. `exportData.ts` already does this right.
  - **Option A - Switch both call sites to `CryptoJS.enc.Hex.parse(key)` + explicit random IV:** Mirrors the v2 export path. Storage stays backward-compatible if we bump to a `__ENCV3__:` prefix and migrate-on-read.
  - **Option B - Leave as-is, add a comment explaining why it's safe:** Cheapest. Keeps the audit-flag treadmill.
  - Recommended: **Option A** - same pattern as exports, eliminates the recurring audit comment, migration-on-read is the same shape we already used for V1→V2.

- [ ] Use HKDF (or distinct random keys) so HMAC and AES don't share a key
  Files: `src/storage/encryptedStorage.ts`, `src/sync/transportService.ts`
  Both at-rest and on-the-wire formats use the same key for `AES.encrypt` and `HmacSHA256`. With a 256-bit random root key it's not breakable, but key-separation is standard hygiene and would isolate any future weakness in either primitive.
  - **Option A - HKDF-SHA256 from the root key into `encKey || macKey`:** Derive both subkeys lazily on first use; cache. CryptoJS lacks HKDF but it's ~20 lines on top of `HmacSHA256`.
  - **Option B - Generate two independent keys at SecureStore-init time:** Simpler, no derivation. Adds a second SecureStore entry; migration on first launch.
  - Recommended: **Option A** - single root key keeps SecureStore footprint small and pairing/export envelopes don't need to plumb a second secret.

- [x] Constant-time HMAC comparison - DONE (2026-07-26): `constantTimeEquals` now lives in `src/crypto/nativeCrypto.ts` (moved from appLock, which re-exports it) and guards every MAC check: storage V3/V2 HMACs, the sync envelope HMAC in `transportService.ts`, the v3 export MAC, and PIN verification.


---

## Nice-to-Have (Post-Launch)

- [ ] Data confidence tools (last backup badge + backup reminders)
- [~] Accessibility improvements (larger text mode + better screen reader labels) - Larger text mode SHIPPED: app-wide "Text Size" axis (Small / Default / Large / Extra Large) in Profile → Appearance, persisted in EncryptedStorage, multiplies the active Density's `fontScale` so every screen using `tokens.fontScale` scales for free without ballooning spacing (`src/theme/textSize.ts` + extended `DensityProvider`). Budget Spending donut + bars now also scale with it so the section zooms, not just text.

  Android device-fit pass (Moto G report - FAB hidden behind tab bar, layout off with large system text):
  - FAB no longer uses a hardcoded `bottom`. Derives from the live bottom safe-area inset via `fabBottomOffset()` (`src/navigation/tabBarLayout.ts`), shared with the tab bar's own `TAB_BAR_BASE_HEIGHT`, so the FAB always clears the tab bar on any nav-bar style (gesture pill vs. 3-button). Coachmark spotlight rect updated in lockstep. Applied to Budget + Debt Tracker.
  - OS font scaling is now clamped app-wide to 1.3x via `Text`/`TextInput` `maxFontSizeMultiplier` (`src/theme/fontScalingPolicy.ts`, imported early in `App.tsx`). OS scaling stays ON for accessibility but can't double-scale on top of the in-app Text Size axis and overflow rows. 1.3 matches the app's own "Extra Large" multiplier.
  - Audited fixed-height styles across all screens: every `height:` literal is on decorative non-text elements (dividers, progress bars, dots, square icon/avatar chips, donut wrap). Text rows already use `paddingVertical` + `alignItems:"center"` + flex, so they grow with larger type instead of clipping. No row conversions were needed.

  Residual: fixed-size circular icon/avatar chips (e.g. `accountIcon` 34x34, `avatar` 44x44) hold an emoji/initial that scales with the in-app Text Size axis; at Extra Large the glyph can crowd its fixed box. Low impact, cosmetic - revisit if reported. Remaining: a systematic pass of `accessibilityLabel`/`accessibilityRole`/`accessibilityState` across all screens (only the new Text Size controls got labels so far).
- [ ] Onboarding quick-start templates (single, couple, debt-heavy, zero-based)
- [ ] First-launch coachmark walkthrough + always-on How-To reference page

  Purpose: new users currently land on Bridge with no idea what each tab does. Replace cold-start with a guided tour, and keep an always-available reference for users who skip or forget.

  Two parts:
  1. **Coachmark tour** - first time the user lands on each of the 5 tabs (Debts, Budget, Bridge, Utilities, Profile), show a darkened-backdrop overlay with a tooltip card explaining the tab's primary purpose and one or two key actions ("Tap + to add a debt", "Tap a milestone to set targets"). Persist `seenTabs: string[]` to encrypted storage so the same user never sees a step twice. Skip-all and Next buttons. Theme + density aware (uses existing `useTheme()` + `useDensity()` hooks).
  2. **How-To reference** - extend the existing FAQ section in Profile into a richer "How to use BudgetArk" block. Cover one section per tab with the same content the coachmark teaches, plus deeper notes (recurring entries, milestone editing, payoff strategies, partner sync, density/theme toggles). Add a "Replay walkthrough" button that clears `seenTabs` and re-runs the tour the next time each tab is opened.

  Files (proposed):
  - `src/storage/coachmarksStorage.ts` - CRUD for `seenTabs` set, `walkthroughSkipped` flag.
  - `src/onboarding/CoachmarksProvider.tsx` - Context exposing `markSeen(tabId)`, `replay()`, `seenTabs`.
  - `src/onboarding/Coachmark.tsx` - Modal overlay with backdrop + tooltip card. No spotlight cutout in v1; just darkens the screen and shows a card pinned to the relevant region (top/middle/bottom).
  - `src/data/coachmarkContent.ts` - content per tab.
  - `src/screens/*.tsx` - each tab calls `useCoachmark("tabId")` on focus.
  - `src/screens/ProfileScreen.tsx` - How-To section + Replay button.

  Storage: `@budgetark_coachmarks` in EncryptedStorage. `{ seenTabs: string[], skippedAll: boolean, version: number }`. Bump version to invalidate the seen list when content changes meaningfully (e.g. a 6th tab gets added).

  No new deps. Uses React Native `Modal` + the existing theme/density tokens. OTA-eligible.
- [~] In-app donation support (Tip Jar) via Apple/Google billing with privacy-safe wording and no custom payment data storage - App side SHIPPED; store-console product setup still required (below).

  What shipped:
  - `expo-iap` (v4.4.1, OpenIAP/StoreKit 2/Play Billing) added; config plugin auto-added to `app.json`. NOT OTA-eligible - needs a new EAS build (pairs with the Teller build already pending on this branch).
  - `src/components/TipJarModal.tsx` - bottom sheet opened from Profile → "Tip Jar 💛" row (in the Send Feedback card). Three consumable tiers (☕ Small / 🍕 Medium / 🚢 Large) with store-localized prices via `displayPrice`. Purchases are consumed immediately (`finishTransaction({ isConsumable: true })`) so the same tier can be tipped again; leftover unconsumed tips from interrupted sessions are swept on open (prevents Android "already owned").
  - Privacy-safe by construction: the whole payment flow runs in Apple/Google's sheet; the modal states "BudgetArk never sees, collects, or stores any payment details" and NOTHING is persisted - no purchase history, no "has tipped" flag, thank-you state is in-memory only. Copy explicitly says tips unlock nothing (keeps it a donation, not an entitlement).
  - Modal is mounted only while open, so the billing connection is on-demand, not at app launch. Graceful states: connecting spinner → tier list; "Tips aren't available right now" if products fail to load; user-cancel is silent; Ask-to-Buy/pending purchases get a pending note.

  Store console setup still TODO (product IDs must match `TIP_TIERS` in TipJarModal.tsx):
  - App Store Connect → BudgetArk → In-App Purchases: create 3 CONSUMABLE products with IDs `com.budgetark.app.tip.small` / `.medium` / `.large` (suggested $0.99 / $2.99 / $4.99), display names like "Small Tip", short description ("A small thank-you to support development"). Paid Apps agreement + banking/tax info must be active. Attach the IAPs to the next app version for review.
  - Play Console → BudgetArk → Monetize → In-app products: same 3 IDs as one-time products (requires a merchant account). The app consumes them via Play Billing automatically.
  - Data Safety / privacy forms: purchases are handled by the stores, no new data collected by the app - but Google's Data Safety form and Apple's privacy label both have a "Purchases" category handled by the platform; review whether the store forms need the purchases-handled-by-store disclosure on next submission.
  - Build note: expo-iap needs iOS 15+ (SDK 57 default OK) and Kotlin 2.2 on Android - if the EAS Android build fails on Kotlin version, add `expo-build-properties` with `{"android": {"kotlinVersion": "2.2.0"}}`.
  - Sandbox-test on device (sandbox Apple ID / Play license tester) before release; products can take a few hours to propagate after creation.
- [ ] Budget Rollover Mode - unspent budget in a category rolls into next month (envelope budgeting style). Toggle per category.

- [x] Month-start checking balance + cash-flow budget - SHIPPED app-side 2026-07-27 (OTA-eligible, pure JS). Built exactly to the spec that lived here, with the flagged decisions resolved as recommended: monthly prompt prefills the summed checking accounts but stores ONE number; `AssetAccount.balance` is reused as the live value (auto-updated on save only when exactly one live checking account exists and the month is current - a multi-account total can't be distributed); the balance history DOES sync (new optional `SyncDiff.monthStartBalances`, whole-map send + per-month LWW on `updatedAt`, ties-keep-local) and rides JSON export/import. Files as proposed: `storage/monthlyBalanceStorage.ts` (`@budgetark_month_start_balances` + once-per-month prompt marker, both in RESET_KEYS), `utils/cashFlow.ts` (pure, unit-tested: projection, safe-to-spend, reconciliation, `previousMonthKey`), `components/CashFlowCard.tsx` (starting cash → projected end → safe-to-spend + "started $X above/below plan" reconciliation; consumes the SAME monthlyIncome/monthlyExpenses the summary card shows so they can never disagree), `components/MonthBalancePromptModal.tsx` (once-per-month nudge - marker stamped when shown so "Not now" never re-nags; InteractionManager-deferred, skipped while a deep-link param is presenting), BudgetScreen wiring. `cash-flow-budget` spotlight added. Device-test pending: first-of-month prompt timing, prompt-vs-deep-link collision, single-account balance write-through + net-worth recapture, reconciliation line after a second month's entry, card rendering across themes/density.

- [ ] Spending Velocity Alerts - passive banner when opening the app: "You've spent 60% of your Grocery budget and it's only the 12th." No push notifications required.
- [~] Partner Budget Visibility Controls - SHIPPED app-side 2026-07-27 (OTA-eligible, pure JS). 🔒 Private toggle on the Add/Edit entry modal; `BudgetEntry.isPrivate` excluded from the outgoing sync diff (live + tombstoned) in `computeOutgoingDiff` - no wire change, older peers unaffected. Stays in all local budget math, JSON backups, and spreadsheets (schema v4 adds a round-tripping `Private` column - stripping it would silently re-enable syncing). 🔒 badge on Budget entry rows. Deliberate limit: flipping an ALREADY-SYNCED entry private can't retract the partner's copy (no retraction tombstone - an echo could LWW-delete the live local entry); the edit modal says so. Device-test pending: toggle in add + edit, badge rendering, and a two-device sync check (private entry stays local, unmarking resumes syncing).
- [ ] Big Purchase Cost/Benefit Comparison Calculator - compare long-term total cost of ownership for expensive vs cheaper options (e.g. gas car vs hybrid vs EV) using purchase price, financing, fuel/energy cost, insurance, maintenance, depreciation/resale, annual miles, and ownership length. Show break-even point, 5/10-year totals, cost per mile, and whether the higher upfront option pays off over time.
- [ ] Net Worth Timeline Graph - plot net worth (assets minus debt) over time as a line chart. Data already exists across months.
- [ ] Savings Streak Tracker - track consecutive months with savings contributions. "12-month savings streak" gamification without being gimmicky.
- [~] Quick-Entry Home Screen Widget - minimal widget to log an expense without opening the full app. Android SHIPPED app-side (2026-07-12); iOS deferred.

  What shipped (v1 = launcher shortcuts, not in-widget entry):
  - `react-native-android-widget@0.20.3` + config plugin in `app.json` (widget name `QuickEntry`, 4x2 cells, resizable). NOT OTA-eligible - new native dep + new `"scheme": "budgetark"` intent filter; rides the same pending EAS build as Teller/expo-iap/expo-notifications. Custom `index.js` entry point (package.json `main` changed from expo/AppEntry) registers the headless task handler on Android only.
  - `src/widgets/QuickEntryWidget.tsx` - 4x2 grid: header ("⚓ Quick Entry") + six everyday expense categories (Grocery, Restaurant, Transportation, Shopping, Entertainment, Other), emoji + label per button, sourced from `CATEGORY_ICONS` so icons can't drift from the app. Every tappable uses the native `OPEN_URI` click action with a `budgetark://quick-add?category=<name>` deep link (header = no category) - zero widget-side JS on click. Fixed dark palette (widgets render headless, outside ThemeProvider). Deliberately shows NO financial data - home-screen safe.
  - `src/utils/quickAddLink.ts` - builder + fail-closed validator in one module (see security section above). 10 unit tests.
  - `src/components/QuickAddLinkHost.tsx` - app-root host (TrackingReminderHost pattern): warm links via `Linking` `url` event, cold start via `getInitialURL` + once-per-launch guard, retry-until-navigation-ready, navigates Budget with new `quickAdd` route param.
  - BudgetScreen consumes `quickAdd` (deferred past the tab transition like `openInbox`) and opens `AddBudgetEntryModal`, which gained `initialCategory` - applied only on the closed→open edge (forces type=expense), so it never clobbers a draft the user already has open; cleared on every close path so a later FAB open starts clean.

  Still TODO before release:
  - Device-test on Android once the new EAS build exists: widget picker shows label/description, all 7 tap targets deep-link correctly (cold start, backgrounded, and already-on-Budget cases), modal preselects the right category, resize behavior.
  - Optional: `previewImage` PNG for the widget picker (currently shows a default preview).
  - Play Data Safety: no change needed (widget sends nothing anywhere), but confirm on next submission.

  v2 ideas:
  - True in-widget entry (category + amount numpad, save without opening the app) via the library's WIDGET_CLICK headless handler. Prerequisite: verify EncryptedStorage (AsyncStorage + SecureStore + quick-crypto Nitro) works in Android headless JS, and add a write-queue so a widget save can't race the app's read-modify-write on the entries array.
  - User-configurable category set (read from storage in the headless render; needs the same headless-storage verification).
  - iOS WidgetKit port - full spec in the dedicated entry below. Deferred until Android v1 proves usage.

- [~] iOS Quick Entry widget (WidgetKit) - BUILT 2026-07-22; device verification + signing setup pending on the next EAS iOS build. iOS counterpart to the shipped Android widget: static, data-free category grid whose buttons deep-link into the prefilled Add Entry modal. All app-side plumbing already exists (`budgetark://` scheme, `quickAddLink.ts` validation, `QuickAddLinkHost`, `initialCategory` on the modal) - this item is purely the native extension.

  What shipped (2026-07-22):
  - `@bacons/apple-targets@^5.0.0` installed + added to `app.json` plugins. Target lives in `targets/quickentry/`: `expo-target.config.js` (type widget, name QuickEntry, bundle id `.quickentry` → `com.budgetark.app.quickentry`, deploymentTarget 15.1) + `index.swift` (~200 lines SwiftUI, verified the plugin registers the target via `npx expo config --type prebuild`).
  - `systemMedium`: "⚓ Quick Entry · log an expense" header (bare `budgetark://quick-add` Link) + 2x3 grid of category `Link`s, exactly the Android six (Grocery 🛒 / Restaurant 🍴 / Transportation 🚗 / Shopping 🛍️ / Entertainment 🎬 / Other 🏷️), fixed dark palette matching the Android widget. `systemSmall`: single `widgetURL` tap, no grid (small widgets get one tap target).
  - Static timeline (`policy: .never`), NO App Groups, no financial data - pure launcher, same posture as Android. `containerBackground` availability-guarded for iOS 17+, plain background on 15/16; `.contentMarginsDisabled()` since the layout draws its own padding.
  - Cross-reference comments added in BOTH `targets/quickentry/index.swift` and `src/widgets/QuickEntryWidget.tsx` (categories/emoji/palette are a hardcoded copy - drift degrades safely via the fail-closed validator).

  Still TODO before release:
  - ~~Add `expo.ios.appleTeamId` to app.json~~ DONE 2026-07-24 - prebuild config verified warning-free.
  - One-time `eas credentials` pass so the extension gets its own provisioning profile under the app's credentials; then the next EAS iOS build (NOT OTA - new native target).
  - Device verification checklist below (widget gallery both sizes, cold/warm/already-on-Budget deep-link matrix, light/dark home screen, lock-screen tap-to-unlock flow).

  Why it can't be JS: an iOS home-screen widget is a separate app extension running WidgetKit - SwiftUI only, own process, tiny memory budget, no JS runtime. No library avoids the Swift; the constraint is architectural (unlike Android, where `react-native-android-widget` renders JSX from a headless task in the app process).

  Scope (v1 - mirrors Android exactly):
  - `systemMedium` widget (4x2-ish): header "⚓ Quick Entry" + six buttons (Grocery 🛒, Restaurant 🍴, Transportation 🚗, Shopping 🛍️, Entertainment 🎬, Other 🏷️) - emoji + label, fixed dark palette matching the Android widget (bg #1a1915, buttons #2b2a26, accent #da7756, text #F2E6D0).
  - Each button is `Link(destination: URL(string: "budgetark://quick-add?category=Grocery")!)`; header links to bare `budgetark://quick-add`. `systemSmall` variant optional: single "log an expense" tap, no grid (small widgets get ONE tap target - `widgetURL`, not `Link`).
  - NO financial data on the widget, matching the Android posture. This deliberately avoids App Groups entirely in v1 - no shared container, no data snapshotting, nothing to keep in sync. Static timeline (`Timeline(entries: [entry], policy: .never)`) - the widget never needs refreshing.
  - IMPORTANT: category names in the Swift file are a hardcoded copy of the six in `QuickEntryWidget.tsx` - they can't import from TS. Add a comment in BOTH files pointing at each other; the fail-closed validator means a drifted name degrades to "no preselection", never a crash.

  Build plumbing:
  - `@bacons/apple-targets` config plugin. Declare the target in its config (type `widget`); Swift sources live in `targets/quickentry/` and get injected into the Xcode project at prebuild. Files: `targets/quickentry/expo-target.config.js` (or entry in app.json), `Widget.swift` (bundle + TimelineProvider + entry view), `Info.plist` handled by the plugin.
  - ~100-150 lines of SwiftUI total. Provider is trivial (one static entry). Set `.containerBackground(for: .widget)` for iOS 17+ and a plain background fallback for 15/16; deployment target iOS 15 is fine (SDK 57 minimum) since v1 needs no iOS 17 API.
  - Bundle id `com.budgetark.app.quickentry` (extension ids must prefix the app id). EAS Build handles multi-target signing but needs one-time setup: the extension appears as an additional provisioning profile under the app's credentials (`eas credentials`); App Store Connect needs nothing extra - extensions ride the app record.
  - NOT OTA-eligible, obviously - new native target, new EAS build, and every future prebuild regenerates the Xcode project through the plugin.

  Verification checklist (device):
  - Widget gallery shows name/description; add both sizes.
  - Cold-start tap, backgrounded tap, and already-on-Budget tap all land in the prefilled modal (same matrix as the Android device-test item above).
  - Light/dark home screen appearance (fixed dark palette should hold up on both - check contrast against iOS widget corner masking).
  - Lock-screen "tap to unlock then open" flow.

  Maintenance cost (the reason this is deferred): Swift source sits outside the TS toolchain - no shared types, no jest coverage, a second surface to smoke-test each release; @bacons/apple-targets pins to Expo SDK majors, so every SDK upgrade gains a "does the plugin still prebuild" check.

  Explicitly out of scope (v2+):
  - Any data display (spent-this-month, budget remaining) - requires App Groups + the app writing a plaintext-ish snapshot outside EncryptedStorage; conflicts with the data-free posture, decide deliberately if ever.
  - Interactive in-widget entry - iOS 17 AppIntents run Swift in the background, so saving an entry would mean reimplementing entry-writing (and the encryption) natively. Off the table.
  - Interim iOS option, zero native work: document in the FAQ/How-To that the Shortcuts app can wrap `budgetark://quick-add?category=...` as a home-screen icon - works as soon as the scheme-carrying EAS build ships.

  Effort: ~1-2 days (mostly plugin config + signing + device verification, not the SwiftUI).
- [ ] Bill Calendar View - monthly calendar showing when recurring expenses hit. Visual cash flow timing.

  OTA-shippable: yes. Pure RN + math against existing `BudgetEntry` data. No native modules. The only caveat is the data prerequisite below - handle that first or the calendar is useless.

  Data prerequisite (must ship first or alongside):
  - Every recurring entry today is stored with `date: ${yearMonth}-15T12:00:00` (see `AddBudgetEntryModal.tsx` + `EditBudgetEntryModal.tsx`) - pinned to the 15th. A calendar built against current data would clump every recurring bill on the 15th.
  - **Option A - Day-of-month picker on Add/Edit modals (recommended).** When Recurring is on for an expense, surface a day-of-month input (1-31). Persist via the existing `date` field's day component - no schema change. Migrate by treating old entries' day as 15; first time the user opens the calendar, show a one-shot nudge ("Set the day each bill actually hits"). Income (paycheck) stays on the 15th since paychecks aren't "bills" in this surface.
  - **Option B - New `recurrenceDayOfMonth?: number` field on `BudgetEntry`.** Explicit, doesn't repurpose `date`. Type change carries through sync, export, import, validators. Overkill - Option A round-trips fine.
  - Recommended: **Option A**.

  Scope (v1):
  - Full-screen `Modal` pinned to the selected month from BudgetScreen (reuse `getBudgetMonthKeys` so users can flip forward/back).
  - 7-col × 5-6 row day grid. Each cell shows day number + up to 3 colored dots (one per category that day) + total dollar amount due when > 0.
  - Cells with bills get a subtle background tint; warning tint if day total overlaps a near-limit category.
  - Today's cell ringed in `colors.accent`. Past days within the selected month dimmed to ~60% opacity (informational only).
  - Top strip: monthly total bills, paid so far (past + today), remaining (future), next bill ("Rent · $1,650 · in 3 days").
  - Tap a day → bottom sheet listing bills due that day (description, category icon, amount). Tap a bill → opens existing `EditBudgetEntryModal` for that entry.
  - One-off (non-recurring) expenses NOT shown by default - too noisy. Header toggle "Show one-offs too" for users who log expenses on the day they happen.

  Visual approach:
  - Pure RN `View` grid, no calendar lib. Existing date helpers in `BudgetScreen.tsx` (`getMonthDateFromKey`, `getMonthKey`) carry over.
  - Marker dots use the donut chart's color palette (`getCategoryColor` from `categoryIcons`) so a category looks the same here as on the Spending card.
  - Theme + density aware via existing `useTheme()` + `useDensity()` hooks.
  - Coachmark anchors on the entry card so the walkthrough can point at it.

  Recurrence handling:
  - Reuse `isEntryActiveInMonth(entry, monthKey)` from `src/utils/recurrence.ts` to decide whether a recurring entry shows in the calendar's month at all. Quarterly / 6-month / yearly entries naturally only render on their cycle months - no extra logic.
  - Place each entry on the day-of-month derived from `entry.date`. Clamp:
    - Day 31 in a 30-day month → last day of month (mirrors `spreadsheetExport.lastDayOfMonth`).
    - Day 29-31 in February → Feb 28 (or 29 in leap years).

  Data flow (read-only, no new storage):
  ```
  BudgetScreen entries
    → filter by isEntryActiveInMonth(entry, selectedMonthKey)
    → filter to expenses (income gated behind the toggle)
    → group by clamped day-of-month
    → render grid
  ```
  Memoize per `selectedMonthKey`. O(entries) per month - well under 1ms for any realistic dataset.

  Entry point: dedicated card on the Budget tab, between the month switcher and the Spending card. Mini preview: "5 bills · $2,340 due this month · next: Rent in 3 days." Opens the full-screen calendar modal. Avoids cluttering Bridge; surfaces the feature where users already think about monthly cash flow.

  Files (proposed):
  - `src/components/BillCalendarModal.tsx` - the modal, grid, day-detail sheet.
  - `src/components/BillCalendarCard.tsx` - Budget-tab entry card with the "next bill" preview.
  - `src/utils/billCalendar.ts` - pure helpers: `getDayOfMonth(entry, monthKey)` (with clamp), `groupBillsByDay(entries, monthKey)`, `nextBillFrom(entries, fromDate)`.
  - `src/components/AddBudgetEntryModal.tsx` + `EditBudgetEntryModal.tsx` - add day-of-month picker (visible only when Recurring + expense).
  - `src/screens/BudgetScreen.tsx` - mount the card + wire open/close.

  v2 (out of scope, mostly not OTA-eligible):
  - Cash flow line overlay (recurring income on payday + cumulative expense burn). Doable in JS but blurs the "bills" framing - decide after v1 feel.
  - iCal / `.ics` export so bills land in the user's phone calendar. New `expo-calendar` dep → not OTA. Defer.
  - Push notification day-of ("Netflix charges today, $19.99"). Requires `expo-notifications` → not OTA. Defer.
  - Drag a bill to a different day to update day-of-month. Adds drag-gesture surface; nice-to-have.

  Recommended first ship:
  1. Land Option A (day-of-month picker on Add/Edit). Ships independently - no UI change for users who don't use recurring entries.
  2. Build `BillCalendarModal` + helpers. Read-only, expenses-only, no one-off toggle.
  3. Add the Budget card entry point with the "next bill" preview.
  4. Ship as part of the next OTA bundle.
- [ ] "New" badge on newly-released feature entry cards (discovery aid)

  Purpose: when a release adds a new entry surface (e.g. the Bill Calendar card on Budget), give users a visual cue they haven't seen this before so they tap in. Avoids relying solely on the release-notes modal, which users dismiss quickly.

  How:
  - Add a small accent pill ("NEW") in the corner of the entry card. Style mirrors the existing `eyebrow` accent used on cards.
  - Pin per-feature: each candidate feature gets a string id (`"bill_calendar"`, etc.) and an "introduced in version" tag baked into the component.
  - Show condition: badge renders while EITHER (a) the feature has never been opened by the user, OR (b) within N days (default 14) of the install/upgrade that introduced the feature - whichever clears first.
  - Clear-on-open: tapping into the feature stamps it as seen in storage so the badge disappears next render.

  Storage:
  - New `featureDiscoveryStorage.ts` in EncryptedStorage under `@budgetark_feature_discovery`. Shape: `{ seenFeatures: Record<string, number>, version: number }` where the value is the seen-at timestamp (kept for future analytics-like questions: "did the user open this within 24h of the upgrade?"). Idempotent set: `markFeatureSeen(id)` writes only when not already present.
  - Discovery context (new `FeatureDiscoveryProvider`) wraps `useFeatureBadge(id, introducedAtVersion?)` so cards opt in with one line. Returns `{ showBadge: boolean, markSeen: () => void }`.

  Files (proposed):
  - `src/storage/featureDiscoveryStorage.ts` - CRUD for the seen map.
  - `src/discovery/FeatureDiscoveryProvider.tsx` - Context + `useFeatureBadge` hook. Mount at app root next to `CustomCategoriesProvider`.
  - `src/components/NewBadge.tsx` - Tiny presentational chip (accent bg, white "NEW" text, scales with `tokens.fontScale`).
  - Wire-up sites for this release:
    - `BillCalendarCard.tsx` - `const { showBadge, markSeen } = useFeatureBadge("bill_calendar")` + render `<NewBadge />` in the headerRow; call `markSeen()` from `onOpen`.

  Cross-cutting notes:
  - OTA-safe - no native deps. Theme/density aware via existing tokens.
  - Reset path: include `@budgetark_feature_discovery` in `clearAllData`'s `RESET_KEYS` so a reset device re-shows every "NEW" badge.
  - Sync: do NOT sync this collection. It's per-device UX state - if synced, a partner who opened the feature first would clear the badge on the slower device before it could ever surface.

  v2 ideas (not now):
  - Dot-badge on the Budget tab icon (RN bottom-tabs `tabBarBadge`) when any feature on that tab hasn't been opened yet. Tempting but adds a second discovery surface; the card pill is enough for v1.
  - "What's new in this version" Profile entry that lists every still-unseen feature with a "Show me" jump. Discoverable replay path beyond the one-shot release-notes modal.
- [ ] Spending Heatmap - calendar-style grid showing daily spending intensity (like GitHub contribution graph). Green = under average, red = over.
- [ ] Financial Health Score - single 0-100 score based on debt-to-income ratio, emergency fund coverage, savings rate, and budget adherence. Updates monthly. No external data needed.
- [ ] Ark Journey Timeline - visual timeline of all completed milestones with dates, like a ship-building progress illustration. Shareable.
- [~] Receipt photo attachments on budget entries (no OCR) - SHIPPED app-side (2026-07-12). Photo plumbing only; the OCR pipeline below stays future work and can layer on top of this storage/UI.

  What shipped:
  - `expo-image-picker` + `expo-image-manipulator` (~57.0.2, config plugin with camera/photo-library permission strings in `app.json`). NOT OTA-eligible - rides the same pending EAS build as Teller/expo-iap/expo-notifications/widget. IMPORTANT: bump `version` + `runtimeVersion` when that build is cut - an OTA bundle importing expo-image-picker served to the current 1.9.0 runtime would crash at module init.
  - **Encrypted at rest**: every photo is downscaled (max 1600px long edge, JPEG q0.7) + thumbnailed (240px), then encrypted with the master key using the same fixture-tested V3 envelope as all other data (`encryptStringWithMasterKey`/`decryptStringWithMasterKey` in `encryptedStorage.ts`). Files: `<document>/attachments/<id>.jpg.enc` + `<id>.thumb.jpg.enc` (`src/services/attachments/attachmentStore.ts`). Vault-unavailable devices get an alert and photos are refused - never plaintext.
  - Data model: `BudgetEntry.attachments?: EntryAttachment[]` ({id, createdAt, width?, height?}), UI cap 3/entry. Metadata rides sync/JSON-export; image files are DEVICE-LOCAL in v1 - partner devices show a "photo on partner's device" placeholder; JSON export carries metadata only (regression test pins "no image bytes in export"); spreadsheets never carry photos (documented in schema doc + modal), and merge-mode imports never strip local attachment references (an incoming entry without attachments keeps the local photos - otherwise the sweep would delete the files after a no-op spreadsheet re-import).
  - UI: `AttachmentSection` (shared by Add/Edit entry modals - camera/library buttons, encrypted thumb strip, remove) + `AttachmentViewerModal` (full-screen pager). Budget expanded rows show a 📷 count indicator. Add modal stages photos before the entry exists (attachment ids are independent UUIDs; cancel deletes files); Edit modal is cancel-safe (`newlyStagedIds` - only photos added this session are ever eagerly deleted; removing a pre-existing photo just drops the reference and the orphan sweep collects the files, so the Undo toast can always restore them). Both modals pass a `stagingSession` counter so a photo import still in flight when the modal closes/submits is discarded instead of ghost-staging onto the next entry; the picker/camera's plaintext cache copy is deleted right after import.
  - Lifecycle: files are NEVER deleted when an entry is deleted (soft-delete + Undo + 90-day sync tombstones must restore photos). Sole GC = cold-start orphan sweep, once/24h (`attachmentSweepRunner.ts` from App.tsx): deletes files unreferenced by live AND tombstoned entries, with a 48h age gate protecting in-flight staging. Covers tombstone TTL purge, sync deletes, replace-mode imports, save races, crashed staging. Reset All Data wipes the attachments dir (ProfileScreen reset flow - RESET_KEYS only clears AsyncStorage). Validator gate: attachments metadata bounded at the sync/import trust boundary (≤10 items, short ids, sane dims) so a hostile peer can't smuggle blobs; permissive vs the UI cap of 3 so a merged record can't brick a whole sync diff.
  - Unit-tested: sweep planning, V3 helper round-trip/tamper, validator matrix, export regression.
  - **Receipt zip export** (2026-07-12): Business Expense Report → "Export Receipt Photos (ZIP)" - decrypts the report year's receipts into `budgetark-receipts-<year>.zip` (jszip, pure JS; STORE compression - they're JPEGs) with CSV-matching names `<date>_<business-slug>_<amount>.jpg` (`_2`/`_3` for multi-photo entries, de-collided). Recurring entries contribute their photos ONCE (earliest in-year occurrence) even though the report expands them per month. Explicit confirm first (the zip is unencrypted by design - that's the hand-to-accountant path); archive deleted from disk after the share sheet closes; partner-device photos skipped + counted in a follow-up alert. Pure planner unit-tested (`receiptExport.ts` / `receiptZipExport.ts`).

  Still TODO before release:
  - Device-test on iOS + Android once the new EAS build exists: camera + library capture, permission-denied path, vault-unavailable alert, thumbnails + viewer, Add-modal cancel deletes staged files, Edit-modal cancel restores removed photos, Undo restores a deleted entry's photos, partner placeholder after sync, Reset All Data leaves no files in `<document>/attachments/`, iCloud/device-transfer restore shows unreadable-photo placeholders (expected - key is device-only). Receipt zip: export a year with multiple businesses/photos, verify names match the CSV, zip opens on desktop, archive gone from the app sandbox after sharing, partner-photos-skipped alert.
  - Release-notes entry: DONE 2026-07-12 (in-app 1.9.0 notes + RELEASE_NOTES.md, incl. the receipt zip export). Version/runtimeVersion bump still due when the EAS build is cut.
  - v2 ideas: OCR autofill (original plan below), photo sync over LAN (chunked binary transfer).

  Original OCR plan (still future):
  1. On-device OCR library (more private, no backend)
  2. Cloud OCR/API (better accuracy, adds cost/privacy implications)
  3. Hybrid: on-device first, manual fallback (best practical start)
  Recommended: "Scan Receipt" button -> photo -> OCR extract amount/date/merchant -> prefilled expense modal -> save on confirm.

- [~] Business expense tracking - SHIPPED app-side (2026-07-12), fully OTA-eligible (pure JS).

  What shipped:
  - `Business` entity ({id, name, createdAt, updatedAt, deletedAt?}, cap 20, name ≤40 chars) in `businessStorage.ts` (`@budgetark_businesses`, in RESET_KEYS). TOMBSTONED (unlike custom categories) because entries reference businesses by id - deletes propagate through P2P sync and are Undo-able. `BudgetEntry.businessId?` (expenses only; cleared when an entry's type flips to income, mirroring linkedAccountId).
  - Decision: business expenses REMAIN in all personal budget math (donut/limits/monthly review) - it's still money leaving your accounts. They get a 💼 badge on entry rows and a separated report. A per-business "exclude from personal budget" toggle is a possible fast-follow.
  - Sync: new optional `SyncDiff.businesses` collection (older peers unaffected; no backfill flag needed - new feature). Validators deliberately permissive at the trust boundary (no dup-name rejection - one invalid record kills a whole diff).
  - Export/import: JSON carries businesses incl. tombstones; spreadsheet schema bumped v1→v2 (Budget Entries + `BusinessId` round-trip column + `Business` readable export-only column; new `Businesses` xlsx sheet; v1 files still import). `SPREADSHEET_SCHEMA.md` + in-app schema modal updated.
  - UI: Profile → "BUSINESS EXPENSES" section - Manage Businesses (add/rename/delete with tagged-entry counts) + Business Expense Report (year stepper, per-business totals/category breakdown/receipt counts, recurring expanded per app cadence, deleted businesses flagged, CSV export `budgetark-business-expenses-<year>.csv`). Add/Edit entry modals: "BUSINESS (OPTIONAL)" pill row (shown for expenses once ≥1 business exists).
  - Unit-tested: storage validators, diffEngine LWW/tombstone/reject, JSON + spreadsheet round-trips, report math (recurrence expansion, deleted grouping, CSV escaping/formula-injection).

  Budget-tab "💼 Business only" filter chip - DONE 2026-07-26. Lives on the Spending card (appears once the selected month has a business-tagged expense; stays visible while active so it can always be toggled off). When on: donut, category rows, and expanded entries show only business-tagged expenses; the synthetic Debt Payments rollup is excluded; category limits/ratios are hidden (a business-only slice against a full-category limit would understate usage - bars scale relatively instead, with a "Limits hidden while filtered" hint). Deliberately scoped to the Spending card - summary stats and the bucket card stay unfiltered so personal budget math never silently changes. Session-only (not persisted). Release-notes entry due with the next version cut. (Business feature release-notes entry DONE 2026-07-12 - in-app 1.9.0 notes + RELEASE_NOTES.md.)

- [ ] Lean month mode - toggle that hides non-essential categories from Budget, surfacing only essentials (Rent, Food, Utilities, Transport). Helps users focus during tight months without deleting or reorganizing data. Pure UI filter, OTA-safe.

- [ ] Hidden cost of debt counter - widget on Debt Tracker showing projected total interest across the remaining life of every debt, updates live as payments post. Motivational. Pure derivation from existing balances + APRs + payment schedule.

- [ ] Effective hourly wage view - user enters annual income + hours worked per week; app reframes every expense in "hours of your life" ("$80 dinner = 3.2h"). Optional, opt-in. Settings live in Profile, display toggle on entry rows.

- [ ] Personal best tracking - surface records like "best savings month: April 2025 - $1,840", "longest under-budget streak: 6 months", "biggest debt month: $1,200 paid". Card on Bridge. Pure read over existing data.

- [ ] Year-over-year comparison - pick a category (or all), see same-month-last-year vs this-year deltas in a small bar chart. Lives in Budget or Annual Report.

- [ ] Runway simulator - "how long does my current savings last with income = $0?" Uses existing recurring expenses + emergency fund + asset accounts. Shows months of runway + month it goes negative. Lives on Bridge or Utilities.

- [ ] Emergency mode dashboard - when emergency fund balance drops below a user-defined threshold (or is "tapped" via a withdrawal), Bridge surfaces a refill plan card (recommended monthly contribution to restore in N months) and a soft 30-day freeze on adding new debt entries (with override). Behavioral guardrail.

- [ ] Visible ark fills as milestones complete - replace the abstract Hull/Deck/Supplies progress bars with a visual ark illustration that progressively gains planks, sails, supplies, animals as milestones complete. Big emotional payoff, leans hard into the app's name and theme. Needs an SVG ark in tiered states (or layered components). OTA-safe.

- [ ] Optional daily Proverb / verse - opt-in single verse shown on first app-open of each calendar day. Fits Ark theming. Bundled JSON of public-domain verses (KJV) - no network. Profile toggle defaults OFF so users who don't want it never see it.

- [~] Income tax / take-home pay calculator (US, v1) - SHIPPED app-side 2026-07-27 (OTA-eligible, pure JS, bundled data, no network). Built to this spec: all inputs/outputs below, "Compare states" included, disclaimer + data-source line in-card. Files as proposed: `src/data/taxData2026.ts` (Rev. Proc. 2025-32 federal brackets incl. MFS/HoH quirks, FICA + $184,500 SS wage base), `src/data/stateTaxData2026.ts` (50 states + DC from Tax Foundation 2026, MO/AZ hand-corrected), `src/utils/taxCalc.ts` (pure, 24 tests), `components/TaxCalculatorCard.tsx` on Charts after Plan a Purchase. v1 approximations documented in the data file header (MFJ doubles single state brackets, exemption states as $0 deduction, UT credit flat, no local taxes - noted per state). Annual data refresh = OTA bundle; excluded-scope list below unchanged. Device-test pending: chip grid at large text sizes, keyboard behavior, breakdown rendering across themes. Original spec follows for the v2 items:
  Inputs: gross annual income, filing status (Single / MFJ / MFS / HoH), state, optional pre-tax deductions (401k %, HSA, health premium), pay frequency (weekly / biweekly / semimonthly / monthly). Outputs: federal tax, FICA (SS + Medicare + additional Medicare), state tax, total tax burden, effective rate, marginal bracket, take-home per pay period and per year.

  Tax data:
  - Bundled JSON of current-year federal brackets, standard deductions per filing status, FICA caps/rates (`src/data/taxData2026.ts` etc.). Updated annually via OTA - no native dep, no network.
  - State data: bracket arrays + standard deductions per state. 9 no-income-tax states return 0 (AK, FL, NV, NH, SD, TN, TX, WA, WY). Flat-tax states (CO, IL, IN, KY, MA, MI, NC, PA, UT) are one rate. Progressive states (CA, NY, NJ, OR, MN, etc.) carry full brackets.
  - Source: IRS Pub 15-T + each state's revenue department site; cite source + year in a "Data source" line in the modal so users know when it's stale.

  Scope explicitly EXCLUDED (v1):
  - Local/city taxes (NYC, San Francisco, etc.) - too many edge cases.
  - Itemized deductions, credits (EITC, CTC, etc.) - calc is "rough take-home estimate," not a tax preparer.
  - Self-employment / 1099 SE tax - flag for v2.
  - Year-mid bracket changes, multi-state residence.

  UI:
  - Single screen, inputs at top, live-recomputed breakdown card below (federal / state / FICA / pre-tax savings / take-home), pie of where each dollar goes.
  - Per-pay-period view toggle (annual / monthly / biweekly / weekly).
  - "Compare states" button - shows take-home delta if you moved to a different state at the same gross. Powerful for remote-work users.

  Disclaimer copy: "Estimate only - actual tax depends on credits, deductions, local taxes, and other factors not modeled here. Not tax advice."

  Files (proposed):
  - `src/data/taxData2026.ts` - federal brackets, standard deductions, FICA constants.
  - `src/data/stateTaxData2026.ts` - per-state brackets + standard deductions.
  - `src/utils/taxCalc.ts` - pure functions: `calcFederalTax`, `calcStateTax`, `calcFICA`, `calcTakeHome`.
  - `src/screens/TaxCalculatorScreen.tsx` or `src/components/TaxCalculatorModal.tsx` - entry from Utilities card.

  OTA-eligible: yes. Pure JS, bundled data, no new native deps. Bracket refresh each tax year = OTA bundle update.

- [ ] Charts tab - Amazon affiliate book links (the remaining half of the learning-hub item; the hub itself SHIPPED - see Done). The code side is already plumbed and gated OFF: book resource cards render the Amazon CTA only when `showAffiliateLinks` (default false) AND a populated `amazonUrl` are present (`src/lessons/ResourceCard.tsx`), and `learningProgressStorage` carries `affiliateDisclosureSeenAt`. What's left is console/compliance/content work to light the gate up:

  - Amazon Associates account + OneLink setup (one-time dashboard config, not code work; link Associates accounts per country so international users land on their local storefront with the regional affiliate tag applied).
  - Populate `amazonUrl` + `affiliate: true` on the book resources (currently info-only cards, e.g. "Unshakeable" in ch4-l2/ch4-l3).
  - Optional bundled cover images at `assets/books/<isbn>.png` (~2MB; assets ship in a NEW binary, not OTA - plan the version bump accordingly). Avoids any runtime call to Amazon's image CDN - preserves offline-first promise and avoids the tracking surface of an image fetch.

  Amazon affiliate compliance (CRITICAL - read before shipping):
  - **Amazon Associates Operating Agreement** requires the verbatim disclosure: "As an Amazon Associate I earn from qualifying purchases." Must be visible near affiliate links AND in a persistent location.
  - **First-tap one-time disclosure modal** on any affiliate link:
    > "Books on Charts link to Amazon. If you buy after tapping, BudgetArk earns a small commission at no extra cost to you. This helps fund the app's development."
    > [Continue] [Cancel]
    Persist via the existing `affiliateDisclosureSeenAt`, never shows again.
  - **Always-visible small footer** on lesson resource sections: "Some links earn commission. As an Amazon Associate, BudgetArk earns from qualifying purchases."
  - **Profile → About** gets a full "Affiliate Disclosure" section with the verbatim Amazon-required text.
  - **Profile toggle**: "Show affiliate links" (the `showAffiliateLinks` gate; decide default ON vs OFF at enable time). When OFF, book cards still render with metadata but hide the Amazon CTA - honors privacy-purist users.
  - **Apple App Store**: affiliate links allowed under Guideline 3.1.3 (physical/digital goods sold elsewhere). Reviewers occasionally flag undisclosed affiliate use - the disclosure modal + Profile section + footer mitigate. CTAs must clearly route to a browser ("View on Amazon"), never "Buy in app."
  - **Google Play**: allowed with disclosure - covered by the above.
  - **F-Droid**: affiliate links count as Advertising under their anti-features taxonomy. Two options:
    - **Option A (recommended)**: build flag `process.env.BUILD_VARIANT === "fdroid"` strips `amazonUrl` from resource cards at render time. Books still show metadata + cover, just no Amazon button. Clean ship, no anti-feature tag.
    - **Option B**: ship with the `Advertising` anti-feature tag and accept the user-filter penalty.

- [ ] Charts "Recommended for you" card - the one landing-screen piece dropped from the shipped hub: 1-3 personalized lesson cards picked from user state (high-interest debt → avalanche lesson; no emergency fund → starter cushion lesson; net worth crossed $10k → investing basics). Pure derivation over data already loaded by ChartsScreen; OTA-eligible. Could also add the 🦉 Wise Steward badge (read 25 lessons) skipped when the badge set shipped - the course currently has 24 lessons, so the condition needs retuning first.

---

## Themes

Ideas for new color themes (all pure JS - a `ThemePreset` in `src/theme/themes.ts` plus an optional ambient background component - so every one of these is OTA-safe). Existing lineup for reference: The Ark, Forest Gold, Neon Purple, Easy, Rose, Synthwave, Deep Forest, Coral, Deep Space, Deep Sea; ambient backgrounds currently on the "Deep" themes only.

- [x] **Lighthouse** - SHIPPED 2026-07-27. Near-black + beam-yellow; the AAA audit WAS done numerically (WCAG luminance script): every text-carrying slot >= 7:1 against both bg and card (lowest: textMuted 7.75:1), border >= 3:1. Audit note pinned in the preset comment - re-verify before changing any value. ("Thick borders" not expressible in a ThemePreset - border COLOR is high-visibility instead.)
- [x] **Chart Room** - SHIPPED 2026-07-27. Aged paper / teal contour ink / brass. Compass-rose ambient watermark deliberately skipped (non-Deep themes carry no ambient backgrounds); revisit only if it earns Deep-tier treatment.
- [x] **Harbor Dawn** - SHIPPED 2026-07-27. Pale peach bg + cool grey cards + muted gold, tuned so accent/status colors clear ~4:1 on the pale cards (first-draft gold was 2.6:1). Solid bg - the horizon gradient would need an ambient background component.
- [x] **Ledger** - SHIPPED 2026-07-27. Cream paper + accounting green + red-ink danger. Ruled lines/tabular type not expressible in a ThemePreset.
  All four: one combined `four-themes` spotlight slide; visual device check pending across Solid/Glass styles and densities.

---

## Engineering Health - Post-1.7.2 Assessment (2026-06-09)

Prioritized gaps identified after the Round 4 audit. Completed items have moved to the Done section at the bottom of this file. Remaining: the Potentialbugs.md split.

- [x] **Scheduled local auto-backup.** SHIPPED app-side 2026-07-26 (OTA-eligible, pure JS). Weekly (default, ON) or monthly export JSON encrypted with the MASTER KEY (V3 envelope, receipt-photo posture - never plaintext, vault-down throws) into `<document>/autobackups/`, newest 3 kept, pruned only after a successful write. No background task: due-check on cold start (`autoBackupRunner.ts` in App.tsx's deferred launch block), due-ness derived from the newest file's name-embedded timestamp (no drift-prone marker). UI: Profile → Data → Automatic Backups (`AutoBackupModal.tsx`) - toggle/cadence/Back Up Now + restore list with inline merge/replace confirm through the standard `importFromString` path. Settings `@budgetark_auto_backup_settings` in RESET_KEYS; reset also wipes the directory (`clearAllAutoBackups`). Planner pure + unit-tested (`autoBackupPlan.ts`). Deliberately device-local only (uninstall deletes it; Export remains the migration path - stated in the modal). Device-test pending: first-launch auto-write, cadence respected across launches, Back Up Now, merge + replace restores, reset wipes files, row subtext freshness.

- [ ] **Split Potentialbugs.md.** It has become the de-facto changelog and is too large to read in one pass. Move fixed/closed rounds to `docs/audit-archive.md` (or per-round files) and keep only open findings + the latest round in the root file.

## Code Review - 2026-08-26 (bank-api-tracking @ b5fc681)

Five-dimension review (logic, security invariants, data layer/sync, UI/architecture, tests) weighted toward the ~22k lines added since the 2026-07-16 review. Every item below was verified against the code at the stated line; line numbers drift as files change, so grep the quoted symbol if a line no longer matches. Baseline at review time: typecheck clean, lint 1 warning (at the `--max-warnings 1` ceiling), 1276/1276 tests, coverage S69.4 / B67.2 / F61.8 / L70.1.

Suggested order: Tier 1 #1-#2 first (silent, deterministic data loss with sync on), then the Tier 2 fail-closed + export-cleanup items, then the BudgetScreen loader guard, then the coverage ratchet.

### Tier 1 - Data loss / correctness

- [x] **Stale-state save erases records written by background sync (HIGH).** FIXED 2026-08-26 (staged, device test pending: add/edit/delete/undo/food-split on Budget with a partner sync or bank auto-approval landing in between; Bridge add/edit account). budgetStorage + assetAccountStorage CRUD now run inside `encryptedStorage.updateItem` (atomic RMW vs the stored array, `mutateBudgetEntries`/`mutateAssetAccounts`); new `addBudgetEntries` + `adjustAssetAccountBalances` (pure math in `utils/assetBalanceDeltas.ts`); BudgetScreen/BridgeScreen no longer call `save*(stateArray)` anywhere; new `storage/dataChangeNotifier.ts` published from `applyIncomingDiff` and the bank sync pass, subscribed by Budget/Bridge/Debt tabs (`reloadTick` re-runs the focus loader). Tests: `storage/__tests__/{budgetStorage,assetAccountStorage,dataChangeNotifier}.test.ts`, `utils/__tests__/assetBalanceDeltas.test.ts`. Original finding: `src/screens/BudgetScreen.tsx` add (~:955-965), edit (~:1108-1118), food split (~:1357) call `saveBudgetEntries(nextEntries)` built from React state; `mergePreservingTombstones` (`src/storage/tombstones.ts:79-84`) intentionally drops stored live records absent from the array. LAN auto-sync (`autoSyncManager.ts:82`) and bank auto-approve (`connectionsSyncService.ts:367` -> `reviewInboxService.ts:142`) both write entries on app foreground with no BudgetScreen reload, so the next add/edit hard-deletes them (no tombstone; partner never re-sends because `updatedAt < lastSyncTimestamp`). Same shape for `saveAssetAccounts`. Fix: route add/edit through storage-level read-modify-write (`addBudgetEntry`/`updateBudgetEntry`), and/or reload on `AppState` active + a sync-complete event.
- [x] **Imports/restores never reset the sync watermark (HIGH).** FIXED 2026-08-26 (staged, device test pending: restore a backup on a paired device, sync, confirm restored records appear on the partner and Profile still shows "Last synced"). `pairingStorage.resetSyncWatermark()` nulls `lastSyncTimestamp` (keeps `syncCount`; new display-only `SyncMetadata.lastSyncCompletedAt` keeps Profile's "Last synced" label) and `importFromString` calls it after phase 4 - covers JSON import, spreadsheet import and auto-backup restore. Next sync is a full idempotent send. Known limitation (documented in the helper): a replace-mode restore that dropped records the partner already sent can't make the PARTNER re-send them. Tests: `sync/__tests__/pairingStorage.test.ts`, `importData.test.ts` "partner sync watermark". Original finding: `importData.ts:697-769` preserves original `updatedAt` (correct for LWW) but `diffEngine.ts:179-188` only sends `updatedAt > lastSyncTimestamp` and nothing outside `src/sync/` ever lowers it. Restoring a JSON backup / spreadsheet / auto-backup on a paired device leaves every restored record invisible to the partner forever. Fix: clear (or lower to the oldest imported `updatedAt`) the watermark after a successful import.
- [x] **Records with no `updatedAt` are un-syncable both ways.** FIXED 2026-08-27 (staged; no device-visible change on healthy data - the only observable effect is that pre-P2P-era goals/accounts/holdings/businesses/people/categories now reach the partner on the next sync). New `utils/recordTimestamps.ts`: `ensureUpdatedAt` (same-ref when present; createdAt, else now) is applied at read time and persisted via each store's atomic repair path in savingsGoal/assetAccount/holdings/business/person/customCategories storage (debts/payments/entries already had it); `timestampMs` (missing/garbage -> epoch) now backs `filterChanged` (which also always sends on first sync) and `mergeById`, so a NaN comparison can never silently drop or freeze a record again. Tests: `recordTimestamps.test.ts`, assetAccountStorage "read-time updatedAt normalizer", diffEngine "lacking updatedAt on the first sync" + two LWW cases. Original finding: Validators accept missing `updatedAt` (`recordValidators.ts:138,173,279,441,459,486,509,541`); only debts/payments/entries normalize it on read. `diffEngine.ts:183` (`NaN > x` false -> never sent) and `:311-318` (never overwritten by partner) while `changedCount` still increments. Affects savings goals, asset accounts, holdings, businesses, people, custom categories from pre-P2P backups. Fix: read-time normalizer (missing -> epoch) in each loader, matching `budgetStorage.ts:85-91`.
- [x] **Bank ingest pending->posted twin: duplicate inbox row.** FIXED 2026-08-27 (staged; device test pending against a live SimpleFIN/Teller fetch that lists both the pending and posted form of one purchase). Twin claims now use a separate `claimedTwinIds` set, and a same-batch drift update for the pending id is folded into the migration instead of leaving a stale row. Tests: ingest.test "lists the pending id BEFORE the posted id", "folds a same-batch drift update". Original finding: `src/services/connections/ingest.ts:291-296` reuses `handledKeys` for both "seen in batch" (:240) and "migrated twin"; fetch order `[P(pending), X(posted)]` handles P via `existing`, then X finds no eligible twin and becomes a second row -> double-counted expense on approve. Fix: separate `migratedTwinIds` set.
- [x] **Ingest update paths keep stale `suggested*` fields.** FIXED 2026-08-27 (staged): a shared `suggestionsFor(merchant, type, account)` (mirrors `replanInboxForRules`) is used by the new-item path and BOTH update paths, so the posted merchant's categorize/rename/business/person rule applies as soon as the item posts. Tests: ingest.test "recomputes rule suggestions when the posted description changes the merchant key", "applies rule suggestions from the POSTED merchant when migrating a twin". Original finding: `ingest.ts:253-262` and `:299-308` recompute `merchant` but not `suggestedCategory/Name/BusinessId/PersonId`, so categorize rules don't apply to migrated items until a rule edit triggers `replanInboxForRules`. Fix: re-run the rule match (:320-356) in both update paths; assert suggestions in `ingest.test.ts:189`.
- [x] **Ingest drift check compares raw vs sliced description.** FIXED 2026-08-27 (staged): drift now compares against the 220-char capped form. Test: ingest.test "does not treat a >220-char description as drift on every sync". Original finding: `ingest.ts:247-251` compares `existing.description !== tx.description` but stores `tx.description.slice(0, 220)` -> any >220-char description "drifts" every sync, bumping `updatedAt` forever. Compare against the sliced value.
- [x] **Ingest ledger-twin lookup can alias same-amount purchases.** FIXED 2026-08-27 (staged): a ledger decision can be the twin of exactly one posted tx - `findDecidedTwinKey` skips decisions already claimed (`aliasOf` records persisted in the ledger from earlier syncs, plus claims made this batch), so the second same-amount purchase falls through to the inbox-twin migration instead of aliasing and stranding its pending row. Ledger-first order kept (inbox-first would mis-pair the settlements). Tests: ingest.test "lets a ledger decision be the twin of only one posted tx", "honours a claim persisted in the ledger from an earlier sync". Original finding: `ingest.ts:278-287` runs before the inbox-twin lookup (:290-317) and never consumes a candidate; two same-amount purchases on one account within 4 days -> the posted twin of the second aliases to the first's ledger decision and is dropped, leaving a permanently pending inbox row. Fix: prefer an inbox pending twin over a ledger alias, and consume ledger candidates once per batch.
- [x] **Spreadsheet round-trip strips fields (tie -> incoming wins).** FIXED 2026-08-27 (staged; device test: export xlsx with a keep-alive card, an overpaid payment, a proxy-tracked 401k fund and a manual-value fund, re-import in merge mode, confirm nothing changed). Debts sheet gained `KeepAlive`/`KeepAliveWindowMonths`/`KeepAliveLeadDays`/`KeepAliveLastUsedAt` ("yes"/"no"/blank so an explicit off survives and old workbooks leave the watch unset; out-of-range values drop the field, not the debt). Payments gained `AppliedAmount` (0..Amount, else dropped; `isPaymentItem` now bounds it too). Holdings gained `Name`/`ManualValue`/`AnchorValue`/`AnchorPrice`/`AccountId`; `rowToHolding` recognises all three shapes (ticker / proxy / manual) and skips an unpriced proxy with a reason instead of guessing. `docs/SPREADSHEET_SCHEMA.md` updated. Tests: spreadsheetRoundTrip (all three holding shapes, keep-alive, applied amount), spreadsheetImport "holding shapes" + "debt keep-alive and payment applied amount". Original finding: `spreadsheetExport.ts:171-185` `DEBT_COLUMNS` lack `keepAliveEnabled/WindowMonths/LeadDays/LastUsedAt` (re-import turns keep-alive off for every card); `PAYMENT_COLUMNS` (:187) lack `appliedAmount` (later `deletePayment`, `debtStorage.ts:503`, restores the full amount instead of the clamped delta); `holdingToRow` (:381-388) drops `accountId` + proxy `name/anchorValue/anchorPrice` (holdings orphaned from their account, proxies become plain ticker positions, manual holdings skipped on import). Fix: add the columns (see `docs/SPREADSHEET_SCHEMA.md`) and cover them in `spreadsheetRoundTrip` tests.
- [x] **UTC-date entry dates.** FIXED 2026-08-27 (staged; device test: log a tip / a Build-Your-Ark savings correction late in the evening near a month boundary and confirm it files under the local month). Both now use `buildEntryDateISO(localYearMonth(now), now.getDate())`; `localYearMonth` is a new helper in `utils/entryDate.ts` (tested) so the next auto-created entry has no excuse to reach for `toISOString().slice(0, 10)`. Original finding: `src/components/TipJarModal.tsx:232` and `src/screens/DebtTrackerScreen.tsx:1110` build `date` with `toISOString().slice(0, 10)` (UTC calendar day) instead of `buildEntryDateISO` -> entries file into the wrong month near midnight. Fix: use `buildEntryDateISO(localYearMonth, localDay)` like the entry modals.
- [x] **App Lock lockout countdown uncapped.** FIXED 2026-08-27 (staged): `lockoutRemainingMs` clamps to `LOCKOUT_MAX_MS` (5 min) - a clock set back after a lockout can no longer show a year-long countdown. Test: appLock.test "lockoutRemainingMs clamp". Original finding: `src/utils/appLock.ts:233-241` `lockoutRemainingMs` returns `until - nowMs`; a clock set back after a lockout shows a year-long countdown. Clamp to `LOCKOUT_MAX_MS`.
- [x] **Merchant-rule `renameTo` false positive.** FIXED 2026-08-27 (staged): the decision is now the pure `merchant.renameForRule(savedName, bankDescription)`, which sanitizes the bank text the same way the saved name was before comparing; `reviewInboxService` calls it. Test: merchant.test "renameForRule" (incl. a control-char bank description). Original finding: `reviewInboxService.ts:151-154` compares sanitized `description` to unsanitized `item.description.trim()`; a control char in the bank text pins a "rename" rule. Compare against `sanitizeTextInput(item.description).trim()`.
- [x] **Budget-limit removal never propagates to partner.** FIXED 2026-08-27 (staged; device test: remove a category limit on one paired device, sync, confirm it disappears on the partner and does not come back after a re-pair). `CategoryBudgetLimit.deletedAt` (optional - older peers treat the row as live, i.e. exactly today's behaviour, no regression). `saveCategoryBudgetLimits` is now an atomic `updateItem` that tombstones categories omitted from the saved list (fresh `updatedAt` so the diff filter picks them up) and resurrects ones that return; `getCategoryBudgetLimits`/`getAllLimitsByMonth` are live-only (every screen/report/achievement/spreadsheet consumer unchanged), new `getAllLimitsByMonthIncludingDeleted` feeds the outgoing diff and the JSON export; incoming limits merge through `mergeLimitHistoryFromSync` (atomic, timestampMs-safe) and the per-category LWW naturally retires a live copy when a newer tombstone arrives. `isBudgetLimitItem` accepts an optional ISO `deletedAt`. importData's per-category LWW is generic, so tombstones survive a backup round-trip too. No `PROTOCOL_VERSION`/`SyncDiff` shape change. Tests: budgetStorage "category limits - removals become tombstones", diffEngine "removals propagate as tombstones". Original finding: `BudgetScreen.tsx:1406-1420` removes a limit by omitting the row; `diffEngine.ts:195-205` only emits existing rows and the receiver merge (:601-615) is a per-category union, so the partner keeps it and re-sends it on the next first-sync. Either tombstone limits or document the limitation next to the custom-category note in `sync/types.ts:129-135`.
- [x] **`applyIncomingDiff` is non-atomic across 9 collections.** FIXED 2026-08-27 (staged; device test: run a partner sync while adding an entry/debt on the receiving device - neither the incoming records nor the local add may be lost). Each tombstoned store exports `merge*FromSync(merge)` (debts, payments, budget entries, savings goals, asset accounts, holdings, businesses, people), which runs the LWW merge INSIDE `encryptedStorage.updateItem` against the array actually stored at that moment (normalized as the getter would); shared `collectionRepair.mutateCollectionInPlace` backs the bare-array stores. `applyIncomingDiff` now calls those instead of getX -> mergeById -> saveX; the payments dedupe and the isPrivate re-stamp moved inside the callbacks. Tests: diffEngine mocks updated to the callback contract, `referentialCleanup.test.ts` "atomic merge contract". Not covered (by design, documented in diffEngine): budget limits, bucket overrides, month balances, snapshots, milestone plan, strategy - map/singleton keys with their own newer-wins merges. Original finding: `diffEngine.ts:486-586` does `get*IncludingDeleted -> mergeById -> save*`; a user write landing between read and write is dropped (see item 1). Low frequency, but sync runs in the foreground. Fix: apply each collection through `updateItem` (`encryptedStorage.ts:655`).
- [x] **Deleted person/business keeps auto-suggesting via merchant rules.** FIXED 2026-08-27 (staged; device test: delete a person who is named by a merchant rule and set as "whose card" on a bank link, then sync a new transaction from that merchant/account - no "(deleted person)" suggestion). `merchantRulesStorage.clearAssigneesFromMerchantRules` + `externalAccountLinksStorage.clearPersonFromLinks` (atomic, no-op without matches) run from `deletePerson`/`deleteBusiness` AND from `mergePeopleFromSync`/`mergeBusinessesFromSync` for records the merge newly tombstoned, so a partner's delete cascades the same way. Items already sitting in the inbox keep their stale suggestion until the next rule replan (UI shows "(deleted)"). NOT done here: the asset-account tombstone -> holdings cascade over sync (`diffEngine` :550-555 vs `BridgeScreen.tsx:1037-1048`) - separate item. Tests: `referentialCleanup.test.ts`. Original finding: `merchantRulesStorage.ts` never clears `personId/businessId` on person/business delete, so `ingest.ts:352-355` keeps suggesting a deleted assignee in the Review Inbox. Also: an asset-account tombstone received over sync does not cascade to holdings (`diffEngine.ts:550-555`) although the in-app path does (`BridgeScreen.tsx:1037-1048`).

### Tier 2 - Security invariants

- [x] **Rule 2: LAN-sync `sharedSecret` not written fail-closed.** FIXED 2026-08-26 (staged; device test pending: pair two devices, set home network, toggle auto-sync, enable/change App Lock PIN - all should behave as before on a healthy keystore). `savePairingState` and `appLockStorage.saveRecord` now pass `requireEncryption: true`; `EncryptionUnavailableError` surfaces as plain-language messages in `PairingModal` (commit), the Profile home-network / auto-sync toggles (info modal, state unchanged), and `AppLockSetupModal` (already handled). App Lock read stays deliberately fail-open. Test: `pairingStorage.test.ts` "fail-closed". Original finding: `src/sync/pairingStorage.ts:28-30` `savePairingState` uses plain `setItem`; `encryptedStorage.ts:622-635` falls back to plaintext when the keystore is unavailable, so the AES+HMAC key for every sync frame can land unencrypted. Fix: `requireEncryption: true` + surface `EncryptionUnavailableError` in the pairing flow (mirror `connectionSecretsStorage.ts:71-73`). Same for `appLockStorage.ts:45-47` (lower stakes - PIN is PBKDF2-hashed, 250k iterations, salted).
- [x] **Rule 6-adjacent: plaintext export files never deleted.** FIXED 2026-08-26 (staged; device test pending: export xlsx/csv, business CSV, person CSV and loan schedule on both platforms - the receiving app must still get the file, and Files/Documents must not retain a copy afterwards). New `utils/shareTempFile.ts` (`shareLocalFileThenDelete` - deletes in `finally`, so a failed share can't strand a file either); adopted by `spreadsheetExport` (also cleans up a partially written file on write failure), `BusinessReportModal`, `PersonReportModal` and the `ChartsScreen` loan-schedule export. The "file has been saved to the app cache" wording in `iosNativeShare` was dropped since that's no longer true. Test: `utils/__tests__/shareTempFile.test.ts`. Original finding: `spreadsheetExport.ts:1232-1234` and `BusinessReportModal.tsx:108-116` write CSV/XLSX to `Paths.document` (iOS) / `Paths.cache` (Android) with no cleanup after the share sheet, unlike the receipt zip (`BusinessReportModal.tsx:144-148`). Fix: delete in `finally` after the share resolves; verify the iOS Documents dir is excluded from iCloud/iTunes backup or move the temp file to cache.
- [x] **Rule 14: unguarded `console.info`.** FIXED 2026-08-26 (staged): the `log()` trace in `exportSpreadsheet` is now a no-op unless `__DEV__` (typeof-guarded so the Jest/Node suite still runs it). Original finding: `spreadsheetExport.ts:925-928` `log()` helper (timings/phase names only, no PII) has no `__DEV__` guard - the only one in `src/`. Wrap it.
- [x] **`@budgetark_learning_progress` not exported/backed up.** `learningProgressStorage.ts:20`; header only justifies excluding it from *sync*. Lesson completion is lost on device migration - add to export/import KEYS or document as deliberate. FIXED 2026-08-27 (staged; device test: export → import on a second device keeps completed lessons + Resume): exported as `learningProgress`, imported via `sanitizeLearningProgress` (slug ids, ISO dates, fail-closed scalars) with union-earliest merge / verbatim replace; still not partner-synced.
- [x] Minor: `TellerConnectModal.tsx:92-105` checks `postMessage` payload fields for truthiness, not `typeof === "string"`, before persisting into the Teller secrets map. FIXED 2026-08-27 (staged; device test: Teller sandbox enrollment still completes): both fields must be non-empty strings before `onSuccess`.
- [x] Minor: no first-use disclosure on the Settings currency-switch path before the `open.er-api.com` GET (`exchangeRates.ts:94`); the converter card has one (`ChartsScreen.tsx:2413`), Settings only shows "Fetching today's exchange rate..." (`SettingsSection.tsx:816`). FIXED 2026-08-27 (staged; device test: first currency switch with a different code shows the disclosure before the rate loads, "Not now" cancels, second switch skips it): `data/exchangeRatesDisclosure.ts` + `storage/exchangeRatesSettingsStorage.ts` (`@budgetark_exchange_rates_settings`, fail-closed ack, not in RESET_KEYS like the other consents) gate the fetch in `SettingsSection`.

### Tier 3 - UI robustness

- [x] **BudgetScreen loader has no try/catch.** FIXED 2026-08-26 (staged; device test pending only on a degraded/near-full device - healthy devices never hit this path). `loadBudgetData().catch(...)` logs under `__DEV__`, keeps whatever state exists, and still settles `isLoaded` so the tab renders its empty states and the next focus retries; the month-scoped `getCategoryBudgetLimits` `.then` gained a `.catch` (keeps the previous month's limits). No error banner added - Debt/Bridge don't have one either; that's a separate design call. Original finding: `BudgetScreen.tsx:371-446` (12 storage reads + `applyAndPersistMissedContributions`); any rejection leaves `isLoaded=false` -> blank tab forever. Same family as the 2026-08-03 onboarding-loop bug. Mirror `DebtTrackerScreen.tsx:340/453` (catch, `__DEV__` log, empty defaults, still `setIsLoaded(true)`). Also `:452-462` limits `.then` without catch.
- [x] **Review Inbox / Merchant Rules mutations fail silently.** `ReviewInboxModal.tsx:206-298` (`handleApprove/Skip/SkipSection/BulkApprove`) and `MerchantRulesModal.tsx:122-175` (`handleSave/Delete`) are `try/finally` with no `catch`; `MerchantRulesModal.tsx:89-102` load has no catch. Add inline error text (AutoBackupModal `inlineError` pattern). FIXED 2026-08-27 (staged; device test pending): `actionError` inline text under each header (load + all handlers catch via new `utils/errorMessage.describeError`).
- [x] **Manage People / Businesses: stuck "Saving...".** `ManagePeopleModal.tsx:100-115` awaits `updatePerson/addPerson` outside any `try` -> a throw leaves `saving=true` forever; load (:66-87) and delete (:138-144) also uncaught. `ManageBusinessesModal.tsx:66-90,105-106,140` mirrors it. FIXED 2026-08-27 (staged; device test pending): submit try/catch/finally, load + delete catch → existing `error` line.
- [x] **Purchase planner mutations uncaught.** `PurchasePlannerCard.tsx:162-180` `handleStartFund`, `PurchasePlanList.tsx:96-111` `handleContribute`, `:113-120` `handleDelete`; `DebtTrackerScreen.tsx:493-506` `handleKeepAliveUse/Dismiss`. FIXED 2026-08-27 (staged; device test pending): `saveError`/`actionError` inline in the form + plan dialog; keep-alive handlers Alert on failure.
- [x] **AutoBackupModal initial load uncaught.** `AutoBackupModal.tsx:104-116` `.then` with no catch -> `settings` stays `null` -> "Back Up Now" disabled forever with no explanation. Effect also duplicates `refresh` (:95-102). FIXED 2026-08-27 (staged; device test pending): load `.catch` → `inlineError`.
- [x] **ConnectionsModal link edits fail silently.** `:162-174` load, `:176-183` `assignPerson`, `:185-200` `applyPreference`, `:208-228` `createAndMap`. Also `:391` renders a hardcoded `$` via `toFixed(2)` instead of `formatCurrency` (if deliberate because it's the bank's currency, comment it). FIXED 2026-08-27 (staged; device test pending): `linkError` under the connection status (cleared with the stale-links guard); balance now `formatBankBalance(amount, link.currency)` (bank's currency, deliberately unconverted).
- [x] **ChartsScreen loaders and FX refresh uncaught.** `:888-925` `loadEfData`; `:1014-1030` `getConverterRates` (network) `.then` with no catch - a failed refresh just un-spins with no "couldn't refresh, showing cached" label. FIXED 2026-08-27 (staged; device test pending): `toolsLoadError` in the EF card; FX open/refresh failures set the rates label.
- [x] **Save/verify paths that swallow errors.** `MonthBalancePromptModal.tsx:138-141` catch only resets `saving`; `AppLockSetupModal.tsx:165-205` `disableAppLock()` (:178) in try/finally with no catch (contrast `saveNewPin` :151-160). FIXED 2026-08-27 (staged; device test pending): MonthBalancePrompt shows `saveError`; AppLockSetup disable path reports "Couldn't turn off App Lock" instead of success.
- [x] **`colors.white` on `colors.accent` fills.** Theme defines `accentButtonText` (`#000000` in 11/14 presets) and sibling code uses it (`GlobalSearchModal:766`, `MerchantRulesModal:702`, `CashFlowCard:190`). Offenders: `ManagePeopleModal:365,422`, `ManageBusinessesModal:365,422`, `ManageCategoriesModal:353,404`, `PersonReportModal:399`, `PurchasePlanList:234`, `AutoBackupModal:297,319,321,411,416`, `MerchantRulesModal:644`, `ConnectionsModal:788`, `ReviewInboxModal:878`, `profile/*` `dialogBtnText` (DataSection 915/987/1035/1077/1089/1201/1209, SettingsSection 854/1001/1058, PartnerSyncSection 260, ConnectionsSection 348, AboutSection 191). Keep `white` only on `danger`/`warning` fills. FIXED 2026-08-27 (staged; device test: check button text on the Ancient Bronze theme where accentButtonText is not black): 31 accent-fill sites → `accentButtonText`; danger/warning fills keep white.
- [x] **New modals ignore density tokens.** `CashFlowCard`, `MonthBalancePromptModal`, `ManagePeopleModal`, `PersonReportModal`, `OnboardingGuideModal`, `GlobalSearchModal`, `MerchantRulesModal` are `makeStyles(colors)` with fixed padding/font sizes; the Density/Text Size setting doesn't reach them. Inline `style={{ flex: 1 }}` at `AutoBackupModal:259,377`, `PeopleSection:70,104`, `HelpSection:92,122`. FIXED 2026-08-27 (staged; device test: flip Density to Compact/Spacious and open each of the seven modals): all seven now `makeStyles(colors, tokens)` with `scale()` font sizes + pad/gap/radius tokens; inline `flex: 1` views → `rowTextWrap` style key (profileStyles + AutoBackupModal).
- [x] **Hardcoded overlay colors + dead hex fallbacks.** `rgba(0,0,0,0.x)` scrims in ~30 files (new: `GlobalSearchModal:537`, `MerchantRulesModal:746`, `MonthBalancePromptModal:221`, `OnboardingGuideModal:214`, `PersonReportModal:250`, `ManagePeopleModal:289`, `PurchasePlanList:356`, `Spotlight:372`, `profileStyles:323/366/411`). Dead fallbacks: `DebtCard.tsx:296-298,364-367` `colors.danger || "#ff5252"`, `AddDebtModal.tsx:650`, `profileStyles.ts:211`, `ChartsScreen.tsx:3249`, `AchievementsScreen.tsx:415,517`. Fix: add `overlay`/`overlayStrong` to `ThemeColors`; delete the `||`/`??` fallbacks. FIXED 2026-08-27 (staged; device test: open a bottom sheet + a centered dialog on a light theme, look unchanged): `ThemeColors.overlay` (0.75, dialogs/celebrations) + `overlayStrong` (0.85, sheets/pickers) on all 16 presets; 37 scrims across 33 files now read them (profileStyles/OptionPickerModal factories take colors); AttachmentViewerModal's 0.96 photo backdrop kept with a "deliberately" comment; all 6 `||`/`??` hex fallbacks deleted.
- [x] **Missing `BudgetArk - <Name>` header comment** (21 files): `onboarding/Spotlight.tsx`, `screens/BudgetScreen.tsx`, `screens/BridgeScreen.tsx`, `components/{KeyboardAwareModalOverlay,BudgetBucketCard,NetWorthHistoryCard,NetWorthHistogram,MonthlyReviewModal,BillCalendarModal,DebtDuePaymentPromptModal,DebtDueReminderBanner,DebtDueReminderHost,DebtPaymentCelebrationModal,DebtPayoffCelebrationModal,DueDateReminderBanner,QuickAddLinkHost,TrackingReminderHost,SparklineChart,SynthwaveGrid,ForestBackground,ConfettiBurst}.tsx`. FIXED 2026-08-27 (staged): all 21 files now open with a why-this-exists header.
- [x] **Chip grids re-render on every keystroke.** `TaxCalculatorCard.tsx:196-210, 342-361` (51 state chips x2), `ChartsScreen.tsx:2337-2389` (`EXCHANGE_CURRENCIES` x2), `MerchantRulesModal.tsx:196-424` inline `renderRule` with 8-value `extraData`. Fix: memoized `StateChipGrid`/`CurrencyChipGrid` + `React.memo` `MerchantRuleRow`. FIXED 2026-08-27 (staged; device test: type in the tax salary field and the converter amount - chips must still select; rename a merchant rule with several rules listed): new memoized `components/CodeChipGrid.tsx` (per-chip memo on `active`) used by both TaxCalculator state grids and both converter currency grids; `MerchantRuleRow` React.memo with a string `meta` prop - collapsed rows get `children: null` so they skip on keystrokes.
- [x] **`useSliderValueEditor` memoization is void.** `src/hooks/useSliderValueEditor.ts:113-145` keys callbacks on `[fields]` but all callers (`ChartsScreen.tsx:347,363,387`) pass a fresh object literal per render. Hold `fields` in a ref, or `useMemo` the configs. FIXED 2026-08-27 (staged): the hook holds `fields` in a ref refreshed in an effect; all four handlers are now stable (`commitEditing` keys only on `editingText`).
- [x] **`Dimensions.get("window")` in render.** `Spotlight.tsx:146`, `AttachmentViewerModal.tsx:103` -> use `useWindowDimensions` so rotation/split-screen re-places the tooltip. FIXED 2026-08-27 (staged; device test: rotate while the photo viewer / a coachmark is open): both use `useWindowDimensions`.

### Tier 3 - Maintainability / duplication

- [x] **Emergency-fund goal derivation duplicated.** `BudgetScreen.tsx:586-634` and `BridgeScreen.tsx:420-451` (~35 identical lines, "kept in sync by hand" comment). Extract `resolveEmergencyFundGoal({ savingsGoals, assetAccounts, keelTarget, savingsReserve })` into `utils/emergencyFund.ts` + test; both screens `useMemo` it. FIXED 2026-08-27 (staged; device test: EF card on Budget + Bridge shows the same numbers as before, linked and unlinked): `utils/emergencyFund.resolveEmergencyFundGoal` + `sumSavingsReserve` (DebtTracker uses it too), 6 new tests.
- [x] **Five money parsers with divergent comma semantics.** `GlobalSearchModal.tsx:74` ("1,5" = 15), `MonthBalancePromptModal.tsx:63` ("1,5" = 1.5), `PurchasePlanList.tsx:54` ("1,000" = 1), `TaxCalculatorCard.tsx:42`, `utils/exchangeCalculator.ts:50`. One `utils/parseMoneyInput.ts` (`number | null`, documented locale rule, tests). FIXED 2026-08-27 (staged; device test: type "1,5" / "1,234.56" / "$12" in search min, balance prompt, plan contribution, tax salary, converter): `utils/parseMoneyInput.ts` (documented rule, `number | null`, negative opt-in, clamp) backs all five; `exchangeCalculator.parseAmountInput` delegates to it.
- [x] **Bottom-sheet skeleton copy-pasted in 10 files.** `overlay/modalSheet/scrollArea/scrollContent/title/subtitle/buttonRow/doneButton` (~110 style lines) + the Android `insets.bottom` footer (14 copies): `GlobalSearchModal`, `OnboardingGuideModal`, `ManagePeopleModal`, `PersonReportModal`, `ManageBusinessesModal`, `ManageCategoriesModal`, `BusinessReportModal`, `AddDebtModal`, `AddConnectionModal`, `ReviewInboxModal`. Extract `components/SheetModal.tsx` + `makeSheetStyles(colors, tokens)`; migrate the four newest first. (Also fixes the density-token item above.) FIXED 2026-08-27 (staged; device test: open Search, Onboarding guide, People, Businesses, Person report - sheet corners/footer/keyboard unchanged): `components/SheetModal.tsx` (+ `useSheetStyles`) owns scrim/sheet/scroll/footer + the Android inset fix; the five newest sheets migrated (ManageBusinesses also picked up its twin's density tokens). Still on the old skeleton: ManageCategories, BusinessReport, AddDebt, AddConnection, ReviewInbox (FlatList) - migrate with `scroll={false}` when touched.
- [x] **Business/person pill picker duplicated 3x.** `MerchantRulesModal.tsx:276-401`, `ReviewInboxModal.tsx:372-495` (~120 lines each), `ConnectionsModal.tsx:423-462`. Extract `TagPillPicker`. FIXED 2026-08-28 (staged; device test: assign a business/person in the Review Inbox + Merchant Rules, and "Whose card is this?" in Connections; delete a person and confirm the "(deleted person)" pill still shows/clears): `components/TagPillPicker.tsx` (none pill, options, orphaned "(deleted ...)" pill, ellipsis rule) replaces all three copies.
- [x] **"Dismiss, then present after 250 ms" hand-rolled 13x, none cancelled on unmount.** `BudgetScreen.tsx:2285,2290,2296,2316`, `DebtTrackerScreen.tsx:865,871,942,1508,1529,1533,1539,1556,1576`, `DebtDueReminderHost.tsx:149,153,185,191` - while `utils/iosNativeShare.ts:26` `waitForIosModalTeardown` already encodes the rule. Extract `usePresentAfterDismiss()` (cancels on unmount, immediate on Android). FIXED 2026-08-28 (staged; device test: search → edit entry / edit debt / history, due-prompt → celebration → history, calendar → edit): `hooks/usePresentAfterDismiss.ts` (250 ms on iOS, immediate on Android, all pending presents cleared on unmount) replaces the 17 `setTimeout(…, 250)` calls in Budget, DebtTracker and DebtDueReminderHost.
- [x] **Charts "tool" styles copied 3x, slider rows 4x.** `PurchasePlannerCard.tsx:451-675`, `TaxCalculatorCard.tsx:393-599` mirror `ChartsScreen.makeStyles` tool/chip/slider keys; slider row at `ChartsScreen.tsx:1079-1144, 1146-1243, 2479-2516`, `PurchasePlannerCard.tsx:305-347`. Extract `theme/toolStyles.ts` + `SliderRow`. FIXED 2026-08-28 (staged; device test: compound-interest, loan, refi, EF, what-if and purchase-planner sliders - drag, +/- at bounds, tap-to-type, rate presets; tax calculator chips/inputs): `theme/toolStyles.ts` (+`useToolStyles`) replaces the copied header/card/input/chip/slider keys in ChartsScreen, PurchasePlannerCard, TaxCalculatorCard; `components/SliderRow.tsx` replaces all five slider rows (it was five, not four).
- [x] **`getMonthKey` defined 9x.** `BudgetScreen.tsx:186`, `storage/budgetStorage.ts:19`, `utils/budgetInsights.ts:6`, `utils/chartCalculators.ts:331`, `utils/linkedAccountRecurring.ts:7`, `utils/purchasePlanner.ts:22`, `utils/whatIfSpending.ts:27`, `utils/debtFreeCountdown.ts:72`; `utils/debtDueCalendar.ts:29` already exports one. `monthLabel` 2x (`BillCalendarModal:41`, `MonthBalancePromptModal:51`). Move to `utils/budgetMonths.ts` with `getMonthKeyOffset`/`getBudgetMonthKeys` from `BudgetScreen.tsx:186-218`. FIXED 2026-08-27 (staged): `utils/budgetMonths.ts` (getMonthKey/getMonthKeyOffset/getBudgetMonthKeys/getMonthDateFromKey/formatMonthKeyLabel + tests) replaces the 8 local copies, debtDueCalendar's export, both `monthLabel`s and the three `currentMonthKey` variants; `linkedAccountRecurring` keeps its deliberately-UTC copy (documented).
- [x] **ChartsScreen decomposition (3,732 lines; `makeStyles` :2647-3732).** FIXED 2026-08-28 (staged; device test loan/refi, converter, what-if tools) - now 2,189 lines; `LoanCalculatorCard`, `CurrencyExchangeCard`, `WhatIfSpendingCard` own their state/logic/JSX/styles, shared result/breakdown/preset/ratio/refi-summary styles promoted to `theme/toolStyles`, `customCategories` via `useCustomCategories()`. In order: Currency Exchange (state :441-449, logic :997-1064, JSX :2299-2417) -> `CurrencyExchangeCard`; What-If (state :431-436, logic :940-995, JSX :2419-2619) -> `WhatIfSpendingCard`; Loan/mortgage (state :358-379, logic :643-798, JSX :1603-1867) -> `LoanCalculatorCard`. Also: `:436,89,897,915` keeps `customCategories` in local state instead of `useCustomCategories()`.
- [x] **BudgetScreen decomposition (3,432 lines; `makeStyles` :2481-3432).** FIXED 2026-08-28 (staged; device test Spending card expand/select/long-press, Split Food, cash-flow reconciliation line) - now 2,589 lines; `components/SpendingCard` (owns expand/reveal state + donut math), `components/FoodSplitModal` (owns the draft), `cashFlow.computeMonthReconciliationDelta` + 4 tests. Spending card (:1701-~1990) -> `SpendingCard`; food-split modal (:2320-2392) -> `FoodSplitModal`; cash-flow reconciliation math (:546-584) -> pure `computeMonthReconciliation` in `utils/cashFlow.ts` + test.
- [x] **People/businesses have no provider.** `getPeople()/getBusinesses()` read from storage in `BudgetScreen.tsx:401-402` (every focus), `ConnectionsModal.tsx:165`, `AddConnectionModal`, `ManagePeopleModal.tsx:70`, `ManageBusinessesModal`, `PersonReportModal`; `PeopleSection.tsx:121-124` mounts `ManagePeopleModal` without `onChanged`. Add `PeopleProvider` modelled on `CustomCategoriesProvider`. FIXED 2026-08-28 (staged; device test: add/rename/delete a person in Profile, then open Budget's person picker, Connections' "Whose card is this?", Add Connection and the Person report without reopening the app): `people/PeopleProvider.tsx` (`usePeople`/`useBusinesses`, live + tombstoned lists, mutations, refresh on dataChangeNotifier) replaces the seven storage reads; Manage modals lost their `onChanged` prop.
- [x] Honourable mention: the lockout/verify state machine is duplicated between `AppLockGate.tsx:130-186` and `AppLockSetupModal.tsx:99-106,165-205` -> `usePinVerifier(record)`. FIXED 2026-08-28 (staged; device test launch lock + wrong-PIN lockout + Change/Turn Off PIN) - `hooks/usePinVerifier(countdownActive)` owns record/lockout/countdown/error; in-memory fallback now applies the lockout too (`applyFailedAttempt`).

### Tier 4 - Tests

- [x] **Raise the coverage ratchet.** FIXED 2026-08-28 (staged) - thresholds L80/S79/B76/F75 vs measured L81.8/S80.9/B77.8/F76.3; `src/hooks/**` + `src/notifications/**` now collected. `jest.config.js:46-53` is L61/S60/B59/F53 vs measured L70.1/S69.4/B67.2/F61.8 - ~8-9 points slack. Also add `src/hooks/**` (has a test that isn't counted) and `src/notifications/**` to `collectCoverageFrom`.
- [x] **Untested storage/services (4 of 43 storage modules tested).** FIXED 2026-08-28 (staged) - new suites: budgetStorage (extended), tombstones, reviewInboxStorage, connectionSecretsStorage, reviewInboxService, connectionsSyncService, netWorthSnapshotStorage, customCategoriesStorage, monthlyBalanceStorage, attachmentStore, autoBackupStore, trackingReminders + cardKeepAliveReminders (rule-11 guard), releaseNotes (versions descend/unique/match app.json). Ranked: `storage/budgetStorage.ts` (saveBudgetEntries merge-back :151-162, bulk delete/restore :222-268, limit pruning :28-77); `storage/connectionSecretsStorage.ts:64-126` (rule 2 fail-closed - no test asserts `EncryptionUnavailableError` propagates or the provider-mismatch refusal :109); `storage/tombstones.ts` (no test file at all - `mergePreservingTombstones`, `untombstone`, NaN-age guard); `storage/reviewInboxStorage.ts:147-160` `pruneLedger` ("exported for tests", untested) + 500-item cap ordering; `services/connections/reviewInboxService.ts` (401 lines, zero); `services/connections/connectionsSyncService.ts` (382 lines, zero); `storage/netWorthSnapshotStorage.ts:20-84`; `storage/customCategoriesStorage.ts:83-231` `validateName`/`normalizeIcon`; `storage/monthlyBalanceStorage.ts:40-70`; `services/attachments/attachmentStore.ts`, `autoBackup/autoBackupStore.ts`; `notifications/*` (rule 11 has no regression guard on scheduled `content`); `data/releaseNotes.ts` (no test that versions descend/unique/match `app.json`).
- [x] **Thin branches in tested modules.** FIXED 2026-08-28 (staged) - debtStorage.crud, encryptedStorage.multi, importData.merge, spreadsheetImport.rows, spreadsheetExport.csv, diffEngine.collections, recordValidators reject cases, calculations avalanche-vs-snowball + non-zero-interest schedule. See the new findings below. `debtStorage.ts:226-237` `saveDebts` merge, CRUD :246-304, `restorePayment` :523-570, legacy `car_house` split :187-210, payoff-strategy envelope migration :695-726; `encryptedStorage.ts` `multiSet` :720-765 (duplicate-key throw, plaintext fallback :737 that the `EncryptionUnavailableError` docstring implies doesn't exist), `decryptStoredRaw` fail-closed :516-525, `migrateStoredValue` stale-write guard :565-577, `multiRemove` :684-703; `importData.ts:1636-1685` replace-mode `keysToRemove` (past data-loss bug, no test seeds an unrelated key), `:829-846` legacy flat `budgetLimits` wrap (the path every spreadsheet import takes), `:1193-1235` `computeMergedSnapshots`, `:941-1056` `computeMergedCustomCategories`, `importedSingletonWins`; `spreadsheetImport.ts` `rowToBudgetLimit` :540-572, `rowToPayment` :658-684, `rowToSavingsGoal` :686-736 never run, Excel-serial `parseDate` :192-204, 5 MB / 5000-row caps; `spreadsheetExport.ts:837-856` `escapeCsvFormulaCells` (CWE-1236) no `=`/`+`/`-`/`@` fixture, `expandRecurringRows` intervals 3/6/12 + Jan-31 clamp; `diffEngine.ts:541-555` savings goals + asset accounts have no LWW/tombstone test, `categoryBucketOverrides` merge :676-687, `isFirstSync` limits split :195-205; `recordValidators.ts` `isCustomCategoryItem`/`isBudgetLimitItem`/`isPaymentItem`/`sanitizeDebtMilestones` have no reject case; `calculations.ts:53-102` avalanche vs snowball never compared, non-zero interest schedule never run.
- [x] **Pure logic trapped in .tsx (extract + test).** FIXED 2026-08-28 (staged) - utils/expenseCategoryRows, categoryBucketResolve, reviewInboxSections, merchantRuleUpdate, debtTrackerMath (summarizeDebtTotals/computeMilestoneProgress/sortDebtsForPayoff), bridgeMath (trailing cash flow, account changes/breakdown, holdings categories, formatNextQuoteRefresh - both purity disables gone); summarizePreviousMonthNet landed earlier as cashFlow.computeMonthReconciliationDelta. Device test: Budget Spending rows, Debts milestones/ordering, Bridge cards. `BudgetScreen.tsx:745-846` -> `buildExpenseCategoryRows` (debt-min-topup rows); `DebtTrackerScreen.tsx:559-668` -> `computeMilestoneProgress` (`hull` with `nonMortgageOriginal = 0` -> NaN), `:514-548` -> `summarizeDebtTotals` (not memoized, `overallPercent` NaN), `:1137-1148 + :162-175` -> `sortDebtsForPayoff`; `BudgetScreen.tsx:554-583` -> `summarizePreviousMonthNet`, `:689-728` -> `resolveCategoryBuckets`; `BridgeScreen.tsx:684-704` -> `buildTrailingCashFlow` (January year boundary), `:467-482` `buildAccountChanges`, `:638-670` `buildAccountBreakdown`, `:554-567` `buildHoldingsCategoryData`, `:579-600` `formatNextQuoteRefresh` (the two `react-hooks/purity` disables live here); `ReviewInboxModal.tsx:142-179` -> `buildInboxSections` (duplicate+transfer item must appear once); `MerchantRulesModal.tsx:124-140` -> `buildMerchantRuleUpdate` (`undefined` preserve vs `null` clear).
- [x] **`as any` fixture factories hide type drift.** FIXED 2026-08-28 (staged) - `src/__tests__/fixtures.ts` typed builders; 13 suites migrated; remaining `as any` are deliberate malformed-input probes. `debtPaymentPlan.test.ts:6,15`, `diffEngine.test.ts:113-164`, `annualReport`, `billCalendar`, `cardKeepAlive`, `cardKeepAlivePlanner`, `debtDueCalendar`, `debtPaymentDedupe`, `linkedAccountRecurring(Apply)`, `netWorth`, `trackingReminderPlanner`, `achievementDefs`; `exportData.test.ts:19-60` untyped literal. `netWorth.test.ts:3` / `achievementDefs.test.ts:11` claim "ts-jest is transpile-only" - but `npm run typecheck` does cover tests. Fix with a shared `src/__tests__/fixtures.ts` (`Partial<T> => T` builders as in `debtStorage.test.ts:40`), which also removes the 8x Debt / 10x BudgetEntry / 5x Payment duplicated builders.
- [x] **Test smells.** FIXED 2026-08-28 (staged) - budgetMonths oracle + fake timers in budgetInsights, fake timers for the transport replay window, exportEncryption `__setPbkdf2IterationsForTests` (NODE_ENV=test only; envelope unchanged), per-suite `jest.setTimeout` in pairingService/syncOrchestrator, structural invariants in demoDataStartupSmoke, annualReport year check now asserts a frozen clock. `budgetInsights.test.ts:25` re-implements the private `getMonthKey` as its oracle, `:176` compares two real-clock reads (midnight flake); `annualReport.test.ts:171` tautological year check; `transportService.test.ts:223,229` replay-window test on the real clock (60 s margin); `exportEncryption.test.ts:26` 30 s timeout because `exportEncryption.ts:20` hard-codes 250k PBKDF2 iterations with no injectable override; `jest.config.js:26` global 15 s `testTimeout` instead of per-suite `jest.setTimeout` in the two sync suites. `demoDataStartupSmoke.test.ts:98-105` pins exact counts (40/4/2) to a regenerated artifact.
- [x] **`docs/testing.md` is stale.** FIXED 2026-08-28 (staged) - rewritten with every suite listed by area; jest.config.js scope comment updated. Header (:18-19) lists four test dirs; table omits ~25 suites (`chartCalculators`, `searchFilter`, `taxCalc`, `appLock`, `ingest`, `merchant`, `nativeCrypto`, `encryptedStorage`, `debtStorage`, ...). `jest.config.js:4-5` scope comment likewise predates hooks/services/attachments.

### New findings from the Tier 4 test pass (2026-08-28) - pinned by tests as current behaviour, not yet fixed

- [ ] `encryptedStorage.multiSet` (~:737) falls back to plaintext when no vault key is available and has no `requireEncryption` option, so the `EncryptionUnavailableError` docstring (~:425, "thrown by setItem/multiSet when a caller requires encryption") is wrong. Only non-secret callers today (debtStorage payment paths); fix the docstring or add the option before any secret-bearing caller uses it.
- [ ] `encryptedStorage.multiSet` (~:734-745) awaits `getEncryptionKey()` BEFORE splicing itself into `writeQueues`, so a `setItem` on the same key issued in that window runs first and the earlier-issued `multiSet` lands last (silent overwrite). Fix: claim the queue tail synchronously before the await. No in-app caller hits it today (PaymentHistoryModal serializes).
- [ ] `debtStorage.normalizeDebt` (~:142) keeps `debtClassSource: "manual"` on a record whose class BudgetArk just inferred / split from legacy `car_house` - only an invalid stored source gets rewritten to "inferred".
- [ ] `customCategoriesStorage.validateName`: the built-in-category collision check is case-sensitive while the custom-category check is case-insensitive, so a custom "food" can coexist with built-in "Food".

### Verified clean (for the record)

AsyncStorage imported only by `encryptedStorage.ts`; bank credentials fail closed; V1/V2/V3 golden fixtures intact; full egress list is on the allowlist with minimal payloads; notification bodies are fixed strings; deep link / widget fail-closed; Worker has no key in config and all cost guards present; receipt photos excluded from sync/export/backup and zip deleted in `finally`; `PROTOCOL_VERSION`/HMAC/envelope untouched, July `SyncDiff` additions all optional; every exported key has an importer + validator; `importData` and `diffEngine` tie-break consistently; deep-link modals all use `runAfterInteractions` with cancel; Spotlight/AppLockGate/PersonReportModal cleanup correct. Rejected on verification: "`demoDataStartupSmoke` goes red 2026-09-01" - the test regenerates the fixture at run time (:59).

---

## Done

Fully-completed sections moved here from above. The app-store deployment sections (Pre-Launch, Apple App Store Submission, Google Play Submission) are intentionally left in place even where complete.

### Phase 1 - Budget Screen

- [x] Design data model for income/expense entries (category, amount, date, type)
- [x] Create `budgetStorage.ts` following the same AsyncStorage pattern as `debtStorage.ts`
- [x] Add new types to `src/types/index.ts` (e.g., `BudgetEntry`, `BudgetCategory`)
- [x] Implement income & expense entry form (modal, similar to `AddDebtModal`)
- [x] Implement category list with monthly totals
- [x] Add budget limit per category with warning when approaching limit
- [x] Add pie/donut chart breakdown using Victory Native (already installed)
- [x] Add spending alert logic (warning color when >80% of limit reached)

### Phase 2 - Investment Screen

- [x] Design UI for contribution calculator (inputs: monthly amount, annual return %, years)
- [x] Wire up `calcInvestmentGrowth()` from `src/utils/calculations.ts` (already implemented)
- [x] Add interactive sliders for "what if" exploration
- [x] Add a line chart showing growth over time (SVG area chart)
- [x] Show contribution vs. interest earned breakdown
- [x] Add timeline presets (10yr, 20yr, 30yr buttons)

### Code Quality & Crash Prevention

#### High Priority
- [x] Fix race condition in `recordPayment()` - `src/storage/debtStorage.ts:162-177`. The `balance: undefined as any` workaround means if `updateDebt` fails after payment is written, the payment is saved but debt balance never updates. Add atomic/transactional storage operations.
- [x] Wrap `Promise.all()` in try-catch in `DebtTrackerScreen.tsx:181-205` - was already wrapped in try-catch with fallback to empty state. Verified correct.
- [x] Fix division by zero in `DebtTrackerScreen.tsx:339` - was already guarded with `nonMortgageOriginal > 0` ternary. Verified correct.
- [x] Use `Number.isFinite()` for all parsed numeric inputs in `AddDebtModal.tsx:229-231` - `parseFloat(x) > 0` doesn't catch `Infinity` edge cases.
- [x] Make decryption failures distinguishable from missing data in `encryptedStorage.ts:195-211` - now throws `DecryptionError` instead of returning `null`, so callers can distinguish corruption from missing data.
- [x] Remove `as any` casts and replace with proper type guards - `debtStorage.ts:175`, `App.tsx:99-100`, `ProfileScreen.tsx:213-214`, plus `ProfileScreen.tsx:445`.

#### Medium Priority
- [x] Fix stale closure in `useCallback` - `DebtTrackerScreen.tsx:160-178`. `primeMilestonesModal` captures `targetDraftByStep` but may not properly list it in dependencies.
- [x] Add cleanup functions to async `useEffect` hooks - `ProfileScreen.tsx:154-167`. If component unmounts mid-load, state updates on unmounted components cause warnings/crashes.
- [x] Fix memory leak in AppState listener - `encryptedStorage.ts:69-73`. `AppState.addEventListener` at module scope with no removal; listeners accumulate during hot-reload.
- [x] Fix concurrent budget entry write race condition - `BudgetScreen.tsx:316-344`. `saveBudgetEntries()` is async inside a sync `setState` callback. Rapid edits can cause storage to lag behind state, leading to data loss on restart.
- [x] Add upper bound validation on import numeric values - `importData.ts:161-168`. `monthlyLimit` validated only as `> 0.01` with no ceiling. A malformed import could inject absurd values.
- [x] Handle chart empty state gracefully - `InvestmentScreen.tsx:68`. Chart returns `null` for < 2 data points, which could cause layout shift.
- [x] Add safeguard for simulation loop - `calculations.ts:128-195`. Already guarded: line 185 exits early when balance isn't decreasing (`afterBalance >= beforeBalance - 0.000001`), plus hard cap at 600 iterations and input sanitization. No additional fix needed.

#### Low Priority
- [x] Improve navigation error logging - `App.tsx:242-244`. Added try-catch around `navigate()` calls and `__DEV__` warnings when navigation isn't ready.
- [x] Fix FlatList `keyExtractor` - `BudgetScreen.tsx:672`. Verified safe: `expenseRows` derives from a `Set<BudgetCategory>`, so `item.category` is guaranteed unique. No change needed.
- [x] Reduce excessive local state in `DebtTrackerScreen.tsx:115-152` - Evaluated: `useReducer` would not reduce re-renders (React re-renders the full component on any state change regardless). The main stale-closure risk was already fixed in medium priority. Not worth the refactor risk.
- [x] Fix missing `useCallback` dependency in `InvestmentScreen.tsx:188-191` - Verified correct: `handleSliderChange` and `adjust` only use stable `useState` setters and module-level constants (`SLIDERS`). Empty dependency arrays are appropriate.
- [x] Add negative value validation for savings goals - `SmartPlanModal.tsx:597`. Added `Math.max(0, ...)` clamp so negative `currentAmount` from data corruption renders as 0% instead of a negative percentage.

### Nice-to-Have (Post-Launch)

- [x] Payment history screen - the data is already being recorded, just needs a UI
- [x] Edit existing debts (currently debts can only be added or deleted, not edited)
- [x] Debt payoff order strategies (avalanche vs. snowball method)
- [x] Additional themes beyond Forest Gold and Neon Purple (added Slate, Rose, Synthwave)
- [x] Localization / currency format options beyond USD
- [x] Recurring budget entries
- [x] Due-date reminder banners - shipped as an in-app Budget banner for upcoming recurring bill dates (opens Bill Calendar). Payment-due push notifications deliberately NOT built (banks already send those); push notifications went to expense-tracking check-ins instead - see the tracking check-ins entry above.
- [x] Smarter payoff planner with what-if extra payment comparison(how much interest you will pay or will save from paying early)
- [x] Savings goals and emergency fund Deck tracker
- [x] Persist user-selected payoff strategy across app restarts (no default reset to Custom)
- [x] Build Your Ark planning hub (Hull/Deck/Supplies) integrated with Debt Tracker
- [x] Improve debt milestone modal readability (full-screen layout + larger text + safe-area support)
- [x] Improve theme readability and contrast across The Ark and dark themes (buttons + theme selector cards)
- [x] Monthly review insights (category changes, spending trends, streaks)
- [x] Custom categories and category icon support - v1 (add-only): users add their own categories (name + emoji icon) via Profile → CATEGORIES → Custom Categories. Built-in 21 stay fixed. Custom categories work everywhere built-ins do: entry pickers (Add/Edit modals), Budget category list, donut chart (deterministic name-hashed color), monthly limits, insights/streaks, Annual Report. New `customCategoriesStorage.ts` (EncryptedStorage, validated/sanitized names, dup-checked vs built-in+custom, cap 30) + `CustomCategoriesProvider` + `categoryIcons.ts` (emoji map for all 21 built-ins + curated picker grid + resolver). `BudgetEntry.category`/`CategoryBudgetLimit.category` widened to `CategoryName` (built-in autocomplete preserved). OTA-safe - emoji only, no native deps. Typecheck clean. Import/export round-trips custom categories: JSON export carries a `customCategories` collection; the shared record validator (`recordValidators.isValidImportCategory`, also on the LAN-sync path) accepts safe custom names (sanitized, ≤24 chars) instead of rejecting them; importData merges the explicit collection (LWW-by-id, name-deduped, built-in shadow dropped) AND derives definitions from any referenced-but-undefined custom names so pre-feature/foreign backups and sync-relayed entries stay usable (derived ones get the default icon). Spreadsheet import uses the same gate (`normalizeImportCategory`). Replace-mode intentionally does NOT wipe local custom categories when the import carries none, to avoid losing definitions still referenced by imported entries. Known limitation: deleting a custom category leaves tagged entries on the name with the default icon; spreadsheet export has no dedicated icon sheet (names survive via derivation, icon resets to default on round-trip).
- [x] Undo actions and bulk edit/delete operations - SHIPPED. (1) Global single-slot Undo snackbar (`src/undo/UndoProvider.tsx`, mounted at app root, theme/density/safe-area aware, sits above tab bar via `fabBottomOffset`, 5s auto-dismiss). Storage gained `untombstone()` + restore paths: `restoreDebt`/`restoreBudgetEntry`/`restoreSavingsGoal`/`restoreAssetAccount`, compound `deletePayment`+`restorePayment` (also reverses the debt-balance effect), `restoreCustomCategory` (re-inserts exact object, same id), tombstone-safe `updateBudgetEntry`. Undo wired for deletes AND edits on: debt delete/edit, savings-goal delete, budget-entry delete/edit, asset delete - each undo also unwinds side effects (net-worth snapshot, linked-asset balance deltas, achievement re-check). (2) Bulk multi-select: long-press to enter selection. Budget entries (BudgetScreen) - per-row checkboxes on expanded category entries (auto-debt-payment rows excluded), bottom action bar with Recategorize (category picker) + Delete, single batched Undo via the global snackbar; batch storage helpers `deleteBudgetEntries`/`restoreBudgetEntries`/`setBudgetEntryCategories` (one read/write). Payments (PaymentHistoryModal) - selectable rows, batched Delete with a LOCAL in-modal undo bar (the root snackbar is occluded by the RN Modal); `onPaymentsChanged` bubbles up so DebtTrackerScreen refreshes debts/net-worth/achievements.

  Deliberate exclusion: custom-category delete keeps its existing `Alert.alert` confirm instead of an undo snackbar - it's deleted from inside the Categories RN Modal, which would occlude the root snackbar (the `restoreCustomCategory` path exists for future use / import round-trip). Not yet device-tested - verify on-device: undo timing/occlusion, linked-asset balance math on bulk delete+undo, recategorize undo of a mixed selection (restores each entry's prior category, not one shared one).
- [x] Annual Financial Report - selectable calendar-year summary: total debt paid, total set aside, net worth change, top spending category, months under budget, cash flow + savings rate + monthly spending sparkline. Entry card on Bridge → AnnualReportModal. Shareable as aggregates/percentages-only text (no PII). Image capture deferred to v2 (would need a native view-shot dep + EAS rebuild; kept OTA-safe per request).
- [x] Debt Payoff Celebration Screen - confetti/animation when a debt balance hits $0. Small but emotionally meaningful.
- [x] Trophy Room / Ark Achievements - gamification layer built entirely on existing data. Auto-unlocks retroactively for current users on first open. Shipped as "Ship's Log": 18 badges, retroactive silent first-eval, global unlock celebration modal, Bridge card + Profile → PROGRESS entry. Three badges (Cartographer/export, Crow's Nest/review opens, Lighthouse Keeper/30-day app-open streak) are backed by a new `achievementStatsStorage.ts` counter; Steady Crew + All Sails Set derive from budget limits vs. recurring-aware monthly spend. App-open streak is recorded idempotently per calendar day inside `evaluateAchievements`. OTA-safe - no native deps.

  Purpose: add a dopamine-rich progress surface without changing how data is entered. Every badge is derived from debts, payments, savings goals, budget entries, milestones, and net worth that the app already stores. No new write paths, no behavior shift.

  Visual approach (matches existing emoji-icon style in `AppNavigator.tsx:48`):
  - Each badge = `react-native-svg` medal ring (already a dep) + a centered emoji glyph.
  - Tier rings: Bronze `#A87445` (easy), Silver `#C7CBD1` (sustained), Gold `#E8C66E` (milestone-grade), Legendary gradient (capstones, via `LinearGradient` from `react-native-svg`).
  - Locked state: same ring at 30% opacity, glyph replaced with `🔒` (or grayscale silhouette).
  - Theme-aware: ring stroke reads from `useTheme()` tokens so Forest Gold/Synthwave/Slate each tint differently.
  - Reuse the existing debt-payoff celebration animation when a new badge unlocks.

  v1 badge list (~16-20 - sweet spot before it feels grindy):

  | Achievement | Glyph | Tier | Unlock condition |
  |---|---|---|---|
  | First Steps | ⚓ | Bronze | First debt logged |
  | Patched the Hull | 🔨 | Bronze | First payment recorded |
  | Cartographer | 🗺️ | Bronze | Exported data at least once |
  | Crow's Nest | 🔭 | Bronze | Opened Monthly Review 3 times |
  | Steady Crew | ⚖️ | Silver | 3 consecutive months budget met |
  | Galley Stocked | 🍞 | Silver | Emergency fund hits $1,000 |
  | Half Mast | 🚩 | Silver | 50% of original debt total paid |
  | Sextant Sharp | 🧭 | Silver | First savings goal completed |
  | Lighthouse Keeper | 🗼 | Silver | 30-day app-open streak |
  | First Mate | 🤝 | Silver | Partner sync paired successfully |
  | Treasure Hoard I | 🪙 | Bronze | Net worth crosses $10k |
  | Treasure Hoard II | 💎 | Silver | Net worth crosses $25k |
  | Treasure Hoard III | 👑 | Gold | Net worth crosses $100k |
  | Debt-Free Captain | 🏴‍☠️ | Gold | All non-mortgage debt cleared |
  | Ark Builder | 🛠️ | Gold | Hull/Deck/Supplies milestone completed |
  | All Sails Set | ⛵ | Gold | Every budget category under limit for a month |
  | Doubloon Streak | 🔥 | Gold | 12-month savings streak |
  | Admiral | 👑 | Legendary | All milestones complete |

  Data model:
  - `Achievement` type: `{ id: string, unlockedAt: number, tier: 'bronze' | 'silver' | 'gold' | 'legendary' }`
  - Storage key `@budgetark_achievements` in EncryptedStorage: `{ unlocked: Record<string, number>, version: number }` - `unlocked[id]` is the timestamp.
  - `version` bump invalidates definitions when badge set changes meaningfully.

  Files (proposed):
  - `src/data/achievementDefs.ts` - array of `{ id, glyph, tier, title, description, check: (ctx) => boolean }`. `ctx` is `{ debts, payments, savingsGoals, budgetEntries, milestones, user }`.
  - `src/utils/achievements.ts` - `evaluateAchievements(ctx)` walks defs, returns newly-unlocked IDs since last evaluation. Compares against stored `unlocked` map and persists new ones.
  - `src/storage/achievementsStorage.ts` - CRUD for the unlocked map.
  - `src/components/Medal.tsx` - SVG ring + glyph component. Props: `{ tier, glyph, locked, size }`.
  - `src/screens/AchievementsScreen.tsx` - grid of medals, tap for detail sheet (title, description, unlock date, "How to earn" if locked). Filter chips: All / Earned / Locked.
  - Entry point: card on Bridge ("Ship's Log - 8/18 earned") + button in Profile.
  - Hook into existing celebration component for unlock animation; trigger from a `useEffect` on the screen that just performed the unlocking action (payment recorded, goal completed, etc.).

  Evaluation strategy:
  - Pure derivation from existing storage - never trust user input to "set" an achievement.
  - Run `evaluateAchievements()` lazily: on app foreground, after each major write (payment, goal contribution, debt update), and on Achievements screen mount.
  - Cheap because it's all in-memory loops over already-loaded data. No re-reading storage in the loop.

  Retroactive unlock on first open after update:
  - Existing users immediately get every badge their current data already qualifies for, all timestamped with "now."
  - Pleasant surprise; no migration needed beyond first evaluation.

  Out of scope (v1):
  - XP / rank system (covered separately if added later).
  - Weekly rotating quests.
  - Custom user-defined achievements.
  - Sharing badges as images (revisit if Annual Financial Report ships).

  Upgrade path:
  - v1.5: replace top-tier emoji glyphs (Admiral, Debt-Free Captain) with hand-drawn SVGs from a free set (Lucide/Tabler/Phosphor). Keep emoji for tiers 1-2. No layout change.
  - v2: commissioned art set if traction warrants.

  OTA-eligible: yes. No new deps. Uses `react-native-svg` (already in app) + emoji.
- [x] Category Spending Comparison - "You spent 23% more on Dining Out this month vs your 3-month average." Surface monthly review data more prominently.
- [x] fix theme selection so it doesn't close option window until you hit done
- [x] fix the import data modal to go to the top of the screen so the keyboard doesn't cover the   window
- [x] make the debts found in the debt window reflect on your budget screens as a monthly cost automatically.
- [x] create a history for monthly budgets and allow the budget goal for each line item stay when the next month starts. keep a history of up to 6 months of budgets.
- [x] Import / export Google Sheets and Excel files for budget data (v1: CSV + XLSX, fixed schema; multi-sheet workbook for XLSX, budget-entries-only for CSV; column-mapping UI deferred to v2). See `docs/SPREADSHEET_SCHEMA.md`.
Goal: let users coming from spreadsheet-based budgeting (Google Sheets, Excel, Mint/YNAB exports) bring their data into BudgetArk and export back out.

Scope: file-based only. No direct Google Sheets API integration in v1 - users export their sheet to CSV/XLSX and pick the file. Skip OAuth complexity.

Tech stack:
- `xlsx` (SheetJS) - pure JS, reads/writes .xlsx, .xls, .csv. No native deps. Bundles into JS bundle (no new EAS build required).
- Reuse existing deps: `expo-document-picker` (already installed) for file picking, `expo-sharing` + `expo-file-system` for export.
- All processing on-device - keeps offline-first/no-data-leaves-device promise intact.

Data flow (import):
1. User taps "Import Spreadsheet" in Profile or Budget screen.
2. `expo-document-picker` opens with `type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv']`.
3. Read file with `expo-file-system`, parse with `XLSX.read()`.
4. Show sheet picker if workbook has multiple sheets.
5. Show preview of first 5-10 rows.
6. Column mapping UI - match each spreadsheet column to a BudgetArk field (Date, Amount, Category, Description, Type[income/expense]). Auto-suggest based on header names ("date" → Date, "amount"/"$" → Amount, etc.).
7. Parse + validate each row: date formats (MM/DD/YYYY, DD/MM/YYYY, ISO, Excel serial), amount formats ($, commas, parens for negatives, minus signs), required fields.
8. Show import summary (X rows ready, Y rows skipped with reasons).
9. User confirms - write to budget storage using the existing transactional pattern from `importData.ts`.
10. Apply same bounds/validation as JSON import (`MAX_MONEY`, character limits, etc.).

Data flow (export):
1. User taps "Export to Spreadsheet" in Profile.
2. Pick format: .xlsx (recommended) or .csv.
3. Generate workbook with sheets: `Budget Entries`, `Debts`, `Payments`, `Savings Goals`.
4. Standard column headers so re-import is round-trip safe.
5. `XLSX.write()` to base64, save with `expo-file-system`, share with `expo-sharing`.
6. Add same encryption/confirmation prompt logic as existing JSON export (sensitive data warning).

Column mapping UX (the hard part):
- Header auto-detection: fuzzy match on common labels ("date"/"transaction date"/"posted", "amount"/"debit"/"credit"/"$", "category"/"type", "description"/"merchant"/"memo").
- Manual override: dropdown per column to pick BudgetArk field, or "Skip column".
- Sign convention: let user pick "Positive = expense" vs "Negative = expense" since banks/templates differ.
- Save mapping presets per filename pattern for repeat imports.

File structure (new):
- `src/utils/spreadsheetImport.ts` - parse, map, validate
- `src/utils/spreadsheetExport.ts` - generate workbook
- `src/screens/ImportSpreadsheetScreen.tsx` - file pick → preview → mapping → confirm flow
- `src/components/ColumnMapper.tsx` - mapping UI

Validation / safety:
- Same `MAX_RAW_CHARS` (500KB) cap as JSON import to avoid OOM on low-end devices.
- Wrap all `XLSX.read()` calls in try-catch - malformed files must not crash app.
- Reject files >5MB on disk before parsing.
- Treat all imported strings as untrusted - apply existing control-char/null-byte sanitization.

Recommended first version:
1. CSV-only import to ship fast. CSV covers Google Sheets exports + most bank exports.
2. Fixed column mapping (no UI mapper) - require users to rename headers to a documented schema. Ugly but fast.
3. Export to CSV only.
4. Iterate to .xlsx + auto-mapping UI in v2.

Out of scope (v1):
- Direct Google Sheets API / OAuth (revisit if user demand justifies overhead).
- Real-time sync.
- Formulas - read computed values only, never re-evaluate.

OTA-shippable: yes. No native modules added, all deps already in current EAS build.
- [x] Add original debt milestone program with progress tracking and actionable next steps
Possible feature design (v1):
- Feature name
  - Debt Milestones (safe, generic, clear)
- Entry point
  - New card on Debt Tracker: Your Milestone Plan
  - Tap opens a dedicated screen with step list + progress
- Example milestone structure (original wording)
  1. Build a Starter Cushion (e.g. $1,000 emergency cash)
  2. Clear Non-Mortgage Debt
  3. Build Core Emergency Fund (3-6 months)
  4. Increase Retirement Contributions
  5. Optional: Education/Long-Term Goals
  6. Mortgage Paydown (if applicable)
  7. Wealth Building targets
- Screen layout
  - Top: overall progress bar (2/7 completed)
  - Middle: milestone cards
    - title
    - status (Not started / In progress / Complete)
    - progress metric (percent or amount)
    - next action button
  - Bottom: “Why this step matters” short explanation
- Data model (simple)
  - MilestonePlan
    - currentStep
    - completedSteps[]
    - per-step target config (amount/months)
  - Persist in AsyncStorage like other modules
- Automation hooks
  - Use existing debt totals and budget data to auto-calc progress:
    - debt paid %
    - savings category totals
    - emergency fund amount
  - Manual override toggle per step for users who want custom flow
- User actions
  - Set target
  - Mark complete
  - Set as current step
  - View recommended action (e.g. “Add $150 this month to emergency fund”)
- Couples support
  - Add “Plan owner” mode: Mine / Partner / Household
  - Reuse your existing debt ownership concepts where possible
- [x] 50/30/20 view on Budget screen - ties directly to Charts Ch 1 Lesson 2. New card on the Budget tab (below the Spending donut) that buckets every spending category into Needs / Wants / Savings and shows actual % vs. target % per bucket as three stacked bars, plus the dollar gap from each target. Helps users see at a glance whether their real month matches the 50/30/20 framework they just read about.

  Bucket mapping:
  - Built-in categories ship with a `defaultBucket: "needs" | "wants" | "savings"` in a new `categoryBuckets.ts` constants map. Sensible defaults: Housing/Utilities/Food/Grocery/Transportation/Healthcare/Insurance/Debt Payments → Needs; Restaurant/Entertainment/Shopping/Travel/Tech/Fitness → Wants; Savings/Investing/Retirement/Giving → Savings. Income categories (Salary, Freelance) feed the denominator (after-tax take-home) and aren't bucketed.
  - Custom categories prompt for a bucket on creation. Stored alongside the existing CustomCategory fields.
  - Per-category override per user, since edges are opinionated (e.g. "Tech" might be a need for a freelance dev, a want for someone else). Stored under a new `@budgetark_category_bucket_overrides` key as `Record<CategoryName, BudgetBucket>`. Reads merge built-in defaults + custom-category bucket + override (override wins).
  - Surface the override UX as a long-press on a row inside the 50/30/20 card, OR as a small "Reassign" gear next to each row that opens a 3-option sheet.

  Card content:
  - Header row: "50/30/20" + "Take-home this month: $X,XXX" (sum of all income entries for the month).
  - Three rows, one per bucket. Each row: bucket name, target % chip, actual % big number, actual $ small, progress bar showing actual fill against target. Bar color uses the existing accent / success / warning palette (under target = success, near target = accent, over target = warning).
  - Below the bars: tiny stats line "$X under target on Needs", "$Y over target on Wants", etc. so the gap is concrete dollars not just percentages.
  - Tap a bucket row to expand a list of the categories inside it with their individual contributions. Long-press a category row to override its bucket.

  Edge cases:
  - Months with $0 income: card shows "Add income to see the 50/30/20 split" empty state.
  - Months with $0 spending in a bucket: 0% rendered cleanly, not as NaN.
  - Recurring entries respected via `isEntryActiveInMonth` so the math matches the Spending donut.
  - Debt Payments default to Needs (the minimum is a need); extra payments above minimum technically belong in Savings, but the app doesn't yet track minimum-vs-extra inside a payment entry. v1 keeps Debt Payments as Needs and accepts the slight overcount.

  Files (proposed):
  - `src/data/categoryBuckets.ts` - defaultBucket per built-in category, BudgetBucket type, label/color metadata.
  - `src/storage/categoryBucketOverridesStorage.ts` - CRUD for the override map.
  - `src/components/BudgetBucketCard.tsx` - the card UI.
  - `src/utils/budgetBucketMath.ts` - pure helpers (totalsByBucket, targetForBucket, varianceForBucket).
  - `src/screens/BudgetScreen.tsx` - mount the card; wire the long-press override.

  OTA-eligible: yes. No new native deps. Theme + density aware via existing tokens.
- [x] Refinance break-even calculator - on Utilities. Inputs: current loan balance/rate/term based on what is listed in the debt tracker, new rate/term/closing costs. Outputs: monthly payment delta, total interest delta, months to break even. Pure math, no new deps. Shipped as a collapsible card on `UtilitiesScreen` between Loan/Mortgage and Emergency Fund. The current-loan side is a multi-select list of debts from the tracker - combined balance and balance-weighted average APR derive automatically (read-only); years-remaining auto-fills from a balance-weighted average of each selected debt's `goalDate` when every selected debt has one, and stays user-editable. New loan side: rate, term, closing costs. Math reuses `calcPaymentForGoalDate` + `generatePayoffSchedule` from `utils/calculations.ts`. Shows break-even in months (or "no break-even" when the new payment isn't lower), monthly payment delta, lifetime interest delta, net savings over the new term, and a warning when the new term extends past the current loan's remaining term. Supports the consolidation-refi case (pick multiple debts; rate is weighted by balance). Empty state when no debts exist.
- [x] Push notifications: expense-tracking check-ins (requires `expo-notifications`) - SHIPPED app-side (2026-07-12). Decision: payment-due push notifications were explicitly REJECTED - banks already remind users about bills, and the in-app due banners cover it. Instead, notifications are habit nudges: "you haven't logged your spending in a while - check in." Local notifications only, planned on-device from the user's own entry history. No push token, no server, nothing leaves the device.

  How it behaves - two reminder kinds, each behind its own toggle:
  - **Quiet-spell check-ins**: anchored `cadenceDays` after the user's most recent budget entry (newest `createdAt`; `updatedAt` ignored so sync merges don't count as tracking). The schedule is recomputed on every app open and background transition, so logging an entry silently pushes every pending nudge out a full cadence - active trackers never hear from it, lapsed users get nudged at their cadence until they log again. Already-overdue users (last entry older than the cadence) get nudged at the next occurrence of their chosen hour, not a full cadence later.
  - **Month-start planning**: on the 1st of each month at the chosen hour - "Set this month's budget goals and review how last month went." Points users at the budget-limit setup + Monthly Review that already exist on the Budget tab. Copy rotates by month. A check-in landing on the same day as a month-start nudge is dropped so the user never gets two notifications in one day.
  - Rotating, deliberately content-free copy (no amounts, no account names - lock-screen safe), lightly Ark-themed ("Keep your Ark on course - jot down any expenses from the last few days."). Rotation is deterministic by calendar day/month so replans don't reshuffle messages.
  - Tap (warm or cold-start) opens the Budget tab.

  What shipped:
  - `expo-notifications@~57.0.3` (config plugin in `app.json`). NOT OTA-eligible - rides the same pending EAS build as Teller/expo-iap on this branch.
  - `src/utils/trackingReminderPlanner.ts` - pure, unit-tested planner (20 tests): anchor math, overdue roll-forward, month-start scheduling + same-day dedupe, 30-day window, 32-notification cap (iOS keeps 64 pending), deterministic identifiers (`budgetark-checkin-YYYY-MM-DD`, `budgetark-monthstart-YYYY-MM`) so replans are idempotent.
  - `src/notifications/trackingReminders.ts` - scheduler: Android channel ("Expense check-ins"), permission flow, idempotent cancel-ours-then-reschedule (`data.type === "tracking-reminder"` marks ours). Foreground handler suppresses banners while the app is open.
  - `src/components/TrackingReminderHost.tsx` - app-root host: reschedules on launch (deferred past first paint) + on background; routes taps to Budget.
  - Settings: Profile → Tracking Reminders row → bottom sheet (`TrackingRemindersModal.tsx`). Master toggle (OFF by default - strictly opt-in; enabling runs the permission request, denial deep-links to OS Settings), per-kind toggles (logging check-ins / month-start planning, both default ON under the master), cadence (daily / every 3 days / weekly), time of day (morning / afternoon / evening, shared by both kinds). Stored in `trackingReminderSettingsStorage.ts` (EncryptedStorage, per-device, deliberately NOT synced to partner).
  - Reset All Data wipes the settings key (in `RESET_KEYS`) and cancels all pending scheduled check-ins immediately.

  Still TODO before release:
  - Device-test on iOS + Android 13+ (permission prompt, channel, lock-screen presentation, tap routing, reschedule-on-background actually pushing nudges out after logging an entry) once the new EAS build exists.
  - Optional polish: dedicated monochrome Android notification icon via the `expo-notifications` plugin options (currently default).
  - Release-notes entry: DONE (in-app 1.9.0 notes + RELEASE_NOTES.md). Version bump still due when the EAS build that carries this is cut.
  - v2 ideas: streak-aware copy ("day 12 of your streak - keep it alive"), a "weekly recap" variant, snooze action button on the notification, month-start tap deep-linking straight to the Monthly Review sheet instead of the Budget tab.
- [x] Search and advanced filters across debts, payments, and budget entries - SHIPPED app-side (2026-07-20). OTA-eligible (pure JS, no storage, no network). Device testing pending.

  What shipped:
  - `src/utils/searchFilter.ts` (pure, 24 tests): tokenized AND matching over debts (name/owner/class labels), payments (parent debt name; orphaned payments label "(deleted debt)" and stay findable), entries (description/category/merchant); amounts + YYYY-MM-DD dates in every haystack. Filters: scope, date presets (30d/90d/this-year vs injected `now`), entry type, category multi-select, amount range. Deliberate + test-pinned: entry-only filters narrow to entries; a date range hides standing debts (their payments still surface); date-sorted not relevance-ranked; 50-per-group cap with pre-cap totals; tombstones excluded; unparseable dates fail closed under a date filter.
  - `src/components/GlobalSearchModal.tsx`: slide-up sheet (OnboardingGuideModal skeleton), sanitized auto-focus query, collapsible filter panel (active-count badge, Reset, scope switches clear filters the new scope can't use), grouped results with icons + locale-formatted amounts/dates, honest "debts hidden by filters"/truncation notes. Host stamps `now` at open (render purity) and owns result-tap behavior.
  - Hosts: 🔍 in both title sections (DebtTracker right corner; Budget left, sliding beside the Review Inbox icon when present). Same-tab result taps use the dismiss-then-present-after-250ms rule (debt → AddDebtModal edit, payment → PaymentHistoryModal, entry → BudgetEntryModal). Cross-tab via two new app-internal route params consumed with the deferred InteractionManager pattern: `Budget.searchEntryId` (waits for `isLoaded`) and `DebtTracker.openHistory`. Neither reachable from external deep links.

  Still TODO:
  - Device-test both entry points: keyboard behavior with the sheet, chip wrapping at large text sizes, cross-tab hops (search on Debts → entry edit on Budget and vice versa), dismiss-then-present timing on iOS.
  - Optional fast-follows: a FEATURE_SPOTLIGHTS debut slide (skipped for now - carousel already long, and the 🔍 icon is always visible on two tabs), an onboarding-guide step ("search" keyword), owner filter for debts inside the sheet, and a Bridge entry point.
- [x] Currency exchange calculator (Utilities tab) - SHIPPED (2026-07-20) as a collapsible "Currency Exchange" tool on the Charts tab, after the Emergency Fund calculator. OTA-eligible (pure JS).

  Decisions that were open:
  - **Rate source: on-demand API** via the already-allowlisted open.er-api.com provider (same one the currency switch uses), NOT a build-time snapshot - but through a new `getConverterRates()` in `exchangeRates.ts` with its OWN cache key (`@budgetark_fx_converter_rates`). The existing cache is the deliberately PINNED display snapshot that must only move when the user changes currency; sharing it would let a converter refresh silently re-pin converted balances. Fallback ladder: fresh converter cache (12h TTL) → live → stale converter cache → pinned snapshot → static table, so it always answers offline.
  - **"Rates last updated": yes** - a freshness line ("Rates updated 3 hours ago", or honest "built-in approximate rates" wording on the static fallback) plus a manual "Refresh rates" action. Stamped when the snapshot lands, not in render (react-hooks/purity).
  - Currencies offered = the app's supported set (derived from `CURRENCY_PREFERENCE_OPTIONS`, currently USD/EUR/GBP/CAD/JPY/SEK); From defaults to the user's display currency. Picking the opposite side's currency swaps the pair instead of allowing a same-to-same conversion. Result is formatted in the target currency's own locale (`formatAmountInCurrency` - `useCurrency()` can only format the preference currency); conversion math reuses `convertAmount`.
  - Pure helpers + tests in `src/utils/exchangeCalculator.ts` (amount parsing incl. comma-decimal input, cross-rate, freshness label); converter-cache isolation pinned by tests in `exchangeRates.test.ts`. On-card privacy note: only the request for the public rate table leaves the phone, never amounts. No feature-spotlight slide (minor tool; carousel already at 9 slides) - covered by release notes + the onboarding guide's calculators step.
- [x] Debt-Free Countdown Timer - SHIPPED (2026-07-20). Card on the Debt Tracker between the summary and the due-reminder banner: years/months/days boxes to the projected debt-free date, projected month, and the pace used. OTA-eligible (pure JS, no storage, no network).

  How "current payment velocity" was defined: average monthly payment total over the last 6 COMPLETE calendar months, denominator anchored at the first-ever payment month (mirrors `calcAvgMonthlyExpenses`'s tracked-month rule); the current partial month joins the sample only once it has payments, so logging a payment moves the countdown immediately. No history → sum of minimums, labeled. Projection reuses `simulatePayoffPlan` with extra = max(0, velocity − Σ minimums); a below-minimums pace simulates at minimums with an explicit caveat (the engine can't model shorting minimums). ALL debt classes count including mortgage (it's a debt-free date - deliberately unlike the Hull milestone); custom sort order projects as avalanche. Honest states: celebration at all-zero balances, "no payoff date at the current pace" when interest outruns payments. Pure math + 21 tests in `src/utils/debtFreeCountdown.ts`; `now` stamped at data load (render purity), so "live" = refreshed on every focus and every recorded payment - no ticking timer (day granularity doesn't need one).
- [x] "What If I Stopped Spending on X" Projections - pick a discretionary category and see how redirecting that money to debt or savings changes your timeline.

  Shipped as a Charts-tab tool (2026-07): `src/utils/whatIfSpending.ts` (pure math + tests) and a "What If I Stopped Spending on…" card in ChartsScreen. Category chips show per-category averages from the last 6 tracked months (Debt Payments excluded); a slider sets the redirect amount; the debt side compares payoff timelines via `simulatePayoffPlan` (avalanche/snowball toggle, months sooner + interest saved, handles unsolvable→solvable), and the savings side shows 1/5/10-year growth at an assumed 7% via `calcInvestmentGrowth`. Device testing pending on next build.
- [x] Live Stock Holdings & Quote Feed - let users record share counts per ticker and pull market prices so portfolio value flows into Net Worth.

  Data model:
  - New `Holding` record: `{ id, symbol, shares, costBasis?, accountId? }`. Either nest under existing `AssetAccount` or add a new top-level collection that aggregates into Net Worth the same way Asset Accounts do.
  - Cache last-fetched quote in AsyncStorage: `{ symbol, price, asOf, source }`. Net Worth math reads from cache, never blocks on network.

  Refresh strategy (privacy-friendly default):
  - Auto-refresh once per day on first app open of the calendar day.
  - Manual "Refresh prices" button with 1-hour cooldown. Disabled outside US market hours (9:30am–4:00pm ET, weekdays) with copy "Markets closed - prices update at next open."
  - Manual override on cooldown shows "Last updated 12 min ago" rather than firing the call.
  - Per-day cap means free API tiers are viable. Per-user fetch volume stays under 25 calls/day worst case.

  Provider options (free tiers, no backend needed):
  - Finnhub free: 60 calls/min, single-symbol endpoint. Fine for <10 tickers/user.
  - Twelve Data free: 800 calls/day, batched up to 120 symbols/call. Best fit for this app.
  - Alpha Vantage free: 25/day. Too tight unless one user.
  - Avoid yfinance scraping - breaks unpredictably.

  Cloudflare Worker proxy (optional, only if app scales):
  - Free tier covers ~330 daily-active users at 300 req/user/day. Paid $5/mo covers 33k DAU.
  - Real reason to add it: hide API key, add device-ID-hashed throttle so a tampered client can't burn shared quota.
  - Skip until user count warrants it. Embed key in app to start; daily call cap makes scraping the key low-impact.

  Privacy / UX implications:
  - First feature in the app that sends data off-device. Add a one-time disclosure on Holdings screen: "Symbols you hold are sent to <provider> to fetch prices. Share counts and cost basis stay on your device."
  - Make the whole feature opt-in via a toggle in Profile so users who want pure offline can skip it.
  - Label it "Daily portfolio value" in copy - never claim "live" or "real-time" with delayed-quote providers.
  - Apple/Google may require provider attribution in store listing per data ToS - check before submission.

  Files (proposed):
  - `src/types/index.ts` - add `Holding`, `Quote` types.
  - `src/storage/holdingsStorage.ts` - CRUD via EncryptedStorage, follows existing pattern.
  - `src/services/quotesService.ts` - provider abstraction, throttle, cache TTL, market-hours gate.
  - `src/screens/HoldingsScreen.tsx` or new tab in Asset Accounts - list + add/edit holdings, refresh button.
  - Net Worth aggregator - pull `holdings.reduce((s, h) => s + h.shares * cachedPrice(h.symbol), 0)`.

  OTA-eligible: yes if no new native modules. `fetch` is already available; no SDK changes needed.

  Cost estimate: $0 to launch and likely forever for solo/couple userbase. Realistic ceiling is $35/mo (Cloudflare $5 + Polygon Starter $30) only if the app hits >10k DAU.
- [x] Layout density selector - Compact / Comfortable / Spacious presets that scale spacing, card padding, and font size globally. Plumbing mirrors the existing theme system: `LayoutContext` + `useLayout()` hook returning `{ pad, gap, radius, fontScale }` tokens. Storage key in `userStorage`, selector card in Profile next to the theme picker. Migration is incremental - screens still using hardcoded `padding: 16` keep rendering at the default value, swap to `tokens.pad` over time. OTA-eligible.
- [x] Photo attachments on entries (no OCR) - manual photo per budget entry, stored locally in app sandbox via `expo-file-system`. Browsable "Receipts" gallery filterable by month/category. Ships ahead of full OCR (which stays as separate TODO). New native dep: `expo-image-picker` (already common in Expo apps) - NOT OTA-eligible.

- [x] Charts tab - learning hub - SHIPPED (lessons complete as of v1.8.3, 2026-07-07; affiliate links split out as a remaining Nice-to-Have item above). Utilities tab renamed to "Charts" with the route key deliberately kept as "Utilities" (persisted state + sync depend on it). Landing screen `src/screens/ChartsScreen.tsx`: Captain's Course chapter list with progress, Topics browse chip strip, and every calculator folded into the same tab (Loan/Refi, Emergency Fund, What-If, Purchase Planner, Currency Exchange, ...). Lesson stack shipped as designed: typed-section `Lesson` model bundled in `src/data/lessons/` (indexed via `lessonIndex.ts`, course order in `lessonChapters.ts`), `LessonScreen` + `LessonRenderer` + `LessonCelebrationModal`, per-device `learningProgressStorage.ts` (EncryptedStorage, deliberately NOT synced to partner, in RESET_KEYS, and already carrying the `showAffiliateLinks` + `affiliateDisclosureSeenAt` plumbing for the affiliate follow-up). All 24 lessons across all 5 chapters are written, including named-institution callouts (SoFi, Robinhood, Fidelity, Schwab, Vanguard, local banks/credit unions) as plain not-sponsored editorial mentions and info-only book cards ("Unshakeable"). Resource cards (`src/lessons/ResourceCard.tsx`) render youtube/book/article/tool types; the Amazon CTA stays hidden until the affiliate item lands. Ship's Log lesson badges shipped: 📖 First Voyage, ⭐ Course Plotter, ⚓ Anchored in Knowledge. Not built from the original spec (tracked as remaining items above): Amazon affiliate links + compliance flow, bundled book cover images, the "Recommended for you" personalization card, and the 🦉 Wise Steward badge.

### Themes

- [x] **Deep Sea** - SHIPPED (2026-07-12). Completes the "Deep trilogy" (Space / Forest / Sea) and is the strongest brand fit for Budget*Ark*: abyssal navy-teal background (`deep_sea` in `themes.ts`), dark teal cards, bioluminescent cyan-green accent. Ambient background `DeepSeaBackground.tsx`: light shafts from the surface, seeded plankton motes in cyan/teal/green, abyss vignette - same static-SVG approach as `ForestBackground`/`SpaceBackground`. Defaults to Glass like Deep Space (Profile "theme default" labels cover both). Pure JS/OTA-safe; release-notes entries written. Visual check on device/simulator recommended (palette + background are untestable in Jest).

### Security Hardening - initial pass (moved here 2026-07-20)

#### Critical
- [x] Fix encryption implementation - add HMAC integrity verification to `encryptedStorage.ts` so tampered ciphertexts are detected
- [x] Wrap all unsafe `JSON.parse` calls in try-catch with fallback defaults (`userStorage.ts:83`, `debtStorage.ts:70`, `savingsGoalStorage.ts:8`, `budgetStorage.ts:45`)

#### High
- [x] Encrypt exported data or add confirmation dialog warning about sensitive plaintext in `exportData.ts`
- [x] Add try-catch around `JSON.parse(existingRaw)` in `importData.ts` merge logic to prevent silent data loss
- [x] Clear encryption key from memory (`cachedKey`) when app is backgrounded (`encryptedStorage.ts:22`)

#### Medium
- [x] Gate `console.error` / `console.warn` calls behind `__DEV__` checks in production (`App.tsx`, screens)
- [x] Add input validation against control characters and null bytes on display name and debt name fields
- [x] Audit Android permissions - consider removing `WRITE_EXTERNAL_STORAGE` and `SYSTEM_ALERT_WINDOW` from `AndroidManifest.xml`
- [x] Add `FLAG_SECURE` screenshot/screen recording protection on screens showing financial data
- [x] Add transactional safety (write-to-temp-key, then rename) for import merge operations in `importData.ts`

#### Low
- [x] Replace custom `Math.random()` UUID in `src/utils/uuid.ts` with the `uuid` package (already in `package.json`)
- [x] Add deep link validation if deep link routing is implemented in the future - DONE (2026-07-12) alongside the Quick Entry widget: `src/utils/quickAddLink.ts` validates fail-closed (anchored scheme/host, length cap, no extra path/fragment, category must exactly match a built-in, control chars + bad percent-encoding rejected); unit-tested. Any future deep link route should go through the same build-and-validate-in-one-module pattern.
- [x] Reduce import size limits (`MAX_RAW_CHARS` from 2MB to 500KB) to prevent OOM on low-end devices

#### Info / Optional

- [x] Implement AsyncStorage timeout wrapper
##### 1. Add timeouts to AsyncStorage operations to prevent app hangs on slow I/O
File: `src/storage/encryptedStorage.ts`
Every `getItem`/`setItem` awaits AsyncStorage with no timeout. Degraded flash storage or backed-up I/O queues could hang indefinitely, freezing the app.
- **Option A - Promise.race timeout wrapper:** Create a `withTimeout()` utility wrapping each AsyncStorage call with `Promise.race([operation, rejectAfter5s])`. Apply inside `encryptedStorage.ts` so all callers get it automatically.
- **Option B - Timeout only on raw I/O:** Same concept but wrap only the `AsyncStorage.*` calls, not the crypto operations (which can be slow on low-end devices). More surgical.
- **Option C - Timeout + retry once:** On timeout, retry the operation once before throwing. Handles transient I/O hiccups without surfacing errors on brief blips.
- Recommended: **Option A** - simple, comprehensive, 5-second timeout is generous enough for slow devices.

- [x] Implement fail-closed downgrade guard 
##### 2. Fail-closed policy for version downgrade guard
File: `src/utils/versionGuard.ts`
Currently `isUpdateSafe()` returns `true` (fail-open) when either version is missing. An attacker could strip version metadata from a malicious OTA update to bypass the downgrade guard.
- **Option A - Fail-closed on missing incoming version:** Return `false` if incoming version is undefined (block the update). Keep fail-open if the *current* version is missing (avoids locking out users whose app was installed without version metadata).
- **Option B - Full fail-closed:** Return `false` if either version is missing. Strictest, but risks blocking legitimate updates if Expo metadata has a hiccup.
- **Option C - Fail-closed with user override:** Return `false` by default, but show a modal letting the user choose to install anyway.
- Recommended: **Option A** - blocks the actual attack vector without risking lockout from legitimate updates.

- [x] Implement stale import warning
##### 3. Data expiration warnings for stale imports
Files: `src/utils/importData.ts`, `src/utils/exportData.ts`
Exports already include an `exportedAt` timestamp, but imports don't check it. A user could import a 6-month-old backup and silently overwrite fresher data in merge mode.
- **Option A - Warning in import result:** After successful import, check `exportedAt`; if >30 days old, include a warning message in the result for the UI to display.
- **Option B - Pre-import warning with confirmation:** Before writing data, check `exportedAt` and throw a special error if stale, prompting user confirmation. Blocks stale imports by default.
- **Option C - Non-blocking info banner:** Parse `exportedAt`, return a `staleDays` field alongside import counts. UI shows an info banner but doesn't block the import.
- Recommended: **Option C** - stale imports aren't dangerous (merge deduplicates by ID), so blocking would be frustrating. A simple banner is the right awareness level.

- [x] Implement explicit bounds checks
##### 4. Explicit bounds checks before financial calculations
File: `src/utils/calculations.ts`
Calculation functions accept raw `number` inputs with no upper bounds. JS `Number` loses precision above ~2^53, and `Math.pow()` with extreme inputs returns `Infinity`/`NaN`, which cascades into the UI.
- **Option A - Input clamping at function boundaries:** Add bounds checks at the top of each exported function - clamp `balance` to max $1B, `annualRate` to max 200%, `monthlyPayment` to max $1M, `years` to max 100, `monthlyContribution` to max $1M. Return early with safe defaults (0 or Infinity) if out of range. Matches limits already in `importData.ts`.
- **Option B - Shared validation utility:** Create `validateFinancialInput()` that all functions call; throws descriptive errors for out-of-bounds inputs.
- **Option C - Output validation:** Don't restrict inputs, but check outputs. If any result is `NaN`, `Infinity`, or unexpectedly negative, return a safe fallback.
- Recommended: **Option A** - prevents the issue at the source. Bounds match `importData.ts` limits (`MAX_MONEY: 1_000_000_000`, `MAX_RATE: 200`). Clamping is silent and non-disruptive.

#### v1.4.16 Audit Follow-ups - completed

- [x] Document the no-forward-secrecy model for sync - DONE (2026-07-20, Option A as recommended): trust-model block in the `transportService.ts` file header + new `docs/security.md` ("No forward secrecy - deliberate") covering the PSK model, why retroactive decryption of captured LAN traffic is accepted (compromising the secret means compromising a paired device, which already yields the live data), and the revisit trigger - any off-LAN sync path (relay/cloud) adds forward secrecy in that same protocol rev.
- [x] Pairing listens on `0.0.0.0` - note in security docs - DONE (2026-07-20): documented in `docs/security.md` ("Pairing listens on 0.0.0.0 - deliberate"). The 60s window must accept unknown LAN hosts because mDNS/manual-IP discovery can't pre-bind to a peer; mitigations listed (40-bit code vs 100k-iter PBKDF2, ~30-bit user-confirmed fingerprint, single post-HMAC partner slot, 16 MB pre-auth frame cap) plus an explicit don't-tighten-the-bind warning for future contributors.

### Engineering Health (moved here 2026-07-20)

- [x] **Unit tests (highest leverage item).** Zero test files, no test runner in `package.json`. Four audit rounds each found ~30 bugs, and most live in pure functions that are trivially unit-testable: `tombstones.ts` (mergePreservingTombstones, LWW merge), `recurrence.ts` (isEntryActiveInMonth, month-key math), `calculations.ts` (payoff schedules, interest), the importData merge helpers (snapshots, achievements, dismissals), `recordValidators.ts`, and `cashFlow`-style date bucketing. Plan: wire `jest` + `jest-expo` preset, start with the storage/util pure functions (no component testing needed for v1), run in a pre-commit hook or CI. One afternoon of setup converts every future audit finding into a permanent regression test. OTA-irrelevant (dev-only dep). **DONE (2026-07):** jest + ts-jest wired as `npm test` (pure-logic suites next to the code; see `docs/testing.md`); 1083 tests across 73 suites as of 2026-07-20.
- [x] **ESLint.** No lint config. `eslint-config-expo` + `eslint-plugin-react-hooks` would have mechanically flagged several audit findings (stale closures, missing/incorrect deps arrays). Add `npm run lint` next to the tsc check. Dev-only, OTA-irrelevant. **DONE (2026-07):** eslint + eslint-config-expo wired as `npm run lint`, ratcheted to `--max-warnings 1`.
- [x] **Sync v2 mismatch UX.** A 1.7.2 device syncing with a pre-1.7.2 partner currently sees a generic timeout. Frames carry `v`, so the receiver can detect a `v: 1` frame (and the v1 sender can be detected by its rejected-frame behavior) and surface "Your partner's app needs the update to 1.7.2" instead. Small JS-only change in `transportService.ts`/sync UI; saves confused support emails in the window where one partner has updated and the other hasn't. SHIPPED 1.7.2: `transportService` flags frames that look like sync messages but carry a missing/wrong `v` (a v1 peer's frames have no `v`); `syncOrchestrator`'s error path checks the flag and replaces the generic timeout with "Your partner's device is on an incompatible app version...". Limitation: only detects when the outdated peer sends first - a v1 *server* silently drops our v2 frames (its ciphertext-only HMAC never matches), so that direction still times out generically.
- [x] **Replace crypto-js (deprecated).** Maintainer archived crypto-js in 2023; PBKDF2 at 250k iterations runs in pure JS and is slow on low-end Androids (export/import + pairing). `react-native-quick-crypto` is a pure-RN native module (fits the no-Expo-equivalent preference) and ~50x faster. New native dep → EAS build; bundle with the Sentry build. Migration constraints: legacy v1 (`__BUDGETARK_ENC__`) and v2 (`__BUDGETARK_ENC2__`) backups must still decrypt, encryptedStorage V1/V2 formats must still read, and sync HMAC/AES output must stay byte-compatible with the protocol-v2 envelope (or bump to v3 at the same time). **DONE (2026-07):** `react-native-quick-crypto` replaces crypto-js on the hot paths (V3 storage format; golden fixtures pin V1/V2 byte-compat). Partner sync deliberately stays on crypto-js for cross-device compat.
- [x] **Decide: net-worth snapshot sync.** The one Round 4 finding left open (see Potentialbugs.md). Snapshots don't sync between paired devices - each phone builds its own history. If per-device history is intentional, document it in `netWorthSnapshotStorage.ts` and check the box; if not, it's the same optional-DiffEntry pattern just added for customCategories (union by dayKey, keep newest capturedAt - the merge helper already exists in importData). SHIPPED 1.7.2: decided to sync. `SyncDiff.netWorthSnapshots?` merged by dayKey (strictly-newer capturedAt wins), validated with `isNetWorthSnapshotItem`, counted in sync results. One-time backlog send (`@budgetark_sync_backfill_done_v1`, stamped after first successful sync, in RESET_KEYS) transfers pre-feature history for already-paired couples and also re-sends the full custom-category list (same backlog gap).
- [x] **Captain's Course chapters 3-5.** Listed as "Coming soon" in-app since 1.7.0. Content-only, OTA-eligible. (Tracked here as a release-pressure reminder; authoring details live in the Charts tab section above.) **DONE (v1.8.3, 2026-07-07):** all 24 lessons across all 5 chapters shipped.
