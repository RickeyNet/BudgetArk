/**
 * BudgetArk - English strings: Budget tab (spending)
 * File: src/i18n/locales/en/budgetSpending.ts
 *
 * Covers: SpendingCard, BudgetBucketCard, BudgetLimitsModal, FoodSplitModal.
 */

export const budgetSpending = {
  spendingCard: {
    title: "Spending",
    splitFood: "Split Food ({{count}})",
    limitsA11y: "Set monthly limits for every category",
    tapToExpand: "Tap row to expand · ",
    limitsLink: "Limits ›",
    tapToExpandHold: "Tap row to expand · Hold for limit",
    businessOnlyA11y: "Show business expenses only",
    businessOnlyChip: "💼 Business only",
    limitsHiddenFiltered: "Limits hidden while filtered",
    total: "Total",
    emptyBusinessTitle: "No business expenses this month",
    emptyTitle: "No expenses this month",
    emptyBusinessSubtext: "Tag an expense with a business to see it here.",
    emptySubtext: "Add entries to see your spending chart.",
    pace: {
      over: "Over limit by {{amount}}",
      atLimit: "At the limit - nothing left this month",
      ahead: "Ahead of pace - on track would be {{amount}} by today",
      onPace: "On pace - {{amount}} expected by today",
    },
    expandedHeader_one: "Expanded - {{count}} entry",
    expandedHeader_other: "Expanded - {{count}} entries",
    loggedPayment: {
      title: "Logged debt payment",
      message:
        "This payment was logged on the Debts tab. To edit or delete it, open the debt's payment history there.",
    },
    deletedBusiness: "(deleted)",
    owed: " · {{amount}} owed",
    paidBack: " · paid back",
    billFallback: "Bill",
    billEstimate: " · est. {{amount}}",
    logActualA11y: "Log the actual charge for {{name}}",
    logActual: "Log actual",
    auto: "Auto",
    showMoreA11y_one: "Show {{count}} more entry",
    showMoreA11y_other: "Show {{count}} more entries",
    showMore_one: "Show {{count}} more entry",
    showMore_other: "Show {{count}} more entries",
  },
  buckets: {
    title: "50/30/20",
    takeHome: "Take-home this month: {{amount}}",
    emptyTitle: "Add income to see the 50/30/20 split",
    emptySubtext: "Log Salary or Freelance income for this month.",
    onTarget: "On target for {{bucket}}",
    overTarget: "{{amount}} over target on {{bucket}}",
    underTarget: "{{amount}} under target on {{bucket}}",
    targetChip: "{{percent}}% target",
    hide: "Hide",
    show: "Show",
    emptyBucket: "No spending in this bucket this month.",
    override: " (override)",
    reassignHint: "Long-press a category to reassign its bucket.",
  },
  limits: {
    title: "Monthly Limits",
    subtitle:
      "{{month}}. A limit set here carries into later months until you change it. Leave a field blank for no limit.",
    loadFailed: "Couldn't load your limits.",
    saveFailed: "Couldn't save your limits.",
    saving: "Saving...",
    copyLastMonth: "Copy last month",
    useAverages: "Use 3-month averages",
    spent: "Spent {{amount}}",
    avg: "avg {{amount}}",
    lastMonth: "last month {{amount}}",
    useAverageA11y: "Use the average for {{category}}",
    avgChip: "avg",
    nonePlaceholder: "none",
    limitInputA11y: "Monthly limit for {{category}}",
    loading: "Loading...",
  },
  foodSplit: {
    title: "Split Food Entries",
    subtitle: "Review each Food expense and assign Grocery or Restaurant.",
    apply: "Apply Split",
  },
} as const;
