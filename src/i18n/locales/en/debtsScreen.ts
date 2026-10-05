/**
 * BudgetArk - English strings: Debts tab (screen)
 * File: src/i18n/locales/en/debtsScreen.ts
 *
 * Covers: DebtTrackerScreen.tsx (tab shell: header, strategy, milestones /
 * Build Your Ark, lists, alerts, undo). Milestone ids (keel, hull, deck,
 * supplies, gather_animals, moorings, sail) and strategy ids (avalanche,
 * snowball, custom) are identifiers - only their labels live here.
 */

export const debtsScreen = {
  header: {
    title: "Debt Tracker",
    subtitle: "Track your progress. Crush your debt.",
    searchA11y: "Search debts, payments, and budget entries",
  },
  summary: {
    totalRemaining: "TOTAL REMAINING",
    paidOff: "{{amount}} paid off",
    ringA11y: "Payoff {{percent}} percent. Tap to view payment history.",
    viewHistory: "🕐 View history",
  },
  owner: {
    all: "All",
    mine: "Mine",
    partner: "Partner",
    joint: "Joint",
  },
  milestoneBar: {
    step: "Step {{step}}/{{total}} • {{title}}",
    runway: " • {{months}} mo runway",
    goal: " • {{name}} {{percent}}%",
    tapToPlan: "{{strategy}} • Tap to plan",
    ark: "Build Your Ark →",
  },
  strategy: {
    labels: {
      avalanche: "Avalanche",
      snowball: "Snowball",
      custom: "Custom order",
    },
    order: {
      avalanche: "Avalanche order",
      snowball: "Snowball order",
      custom: "Custom order",
    },
  },
  sections: {
    debts: "Debts",
  },
  empty: {
    title: "Build Your Ark",
    sub: "Add debt accounts when you are ready, or map your milestone targets first.",
    setUp: "Set Up Milestones",
  },
  payoff: {
    notSolvable: "Not solvable",
    zeroMonths: "0 months",
    months: "{{count}} mo",
    years: "{{count}} yr",
    yearsMonths: "{{years}} yr {{months}} mo",
    interest: "{{amount}} int.",
    interestDash: "— int.",
    makesPossible: "Makes payoff possible",
    stillNotEnough: "Still not enough to pay off",
    savings: "Save {{amount}} • {{months}} mo faster",
    rec: {
      increase: "Increase payments until both plans are solvable.",
      avalanche: "Lowest interest: Avalanche.",
      snowball: "Lowest interest: Snowball.",
      tie: "Tie - both methods cost the same interest.",
    },
  },
  milestones: {
    title: "Build Your Ark Milestones",
    message: "Keel to Hull to Deck to Supplies to Sail. Follow each stage at your pace.",
    complete: "Complete",
    completed: "Completed",
    rebuild: "Rebuild",
    current: "Current",
    targetPlaceholder: "Target",
    saveTarget: "Save Target",
    compareTitle: "Compare Payoff Strategies",
    extraLabel: "EXTRA MONTHLY PAYMENT",
    avalancheHint: "Highest APR first",
    snowballHint: "Smallest balance first",
    currentColumn: "Current",
    perMonth: "+{{amount}}/mo",
    currentMethod: "Current Method",
    useAvalanche: "Use Avalanche",
    useSnowball: "Use Snowball",
    trackedLinked_one:
      "🛡️ Tracked from your designated emergency-fund savings account ({{amount}}). Update those balances on the Bridge - bank syncing keeps them current automatically.",
    trackedLinked_other:
      "🛡️ Tracked from your {{count}} designated emergency-fund savings accounts ({{amount}}). Update those balances on the Bridge - bank syncing keeps them current automatically.",
    setSavings: "Set Savings",
    currentAmount: "Current: {{amount}}",
    set: "Set",
    collapse: "Collapse",
    markInProgress: "Mark In Progress",
    markComplete: "Mark Complete",
    arkComplete: "Ark Complete",
    arkCompleteMessage: "You have finished your Ark. Now set sail and find new lands.",
    congrats: {
      keel: "Great start. Your foundation is in place.",
      hull: "Strong work. All non-mortgage debt is cleared.",
      deck: "Excellent discipline. Your emergency fund is fully funded.",
      supplies: "Nice consistency. Your retirement investing is on track.",
      gather_animals: "Well done. Your children's future is being built.",
      moorings: "Incredible. Your home is paid off.",
      sail: "You did it. Your Ark is complete. Build wealth and give generously.",
      default: "Congratulations! Another milestone complete. Keep going.",
    },
    action: {
      supplies: "Invest",
      gather_animals: "Gather",
      moorings: "Secure",
      sail: "Launch",
      default: "Build",
    },
  },
  /** Description written onto the Savings entry the Ark editor logs. */
  savingsEntry: {
    logged: "Logged from Build Your Ark",
    correction: "Correction from Build Your Ark",
  },
  alerts: {
    couldntSave: "Couldn't save",
    keepAliveUse: "The card's last-used date wasn't updated. Please try again.",
    keepAliveMute: "The reminder wasn't muted. Please try again.",
  },
  undo: {
    edited: "Edited \"{{name}}\"",
    deleted: "Deleted \"{{name}}\"",
  },
  deleteDialog: {
    title: "Delete Debt",
    message: "Delete {{name}}? This cannot be undone.",
  },
} as const;
