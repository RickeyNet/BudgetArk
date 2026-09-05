/**
 * BudgetArk - Review Inbox Service Tests
 * File: src/services/connections/__tests__/reviewInboxService.test.ts
 *
 * Guards the approve/skip/bulk-approve surface of the Review Inbox: the
 * BudgetEntry fields an approval produces (source "bank", externalTxId,
 * merchant, business/person derivation from opts vs. the item's rule
 * suggestions), the "always do this" merchant-rule creation/update path,
 * the auto-approve sweep's conservative exclusions (pending/transfer/
 * duplicate items never auto-approve, and it derives fields from the RULE
 * not stale per-item suggestions), ignore-rule dismissal fan-out, and the
 * rule-management surface (change/remove) re-sweeping the inbox. Also pins
 * the documented crash-safety write order: BudgetEntry first, ledger
 * second, inbox removal last.
 *
 * Storage is mocked with an in-memory Map standing in for encryptedStorage
 * (see storage/__tests__/debtStorage.test.ts) so every real storage module
 * this service touches (budgetStorage, reviewInboxStorage,
 * merchantRulesStorage, externalAccountLinksStorage) runs for real.
 */

import type {
  BudgetEntry,
  Debt,
  IngestLedger,
  MerchantRule,
  Payment,
  PendingTransaction,
} from "../../../types";
import {
  makeBudgetEntry,
  makeDebt,
  makeExternalAccountLink,
  makeMerchantRule,
  makePayment,
  makePendingTransaction,
  makeSavingsGoal,
} from "../../../__tests__/fixtures";
import { inboxPaymentId } from "../../../utils/inboxDebtPayments";
import {
  applyPendingPaymentToDebt,
  applyPendingTransferToPlan,
  approvePendingTransaction,
  autoApproveInboxByRules,
  applyRulesToInbox,
  changeMerchantRule,
  dismissAndIgnoreMerchant,
  dismissPendingTransaction,
  dismissPendingTransactions,
  reconcileInboxWithDecisions,
  removeMerchantRule,
  approvePendingGroup,
} from "../reviewInboxService";
import * as reviewInboxStorage from "../../../storage/reviewInboxStorage";

let mockStore: Map<string, string>;

const mockGenerateUUID = jest.fn();
// Deferred reference (not `{ generateUUID: mockGenerateUUID }`): the factory
// runs the moment this module is first required - which, with jest.mock
// hoisted above the imports below, is before `mockGenerateUUID` initializes.
jest.mock("../../../utils/uuid", () => ({ generateUUID: () => mockGenerateUUID() }));

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
  updateItem: jest.fn(async (k: string, updater: (current: string | null) => string | null) => {
    const current = mockStore.has(k) ? mockStore.get(k)! : null;
    const next = updater(current);
    if (next === null || next === current) return;
    mockStore.set(k, next);
  }),
}));

const INBOX_KEY = "@budgetark_pending_transactions";
const LEDGER_KEY = "@budgetark_connection_ingest_ledger";
const RULES_KEY = "@budgetark_merchant_rules";
const LINKS_KEY = "@budgetark_external_account_links";
const ENTRIES_KEY = "@budgetark_budget_entries";
const GOALS_KEY = "@budgetark_savings_goals";
const DEBTS_KEY = "@budgetark_debts";
const PAYMENTS_KEY = "@budgetark_payments";

const seed = (key: string, value: unknown) => {
  mockStore.set(key, JSON.stringify(value));
};

const read = <T,>(key: string, fallback: T): T =>
  mockStore.has(key) ? (JSON.parse(mockStore.get(key)!) as T) : fallback;

const inboxNow = (): PendingTransaction[] => read(INBOX_KEY, []);
const ledgerNow = (): IngestLedger => read(LEDGER_KEY, {});
const rulesNow = (): MerchantRule[] => read(RULES_KEY, []);
const entriesNow = () => read(ENTRIES_KEY, [] as any[]);

beforeEach(() => {
  mockStore = new Map();
  let counter = 0;
  mockGenerateUUID.mockImplementation(() => `uuid-${++counter}`);
});

describe("approvePendingTransaction", () => {
  it("creates a BudgetEntry with source/externalTxId/merchant, records the ledger, and removes the inbox item", async () => {
    const item = makePendingTransaction();
    seed(INBOX_KEY, [item]);

    const entry = await approvePendingTransaction({
      pendingId: item.id,
      category: "Grocery",
    });

    expect(entry).toMatchObject({
      id: "uuid-1",
      type: "expense",
      category: "Grocery",
      amount: 25, // abs(item.amount)
      date: item.postedAt,
      source: "bank",
      externalTxId: item.id,
      merchant: item.merchant,
    });
    expect(entriesNow()).toHaveLength(1);
    expect(entriesNow()[0].id).toBe("uuid-1");
    expect(ledgerNow()[item.id]).toMatchObject({ status: "approved", budgetEntryId: "uuid-1" });
    expect(inboxNow()).toHaveLength(0);
  });

  it("returns null and writes nothing when the item no longer exists (double-tap)", async () => {
    seed(INBOX_KEY, []);
    const entry = await approvePendingTransaction({ pendingId: "gone", category: "Grocery" });
    expect(entry).toBeNull();
    expect(entriesNow()).toHaveLength(0);
    expect(ledgerNow()).toEqual({});
  });

  it("defaults type from the item's suggestedType and description from suggestedName, then raw description", async () => {
    const income = makePendingTransaction({
      id: "p-income",
      amount: 1500,
      suggestedType: "income",
      description: "PAYROLL DEPOSIT",
      suggestedName: undefined,
    });
    seed(INBOX_KEY, [income]);
    const entry = await approvePendingTransaction({ pendingId: income.id, category: "Salary" });
    expect(entry?.type).toBe("income");
    expect(entry?.description).toBe("PAYROLL DEPOSIT");

    const withRename = makePendingTransaction({
      id: "p-rename",
      suggestedName: "Costco",
    });
    seed(INBOX_KEY, [withRename]);
    const entry2 = await approvePendingTransaction({ pendingId: withRename.id, category: "Grocery" });
    expect(entry2?.description).toBe("Costco");

    // explicit description wins over both
    const withExplicit = makePendingTransaction({ id: "p-explicit", suggestedName: "Costco" });
    seed(INBOX_KEY, [withExplicit]);
    const entry3 = await approvePendingTransaction({
      pendingId: withExplicit.id,
      category: "Grocery",
      description: "  Warehouse run  ",
    });
    expect(entry3?.description).toBe("Warehouse run");
  });

  it("truncates a description over 220 chars and drops empty-after-sanitize to undefined", async () => {
    const longDescription = "X".repeat(300);
    const item = makePendingTransaction({ id: "p-long" });
    seed(INBOX_KEY, [item]);
    const entry = await approvePendingTransaction({
      pendingId: item.id,
      category: "Grocery",
      description: longDescription,
    });
    expect(entry?.description).toHaveLength(220);

    const item2 = makePendingTransaction({ id: "p-empty", description: "", suggestedName: undefined });
    seed(INBOX_KEY, [item2]);
    const entry2 = await approvePendingTransaction({ pendingId: item2.id, category: "Grocery" });
    expect(entry2?.description).toBeUndefined();
  });

  it("resolves business/person: null clears explicitly, undefined falls back to item suggestions, a value overrides", async () => {
    const item = makePendingTransaction({
      id: "p-biz",
      suggestedBusinessId: "biz-suggested",
      suggestedPersonId: "per-suggested",
    });

    seed(INBOX_KEY, [item]);
    const fallback = await approvePendingTransaction({ pendingId: item.id, category: "Grocery" });
    expect(fallback?.businessId).toBe("biz-suggested");
    expect(fallback?.personId).toBe("per-suggested");

    seed(INBOX_KEY, [item]);
    const cleared = await approvePendingTransaction({
      pendingId: item.id,
      category: "Grocery",
      businessId: null,
      personIds: null,
    });
    expect(cleared?.businessId).toBeUndefined();
    expect(cleared?.personId).toBeUndefined();

    seed(INBOX_KEY, [item]);
    const overridden = await approvePendingTransaction({
      pendingId: item.id,
      category: "Grocery",
      businessId: "biz-explicit",
      personIds: ["per-explicit"],
    });
    expect(overridden?.businessId).toBe("biz-explicit");
    expect(overridden?.personId).toBe("per-explicit");
    expect(overridden?.personIds).toBeUndefined(); // one person = single field only
  });

  it("assigns several people at once (personId = first, personIds = everyone) and falls back to a multi-person suggestion", async () => {
    const item = makePendingTransaction({ id: "p-family" });
    seed(INBOX_KEY, [item]);
    const shared = await approvePendingTransaction({
      pendingId: item.id,
      category: "Grocery",
      personIds: ["per-a", "per-b"],
    });
    expect(shared?.personId).toBe("per-a");
    expect(shared?.personIds).toEqual(["per-a", "per-b"]);

    // Rule/card suggestion carrying two people is honoured when opts omit people.
    const suggested = makePendingTransaction({
      id: "p-family-suggested",
      suggestedPersonId: "per-a",
      suggestedPersonIds: ["per-a", "per-b"],
    });
    seed(INBOX_KEY, [suggested]);
    const fromSuggestion = await approvePendingTransaction({
      pendingId: suggested.id,
      category: "Grocery",
    });
    expect(fromSuggestion?.personIds).toEqual(["per-a", "per-b"]);

    // An empty list is the same as null: explicitly nobody.
    seed(INBOX_KEY, [suggested]);
    const nobody = await approvePendingTransaction({
      pendingId: suggested.id,
      category: "Grocery",
      personIds: [],
    });
    expect(nobody?.personId).toBeUndefined();
    expect(nobody?.personIds).toBeUndefined();
  });

  it("never sets business/person on an income entry even if opts provide them", async () => {
    const item = makePendingTransaction({
      id: "p-income-biz",
      amount: 1500,
      suggestedType: "income",
    });
    seed(INBOX_KEY, [item]);
    const entry = await approvePendingTransaction({
      pendingId: item.id,
      category: "Salary",
      businessId: "biz-1",
      personIds: ["per-1", "per-2"],
    });
    expect(entry?.businessId).toBeUndefined();
    expect(entry?.personId).toBeUndefined();
    expect(entry?.personIds).toBeUndefined();
  });

  it("records the pending fingerprint on the ledger entry only while the item is still pending", async () => {
    const pendingItem = makePendingTransaction({ id: "p-pending", pending: true });
    seed(INBOX_KEY, [pendingItem]);
    await approvePendingTransaction({ pendingId: pendingItem.id, category: "Grocery" });
    expect(ledgerNow()[pendingItem.id].pendingFingerprint).toBeDefined();

    const postedItem = makePendingTransaction({ id: "p-posted", pending: false });
    seed(INBOX_KEY, [postedItem]);
    await approvePendingTransaction({ pendingId: postedItem.id, category: "Grocery" });
    expect(ledgerNow()[postedItem.id].pendingFingerprint).toBeUndefined();
  });

  describe("rememberRule", () => {
    it("creates an auto-approve merchant rule when the user says 'always do this'", async () => {
      const item = makePendingTransaction({ id: "p-remember", merchant: "COSTCO WHSE" });
      seed(INBOX_KEY, [item]);
      await approvePendingTransaction({
        pendingId: item.id,
        category: "Grocery",
        businessId: "biz-1",
        personIds: ["per-1"],
        rememberRule: true,
      });
      const rules = rulesNow();
      expect(rules).toHaveLength(1);
      expect(rules[0]).toMatchObject({
        merchantKey: "COSTCO WHSE",
        action: "approve",
        category: "Grocery",
        type: "expense",
        businessId: "biz-1",
        personId: "per-1",
        useCount: 1,
      });
      expect(rules[0].personIds).toBeUndefined();
    });

    it("remembers everyone picked, not just the first, and the auto-approve sweep applies them all", async () => {
      const item = makePendingTransaction({ id: "p-remember-family", merchant: "COSTCO WHSE" });
      seed(INBOX_KEY, [item]);
      await approvePendingTransaction({
        pendingId: item.id,
        category: "Grocery",
        personIds: ["per-1", "per-2"],
        rememberRule: true,
      });
      expect(rulesNow()[0]).toMatchObject({
        personId: "per-1",
        personIds: ["per-1", "per-2"],
      });

      // A later import from the same merchant is auto-approved for both.
      mockGenerateUUID.mockReturnValue("entry-family-2");
      const next = makePendingTransaction({ id: "p-family-next", merchant: "COSTCO WHSE" });
      seed(INBOX_KEY, [next]);
      await autoApproveInboxByRules();
      const entry = entriesNow().find((e) => e.externalTxId === "p-family-next");
      expect(entry?.personId).toBe("per-1");
      expect(entry?.personIds).toEqual(["per-1", "per-2"]);
    });

    it("only remembers a rename when the saved name differs from the bank's sanitized text", async () => {
      const untouched = makePendingTransaction({
        id: "p-untouched",
        merchant: "COSTCO WHSE",
        description: "COSTCO WHSE #1234",
        suggestedName: undefined,
      });
      seed(INBOX_KEY, [untouched]);
      await approvePendingTransaction({
        pendingId: untouched.id,
        category: "Grocery",
        description: "COSTCO WHSE #1234",
        rememberRule: true,
      });
      expect(rulesNow()[0].renameTo).toBeUndefined();

      seed(RULES_KEY, []);
      const renamed = makePendingTransaction({
        id: "p-renamed",
        merchant: "COSTCO WHSE",
        description: "COSTCO WHSE #1234",
        suggestedName: undefined,
      });
      seed(INBOX_KEY, [renamed]);
      await approvePendingTransaction({
        pendingId: renamed.id,
        category: "Grocery",
        description: "Costco",
        rememberRule: true,
      });
      expect(rulesNow()[0].renameTo).toBe("Costco");
    });

    it("does not create a rule when the item has no usable merchant key", async () => {
      const item = makePendingTransaction({ id: "p-nomerchant", merchant: "" });
      seed(INBOX_KEY, [item]);
      await approvePendingTransaction({ pendingId: item.id, category: "Grocery", rememberRule: true });
      expect(rulesNow()).toHaveLength(0);
    });

    it("re-remembering the same merchant updates the existing rule in place (upsert by merchantKey) without bumping useCount", async () => {
      const item1 = makePendingTransaction({ id: "p-1", merchant: "COSTCO WHSE" });
      seed(INBOX_KEY, [item1]);
      await approvePendingTransaction({ pendingId: item1.id, category: "Grocery", rememberRule: true });
      const firstRuleId = rulesNow()[0].id;

      const item2 = makePendingTransaction({ id: "p-2", merchant: "COSTCO WHSE" });
      seed(INBOX_KEY, [item2]);
      await approvePendingTransaction({ pendingId: item2.id, category: "Household", rememberRule: true });

      const rules = rulesNow();
      expect(rules).toHaveLength(1); // still one rule, not two
      expect(rules[0].id).toBe(firstRuleId); // identity preserved
      expect(rules[0].category).toBe("Household"); // new category wins
      expect(rules[0].useCount).toBe(1); // upsert does not increment usage
    });
  });

  it("propagates a storage failure and preserves the deliberate write order (entry written, ledger/removal not reached)", async () => {
    const item = makePendingTransaction({ id: "p-crash" });
    seed(INBOX_KEY, [item]);

    const encryptedStorage = jest.requireMock("../../../storage/encryptedStorage") as {
      setItem: jest.Mock;
    };
    const originalSetItem = encryptedStorage.setItem.getMockImplementation()!;
    encryptedStorage.setItem.mockImplementation(async (k: string, v: string) => {
      if (k === LEDGER_KEY) throw new Error("simulated ledger write failure");
      return originalSetItem(k, v);
    });

    try {
      await expect(
        approvePendingTransaction({ pendingId: item.id, category: "Grocery" }),
      ).rejects.toThrow("simulated ledger write failure");

      // Entry FIRST: it made it to storage even though the ledger write blew up.
      expect(entriesNow()).toHaveLength(1);
      // Ledger SECOND (failed) and inbox removal LAST never ran: the item is
      // still sitting in the inbox for the user to retry/dismiss.
      expect(ledgerNow()).toEqual({});
      expect(inboxNow().map((i) => i.id)).toEqual([item.id]);
    } finally {
      // Restore the shared mock so later tests in this file aren't affected.
      encryptedStorage.setItem.mockImplementation(originalSetItem);
    }
  });
});

describe("dismissPendingTransactions / dismissPendingTransaction", () => {
  it("records a dismissed ledger entry per known id and removes all requested ids from the inbox", async () => {
    const a = makePendingTransaction({ id: "a" });
    const b = makePendingTransaction({ id: "b" });
    const c = makePendingTransaction({ id: "c" });
    seed(INBOX_KEY, [a, b, c]);

    await dismissPendingTransactions(["a", "b", "missing"]);

    expect(ledgerNow()).toMatchObject({
      a: { status: "dismissed" },
      b: { status: "dismissed" },
    });
    expect(ledgerNow().missing).toBeUndefined();
    expect(inboxNow().map((i) => i.id)).toEqual(["c"]);
  });

  it("is a no-op for an empty id list (never touches storage)", async () => {
    const getSpy = jest.spyOn(reviewInboxStorage, "getPendingTransactions");
    await dismissPendingTransactions([]);
    expect(getSpy).not.toHaveBeenCalled();
    getSpy.mockRestore();
  });

  it("dismissPendingTransaction delegates to the plural form for a single id", async () => {
    const item = makePendingTransaction({ id: "solo" });
    seed(INBOX_KEY, [item]);
    await dismissPendingTransaction("solo");
    expect(inboxNow()).toHaveLength(0);
    expect(ledgerNow().solo).toMatchObject({ status: "dismissed" });
  });
});

describe("dismissAndIgnoreMerchant", () => {
  it("creates an ignore rule and dismisses every inbox item matching it in one pass", async () => {
    const target = makePendingTransaction({ id: "t1", merchant: "COSTCO WHSE" });
    const sameMerchant = makePendingTransaction({ id: "t2", merchant: "COSTCO WHSE" });
    const unrelated = makePendingTransaction({ id: "t3", merchant: "NETFLIX" });
    seed(INBOX_KEY, [target, sameMerchant, unrelated]);

    const count = await dismissAndIgnoreMerchant("t1");

    expect(count).toBe(2);
    expect(inboxNow().map((i) => i.id)).toEqual(["t3"]);
    expect(rulesNow()).toHaveLength(1);
    expect(rulesNow()[0]).toMatchObject({ merchantKey: "COSTCO WHSE", action: "ignore" });
    expect(ledgerNow()).toMatchObject({
      t1: { status: "dismissed" },
      t2: { status: "dismissed" },
    });
  });

  it("falls back to a plain single dismiss (no rule) when the item has no merchant key", async () => {
    const item = makePendingTransaction({ id: "nomerchant", merchant: "" });
    seed(INBOX_KEY, [item]);
    const count = await dismissAndIgnoreMerchant("nomerchant");
    expect(count).toBe(1);
    expect(rulesNow()).toHaveLength(0);
    expect(inboxNow()).toHaveLength(0);
  });

  it("returns 0 and writes nothing when the item no longer exists", async () => {
    seed(INBOX_KEY, []);
    const count = await dismissAndIgnoreMerchant("gone");
    expect(count).toBe(0);
    expect(rulesNow()).toHaveLength(0);
  });
});

describe("autoApproveInboxByRules", () => {
  it("approves only items covered by an approve rule, deriving fields from the RULE not the item's stale suggestions", async () => {
    const rule = makeMerchantRule({
      id: "rule-approve",
      merchantKey: "COSTCO WHSE",
      action: "approve",
      category: "Grocery",
      renameTo: "Costco",
      useCount: 2,
      // deliberately no businessId/personId on the rule
    });
    seed(RULES_KEY, [rule]);

    const eligible = makePendingTransaction({
      id: "eligible",
      merchant: "COSTCO WHSE",
      // stale suggestion from a since-changed rule - must NOT leak into the entry
      suggestedBusinessId: "biz-stale",
      suggestedPersonId: "per-stale",
    });
    const pendingStillWaiting = makePendingTransaction({ id: "still-pending", merchant: "COSTCO WHSE", pending: true });
    const transferLikely = makePendingTransaction({ id: "transfer", merchant: "COSTCO WHSE", transferLikely: true });
    const duplicateLikely = makePendingTransaction({ id: "dup", merchant: "COSTCO WHSE", duplicateLikely: true });
    const noMerchant = makePendingTransaction({ id: "no-merchant", merchant: "" });
    seed(INBOX_KEY, [eligible, pendingStillWaiting, transferLikely, duplicateLikely, noMerchant]);

    const approvedCount = await autoApproveInboxByRules();

    expect(approvedCount).toBe(1);
    const entries = entriesNow();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      category: "Grocery",
      description: "Costco",
      externalTxId: "eligible",
    });
    expect(entries[0].businessId).toBeUndefined(); // rule has none - never the stale suggestion
    expect(entries[0].personId).toBeUndefined();

    // Everything else stayed in the inbox untouched.
    expect(inboxNow().map((i) => i.id).sort()).toEqual(
      ["dup", "no-merchant", "still-pending", "transfer"].sort(),
    );

    // touchRuleUsage bumped the rule's usage stats.
    expect(rulesNow()[0].useCount).toBe(3);
    expect(rulesNow()[0].lastUsedAt).toBeDefined();
  });

  it("returns 0 when nothing in the inbox matches an approve rule", async () => {
    seed(RULES_KEY, [makeMerchantRule({ action: "categorize" })]);
    seed(INBOX_KEY, [makePendingTransaction()]);
    expect(await autoApproveInboxByRules()).toBe(0);
    expect(inboxNow()).toHaveLength(1);
  });
});

describe("applyRulesToInbox", () => {
  it("dismisses ignore-covered items, recategorizes changed suggestions, and auto-approves in one sweep", async () => {
    const links = [makeExternalAccountLink({ externalAccountId: "ACT-1" })];
    seed(LINKS_KEY, links);

    const ignoreRule = makeMerchantRule({
      id: "r-ignore",
      merchantKey: "SPOTIFY",
      action: "ignore",
    });
    const approveRule = makeMerchantRule({
      id: "r-approve",
      merchantKey: "COSTCO WHSE",
      action: "approve",
      category: "Grocery",
    });
    const categorizeRule = makeMerchantRule({
      id: "r-categorize",
      merchantKey: "NETFLIX",
      action: "categorize",
      category: "Subscriptions",
    });
    seed(RULES_KEY, [ignoreRule, approveRule, categorizeRule]);

    const toIgnore = makePendingTransaction({ id: "ignore-me", merchant: "SPOTIFY" });
    const toApprove = makePendingTransaction({
      id: "approve-me",
      merchant: "COSTCO WHSE",
      // Already matches the rule's suggestion, so the replan step doesn't
      // count it as recategorized - it's picked up by the auto-approve sweep.
      suggestedCategory: "Grocery",
    });
    const toRecategorize = makePendingTransaction({
      id: "recat-me",
      merchant: "NETFLIX",
      suggestedCategory: undefined, // will change to "Subscriptions"
    });
    seed(INBOX_KEY, [toIgnore, toApprove, toRecategorize]);

    const result = await applyRulesToInbox();

    expect(result.dismissedCount).toBe(1);
    expect(result.recategorizedCount).toBe(1);
    expect(result.autoApprovedCount).toBe(1);

    const remaining = inboxNow();
    expect(remaining.map((i) => i.id)).toEqual(["recat-me"]);
    expect(remaining[0].suggestedCategory).toBe("Subscriptions");
    expect(entriesNow()).toHaveLength(1);
  });
});

describe("changeMerchantRule", () => {
  it("switches a rule to approve and sweeps the inbox, auto-approving newly covered items", async () => {
    const rule = makeMerchantRule({
      id: "rule-1",
      merchantKey: "COSTCO WHSE",
      action: "categorize",
      category: "Restaurant",
    });
    seed(RULES_KEY, [rule]);
    seed(INBOX_KEY, [makePendingTransaction({ id: "p1", merchant: "COSTCO WHSE" })]);

    const result = await changeMerchantRule({
      ruleId: "rule-1",
      action: "approve",
      category: "Grocery",
    });

    expect(result.autoApprovedCount).toBe(1);
    expect(rulesNow()[0]).toMatchObject({ action: "approve", category: "Grocery" });
    expect(entriesNow()[0].category).toBe("Grocery");
  });

  it("clears the rename with an empty string, keeps it when omitted", async () => {
    const rule = makeMerchantRule({ id: "rule-1", merchantKey: "COSTCO WHSE", renameTo: "Costco" });
    seed(RULES_KEY, [rule]);

    await changeMerchantRule({ ruleId: "rule-1", action: "categorize", renameTo: "" });
    expect(rulesNow()[0].renameTo).toBeUndefined();

    seed(RULES_KEY, [{ ...rule, renameTo: "Costco" }]);
    await changeMerchantRule({ ruleId: "rule-1", action: "categorize" });
    expect(rulesNow()[0].renameTo).toBe("Costco");
  });

  it("clears business/person with explicit null, keeps them when omitted", async () => {
    const rule = makeMerchantRule({
      id: "rule-1",
      merchantKey: "COSTCO WHSE",
      businessId: "biz-1",
      personId: "per-1",
    });
    seed(RULES_KEY, [rule]);
    await changeMerchantRule({ ruleId: "rule-1", action: "categorize", businessId: null, personIds: null });
    expect(rulesNow()[0].businessId).toBeUndefined();
    expect(rulesNow()[0].personId).toBeUndefined();

    seed(RULES_KEY, [{ ...rule, businessId: "biz-1", personId: "per-1" }]);
    await changeMerchantRule({ ruleId: "rule-1", action: "categorize" });
    expect(rulesNow()[0].businessId).toBe("biz-1");
    expect(rulesNow()[0].personId).toBe("per-1");
  });

  it("stores several people on a rule and collapses back to one field when a single person is left", async () => {
    const rule = makeMerchantRule({ id: "rule-1", merchantKey: "COSTCO WHSE" });
    seed(RULES_KEY, [rule]);
    await changeMerchantRule({ ruleId: "rule-1", action: "categorize", personIds: ["per-1", "per-2"] });
    expect(rulesNow()[0].personId).toBe("per-1");
    expect(rulesNow()[0].personIds).toEqual(["per-1", "per-2"]);

    // Omitting people keeps both fields as they were.
    await changeMerchantRule({ ruleId: "rule-1", action: "approve" });
    expect(rulesNow()[0].personIds).toEqual(["per-1", "per-2"]);

    await changeMerchantRule({ ruleId: "rule-1", action: "categorize", personIds: ["per-2"] });
    expect(rulesNow()[0].personId).toBe("per-2");
    expect(rulesNow()[0].personIds).toBeUndefined();
  });

  it("ignores the category param when switching to 'ignore' (keeps the rule's current category as a placeholder)", async () => {
    const rule = makeMerchantRule({ id: "rule-1", merchantKey: "COSTCO WHSE", category: "Grocery" });
    seed(RULES_KEY, [rule]);
    await changeMerchantRule({ ruleId: "rule-1", action: "ignore", category: "Restaurant" });
    expect(rulesNow()[0]).toMatchObject({ action: "ignore", category: "Grocery" });
  });

  it("returns all-zero counts and writes nothing when the rule id is unknown", async () => {
    seed(RULES_KEY, [makeMerchantRule({ id: "rule-1" })]);
    const result = await changeMerchantRule({ ruleId: "missing", action: "approve", category: "Grocery" });
    expect(result).toEqual({ dismissedCount: 0, recategorizedCount: 0, autoApprovedCount: 0 });
    expect(rulesNow()).toHaveLength(1);
    expect(rulesNow()[0].action).toBeUndefined();
  });
});

describe("removeMerchantRule", () => {
  it("deletes the rule and hands its covered items to another prefix-matching rule via the full sweep", async () => {
    // Specific categorize rule shadows the general approve rule while it exists.
    const specific = makeMerchantRule({
      id: "r-specific",
      merchantKey: "COSTCO WHSE GAS",
      action: "categorize",
      category: "Fuel",
    });
    const general = makeMerchantRule({
      id: "r-general",
      merchantKey: "COSTCO WHSE",
      action: "approve",
      category: "Grocery",
    });
    seed(RULES_KEY, [specific, general]);
    seed(INBOX_KEY, [makePendingTransaction({ id: "p1", merchant: "COSTCO WHSE GAS" })]);

    // Before deletion: exact match on the specific rule, so it's just
    // categorized (not approved) and still sitting in the inbox.
    const before = await applyRulesToInbox();
    expect(before.autoApprovedCount).toBe(0);
    expect(inboxNow()[0].suggestedCategory).toBe("Fuel");

    const result = await removeMerchantRule("r-specific");

    expect(result.autoApprovedCount).toBe(1);
    expect(rulesNow().map((r) => r.id)).toEqual(["r-general"]);
    expect(entriesNow()[0].category).toBe("Grocery");
    expect(inboxNow()).toHaveLength(0);
  });
});

describe("bill fulfilment (BudgetEntry.fulfillsRecurringId)", () => {
  const electric = (over: Partial<BudgetEntry> = {}) =>
    makeBudgetEntry({
      id: "electric",
      category: "Utilities",
      description: "Electric",
      amount: 120,
      date: "2026-03-15T12:00:00",
      recurring: true,
      recurrenceInterval: 1,
      ...over,
    });
  const powerTx = (over: Partial<PendingTransaction> = {}) =>
    makePendingTransaction({
      id: "tx-power",
      merchant: "CITY POWER",
      description: "CITY POWER 06/03",
      amount: -137.42,
      postedAt: "2026-06-03T12:00:00.000Z",
      ...over,
    });

  it("links the approved entry to a live, on-cycle bill and remembers it on the rule", async () => {
    seed(ENTRIES_KEY, [electric()]);
    seed(INBOX_KEY, [powerTx()]);

    const entry = await approvePendingTransaction({
      pendingId: "tx-power",
      category: "Utilities",
      fulfillsRecurringId: "electric",
      rememberRule: true,
    });

    expect(entry?.fulfillsRecurringId).toBe("electric");
    expect(entriesNow().find((e: any) => e.id === "uuid-1")?.fulfillsRecurringId).toBe("electric");
    expect(rulesNow()[0]).toMatchObject({ merchantKey: "CITY POWER", recurringEntryId: "electric" });
  });

  it("falls back to the item's rule suggestion; null clears it", async () => {
    seed(ENTRIES_KEY, [electric()]);
    seed(INBOX_KEY, [
      powerTx({ id: "tx-a", suggestedRecurringId: "electric" }),
      powerTx({ id: "tx-b", suggestedRecurringId: "electric" }),
    ]);

    const fromSuggestion = await approvePendingTransaction({ pendingId: "tx-a", category: "Utilities" });
    expect(fromSuggestion?.fulfillsRecurringId).toBe("electric");

    const cleared = await approvePendingTransaction({
      pendingId: "tx-b",
      category: "Utilities",
      fulfillsRecurringId: null,
    });
    expect(cleared?.fulfillsRecurringId).toBeUndefined();
    expect(rulesNow()).toHaveLength(0);
  });

  it("drops the link when the bill is missing, not a bill, off-cycle, or the entry is income", async () => {
    // Missing bill.
    seed(ENTRIES_KEY, []);
    seed(INBOX_KEY, [powerTx({ id: "tx-missing" })]);
    expect(
      (await approvePendingTransaction({ pendingId: "tx-missing", category: "Utilities", fulfillsRecurringId: "electric" }))
        ?.fulfillsRecurringId
    ).toBeUndefined();

    // A one-off, and a contribution linked to an account, are not bills.
    seed(ENTRIES_KEY, [
      electric({ id: "oneoff", recurring: false }),
      electric({ id: "linked", linkedAccountId: "acct-1" }),
    ]);
    seed(INBOX_KEY, [powerTx({ id: "tx-oneoff" }), powerTx({ id: "tx-linked" })]);
    expect(
      (await approvePendingTransaction({ pendingId: "tx-oneoff", category: "Utilities", fulfillsRecurringId: "oneoff" }))
        ?.fulfillsRecurringId
    ).toBeUndefined();
    expect(
      (await approvePendingTransaction({ pendingId: "tx-linked", category: "Utilities", fulfillsRecurringId: "linked" }))
        ?.fulfillsRecurringId
    ).toBeUndefined();

    // Quarterly bill (Mar, Jun, Sep...): a May charge can't fulfil it, a June one can.
    seed(ENTRIES_KEY, [electric({ recurrenceInterval: 3 })]);
    seed(INBOX_KEY, [
      powerTx({ id: "tx-may", postedAt: "2026-05-04T12:00:00.000Z" }),
      powerTx({ id: "tx-jun" }),
      powerTx({ id: "tx-income", amount: 137.42, suggestedType: "income" }),
    ]);
    expect(
      (await approvePendingTransaction({ pendingId: "tx-may", category: "Utilities", fulfillsRecurringId: "electric" }))
        ?.fulfillsRecurringId
    ).toBeUndefined();
    expect(
      (await approvePendingTransaction({ pendingId: "tx-jun", category: "Utilities", fulfillsRecurringId: "electric" }))
        ?.fulfillsRecurringId
    ).toBe("electric");
    expect(
      (await approvePendingTransaction({ pendingId: "tx-income", category: "Other", fulfillsRecurringId: "electric" }))
        ?.fulfillsRecurringId
    ).toBeUndefined();
  });

  it("auto-approve applies the rule's bill through the same validation", async () => {
    seed(ENTRIES_KEY, [electric()]);
    seed(RULES_KEY, [
      makeMerchantRule({
        id: "rule-power",
        merchantKey: "CITY POWER",
        action: "approve",
        category: "Utilities",
        recurringEntryId: "electric",
      }),
    ]);
    seed(INBOX_KEY, [powerTx({ id: "tx-auto" }), powerTx({ id: "tx-auto-may", postedAt: "2026-05-04T12:00:00.000Z" })]);

    expect(await autoApproveInboxByRules()).toBe(2);
    const approved = entriesNow().filter((e: any) => e.source === "bank");
    expect(approved.map((e: any) => e.fulfillsRecurringId).sort()).toEqual(["electric", "electric"]);
  });

  it("changeMerchantRule keeps, replaces and clears the bill with the same tri-state as businessId", async () => {
    seed(INBOX_KEY, []);
    seed(ENTRIES_KEY, []);
    seed(RULES_KEY, [
      makeMerchantRule({ id: "rule-power", merchantKey: "CITY POWER", action: "categorize", category: "Utilities", recurringEntryId: "electric" }),
    ]);

    await changeMerchantRule({ ruleId: "rule-power", action: "approve", category: "Utilities" });
    expect(rulesNow()[0].recurringEntryId).toBe("electric");

    await changeMerchantRule({ ruleId: "rule-power", action: "approve", category: "Utilities", recurringEntryId: "water" });
    expect(rulesNow()[0].recurringEntryId).toBe("water");

    await changeMerchantRule({ ruleId: "rule-power", action: "approve", category: "Utilities", recurringEntryId: null });
    expect(rulesNow()[0].recurringEntryId).toBeUndefined();
  });
});

describe("reconcileInboxWithDecisions", () => {
  const readLedger = (): IngestLedger => JSON.parse(mockStore.get(LEDGER_KEY) ?? "{}");
  const readInbox = (): PendingTransaction[] => JSON.parse(mockStore.get(INBOX_KEY) ?? "[]");

  it("retires rows a partner approved (entry carries the key) or dismissed (synced ledger), keeps the rest", async () => {
    const approvedElsewhere = makePendingTransaction({ id: "simplefin:ACT-1:A", providerTxId: "A" });
    const dismissedElsewhere = makePendingTransaction({ id: "simplefin:ACT-1:B", providerTxId: "B" });
    const stillOpen = makePendingTransaction({ id: "simplefin:ACT-1:C", providerTxId: "C" });
    seed(INBOX_KEY, [approvedElsewhere, dismissedElsewhere, stillOpen]);
    seed(LEDGER_KEY, {
      "simplefin:ACT-1:B": { status: "dismissed", at: "2026-06-01T00:00:00.000Z" },
    });
    seed(ENTRIES_KEY, [
      makeBudgetEntry({ id: "entry-1", externalTxId: "simplefin:ACT-1:A", source: "bank" }),
    ]);

    const removed = await reconcileInboxWithDecisions();

    expect(removed).toBe(2);
    expect(readInbox().map((item) => item.id)).toEqual(["simplefin:ACT-1:C"]);
    const ledger = readLedger();
    expect(ledger["simplefin:ACT-1:A"]).toMatchObject({ status: "approved", budgetEntryId: "entry-1" });
    expect(ledger["simplefin:ACT-1:B"].status).toBe("dismissed"); // untouched
    expect(ledger["simplefin:ACT-1:C"]).toBeUndefined();
  });

  it("is a no-op on an empty inbox and when nothing was decided elsewhere", async () => {
    expect(await reconcileInboxWithDecisions()).toBe(0);
    seed(INBOX_KEY, [makePendingTransaction({ id: "simplefin:ACT-1:C", providerTxId: "C" })]);
    expect(await reconcileInboxWithDecisions()).toBe(0);
    expect(readInbox()).toHaveLength(1);
  });
});

describe("applyPendingPaymentToDebt", () => {
  const storageMock = () =>
    jest.requireMock("../../../storage/encryptedStorage") as {
      setItem: jest.Mock;
      multiSet: jest.Mock;
    };

  it("logs a Payment on the debt (balance reduced), records a dismissed ledger entry, removes the row, and files NO expense", async () => {
    const item = makePendingTransaction({ id: "simplefin:ACT-1:PAY-1", amount: -150.004 });
    seed(INBOX_KEY, [item]);
    seed(DEBTS_KEY, [makeDebt({ id: "visa", name: "Visa", balance: 900 })]);
    const { setItem, multiSet } = storageMock();
    setItem.mockClear();
    multiSet.mockClear();

    const result = await applyPendingPaymentToDebt(item.id, "visa");

    // Ledger first (durable decision), money second, inbox row last -
    // the same crash-safety order as applyPendingTransferToPlan.
    const order = [
      ...setItem.mock.calls.map((call: unknown[], i: number) => ({
        key: call[0] as string,
        at: setItem.mock.invocationCallOrder[i],
      })),
      ...multiSet.mock.calls.map((call: unknown[], i: number) => ({
        key: (call[0] as [string, string][]).map((pair) => pair[0]).join("+"),
        at: multiSet.mock.invocationCallOrder[i],
      })),
    ]
      .sort((a, b) => a.at - b.at)
      .map((entry) => entry.key);
    expect(order).toEqual([LEDGER_KEY, `${DEBTS_KEY}+${PAYMENTS_KEY}`, INBOX_KEY]);

    expect(result?.debts.find((d) => d.id === "visa")?.balance).toBe(750);
    expect(result?.paidOff).toBeNull();
    const payments = read<Payment[]>(PAYMENTS_KEY, []);
    expect(payments).toHaveLength(1);
    expect(payments[0]).toMatchObject({
      id: inboxPaymentId(item.id),
      debtId: "visa",
      amount: 150,
      appliedAmount: 150,
      // Dated when the bank posted it, so it lands in the statement's month.
      date: item.postedAt,
    });
    expect(read<Debt[]>(DEBTS_KEY, [])[0].balance).toBe(750);
    const ledger = read<IngestLedger>(LEDGER_KEY, {});
    expect(ledger[item.id]).toMatchObject({ status: "dismissed" });
    expect(ledger[item.id].budgetEntryId).toBeUndefined();
    expect(inboxNow()).toEqual([]);
    // No BudgetEntry: the Budget's Debt Payments figure is derived from the
    // Payment collection, so an entry too would count the money twice.
    expect(read<BudgetEntry[]>(ENTRIES_KEY, [])).toEqual([]);
  });

  it("reports the debt as paid off when the payment clears its balance", async () => {
    const item = makePendingTransaction({ id: "simplefin:ACT-1:PAY-2", amount: -120 });
    seed(INBOX_KEY, [item]);
    seed(DEBTS_KEY, [makeDebt({ id: "visa", name: "Visa", balance: 100 })]);

    const result = await applyPendingPaymentToDebt(item.id, "visa");

    expect(result?.paidOff?.id).toBe("visa");
    expect(result?.debts[0].balance).toBe(0);
    // Overpayment applies only what was owed (recordPayment clamps).
    expect(read<Payment[]>(PAYMENTS_KEY, [])[0]).toMatchObject({ amount: 120, appliedAmount: 100 });
  });

  it("returns null and writes nothing when the item, the debt, or a positive amount is missing", async () => {
    const item = makePendingTransaction({ amount: -20 });
    seed(INBOX_KEY, [item]);
    seed(DEBTS_KEY, [makeDebt({ id: "visa", balance: 500 })]);

    expect(await applyPendingPaymentToDebt("nope", "visa")).toBeNull();
    expect(await applyPendingPaymentToDebt(item.id, "missing")).toBeNull();
    // A deleted debt is not offered and not paid.
    seed(DEBTS_KEY, [makeDebt({ id: "visa", balance: 500, deletedAt: item.postedAt })]);
    expect(await applyPendingPaymentToDebt(item.id, "visa")).toBeNull();
    seed(DEBTS_KEY, [makeDebt({ id: "visa", balance: 500 })]);
    seed(INBOX_KEY, [makePendingTransaction({ id: "zero", amount: 0 })]);
    expect(await applyPendingPaymentToDebt("zero", "visa")).toBeNull();

    expect(read<PendingTransaction[]>(INBOX_KEY, [])).toHaveLength(1);
    expect(read<IngestLedger>(LEDGER_KEY, {})).toEqual({});
    expect(read<Payment[]>(PAYMENTS_KEY, [])).toEqual([]);
    expect(read<Debt[]>(DEBTS_KEY, [])[0].balance).toBe(500);
  });

  it("a retry after the payment already landed (crash before inbox removal, or the partner's copy) never pays twice", async () => {
    const item = makePendingTransaction({ id: "simplefin:ACT-1:PAY-3", amount: -50 });
    seed(INBOX_KEY, [item]);
    seed(DEBTS_KEY, [makeDebt({ id: "visa", balance: 300 })]);
    // The same real-world payment is already on file under the
    // deterministic id (the balance was reduced when it was recorded).
    seed(PAYMENTS_KEY, [
      makePayment({ id: inboxPaymentId(item.id), debtId: "visa", amount: 50, appliedAmount: 50 }),
    ]);

    const result = await applyPendingPaymentToDebt(item.id, "visa");

    expect(result?.debts[0].balance).toBe(300);
    expect(read<Payment[]>(PAYMENTS_KEY, [])).toHaveLength(1);
    expect(inboxNow()).toEqual([]);
    expect(read<IngestLedger>(LEDGER_KEY, {})[item.id]).toMatchObject({ status: "dismissed" });
  });

  it("a crash between the ledger and the payment write leaves an unpaid row, never a double payment", async () => {
    const item = makePendingTransaction({ id: "simplefin:ACT-1:PAY-4", amount: -40 });
    seed(INBOX_KEY, [item]);
    seed(DEBTS_KEY, [makeDebt({ id: "visa", balance: 300 })]);
    const { multiSet } = storageMock();
    const original = multiSet.getMockImplementation()!;
    multiSet.mockImplementation(async (pairs: [string, string][]) => {
      if (pairs.some(([k]) => k === PAYMENTS_KEY)) throw new Error("simulated payment write failure");
      return original(pairs);
    });

    try {
      await expect(applyPendingPaymentToDebt(item.id, "visa")).rejects.toThrow(
        "simulated payment write failure",
      );
      expect(ledgerNow()[item.id]).toMatchObject({ status: "dismissed" });
      expect(read<Debt[]>(DEBTS_KEY, [])[0].balance).toBe(300);
      expect(read<Payment[]>(PAYMENTS_KEY, [])).toEqual([]);
      expect(inboxNow().map((i) => i.id)).toEqual([item.id]);
    } finally {
      multiSet.mockImplementation(original);
    }
  });
});

describe("debt merchant rules (MerchantRule.debtId)", () => {
  const cardPayment = (over: Partial<PendingTransaction> = {}) =>
    makePendingTransaction({
      id: "tx-card",
      merchant: "PAYMENT TO CHASE CARD",
      description: "PAYMENT TO CHASE CARD 09/01",
      amount: -150,
      transferLikely: true,
      ...over,
    });

  it("'always do this' on a debt payment saves an approve rule carrying the debt, no entry", async () => {
    seed(INBOX_KEY, [cardPayment()]);
    seed(DEBTS_KEY, [makeDebt({ id: "visa", balance: 900 })]);

    const result = await applyPendingPaymentToDebt("tx-card", "visa", { rememberRule: true });

    expect(result?.debts[0].balance).toBe(750);
    expect(rulesNow()).toHaveLength(1);
    expect(rulesNow()[0]).toMatchObject({
      merchantKey: "PAYMENT TO CHASE CARD",
      action: "approve",
      category: "Debt Payments",
      type: "expense",
      debtId: "visa",
      useCount: 1,
    });
    expect(rulesNow()[0].recurringEntryId).toBeUndefined();
    expect(read<BudgetEntry[]>(ENTRIES_KEY, [])).toEqual([]);
  });

  it("re-saving the merchant from a plain approval drops the debt from its rule", async () => {
    seed(INBOX_KEY, [cardPayment({ id: "tx-1" }), cardPayment({ id: "tx-2", transferLikely: false })]);
    seed(DEBTS_KEY, [makeDebt({ id: "visa", balance: 900 })]);
    await applyPendingPaymentToDebt("tx-1", "visa", { rememberRule: true });
    expect(rulesNow()[0].debtId).toBe("visa");

    await approvePendingTransaction({ pendingId: "tx-2", category: "Other", rememberRule: true });

    expect(rulesNow()).toHaveLength(1);
    expect(rulesNow()[0]).toMatchObject({ category: "Other", action: "approve" });
    expect(rulesNow()[0].debtId).toBeUndefined();
  });

  it("the auto sweep logs payments for debt rules - transfer-likely rows included, pending and duplicate-likely still wait", async () => {
    seed(RULES_KEY, [
      makeMerchantRule({
        id: "rule-card",
        merchantKey: "PAYMENT TO CHASE CARD",
        action: "approve",
        category: "Debt Payments",
        debtId: "visa",
        useCount: 3,
      }),
    ]);
    seed(DEBTS_KEY, [makeDebt({ id: "visa", balance: 1000 })]);
    seed(INBOX_KEY, [
      cardPayment({ id: "tx-a", amount: -100 }),
      cardPayment({ id: "tx-b", amount: -50, transferLikely: false }),
      cardPayment({ id: "tx-pending", pending: true }),
      cardPayment({ id: "tx-dup", duplicateLikely: true }),
    ]);

    expect(await autoApproveInboxByRules()).toBe(2);

    expect(read<Debt[]>(DEBTS_KEY, [])[0].balance).toBe(850);
    const payments = read<Payment[]>(PAYMENTS_KEY, []);
    expect(payments.map((p) => p.id).sort()).toEqual(
      [inboxPaymentId("tx-a"), inboxPaymentId("tx-b")].sort(),
    );
    expect(payments.every((p) => p.debtId === "visa")).toBe(true);
    expect(inboxNow().map((i) => i.id).sort()).toEqual(["tx-dup", "tx-pending"]);
    expect(read<BudgetEntry[]>(ENTRIES_KEY, [])).toEqual([]);
    expect(rulesNow()[0].useCount).toBe(5);
    const ledger = read<IngestLedger>(LEDGER_KEY, {});
    expect(ledger["tx-a"]).toMatchObject({ status: "dismissed" });
    expect(ledger["tx-b"]).toMatchObject({ status: "dismissed" });
  });

  it("a debt rule whose debt was deleted files a plain entry in the rule's category instead", async () => {
    seed(RULES_KEY, [
      makeMerchantRule({
        id: "rule-card",
        merchantKey: "PAYMENT TO CHASE CARD",
        action: "approve",
        category: "Debt Payments",
        debtId: "gone",
      }),
    ]);
    seed(DEBTS_KEY, [makeDebt({ id: "visa", balance: 1000 })]);
    seed(INBOX_KEY, [cardPayment({ id: "tx-a", transferLikely: false })]);

    expect(await autoApproveInboxByRules()).toBe(1);

    expect(read<Payment[]>(PAYMENTS_KEY, [])).toEqual([]);
    expect(read<Debt[]>(DEBTS_KEY, [])[0].balance).toBe(1000);
    const entries = read<BudgetEntry[]>(ENTRIES_KEY, []);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ category: "Debt Payments", externalTxId: "tx-a", amount: 150 });
    expect(inboxNow()).toEqual([]);
  });

  it("applyRulesToInbox surfaces the rule's debt as a suggestion on rows it can't auto-log", async () => {
    seed(RULES_KEY, [
      makeMerchantRule({
        id: "rule-card",
        merchantKey: "PAYMENT TO CHASE CARD",
        action: "categorize",
        category: "Debt Payments",
        debtId: "visa",
      }),
    ]);
    seed(DEBTS_KEY, [makeDebt({ id: "visa", balance: 1000 })]);
    seed(INBOX_KEY, [cardPayment({ id: "tx-a" })]);

    const outcome = await applyRulesToInbox();

    expect(outcome.autoApprovedCount).toBe(0);
    expect(inboxNow()[0]).toMatchObject({ suggestedCategory: "Debt Payments", suggestedDebtId: "visa" });
  });

  it("changeMerchantRule keeps, replaces and clears the debt with the same tri-state as the bill", async () => {
    seed(INBOX_KEY, []);
    seed(ENTRIES_KEY, []);
    seed(RULES_KEY, [
      makeMerchantRule({ id: "rule-card", merchantKey: "PAYMENT TO CHASE CARD", action: "categorize", category: "Debt Payments", debtId: "visa" }),
    ]);

    await changeMerchantRule({ ruleId: "rule-card", action: "approve", category: "Debt Payments" });
    expect(rulesNow()[0].debtId).toBe("visa");

    await changeMerchantRule({ ruleId: "rule-card", action: "approve", category: "Debt Payments", debtId: "amex" });
    expect(rulesNow()[0].debtId).toBe("amex");

    await changeMerchantRule({ ruleId: "rule-card", action: "approve", category: "Debt Payments", debtId: null });
    expect(rulesNow()[0].debtId).toBeUndefined();
  });
});

describe("applyPendingTransferToPlan", () => {
  it("adds the amount to the plan, records a dismissed ledger entry, and removes the row (ledger first, money second, inbox last)", async () => {
    const item = makePendingTransaction({ amount: -200.005 });
    seed(INBOX_KEY, [item]);
    seed(GOALS_KEY, [
      makeSavingsGoal({ id: "plan", name: "Bike", category: "other", currentAmount: 50 }),
      makeSavingsGoal({ id: "ef" }),
    ]);
    const encryptedStorage = jest.requireMock("../../../storage/encryptedStorage") as {
      setItem: jest.Mock;
    };
    encryptedStorage.setItem.mockClear();

    const goals = await applyPendingTransferToPlan(item.id, "plan");

    // The write order IS the crash-safety guarantee: a credited goal carries
    // no externalTxId, so the ledger (the durable decision) must land before
    // the money, and the inbox row goes last.
    expect(encryptedStorage.setItem.mock.calls.map((call: unknown[]) => call[0])).toEqual([
      LEDGER_KEY,
      GOALS_KEY,
      INBOX_KEY,
    ]);
    expect(goals?.find((g) => g.id === "plan")?.currentAmount).toBe(250.01);
    expect(read<Record<string, unknown>>(GOALS_KEY, {})).toBeTruthy();
    const ledger = read<IngestLedger>(LEDGER_KEY, {});
    expect(ledger[item.id]).toMatchObject({ status: "dismissed" });
    expect(ledger[item.id].budgetEntryId).toBeUndefined();
    expect(read<PendingTransaction[]>(INBOX_KEY, [])).toEqual([]);
    // No expense was filed.
    expect(read<BudgetEntry[]>(ENTRIES_KEY, [])).toEqual([]);
  });

  it("returns null and writes nothing when the item, the plan, or a positive amount is missing", async () => {
    const item = makePendingTransaction({ amount: -20 });
    seed(INBOX_KEY, [item]);
    seed(GOALS_KEY, [makeSavingsGoal({ id: "plan", category: "other", currentAmount: 5 })]);

    expect(await applyPendingTransferToPlan("nope", "plan")).toBeNull();
    expect(await applyPendingTransferToPlan(item.id, "missing")).toBeNull();
    // The emergency fund is not a purchase plan.
    expect(await applyPendingTransferToPlan(item.id, "ef")).toBeNull();
    seed(INBOX_KEY, [makePendingTransaction({ id: "zero", amount: 0 })]);
    expect(await applyPendingTransferToPlan("zero", "plan")).toBeNull();

    expect(read<PendingTransaction[]>(INBOX_KEY, [])).toHaveLength(1);
    expect(read<IngestLedger>(LEDGER_KEY, {})).toEqual({});
    expect(read<{ currentAmount: number }[]>(GOALS_KEY, [])[0].currentAmount).toBe(5);
  });

  it("a crash between the ledger and the goal write leaves an un-credited row, never a double credit", async () => {
    const item = makePendingTransaction({ id: "p-plan-crash", amount: -40 });
    seed(INBOX_KEY, [item]);
    seed(GOALS_KEY, [makeSavingsGoal({ id: "plan", category: "other", currentAmount: 10 })]);

    const encryptedStorage = jest.requireMock("../../../storage/encryptedStorage") as {
      setItem: jest.Mock;
    };
    const originalSetItem = encryptedStorage.setItem.getMockImplementation()!;
    encryptedStorage.setItem.mockImplementation(async (k: string, v: string) => {
      if (k === GOALS_KEY) throw new Error("simulated goal write failure");
      return originalSetItem(k, v);
    });

    try {
      await expect(applyPendingTransferToPlan(item.id, "plan")).rejects.toThrow(
        "simulated goal write failure",
      );
      // Ledger FIRST: the decision is durable even though the credit failed.
      expect(ledgerNow()[item.id]).toMatchObject({ status: "dismissed" });
      // Money SECOND (failed): nothing was credited, so a retry cannot
      // double-count; the reconcile pass retires the row from the ledger.
      expect(read<{ currentAmount: number }[]>(GOALS_KEY, [])[0].currentAmount).toBe(10);
      expect(inboxNow().map((i) => i.id)).toEqual([item.id]);
    } finally {
      encryptedStorage.setItem.mockImplementation(originalSetItem);
    }

    expect(await reconcileInboxWithDecisions()).toBe(1);
    expect(inboxNow()).toEqual([]);
    expect(read<{ currentAmount: number }[]>(GOALS_KEY, [])[0].currentAmount).toBe(10);
  });
});

describe("approvePendingGroup", () => {
  it("approves every item in the group with one category and one remembered rule", async () => {
    const a = makePendingTransaction({ id: "a", merchant: "COSTCO", amount: -20, description: "COSTCO #1" });
    const b = makePendingTransaction({ id: "b", merchant: "COSTCO", amount: -35, description: "COSTCO #2" });
    seed(INBOX_KEY, [a, b]);

    const count = await approvePendingGroup(["a", "b"], "Grocery", { rememberRule: true });

    expect(count).toBe(2);
    // Both became Grocery entries.
    const entries = entriesNow();
    expect(entries).toHaveLength(2);
    expect(entries.every((e: any) => e.category === "Grocery")).toBe(true);
    // Inbox emptied.
    expect(inboxNow()).toHaveLength(0);
    // Exactly one auto-approve rule was remembered for the shared merchant.
    const costcoRules = rulesNow().filter((r) => r.merchantKey === "COSTCO");
    expect(costcoRules).toHaveLength(1);
    expect(costcoRules[0].action).toBe("approve");
    expect(costcoRules[0].category).toBe("Grocery");
  });

  it("does not remember a rule when rememberRule is false", async () => {
    seed(INBOX_KEY, [makePendingTransaction({ id: "a", merchant: "COSTCO" })]);
    await approvePendingGroup(["a"], "Grocery");
    expect(rulesNow()).toHaveLength(0);
  });

  it("skips ids that are already gone", async () => {
    seed(INBOX_KEY, [makePendingTransaction({ id: "a", merchant: "COSTCO" })]);
    const count = await approvePendingGroup(["a", "missing"], "Grocery");
    expect(count).toBe(1);
  });
});
