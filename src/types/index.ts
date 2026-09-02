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
   * Card keep-alive tracking: opt-in inactivity watch so an idle credit
   * card isn't silently closed by the issuer. All fields are optional so
   * records round-trip through older peers/imports untouched. The UI only
   * offers these for `debtClass === "personal_credit"`, but validation
   * stays class-agnostic on purpose.
   */
  keepAliveEnabled?: boolean;

  /** Issuer inactivity window in whole months (UI default 6). */
  keepAliveWindowMonths?: number;

  /** Days before the deadline that reminders begin (UI default 30). */
  keepAliveLeadDays?: number;

  /**
   * When the card was last used. Full ISO from manual "I used it" stamps;
   * may be a date-only string (`YYYY-MM-DD`) when stamped from a synced
   * bank transaction's postedAt.
   */
  keepAliveLastUsedAt?: string;

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

/**
 * A business the user tags expense entries with (freelance clients, an
 * LLC, a side company). Unlike CustomCategory this IS tombstoned: entries
 * reference businesses by id, so deletes must propagate through P2P sync
 * instead of silently dropping from one device's list.
 */
export interface Business {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  /** Tombstone marker - see Debt.deletedAt. */
  deletedAt?: string;
}

export const BUSINESS_STORAGE_VERSION = 1;
export const MAX_BUSINESSES = 20;
export const MAX_BUSINESS_NAME_LENGTH = 40;

/**
 * A household member (or anyone else) spending can be assigned to via
 * `BudgetEntry.personId` - "who spent this". Mirrors `Business` exactly:
 * entries reference people by id, deletes are tombstoned so they survive
 * locally and propagate through P2P sync.
 */
export interface Person {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  /** Tombstone marker - see Debt.deletedAt. */
  deletedAt?: string;
}

export const PERSON_STORAGE_VERSION = 1;
export const MAX_PEOPLE = 20;
export const MAX_PERSON_NAME_LENGTH = 40;

/**
 * Metadata for one receipt photo attached to a budget entry. The image
 * itself lives as an encrypted file in the app's document directory
 * (attachments/<id>.jpg.enc + <id>.thumb.jpg.enc - see
 * services/attachments/attachmentStore.ts); only this metadata rides the
 * entry through storage, P2P sync, and JSON export. Files are
 * device-local in v1 - a partner device shows a placeholder.
 */
export interface EntryAttachment {
  /** UUID; also the on-disk filename stem. */
  id: string;
  createdAt: string;
  /** Post-downscale pixel dimensions, for viewer aspect ratio. */
  width?: number;
  height?: number;
}

export const MAX_ATTACHMENTS_PER_ENTRY = 3;

export type BudgetEntryType = "income" | "expense";

/**
 * How an income entry was earned. Optional - plain income entries (bank
 * imports, misc cash) carry no income type.
 * - "w2": a W-2 paycheck. `BudgetEntry.amount` is the NET (take-home)
 *   deposit; taxes were already withheld by the employer.
 * - "1099": self-employment / contractor pay. `BudgetEntry.amount` is the
 *   gross payment; nothing was withheld, so a slice must be set aside for
 *   end-of-year taxes (see `taxSetAsideRate`).
 */
export type IncomeType = "w2" | "1099";

/**
 * Default percent of a 1099 payment to set aside for taxes. A deliberately
 * conservative middle-of-the-road starting point (self-employment tax +
 * federal income tax for common brackets); the user can tune it per entry.
 */
export const DEFAULT_TAX_SET_ASIDE_RATE = 25;

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
  /**
   * Id of the recurring bill (a `recurring: true` expense) this entry is the
   * ACTUAL charge for, in the month of this entry's `date`. While such an
   * entry exists, the bill's projection is hidden for that month everywhere
   * recurring entries are rolled forward (see utils/billFulfillment
   * `entriesForMonth`), so a $137 electric charge replaces the $120 estimate
   * instead of stacking on top of it. Lives on the actual, not the bill:
   * deleting the actual restores the projection with no cleanup, and paired
   * devices never contend over one shared recurring record. Optional and
   * ignored by older peers/importers. Set only on non-recurring expenses.
   */
  fulfillsRecurringId?: string;
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
  /**
   * Business this expense belongs to (see `Business`). Expenses only - the
   * UI never sets it on income and clears it when an entry's type flips.
   * A dangling id (business deleted, or not yet arrived via sync) is
   * harmless: report/badge surfaces show it as "(deleted business)".
   */
  businessId?: string;
  /**
   * Person this spending is assigned to (see `Person`) - "who spent this".
   * Expenses only, same contract as `businessId`: the UI never sets it on
   * income, clears it when an entry's type flips, and a dangling id shows
   * as "(deleted person)".
   */
  personId?: string;
  /**
   * Everyone this spending was for, when it's more than one person (a
   * grocery run for the whole family). `personId` is always the FIRST of
   * these so older peers/imports that only know the single field still see
   * one assignee; readers reconcile via `utils/entryPeople.entryPersonIds`
   * (the single field wins when this list no longer contains it - an older
   * peer edited the assignment). Never stored with fewer than two ids.
   */
  personIds?: string[];
  /**
   * How this income was earned (W-2 paycheck vs 1099 contractor pay).
   * Income only - the UI never sets it on expenses and clears it (plus the
   * two companion fields below) when an entry's type flips to expense.
   */
  incomeType?: IncomeType;
  /**
   * Dollars contributed to a 401(k)/retirement plan out of this W-2
   * paycheck. Withheld before the deposit, so it is deliberately NOT part
   * of `amount` and never added to income totals - it surfaces separately
   * ("401(k) contributed this month"). W-2 entries only.
   */
  retirementContribution?: number;
  /**
   * Percent (0-100) of this 1099 payment to set aside for end-of-year
   * taxes. The set-aside dollars are derived, never stored - see
   * utils/paycheckMath.ts. 1099 entries only.
   */
  taxSetAsideRate?: number;
  /**
   * Receipt photos (metadata only - see EntryAttachment). UI caps at
   * MAX_ATTACHMENTS_PER_ENTRY; the sync/import validator tolerates up to 10
   * so a merged record can't brick a whole diff.
   */
  attachments?: EntryAttachment[];
  /**
   * Private entry: excluded from the outgoing partner-sync diff (live AND
   * tombstoned - see diffEngine). Stays in all local budget math, JSON
   * export/import, and spreadsheets (the flag must round-trip or a
   * backup/restore cycle would silently un-private the entry). Once set,
   * incoming sync/import records can never CLEAR it - a partner editing
   * their pre-privacy public copy wins content by LWW but the flag is
   * re-stamped (diffEngine.applyIncomingDiff, importData's
   * reconcileBudgetEntry); un-privating is a local UI action only. Known
   * limitation: marking an ALREADY-SYNCED entry private stops future
   * updates from syncing but can't retract the copy the partner received.
   */
  isPrivate?: boolean;
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
  /**
   * Tombstone marker (see Debt.deletedAt). A limit the user REMOVED keeps
   * its row with `deletedAt` set so the removal reaches a paired device -
   * the per-category LWW merge used to be a union, so an omitted row was
   * simply "no news" and the partner kept (and re-sent) the old limit
   * forever. Live getters filter these out; only sync/export see them.
   * Optional so older peers/imports stay compatible: a peer without this
   * field treats the row as a live limit, which is exactly what it did
   * before (no regression), and a row without it is live.
   */
  deletedAt?: string;
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
  /**
   * Hand-set rank for the purchase planner's "My order" method (0 = first).
   * Only consulted under that method; the snowball / soonest-needed
   * orderings derive rank from the goal itself. Syncs and exports like any
   * other field - older peers ignore it.
   */
  priority?: number;
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
  /**
   * Marks a savings account as (part of) the user's emergency fund. When any
   * live account carries this flag, the emergency-fund value everywhere
   * (Bridge/Budget cards, EF plan, net worth, achievements) is the sum of the
   * flagged accounts' balances instead of the emergency_fund SavingsGoal's
   * currentAmount - bank connections that push balances into these accounts
   * keep the fund current automatically. Resolution lives in
   * utils/savingsGoals.getEmergencyFundSource; totals that already sum
   * account balances must NOT add the EF on top in that mode.
   */
  isEmergencyFund?: boolean;
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

/**
 * A month's starting checking balance - the ground-truth anchor for the
 * Budget tab's cash-flow projection ("safe to spend"). Stored and synced as
 * a map keyed by month (`YYYY-MM`). No tombstones: a balance is only ever
 * overwritten, never deleted, so LWW on `updatedAt` fully resolves
 * conflicts between paired devices and backup imports.
 */
export interface MonthStartBalance {
  /** Checking balance at the start of the month (negative = overdrawn). */
  balance: number;
  /** When the user entered/confirmed the number - display only. */
  capturedAt: string;
  /** LWW timestamp for sync/import merges. */
  updatedAt: string;
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
  /**
   * Per-institution warnings the provider returned alongside an otherwise
   * successful fetch - SimpleFIN's `errors` list, e.g. "Connection to Chase
   * may need attention": the bridge is fine, one bank behind it wants a
   * fresh login. Set from the latest clean fetch (cleared when the list
   * comes back empty). Sanitized, capped text; shown in the Connections
   * manager only, never in a notification.
   */
  providerWarnings?: string[];
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
  /**
   * "This provider account IS this credit card": the Debt-tab record the
   * account feeds. Each sync (a) pushes the provider balance into the debt's
   * `balance` unless `updateDebtBalance` is false, and (b) stamps the debt's
   * `keepAliveLastUsedAt` from the account's newest outflow when its
   * keep-alive watch is on. Per-device like the rest of the link - never
   * synced or exported (the partner just sees the debt's balance move).
   * Lazily nulled when the debt no longer exists.
   */
  debtId?: string | null;
  /**
   * Per-card toggle for the balance half of `debtId`. Undefined counts as
   * ON - mirroring the card's balance is the point of linking it; the
   * keep-alive stamp is the free extra - so a link made before this field
   * existed starts tracking without a re-save.
   */
  updateDebtBalance?: boolean;
  /**
   * "Whose card is this" - expenses imported from this account default their
   * person suggestion to this Person when no merchant rule names one (rules
   * are per-merchant and more specific, so they win). Per-device like the
   * rest of the link. A deleted person's id may dangle here, same as
   * MerchantRule.personId - downstream surfaces render "(deleted person)".
   */
  personId?: string | null;
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
  /**
   * From a matched MerchantRule's `renameTo` - the user's cleaned-up display
   * name. Inbox rows show it and approval uses it as the entry description
   * in place of the raw bank text.
   */
  suggestedName?: string;
  /**
   * From a matched MerchantRule's `businessId`. Expenses only (mirrors
   * BudgetEntry.businessId) - never set on inflows.
   */
  suggestedBusinessId?: string;
  /**
   * From a matched MerchantRule's `personId`. Expenses only (mirrors
   * BudgetEntry.personId) - never set on inflows.
   */
  suggestedPersonId?: string;
  /**
   * Everyone the rule (or card) suggests when it's more than one person -
   * same pairing as BudgetEntry.personId/personIds: `suggestedPersonId`
   * is always the first of these, readers reconcile through
   * utils/entryPeople.entryPersonIds, absent for zero or one person.
   */
  suggestedPersonIds?: string[];
  /**
   * From a matched MerchantRule's `recurringEntryId`: the recurring bill
   * this transaction is expected to be the actual charge for (see
   * BudgetEntry.fulfillsRecurringId). Expenses only. Validated against the
   * live entries at approval time, never trusted blindly.
   */
  suggestedRecurringId?: string;
  /**
   * Heuristic: a manually-entered budget entry with the same amount and
   * direction exists within a few days - approving would double count.
   * Flag only, like transferLikely - never dropped automatically.
   */
  duplicateLikely?: boolean;
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
  /**
   * What to do with future imports from this merchant. Absent or
   * "categorize": suggest `category` (the user still approves). "approve":
   * auto-approve into a BudgetEntry with this rule's category/rename/
   * business/person - but never pending, transfer-likely, or
   * duplicate-likely items, which always wait for the user (see
   * selectAutoApprovable). "ignore": auto-skip the transaction entirely
   * (credit-card payments, transfers) - `category`/`type` are placeholders
   * on such rules.
   */
  action?: "categorize" | "ignore" | "approve";
  category: CategoryName;
  type: BudgetEntryType;
  /**
   * Display name for future imports from this merchant, saved when the user
   * renamed the transaction in the Review Inbox with "always do this".
   * Replaces the raw bank description on approved entries. Absent = keep
   * the provider text. Unread while action is "ignore".
   */
  renameTo?: string;
  /**
   * Business to tag future approved expenses with (see BudgetEntry.businessId).
   * A dangling id (business deleted) is harmless - approval just produces an
   * entry whose business shows as "(deleted business)", same as manual entries.
   * Unread while action is "ignore".
   */
  businessId?: string;
  /**
   * Person to assign future approved expenses to (see BudgetEntry.personId).
   * Same dangling-id and ignore-action semantics as `businessId`.
   */
  personId?: string;
  /**
   * Everyone future approved expenses are for when it's more than one
   * person (the family grocery store). Mirrors BudgetEntry.personIds:
   * `personId` is always the first, readers go through
   * utils/entryPeople.entryPersonIds, absent for zero or one person.
   */
  personIds?: string[];
  /**
   * Recurring bill future approved expenses from this merchant fulfil (see
   * BudgetEntry.fulfillsRecurringId) - "CITY POWER" is always the electric
   * bill. Checked against the live entries on every approval: a bill that
   * was deleted, stopped recurring, or isn't on its cycle that month simply
   * yields a plain entry. Unread while action is "ignore".
   */
  recurringEntryId?: string;
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
 * Per-device consent state for the live exchange-rate fetch behind the
 * Settings currency switch. Same shape/rationale as ConnectionsSettings:
 * shown once before the first network request, never re-prompted.
 */
export interface ExchangeRatesSettings {
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
  DebtTracker: {
    /**
     * Set by a card keep-alive notification tap (see
     * CardKeepAliveReminderHost): lands the user on the tab where the
     * keep-alive banner sits. Boolean only - notification content and deep
     * links deliberately carry no card ids or financial data.
     */
    openKeepAlive?: boolean;
    /**
     * Set by a payment result tap in the global search sheet (see
     * GlobalSearchModal hosts): opens the Payment History sheet on focus.
     * App-internal navigation only - never reachable from an external deep
     * link (parseQuickAddUri stays the only external entry point).
     */
    openHistory?: boolean;
  } | undefined;
  Budget: {
    /** When true, the Budget screen opens the connections Review Inbox on focus. */
    openInbox?: boolean;
    /**
     * Set by a budget-entry result tap in the global search sheet on
     * another tab: opens that entry's edit sheet on focus. An opaque
     * record id, app-internal navigation only - never reachable from an
     * external deep link.
     */
    searchEntryId?: string;
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
    /**
     * Set by a feature-spotlight CTA (see FeatureSpotlightModal): opens the
     * named Profile surface on focus - e.g. "connections" opens the Bank
     * Connections modal - and clears that feature's NEW badge.
     */
    openSection?: import("../data/featureSpotlights").ProfileSpotlightSection;
  } | undefined;
};
