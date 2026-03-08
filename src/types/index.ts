/**
 * BudgetArk — Type Definitions
 * File: src/types/index.ts
 *
 * Central type definitions for the entire app.
 * All data structures used across screens, storage, and components
 * are defined here to ensure type safety and consistency.
 *
 * NOTE: Keep types flat and simple for fast serialization to AsyncStorage.
 */

/* ─── Debt Types ─── */

/**
 * Represents a single debt entry tracked by the user.
 * Stores both the original balance (for progress calculation)
 * and the current remaining balance.
 */
export interface Debt {
  /** Unique identifier — generated via uuid */
  id: string;

  /** User-friendly name, e.g. "Chase Visa" or "Student Loan" */
  name: string;

  /** Current remaining balance in dollars */
  balance: number;

  /** Original balance when the debt was first added — never changes */
  originalBalance: number;

  /** Annual Percentage Rate (APR) as a whole number, e.g. 19.9 = 19.9% */
  rate: number;

  /** Minimum monthly payment in dollars */
  minPayment: number;

  /** ISO timestamp of when this debt was created */
  createdAt: string;

  /** Optional ISO date string for payoff goal date */
  goalDate?: string;
}

/**
 * Form data for creating a new debt.
 * Omits auto-generated fields (id, createdAt) from the full Debt type.
 */
export type NewDebtInput = Omit<Debt, "id" | "createdAt">;

/* ─── Payment Types ─── */

/**
 * Records a single payment made toward a debt.
 * Stored separately to enable payment history tracking.
 */
export interface Payment {
  /** Unique identifier */
  id: string;

  /** The debt this payment was applied to */
  debtId: string;

  /** Payment amount in dollars */
  amount: number;

  /** ISO timestamp of when payment was recorded */
  date: string;
}

/* ─── Budget Types ─── */

export const BUDGET_CATEGORIES = [
  "Salary",
  "Freelance",
  "Housing",
  "Food",
  "Transportation",
  "Utilities",
  "Healthcare",
  "Insurance",
  "Debt Payments",
  "Savings",
  "Entertainment",
  "Shopping",
  "Travel",
  "Other",
] as const;

export type BudgetCategory = (typeof BUDGET_CATEGORIES)[number];

export type BudgetEntryType = "income" | "expense";

export interface BudgetEntry {
  id: string;
  type: BudgetEntryType;
  category: BudgetCategory;
  amount: number;
  /** Optional user-provided note describing the entry */
  description?: string;
  date: string;
  createdAt: string;
}

export type NewBudgetEntryInput = Omit<BudgetEntry, "id" | "createdAt">;

export interface CategoryBudgetLimit {
  category: BudgetCategory;
  monthlyLimit: number;
}

/* ─── Currency + Localization Types ─── */

export interface CurrencyPreferenceOption {
  id: string;
  label: string;
  locale: string;
  currencyCode: string;
}

export const CURRENCY_PREFERENCE_OPTIONS = [
  {
    id: "usd_us",
    label: "US Dollar (United States)",
    locale: "en-US",
    currencyCode: "USD",
  },
  {
    id: "eur_de",
    label: "Euro (Germany)",
    locale: "de-DE",
    currencyCode: "EUR",
  },
  {
    id: "gbp_gb",
    label: "British Pound (United Kingdom)",
    locale: "en-GB",
    currencyCode: "GBP",
  },
  {
    id: "cad_ca",
    label: "Canadian Dollar (Canada)",
    locale: "en-CA",
    currencyCode: "CAD",
  },
  {
    id: "jpy_jp",
    label: "Japanese Yen (Japan)",
    locale: "ja-JP",
    currencyCode: "JPY",
  },
] as const satisfies readonly CurrencyPreferenceOption[];

export type CurrencyPreferenceId =
  (typeof CURRENCY_PREFERENCE_OPTIONS)[number]["id"];

export const DEFAULT_CURRENCY_PREFERENCE_ID: CurrencyPreferenceId = "usd_us";

/* ─── User Account Types ─── */

/**
 * Represents an anonymous user account.
 * No email or phone required — the user is identified solely by UUID.
 * An optional display name can be set for personalization.
 */
export interface UserAccount {
  /** Unique user identifier — generated on first launch */
  id: string;

  /** Optional display name (defaults to "Buddy") */
  displayName: string;

  /** ISO timestamp of account creation */
  createdAt: string;

  /** Whether the user has completed the onboarding flow */
  onboardingComplete: boolean;

  /** Preferred localization + currency formatting preset */
  currencyPreferenceId: CurrencyPreferenceId;
}

export interface UpdatePreferences {
  /** When true, update checks happen only when the user requests them. */
  manualUpdateMode: boolean;

  /** ISO timestamp of the most recent OTA check. */
  lastCheckedAt?: string;
}

/* ─── Navigation Types ─── */

/**
 * Defines the screens available in the bottom tab navigator.
 * Each key maps to a screen component; `undefined` means no params.
 */
export type RootTabParamList = {
  DebtTracker: undefined;
  Budget: undefined;
  Investments: undefined;
  Profile: {
    openReleaseNotes?: boolean;
  } | undefined;
};
