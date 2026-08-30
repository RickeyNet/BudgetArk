import {
  identityKeyFor,
  pendingFingerprintFor,
  planIngest,
  splitPendingFingerprint,
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

  it("recomputes rule suggestions when the posted description changes the merchant key", () => {
    // Pending "PENDING COSTCO" had no matching rule; once it posts as
    // "COSTCO WHSE #1234" the categorize rule must apply - previously the
    // update kept the stale (empty) suggestions until a rule edit replanned.
    const rules: MerchantRule[] = [
      {
        id: "r1",
        merchantKey: "COSTCO WHSE",
        category: "Grocery",
        type: "expense",
        renameTo: "Costco",
        useCount: 1,
        createdAt: NOW,
        updatedAt: NOW,
      },
    ];
    const plan = planIngest(
      baseInputs({
        rules,
        inbox: [{ ...inboxItem, description: "PENDING COSTCO", merchant: "PENDING COSTCO" }],
        fetched: [tx({ pending: false })],
      }),
    );
    expect(plan.updatedInboxItems).toHaveLength(1);
    expect(plan.updatedInboxItems[0]).toMatchObject({
      merchant: "COSTCO WHSE",
      suggestedCategory: "Grocery",
      suggestedName: "Costco",
    });
  });

  it("does not treat a >220-char description as drift on every sync", () => {
    const longDescription = "X".repeat(300);
    const plan = planIngest(
      baseInputs({
        inbox: [{ ...inboxItem, pending: false, description: longDescription.slice(0, 220) }],
        fetched: [tx({ pending: false, description: longDescription })],
      }),
    );
    expect(plan.updatedInboxItems).toHaveLength(0);
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

  it("migrates the twin even when the fetch lists the pending id BEFORE the posted id", () => {
    // Regression: the pending id is handled through the `existing` path
    // first, which used to mark it as "handled" and hide it from the twin
    // search - the posted id then became a second inbox row (double count).
    const pendingAgain = tx({
      providerTxId: "PENDING-9",
      pending: true,
      postedAt: pendingItem.postedAt,
      description: "PENDING COSTCO",
    });
    const posted = tx({ providerTxId: "POSTED-1", pending: false });
    const plan = planIngest(
      baseInputs({ inbox: [pendingItem], fetched: [pendingAgain, posted] }),
    );

    expect(plan.newInboxItems).toHaveLength(0);
    expect(plan.updatedInboxItems).toHaveLength(1);
    expect(plan.updatedInboxItems[0].id).toBe(
      identityKeyFor("simplefin", "ACT-1", "POSTED-1"),
    );
    expect(plan.ledgerAliases[pendingItem.id]?.aliasOf).toBe(
      plan.updatedInboxItems[0].id,
    );
  });

  it("folds a same-batch drift update of the pending id into the migration", () => {
    // Pending id re-listed with a drifted date (still within the twin
    // window; twin matching is exact-amount by design), then its posted twin.
    const pendingDrifted = tx({
      providerTxId: "PENDING-9",
      pending: true,
      postedAt: "2026-06-28T00:00:00.000Z",
      description: "PENDING COSTCO",
    });
    const posted = tx({ providerTxId: "POSTED-1", pending: false });
    const plan = planIngest(
      baseInputs({ inbox: [pendingItem], fetched: [pendingDrifted, posted] }),
    );
    // Exactly one row, under the new id - no stale update left behind for
    // the old id (which the migration's alias is about to retire).
    expect(plan.updatedInboxItems.map((i) => i.id)).toEqual([
      identityKeyFor("simplefin", "ACT-1", "POSTED-1"),
    ]);
    expect(plan.newInboxItems).toHaveLength(0);
    expect(plan.updatedInboxItems[0].postedAt).toBe(posted.postedAt);
  });

  it("applies rule suggestions from the POSTED merchant when migrating a twin", () => {
    const rules: MerchantRule[] = [
      {
        id: "r1",
        merchantKey: "COSTCO WHSE",
        category: "Grocery",
        type: "expense",
        useCount: 1,
        createdAt: NOW,
        updatedAt: NOW,
      },
    ];
    const posted = tx({ providerTxId: "POSTED-1", pending: false });
    const plan = planIngest(baseInputs({ rules, inbox: [pendingItem], fetched: [posted] }));
    expect(plan.updatedInboxItems[0]).toMatchObject({
      merchant: "COSTCO WHSE",
      suggestedCategory: "Grocery",
    });
  });

  it("lets a ledger decision be the twin of only one posted tx, so the second migrates the inbox twin", () => {
    // Mon: P1 approved from the inbox (ledger + fingerprint). Tue: P2, same
    // amount, still pending in the inbox. Both post later under new ids.
    // X1 must alias P1; X2 must migrate P2 - not alias P1 as well and leave
    // P2 stuck pending forever.
    const p1Key = identityKeyFor("simplefin", "ACT-1", "P1");
    const p2 = { ...pendingItem, id: identityKeyFor("simplefin", "ACT-1", "P2"), providerTxId: "P2", postedAt: "2026-06-28T00:00:00.000Z" };
    const ledger: IngestInputs["ledger"] = {
      [p1Key]: {
        status: "approved",
        budgetEntryId: "entry-1",
        at: "2026-06-27T02:00:00.000Z",
        pendingFingerprint: pendingFingerprintFor("ACT-1", -25.0, "2026-06-27T00:00:00.000Z"),
      },
    };
    const x1 = tx({ providerTxId: "X1", pending: false, postedAt: "2026-06-29T00:00:00.000Z" });
    const x2 = tx({ providerTxId: "X2", pending: false, postedAt: "2026-06-30T00:00:00.000Z" });

    const plan = planIngest(baseInputs({ inbox: [p2], ledger, fetched: [x1, x2] }));

    const x1Key = identityKeyFor("simplefin", "ACT-1", "X1");
    const x2Key = identityKeyFor("simplefin", "ACT-1", "X2");
    expect(plan.ledgerAliases[x1Key]?.aliasOf).toBe(p1Key);
    expect(plan.ledgerAliases[x2Key]).toBeUndefined();
    expect(plan.updatedInboxItems.map((i) => i.id)).toEqual([x2Key]);
    expect(plan.newInboxItems).toHaveLength(0);
  });

  it("honours a claim persisted in the ledger from an earlier sync", () => {
    // X1 aliased P1 last sync; this sync only sees X2. Without consulting
    // the stored alias, X2 would alias P1 again instead of migrating P2.
    const p1Key = identityKeyFor("simplefin", "ACT-1", "P1");
    const x1Key = identityKeyFor("simplefin", "ACT-1", "X1");
    const p2 = { ...pendingItem, id: identityKeyFor("simplefin", "ACT-1", "P2"), providerTxId: "P2", postedAt: "2026-06-28T00:00:00.000Z" };
    const ledger: IngestInputs["ledger"] = {
      [p1Key]: {
        status: "approved",
        budgetEntryId: "entry-1",
        at: "2026-06-27T02:00:00.000Z",
        pendingFingerprint: pendingFingerprintFor("ACT-1", -25.0, "2026-06-27T00:00:00.000Z"),
      },
      [x1Key]: { status: "approved", budgetEntryId: "entry-1", at: NOW, aliasOf: p1Key },
    };
    const x2 = tx({ providerTxId: "X2", pending: false, postedAt: "2026-06-30T00:00:00.000Z" });
    const plan = planIngest(baseInputs({ inbox: [p2], ledger, fetched: [x2] }));
    const x2Key = identityKeyFor("simplefin", "ACT-1", "X2");
    expect(plan.ledgerAliases[x2Key]).toBeUndefined();
    expect(plan.updatedInboxItems.map((i) => i.id)).toEqual([x2Key]);
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

  // Regression: a pending item's date is the transacted date; the posted
  // twin carries the settlement date, usually 1-3 days later. The ledger
  // match used to require the exact day, so approving while pending let
  // the posted twin come back as a brand-new (duplicate) expense.
  const decidedWhilePending = (
    status: "approved" | "dismissed",
  ): IngestInputs["ledger"] => ({
    [pendingItem.id]: {
      status,
      budgetEntryId: status === "approved" ? "entry-1" : undefined,
      at: "2026-06-28T02:00:00.000Z",
      pendingFingerprint: pendingFingerprintFor(
        "ACT-1",
        -25.0,
        pendingItem.postedAt,
      ),
    },
  });

  it.each([1, 2, 3, 4])(
    "aliases a posted twin that settled %i day(s) after the pending decision",
    (days) => {
      const posted = tx({
        providerTxId: `POSTED-LATER-${days}`,
        pending: false,
        // Settles `days` after the pending item was transacted.
        postedAt: new Date(
          Date.parse(pendingItem.postedAt) + days * 24 * 3600_000,
        ).toISOString(),
      });
      const plan = planIngest(
        baseInputs({ fetched: [posted], ledger: decidedWhilePending("approved") }),
      );
      expect(plan.newInboxItems).toHaveLength(0);
      expect(plan.updatedInboxItems).toHaveLength(0);
      const aliasKey = identityKeyFor("simplefin", "ACT-1", posted.providerTxId);
      expect(plan.ledgerAliases[aliasKey]).toMatchObject({
        status: "approved",
        budgetEntryId: "entry-1",
        aliasOf: pendingItem.id,
      });
    },
  );

  it("keeps a pending dismissal in force when the twin posts days later", () => {
    const posted = tx({
      providerTxId: "POSTED-LATER-D",
      pending: false,
      postedAt: "2026-06-30T00:00:00.000Z",
    });
    const plan = planIngest(
      baseInputs({ fetched: [posted], ledger: decidedWhilePending("dismissed") }),
    );
    expect(plan.newInboxItems).toHaveLength(0);
    const aliasKey = identityKeyFor("simplefin", "ACT-1", "POSTED-LATER-D");
    expect(plan.ledgerAliases[aliasKey]).toMatchObject({
      status: "dismissed",
      aliasOf: pendingItem.id,
    });
  });

  it("does not alias to a ledger decision outside the ±4 day window or with a different amount", () => {
    const tooLate = tx({
      providerTxId: "POSTED-LATE",
      pending: false,
      postedAt: "2026-07-03T00:00:00.000Z", // well past the ±4 day window
    });
    const plan = planIngest(
      baseInputs({ fetched: [tooLate], ledger: decidedWhilePending("approved") }),
    );
    expect(plan.newInboxItems).toHaveLength(1);
    expect(Object.keys(plan.ledgerAliases)).toHaveLength(0);

    const differentAmount = tx({
      providerTxId: "POSTED-TIP",
      pending: false,
      amount: -30.0,
      postedAt: "2026-06-29T00:00:00.000Z",
    });
    const plan2 = planIngest(
      baseInputs({ fetched: [differentAmount], ledger: decidedWhilePending("approved") }),
    );
    expect(plan2.newInboxItems).toHaveLength(1);
    expect(Object.keys(plan2.ledgerAliases)).toHaveLength(0);
  });

  it("prefers the nearest-day decision when several share account and amount", () => {
    const farKey = identityKeyFor("simplefin", "ACT-1", "PENDING-FAR");
    const nearKey = identityKeyFor("simplefin", "ACT-1", "PENDING-NEAR");
    const ledger: IngestInputs["ledger"] = {
      [farKey]: {
        status: "approved",
        budgetEntryId: "entry-far",
        at: "2026-06-26T00:00:00.000Z",
        pendingFingerprint: pendingFingerprintFor("ACT-1", -25.0, "2026-06-26T00:00:00.000Z"),
      },
      [nearKey]: {
        status: "approved",
        budgetEntryId: "entry-near",
        at: "2026-06-29T00:00:00.000Z",
        pendingFingerprint: pendingFingerprintFor("ACT-1", -25.0, "2026-06-29T00:00:00.000Z"),
      },
    };
    const posted = tx({
      providerTxId: "POSTED-NEAR",
      pending: false,
      postedAt: "2026-06-30T00:00:00.000Z",
    });
    const plan = planIngest(baseInputs({ fetched: [posted], ledger }));
    const aliasKey = identityKeyFor("simplefin", "ACT-1", "POSTED-NEAR");
    expect(plan.ledgerAliases[aliasKey]).toMatchObject({
      budgetEntryId: "entry-near",
      aliasOf: nearKey,
    });
  });

  it("ignores malformed stored fingerprints instead of matching them", () => {
    const ledger: IngestInputs["ledger"] = {
      [pendingItem.id]: {
        status: "approved",
        at: "2026-06-28T02:00:00.000Z",
        pendingFingerprint: "garbage",
      },
    };
    const posted = tx({ providerTxId: "POSTED-G", pending: false });
    const plan = planIngest(baseInputs({ fetched: [posted], ledger }));
    expect(plan.newInboxItems).toHaveLength(1);
  });
});

describe("splitPendingFingerprint", () => {
  it("splits from the right so account ids containing '|' survive", () => {
    expect(
      splitPendingFingerprint(pendingFingerprintFor("ACT|1", -25, "2026-06-28T00:00:00.000Z")),
    ).toEqual({ prefix: "ACT|1|-25.00", day: "2026-06-28" });
  });

  it("rejects values without a trailing YYYY-MM-DD day", () => {
    expect(splitPendingFingerprint("ACT-1|-25.00")).toBeNull();
    expect(splitPendingFingerprint("ACT-1|-25.00|2026-6-28")).toBeNull();
    expect(splitPendingFingerprint("|2026-06-28")).toBeNull();
    expect(splitPendingFingerprint("")).toBeNull();
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

  it("suggests the rule's recurring bill on outflows only", () => {
    const rule: MerchantRule = {
      id: "r-bill",
      merchantKey: "COSTCO WHSE",
      category: "Utilities",
      type: "expense",
      recurringEntryId: "electric",
      useCount: 1,
      createdAt: NOW,
      updatedAt: NOW,
    };
    const outflow = planIngest(baseInputs({ rules: [rule] }));
    expect(outflow.newInboxItems[0].suggestedRecurringId).toBe("electric");

    const inflow = planIngest(
      baseInputs({
        rules: [rule],
        fetched: [{ ...baseInputs().fetched[0], amount: 25 }],
      })
    );
    expect(inflow.newInboxItems[0].suggestedRecurringId).toBeUndefined();
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

  it("falls back to the link's person (whose card) when no rule names one", () => {
    const plan = planIngest(
      baseInputs({ links: [link("ACT-1", { personId: "per-card" })] }),
    );
    expect(plan.newInboxItems[0].suggestedPersonId).toBe("per-card");
  });

  it("prefers a matching rule's person over the link's", () => {
    const rules: MerchantRule[] = [
      {
        id: "r1",
        merchantKey: "COSTCO WHSE",
        category: "Grocery",
        type: "expense",
        personId: "per-rule",
        useCount: 3,
        createdAt: NOW,
        updatedAt: NOW,
      },
    ];
    const plan = planIngest(
      baseInputs({ rules, links: [link("ACT-1", { personId: "per-card" })] }),
    );
    expect(plan.newInboxItems[0].suggestedPersonId).toBe("per-rule");
  });

  it("suggests every person on a multi-person rule, over the link's person", () => {
    const rules: MerchantRule[] = [
      {
        id: "r1",
        merchantKey: "COSTCO WHSE",
        category: "Grocery",
        type: "expense",
        personId: "per-a",
        personIds: ["per-a", "per-b"],
        useCount: 3,
        createdAt: NOW,
        updatedAt: NOW,
      },
    ];
    const plan = planIngest(
      baseInputs({ rules, links: [link("ACT-1", { personId: "per-card" })] }),
    );
    expect(plan.newInboxItems[0].suggestedPersonId).toBe("per-a");
    expect(plan.newInboxItems[0].suggestedPersonIds).toEqual(["per-a", "per-b"]);

    // Card-only fallback is a single person: no personIds.
    const cardOnly = planIngest(
      baseInputs({ links: [link("ACT-1", { personId: "per-card" })] }),
    );
    expect(cardOnly.newInboxItems[0].suggestedPersonIds).toBeUndefined();
  });

  it("never applies the link's person to an inflow", () => {
    const plan = planIngest(
      baseInputs({
        links: [link("ACT-1", { personId: "per-card" })],
        fetched: [tx({ amount: 1500, description: "PAYROLL" })],
      }),
    );
    expect(plan.newInboxItems[0].suggestedType).toBe("income");
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

  it("does not auto-dismiss on an approve rule - the item lands in the inbox with suggestions for the post-ingest sweep", () => {
    const approveRule: MerchantRule = {
      id: "r-approve",
      merchantKey: "COSTCO WHSE",
      action: "approve",
      category: "Grocery",
      type: "expense",
      renameTo: "Costco",
      useCount: 1,
      createdAt: NOW,
      updatedAt: NOW,
    };
    const plan = planIngest(baseInputs({ rules: [approveRule] }));
    expect(plan.autoDismissed).toEqual({});
    expect(plan.newInboxItems).toHaveLength(1);
    expect(plan.newInboxItems[0].suggestedCategory).toBe("Grocery");
    expect(plan.newInboxItems[0].suggestedName).toBe("Costco");
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
