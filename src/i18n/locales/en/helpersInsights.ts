/**
 * BudgetArk - English strings: pure helpers (insights)
 * File: src/i18n/locales/en/helpersInsights.ts
 *
 * Covers: budgetInsights (streak labels, deleted-person placeholder),
 * unusualCharges (describeUnusualCharge), tipJarNudge (tipNudgeCopyFor),
 * reviewInboxSections (section titles), recurrence (getRecurrenceTag).
 * Read from plain modules via src/i18n/translate.ts.
 */

export const helpersInsights = {
  streaks: {
    positiveNet: "Positive net income",
    allUnderBudget: "All categories under budget",
    spendingDecreasing: "Spending decreasing",
    spendingIncreasing: "Spending increasing",
  },
  people: {
    deletedPerson: "(deleted person)",
  },
  unusual: {
    firstTime: "First charge from this merchant - worth a look",
    aboveUsual: "{{ratio}}× the usual {{usual}} - worth a look",
  },
  tipNudge: {
    debtPayoff: {
      titleWithLabel: "{{label}} is gone. That's the whole idea.",
      title: "One debt gone. That's the whole idea.",
      body: "BudgetArk stays free and ad-free, with no account and nothing leaving your phone, because people who hit moments like this chip in. A tip is optional and unlocks nothing - the app is already all yours.",
    },
    billPaid: {
      titleWithLabel: "{{label}} settled, budget line adjusted",
      title: "Bill settled, budget line adjusted",
      body: "BudgetArk is free and ad-free with nothing leaving your phone. If it makes bill day easier, an optional tip keeps it that way. Nothing to unlock.",
    },
    debtPayment: {
      title: "Another chip off the balance",
      body: "BudgetArk is free, ad-free, and keeps everything on your phone. If it's helping, an optional tip keeps it sailing - nothing to unlock.",
    },
  },
  inbox: {
    duplicates: "Possibly already in your budget",
    transfers: "Likely transfers",
    otherTransactions: "Other transactions",
  },
  recurrence: {
    // Keyed by RecurrenceInterval (months). Short tags for entry rows.
    tag: {
      "1": "Monthly",
      "3": "Quarterly",
      "6": "6 mo",
      "12": "Yearly",
    },
  },
} as const;
