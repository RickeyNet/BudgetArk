/**
 * BudgetArk - Type Definitions
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
  /** Unique identifier - generated via uuid */
  id: string;

  /** User-friendly name, e.g. "Chase Visa" or "Student Loan" */
  name: string;

  /** Current remaining balance in dollars */
  balance: number;

  /** Original balance when the debt was first added - never changes */
  originalBalance: number;

  /** Annual Percentage Rate (APR) as a whole number, e.g. 19.9 = 19.9% */
  rate: number;

  /** Minimum monthly payment in dollars */
  minPayment: number;

  /** Who is legally responsible for this debt */
  owner: DebtOwner;

  /** Debt class used for snowball ordering */
  debtClass: DebtClass;

  /** Whether debt class is manually set or inferred */
  debtClassSource: DebtClassSource;

  /** ISO timestamp of when this debt was created */
  createdAt: string;

  /** ISO timestamp of when this debt was last modified */
  updatedAt: string;

  /** Optional ISO date string for payoff goal date */
  goalDate?: string;

  /**
   * Tombstone marker. When set, the record is soft-deleted: hidden from
   * the UI but kept in storage so the next paired sync can propagate the
   * deletion. Tombstones older than `TOMBSTONE_TTL_MS` are purged on read.
   */
  deletedAt?: string;
}

/**
 * Form data for creating a new debt.
 * Omits auto-generated fields (id, createdAt) from the full Debt type.
 */
export type NewDebtInput = Omit<Debt, "id" | "createdAt" | "updatedAt">;

export type DebtOwner = "mine" | "partner" | "joint";

export type DebtClass = "personal_credit" | "car" | "house";

export type DebtClassSource = "manual" | "inferred";

export const DEBT_CLASS_OPTIONS: ReadonlyArray<{
  id: DebtClass;
  label: string;
}> = [
  { id: "personal_credit", label: "Credit / Personal" },
  { id: "car", label: "Car" },
  { id: "house", label: "House / Mortgage" },
];

export const DEBT_OWNER_OPTIONS: ReadonlyArray<{
  id: DebtOwner;
  label: string;
}> = [
  { id: "mine", label: "Mine" },
  { id: "partner", label: "Partner" },
  { id: "joint", label: "Joint" },
];

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

  /** ISO timestamp of when this payment was last modified */
  updatedAt: string;

  /** Tombstone marker - see Debt.deletedAt. */
  deletedAt?: string;
}

/* ─── Budget Types ─── */

export const BUDGET_CATEGORIES = [
  "Salary",
  "Freelance",
  "Housing",
  "Food",
  "Grocery",
  "Restaurant",
  "Tech",
  "Fitness",
  "Transportation",
  "Utilities",
  "Healthcare",
  "Insurance",
  "Debt Payments",
  "Giving",
  "Retirement",
  "Investing",
  "Savings",
  "Entertainment",
  "Shopping",
  "Travel",
  "Other",
] as const;

export type BudgetCategory = (typeof BUDGET_CATEGORIES)[number];

/**
 * A category an entry/limit can reference. Built-in names keep editor
 * autocomplete; the `string & {}` arm lets user-defined custom category
 * names flow through without an `as` cast at every assignment. Runtime
 * lookups against built-in-keyed maps must fall back (see `categoryIcons`).
 */
export type CategoryName = BudgetCategory | (string & {});

/**
 * A user-defined budget category. Built-in categories stay fixed; these are
 * additive only (v1). `icon` is a single emoji glyph. Not tombstoned -
 * deleting just drops it from the list; any entries already tagged with the
 * name keep working and fall back to the default icon/color.
 */
export interface CustomCategory {
  id: string;
  name: string;
  /** Single emoji glyph shown beside the category. */
  icon: string;
  createdAt: string;
  updatedAt: string;
}

export const CUSTOM_CATEGORY_STORAGE_VERSION = 1;

export type BudgetEntryType = "income" | "expense";

export interface BudgetEntry {
  id: string;
  type: BudgetEntryType;
  category: CategoryName;
  amount: number;
  /** Optional user-provided note describing the entry */
  description?: string;
  date: string;
  createdAt: string;
  /** ISO timestamp of when this entry was last modified */
  updatedAt: string;
  /** When true, this entry repeats every month from its `date` month onward */
  recurring?: boolean;
  /** Asset account ID this savings entry contributes to */
  linkedAccountId?: string;
  /** Year-month key (YYYY-MM) of the last month this recurring entry was applied to its linked account */
  lastAppliedMonth?: string;
  /** Tombstone marker - see Debt.deletedAt. */
  deletedAt?: string;
}

export type NewBudgetEntryInput = Omit<BudgetEntry, "id" | "createdAt" | "updatedAt">;

export interface CategoryBudgetLimit {
  category: CategoryName;
  monthlyLimit: number;
  /**
   * Last-write-wins timestamp for sync conflict resolution. Limits saved
   * before this field existed are normalized to the epoch on read, so any
   * fresh edit will win over them on the first paired sync.
   */
  updatedAt: string;
}

/* ─── Savings Goal Types ─── */

export type SavingsGoalCategory =
  | "emergency_fund"
  | "travel"
  | "home"
  | "car"
  | "education"
  | "other";

export interface SavingsGoal {
  id: string;
  name: string;
  category: SavingsGoalCategory;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  createdAt: string;
  updatedAt: string;
  /** Tombstone marker - see Debt.deletedAt. */
  deletedAt?: string;
}

/* ─── Asset Account Types ─── */

export const ASSET_ACCOUNT_CATEGORIES = [
  "savings",
  "retirement",
  "hsa",
  "investment",
  "other",
] as const;

export type AssetAccountCategory = (typeof ASSET_ACCOUNT_CATEGORIES)[number];

export const ASSET_ACCOUNT_CATEGORY_LABELS: Record<AssetAccountCategory, string> = {
  savings: "Savings",
  retirement: "401k / Retirement",
  hsa: "HSA",
  investment: "Investment",
  other: "Other",
};

export interface AssetAccount {
  id: string;
  name: string;
  category: AssetAccountCategory;
  balance: number;
  createdAt: string;
  updatedAt: string;
  /** Tombstone marker - see Debt.deletedAt. */
  deletedAt?: string;
}

export interface NetWorthSnapshot {
  dayKey: string;
  capturedAt: string;
  totalAssets: number;
  totalDebt: number;
  netWorth: number;
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
 * No email or phone required - the user is identified solely by UUID.
 * An optional display name can be set for personalization.
 */
export interface UserAccount {
  /** Unique user identifier - generated on first launch */
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

/* ─── Debt Milestone Program Types ─── */

export type DebtMilestoneKey =
  | "keel"
  | "hull"
  | "deck"
  | "supplies"
  | "gather_animals"
  | "moorings"
  | "sail";

export interface DebtMilestoneStep {
  key: DebtMilestoneKey;
  title: string;
  description: string;
  targetAmount?: number;
  isCompleted: boolean;
  completedAt?: string;
}

export interface DebtMilestonePlan {
  currentStepKey: DebtMilestoneKey;
  steps: DebtMilestoneStep[];
  updatedAt: string;
}

export const DEFAULT_DEBT_MILESTONE_STEPS: readonly Omit<
  DebtMilestoneStep,
  "isCompleted" | "completedAt"
>[] = [
  {
    key: "keel",
    title: "Keel",
    description: "Save $1,000 for a starter emergency fund so your plan has a stable base.",
    targetAmount: 1200,
  },
  {
    key: "hull",
    title: "Hull",
    description: "Pay off all debt except the house using the debt snowball.",
  },
  {
    key: "deck",
    title: "Deck",
    description: "Save 3 to 6 months of living expenses for a fully funded emergency fund.",
  },
  {
    key: "supplies",
    title: "Supplies",
    description: "Invest 15% of household income for retirement.",
    targetAmount: 500,
  },
  {
    key: "gather_animals",
    title: "Gather Animals",
    description: "Save for your children\u2019s college education.",
    targetAmount: 10000,
  },
  {
    key: "moorings",
    title: "Moorings",
    description: "Pay off your home early with extra principal payments.",
  },
  {
    key: "sail",
    title: "Sail",
    description: "Build wealth and give generously.",
    targetAmount: 1000,
  },
];

/* ─── Achievement Types ─── */

export type AchievementTier = "bronze" | "silver" | "gold" | "legendary";

export interface Achievement {
  id: string;
  glyph: string;
  tier: AchievementTier;
  title: string;
  description: string;
  /** Shown when locked, e.g. "Pay 50% of original debt" */
  hint: string;
}

export interface UnlockedAchievements {
  /** Map of achievement id → ISO timestamp when it was first unlocked */
  unlocked: Record<string, number>;
  /**
   * Timestamp of the first `evaluateAchievements` call after install.
   * Used to suppress celebration popups for retroactive unlocks on a
   * user's first open of the feature; later evaluations celebrate.
   */
  firstEvaluatedAt?: number;
  version: number;
}

export const ACHIEVEMENTS_STORAGE_VERSION = 1;

/**
 * Counters that back achievements which can't be derived from the user's
 * financial data alone (export taps, Monthly Review opens, app-open streak).
 * Kept separate from `UnlockedAchievements` so the unlock map stays a pure
 * id → timestamp record.
 */
export interface AchievementStats {
  /** Times the user has exported their data (JSON or spreadsheet). */
  exportCount: number;
  /** Times the user has opened the Monthly Review. */
  monthlyReviewOpens: number;
  /** Current consecutive-day app-open streak. */
  appOpenStreak: number;
  /** Best app-open streak ever reached (badges check this). */
  longestAppOpenStreak: number;
  /** YYYY-MM-DD of the last day the app was opened, or null on first run. */
  lastAppOpenDay: string | null;
  version: number;
}

export const ACHIEVEMENT_STATS_VERSION = 1;

/* ─── Navigation Types ─── */

/**
 * Defines the screens available in the bottom tab navigator.
 * Each key maps to a screen component; `undefined` means no params.
 */
export type RootTabParamList = {
  DebtTracker: undefined;
  Budget: undefined;
  Bridge: undefined;
  Utilities: undefined;
  Profile: {
    openReleaseNotes?: boolean;
  } | undefined;
};
