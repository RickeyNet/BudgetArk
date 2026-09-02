/**
 * BudgetArk - Subscription Ignore List Storage tests
 * File: src/storage/__tests__/subscriptionIgnoreStorage.test.ts
 */

import {
  getIgnoredSubscriptionMerchants,
  ignoreSubscriptionMerchant,
  MAX_IGNORED_SUBSCRIPTION_MERCHANTS,
  parseIgnoredMerchants,
  unignoreSubscriptionMerchant,
} from "../subscriptionIgnoreStorage";

let mockStore: Map<string, string>;

jest.mock("../encryptedStorage", () => ({
  getItem: jest.fn(async (k: string) => (mockStore.has(k) ? mockStore.get(k)! : null)),
  setItem: jest.fn(async (k: string, v: string) => {
    mockStore.set(k, v);
  }),
  updateItem: jest.fn(async (k: string, updater: (current: string | null) => string | null) => {
    const current = mockStore.has(k) ? mockStore.get(k)! : null;
    const next = updater(current);
    if (next !== null) mockStore.set(k, next);
  }),
}));

beforeEach(() => {
  mockStore = new Map();
});

describe("subscriptionIgnoreStorage", () => {
  it("parses fail-closed: non-arrays, junk members, blanks, over-long keys and duplicates drop", () => {
    expect(parseIgnoredMerchants(null)).toEqual([]);
    expect(parseIgnoredMerchants("{}")).toEqual([]);
    expect(parseIgnoredMerchants("not json")).toEqual([]);
    expect(parseIgnoredMerchants(JSON.stringify(["A", 1, "", "A", "x".repeat(41), "B"]))).toEqual([
      "A",
      "B",
    ]);
    const many = Array.from({ length: MAX_IGNORED_SUBSCRIPTION_MERCHANTS + 5 }, (_, i) => `m${i}`);
    expect(parseIgnoredMerchants(JSON.stringify(many))).toHaveLength(
      MAX_IGNORED_SUBSCRIPTION_MERCHANTS,
    );
  });

  it("adds once, removes, and reads back", async () => {
    expect(await getIgnoredSubscriptionMerchants()).toEqual([]);
    expect(await ignoreSubscriptionMerchant("NETFLIX")).toEqual(["NETFLIX"]);
    expect(await ignoreSubscriptionMerchant("NETFLIX")).toEqual(["NETFLIX"]);
    expect(await ignoreSubscriptionMerchant("HULU")).toEqual(["NETFLIX", "HULU"]);
    expect(await unignoreSubscriptionMerchant("NETFLIX")).toEqual(["HULU"]);
    expect(await getIgnoredSubscriptionMerchants()).toEqual(["HULU"]);
  });
});
