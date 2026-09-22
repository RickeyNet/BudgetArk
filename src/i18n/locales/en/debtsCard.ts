/**
 * BudgetArk - English strings: Debts tab (card)
 * File: src/i18n/locales/en/debtsCard.ts
 *
 * Covers: DebtCard.tsx + PaymentHistoryModal.tsx. Owner / debt-class
 * labels are keyed by the DebtOwner / DebtClass ids from src/types so the
 * card can translate an option it only knows by id.
 */

export const debtsCard = {
  card: {
    status: {
      almost: "Almost there!",
      progress: "Making progress",
      keepGoing: "Keep going",
    },
    collapsedDetail: "{{balance}} · {{rate}}% APR",
    rateLine: "{{rate}}% APR · {{minimum}}/mo minimum",
    meta: "Owner: {{owner}} · Type: {{type}}",
    reviewType: "Review type",
    remaining: "REMAINING",
    paidOff: "PAID OFF",
    bankSync: "Balance from {{account}}",
    bankSyncAsOf: "Balance from {{account}} · as of {{date}}",
    goal: {
      passed: "Goal date has passed",
      line: "Goal: {{date}} ({{monthsLeft}})",
      monthsLeft_one: "{{count}} mo left",
      monthsLeft_other: "{{count}} mo left",
      onTrack: "On track",
      need: "Need {{amount}}/mo",
    },
    keepAlive: {
      active: "Card active · next use by {{date}}",
      overdue: "Inactivity deadline passed ({{date}}) · use it soon",
      useBy: "Use by {{date}} ({{when}})",
      today: "today",
      tomorrow: "tomorrow",
      days_one: "{{count}} day",
      days_other: "{{count}} days",
      usedIt: "I used it",
    },
    timeline: {
      adjust: "Adjust payment plan",
      months_one: "{{count}} month to payoff",
      months_other: "{{count}} months to payoff",
    },
    pay: "Pay",
    deleteA11y: "Delete {{name}}",
    confirmPaymentA11y: "Confirm payment",
    paymentPlaceholder: "Payment amount",
  },
  history: {
    title: "Payment History",
    totalPaid: "Total paid: {{amount}}",
    deletedDebt: "Deleted Debt",
    empty: {
      title: "No Payments Yet",
      subtitle: "Payments you make will show up here.",
    },
    selected_one: "{{count}} selected",
    selected_other: "{{count}} selected",
    deleteSelectedA11y: "Delete selected payments",
    deleted_one: "Deleted {{count}} payment",
    deleted_other: "Deleted {{count}} payments",
    undoA11y: "Undo delete payments",
    undo: "UNDO",
  },
} as const;
