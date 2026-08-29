/**
 * BudgetArk - Shared Test Fixtures
 * File: src/__tests__/fixtures.ts
 *
 * Typed `Partial<T> => T` builders for the core records, so test files stop
 * hand-rolling `as any` literals that silently drift from the real types
 * (`npm run typecheck` covers tests; ts-jest alone does not). Every builder
 * returns a fully-populated, valid record with a stable id and timestamps;
 * override only what the test cares about.
 *
 * Not a test file (doesn't match `*.test.ts`) and outside every
 * `collectCoverageFrom` glob, so it never counts toward the ratchet.
 */

import type {
  AssetAccount,
  BankConnection,
  BudgetEntry,
  Business,
  CategoryBudgetLimit,
  CustomCategory,
  Debt,
  ExternalAccountLink,
  Holding,
  MerchantRule,
  MonthStartBalance,
  NetWorthSnapshot,
  Payment,
  PendingTransaction,
  Person,
  SavingsGoal,
} from "../types";

/** A fixed "now" well inside the app's lifetime; tests that care pass their own. */
export const FIXTURE_TIME = "2026-06-01T12:00:00.000Z";

export const makeDebt = (over: Partial<Debt> = {}): Debt => ({
  id: "debt-1",
  name: "Visa",
  balance: 1000,
  originalBalance: 1000,
  rate: 19.9,
  minPayment: 50,
  owner: "mine",
  debtClass: "personal_credit",
  debtClassSource: "manual",
  createdAt: FIXTURE_TIME,
  updatedAt: FIXTURE_TIME,
  ...over,
});

export const makePayment = (over: Partial<Payment> = {}): Payment => ({
  id: "payment-1",
  debtId: "debt-1",
  amount: 50,
  date: FIXTURE_TIME,
  updatedAt: FIXTURE_TIME,
  ...over,
});

export const makeBudgetEntry = (over: Partial<BudgetEntry> = {}): BudgetEntry => ({
  id: "entry-1",
  type: "expense",
  category: "Grocery",
  amount: 100,
  date: FIXTURE_TIME,
  createdAt: FIXTURE_TIME,
  updatedAt: FIXTURE_TIME,
  ...over,
});

export const makeSavingsGoal = (over: Partial<SavingsGoal> = {}): SavingsGoal => ({
  id: "goal-1",
  name: "Emergency Fund",
  category: "emergency_fund",
  targetAmount: 5000,
  currentAmount: 1000,
  createdAt: FIXTURE_TIME,
  updatedAt: FIXTURE_TIME,
  ...over,
});

export const makeAssetAccount = (over: Partial<AssetAccount> = {}): AssetAccount => ({
  id: "account-1",
  name: "Savings",
  category: "savings",
  balance: 2500,
  createdAt: FIXTURE_TIME,
  updatedAt: FIXTURE_TIME,
  ...over,
});

export const makeBudgetLimit = (
  over: Partial<CategoryBudgetLimit> = {}
): CategoryBudgetLimit => ({
  category: "Grocery",
  monthlyLimit: 400,
  updatedAt: FIXTURE_TIME,
  ...over,
});

export const makeMonthStartBalance = (
  over: Partial<MonthStartBalance> = {}
): MonthStartBalance => ({
  balance: 1000,
  capturedAt: FIXTURE_TIME,
  updatedAt: FIXTURE_TIME,
  ...over,
});

export const makePerson = (over: Partial<Person> = {}): Person => ({
  id: "person-1",
  name: "Alex",
  createdAt: FIXTURE_TIME,
  updatedAt: FIXTURE_TIME,
  ...over,
});

export const makeBusiness = (over: Partial<Business> = {}): Business => ({
  id: "business-1",
  name: "Side Hustle LLC",
  createdAt: FIXTURE_TIME,
  updatedAt: FIXTURE_TIME,
  ...over,
});

export const makeCustomCategory = (over: Partial<CustomCategory> = {}): CustomCategory => ({
  id: "custom-1",
  name: "Pets",
  icon: "🐾",
  createdAt: FIXTURE_TIME,
  updatedAt: FIXTURE_TIME,
  ...over,
});

export const makeHolding = (over: Partial<Holding> = {}): Holding => ({
  id: "holding-1",
  symbol: "VTI",
  shares: 10,
  createdAt: FIXTURE_TIME,
  updatedAt: FIXTURE_TIME,
  ...over,
});

export const makeNetWorthSnapshot = (
  over: Partial<NetWorthSnapshot> = {}
): NetWorthSnapshot => ({
  dayKey: "2026-06-01",
  capturedAt: FIXTURE_TIME,
  totalAssets: 10000,
  totalDebt: 2000,
  netWorth: 8000,
  ...over,
});

export const makeMerchantRule = (over: Partial<MerchantRule> = {}): MerchantRule => ({
  id: "rule-1",
  merchantKey: "coffee shop",
  category: "Restaurant",
  type: "expense",
  useCount: 0,
  createdAt: FIXTURE_TIME,
  updatedAt: FIXTURE_TIME,
  ...over,
});

export const makeBankConnection = (
  over: Partial<BankConnection> = {}
): BankConnection => ({
  id: "conn-1",
  provider: "simplefin",
  name: "SimpleFIN - Test Bank",
  enabled: true,
  authStatus: "ok",
  createdAt: FIXTURE_TIME,
  updatedAt: FIXTURE_TIME,
  ...over,
});

export const makeExternalAccountLink = (
  over: Partial<ExternalAccountLink> = {}
): ExternalAccountLink => ({
  id: "link-1",
  connectionId: "conn-1",
  externalAccountId: "ACT-1",
  externalName: "Checking",
  assetAccountId: null,
  importTransactions: true,
  updateBalance: true,
  createdAt: FIXTURE_TIME,
  updatedAt: FIXTURE_TIME,
  ...over,
});

export const makePendingTransaction = (
  over: Partial<PendingTransaction> = {}
): PendingTransaction => ({
  id: "simplefin:ACT-1:TXN-1",
  connectionId: "conn-1",
  externalAccountId: "ACT-1",
  providerTxId: "TXN-1",
  pending: false,
  postedAt: FIXTURE_TIME,
  amount: -25,
  description: "COSTCO WHSE #1234",
  merchant: "COSTCO WHSE",
  suggestedType: "expense",
  fetchedAt: FIXTURE_TIME,
  updatedAt: FIXTURE_TIME,
  ...over,
});
