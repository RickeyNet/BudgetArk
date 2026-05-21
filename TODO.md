# BudgetArk - App Store Launch TODO

Work through phases in order: finish the features first, then handle store prep and submission.

---

## Phase 1 - Budget Screen

- [x] Design data model for income/expense entries (category, amount, date, type)
- [x] Create `budgetStorage.ts` following the same AsyncStorage pattern as `debtStorage.ts`
- [x] Add new types to `src/types/index.ts` (e.g., `BudgetEntry`, `BudgetCategory`)
- [x] Implement income & expense entry form (modal, similar to `AddDebtModal`)
- [x] Implement category list with monthly totals
- [x] Add budget limit per category with warning when approaching limit
- [x] Add pie/donut chart breakdown using Victory Native (already installed)
- [x] Add spending alert logic (warning color when >80% of limit reached)

---

## Phase 2 - Investment Screen

- [x] Design UI for contribution calculator (inputs: monthly amount, annual return %, years)
- [x] Wire up `calcInvestmentGrowth()` from `src/utils/calculations.ts` (already implemented)
- [x] Add interactive sliders for "what if" exploration
- [x] Add a line chart showing growth over time (SVG area chart)
- [x] Show contribution vs. interest earned breakdown
- [x] Add timeline presets (10yr, 20yr, 30yr buttons)

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
- [ ] Consider adding a proper splash icon that fits the dark background

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
- [ ] App icon: 512×512 PNG
- [ ] Feature graphic: 1024×500 PNG
- [ ] Screenshots: at least 2 phone screenshots (16:9 or 9:16)
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
- [x] Go to Production > Create new release
- [x] Upload the `.aab` file
- [x] Add release notes
- [ ] Review and roll out

### 6. Wait for Review
- [ ] Google review typically takes a few hours to a few days for first submission
- [ ] Note: `android.package` is `com.budgetark.app` - this is your permanent Play Store identity
- [ ] Google Play App Signing manages your keys by default - no risk of losing your keystore

==============================================================================================================================================================================================

## F-Droid Submission

F-Droid is a free, open-source Android app store. Apps must be open source and built from source by F-Droid's servers.

### 1. Prerequisites
- [ ] Make your GitHub repo public (F-Droid requires open source code)
- [ ] Add an open-source license to the repo (e.g., GPL-3.0, MIT, Apache-2.0) - add a `LICENSE` file
- [ ] Remove any proprietary dependencies if possible (F-Droid prefers fully free software)
  - Note: `expo-updates` and EAS-related code may need to be optional since F-Droid builds won't use EAS
- [ ] Ensure the app can build with standard open-source tooling (Gradle)

### 2. Prepare the Build
- [ ] Run `npx expo prebuild` to generate the native `android/` folder
- [ ] Verify the app builds locally: `cd android && ./gradlew assembleRelease`
- [ ] Make sure `android/` is committed to the repo (F-Droid builds from source)
- [ ] Tag your release in git (e.g., `git tag v1.0.0`) - F-Droid uses tags to detect new versions

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
- [ ] F-Droid signs the APK with their own key - it will NOT be the same signature as your Play Store/EAS builds
- [ ] Users cannot switch between Play Store and F-Droid versions without reinstalling
- [ ] Updates go through F-Droid's build cycle - not instant like EAS OTA
- [ ] No analytics, tracking, or proprietary push services allowed (BudgetArk should be fine since it's fully offline)

=================================================================================================================================================================================================

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
- [ ] Add deep link validation if deep link routing is implemented in the future
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

## Code Quality & Crash Prevention

### High Priority
- [x] Fix race condition in `recordPayment()` - `src/storage/debtStorage.ts:162-177`. The `balance: undefined as any` workaround means if `updateDebt` fails after payment is written, the payment is saved but debt balance never updates. Add atomic/transactional storage operations.
- [x] Wrap `Promise.all()` in try-catch in `DebtTrackerScreen.tsx:181-205` - was already wrapped in try-catch with fallback to empty state. Verified correct.
- [x] Fix division by zero in `DebtTrackerScreen.tsx:339` - was already guarded with `nonMortgageOriginal > 0` ternary. Verified correct.
- [x] Use `Number.isFinite()` for all parsed numeric inputs in `AddDebtModal.tsx:229-231` - `parseFloat(x) > 0` doesn't catch `Infinity` edge cases.
- [x] Make decryption failures distinguishable from missing data in `encryptedStorage.ts:195-211` - now throws `DecryptionError` instead of returning `null`, so callers can distinguish corruption from missing data.
- [x] Remove `as any` casts and replace with proper type guards - `debtStorage.ts:175`, `App.tsx:99-100`, `ProfileScreen.tsx:213-214`, plus `ProfileScreen.tsx:445`.

### Medium Priority
- [x] Fix stale closure in `useCallback` - `DebtTrackerScreen.tsx:160-178`. `primeMilestonesModal` captures `targetDraftByStep` but may not properly list it in dependencies.
- [x] Add cleanup functions to async `useEffect` hooks - `ProfileScreen.tsx:154-167`. If component unmounts mid-load, state updates on unmounted components cause warnings/crashes.
- [x] Fix memory leak in AppState listener - `encryptedStorage.ts:69-73`. `AppState.addEventListener` at module scope with no removal; listeners accumulate during hot-reload.
- [x] Fix concurrent budget entry write race condition - `BudgetScreen.tsx:316-344`. `saveBudgetEntries()` is async inside a sync `setState` callback. Rapid edits can cause storage to lag behind state, leading to data loss on restart.
- [x] Add upper bound validation on import numeric values - `importData.ts:161-168`. `monthlyLimit` validated only as `> 0.01` with no ceiling. A malformed import could inject absurd values.
- [x] Handle chart empty state gracefully - `InvestmentScreen.tsx:68`. Chart returns `null` for < 2 data points, which could cause layout shift.
- [x] Add safeguard for simulation loop - `calculations.ts:128-195`. Already guarded: line 185 exits early when balance isn't decreasing (`afterBalance >= beforeBalance - 0.000001`), plus hard cap at 600 iterations and input sanitization. No additional fix needed.

### Low Priority
- [x] Improve navigation error logging - `App.tsx:242-244`. Added try-catch around `navigate()` calls and `__DEV__` warnings when navigation isn't ready.
- [x] Fix FlatList `keyExtractor` - `BudgetScreen.tsx:672`. Verified safe: `expenseRows` derives from a `Set<BudgetCategory>`, so `item.category` is guaranteed unique. No change needed.
- [x] Reduce excessive local state in `DebtTrackerScreen.tsx:115-152` - Evaluated: `useReducer` would not reduce re-renders (React re-renders the full component on any state change regardless). The main stale-closure risk was already fixed in medium priority. Not worth the refactor risk.
- [x] Fix missing `useCallback` dependency in `InvestmentScreen.tsx:188-191` - Verified correct: `handleSliderChange` and `adjust` only use stable `useState` setters and module-level constants (`SLIDERS`). Empty dependency arrays are appropriate.
- [x] Add negative value validation for savings goals - `SmartPlanModal.tsx:597`. Added `Math.max(0, ...)` clamp so negative `currentAmount` from data corruption renders as 0% instead of a negative percentage.

---

## Nice-to-Have (Post-Launch)

- [x] Payment history screen - the data is already being recorded, just needs a UI
- [x] Edit existing debts (currently debts can only be added or deleted, not edited)
- [x] Debt payoff order strategies (avalanche vs. snowball method)
- [ ] Push notifications for payment reminders (requires `expo-notifications`)
- [x] Additional themes beyond Forest Gold and Neon Purple (added Slate, Rose, Synthwave)
- [ ] iPad layout improvements (`supportsTablet` is already set to `true` in `app.json`)
- [x] Localization / currency format options beyond USD
- [x] Recurring budget entries
- [ ] Due-date reminder banners
- [x] Smarter payoff planner with what-if extra payment comparison(how much interest you will pay or will save from paying early)
- [x] Savings goals and emergency fund Deck tracker
- [x] Persist user-selected payoff strategy across app restarts (no default reset to Custom)
- [x] Build Your Ark planning hub (Hull/Deck/Supplies) integrated with Debt Tracker
- [x] Improve debt milestone modal readability (full-screen layout + larger text + safe-area support)
- [x] Improve theme readability and contrast across The Ark and dark themes (buttons + theme selector cards)
- [x] Monthly review insights (category changes, spending trends, streaks)
- [x] Custom categories and category icon support - v1 (add-only): users add their own categories (name + emoji icon) via Profile → CATEGORIES → Custom Categories. Built-in 21 stay fixed. Custom categories work everywhere built-ins do: entry pickers (Add/Edit modals), Budget category list, donut chart (deterministic name-hashed color), monthly limits, insights/streaks, Annual Report. New `customCategoriesStorage.ts` (EncryptedStorage, validated/sanitized names, dup-checked vs built-in+custom, cap 30) + `CustomCategoriesProvider` + `categoryIcons.ts` (emoji map for all 21 built-ins + curated picker grid + resolver). `BudgetEntry.category`/`CategoryBudgetLimit.category` widened to `CategoryName` (built-in autocomplete preserved). OTA-safe - emoji only, no native deps. Typecheck clean. Import/export round-trips custom categories: JSON export carries a `customCategories` collection; the shared record validator (`recordValidators.isValidImportCategory`, also on the LAN-sync path) accepts safe custom names (sanitized, ≤24 chars) instead of rejecting them; importData merges the explicit collection (LWW-by-id, name-deduped, built-in shadow dropped) AND derives definitions from any referenced-but-undefined custom names so pre-feature/foreign backups and sync-relayed entries stay usable (derived ones get the default icon). Spreadsheet import uses the same gate (`normalizeImportCategory`). Replace-mode intentionally does NOT wipe local custom categories when the import carries none, to avoid losing definitions still referenced by imported entries. Known limitation: deleting a custom category leaves tagged entries on the name with the default icon; spreadsheet export has no dedicated icon sheet (names survive via derivation, icon resets to default on round-trip).
- [ ] Search and advanced filters across debts, payments, and budget entries
- [x] Undo actions and bulk edit/delete operations - SHIPPED. (1) Global single-slot Undo snackbar (`src/undo/UndoProvider.tsx`, mounted at app root, theme/density/safe-area aware, sits above tab bar via `fabBottomOffset`, 5s auto-dismiss). Storage gained `untombstone()` + restore paths: `restoreDebt`/`restoreBudgetEntry`/`restoreSavingsGoal`/`restoreAssetAccount`, compound `deletePayment`+`restorePayment` (also reverses the debt-balance effect), `restoreCustomCategory` (re-inserts exact object, same id), tombstone-safe `updateBudgetEntry`. Undo wired for deletes AND edits on: debt delete/edit, savings-goal delete, budget-entry delete/edit, asset delete - each undo also unwinds side effects (net-worth snapshot, linked-asset balance deltas, achievement re-check). (2) Bulk multi-select: long-press to enter selection. Budget entries (BudgetScreen) - per-row checkboxes on expanded category entries (auto-debt-payment rows excluded), bottom action bar with Recategorize (category picker) + Delete, single batched Undo via the global snackbar; batch storage helpers `deleteBudgetEntries`/`restoreBudgetEntries`/`setBudgetEntryCategories` (one read/write). Payments (PaymentHistoryModal) - selectable rows, batched Delete with a LOCAL in-modal undo bar (the root snackbar is occluded by the RN Modal); `onPaymentsChanged` bubbles up so DebtTrackerScreen refreshes debts/net-worth/achievements.

  Deliberate exclusion: custom-category delete keeps its existing `Alert.alert` confirm instead of an undo snackbar - it's deleted from inside the Categories RN Modal, which would occlude the root snackbar (the `restoreCustomCategory` path exists for future use / import round-trip). Not yet device-tested - verify on-device: undo timing/occlusion, linked-asset balance math on bulk delete+undo, recategorize undo of a mixed selection (restores each entry's prior category, not one shared one).
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
- [ ] In-app donation support (Tip Jar) via Apple/Google billing with privacy-safe wording and no custom payment data storage
- [ ] Debt-Free Countdown Timer - live countdown on Debt Tracker showing projected debt-free date based on current payment velocity. Updates dynamically as payments are made.
- [x] Annual Financial Report - selectable calendar-year summary: total debt paid, total set aside, net worth change, top spending category, months under budget, cash flow + savings rate + monthly spending sparkline. Entry card on Bridge → AnnualReportModal. Shareable as aggregates/percentages-only text (no PII). Image capture deferred to v2 (would need a native view-shot dep + EAS rebuild; kept OTA-safe per request).
- [ ] Budget Rollover Mode - unspent budget in a category rolls into next month (envelope budgeting style). Toggle per category.
- [ ] Spending Velocity Alerts - passive banner when opening the app: "You've spent 60% of your Grocery budget and it's only the 12th." No push notifications required.
- [ ] Partner Budget Visibility Controls - mark specific budget entries as "private" so they don't sync to partner. Useful for gifts or personal spending.
- [x] Debt Payoff Celebration Screen - confetti/animation when a debt balance hits $0. Small but emotionally meaningful.
- [ ] "What If I Stopped Spending on X" Projections - pick a discretionary category and see how redirecting that money to debt or savings changes your timeline.
- [ ] Net Worth Timeline Graph - plot net worth (assets minus debt) over time as a line chart. Data already exists across months.
- [ ] Live Stock Holdings & Quote Feed - let users record share counts per ticker and pull market prices so portfolio value flows into Net Worth.

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
- [ ] Quick-Entry Home Screen Widget - minimal widget to log an expense (category + amount) without opening the full app.
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
- [ ] Spending Heatmap - calendar-style grid showing daily spending intensity (like GitHub contribution graph). Green = under average, red = over.
- [ ] Financial Health Score - single 0-100 score based on debt-to-income ratio, emergency fund coverage, savings rate, and budget adherence. Updates monthly. No external data needed.
- [ ] Ark Journey Timeline - visual timeline of all completed milestones with dates, like a ship-building progress illustration. Shareable.
- [x] Category Spending Comparison - "You spent 23% more on Dining Out this month vs your 3-month average." Surface monthly review data more prominently.
- [ ] Dark Mode Schedule - auto-switch themes based on time of day (lighter during day, dark at night).
- [ ] Layout density selector - Compact / Comfortable / Spacious presets that scale spacing, card padding, and font size globally. Plumbing mirrors the existing theme system: `LayoutContext` + `useLayout()` hook returning `{ pad, gap, radius, fontScale }` tokens. Storage key in `userStorage`, selector card in Profile next to the theme picker. Migration is incremental - screens still using hardcoded `padding: 16` keep rendering at the default value, swap to `tokens.pad` over time. OTA-eligible.
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
