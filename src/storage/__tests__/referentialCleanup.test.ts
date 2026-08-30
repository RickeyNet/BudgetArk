/**
 * Deleting a person/business - in-app or via a partner's tombstone - must
 * cascade to the merchant rules (and, for people, the bank-account links)
 * that name them; otherwise the Review Inbox keeps suggesting "(deleted
 * person)" on every future import. Also pins the atomic-merge contract the
 * sync engine relies on: `merge*FromSync` hands the callback what is
 * CURRENTLY stored and persists its return value. Storage is an in-memory
 * map whose `updateItem` runs updaters against the live map.
 */
import type { ExternalAccountLink, MerchantRule, Person } from "../../types";
import { deletePerson, getPeople, mergePeopleFromSync } from "../personStorage";
import { getMerchantRules, clearAssigneesFromMerchantRules } from "../merchantRulesStorage";
import { clearPersonFromLinks, getLinks } from "../externalAccountLinksStorage";
import { mergeDebtsFromSync, getDebtsIncludingDeleted } from "../debtStorage";

let mockStore: Map<string, string>;

// personStorage's add path pulls in the ESM-only `uuid` package; nothing
// here generates ids, so stub it like the other storage suites do.
jest.mock("../../utils/uuid", () => ({ generateUUID: () => "gen-uuid" }));

jest.mock("../encryptedStorage", () => ({
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
      const next = updater(mockStore.has(k) ? mockStore.get(k)! : null);
      if (next !== null) mockStore.set(k, next);
    }
  ),
}));

const T0 = "2026-06-01T00:00:00.000Z";
const T1 = "2026-07-01T00:00:00.000Z";
const PEOPLE_KEY = "@budgetark_people";
const RULES_KEY = "@budgetark_merchant_rules";
const LINKS_KEY = "@budgetark_external_account_links";

const person = (over: Partial<Person> = {}): Person =>
  ({ id: "per1", name: "Sam", createdAt: T0, updatedAt: T0, ...over }) as Person;

const rule = (over: Partial<MerchantRule> = {}): MerchantRule =>
  ({
    id: "r1",
    merchantKey: "COSTCO WHSE",
    category: "Grocery",
    type: "expense",
    useCount: 1,
    createdAt: T0,
    updatedAt: T0,
    ...over,
  }) as MerchantRule;

const link = (over: Partial<ExternalAccountLink> = {}): ExternalAccountLink =>
  ({
    id: "l1",
    connectionId: "c1",
    externalAccountId: "ACT-1",
    externalName: "Checking",
    assetAccountId: null,
    importTransactions: true,
    updateBalance: true,
    createdAt: T0,
    updatedAt: T0,
    ...over,
  }) as ExternalAccountLink;

const seedPeople = (people: Person[]) =>
  mockStore.set(PEOPLE_KEY, JSON.stringify({ people, version: 1 }));

beforeEach(() => {
  mockStore = new Map();
});

describe("deletePerson cascade", () => {
  it("clears the person from merchant rules and account links, leaving other fields intact", async () => {
    seedPeople([person({ id: "per1" }), person({ id: "per2", name: "Alex" })]);
    mockStore.set(
      RULES_KEY,
      JSON.stringify([
        rule({ id: "r1", personId: "per1", businessId: "biz1" }),
        rule({ id: "r2", merchantKey: "TARGET", personId: "per2" }),
        rule({ id: "r3", merchantKey: "SHELL" }),
      ])
    );
    mockStore.set(
      LINKS_KEY,
      JSON.stringify([link({ id: "l1", personId: "per1" }), link({ id: "l2", personId: "per2" })])
    );

    const live = await deletePerson("per1");
    expect(live.map((p) => p.id)).toEqual(["per2"]);

    const rules = await getMerchantRules();
    const r1 = rules.find((r) => r.id === "r1")!;
    expect(r1.personId).toBeUndefined();
    expect(r1.businessId).toBe("biz1"); // untouched
    expect(r1.category).toBe("Grocery");
    expect(new Date(r1.updatedAt).getTime()).toBeGreaterThan(new Date(T0).getTime());
    expect(rules.find((r) => r.id === "r2")?.personId).toBe("per2");
    expect(rules.find((r) => r.id === "r3")?.updatedAt).toBe(T0);

    const links = await getLinks();
    expect(links.find((l) => l.id === "l1")?.personId).toBeUndefined();
    expect(links.find((l) => l.id === "l2")?.personId).toBe("per2");
  });
});

describe("deletePerson cascade - multi-person rules", () => {
  it("drops only the deleted member and re-points personId at the next one", async () => {
    seedPeople([person({ id: "per1" }), person({ id: "per2", name: "Alex" }), person({ id: "per3", name: "Sam" })]);
    mockStore.set(
      RULES_KEY,
      JSON.stringify([
        rule({ id: "r-three", personId: "per1", personIds: ["per1", "per2", "per3"] }),
        rule({ id: "r-two", merchantKey: "TARGET", personId: "per2", personIds: ["per2", "per1"] }),
        rule({ id: "r-other", merchantKey: "SHELL", personId: "per2", personIds: ["per2", "per3"] }),
      ])
    );

    await deletePerson("per1");

    const rules = await getMerchantRules();
    const three = rules.find((r) => r.id === "r-three")!;
    expect(three.personId).toBe("per2");
    expect(three.personIds).toEqual(["per2", "per3"]);

    // Two people minus one collapses back to the single field.
    const two = rules.find((r) => r.id === "r-two")!;
    expect(two.personId).toBe("per2");
    expect(two.personIds).toBeUndefined();

    // Untouched rule keeps everything, including its timestamp.
    const other = rules.find((r) => r.id === "r-other")!;
    expect(other.personIds).toEqual(["per2", "per3"]);
    expect(other.updatedAt).toBe(T0);
  });
});

describe("mergePeopleFromSync", () => {
  it("cascades only for people the merge newly tombstoned", async () => {
    seedPeople([person({ id: "per1" }), person({ id: "gone", deletedAt: T0 })]);
    mockStore.set(
      RULES_KEY,
      JSON.stringify([rule({ id: "r1", personId: "per1" }), rule({ id: "r2", merchantKey: "X", personId: "gone" })])
    );

    // Partner's newer tombstone for per1 wins; "gone" was already dead.
    await mergePeopleFromSync((stored) =>
      stored.map((p) => (p.id === "per1" ? { ...p, deletedAt: T1, updatedAt: T1 } : p))
    );

    expect(await getPeople()).toEqual([]);
    const rules = await getMerchantRules();
    expect(rules.find((r) => r.id === "r1")?.personId).toBeUndefined();
    // Not "newly" deleted by this merge -> untouched (no spurious rewrite).
    expect(rules.find((r) => r.id === "r2")?.personId).toBe("gone");
  });

  it("hands the merge callback the currently stored array, tombstones included", async () => {
    seedPeople([person({ id: "per1" }), person({ id: "gone", deletedAt: T0 })]);
    let seen: string[] = [];
    await mergePeopleFromSync((stored) => {
      seen = stored.map((p) => p.id);
      return stored;
    });
    expect(seen.sort()).toEqual(["gone", "per1"]);
  });
});

describe("clear helpers are no-ops without matches", () => {
  it("does not rewrite storage when nothing references the ids", async () => {
    mockStore.set(RULES_KEY, JSON.stringify([rule({ id: "r1", personId: "per9" })]));
    mockStore.set(LINKS_KEY, JSON.stringify([link({ id: "l1", personId: "per9" })]));
    const rulesBefore = mockStore.get(RULES_KEY);
    const linksBefore = mockStore.get(LINKS_KEY);
    await clearAssigneesFromMerchantRules({ personIds: ["nobody"], businessIds: [] });
    await clearPersonFromLinks(["nobody"]);
    expect(mockStore.get(RULES_KEY)).toBe(rulesBefore);
    expect(mockStore.get(LINKS_KEY)).toBe(linksBefore);
  });
});

describe("mergeDebtsFromSync (atomic merge contract)", () => {
  it("merges against what is stored NOW, not a caller snapshot", async () => {
    mockStore.set(
      "@budgetark_debts",
      JSON.stringify([
        { id: "d1", name: "Visa", balance: 100, originalBalance: 500, rate: 19.9, minPayment: 25, createdAt: T0, updatedAt: T0 },
      ])
    );
    // A user edit lands between "the sync read local state" and the merge.
    mockStore.set(
      "@budgetark_debts",
      JSON.stringify([
        { id: "d1", name: "Visa", balance: 100, originalBalance: 500, rate: 19.9, minPayment: 25, createdAt: T0, updatedAt: T0 },
        { id: "d-user", name: "New card", balance: 10, originalBalance: 10, rate: 0, minPayment: 1, createdAt: T1, updatedAt: T1 },
      ])
    );
    await mergeDebtsFromSync((stored) => [
      ...stored,
      { id: "d-partner", name: "Partner", balance: 5, originalBalance: 5, rate: 0, minPayment: 1, createdAt: T1, updatedAt: T1 } as never,
    ]);
    const ids = (await getDebtsIncludingDeleted()).map((d) => d.id).sort();
    expect(ids).toEqual(["d-partner", "d-user", "d1"]);
  });
});
