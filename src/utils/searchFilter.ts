/**
 * BudgetArk - global search & advanced filters (pure).
 *
 * Powers the Search sheet reachable from the Debts and Budget tabs: one
 * query box plus advanced filters (scope, entry type, categories, date
 * range, amount range) over the three record collections - debts, debt
 * payments, and budget entries. Pure functions over plain data - no React
 * Native imports, fully unit-testable in Node.
 *
 * Matching mirrors guideSearch: the query is lowercased and split on
 * whitespace, and a record matches only when EVERY token appears somewhere
 * in its haystack. Payments carry no text of their own, so they match
 * through their parent debt's name. Results are deliberately NOT
 * relevance-ranked - payments and entries sort newest-first and debts by
 * balance, because "find that charge" browsing reads better in date order
 * than in match-quality order.
 *
 * Filter semantics (deliberate):
 * - Entry-type and category filters describe budget entries only, so
 *   activating either narrows results to entries - listing every debt next
 *   to a "Grocery only" filter would be noise.
 * - A date range applies to dated transactions (payments + entries). Debts
 *   are standing records with no transaction date, so they drop out while a
 *   date range is active; their payments still surface.
 */

import {
  DEBT_CLASS_OPTIONS,
  DEBT_OWNER_OPTIONS,
  type BudgetEntry,
  type Debt,
  type Payment,
} from "../types";

/* ─── Filter model ─── */

export type SearchScope = "all" | "debts" | "payments" | "entries";

export type SearchEntryType = "all" | "income" | "expense";

export type SearchDatePreset = "any" | "30d" | "90d" | "year";

export interface SearchFilters {
  /** Free-text query; tokenized on whitespace, all tokens must match. */
  query: string;
  /** Which record collections to search. */
  scope: SearchScope;
  /** Budget entries only - activating narrows results to entries. */
  entryType: SearchEntryType;
  /** Budget entries only; empty = all categories. */
  categories: string[];
  /** Applies to payments + entries; debts drop out when active. */
  datePreset: SearchDatePreset;
  /** Inclusive bounds on payment/entry amount and debt balance. */
  amountMin?: number;
  amountMax?: number;
}

export const DEFAULT_SEARCH_FILTERS: SearchFilters = {
  query: "",
  scope: "all",
  entryType: "all",
  categories: [],
  datePreset: "any",
  amountMin: undefined,
  amountMax: undefined,
};

export const SEARCH_SCOPE_OPTIONS: readonly {
  id: SearchScope;
  label: string;
}[] = [
  { id: "all", label: "Everything" },
  { id: "debts", label: "Debts" },
  { id: "payments", label: "Payments" },
  { id: "entries", label: "Budget" },
];

export const SEARCH_DATE_PRESET_OPTIONS: readonly {
  id: SearchDatePreset;
  label: string;
}[] = [
  { id: "any", label: "Any time" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
  { id: "year", label: "This year" },
];

export const SEARCH_ENTRY_TYPE_OPTIONS: readonly {
  id: SearchEntryType;
  label: string;
}[] = [
  { id: "all", label: "Income + expenses" },
  { id: "income", label: "Income" },
  { id: "expense", label: "Expenses" },
];

/** Per-group display cap so a bank-synced history can't render 500 rows. */
export const MAX_RESULTS_PER_GROUP = 50;

/** Count of non-default advanced filters (excludes the query) - UI badge. */
export const countActiveFilters = (filters: SearchFilters): number => {
  let count = 0;
  if (filters.scope !== "all") count += 1;
  if (filters.entryType !== "all") count += 1;
  if (filters.categories.length > 0) count += 1;
  if (filters.datePreset !== "any") count += 1;
  if (filters.amountMin !== undefined) count += 1;
  if (filters.amountMax !== undefined) count += 1;
  return count;
};

/** True when the filters would actually search something. */
export const hasActiveSearch = (filters: SearchFilters): boolean =>
  filters.query.trim().length > 0 || countActiveFilters(filters) > 0;

/* ─── Results model ─── */

export interface PaymentSearchHit {
  payment: Payment;
  /** Resolved parent debt name; "(deleted debt)" when unresolvable. */
  debtName: string;
}

export interface SearchResults {
  debts: Debt[];
  payments: PaymentSearchHit[];
  entries: BudgetEntry[];
  /** Match counts BEFORE the per-group display cap. */
  totals: { debts: number; payments: number; entries: number; overall: number };
}

const EMPTY_RESULTS: SearchResults = {
  debts: [],
  payments: [],
  entries: [],
  totals: { debts: 0, payments: 0, entries: 0, overall: 0 },
};

export const DELETED_DEBT_NAME = "(deleted debt)";

/* ─── Matching internals ─── */

const tokenize = (query: string): string[] =>
  query.toLowerCase().split(/\s+/).filter(Boolean);

const matchesTokens = (haystack: string, tokens: readonly string[]): boolean =>
  tokens.every((token) => haystack.includes(token));

const debtClassLabel = (debt: Debt): string =>
  DEBT_CLASS_OPTIONS.find((o) => o.id === debt.debtClass)?.label ?? "";

const debtOwnerLabel = (debt: Debt): string =>
  DEBT_OWNER_OPTIONS.find((o) => o.id === debt.owner)?.label ?? "";

const debtHaystack = (debt: Debt): string =>
  `${debt.name} ${debtOwnerLabel(debt)} ${debtClassLabel(debt)} ${debt.balance}`.toLowerCase();

const paymentHaystack = (payment: Payment, debtName: string): string =>
  `${debtName} ${payment.amount} ${payment.date.slice(0, 10)}`.toLowerCase();

const entryHaystack = (entry: BudgetEntry): string =>
  `${entry.description ?? ""} ${entry.category} ${entry.merchant ?? ""} ${
    entry.type
  } ${entry.amount} ${entry.date.slice(0, 10)}`.toLowerCase();

/**
 * Earliest included timestamp for a preset, or null for "any". Presets are
 * resolved against a caller-supplied `now` so results are deterministic
 * (render purity - stamp `now` at data load, not in render).
 */
const presetCutoffMs = (preset: SearchDatePreset, now: Date): number | null => {
  switch (preset) {
    case "any":
      return null;
    case "30d":
      return now.getTime() - 30 * 24 * 60 * 60 * 1000;
    case "90d":
      return now.getTime() - 90 * 24 * 60 * 60 * 1000;
    case "year":
      return new Date(now.getFullYear(), 0, 1).getTime();
  }
};

/** Inclusive-bounds date check; unparseable dates fail closed (no match). */
const inDateRange = (isoDate: string, cutoffMs: number | null): boolean => {
  if (cutoffMs === null) return true;
  const ms = new Date(isoDate).getTime();
  if (Number.isNaN(ms)) return false;
  return ms >= cutoffMs;
};

const inAmountRange = (
  amount: number,
  min: number | undefined,
  max: number | undefined
): boolean => {
  if (min !== undefined && amount < min) return false;
  if (max !== undefined && amount > max) return false;
  return true;
};

/* ─── Search ─── */

export interface SearchableData {
  debts: Debt[];
  payments: Payment[];
  entries: BudgetEntry[];
}

/**
 * Runs the search. Returns empty groups when nothing is being searched
 * (blank query, all filters default) - the UI shows its prompt state
 * instead of dumping every record.
 */
export const searchRecords = (
  data: SearchableData,
  filters: SearchFilters,
  now: Date
): SearchResults => {
  if (!hasActiveSearch(filters)) return EMPTY_RESULTS;

  const tokens = tokenize(filters.query);
  const cutoffMs = presetCutoffMs(filters.datePreset, now);
  const entryOnly =
    filters.entryType !== "all" || filters.categories.length > 0;

  const includeDebts =
    (filters.scope === "all" || filters.scope === "debts") &&
    !entryOnly &&
    cutoffMs === null;
  const includePayments =
    (filters.scope === "all" || filters.scope === "payments") && !entryOnly;
  const includeEntries = filters.scope === "all" || filters.scope === "entries";

  // Live (non-tombstoned) debts by id, for payment name resolution. The
  // callers pass tombstone-filtered arrays already; the defensive skip keeps
  // the engine safe if an IncludingDeleted variant ever reaches it.
  const debtNameById = new Map<string, string>();
  for (const debt of data.debts) {
    if (!debt.deletedAt) debtNameById.set(debt.id, debt.name);
  }

  const debts: Debt[] = [];
  if (includeDebts) {
    for (const debt of data.debts) {
      if (debt.deletedAt) continue;
      if (!inAmountRange(debt.balance, filters.amountMin, filters.amountMax)) continue;
      if (tokens.length > 0 && !matchesTokens(debtHaystack(debt), tokens)) continue;
      debts.push(debt);
    }
    // Active debts first, largest balance first; paid-off debts trail.
    debts.sort((a, b) => {
      const aActive = a.balance > 0 ? 0 : 1;
      const bActive = b.balance > 0 ? 0 : 1;
      if (aActive !== bActive) return aActive - bActive;
      return b.balance - a.balance;
    });
  }

  const payments: PaymentSearchHit[] = [];
  if (includePayments) {
    for (const payment of data.payments) {
      if (payment.deletedAt) continue;
      if (!inDateRange(payment.date, cutoffMs)) continue;
      if (!inAmountRange(payment.amount, filters.amountMin, filters.amountMax)) continue;
      const debtName = debtNameById.get(payment.debtId) ?? DELETED_DEBT_NAME;
      if (tokens.length > 0 && !matchesTokens(paymentHaystack(payment, debtName), tokens)) {
        continue;
      }
      payments.push({ payment, debtName });
    }
    payments.sort((a, b) => b.payment.date.localeCompare(a.payment.date));
  }

  const entries: BudgetEntry[] = [];
  if (includeEntries) {
    const categorySet =
      filters.categories.length > 0 ? new Set(filters.categories) : null;
    for (const entry of data.entries) {
      if (entry.deletedAt) continue;
      if (filters.entryType !== "all" && entry.type !== filters.entryType) continue;
      if (categorySet && !categorySet.has(entry.category)) continue;
      if (!inDateRange(entry.date, cutoffMs)) continue;
      if (!inAmountRange(entry.amount, filters.amountMin, filters.amountMax)) continue;
      if (tokens.length > 0 && !matchesTokens(entryHaystack(entry), tokens)) continue;
      entries.push(entry);
    }
    entries.sort((a, b) => b.date.localeCompare(a.date));
  }

  return {
    debts: debts.slice(0, MAX_RESULTS_PER_GROUP),
    payments: payments.slice(0, MAX_RESULTS_PER_GROUP),
    entries: entries.slice(0, MAX_RESULTS_PER_GROUP),
    totals: {
      debts: debts.length,
      payments: payments.length,
      entries: entries.length,
      overall: debts.length + payments.length + entries.length,
    },
  };
};

/**
 * Distinct category names present in the entries (income + expense),
 * alphabetical - drives the category filter chips, so only categories that
 * can actually match are offered.
 */
export const collectEntryCategories = (entries: BudgetEntry[]): string[] => {
  const names = new Set<string>();
  for (const entry of entries) {
    if (entry.deletedAt) continue;
    if (entry.category) names.add(entry.category);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
};
