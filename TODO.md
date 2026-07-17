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

### Critical
- [x] Fix encryption implementation - add HMAC integrity verification to `encryptedStorage.ts` so tampered ciphertexts are detected
- [x] Wrap all unsafe `JSON.parse` calls in try-catch with fallback defaults (`userStorage.ts:83`, `debtStorage.ts:70`, `savingsGoalStorage.ts:8`, `budgetStorage.ts:45`)

### High
- [x] Encrypt exported data or add confirmation dialog warning about sensitive plaintext in `exportData.ts`
- [x] Add try-catch around `JSON.parse(existingRaw)` in `importData.ts` merge logic to prevent silent data loss
- [x] Clear encryption key from memory (`cachedKey`) when app is backgrounded (`encryptedStorage.ts:22`)

### Medium
- [x] Gate `console.error` / `console.warn` calls behind `__DEV__` checks in production (`App.tsx`, screens)
- [x] Add input validation against control characters and null bytes on display name and debt name fields
- [x] Audit Android permissions - consider removing `WRITE_EXTERNAL_STORAGE` and `SYSTEM_ALERT_WINDOW` from `AndroidManifest.xml`
- [x] Add `FLAG_SECURE` screenshot/screen recording protection on screens showing financial data
- [x] Add transactional safety (write-to-temp-key, then rename) for import merge operations in `importData.ts`

### Low
- [x] Replace custom `Math.random()` UUID in `src/utils/uuid.ts` with the `uuid` package (already in `package.json`)
- [x] Add deep link validation if deep link routing is implemented in the future - DONE (2026-07-12) alongside the Quick Entry widget: `src/utils/quickAddLink.ts` validates fail-closed (anchored scheme/host, length cap, no extra path/fragment, category must exactly match a built-in, control chars + bad percent-encoding rejected); unit-tested. Any future deep link route should go through the same build-and-validate-in-one-module pattern.
- [x] Reduce import size limits (`MAX_RAW_CHARS` from 2MB to 500KB) to prevent OOM on low-end devices

### Info / Optional

- [x] Implement AsyncStorage timeout wrapper
#### 1. Add timeouts to AsyncStorage operations to prevent app hangs on slow I/O
File: `src/storage/encryptedStorage.ts`
Every `getItem`/`setItem` awaits AsyncStorage with no timeout. Degraded flash storage or backed-up I/O queues could hang indefinitely, freezing the app.
- **Option A - Promise.race timeout wrapper:** Create a `withTimeout()` utility wrapping each AsyncStorage call with `Promise.race([operation, rejectAfter5s])`. Apply inside `encryptedStorage.ts` so all callers get it automatically.
- **Option B - Timeout only on raw I/O:** Same concept but wrap only the `AsyncStorage.*` calls, not the crypto operations (which can be slow on low-end devices). More surgical.
- **Option C - Timeout + retry once:** On timeout, retry the operation once before throwing. Handles transient I/O hiccups without surfacing errors on brief blips.
- Recommended: **Option A** - simple, comprehensive, 5-second timeout is generous enough for slow devices.


- [x] Implement fail-closed downgrade guard 
#### 2. Fail-closed policy for version downgrade guard
File: `src/utils/versionGuard.ts`
Currently `isUpdateSafe()` returns `true` (fail-open) when either version is missing. An attacker could strip version metadata from a malicious OTA update to bypass the downgrade guard.
- **Option A - Fail-closed on missing incoming version:** Return `false` if incoming version is undefined (block the update). Keep fail-open if the *current* version is missing (avoids locking out users whose app was installed without version metadata).
- **Option B - Full fail-closed:** Return `false` if either version is missing. Strictest, but risks blocking legitimate updates if Expo metadata has a hiccup.
- **Option C - Fail-closed with user override:** Return `false` by default, but show a modal letting the user choose to install anyway.
- Recommended: **Option A** - blocks the actual attack vector without risking lockout from legitimate updates.


- [x] Implement stale import warning
#### 3. Data expiration warnings for stale imports
Files: `src/utils/importData.ts`, `src/utils/exportData.ts`
Exports already include an `exportedAt` timestamp, but imports don't check it. A user could import a 6-month-old backup and silently overwrite fresher data in merge mode.
- **Option A - Warning in import result:** After successful import, check `exportedAt`; if >30 days old, include a warning message in the result for the UI to display.
- **Option B - Pre-import warning with confirmation:** Before writing data, check `exportedAt` and throw a special error if stale, prompting user confirmation. Blocks stale imports by default.
- **Option C - Non-blocking info banner:** Parse `exportedAt`, return a `staleDays` field alongside import counts. UI shows an info banner but doesn't block the import.
- Recommended: **Option C** - stale imports aren't dangerous (merge deduplicates by ID), so blocking would be frustrating. A simple banner is the right awareness level.

- [x] Implement explicit bounds checks
#### 4. Explicit bounds checks before financial calculations
File: `src/utils/calculations.ts`
Calculation functions accept raw `number` inputs with no upper bounds. JS `Number` loses precision above ~2^53, and `Math.pow()` with extreme inputs returns `Infinity`/`NaN`, which cascades into the UI.
- **Option A - Input clamping at function boundaries:** Add bounds checks at the top of each exported function - clamp `balance` to max $1B, `annualRate` to max 200%, `monthlyPayment` to max $1M, `years` to max 100, `monthlyContribution` to max $1M. Return early with safe defaults (0 or Infinity) if out of range. Matches limits already in `importData.ts`.
- **Option B - Shared validation utility:** Create `validateFinancialInput()` that all functions call; throws descriptive errors for out-of-bounds inputs.
- **Option C - Output validation:** Don't restrict inputs, but check outputs. If any result is `NaN`, `Infinity`, or unexpectedly negative, return a safe fallback.
- Recommended: **Option A** - prevents the issue at the source. Bounds match `importData.ts` limits (`MAX_MONEY: 1_000_000_000`, `MAX_RATE: 200`). Clamping is silent and non-disruptive.

### v1.4.16 Audit Follow-ups

#### High
- [ ] Add app-launch biometric / PIN gate
  Files: new screen + `App.tsx`, `package.json` (add `expo-local-authentication`)
  No auth between device unlock and full financial data. Anyone past the lockscreen sees balances, debts, payments. Biggest user-facing gap for a finance app.
  - **Option A - Biometric required, PIN fallback:** Gate first render on `LocalAuthentication.authenticateAsync({ disableDeviceFallback: false })`. Falls back to device passcode if Face/Touch ID enrollment is missing.
  - **Option B - Optional, off by default:** Setting in ProfileScreen; default off so existing users aren't surprised on update. Lower friction, lower protection.
  - **Option C - Optional, prompt on first launch after update:** One-shot opt-in modal explaining the trade-off, default to enabled if the user dismisses.
  - Recommended: **Option C** - best mix of security and not breaking expectations for existing installs.

#### Medium
- [ ] Add MAC to encrypted exports (or switch to AES-GCM)
  File: `src/utils/exportData.ts`, `src/utils/importData.ts`
  v2 encrypted export uses AES-CBC with no integrity tag. JSON-parse failure is the only "tamper" signal. No realistic padding-oracle exposure today (user decrypts locally), but a missing MAC is an audit flag every time.
  - **Option A - AES-GCM:** Replace CBC with GCM; auth tag is built in. Cleanest. CryptoJS doesn't ship GCM though - would need `expo-crypto`/native or a vetted JS GCM lib.
  - **Option B - Encrypt-then-MAC envelope:** Keep CBC, append `HMAC-SHA256(salt | iv | ciphertext)` to the v2 prefix as a new `__BUDGETARK_ENC3__:` format. Stays inside CryptoJS. Mirrors the storage-layer pattern.
  - **Option C - Leave as-is, document the threat model:** Note in code that integrity is JSON-parse only and any tampering corrupts decrypt → user re-imports.
  - Recommended: **Option B** - matches what `encryptedStorage.ts` already does, no new dep, bumps prefix so legacy v2 stays decryptable.

- [ ] Pin `expo-secure-store` to device-only accessibility
  File: `src/storage/encryptedStorage.ts:124`
  `SecureStore.setItemAsync(ENCRYPTION_KEY_ALIAS, key)` uses no options, so iOS default is `WHEN_UNLOCKED` - included in iCloud Keychain sync. The master encryption key for all on-device data could end up in iCloud.
  - **Option A - `WHEN_UNLOCKED_THIS_DEVICE_ONLY`:** Pass `{ keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }`. Key never leaves the device, but a device restore to a new phone loses access - user has to re-import.
  - **Option B - `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`:** Same iCloud-blocked guarantee, but readable after first unlock post-boot (lets a future background sync work). Slightly weaker at-rest posture.
  - **Option C - Leave default + document trade-off:** Easier device migration via iCloud Keychain restore, at the cost of the key existing off-device.
  - Recommended: **Option A** - finance data shouldn't quietly ride iCloud. Pair with a clear "back up your encrypted JSON before switching phones" note in the restore flow.

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

- [ ] Constant-time HMAC comparison
  Files: `src/storage/encryptedStorage.ts:188`, `src/sync/transportService.ts:47`
  `storedHmac !== calculatedHmac` is short-circuiting string compare. No realistic remote-timing exposure (storage is local, sync is LAN TCP through the JS bridge), but trivial to fix.
  - **Option A - Length-checked XOR-accumulate compare:** `if (a.length !== b.length) return false; let d=0; for (i) d |= a.charCodeAt(i)^b.charCodeAt(i); return d===0`.
  - Recommended: **Option A** - five lines, removes the audit nit.

- [ ] Document the no-forward-secrecy model for sync
  Files: `src/sync/transportService.ts`, `docs/`
  Sync is pre-shared-key with no per-session ephemeral exchange. If `sharedSecret` ever leaks (compromised device, leaked backup), every captured past sync frame is decryptable. Acceptable for the threat model, but not currently called out.
  - **Option A - Comment in `transportService.ts` + paragraph in security docs:** Explains the choice and the ratchet-style upgrade path if it ever matters.
  - **Option B - Add an ephemeral key exchange (X25519 ECDH per session):** Real forward secrecy. Big lift; CryptoJS doesn't ship curve25519. Probably overkill for a LAN sync between two paired devices.
  - Recommended: **Option A** - match the reality of the threat model rather than over-engineer.

#### Info
- [ ] Pairing listens on `0.0.0.0` - note in security docs
  File: `src/sync/pairingService.ts:203`
  During the 60s pairing window the TCP server accepts from any LAN host. Mitigated by the 40-bit Crockford code + 100k-iter PBKDF2 + user-confirmed fingerprint, so a successful attack requires both code guess and fingerprint trick. Worth a doc line so future contributors don't tighten the bind without understanding the discovery flow needs it.

---

## Nice-to-Have (Post-Launch)

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
- [ ] Search and advanced filters across debts, payments, and budget entries
- [ ] Currency exchange calculator (Utilities tab) - pick base + target currency, enter amount, see converted value. Decide rate source (offline lookup table snapshotted at build time vs. on-demand API call) and whether to surface a "rates last updated" timestamp. Reuse existing `useCurrency()` formatting; live in Utilities alongside the loan amortization tools.
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
- [ ] Debt-Free Countdown Timer - live countdown on Debt Tracker showing projected debt-free date based on current payment velocity. Updates dynamically as payments are made.
- [ ] Budget Rollover Mode - unspent budget in a category rolls into next month (envelope budgeting style). Toggle per category.

- [ ] Month-start checking balance + cash-flow budget - at the beginning of each calendar month, prompt the user to update their checking balance, snapshot it as the month's starting cash, and factor it into the Budget screen as a real cash-flow projection. Chosen over Budget Rollover Mode (above) because it's anchored to ground truth and self-correcting (no stateful carry-over chain that re-derives every prior month).

  Builds on existing plumbing: `AssetAccount` already has a `"checking"` category + `balance` field (`src/types/index.ts:297`, `src/storage/assetAccountStorage.ts`), net-worth snapshots already exist (`netWorthSnapshotStorage.ts`), and the budget already keys income/expense entries per month. The only genuinely new data is a per-month starting-balance history.

  Three parts:
  1. **Month-start prompt** - on first app open of a new calendar month, ask "What's your checking balance today?" Idempotent-per-month via a stored `lastPromptedMonthKey` (same pattern as the app-open streak in `evaluateAchievements` and `backupReminderStorage.ts`). Skippable; also expose a manual "Update balance" entry point anytime.
  2. **Beginning-of-month balance history** - new `src/storage/monthlyBalanceStorage.ts`: `Record<monthKey, { balance: number, capturedAt: string }>`. The prompt writes here AND updates the checking `AssetAccount.balance` in one step so net worth stays correct.
  3. **Factor into budget** - with a real starting number, BudgetScreen shows a true cash-flow projection instead of just planned limits:
     ```
     Starting cash (Jun)             $3,200   ← entered at month start
     + income this month             $4,100
     − expenses (actual + recurring) $3,650
     = projected end-of-month        $3,650
       safe to spend                 $450
     ```
     Reuse `isEntryActiveInMonth` so recurring entries match the Spending donut math.

  Free bonus: **reconciliation line** - compare last month's projected end-of-month vs. the freshly-entered actual ("ended $150 below plan"). Near-zero extra cost once the history exists.

  Decisions to settle before building:
  - **Single number vs. per-account**: sum all `category === "checking"` accounts automatically (recommended, one prompt) vs. a single manual "spendable cash" figure.
  - **Reuse `AssetAccount.balance`** as the live value + snapshot to monthly history (recommended) vs. a fully separate balance field.
  - **Sync**: this is real financial data and partner-relevant, so DO sync the monthly balance history (unlike per-device UX state like coachmarks/feature-discovery).

  Files (proposed):
  - `src/storage/monthlyBalanceStorage.ts` - CRUD for the `monthKey → { balance, capturedAt }` map (EncryptedStorage, sync-eligible).
  - `src/components/MonthBalancePromptModal.tsx` - the once-per-month prompt (reuse existing modal + theme/density tokens).
  - `src/components/CashFlowCard.tsx` - Budget-tab card showing starting cash → projected end-of-month → safe-to-spend + reconciliation line.
  - `src/utils/cashFlow.ts` - pure helpers (startingCashForMonth, projectedEndOfMonth, safeToSpend, reconcileVsActual).
  - `src/screens/BudgetScreen.tsx` - mount the card; wire the prompt + manual update button.

  Effort: medium-small (smaller than Rollover Mode). Mostly additive - one storage module, one prompt modal, one card + math helper. No cross-month recomputation chain. OTA-eligible: yes, no new native deps.

- [ ] Spending Velocity Alerts - passive banner when opening the app: "You've spent 60% of your Grocery budget and it's only the 12th." No push notifications required.
- [ ] Partner Budget Visibility Controls - mark specific budget entries as "private" so they don't sync to partner. Useful for gifts or personal spending.
- [x] "What If I Stopped Spending on X" Projections - pick a discretionary category and see how redirecting that money to debt or savings changes your timeline.

  Shipped as a Charts-tab tool (2026-07): `src/utils/whatIfSpending.ts` (pure math + tests) and a "What If I Stopped Spending on…" card in ChartsScreen. Category chips show per-category averages from the last 6 tracked months (Debt Payments excluded); a slider sets the redirect amount; the debt side compares payoff timelines via `simulatePayoffPlan` (avalanche/snowball toggle, months sooner + interest saved, handles unsolvable→solvable), and the savings side shows 1/5/10-year growth at an assumed 7% via `calcInvestmentGrowth`. Device testing pending on next build.
- [ ] Big Purchase Cost/Benefit Comparison Calculator - compare long-term total cost of ownership for expensive vs cheaper options (e.g. gas car vs hybrid vs EV) using purchase price, financing, fuel/energy cost, insurance, maintenance, depreciation/resale, annual miles, and ownership length. Show break-even point, 5/10-year totals, cost per mile, and whether the higher upfront option pays off over time.
- [ ] Net Worth Timeline Graph - plot net worth (assets minus debt) over time as a line chart. Data already exists across months.
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

- [ ] iOS Quick Entry widget (WidgetKit) - iOS counterpart to the shipped Android widget: static, data-free category grid whose buttons deep-link into the prefilled Add Entry modal. All app-side plumbing already exists (`budgetark://` scheme, `quickAddLink.ts` validation, `QuickAddLinkHost`, `initialCategory` on the modal) - this item is purely the native extension.

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
- [x] Layout density selector - Compact / Comfortable / Spacious presets that scale spacing, card padding, and font size globally. Plumbing mirrors the existing theme system: `LayoutContext` + `useLayout()` hook returning `{ pad, gap, radius, fontScale }` tokens. Storage key in `userStorage`, selector card in Profile next to the theme picker. Migration is incremental - screens still using hardcoded `padding: 16` keep rendering at the default value, swap to `tokens.pad` over time. OTA-eligible.
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

  Still TODO: consider a Budget-tab filter chip ("Business only") as a fast-follow. (Release-notes entry DONE 2026-07-12 - in-app 1.9.0 notes + RELEASE_NOTES.md.)

- [ ] Lean month mode - toggle that hides non-essential categories from Budget, surfacing only essentials (Rent, Food, Utilities, Transport). Helps users focus during tight months without deleting or reorganizing data. Pure UI filter, OTA-safe.

- [ ] Hidden cost of debt counter - widget on Debt Tracker showing projected total interest across the remaining life of every debt, updates live as payments post. Motivational. Pure derivation from existing balances + APRs + payment schedule.

- [ ] Effective hourly wage view - user enters annual income + hours worked per week; app reframes every expense in "hours of your life" ("$80 dinner = 3.2h"). Optional, opt-in. Settings live in Profile, display toggle on entry rows.

- [ ] Personal best tracking - surface records like "best savings month: April 2025 - $1,840", "longest under-budget streak: 6 months", "biggest debt month: $1,200 paid". Card on Bridge. Pure read over existing data.

- [ ] Year-over-year comparison - pick a category (or all), see same-month-last-year vs this-year deltas in a small bar chart. Lives in Budget or Annual Report.

- [x] Photo attachments on entries (no OCR) - manual photo per budget entry, stored locally in app sandbox via `expo-file-system`. Browsable "Receipts" gallery filterable by month/category. Ships ahead of full OCR (which stays as separate TODO). New native dep: `expo-image-picker` (already common in Expo apps) - NOT OTA-eligible.

- [ ] Runway simulator - "how long does my current savings last with income = $0?" Uses existing recurring expenses + emergency fund + asset accounts. Shows months of runway + month it goes negative. Lives on Bridge or Utilities.

- [ ] Emergency mode dashboard - when emergency fund balance drops below a user-defined threshold (or is "tapped" via a withdrawal), Bridge surfaces a refill plan card (recommended monthly contribution to restore in N months) and a soft 30-day freeze on adding new debt entries (with override). Behavioral guardrail.

- [ ] Visible ark fills as milestones complete - replace the abstract Hull/Deck/Supplies progress bars with a visual ark illustration that progressively gains planks, sails, supplies, animals as milestones complete. Big emotional payoff, leans hard into the app's name and theme. Needs an SVG ark in tiered states (or layered components). OTA-safe.

- [ ] Optional daily Proverb / verse - opt-in single verse shown on first app-open of each calendar day. Fits Ark theming. Bundled JSON of public-domain verses (KJV) - no network. Profile toggle defaults OFF so users who don't want it never see it.

- [ ] Income tax / take-home pay calculator (US, v1) - on Utilities. Inputs: gross annual income, filing status (Single / MFJ / MFS / HoH), state, optional pre-tax deductions (401k %, HSA, health premium), pay frequency (weekly / biweekly / semimonthly / monthly). Outputs: federal tax, FICA (SS + Medicare + additional Medicare), state tax, total tax burden, effective rate, marginal bracket, take-home per pay period and per year.

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

- [ ] Charts tab - rename Utilities → Charts and turn it into a personal finance learning hub alongside the existing calculators. (Avoids "Compass" since Bridge already uses 🧭. "Charts" reads as both star/nautical charts and the reference-material framing for a learning hub, and stays short like the other tab labels.)

  Concept: bite-sized lessons on budgeting, debt, saving, investing, taxes, insurance, real estate, retirement. Each lesson ends with contextual CTAs that open existing in-app flows (set up a savings goal, switch debt strategy, open a calculator) so learning ties directly to user action. External resources per lesson: curated YouTube videos for deeper discussion + Amazon book recommendations (affiliate links, with full compliance flow).

  Naming / IA:
  - Bottom tab label: "Charts" with 📜 icon (scroll/chart). Alternates worth a quick A/B in design: 🗺️ or 🌌. Route key stays "Utilities" for backward compat with existing sync/state - only the display label and icon change.
  - Charts landing has 3 sections: Captain's Course (linear path), Topics (free-form browse), Tools (existing calculators - Refinance, Sinking Fund, Tax, etc., folded in instead of a separate tab).
  - Personalized "Recommended for you" card at top, picked from user state (high-interest debt → avalanche lesson; no emergency fund → starter cushion lesson; net worth crossed $10k → investing basics).

  Lesson model:
  - Bundled in JS, no network. `src/data/lessons/*.ts` exports `Lesson` objects.
  - `Lesson` shape:
    ```ts
    {
      id, title, chapter, topics, readMin,
      body: Section[],          // typed sections, NOT free-form markdown
      action?: { label, route }, // jump into existing flow (savings goal, calculator, etc.)
      resources?: Resource[],    // YouTube + Amazon + articles + internal tool links
    }
    ```
  - `Section` types: `paragraph`, `bullet-list`, `callout`, `calculator-embed`, `glossary-link`, `image-ref`. Renderer in `src/lessons/LessonRenderer.tsx` walks the array. Explicit types avoid markdown XSS/parse surprises.
  - `Resource` discriminated union:
    ```ts
    | { type: "youtube"; title; channel; duration?; url }
    | { type: "book"; title; author; coverAsset; amazonUrl; affiliate: boolean }
    | { type: "article"; title; source; url }
    | { type: "tool"; title; route }
    ```

  External link handling:
  - YouTube: `Linking.openURL("youtube://watch?v=...")` with fallback to `https://www.youtube.com/watch?v=...`. Opens the user's YouTube app - no in-app webview, no autoplay-on-cellular issue, no new native deps.
  - Amazon: `Linking.openURL(amazonUrl)`. Use OneLink-formatted URLs so international users land on their local Amazon storefront with the regional affiliate tag applied. Requires linking Associates accounts per country in Amazon's dashboard.
  - Books: bundled cover images at `assets/books/<isbn>.png` (~30-50 books across all lessons ≈ 2MB total). Avoids any runtime call to Amazon's image CDN - preserves offline-first promise and avoids the tracking surface of an image fetch. New books ship cover in OTA bundle.

  Amazon affiliate compliance (CRITICAL - read before shipping):
  - **Amazon Associates Operating Agreement** requires the verbatim disclosure: "As an Amazon Associate I earn from qualifying purchases." Must be visible near affiliate links AND in a persistent location.
  - **First-tap one-time disclosure modal** on any affiliate link:
    > "Books on Charts link to Amazon. If you buy after tapping, BudgetArk earns a small commission at no extra cost to you. This helps fund the app's development."
    > [Continue] [Cancel]
    Persist in `@budgetark_affiliate_disclosure_seen`, never shows again.
  - **Always-visible small footer** on lesson resource sections: "Some links earn commission. As an Amazon Associate, BudgetArk earns from qualifying purchases."
  - **Profile → About** gets a full "Affiliate Disclosure" section with the verbatim Amazon-required text.
  - **Profile toggle**: "Show affiliate links" (default ON). When OFF, book cards still render with metadata but hide the Amazon CTA - honors privacy-purist users.
  - **Apple App Store**: affiliate links allowed under Guideline 3.1.3 (physical/digital goods sold elsewhere). Reviewers occasionally flag undisclosed affiliate use - the disclosure modal + Profile section + footer mitigate. CTAs must clearly route to a browser ("View on Amazon"), never "Buy in app."
  - **Google Play**: allowed with disclosure - covered by the above.
  - **F-Droid**: affiliate links count as Advertising under their anti-features taxonomy. Two options:
    - **Option A (recommended)**: build flag `process.env.BUILD_VARIANT === "fdroid"` strips `amazonUrl` from resource cards at render time. Books still show metadata + cover, just no Amazon button. Clean ship, no anti-feature tag.
    - **Option B**: ship with the `Advertising` anti-feature tag and accept the user-filter penalty.

  UI:
  - Charts landing: scrollable, three section headers.
    - "Continue your course" - resumes Captain's Course where the user left off; progress bar showing chapter X of Y.
    - "Recommended for you" - 1-3 personalized lesson cards.
    - "Topics" - chip row (Budgeting / Debt / Saving / Investing / Taxes / Insurance / Real Estate / Retirement). Tap → filtered lesson grid.
    - "Tools" - existing calculators (Refinance, Sinking Fund, Tax, Loan Amortization, Investment Growth, Big Purchase Comparison).
  - Lesson screen: scroll-through; hero icon, sections, "Key takeaway" callout, action button, "Go deeper" resource list at bottom.
  - Resource cards: YouTube cards show channel + duration + ▶ icon; book cards show cover + title + author + "View on Amazon" pill (or hidden under affiliate-off toggle).

  Progression / gamification (ties into existing Ship's Log):
  - 📖 First Voyage - finished first lesson
  - ⭐ Course Plotter - completed Captain's Course Ch 1 (was 🧭 - reusing Bridge's glyph, swapped to a star to match the Charts theme)
  - ⚓ Anchored in Knowledge - completed full Captain's Course
  - 🦉 Wise Steward - read 25 lessons
  - Lesson completion timestamps in `learningProgressStorage.ts`. Counts toward existing app-open streak.

  Storage:
  - `src/storage/learningProgressStorage.ts` - `{ completedLessons: Record<string, number>, currentChapter?: string, glossaryViews: number, affiliateDisclosureSeenAt?: number, showAffiliateLinks: boolean }`. EncryptedStorage.
  - Do NOT sync to partner - per-device learning state. Partner reading different lessons shouldn't mark each other's complete.
  - Include in `clearAllData` `RESET_KEYS`.

  Files (proposed):
  - `src/screens/ChartsScreen.tsx` (landing - replaces UtilitiesScreen or wraps it)
  - `src/screens/LessonScreen.tsx`
  - `src/lessons/LessonRenderer.tsx` (typed section walker)
  - `src/lessons/AffiliateLinkGuard.tsx` (first-tap disclosure modal + F-Droid build-flag strip)
  - `src/data/lessons/` directory (one file per lesson, indexed via `lessonIndex.ts`)
  - `src/data/lessonChapters.ts` (Captain's Course ordering)
  - `src/storage/learningProgressStorage.ts`
  - `assets/books/<isbn>.png` (bundled covers for the curated v1 book list)
  - `src/navigation/AppNavigator.tsx` - rename tab label, swap icon, keep route key

  MVP scope (single OTA + cover assets in next EAS build for the bundled images):
  1. Rename tab to Charts, fold existing calculators into "Tools" section.
  2. Ship Captain's Course chapters 1-2 (~8 lessons: budgeting basics, needs/wants/savings, emergency fund why, $1k starter, snowball vs avalanche, interest math, good vs bad debt, recap).
  3. Topics chips with 4 active (Budgeting, Debt, Saving, Tools); remaining grayed "Coming soon."
  4. Resource cards for YouTube + book affiliates.
  5. Affiliate disclosure flow (modal + Profile section + footer).
  6. 2 new Ship's Log badges (📖 First Voyage, ⭐ Course Plotter).
  7. Personalized recommendation rules (3-5 triggers).

  Out of scope (v1):
  - Glossary screen (defer to v1.1).
  - Captain's Course Ch 3-4 (Saving & Investing, Wealth Building).
  - Quizzes / interactive checkpoints.
  - User notes on lessons.
  - In-app YouTube embed (stays external).
  - Audio narration / podcast embed.

  Tech notes:
  - Cover-image bundle bumps EAS build size by ~2MB - acceptable, but the assets ship in a NEW binary (not OTA), so plan the version bump accordingly. Lesson text + new lessons stay OTA after that.
  - OneLink setup is a one-time Amazon Associates dashboard config, not code work.
  - Existing `react-native-svg` and emoji icons cover all new visuals - no new native deps for v1.

---

## Themes

Ideas for new color themes (all pure JS - a `ThemePreset` in `src/theme/themes.ts` plus an optional ambient background component - so every one of these is OTA-safe). Existing lineup for reference: The Ark, Forest Gold, Neon Purple, Easy, Rose, Synthwave, Deep Forest, Coral, Deep Space; ambient backgrounds currently on the "Deep" themes only.

- [x] **Deep Sea** - SHIPPED (2026-07-12). Completes the "Deep trilogy" (Space / Forest / Sea) and is the strongest brand fit for Budget*Ark*: abyssal navy-teal background (`deep_sea` in `themes.ts`), dark teal cards, bioluminescent cyan-green accent. Ambient background `DeepSeaBackground.tsx`: light shafts from the surface, seeded plankton motes in cyan/teal/green, abyss vignette - same static-SVG approach as `ForestBackground`/`SpaceBackground`. Defaults to Glass like Deep Space (Profile "theme default" labels cover both). Pure JS/OTA-safe; release-notes entries written. Visual check on device/simulator recommended (palette + background are untestable in Jest).
- [ ] **Lighthouse** - deliberately high-contrast accessibility theme: near-black background, warm beam-yellow accent, thick borders, AAA contrast ratios throughout. Positions accessibility as on-brand ("when the fog rolls in, follow the light") rather than clinical; pairs with the shipped Text Size axis. Consider auditing every `ThemeColors` slot against WCAG AAA before shipping this one - it's the theme's whole promise.
- [ ] **Chart Room** - vintage nautical map: aged-paper light background, dark teal ink text (chart contour lines), brass/sepia accent, optional faint compass-rose ambient watermark. The Ark's parchment sensibility but cartographic; rhymes with the Captain's Course branding.
- [ ] **Harbor Dawn** - light theme (lineup is dark-heavy: only Rose + The Ark are light). Soft horizon gradient - pale peach into seafoam - cool gray cards, muted gold accent. "New month, fresh start" energy for users who find dark finance apps gloomy.
- [ ] **Ledger** - nostalgic banker's theme: cream paper, ruled-line dividers, classic accounting green accent, leaning into tabular numbers. Novelty pick for budget nerds.

---

## Engineering Health - Post-1.7.2 Assessment (2026-06-09)

Prioritized gaps identified after the Round 4 audit. Items 1, 3, and 4 are JS-only (OTA-eligible); 2 and 5 need a new EAS build and should ride the next runtimeVersion bump together.

- [ ] **Unit tests (highest leverage item).** Zero test files, no test runner in `package.json`. Four audit rounds each found ~30 bugs, and most live in pure functions that are trivially unit-testable: `tombstones.ts` (mergePreservingTombstones, LWW merge), `recurrence.ts` (isEntryActiveInMonth, month-key math), `calculations.ts` (payoff schedules, interest), the importData merge helpers (snapshots, achievements, dismissals), `recordValidators.ts`, and `cashFlow`-style date bucketing. Plan: wire `jest` + `jest-expo` preset, start with the storage/util pure functions (no component testing needed for v1), run in a pre-commit hook or CI. One afternoon of setup converts every future audit finding into a permanent regression test. OTA-irrelevant (dev-only dep).

- [ ] **Crash reporting.** No Sentry/crash telemetry - bugs only surface when a user emails. `@sentry/react-native` (Expo config plugin) captures JS crashes, native crashes, and handled errors with breadcrumbs. Native module → requires new EAS build; pair with whatever next forces a runtimeVersion bump. Privacy note for the store listing/privacy policy: crash payloads leave the device, so scrub PII (no balances, no debt names in breadcrumbs) and add an opt-out toggle in Profile to keep the "data stays on device" promise honest.

- [ ] **ESLint.** No lint config. `eslint-config-expo` + `eslint-plugin-react-hooks` would have mechanically flagged several audit findings (stale closures, missing/incorrect deps arrays). Add `npm run lint` next to the tsc check. Dev-only, OTA-irrelevant.

- [x] **Sync v2 mismatch UX.** A 1.7.2 device syncing with a pre-1.7.2 partner currently sees a generic timeout. Frames carry `v`, so the receiver can detect a `v: 1` frame (and the v1 sender can be detected by its rejected-frame behavior) and surface "Your partner's app needs the update to 1.7.2" instead. Small JS-only change in `transportService.ts`/sync UI; saves confused support emails in the window where one partner has updated and the other hasn't. SHIPPED 1.7.2: `transportService` flags frames that look like sync messages but carry a missing/wrong `v` (a v1 peer's frames have no `v`); `syncOrchestrator`'s error path checks the flag and replaces the generic timeout with "Your partner's device is on an incompatible app version...". Limitation: only detects when the outdated peer sends first - a v1 *server* silently drops our v2 frames (its ciphertext-only HMAC never matches), so that direction still times out generically.

- [ ] **Replace crypto-js (deprecated).** Maintainer archived crypto-js in 2023; PBKDF2 at 250k iterations runs in pure JS and is slow on low-end Androids (export/import + pairing). `react-native-quick-crypto` is a pure-RN native module (fits the no-Expo-equivalent preference) and ~50x faster. New native dep → EAS build; bundle with the Sentry build. Migration constraints: legacy v1 (`__BUDGETARK_ENC__`) and v2 (`__BUDGETARK_ENC2__`) backups must still decrypt, encryptedStorage V1/V2 formats must still read, and sync HMAC/AES output must stay byte-compatible with the protocol-v2 envelope (or bump to v3 at the same time).

- [x] **Decide: net-worth snapshot sync.** The one Round 4 finding left open (see Potentialbugs.md). Snapshots don't sync between paired devices - each phone builds its own history. If per-device history is intentional, document it in `netWorthSnapshotStorage.ts` and check the box; if not, it's the same optional-DiffEntry pattern just added for customCategories (union by dayKey, keep newest capturedAt - the merge helper already exists in importData). SHIPPED 1.7.2: decided to sync. `SyncDiff.netWorthSnapshots?` merged by dayKey (strictly-newer capturedAt wins), validated with `isNetWorthSnapshotItem`, counted in sync results. One-time backlog send (`@budgetark_sync_backfill_done_v1`, stamped after first successful sync, in RESET_KEYS) transfers pre-feature history for already-paired couples and also re-sends the full custom-category list (same backlog gap).

- [ ] **Captain's Course chapters 3-5.** Listed as "Coming soon" in-app since 1.7.0. Content-only, OTA-eligible. (Tracked here as a release-pressure reminder; authoring details live in the Charts tab section above.)

- [ ] **Scheduled local auto-backup.** Backup story is fully manual; the reminder banner only nudges after upgrades. Add a periodic (weekly/monthly) automatic encrypted export written to the app's own sandbox via `expo-file-system` (already a dep - OTA-eligible), keeping the last N files, surfaced under Profile → Data ("Last auto-backup: ...") with a restore picker. Protects users who never tap export. Note: sandbox files die with an uninstall - this supplements, not replaces, the share-sheet export.

- [ ] **Split Potentialbugs.md.** It has become the de-facto changelog and is too large to read in one pass. Move fixed/closed rounds to `docs/audit-archive.md` (or per-round files) and keep only open findings + the latest round in the root file.

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
