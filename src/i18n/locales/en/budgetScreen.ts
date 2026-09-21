/**
 * BudgetArk - English strings: Budget tab (screen)
 * File: src/i18n/locales/en/budgetScreen.ts
 *
 * Covers: BudgetScreen.tsx (the tab shell: header, month nav, sections, alerts).
 * Bucket labels are keyed by the BudgetBucket id ("needs" | "wants" |
 * "savings") so the screen can translate a bucket it only knows by id;
 * the English `BUDGET_BUCKET_LABELS` table in src/data stays the storage/
 * report vocabulary.
 */

export const budgetScreen = {
  header: {
    title: "Budget",
    subtitle: "Track income, expenses, and category limits.",
    billCalendarA11y: "Bill calendar",
    searchA11y: "Search debts, payments, and budget entries",
    inboxA11y: "Review inbox, {{count}} waiting",
  },
  monthNav: {
    previousA11y: "Previous month",
    nextA11y: "Next month",
  },
  insights: {
    title: "Insights",
    hint: "Trends, changes, streaks, comparisons",
  },
  summary: {
    income: "Income",
    spent: "Spent",
    net: "Net",
    plannedMinimums: "Includes {{amount}} planned debt minimums from the Debts tab",
    retirement: "Plus {{amount}} into your 401(k) this month (not counted as income)",
    taxSetAside: "Set aside {{amount}} of this month's 1099 income for taxes",
  },
  selection: {
    cancelA11y: "Cancel selection",
    selected_one: "{{count}} selected",
    selected_other: "{{count}} selected",
    recategorize: "Recategorize",
    recategorizeA11y: "Recategorize selected entries",
    deleteA11y: "Delete selected entries",
    moveTitle_one: "Move {{count}} entry to…",
    moveTitle_other: "Move {{count}} entries to…",
  },
  bucket: {
    title: "Reassign Bucket",
    currently: " - currently {{bucket}}",
    useDefault: "Use default ({{bucket}})",
  },
  limit: {
    title: "Set Monthly Limit",
    placeholder: "0.00",
    hint: "Leave empty to remove limit.",
  },
  emergencyFund: {
    title: "Emergency Fund",
    currentBalance: "Current balance: {{amount}}",
    target: " / {{amount}}",
    tracked_one: " • tracked from {{count}} designated savings account",
    tracked_other: " • tracked from {{count}} designated savings accounts",
    placeholder: "Amount to add (or negative to withdraw)",
    hint: "Enter a positive number to contribute, or negative to withdraw.",
  },
  undo: {
    edited: "Edited \"{{label}}\"",
    deleted: "Deleted \"{{label}}\"",
    deletedEntry: "Deleted entry",
    deletedCount_one: "Deleted {{count}} entry",
    deletedCount_other: "Deleted {{count}} entries",
    moved_one: "Moved {{count}} entry to {{category}}",
    moved_other: "Moved {{count}} entries to {{category}}",
  },
} as const;
