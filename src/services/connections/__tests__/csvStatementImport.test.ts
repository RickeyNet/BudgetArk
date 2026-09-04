/**
 * BudgetArk - csvStatementImport (Review Inbox routing) tests
 * File: src/services/connections/__tests__/csvStatementImport.test.ts
 *
 * The side-effecting shell around bankCsvImport: statement rows go through
 * planIngest into the Review Inbox, dedupe against the ledger / existing
 * entries on a re-import, honor ignore/approve merchant rules, flag likely
 * duplicates of manual entries, and respect the inbox capacity cap. Storage
 * is the same in-memory encryptedStorage mock the sibling service tests use.
 */

import type { NormalizedTransaction } from "../types";
import type { MerchantRule, PendingTransaction } from "../../../types";
import { importStatementTransactions } from "../csvStatementImport";
import { statementTransactionId } from "../../../utils/bankCsvImport";

let mockStore: Map<string, string>;
let counter = 0;

jest.mock("../../../utils/uuid", () => ({ generateUUID: () => `uuid-${++counter}` }));

jest.mock("../../../storage/encryptedStorage", () => ({
  getItem: jest.fn(async (k: string) => (mockStore.has(k) ? mockStore.get(k)! : null)),
  setItem: jest.fn(async (k: string, v: string) => {
    mockStore.set(k, v);
  }),
  removeItem: jest.fn(async (k: string) => {
    mockStore.delete(k);
  }),
  multiSet: jest.fn(async (pairs: [string, string][]) => {
    for (const [k, v] of pairs) mockStore.set(k, v);
  }),
  updateItem: jest.fn(
    async (k: string, updater: (current: string | null) => string | null) => {
      const current = mockStore.has(k) ? mockStore.get(k)! : null;
      const next = updater(current);
      if (next === null || next === current) return;
      mockStore.set(k, next);
    },
  ),
}));

const INBOX_KEY = "@budgetark_pending_transactions";
const RULES_KEY = "@budgetark_merchant_rules";
const ENTRIES_KEY = "@budgetark_budget_entries";

const seed = (key: string, value: unknown) => mockStore.set(key, JSON.stringify(value));
const read = <T,>(key: string, fallback: T): T =>
  mockStore.has(key) ? (JSON.parse(mockStore.get(key)!) as T) : fallback;
const inboxNow = (): PendingTransaction[] => read(INBOX_KEY, []);

const ACCOUNT = "csv:Chase";
const tx = (
  overrides: Partial<NormalizedTransaction> & { ordinal?: number },
): NormalizedTransaction => {
  const postedAt = overrides.postedAt ?? "2026-01-05T12:00:00.000Z";
  const amount = overrides.amount ?? -20;
  const description = overrides.description ?? "COSTCO";
  const ordinal = overrides.ordinal ?? 0;
  return {
    providerTxId:
      overrides.providerTxId ??
      statementTransactionId(postedAt.slice(0, 10), amount, description, ordinal),
    externalAccountId: overrides.externalAccountId ?? ACCOUNT,
    postedAt,
    amount,
    description,
    pending: false,
  };
};

beforeEach(() => {
  mockStore = new Map();
  counter = 0;
});

describe("importStatementTransactions", () => {
  it("adds statement rows to the Review Inbox as posted items on the labelled account", async () => {
    const summary = await importStatementTransactions(
      [tx({ description: "COSTCO", amount: -84.32 }), tx({ description: "PAYROLL", amount: 2500 })],
      ACCOUNT,
    );
    expect(summary.added).toBe(2);
    const inbox = inboxNow();
    expect(inbox).toHaveLength(2);
    expect(inbox.every((i) => i.externalAccountId === ACCOUNT)).toBe(true);
    expect(inbox.every((i) => i.pending === false)).toBe(true);
    expect(inbox.find((i) => i.amount === -84.32)?.suggestedType).toBe("expense");
    expect(inbox.find((i) => i.amount === 2500)?.suggestedType).toBe("income");
  });

  it("re-importing the same file adds nothing the second time", async () => {
    const rows = [tx({ description: "COSTCO", amount: -84.32 })];
    const first = await importStatementTransactions(rows, ACCOUNT);
    expect(first.added).toBe(1);
    const second = await importStatementTransactions(rows, ACCOUNT);
    expect(second.added).toBe(0);
    expect(second.alreadyKnown).toBe(1);
    expect(inboxNow()).toHaveLength(1);
  });

  it("does not re-create an inbox row for a transaction already approved as an entry", async () => {
    const t = tx({ description: "COSTCO", amount: -50 });
    // An entry already carries this transaction's identity key.
    const key = `csv:${ACCOUNT}:${t.providerTxId}`;
    seed(ENTRIES_KEY, [
      {
        id: "e1",
        type: "expense",
        category: "Grocery",
        amount: 50,
        date: t.postedAt,
        createdAt: t.postedAt,
        updatedAt: t.postedAt,
        source: "bank",
        externalTxId: key,
      },
    ]);
    const summary = await importStatementTransactions([t], ACCOUNT);
    expect(summary.added).toBe(0);
    expect(summary.alreadyKnown).toBe(1);
    expect(inboxNow()).toHaveLength(0);
  });

  it("auto-dismisses rows matching an 'ignore' merchant rule", async () => {
    const rule: MerchantRule = {
      id: "r1",
      merchantKey: "COSTCO",
      action: "ignore",
      category: "Other",
      type: "expense",
      useCount: 1,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    seed(RULES_KEY, [rule]);
    const summary = await importStatementTransactions(
      [tx({ description: "COSTCO", amount: -30 })],
      ACCOUNT,
    );
    expect(summary.added).toBe(0);
    expect(summary.autoDismissed).toBe(1);
    expect(inboxNow()).toHaveLength(0);
  });

  it("flags a row that duplicates an existing manual entry", async () => {
    seed(ENTRIES_KEY, [
      {
        id: "m1",
        type: "expense",
        category: "Grocery",
        amount: 42,
        date: "2026-01-05T12:00:00.000Z",
        createdAt: "2026-01-05T12:00:00.000Z",
        updatedAt: "2026-01-05T12:00:00.000Z",
        source: "manual",
      },
    ]);
    const summary = await importStatementTransactions(
      [tx({ description: "WHOLE FOODS", amount: -42, postedAt: "2026-01-06T12:00:00.000Z" })],
      ACCOUNT,
    );
    expect(summary.added).toBe(1);
    expect(summary.flaggedDuplicates).toBe(1);
    expect(inboxNow()[0].duplicateLikely).toBe(true);
  });

  it("defers rows beyond the inbox capacity instead of dropping the oldest", async () => {
    // Pre-fill the inbox to one below the cap so only one new row fits.
    const existing: PendingTransaction[] = [];
    for (let i = 0; i < 499; i += 1) {
      existing.push({
        id: `pre-${i}`,
        connectionId: "c",
        externalAccountId: "simplefin-x",
        providerTxId: `p-${i}`,
        pending: false,
        postedAt: "2025-01-01T12:00:00.000Z",
        amount: -1,
        description: `old ${i}`,
        merchant: `old ${i}`,
        suggestedType: "expense",
        fetchedAt: "2025-01-01T12:00:00.000Z",
        updatedAt: "2025-01-01T12:00:00.000Z",
      });
    }
    seed(INBOX_KEY, existing);
    const summary = await importStatementTransactions(
      [
        tx({ description: "NEW A", amount: -5, postedAt: "2026-02-01T12:00:00.000Z" }),
        tx({ description: "NEW B", amount: -6, postedAt: "2026-03-01T12:00:00.000Z" }),
      ],
      ACCOUNT,
    );
    expect(summary.added).toBe(1);
    expect(summary.deferredForCapacity).toBe(1);
    // The newest of the two (March) is the one that made it in.
    const added = inboxNow().find((i) => i.externalAccountId === ACCOUNT);
    expect(added?.description).toBe("NEW B");
  });

  it("is a no-op for an empty transaction list", async () => {
    const summary = await importStatementTransactions([], ACCOUNT);
    expect(summary.added).toBe(0);
    expect(inboxNow()).toHaveLength(0);
  });
});
