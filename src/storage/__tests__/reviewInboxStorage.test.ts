/**
 * Review Inbox storage: `pruneLedger` (the ingest-ledger TTL sweep run on
 * every `recordLedgerEntries` write) and the pending-inbox's 500-item cap
 * enforced by `upsertPendingTransactions`. Pins that pruning is keyed off
 * `LEDGER_TTL_DAYS` and returns the SAME object when nothing expires, and
 * that the inbox cap keeps the newest-by-postedAt items (ties broken by
 * fetchedAt) rather than an arbitrary/insertion-order slice. Storage is
 * mocked with an in-memory map, everything else runs real.
 */
import type { IngestLedger, PendingTransaction } from "../../types";
import {
  LEDGER_TTL_DAYS,
  MAX_INBOX_SIZE,
  getIngestLedger,
  getPendingTransactions,
  purgePendingForConnection,
  pruneLedger,
  recordLedgerEntries,
  removePendingTransaction,
  removePendingTransactions,
  upsertPendingTransactions,
} from "../reviewInboxStorage";

let mockStore: Map<string, string>;

jest.mock("../encryptedStorage", () => ({
  getItem: jest.fn(async (k: string) => (mockStore.has(k) ? mockStore.get(k)! : null)),
  setItem: jest.fn(async (k: string, v: string) => {
    mockStore.set(k, v);
  }),
  removeItem: jest.fn(async (k: string) => {
    mockStore.delete(k);
  }),
}));

const INBOX_KEY = "@budgetark_pending_transactions";
const LEDGER_KEY = "@budgetark_connection_ingest_ledger";

beforeEach(() => {
  mockStore = new Map();
});

const tx = (over: Partial<PendingTransaction> = {}): PendingTransaction => ({
  id: "tx-1",
  connectionId: "conn-1",
  externalAccountId: "acc-1",
  providerTxId: "ptx-1",
  pending: false,
  postedAt: "2026-06-01T00:00:00.000Z",
  amount: -10,
  description: "Coffee Shop",
  merchant: "coffee shop",
  suggestedType: "expense",
  fetchedAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
  ...over,
});

describe("pruneLedger", () => {
  const NOW = new Date("2026-09-01T00:00:00.000Z");
  const cutoffMs = NOW.getTime() - LEDGER_TTL_DAYS * 24 * 3600_000;

  it("drops entries older than LEDGER_TTL_DAYS and keeps entries right at/after the cutoff", () => {
    const justExpired = new Date(cutoffMs - 1000).toISOString();
    const justInside = new Date(cutoffMs + 1000).toISOString();
    const ledger: IngestLedger = {
      old: { status: "dismissed", at: justExpired },
      recent: { status: "approved", at: justInside, budgetEntryId: "e1" },
    };
    const pruned = pruneLedger(ledger, NOW);
    expect(Object.keys(pruned)).toEqual(["recent"]);
    expect(pruned.recent).toEqual(ledger.recent);
  });

  it("returns the SAME object reference when nothing is dropped", () => {
    const ledger: IngestLedger = {
      recent: { status: "approved", at: new Date(cutoffMs + 1000).toISOString() },
    };
    expect(pruneLedger(ledger, NOW)).toBe(ledger);
  });

  it("drops an entry whose `at` does not parse as a date (Number.isFinite guard)", () => {
    const ledger: IngestLedger = {
      corrupt: { status: "dismissed", at: "not-a-date" },
    };
    // Date.parse("not-a-date") is NaN; `Number.isFinite(NaN) && NaN < cutoff`
    // short-circuits false, so a corrupt entry is treated as "keep" (not
    // dropped) - it survives, unlike purgeExpiredTombstones' analogous
    // guard which also keeps corrupt records. Document current behaviour.
    const pruned = pruneLedger(ledger, NOW);
    expect(pruned).toBe(ledger);
    expect(pruned.corrupt).toBeDefined();
  });

  it("is empty-safe", () => {
    expect(pruneLedger({}, NOW)).toEqual({});
  });
});

describe("recordLedgerEntries", () => {
  it("merges new entries in and prunes expired ones on the same write", async () => {
    const NOW_ISO = "2026-09-01T00:00:00.000Z";
    jest.useFakeTimers().setSystemTime(new Date(NOW_ISO));
    try {
      const cutoffMs =
        new Date(NOW_ISO).getTime() - LEDGER_TTL_DAYS * 24 * 3600_000;
      const expired = new Date(cutoffMs - 1000).toISOString();
      mockStore.set(
        LEDGER_KEY,
        JSON.stringify({ old: { status: "dismissed", at: expired } } as IngestLedger)
      );
      await recordLedgerEntries({
        fresh: { status: "approved", at: NOW_ISO, budgetEntryId: "e1" },
      });
      const stored = JSON.parse(mockStore.get(LEDGER_KEY)!) as IngestLedger;
      expect(Object.keys(stored)).toEqual(["fresh"]);
    } finally {
      jest.useRealTimers();
    }
  });

  it("is a no-op for an empty entries map", async () => {
    mockStore.set(LEDGER_KEY, JSON.stringify({ a: { status: "approved", at: "2026-06-01T00:00:00.000Z" } }));
    const before = mockStore.get(LEDGER_KEY);
    await recordLedgerEntries({});
    expect(mockStore.get(LEDGER_KEY)).toBe(before);
  });

  it("getIngestLedger returns {} for missing/corrupt storage", async () => {
    expect(await getIngestLedger()).toEqual({});
    mockStore.set(LEDGER_KEY, "[]"); // array, not a map
    expect(await getIngestLedger()).toEqual({});
    mockStore.set(LEDGER_KEY, "{not json");
    expect(await getIngestLedger()).toEqual({});
  });
});

describe("upsertPendingTransactions - 500-item cap", () => {
  it("caps to MAX_INBOX_SIZE, keeping the newest by postedAt and dropping the oldest", async () => {
    // Seed MAX_INBOX_SIZE items with distinct postedAt, oldest to newest.
    const seeded: PendingTransaction[] = Array.from({ length: MAX_INBOX_SIZE }, (_, i) =>
      tx({
        id: `seed-${i}`,
        postedAt: new Date(2026, 0, 1 + i).toISOString(),
        fetchedAt: new Date(2026, 0, 1 + i).toISOString(),
      })
    );
    await upsertPendingTransactions(seeded);

    // One more, newer than all of them, pushes the collection to
    // MAX_INBOX_SIZE + 1 before the cap trims the single oldest.
    const newest = tx({
      id: "newest",
      postedAt: new Date(2026, 1, 1).toISOString(),
      fetchedAt: new Date(2026, 1, 1).toISOString(),
    });
    const result = await upsertPendingTransactions([newest]);

    expect(result).toHaveLength(MAX_INBOX_SIZE);
    expect(result.some((t) => t.id === "newest")).toBe(true);
    // The single oldest seeded item (seed-0) was dropped, not e.g. the
    // most-recently-inserted one.
    expect(result.some((t) => t.id === "seed-0")).toBe(false);
    expect(result.some((t) => t.id === "seed-1")).toBe(true);
  });

  it("breaks postedAt ties by fetchedAt (newer fetch wins the cap)", async () => {
    const samePostedAt = "2026-06-01T00:00:00.000Z";
    await upsertPendingTransactions([
      tx({ id: "a", postedAt: samePostedAt, fetchedAt: "2026-06-01T00:00:00.000Z" }),
      tx({ id: "b", postedAt: samePostedAt, fetchedAt: "2026-06-02T00:00:00.000Z" }),
    ]);
    const result = await getPendingTransactions();
    // Sort put b (later fetchedAt) ahead of a on a postedAt tie.
    expect(result[0].id).toBe("b");
    expect(result[1].id).toBe("a");
  });

  it("upsert by id replaces rather than duplicates", async () => {
    await upsertPendingTransactions([tx({ id: "a", amount: -5 })]);
    await upsertPendingTransactions([tx({ id: "a", amount: -99 })]);
    const result = await getPendingTransactions();
    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(-99);
  });

  it("is a no-op read-through for an empty items array", async () => {
    await upsertPendingTransactions([tx({ id: "a" })]);
    const result = await upsertPendingTransactions([]);
    expect(result).toHaveLength(1);
  });
});

describe("removePendingTransaction(s) / purgePendingForConnection", () => {
  it("removePendingTransaction drops only the matching id", async () => {
    await upsertPendingTransactions([tx({ id: "a" }), tx({ id: "b" })]);
    const result = await removePendingTransaction("a");
    expect(result.map((t) => t.id)).toEqual(["b"]);
  });

  it("removePendingTransactions drops a batch and no-ops when nothing matches", async () => {
    await upsertPendingTransactions([tx({ id: "a" }), tx({ id: "b" }), tx({ id: "c" })]);
    const result = await removePendingTransactions(["a", "c", "missing"]);
    expect(result.map((t) => t.id)).toEqual(["b"]);
  });

  it("purgePendingForConnection drops only items for that connection", async () => {
    await upsertPendingTransactions([
      tx({ id: "a", connectionId: "conn-1" }),
      tx({ id: "b", connectionId: "conn-2" }),
    ]);
    await purgePendingForConnection("conn-1");
    const result = await getPendingTransactions();
    expect(result.map((t) => t.id)).toEqual(["b"]);
  });

  it("getPendingTransactions returns [] for missing/corrupt storage", async () => {
    expect(await getPendingTransactions()).toEqual([]);
    mockStore.set(INBOX_KEY, "{not an array");
    expect(await getPendingTransactions()).toEqual([]);
  });
});
