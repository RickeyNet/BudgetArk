/**
 * BudgetArk - English strings: Profile (main)
 * File: src/i18n/locales/en/profileMain.ts
 *
 * Covers: ProfileScreen.tsx shell + ProfileCard, MissionCard, ProgressSection, BackupReminderBanner.
 */

export const profileMain = {
  header: {
    title: "Profile",
    subtitle: "Your anonymous account settings.",
  },
  loading: {
    loading: "Loading profile...",
    failedTitle: "Couldn't load your profile",
    failedBody:
      "BudgetArk couldn't read its saved data on this device. This can happen when the phone is very low on free storage. Your data has not been changed.",
    tryAgain: "Try Again",
    tryAgainA11y: "Try again",
  },
  appVersion: "BudgetArk v{{version}}",
  card: {
    editHint: "{{idPrefix}}... · Tap name to edit",
  },
  mission: {
    a11yExpanded: "Mission statement, expanded",
    a11yCollapsed: "Mission statement, collapsed",
  },
  progress: {
    sectionTitle: "PROGRESS",
    shipsLog: "Ship's Log",
    shipsLogA11y: "Open Ship's Log achievements",
    earned: "{{unlocked}}/{{total}} achievements earned",
  },
  backupBanner: {
    upgradedTitle: "You upgraded to v{{version}}",
    upgradedBody:
      "Your last backup was on v{{lastVersion}}. Take a fresh one so you can always restore from this version.",
    noBackupTitle: "No backup yet",
    noBackupBody:
      "Export your data so you have a recovery point if anything ever happens to your device.",
    backUpNow: "Back up now",
    dismiss: "Dismiss",
  },
  sync: {
    pairedTitle: "Paired!",
    pairedMessage:
      "You're now paired with {{partnerName}}. Tap \"Sync Now\" anytime to share data.",
    completeTitle: "Sync Complete",
    completeMessage: "Sent {{sent}} records, received {{received}} records.",
    failedTitle: "Sync Failed",
    failedFallback: "Could not connect to partner.",
    unpairedTitle: "Unpaired",
    unpairedMessage:
      "Partner sync has been disconnected. Your data is still on this device.",
    permissionTitle: "Permission Required",
    permissionMessage:
      "Location permission is needed to read the WiFi network name for auto-sync. Your location is never stored or shared.",
    noWifiTitle: "No WiFi Detected",
    noWifiIos:
      "Unable to read your WiFi network name. Make sure you are connected to WiFi, then check:\n\n1. Settings > Privacy & Security > Location Services - turn on for BudgetArk (\"While Using\")\n2. Settings > Privacy & Security > Local Network - turn on for BudgetArk\n\niOS requires location access to read the WiFi name. Your location is never stored or shared.",
    noWifiAndroid: "Connect to your home WiFi first, then try again.",
    saveHomeNetworkFailedTitle: "Couldn't Save Home Network",
    saveSettingFailedTitle: "Couldn't Save Setting",
    saveFailedMessage:
      "BudgetArk couldn't write the pairing settings securely on this device. Nothing was changed - please try again.",
    homeNetworkSetTitle: "Home Network Set",
    homeNetworkSetMessage: "Auto-sync will trigger when both devices are on \"{{ssid}}\".",
  },
  reset: {
    incompleteTitle: "Reset incomplete",
    incompleteFallback:
      "Some data could not be cleared. Try again or reinstall the app to complete the reset.",
    incompleteRetry: "{{message}} Please try Reset All Data again.",
  },
} as const;
