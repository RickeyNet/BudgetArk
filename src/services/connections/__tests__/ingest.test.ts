import {
  identityKeyFor,
  pendingFingerprintFor,
  planIngest,
  IngestInputs,
} from "../ingest";
import type {
  ExternalAccountLink,
  MerchantRule,
  PendingTransaction,
} from "../../../types";
import type { NormalizedTransaction } from "../types";

const NOW = "2026-07-01T12:00:00.000Z";

const link = (
  externalAccountId: string,
  overrides: Partial<ExternalAccountLink> = {},
): ExternalAccountLink => ({
  id: `link-${externalAccountId}`,
  connectionId: "conn-1",
  externalAccountId,
  externalName: externalAccountId,
  assetAccountId: null,
  importTransactions: true,
  updateBalance: true,
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
});

const tx = (
  overrides: Partial<NormalizedTransaction> = {},
): NormalizedTransaction => ({
  providerTxId: "TXN-1",
  externalAccountId: "ACT-1",
  postedAt: "2026-06-28T00:00:00.000Z",
  amount: -25.0,
  description: "COSTCO WHSE #1234",
  pending: false,
  ...overrides,
});

const baseInputs = (overrides: Partial<IngestInputs> = {}): IngestInputs => ({
  provider: "simplefin",
  connectionId: "conn-1",
  fetched: [tx()],
  links: [link("ACT-1")],
  inbox: [],
  ledger: {},
  knownEntryExternalIds: new Set(),
  rules: [],
  now: NOW,
  ...overrides,
});

const KEY = identityKeyFor("simplefin", "ACT-1", "TXN-1");

describe("identityKeyFor", () => {
  it("composes provider:account:txId", () => {
    expect(KEY).toBe("simplefin:ACT-1:TXN-1");
  });

  it("hashes oversized provider tx ids to keep the key bounded", () => {
    const longId = "x".repeat(200);
    const key = identityKeyFor("simplefin", "ACT-1", longId);
    expect(key.length).toBeLessThan(120);
    expect(key).not.toContain(longId);
    // Deterministic
    expect(identityKeyFor("simplefin", "ACT-1", longId)).toBe(key);
  });
});

describe("planIngest - basic triage", () => {
  it("creates a new inbox item with sign-derived type and merchant key", () => {
    const plan = planIngest(baseInputs());
    expect(plan.newInboxItems).toHaveLength(1);
    expect(plan.newInboxItems[0]).toMatchObject({
      id: KEY,
      suggestedType: "expense",
      merchant: "COSTCO WHSE",
      amount: -25,
      pending: false,
    });
  });

  it("maps inflows to income", () => {
    const plan = planIngest(
      baseInputs({ fetched: [tx({ amount: 1500, description: "PAYROLL" })] }),
    );
    expect(plan.newInboxItems[0].suggestedType).toBe("income");
  });

  it("skips zero-amount transactions", () => {
    const plan = planIngest(baseInputs({ fetched: [tx({ amount: 0 })] }));
    expect(plan.newInboxItems).toHaveLength(0);
  });

  it("skips unlinked accounts and import-disabled links", () => {
    expect(
      planIngest(baseInputs({ links: [] })).newInboxItems,
    ).toHaveLength(0);
    expect(
      planIngest(
        baseInputs({ links: [link("ACT-1", { importTransactions: false })] }),
      ).newInboxItems,
    ).toHaveLength(0);
  });

  it("dedupes a transaction double-listed in one batch", () => {
    const plan = planIngest(baseInputs({ fetched: [tx(), tx()] }));
    expect(plan.newInboxItems).toHaveLength(1);
  });
});

describe("planIngest - ledger and entry dedup", () => {
  it("skips transactions already decided in the ledger (dismissed stays dismissed)", () => {
    const plan = planIngest(
      baseInputs({
        ledger: { [KEY]: { status: "dismissed", at: NOW } },
      }),
    );
    expect(plan.newInboxItems).toHaveLength(0);
  });

  it("skips transactions whose key is on an existing budget entry (partner-approved via sync)", () => {
    const plan = planIngest(
      baseInputs({ knownEntryExternalIds: new Set([KEY]) }),
    );
    expect(plan.newInboxItems).toHaveLength(0);
  });
});

describe("planIngest - inbox updates", () => {
  const inboxItem: PendingTransaction = {
    id: KEY,
    connectionId: "conn-1",
    externalAccountId: "ACT-1",
    providerTxId: "TXN-1",
    pending: true,
    postedAt: "2026-06-28T00:00:00.000Z",
    amount: -25.0,
    description: "COSTCO WHSE #1234",
    merchant: "COSTCO WHSE",
    suggestedType: "expense",
    fetchedAt: "2026-06-28T01:00:00.000Z",
    updatedAt: "2026-06-28T01:00:00.000Z",
  };

  it("updates an inbox item when pending flips to posted", () => {
    const plan = planIngest(
      baseInputs({ inbox: [inboxItem], fetched: [tx({ pending: false })] }),
    );
    expect(plan.newInboxItems).toHaveLength(0);
    expect(plan.updatedInboxItems).toHaveLength(1);
    expect(plan.updatedInboxItems[0].pending).toBe(false);
    expect(plan.updatedInboxItems[0].updatedAt).toBe(NOW);
  });

  it("does nothing when the re-fetched item is unchanged", () => {
    const plan = planIngest(
      baseInputs({
        inbox: [{ ...inboxItem, pending: false }],
        fetched: [tx({ pending: false })],
      }),
    );
    expect(plan.updatedInboxItems).toHaveLength(0);
    expect(plan.newInboxItems).toHaveLength(0);
  });
});

describe("planIngest - pending->posted id instability", () => {
  const pendingItem: PendingTransaction = {
    id: identityKeyFor("simplefin", "ACT-1", "PENDING-9"),
    connectionId: "conn-1",
    externalAccountId: "ACT-1",
    providerTxId: "PENDING-9",
    pending: true,
    postedAt: "2026-06-27T00:00:00.000Z",
    amount: -25.0,
    description: "PENDING COSTCO",
    merchant: "PENDING COSTCO",
    suggestedType: "expense",
    fetchedAt: "2026-06-27T01:00:00.000Z",
    updatedAt: "2026-06-27T01:00:00.000Z",
  };

  it("migrates a pending inbox twin to the new posted id and aliases the old key", () => {
    const posted = tx({ providerTxId: "POSTED-1", pending: false });
    const plan = planIngest(baseInputs({ inbox: [pendingItem], fetched: [posted] }));

    expect(plan.newInboxItems).toHaveLength(0);
    expect(plan.updatedInboxItems).toHaveLength(1);
    const migrated = plan.updatedInboxItems[0];
    expect(migrated.id).toBe(identityKeyFor("simplefin", "ACT-1", "POSTED-1"));
    expect(migrated.pending).toBe(false);
    expect(plan.ledgerAliases[pendingItem.id]).toMatchObject({
      status: "dismissed",
      aliasOf: migrated.id,
    });
  });

  it("does not match a twin outside the ±4 day window or with a different amount", () => {
    const posted = tx({
      providerTxId: "POSTED-2",
      pending: false,
      postedAt: "2026-07-10T00:00:00.000Z",
    });
    const plan = planIngest(baseInputs({ inbox: [pendingItem], fetched: [posted] }));
    expect(plan.newInboxItems).toHaveLength(1);

    const differentAmount = tx({ providerTxId: "POSTED-3", pending: false, amount: -26 });
    const plan2 = planIngest(
      baseInputs({ inbox: [pendingItem], fetched: [differentAmount] }),
    );
    expect(plan2.newInboxItems).toHaveLength(1);
  });

  it("aliases a posted tx to a ledger decision made while it was pending", () => {
    const posted = tx({ providerTxId: "POSTED-4", pending: false });
    const decidedKey = pendingItem.id;
    const plan = planIngest(
      baseInputs({
        fetched: [posted],
        ledger: {
          [decidedKey]: {
            status: "approved",
            budgetEntryId: "entry-1",
            at: "2026-06-27T02:00:00.000Z",
            pendingFingerprint: pendingFingerprintFor(
              "ACT-1",
              -25.0,
              posted.postedAt,
            ),
          },
        },
      }),
    );
    expect(plan.newInboxItems).toHaveLength(0);
    const aliasKey = identityKeyFor("simplefin", "ACT-1", "POSTED-4");
    expect(plan.ledgerAliases[aliasKey]).toMatchObject({
      status: "approved",
      budgetEntryId: "entry-1",
      aliasOf: decidedKey,
    });
  });
});

describe("planIngest - suggestions and transfer heuristics", () => {
  it("suggests the category from a matching merchant rule", () => {
    const rules: MerchantRule[] = [
      {
        id: "r1",
        merchantKey: "COSTCO WHSE",
        category: "Grocery",
        type: "expense",
        useCount: 3,
        createdAt: NOW,
        updatedAt: NOW,
      },
    ];
    const plan = planIngest(baseInputs({ rules }));
    expect(plan.newInboxItems[0].suggestedCategory).toBe("Grocery");
  });

  it("suggests the rename, business, and person from a matching rule", () => {
    const rules: MerchantRule[] = [
      {
        id: "r1",
        merchantKey: "COSTCO WHSE",
        category: "Grocery",
        type: "expense",
        renameTo: "Costco",
        businessId: "biz-1",
        personId: "per-1",
        useCount: 3,
        createdAt: NOW,
        updatedAt: NOW,
      },
    ];
    const plan = planIngest(baseInputs({ rules }));
    expect(plan.newInboxItems[0].suggestedName).toBe("Costco");
    expect(plan.newInboxItems[0].suggestedBusinessId).toBe("biz-1");
    expect(plan.newInboxItems[0].suggestedPersonId).toBe("per-1");
  });

  it("never suggests a business or person on an inflow", () => {
    const rules: MerchantRule[] = [
      {
        id: "r1",
        merchantKey: "COSTCO WHSE",
        category: "Grocery",
        type: "expense",
        renameTo: "Costco",
        businessId: "biz-1",
        personId: "per-1",
        useCount: 3,
        createdAt: NOW,
        updatedAt: NOW,
      },
    ];
    // A refund from the same merchant matches the rule but is income.
    const plan = planIngest(baseInputs({ rules, fetched: [tx({ amount: 25 })] }));
    expect(plan.newInboxItems[0].suggestedType).toBe("income");
    expect(plan.newInboxItems[0].suggestedName).toBe("Costco");
    expect(plan.newInboxItems[0].suggestedBusinessId).toBeUndefined();
    expect(plan.newInboxItems[0].suggestedPersonId).toBeUndefined();
  });

  it("flags transfer-looking descriptions", () => {
    const plan = planIngest(
      baseInputs({
        fetched: [tx({ description: "ONLINE TRANSFER TO SAVINGS" })],
      }),
    );
    expect(plan.newInboxItems[0].transferLikely).toBe(true);
  });

  it("flags opposite-signed same-amount pairs across accounts", () => {
    const plan = planIngest(
      baseInputs({
        links: [link("ACT-1"), link("ACT-2")],
        fetched: [
          tx({ description: "MISC DEBIT", amount: -500 }),
          tx({
            providerTxId: "TXN-2",
            externalAccountId: "ACT-2",
            description: "MISC CREDIT",
            amount: 500,
          }),
        ],
      }),
    );
    expect(plan.newInboxItems).toHaveLength(2);
    expect(plan.newInboxItems.every((item) => item.transferLikely)).toBe(true);
  });

  it("does not flag ordinary unrelated transactions", () => {
    const plan = planIngest(baseInputs());
    expect(plan.newInboxItems[0].transferLikely).toBeUndefined();
  });
});

describe("planIngest - ignore rules", () => {
  const ignoreRule: MerchantRule = {
    id: "r-ignore",
    merchantKey: "COSTCO WHSE",
    action: "ignore",
    category: "Other",
    type: "expense",
    useCount: 1,
    createdAt: NOW,
    updatedAt: NOW,
  };

  it("auto-dismisses a matching transaction instead of creating an inbox item", () => {
    const plan = planIngest(baseInputs({ rules: [ignoreRule] }));
    expect(plan.newInboxItems).toHaveLength(0);
    expect(plan.autoDismissed[KEY]).toMatchObject({ status: "dismissed", at: NOW });
    expect(plan.autoDismissed[KEY].pendingFingerprint).toBeUndefined();
  });

  it("records the pending fingerprint so the posted twin aliases to the dismissal", () => {
    const plan = planIngest(
      baseInputs({ fetched: [tx({ pending: true })], rules: [ignoreRule] }),
    );
    expect(plan.newInboxItems).toHaveLength(0);
    expect(plan.autoDismissed[KEY].pendingFingerprint).toBe(
      pendingFingerprintFor("ACT-1", -25.0, "2026-06-28T00:00:00.000Z"),
    );
  });

  it("stays dismissed on re-fetch once the ledger entry is written", () => {
    const plan = planIngest(
      baseInputs({
        rules: [ignoreRule],
        ledger: { [KEY]: { status: "dismissed", at: NOW } },
      }),
    );
    expect(plan.newInboxItems).toHaveLength(0);
    expect(plan.autoDismissed[KEY]).toBeUndefined();
  });

  it("does not auto-dismiss when the rule is categorize (absent action)", () => {
    const categorize: MerchantRule = { ...ignoreRule, action: undefined, category: "Grocery" };
    const plan = planIngest(baseInputs({ rules: [categorize] }));
    expect(plan.newInboxItems).toHaveLength(1);
    expect(plan.newInboxItems[0].suggestedCategory).toBe("Grocery");
  });
});

describe("planIngest - manual-entry duplicate flagging", () => {
  it("flags a bank tx matching a manual entry's amount, direction, and date window", () => {
    const plan = planIngest(
      baseInputs({
        manualEntries: [
          { amount: 25.0, type: "expense", date: "2026-06-27T00:00:00.000Z" },
        ],
      }),
    );
    expect(plan.newInboxItems[0].duplicateLikely).toBe(true);
  });

  it("does not flag on amount, direction, or date-window mismatches", () => {
    const cases = [
      { amount: 26.0, type: "expense" as const, date: "2026-06-28T00:00:00.000Z" },
      { amount: 25.0, type: "income" as const, date: "2026-06-28T00:00:00.000Z" },
      { amount: 25.0, type: "expense" as const, date: "2026-06-20T00:00:00.000Z" },
    ];
    for (const entry of cases) {
      const plan = planIngest(baseInputs({ manualEntries: [entry] }));
      expect(plan.newInboxItems[0].duplicateLikely).toBeUndefined();
    }
  });

  it("is off when no manual entries are provided", () => {
    const plan = planIngest(baseInputs());
    expect(plan.newInboxItems[0].duplicateLikely).toBeUndefined();
  });
});
