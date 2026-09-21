/**
 * BudgetArk - English strings: Budget tab (tools)
 * File: src/i18n/locales/en/budgetTools.ts
 *
 * Covers: GlobalSearchModal, BillCalendarModal, MonthlyReviewModal.
 * Search option chips are keyed by the option ids from utils/searchFilter
 * so the pure helper keeps owning the ids while the label lives here.
 */

export const budgetTools = {
  search: {
    title: "Search",
    subtitle: "Find anything you have recorded - debts, payments, and budget entries.",
    closeA11y: "Close search",
    placeholder: 'Try "chase", "grocery", or an amount',
    inputA11y: "Search everything",
    clearA11y: "Clear search",
    filtersToggle: "Filters",
    filtersToggleCount: "Filters ({{count}})",
    filtersA11y: "Filters, {{count}} active",
    reset: "Reset",
    resetA11y: "Reset filters",
    scopeLabel: "Search in",
    scope: {
      all: "Everything",
      debts: "Debts",
      payments: "Payments",
      entries: "Budget",
    },
    dateLabel: "Date",
    datePreset: {
      any: "Any time",
      "30d": "Last 30 days",
      "90d": "Last 90 days",
      year: "This year",
    },
    entryTypeLabel: "Budget entry type",
    entryType: {
      all: "Income + expenses",
      income: "Income",
      expense: "Expenses",
    },
    categoriesLabel: "Categories",
    amountLabel: "Amount",
    minPlaceholder: "Min",
    minA11y: "Minimum amount",
    maxPlaceholder: "Max",
    maxA11y: "Maximum amount",
    promptTitle: "Search your records",
    promptBody:
      "Type a debt name, a note, a merchant, a category, or an amount - or open Filters to browse by date, type, or category.",
    noMatchesTitle: "No matches",
    noMatchesBody: "Try fewer words or looser filters.",
    debtsHidden: "Debts don't show while a date, entry type, or category filter is on.",
    sectionDebts: "DEBTS · {{count}}",
    sectionPayments: "DEBT PAYMENTS · {{count}}",
    sectionEntries: "BUDGET ENTRIES · {{count}}",
    debtA11y: "Debt {{name}}",
    paymentA11y: "Payment to {{name}}",
    entryA11y: "Budget entry {{name}}",
    apr: "{{rate}}% APR",
    paidOff: "Paid off 🎉",
    truncation: "Showing the first {{shown}} of {{total}} - narrow the search to see the rest.",
  },
  billCalendar: {
    title: "Bill Calendar",
    stats: {
      bills: "Bills",
      paid: "Paid",
      remaining: "Remaining",
    },
    nextLabel: "NEXT",
    nextRow: "{{name}} · {{amount}} · {{when}}",
    when: {
      today: "today",
      tomorrow: "tomorrow",
      daysAgo: "{{count}}d ago",
      inDays: "in {{count}}d",
    },
    /** Sunday-first single-letter weekday headers, matching the grid. */
    weekdays: {
      sun: "S",
      mon: "M",
      tue: "T",
      wed: "W",
      thu: "T",
      fri: "F",
      sat: "S",
    },
    showOneOff: "Show one-off expenses too",
    emptyHint:
      "No recurring bills land in this month. Add a recurring expense from the Add Entry sheet and set its day-of-month to see it here.",
    paidActual: "✓ Paid (actual)",
    payButton: "Pay ↗",
    payA11y: "Open payment site for {{name}}",
    linkError: {
      title: "Can't open this link",
      invalid: "The saved URL isn't a valid http(s) address. Edit the bill to fix it.",
      noBrowser: "No browser is available to open the URL.",
      failed: "Something went wrong opening the URL.",
    },
  },
  monthlyReview: {
    title: "Monthly Review",
    emptyTitle: "Not enough data yet",
    emptyBody: "Add budget entries for at least 2 months to see trends, category changes, and streaks.",
    vsAverage: {
      title: "This Month vs. Average",
      thisMonth: "This month",
      avgPerMonth: "Avg / month",
      change: "Change",
    },
    byPerson: {
      title: "Spending by Person",
      hint: "Assigned expenses this month",
    },
    comparison: {
      title: "Category Spending Comparison",
      hint: "vs. trailing 3-month average",
      row: "{{current}} this month · avg {{average}}",
      new: "New",
      stopped: "Stopped",
      flat: "Flat",
    },
    spendingTrend: "Spending Trend",
    netIncomeTrend: "Net Income Trend",
    streaks: {
      title: "Streaks",
      months: "{{count}} mo",
    },
    changes: {
      title: "Category Changes",
      hint: "vs. previous month",
    },
  },
} as const;
