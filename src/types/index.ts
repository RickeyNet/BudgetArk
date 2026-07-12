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
   * Day of month (1-31) the minimum payment is due. Day 29-31 falls back to
   * the last day in shorter months. When omitted, reminders use day 15.
   */
  paymentDueDay?: number;

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

export const DEBT_CLASS_OPTIONS: readonly {
  id: DebtClass;
  label: string;
}[] = [
  { id: "personal_credit", label: "Credit / Personal" },
  { id: "car", label: "Car" },
  { id: "house", label: "House / Mortgage" },
];

export const DEBT_OWNER_OPTIONS: readonly {
  id: DebtOwner;
  label: string;
}[] = [
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

  /**
   * Portion of `amount` actually subtracted from the debt's balance.
   * `recordPayment` clamps the balance at zero, so an overpayment applies
   * less than `amount`; deleting the payment must add back only this delta
   * or the balance ends up higher than was ever owed. Absent on legacy
   * records - fall back to `amount`.
   */
  appliedAmount?: number;

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

export type BudgetBucket = "needs" | "wants" | "savings";

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
  /** 50/30/20 default bucket used when no per-category override exists. */
  defaultBucket?: BudgetBucket;
  createdAt: string;
  updatedAt: string;
}

export const CUSTOM_CATEGORY_STORAGE_VERSION = 1;

export type BudgetEntryType = "income" | "expense";

/** Months between repeats for a recurring budget entry. */
export type RecurrenceInterval = 1 | 3 | 6 | 12;

export const RECURRENCE_INTERVAL_OPTIONS: readonly {
  value: RecurrenceInterval;
  label: string;
  /** Short tag shown on entry rows (e.g. "Monthly", "Quarterly"). */
  tag: string;
}[] = [
  { value: 1, label: "Monthly", tag: "Monthly" },
  { value: 3, label: "Quarterly", tag: "Quarterly" },
  { value: 6, label: "Every 6 months", tag: "6 mo" },
  { value: 12, label: "Yearly", tag: "Yearly" },
];

export const DEFAULT_RECURRENCE_INTERVAL: RecurrenceInterval = 1;

/** Max stored length for `BudgetEntry.paymentUrl`. */
export const PAYMENT_URL_MAX_LENGTH = 512;

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
  /** When true, this entry repeats from its `date` month onward at `recurrenceInterval` months. */
  recurring?: boolean;
  /**
   * Months between repeats when `recurring` is true. Allowed: 1 (monthly), 3
   * (quarterly), 6 (semiannual), 12 (yearly). Defaults to 1 when omitted so
   * pre-existing recurring entries keep their monthly cadence on read.
   */
  recurrenceInterval?: RecurrenceInterval;
  /**
   * Optional payment URL for recurring expenses that are paid online (electric
   * bill portal, trash pickup billing site, etc.). Validated to http(s):// only
   * at write time; missing scheme is normalized to https://. Capped at
   * `PAYMENT_URL_MAX_LENGTH` chars and stripped of control chars.
   */
  paymentUrl?: string;
  /** Asset account ID this savings entry contributes to */
  linkedAccountId?: string;
  /** Year-month key (YYYY-MM) of the last month this recurring entry was applied to its linked account */
  lastAppliedMonth?: string;
  /**
   * "bank" when this entry was created by approving a bank-imported
   * transaction from the connections Review Inbox. Absent = manual entry.
   */
  source?: "bank";
  /**
   * Global dedup identity of the source bank transaction:
   * `${provider}:${externalAccountId}:${providerTxId}`. Deliberately NOT
   * connection-scoped - it survives export/import, rides P2P sync, and lets
   * a partner device that connects to the SAME institution dedupe against
   * entries this device already approved.
   */
  externalTxId?: string;
  /**
   * Normalized merchant key captured at approval time (see
   * services/connections/merchant.ts). Feeds merchant-rule creation when the
   * user later recategorizes the entry.
   */
  merchant?: string;
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
  "checking",
  "savings",
  "retirement",
  "hsa",
  "investment",
  "other",
] as const;

export type AssetAccountCategory = (typeof ASSET_ACCOUNT_CATEGORIES)[number];

export const ASSET_ACCOUNT_CATEGORY_LABELS: Record<AssetAccountCategory, string> = {
  checking: "Checking",
  savings: "Savings",
  retirement: "401k / Retirement",
  hsa: "HSA",
  investment: "Investment",
  other: "Other",
};

/**
 * Categories whose accounts can hold stock/ETF positions (tickers). Investment
 * and Retirement are valued purely by their holdings; HSA also keeps an
 * editable cash balance alongside its holdings (the uninvested cash portion
 * most HSAs carry). These render as broker-style containers on the Bridge.
 */
export const HOLDINGS_CATEGORIES: readonly AssetAccountCategory[] = [
  "investment",
  "retirement",
  "hsa",
];

/**
 * Holdings categories with NO separate cash balance - their account value is
 * entirely the market value of their tickers, so the balance field is hidden
 * and stored as 0. (HSA is intentionally excluded: it keeps a cash balance.)
 */
export const PURE_HOLDINGS_CATEGORIES: readonly AssetAccountCategory[] = [
  "investment",
  "retirement",
];

/** True if accounts in this category can hold tickers (investment/retirement/hsa). */
export const categorySupportsHoldings = (
  category: AssetAccountCategory,
): boolean => HOLDINGS_CATEGORIES.includes(category);

/** True if this category is valued purely by its holdings, with no cash balance. */
export const categoryIsPureHoldings = (
  category: AssetAccountCategory,
): boolean => PURE_HOLDINGS_CATEGORIES.includes(category);

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

/* ─── Stock Holdings Types ─── */

/**
 * A stock/ETF position the user owns. Synced like the other collections
 * (tombstone pattern - see `Debt.deletedAt`). Prices are NOT stored here;
 * they live in the per-device quote cache (`quoteCacheStorage`) so quotes
 * never sync between paired devices.
 */
export interface Holding {
  id: string;
  /**
   * Uppercase ticker, e.g. "AAPL", "VTI". Validated before use. For a
   * proxy-tracked holding this is the PROXY ticker the value rides (e.g. a
   * Spartan 500 CIT tracking "VOO"). For a manual-value holding it's empty -
   * such positions have no ticker and `name` carries the label instead.
   */
  symbol: string;
  shares: number;
  /**
   * Display label for holdings that aren't a plain ticker - i.e. 401k funds
   * with no public symbol. Set for manual-value and proxy-tracked holdings
   * (e.g. "Spartan 500 Index Pool Class D"); undefined for normal tickers,
   * where `symbol` is the label.
   */
  name?: string;
  /**
   * Manual fixed market value, in the user's display currency. Set ONLY for
   * manual-value holdings (a CIT with no ticker and no usable proxy). When
   * present, the value is taken as-is - no quote, no conversion. Mutually
   * exclusive with `anchorValue`.
   */
  manualValue?: number;
  /**
   * Proxy-tracked value anchor: the dollar value (display currency) entered at
   * the time `anchorPrice` was captured. The live value is
   * `anchorValue × proxyPrice / anchorPrice`, so it drifts with the proxy
   * `symbol` (e.g. an S&P 500 index fund riding VOO) between manual updates.
   * Re-entering the value re-anchors both fields.
   */
  anchorValue?: number;
  /**
   * The proxy `symbol`'s price captured when `anchorValue` was set. Undefined
   * until the proxy is first priced (then stamped on the next quote refresh);
   * while undefined the holding holds flat at `anchorValue`.
   */
  anchorPrice?: number;
  /**
   * TOTAL dollars invested across all shares (not per-share). Optional -
   * only used to show gain/loss; market value comes from `shares × price`.
   */
  costBasis?: number;
  /**
   * Link to the Investment-category AssetAccount (the broker) this position is
   * held in. The Bridge nests holdings under their broker via this id.
   */
  accountId?: string;
  createdAt: string;
  updatedAt: string;
  /** Tombstone marker - see Debt.deletedAt. */
  deletedAt?: string;
}

/**
 * A cached price for one symbol. Mirrors the quote-proxy Worker's response
 * (`{ price, asOf }`). Stored per-device only; never synced.
 */
export interface CachedQuote {
  price: number;
  /** ISO timestamp the price was fetched (from the Worker). */
  asOf: string;
}

/**
 * Per-device opt-in state for the Live Stock Holdings feature. Off by default:
 * the feature stays invisible until the user explicitly enables it and
 * acknowledges that tickers leave the device (synced to a partner + sent to
 * the quote proxy). See `holdingsSettingsStorage`.
 */
export interface HoldingsSettings {
  /** Master switch - when false the Holdings UI and quote fetches are off. */
  enabled: boolean;
  /**
   * True once the user has seen the first off-device disclosure. Kept separate
   * from `enabled` so re-enabling later doesn't re-prompt.
   */
  disclosureAcknowledged: boolean;
}

/* ─── Bank Connection Types (per-device; NEVER synced, NEVER exported) ─── */

/**
 * External financial-data providers a user can connect with their OWN
 * credentials (BYO API). Credentials stay on this device: they are excluded
 * from export/import and from the P2P sync diff by design.
 */
export type BankProvider = "simplefin" | "teller";

export const BANK_PROVIDER_LABELS: Record<BankProvider, string> = {
  simplefin: "SimpleFIN",
  teller: "Teller",
};

export type ConnectionAuthStatus = "ok" | "needs-reauth" | "error";

/**
 * Coarse error classification surfaced on a connection after a failed sync.
 * Mirrors services/connections/types.ts ConnectionErrorCode - duplicated as a
 * string union here so the types module stays dependency-free.
 */
export type ConnectionErrorCode =
  | "auth-expired"
  | "invalid-credentials"
  | "rate-limited"
  | "network"
  | "provider-error";

/**
 * Non-secret metadata for one provider connection. Secrets (tokens, keys,
 * access URLs) live under a separate storage key - see
 * storage/connectionSecretsStorage.ts - so this record can flow through UI
 * state without ever touching credential material.
 */
export interface BankConnection {
  id: string;
  provider: BankProvider;
  /** User-facing label, e.g. "SimpleFIN - Chase". */
  name: string;
  /** User pause switch; disabled connections never fetch. */
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  /** ISO timestamp of the last SUCCESSFUL sync (drives the fetch window). */
  lastSyncedAt?: string;
  /** ISO timestamp of the last attempt, success or not (drives cooldowns). */
  lastAttemptAt?: string;
  authStatus: ConnectionAuthStatus;
  lastErrorCode?: ConnectionErrorCode;
  /** Short human-readable summary of the last error, for the UI. */
  lastErrorMessage?: string;
}

/**
 * Maps one provider-side account to (optionally) a local AssetAccount.
 * Per-device, like its parent connection.
 */
export interface ExternalAccountLink {
  id: string;
  connectionId: string;
  /** SimpleFIN account.id | Teller account id. */
  externalAccountId: string;
  /** Provider display name, for the mapping UI. */
  externalName: string;
  currency?: string;
  /** Balance target; null = user chose not to map this account. */
  assetAccountId: string | null;
  /** Per-account toggle: pull transactions into the Review Inbox. */
  importTransactions: boolean;
  /** Per-account toggle: push provider balance into the mapped AssetAccount. */
  updateBalance: boolean;
  /**
   * Raw provider balance (may be negative - overdraft/margin), display only.
   * The value applied to the AssetAccount is clamped at 0 because
   * isAssetAccountItem requires balance >= 0.
   */
  lastExternalBalance?: number;
  lastExternalBalanceAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * One Review Inbox item: a fetched bank transaction awaiting user approval.
 * `id` IS the deterministic identity key
 * `${provider}:${externalAccountId}:${providerTxId}` (see
 * services/connections/ingest.ts) - approved/dismissed items leave the inbox
 * and are remembered by the ingest ledger under the same key.
 */
export interface PendingTransaction {
  id: string;
  connectionId: string;
  externalAccountId: string;
  providerTxId: string;
  /** Provider still marks the transaction as pending (not yet posted). */
  pending: boolean;
  /** ISO date the transaction posted (or transacted, while pending). */
  postedAt: string;
  /** SIGNED dollars, normalized across providers: negative = outflow. */
  amount: number;
  /** Raw provider description, sanitized and capped. */
  description: string;
  /** normalizeMerchant(description) - the merchant-rule matching key. */
  merchant: string;
  /** Sign-derived suggestion: outflow = expense, inflow = income. */
  suggestedType: BudgetEntryType;
  /** From a matched MerchantRule, else undefined. */
  suggestedCategory?: CategoryName;
  /** Heuristic: likely an inter-account transfer. Flag only - never dropped. */
  transferLikely?: boolean;
  fetchedAt: string;
  updatedAt: string;
}

/**
 * Remembered merchant -> category mapping, created when the user approves an
 * inbox item with "always use this category". Unique on `merchantKey`.
 */
export interface MerchantRule {
  id: string;
  merchantKey: string;
  category: CategoryName;
  type: BudgetEntryType;
  useCount: number;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Per-device consent state for Bank Connections. Mirrors HoldingsSettings:
 * the disclosure is shown once before the first connection is added.
 */
export interface ConnectionsSettings {
  disclosureAcknowledged: boolean;
}

/**
 * One ingest-ledger decision: remembers that a fetched bank transaction
 * (keyed by its identity key) was approved or dismissed, so overlapping
 * re-fetches and reconnects never re-offer it. See
 * storage/reviewInboxStorage.ts for persistence and TTL pruning.
 */
export interface IngestLedgerEntry {
  status: "approved" | "dismissed";
  /** Set when status is "approved" - the BudgetEntry created from this tx. */
  budgetEntryId?: string;
  /** ISO timestamp the decision was made (drives TTL pruning). */
  at: string;
  /**
   * When a provider changed a transaction's id between pending and posted,
   * the new id's ledger entry points at the original identity key.
   */
  aliasOf?: string;
  /**
   * Dedup fingerprint `${externalAccountId}|${amount}|${YYYY-MM-DD}` captured
   * when the decided transaction was still pending - lets the ingest planner
   * recognize the posted twin even if the provider changed its id.
   */
  pendingFingerprint?: string;
}

export type IngestLedger = Record<string, IngestLedgerEntry>;

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
  {
    id: "sek_se",
    label: "Swedish Krona (Sweden)",
    locale: "sv-SE",
    currencyCode: "SEK",
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

/**
 * Default milestone steps. The `targetAmount` values are canonical
 * **USD anchors**: when a fresh plan is seeded (createDefaultPlan in
 * debtMilestoneStorage), each is converted to the user's selected
 * currency via localizeUsdTarget() so a non-USD user starts with a
 * sensible local-currency target instead of a raw dollar figure. USD
 * users are unaffected (the conversion is a no-op rounded to the same
 * value). Descriptions stay currency-neutral - the concrete amount is
 * shown by the target editor / progress bar in the user's currency.
 */
export const DEFAULT_DEBT_MILESTONE_STEPS: readonly Omit<
  DebtMilestoneStep,
  "isCompleted" | "completedAt"
>[] = [
  {
    key: "keel",
    title: "Keel",
    description: "Save a starter emergency fund so your plan has a stable base.",
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

/* ─── Learning (Charts) Types ─── */

/** Top-level taxonomy for the Charts learning hub. */
export const LESSON_TOPICS = [
  "budgeting",
  "debt",
  "saving",
  "investing",
  "taxes",
  "insurance",
  "real_estate",
  "retirement",
  "mindset",
] as const;

export type LessonTopic = (typeof LESSON_TOPICS)[number];

export type ChapterId = "ch1" | "ch2" | "ch3" | "ch4" | "ch5";

export type ChapterStatus = "available" | "coming-soon";

/**
 * Minimal lesson metadata. Always present for every lesson in the curriculum,
 * including "coming soon" ones whose full body doesn't exist yet. Surfaces
 * in chapter listings, recommendation cards, and the resume pointer.
 */
export interface LessonStub {
  id: string;
  chapterId: ChapterId;
  /** Display order within the chapter (1-based). */
  number: number;
  title: string;
  /** Estimated read time in minutes. `null` for "coming soon" lessons. */
  readMin: number | null;
  topics: readonly LessonTopic[];
}

export interface Chapter {
  id: ChapterId;
  /** Display order in the Captain's Course (1-based). */
  number: number;
  title: string;
  subtitle: string;
  /** Emoji glyph shown on chapter cards. */
  glyph: string;
  status: ChapterStatus;
  lessons: readonly LessonStub[];
}

/* Lesson body sections - discriminated union. Renderer walks the array. */

export interface ParagraphSection {
  type: "paragraph";
  text: string;
}

export interface BulletListSection {
  type: "bullet-list";
  title?: string;
  items: readonly string[];
}

export type CalloutTone = "info" | "warn" | "success";

export interface CalloutSection {
  type: "callout";
  tone: CalloutTone;
  title?: string;
  text: string;
}

/**
 * Inline embed for an existing in-app calculator. Renderer looks up the
 * matching component; unknown ids render as a "Tool unavailable" stub
 * so missing wiring never crashes a lesson.
 */
export interface CalculatorEmbedSection {
  type: "calculator-embed";
  /** Calculator id; e.g. "loan-amortization", "payoff-comparison". */
  calc: string;
}

export type LessonSection =
  | ParagraphSection
  | BulletListSection
  | CalloutSection
  | CalculatorEmbedSection;

/* Lesson resources - external + internal references shown at the bottom. */

export interface YoutubeResource {
  type: "youtube";
  title: string;
  channel: string;
  /** "mm:ss" string, free-form. */
  duration?: string;
  url: string;
}

/**
 * Book recommendation. `amazonUrl` + `affiliate` are deliberately optional
 * so v1 ships with no affiliate links - the card renders as cover + title +
 * author. When affiliate links light up later, populate these fields plus
 * gate rendering behind LearningProgress.showAffiliateLinks.
 */
export interface BookResource {
  type: "book";
  title: string;
  author: string;
  /** Asset path under assets/books/, e.g. "9781595555274.png". Optional in v1. */
  coverAsset?: string;
  amazonUrl?: string;
  affiliate?: boolean;
}

export interface ArticleResource {
  type: "article";
  title: string;
  source: string;
  url: string;
}

export interface ToolResource {
  type: "tool";
  title: string;
  /** Route key understood by the Charts/Tools router (e.g. "refinance"). */
  route: string;
}

export type LessonResource =
  | YoutubeResource
  | BookResource
  | ArticleResource
  | ToolResource;

/**
 * Action CTA at the end of a lesson - opens an existing in-app flow.
 * `route` is a free-form key resolved by the Lesson screen's action handler;
 * unknown routes are inert.
 */
export interface LessonAction {
  label: string;
  /** e.g. "debts/strategy", "budget/limits", "charts/tools/refinance". */
  route: string;
}

/**
 * Full lesson content. Only authored for "available" chapters. Lookups for
 * a stub that has no `Lesson` entry render the "Coming soon" lesson screen.
 */
export interface Lesson extends LessonStub {
  /** Hero glyph for the lesson screen header. */
  glyph: string;
  /** One-line teaser shown on lesson cards and chapter rows. */
  summary: string;
  /** Optional pull-quote callout under the title. */
  whyItMatters?: string;
  body: readonly LessonSection[];
  /** Highlighted summary at the end of the lesson body. */
  keyTakeaway?: string;
  action?: LessonAction;
  resources?: readonly LessonResource[];
}

export interface LearningProgress {
  /** Map of lesson id → ISO timestamp when first marked complete. */
  completedLessons: Record<string, string>;
  /** Last lesson opened, used by the Captain's Course Resume card. */
  currentLessonId?: string;
  /**
   * Times the user has tapped through to an Amazon affiliate link.
   * Tracked even in v1 (count stays at 0) so the field exists when affiliate
   * links light up later.
   */
  affiliateTapCount: number;
  /** First time the user accepted the affiliate disclosure modal, if ever. */
  affiliateDisclosureSeenAt?: string;
  /**
   * User toggle for showing affiliate links. Defaults to `false` in v1 since
   * there are no affiliate URLs yet; the toggle UI will land alongside the
   * affiliate launch.
   */
  showAffiliateLinks: boolean;
  version: number;
}

export const LEARNING_STORAGE_VERSION = 1;

/* ─── Navigation Types ─── */

/**
 * Defines the screens available in the bottom tab navigator.
 * Each key maps to a screen component; `undefined` means no params.
 */
export type RootTabParamList = {
  DebtTracker: undefined;
  Budget: {
    /** When true, the Budget screen opens the connections Review Inbox on focus. */
    openInbox?: boolean;
    /**
     * Set by the Quick Entry widget's deep link (see QuickAddLinkHost):
     * opens the Add Entry modal, preselecting `category` when present.
     * The category is already validated fail-closed by parseQuickAddUri.
     */
    quickAdd?: { category?: string };
  } | undefined;
  Bridge: undefined;
  Utilities: undefined;
  Profile: {
    openReleaseNotes?: boolean;
  } | undefined;
};
