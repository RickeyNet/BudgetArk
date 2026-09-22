/**
 * BudgetArk - English strings: Profile (settings)
 * File: src/i18n/locales/en/profileSettings.ts
 *
 * Covers: SettingsSection.tsx - the SETTINGS card (currency, privacy mode,
 * app lock, live holdings, haptics, tracking reminders, OTA updates) and
 * its dialogs. The off-device disclosure copy (holdings / exchange rates)
 * stays in src/data/*Disclosure.ts because the Bridge renders the same
 * words; it is not keyed here.
 */

export const profileSettings = {
  sectionTitle: "SETTINGS",
  language: {
    label: "Language",
    pickerTitle: "Language",
    a11yLabel: "Language, currently {{current}}",
    a11yHint: "Opens the app language options",
    /** Shown as the subtext when "Automatic" is selected. */
    autoWithResolved: "Automatic ({{language}})",
    options: {
      auto: {
        name: "Automatic",
        description: "Follow the phone's language. Falls back to English when the phone language isn't available yet.",
      },
    },
    note: "Some content - lessons, the US tax tools, and release notes - is still English only.",
  },
  notNow: "Not now",
  currency: {
    label: "Currency",
    pickerTitle: "Currency & Locale",
  },
  currencyChange: {
    title: "Change currency",
    pairedMessage:
      "Switching to {{to}} changes the currency symbol, but your amounts stay the same numbers. Your data is synced with a paired partner, so amounts can't be converted automatically - unpair first if you want to convert them.",
    fetchingRate: "Fetching today's exchange rate...",
    convertQuestion:
      "Convert your existing amounts from {{from}} to {{to}} at the rate below, or just change the symbol and keep the same numbers?",
    rateToday: "Today's rate",
    rateCached: "Rates from {{when}} (couldn't reach live rates)",
    rateOffline: "Offline - using a built-in estimate",
    rateLine: "{{prefix}}: 1 {{from}} = {{rate}} {{to}}",
    convertButton: "Convert my amounts",
    symbolOnlyPaired: "Change symbol only",
    symbolOnly: "Just change the symbol",
  },
  privacy: {
    label: "Privacy Mode",
    enabled: "Screenshots & screen recording blocked",
    disabled: "Screenshots & screen recording allowed",
    onTitle: "Privacy Mode On",
    offTitle: "Privacy Mode Off",
    onMessage: "Screenshots and screen recording are now blocked.",
    offMessage: "Screenshot and screen recording protection is disabled.",
  },
  appLock: {
    label: "App Lock",
    enabled: "PIN required when the app opens",
    disabled: "Ask for a PIN when the app opens",
  },
  holdings: {
    label: "Live Holdings",
    enabled: "Tracking stocks & ETFs in your net worth",
    disabled: "Track stocks & ETFs in your net worth",
    enabledTitle: "Live Holdings On",
    enabledMessage: "Add stocks and ETFs from the Bridge tab. Prices refresh about once a day.",
    enable: "Enable",
  },
  haptics: {
    label: "Haptic Feedback",
    enabled: "Subtle vibrations on key actions",
    disabled: "Vibrations disabled",
  },
  reminders: {
    label: "Tracking Reminders",
    off: "Nudges to log spending & plan each month",
    afterQuietDays_one: "After a quiet day",
    afterQuietDays_other: "After {{count}} quiet days",
    afterQuietWeek: "After a quiet week",
    checkInsAndMonthStart: "Check-ins & month-start planning",
    monthStart: "Month-start planning",
    nothingSelected: "Nothing selected",
    mornings: "mornings",
    afternoons: "afternoons",
    evenings: "evenings",
    summary: "{{what}} · {{when}}",
  },
  updates: {
    checkLabel: "Check for Updates",
    lastChecked: "Last checked {{when}}",
    neverChecked: "Never checked",
    autoLabel: "Auto Updates",
    autoOff: "Off - manual checks only",
    autoOn: "On - checks automatically",
    unavailableTitle: "Updates Unavailable",
    unavailableMessage:
      "Update checks are unavailable in development builds. Install an EAS preview/production build to use this feature.",
    upToDateTitle: "Up to Date",
    upToDateMessage: "No update is currently available. Last checked {{when}}.",
    rejectedTitle: "Update Rejected",
    rejectedMessage:
      "This update was rejected because it targets an older runtime version. This may indicate a rollback attempt.",
    failedTitle: "Update Check Failed",
    failedNetwork: "Could not reach the update server. Check your internet connection and try again.",
    failedGeneric: "Unable to check for updates right now. Please try again shortly.",
    failedDetails: "{{friendly}}\n\nDetails: {{details}}",
    modeSavedTitle: "Update Mode Saved",
    modeManualMessage:
      "Manual mode is on. The app will only check for updates when you tap Check for Updates.",
    modeAutoMessage: "Automatic update checks are enabled.",
    readyTitle: "Update Ready",
    readyMessage: "A new update is ready to install.",
    published: "Published {{when}}",
    later: "Later",
    installNow: "Install Now",
    installFailedTitle: "Install Failed",
    installFailedMessage: "The update could not be applied right now. Please try again.",
  },
} as const;
