/**
 * BudgetArk - translate.ts under Jest
 * File: src/i18n/__tests__/translate.test.ts
 *
 * Pins the contract every util test relies on: the global `t` exported by
 * src/i18n/translate.ts is initialised with the English tree by
 * src/i18n/jestSetup.ts, so helpers return English sentences, plurals
 * resolve, and placeholders interpolate. If this suite fails, every util
 * assertion on translated copy is meaningless.
 */

import { t } from "../translate";

describe("translate.t under Jest", () => {
  it("returns English strings, not keys", () => {
    expect(t("common.done")).toBe("Done");
  });

  it("resolves plural forms via count", () => {
    expect(t("profile.data.import.counts.debts", { count: 1 })).toBe("1 debt");
    expect(t("profile.data.import.counts.debts", { count: 3 })).toBe("3 debts");
  });

  it("interpolates placeholders without escaping", () => {
    expect(t("profile.connections.partnerSync.lastSynced", { when: "<now>" })).toBe(
      "Last synced <now>",
    );
  });
});
