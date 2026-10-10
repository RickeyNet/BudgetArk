/**
 * BudgetArk - External Account Links Storage Tests
 * File: src/storage/__tests__/externalAccountLinksStorage.test.ts
 *
 * Guards the link store's replace semantics: a wizard re-run / re-enrollment
 * upserts a freshly built link object, and that must not silently drop the
 * stored card link (debtId), its mirroring toggle, the "whose card" person
 * or the last provider balance just because the new object leaves them
 * undefined - otherwise card balance mirroring and keep-alive stamping stop
 * with no visible error. An explicit null still clears. encryptedStorage is
 * mocked with an in-memory map (no React Native in this Jest config).
 */
import type { ExternalAccountLink } from "../../types";
import {
  getLinks,
  mergeUpsertedLink,
  updateLink,
  upsertLink,
} from "../externalAccountLinksStorage";

let mockStore: Map<string, string>;

jest.mock("../encryptedStorage", () => ({
  getItem: jest.fn(async (k: string) => (mockStore.has(k) ? mockStore.get(k)! : null)),
  setItem: jest.fn(async (k: string, v: string) => {
    mockStore.set(k, v);
  }),
  removeItem: jest.fn(async (k: string) => {
    mockStore.delete(k);
  }),
  updateItem: jest.fn(
    async (k: string, updater: (current: string | null) => string | null) => {
      const next = updater(mockStore.has(k) ? mockStore.get(k)! : null);
      if (next !== null) mockStore.set(k, next);
    }
  ),
}));

const KEY = "@budgetark_external_account_links";
const T0 = "2026-06-01T00:00:00.000Z";

const link = (over: Partial<ExternalAccountLink> = {}): ExternalAccountLink => ({
  id: "link-1",
  connectionId: "conn-1",
  externalAccountId: "ACT-1",
  externalName: "Visa",
  assetAccountId: null,
  importTransactions: true,
  updateBalance: false,
  createdAt: T0,
  updatedAt: T0,
  ...over,
});

const seed = (links: ExternalAccountLink[]) => mockStore.set(KEY, JSON.stringify(links));

beforeEach(() => {
  mockStore = new Map();
});

describe("upsertLink", () => {
  it("inserts a link that matches nothing stored", async () => {
    seed([link()]);
    const fresh = link({ id: "link-2", externalAccountId: "ACT-2" });
    const result = await upsertLink(fresh);
    expect(result).toHaveLength(2);
    expect(await getLinks()).toEqual([link(), fresh]);
  });

  it("replaces by (connectionId, externalAccountId), keeping the stored id and createdAt", async () => {
    seed([link()]);
    await upsertLink(
      link({ id: "new-id", createdAt: "2026-09-01T00:00:00.000Z", externalName: "Renamed" }),
    );
    const [stored] = await getLinks();
    expect(stored).toMatchObject({ id: "link-1", createdAt: T0, externalName: "Renamed" });
    expect(stored.updatedAt).not.toBe(T0);
  });

  it("keeps the stored debtId, updateDebtBalance, personId and last balance when the incoming link omits them", async () => {
    seed([
      link({
        debtId: "debt-1",
        updateDebtBalance: false,
        personId: "person-1",
        lastExternalBalance: -420.5,
        lastExternalBalanceAt: "2026-06-30T00:00:00.000Z",
      }),
    ]);
    await upsertLink(link({ id: "new-id", importTransactions: false }));
    const [stored] = await getLinks();
    expect(stored).toMatchObject({
      id: "link-1",
      importTransactions: false,
      debtId: "debt-1",
      updateDebtBalance: false,
      personId: "person-1",
      lastExternalBalance: -420.5,
      lastExternalBalanceAt: "2026-06-30T00:00:00.000Z",
    });
  });

  it("lets an incoming defined value win over the stored one", async () => {
    seed([link({ debtId: "debt-1", lastExternalBalance: 10, updateDebtBalance: true })]);
    await upsertLink(link({ debtId: "debt-2", lastExternalBalance: 20, updateDebtBalance: false }));
    const [stored] = await getLinks();
    expect(stored).toMatchObject({ debtId: "debt-2", lastExternalBalance: 20, updateDebtBalance: false });
  });

  it("clears debtId and personId on an explicit null", async () => {
    seed([link({ debtId: "debt-1", personId: "person-1" })]);
    await upsertLink(link({ debtId: null, personId: null }));
    const [stored] = await getLinks();
    expect(stored.debtId).toBeNull();
    expect(stored.personId).toBeNull();
  });

  it("does not invent preserved fields the stored link never had", () => {
    const merged = mergeUpsertedLink(link(), link({ id: "x" }), "2026-07-01T00:00:00.000Z");
    expect(merged).not.toHaveProperty("debtId");
    expect(merged).not.toHaveProperty("personId");
    expect(merged.updatedAt).toBe("2026-07-01T00:00:00.000Z");
  });
});

describe("updateLink", () => {
  it("merges a partial update onto the stored link and leaves other links alone", async () => {
    const other = link({ id: "link-2", externalAccountId: "ACT-2" });
    seed([link({ debtId: "debt-1", personId: "person-1" }), other]);
    await updateLink("link-1", { lastExternalBalance: 55, lastExternalBalanceAt: "2026-07-01T00:00:00.000Z" });
    const [updated, untouched] = await getLinks();
    expect(updated).toMatchObject({
      id: "link-1",
      debtId: "debt-1",
      personId: "person-1",
      lastExternalBalance: 55,
      lastExternalBalanceAt: "2026-07-01T00:00:00.000Z",
    });
    expect(updated.updatedAt).not.toBe(T0);
    expect(untouched).toEqual(other);
  });

  it("clears debtId with an explicit null (the stale-link path)", async () => {
    seed([link({ debtId: "debt-1" })]);
    await updateLink("link-1", { debtId: null });
    const [stored] = await getLinks();
    expect(stored.debtId).toBeNull();
  });
});
