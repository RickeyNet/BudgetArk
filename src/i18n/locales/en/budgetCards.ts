/**
 * BudgetArk - English strings: Budget tab (cards)
 * File: src/i18n/locales/en/budgetCards.ts
 *
 * Covers: PaycheckCycleCard, MonthBalancePromptModal, CashFlowCard,
 * TrackingReminderOfferCard, DebtDueReminderBanner, DueDateReminderBanner,
 * SpendingPaceBanner.
 *
 * Ordinal days: English wants "12th", German "12.". Components pick the
 * English plural-rule bucket (one/two/few/other) and read the suffix from
 * `paycheck.ordinalSuffix`, so a locale with a single suffix just repeats
 * it; `dayOrdinal` then assembles day + suffix.
 */

export const budgetCards = {
  paycheck: {
    title: "Until Payday",
    change: "Change",
    emptyIntro:
      "Tell BudgetArk when you get paid and it will show what is due before your next check - and what is safe to spend until then.",
    setUp: "Set up pay periods",
    noNextPayday: "Your pay schedule couldn't produce a next payday - check it.",
    howOften: "How often are you paid?",
    frequency: {
      weekly: "Weekly",
      biweekly: "Every 2 weeks",
      semimonthly: "Twice a month",
      monthly: "Monthly",
    },
    recentPayday: "Your most recent payday",
    paydays: "Paydays",
    payday: "Payday",
    semimonthly: {
      "1-15": "1st & 15th",
      "15-last": "15th & last day",
    },
    lastDay: "Last day",
    ordinalSuffix: { one: "st", two: "nd", few: "rd", other: "th" },
    dayOrdinal: "{{day}}{{suffix}}",
    pickPayday: "Pick a recent payday first.",
    saveFailed: "Couldn't save your pay schedule.",
    saveSchedule: "Save schedule",
    privacyHint: "Stays on this phone. Only used to slice your budget into pay periods.",
    nextCheck: "Next check {{date}} · {{when}}",
    tomorrow: "tomorrow",
    inDays_one: "in {{count}} day",
    inDays_other: "in {{count}} days",
    dueBefore: "Due before then",
    nothingDue: "Nothing on the calendar before your next check.",
    today: "today",
    overdue: "overdue · {{date}}",
    showFewer: "Show fewer",
    showMore: "+{{count}} more",
    safeUntilPayday: "Safe to spend until payday",
    shortBy: "Short before payday by",
    perDay: "About {{amount}} a day. ",
    cashNow:
      "Cash now ≈ {{amount}}: your starting balance plus what the ledger says has landed so far this month.",
    recordBalance:
      "Record this month's starting checking balance and this card will also say what is safe to spend until payday. ",
    setIt: "Set it",
  },
  monthBalance: {
    promptTitle: "New month - update your balance",
    title: "Starting balance",
    subtitle:
      "What's in checking at the start of {{month}}? BudgetArk uses it to project your end-of-month cash and what's safe to spend.",
    inputPlaceholder: "0.00",
    inputA11y: "Starting checking balance",
    usePrefill: "Use Bridge checking total: {{amount}}",
    alsoUpdates: "Also updates \"{{account}}\" on your Bridge so net worth stays current.",
    saveFailed: "Couldn't save your balance. Please try again.",
    notNow: "Not now",
    saving: "Saving…",
  },
  cashFlow: {
    title: "Cash Flow",
    emptyIntro:
      "Enter this month's starting checking balance and BudgetArk will project where the month ends - and what's safe to spend.",
    setStarting: "Set starting balance",
    update: "Update",
    startingCash: "Starting cash",
    projectedEnd: "Projected end of month",
    safeToSpend: "Safe to spend",
    overPlanBy: "Over plan by",
    hint: "Income minus spending this month, including planned bills and debt minimums.",
    reconcileOnPlan: "Started right on last month's plan",
    reconcileAbove: "Started {{amount}} above last month's plan",
    reconcileBelow: "Started {{amount}} below last month's plan",
  },
  reminderOffer: {
    eyebrow: "TRACKING REMINDERS",
    title: "🔔 Want a nudge to keep tracking?",
    body:
      "A short check-in if a few days pass without an entry, and a heads-up on the 1st. Never an amount, balance, account, or bill - just a tap back into the app. Adjust or turn off any time in Profile → Tracking Reminders.",
    turnOn: "Turn on",
    asking: "Asking your phone...",
    noThanks: "No thanks",
    permissionTitle: "Notifications are off",
    permissionMessage:
      "BudgetArk needs notification permission to send check-in reminders. You can turn it on in your phone's Settings, then enable reminders from Profile → Tracking Reminders.",
    notNow: "Not now",
    openSettings: "Open Settings",
    failedTitle: "Couldn't turn on reminders",
    failedMessage:
      "Something went wrong saving the setting. You can try again from Profile → Tracking Reminders.",
  },
  debtDue: {
    eyebrow: "DEBT PAYMENT REMINDER",
    summary_one: "{{count}} debt minimum due in the next {{days}} days",
    summary_other: "{{count}} debt minimums due in the next {{days}} days",
    total: "{{amount}} minimum total (from Debts tab)",
    next: "Next: {{name}} · {{amount}} · {{when}}",
    today: "today",
    tomorrow: "tomorrow",
    inDays_one: "in {{count}} day",
    inDays_other: "in {{count}} days",
  },
  dueDate: {
    eyebrow: "DUE-DATE REMINDER",
    summary_one: "{{count}} bill scheduled in the next {{days}} days",
    summary_other: "{{count}} bills scheduled in the next {{days}} days",
    total: "{{amount}} scheduled total",
    next: "Next: {{name}} · {{amount}} · {{when}}",
    today: "today",
    tomorrow: "tomorrow",
    inDays_one: "in {{count}} day",
    inDays_other: "in {{count}} days",
  },
  pace: {
    eyebrow: "SPENDING PACE",
    overTitle: "{{category}} is over its {{limit}} limit by {{overBy}}",
    overDetail: "Anything more in this category this month comes out of the plan.",
    aheadTitle: "{{category}} is {{percent}}% spent and it's only the {{dayOrdinal}}",
    aheadDetail:
      "At this pace it ends the month at {{projected}} against a {{limit}} limit - {{expected}} would be on track by today.",
    more_one: "+{{count}} more category off pace: {{list}}",
    more_other: "+{{count}} more categories off pace: {{list}}",
    listSeparator: ", ",
  },
} as const;
