/**
 * BudgetArk - English strings: Bridge tab (reports)
 * File: src/i18n/locales/en/bridgeReports.ts
 *
 * Covers: AnnualReportModal, NetWorthHistoryCard, CashFlowChart, TrackingStripCard, Medal.
 * The annual report's SHARE text is built by utils/annualReport and is not
 * in this tree yet.
 */

export const bridgeReports = {
  annual: {
    title: "Annual Report",
    subtitle: "Your {{year}} in review",
    closeA11y: "Close annual report",
    empty: {
      title: "Nothing logged for {{year}}",
      body: "Add budget entries, record debt payments, or track accounts and your {{year}} report will fill in automatically.",
    },
    tiles: {
      debtPaid: "Debt paid",
      payments_one: "{{count}} payment",
      payments_other: "{{count}} payments",
      setAside: "Set aside",
      setAsideHint: "Savings · Retire · Invest",
      netWorthChange: "Net worth change",
      notEnoughHistory: "Not enough history",
      startVsEnd: "Start vs. end of year",
      savingsRate: "Savings rate",
      savingsRateHint: "Income kept, not spent",
    },
    cashFlow: {
      title: "Cash Flow",
      income: "Income",
      expenses: "Expenses",
      netSaved: "Net saved",
    },
    underBudget: {
      title: "Months Under Budget",
      hint: "Months where every category with a limit stayed under it. A full year of limits is kept, so the current year is fully covered; older years may have aged-out limits.",
    },
    topCategories: "Top Spending Categories",
    trend: "Spending by Month",
    share: {
      button: "Share summary",
      a11y: "Share annual summary",
      note: "Shares totals and percentages only - no names or details.",
    },
  },
  history: {
    title: "Net Worth",
    subtext: "Assets {{assets}} · Debt {{debt}}",
    ranges: {
      "7D": "7D",
      "30D": "30D",
      ALL: "All",
    },
    change: "Change",
    sinceStart: "Since start",
    rangeChange: "{{range}} change",
    empty: "Tracking starts when first snapshot saves.",
    footer: "Daily snapshots. History starts now.",
  },
  cashFlowChart: {
    title: "Monthly Cash Flow",
    subtitle: "Income vs Expenses",
    legendIn: "In",
    legendOut: "Out",
    empty: "Add a few months of income and expenses to see cash flow.",
  },
  trackingStrip: {
    eyebrow: "THIS MONTH",
    budgetLink: "Budget ›",
    openBudgetA11y: "Open the Budget tab",
    spentOfLimits: "Spent {{spent}} of {{limits}} limits",
    spentThisMonth: "Spent {{spent}} this month",
    empty: "Nothing logged yet. Add your first purchase or paycheck and it shows up here.",
    openEntryA11y: "Open {{label}}, {{amount}}",
    addEntry: "+ Add entry",
    addEntryA11y: "Add a budget entry",
  },
} as const;
