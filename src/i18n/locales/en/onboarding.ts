/**
 * BudgetArk - English strings: Onboarding
 * File: src/i18n/locales/en/onboarding.ts
 *
 * The six-step first-launch flow (OnboardingScreen.tsx). The mission
 * statement and quick-start template copy come from src/data and are not
 * in this tree yet - see the Localization TODO.
 */

export const onboarding = {
  stepOf: "STEP {{step}} OF {{total}}",
  skipSetup: "Skip Setup",
  next: "Next →",
  back: "← Back",
  skip: "Skip",
  mission: {
    footnote:
      "Free, no ads, no account, and your data never leaves your phone. You can reread this anytime at the top of the Profile tab.",
  },
  theme: {
    title: "Choose Your Theme",
    subtitle: "Select a color scheme that matches your style. You can change this later in settings.",
  },
  welcome: {
    title: "Welcome to BudgetArk",
    subtitle: "Your personal finance companion for tracking debt, managing budgets, and building wealth.",
    features: {
      debts: {
        title: "Debts",
        desc: "Track every debt, pick a payoff strategy, follow the Build Your Ark milestones - and keep idle credit cards from being closed",
      },
      budget: {
        title: "Budget",
        desc: "Log income and spending by category, set limits, automate recurring bills, and approve bank imports from the Review Inbox",
      },
      bridge: {
        title: "Bridge",
        desc: "Your home tab: net worth over time, every account you own, purchase plans, and optional live stock tracking",
      },
      charts: {
        title: "Charts",
        desc: "A free 24-lesson finance course, calculators, and what-if projections built from your own numbers",
      },
      profile: {
        title: "Profile",
        desc: "Themes, bank connections, partner sync, backups - and the searchable onboarding guide whenever you need it",
      },
      privacy: {
        title: "Private by design",
        desc: "Everything is encrypted on this phone. BudgetArk has no server - your financial data never leaves your device",
      },
    },
  },
  template: {
    title: "Start from a template?",
    subtitle:
      "Pick the closest fit and BudgetArk sets category limits and your two biggest recurring lines for you. Every number stays editable - it's a first draft, not a lock.",
    startEmpty: {
      title: "Start empty",
      tagline: "No limits or lines - build it as you go",
    },
    incomeLabel: "MONTHLY TAKE-HOME PAY (HOUSEHOLD)",
    incomePlaceholder: "e.g. 4200",
    housingLabel: "RENT OR MORTGAGE",
    housingPlaceholder: "e.g. 1400",
    hint: "Both optional. Limits are set as a share of take-home pay; leave it blank and you can fill them in later from the Budget tab's Limits sheet. Stored only on this phone.",
    startEmptyNext: "Start empty →",
  },
  reminders: {
    title: "Want a nudge to keep tracking?",
    subtitle: "Budgets work when the logging habit sticks. BudgetArk can send two kinds of gentle reminders - and nothing else.",
    checkins: {
      title: "Check-ins when you go quiet",
      desc: "A short \"how's the week going?\" if a few days pass without an entry. Log regularly and you never hear from it.",
    },
    monthStart: {
      title: "A heads-up on the 1st",
      desc: "One note at the start of each month to set goals and glance at last month.",
    },
    privacyTitle: "🔒 Nothing about your money",
    privacyText:
      "Reminders never include an amount, a balance, an account, or a bill - just a nudge to open the app. No payment-due alerts; your bank does those. Change the time and cadence, or turn them off, any time in Profile → Tracking Reminders.",
    enable: "Turn on reminders",
    asking: "Asking your phone...",
    notNow: "Not now",
  },
  name: {
    title: "What should we call you?",
    subtitle: "Choose a display name (optional). This is only stored on your device.",
    placeholder: "Buddy",
    hint: "Leave blank to use the default name \"Buddy\"",
    privacyTitle: "🔒 Privacy First",
    privacyText:
      "No email, phone number, or personal data required. Your information is stored locally on your device and never sent to any server.",
    arkTitle: "Build Your Ark (Optional)",
    arkText: "You can set milestone targets now, or skip for now and do it later from the Debt screen.",
    finishBuildArk: "Finish + Build Your Ark",
    skipForNow: "Skip for Now",
    tourHint:
      "Next, onboarding continues with a guided look at each tab - each tip has a Learn more with the full detail, and you can go back a step or skip at any point. Reread and search all of it later in Profile → Help → Onboarding.",
  },
  alerts: {
    notificationsOff: {
      title: "Notifications are off",
      message:
        "Reminders stay off until notifications are allowed for BudgetArk in your phone's Settings. You can turn them on any time from Profile → Tracking Reminders.",
    },
    saveFailed: {
      title: "Couldn't Save Your Setup",
      message:
        "Your setup couldn't be saved to this device. This usually happens when the phone is very low on free storage. Free up some space and try again, or continue anyway - the app may ask you to set up again next time it opens.",
      tryAgain: "Try Again",
      continueAnyway: "Continue Anyway",
    },
    templateFailed: {
      title: "Template not applied",
      message:
        "Your setup is saved, but the starter limits couldn't be written. You can set limits any time from the Budget tab's Limits sheet.",
    },
  },
} as const;
