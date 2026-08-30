# Privacy Policy

**BudgetArk**
**Effective Date:** August 29, 2026 (replaces the March 8, 2026 version)
**Developer:** Rickey Cornett

---

## Overview

BudgetArk is a personal finance app designed with privacy as a core principle. Everything you enter is stored encrypted on your device. There is no BudgetArk account, no BudgetArk server that holds your data, and no analytics or advertising of any kind.

The app works fully offline. A few optional features - bank connections, live investment prices, currency conversion, partner sync, and the Tip Jar - use the internet or your local network **only when you turn them on**, and each one explains exactly what leaves your device before it runs for the first time. This policy describes those features in detail below.

## Data Collection

**BudgetArk does not collect any personal data.** Specifically:

- No email addresses, phone numbers, or real names are collected
- No location data is accessed or recorded
- No usage analytics, crash reporting, or tracking is performed
- No advertising identifiers are used
- No cookies or web tracking technologies are employed
- Your financial data is never sent to a BudgetArk server - there isn't one

## Data Storage

All data you enter into BudgetArk (debts, payments, budget entries, accounts, holdings, receipt photos, and preferences) is stored **locally on your device only**, encrypted with AES-256 and authenticated with HMAC-SHA256. The encryption key is kept in your device's secure keystore (iOS Keychain / Android Keystore) and is marked device-only, so it is never included in device backups or migrated to another phone.

- **App Lock.** If you enable App Lock, your PIN is stored as a salted hash on this device only. It is never synced, exported, or backed up.
- **Receipt photos** are downscaled and encrypted before they touch storage. They are excluded from partner sync and from backups, and can only be exported by an explicit, per-action confirmation.
- **Automatic backups** (if enabled) are encrypted copies of your data written to the app's private storage on this device. They are not uploaded anywhere and are deleted when the app is uninstalled.
- **Privacy Mode** (optional) blocks screenshots and screen recording of the app.

Your data never leaves your device unless you explicitly export it, sync it with a partner device, or use one of the optional online features described below.

## User Identity

BudgetArk generates a random anonymous identifier (UUID) on first launch. This identifier is stored only on your device and is not linked to any personal information. No account creation, sign-up, or login is required.

If you enable Live Holdings, the app also generates a separate random device identifier used solely to rate-limit price requests. BudgetArk's quote service stores only a one-way hash of it (see below).

## Optional Features That Use the Internet

Each of these is **off until you turn it on**, and the app shows a plain-language disclosure before the first use. If you never enable them, BudgetArk makes no financial-data requests at all.

### Bank Connections (SimpleFIN or Teller)

- You bring your own credentials: a SimpleFIN setup token, or your own Teller developer certificate. BudgetArk operates no bank aggregator and has no server in between.
- Your device connects **directly** to SimpleFIN or Teller over HTTPS (Teller additionally uses mutual TLS). Those providers see the requests come from you, and their own privacy policies apply to the accounts you link there.
- Your credentials are stored encrypted on this device only. They are never synced to a partner device, never included in any export or backup, and if the device's secure keystore is unavailable the app refuses to store them rather than falling back to plaintext.
- Imported transactions wait in a Review Inbox on your device; nothing enters your budget until you approve it (or you create an "always approve" rule you can change or delete at any time).
- Removing a connection deletes its credentials from your device. Entries you already approved stay in your budget.

### Live Holdings (investment prices)

- To show current prices, the app sends **only your ticker symbols** to BudgetArk's quote service - a small proxy hosted on Cloudflare - which fetches prices from a third-party market data provider (Twelve Data) and returns them. Requests happen at most about once a day and only when you tap "Update prices."
- Your share counts, cost basis, balances, account names, and identity are never sent.
- The quote service keeps a short-lived price cache keyed by symbol, a one-way hash of your random device identifier for rate limiting, and a list of symbols that have been requested. It does not store which device asked for which symbols, and it keeps no request logs that would. Like any web request, it can see your IP address, which is used only for abuse prevention and is not stored with any symbol data.

### Exchange rates

- When you switch your display currency or use the currency exchange calculator, the app downloads the day's public exchange-rate table from a free service (open.er-api.com). The request carries no account, amount, or identity - it is the same table everyone receives. Conversion of your amounts happens on your device.

### App updates

- On launch, BudgetArk checks Expo's update service (EAS Update) for new versions of the app's code and downloads them if available. That request contains the app version, runtime version, and platform - nothing about you or your finances. Updates that lack version information or would downgrade the app are rejected.

### Tip Jar

- Optional one-time tips are handled entirely by the Apple App Store or Google Play using their in-app purchase systems. BudgetArk receives no name, email, or payment details, and stores nothing about your purchase. The store's own privacy policy applies to the transaction.

## Partner Sync

Partner Sync lets you pair BudgetArk with one other device (for example, a partner's phone) and share data directly over your **local Wi-Fi network**. There is no cloud relay and no server: devices discover each other with Bonjour/mDNS, verify each other with a shared pairing secret, and exchange data encrypted and authenticated end to end. Nothing is transmitted when the two devices are not on the same network.

- Bank credentials, the App Lock PIN, receipt photos, and device-local settings are never synced.
- Entries you mark **Private** are never sent to the partner device.
- You can unpair at any time from the Profile tab.

## Notifications

If you opt in to Tracking Reminders or the credit-card keep-alive watch, reminders are scheduled locally on your device. BudgetArk uses no push-notification service and never obtains a push token. Notification text never includes amounts, balances, account names, or bill details, and the app does not send payment-due alerts.

## Device Permissions

BudgetArk asks for a permission only when you use the feature that needs it:

- **Camera / Photo Library** - to attach receipt photos to expenses. Photos are encrypted on the device; the original copy taken from the camera or picker is deleted after import.
- **Local Network** - to find and sync with your paired partner's device.
- **Notifications** - only if you opt in to reminders.
- **Secure storage (Keychain / Keystore)** - to protect the encryption key.

Home-screen widgets and app links (`budgetark://`) display only category names and carry no financial data.

## Data Export

The app includes optional export features (JSON backup, Excel workbook, CSV, receipt-photo archive) that share your data through your device's native share sheet. These actions are entirely user-initiated, and the exported data is handled by your device's operating system and whichever app or service you choose to share it with. Password-protected backups are encrypted and tamper-evident. BudgetArk does not process, intercept, or retain any exported data; temporary export files are deleted once the share sheet closes.

## Third-Party Services

BudgetArk integrates with no analytics platforms, advertising networks, or cloud storage providers. The only third parties it can contact - each only when you use the corresponding feature - are:

| Feature (opt-in) | Who is contacted | What is sent |
| --- | --- | --- |
| Bank Connections | SimpleFIN or Teller (your own account) | Your own credentials, directly from your device |
| Live Holdings | BudgetArk quote service (Cloudflare) → Twelve Data | Ticker symbols and a hashed random device id |
| Currency conversion | open.er-api.com | Nothing - a request for the public rate table |
| App updates | Expo (EAS Update) | App version, runtime version, platform |
| Tip Jar | Apple App Store / Google Play | Handled entirely by the store |

## Children's Privacy

BudgetArk does not knowingly collect any data from children under the age of 13. Since no personal data is collected from any user, children are not asked to provide personal information.

## Data Deletion

Since all data is stored locally on your device, you can delete all app data at any time by using the "Reset All Data" option in the app's Profile screen (which also removes automatic backups, receipt photos, bank credentials, and the App Lock PIN), or by uninstalling the app. Removing an individual bank connection deletes that connection's credentials immediately.

## Changes to This Policy

If this privacy policy is updated, the revised version will be posted at this URL with an updated effective date. Since BudgetArk does not collect contact information, users are encouraged to review this policy periodically.

## Contact

If you have any questions about this privacy policy, please contact:

**Rickey Cornett**
Email: budgetark.support@gmail.com

---

*This privacy policy applies to the BudgetArk mobile application available on the Apple App Store and Google Play Store.*
