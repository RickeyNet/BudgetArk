/**
 * BudgetArk - English strings: shared modals (engage)
 * File: src/i18n/locales/en/modalsEngage.ts
 *
 * Covers: TipJarModal, TrackingRemindersModal, FeatureSpotlightModal,
 * OnboardingGuideModal, AchievementUnlockModal, NewFeatureBadge, and the
 * App.tsx update-ready / what's-new dialogs.
 * Spotlight copy (FEATURE_SPOTLIGHTS), coachmark content and badge
 * names/descriptions come from src/data and are keyed separately when
 * that data pass happens; only the chrome around them lives here.
 */

export const modalsEngage = {
  tipJar: {
    title: "Tip Jar",
    intro:
      "If BudgetArk has helped you, you can leave a small one-time tip. It's completely optional and unlocks nothing - every feature stays free for everyone.",
    /** Tier labels keyed by the tail of the consumable SKU. */
    tiers: {
      small: "Small tip",
      medium: "Medium tip",
      large: "Large tip",
    },
    /** Store names keyed by Platform.OS. */
    store: {
      ios: "the App Store",
      android: "Google Play",
    },
    contacting: "Contacting {{store}}...",
    unavailable: "Tips aren't available right now. Please try again later.",
    pendingApproval: "Your tip is pending approval from {{store}}. Thank you!",
    purchaseFailed: "The purchase could not be completed.",
    privacy:
      "Tips are processed entirely by {{store}}. BudgetArk never sees, collects, or stores any payment details.",
    thanks: {
      title: "Thank you!",
      body: "Your tip helps keep BudgetArk sailing. Nothing changed in the app - it was already all yours.",
      logged:
        "🎁 Added to your budget under Giving. You can edit or remove it there like any other entry.",
      logPrompt:
        "Want to count this tip in your budget? It'll be added as a {{price}} expense today under the Giving category.",
      logButton: "Add to Budget · Giving 🎁",
      logFailed:
        "Couldn't save the entry. You can try again, or add it later from the Budget tab.",
      noThanks: "No Thanks",
    },
  },
  reminders: {
    title: "Tracking Reminders",
    intro:
      "Gentle nudges that keep your budget honest - a check-in when you've gone quiet, and a fresh-month reminder to plan ahead.",
    enable: {
      label: "Enable reminders",
      on: "Scheduled on this device from your own activity",
      off: "No reminders scheduled",
    },
    permission: {
      title: "Notifications are off",
      body: "BudgetArk needs notification permission to send check-in reminders. You can turn it on in your phone's Settings.",
      notNow: "Not now",
      openSettings: "Open Settings",
    },
    sections: {
      remindAbout: "REMIND ME ABOUT",
      afterQuietFor: "AFTER NOT TRACKING FOR",
      timeOfDay: "TIME OF DAY",
    },
    checkIns: {
      label: "Logging expenses",
      description:
        "When you haven't tracked for a while - logging an entry resets the timer",
    },
    monthStart: {
      label: "Month-start planning",
      description: "On the 1st: set this month's goals & review last month",
    },
    /** Keyed by ReminderCadenceDays. */
    cadence: {
      "1": "Daily",
      "3": "Every 3 days",
      "7": "Weekly",
    },
    /** Keyed by ReminderHour. */
    hour: {
      "9": "Morning",
      "13": "Afternoon",
      "19": "Evening",
    },
    privacy:
      "Check-ins are scheduled entirely on this device and contain no amounts or account details. Nothing is sent anywhere - BudgetArk has no server.",
  },
  spotlight: {
    newIn: "NEW IN {{version}}",
    fullReleaseNotes: "Full release notes",
    fullReleaseNotesA11y: "Open full release notes",
    skipA11y: "Skip the feature tour",
    nextA11y: "Next feature",
  },
  guide: {
    title: "Onboarding",
    intro:
      "Everything in BudgetArk - browse by tab, or search for what you want to do.",
    searchPlaceholder: 'Search - try "receipt" or "credit card"',
    clearSearchA11y: "Clear search",
    noMatches: {
      title: "No matches",
      body: 'Try a different word - like "backup", "notification", "recurring", or the name of a tab.',
    },
    redoOnboarding: "Redo onboarding",
  },
  unlock: {
    kicker: "BADGE UNLOCKED",
    moreToCelebrate_one: "+{{count}} more to celebrate",
    moreToCelebrate_other: "+{{count}} more to celebrate",
    nextBadge: "Next badge",
    keepGoing: "Keep Going",
  },
  newBadge: "NEW",
  /** App-root OTA "update ready" dialog (App.tsx). */
  updateReady: {
    title: "Update Ready",
    defaultMessage: "A new update is ready to install.",
    moreInReleaseNotes: "+{{n}} more in Release Notes",
    published: "Published {{when}}",
    later: "Later",
    installNow: "Install Now",
  },
  /** App-root "what's new in this version" prompt (App.tsx). */
  whatsNew: {
    title: "New in v{{version}}",
    more: "+{{n}} more",
    seeWhatsNew: "See what's new",
    maybeLater: "Maybe later",
  },
} as const;
