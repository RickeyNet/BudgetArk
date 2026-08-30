/**
 * BudgetArk - Link Preference Planner Tests
 * File: src/services/connections/__tests__/linkPreferences.test.ts
 *
 * Pins the rules for editing an account link after setup: no-op detection,
 * updateBalance tracking the chosen target, backfill only when import turns
 * ON, and balance seeding only when a target is chosen and a provider
 * balance is known (clamped at 0).
 */

import type { ExternalAccountLink } from "../../../types";
import { planLinkPreferenceChange } from "../linkPreferences";

const baseLink: ExternalAccountLink = {
  id: "link-1",
  connectionId: "conn-1",
  externalAccountId: "ext-1",
  externalName: "Everyday Savings",
  assetAccountId: null,
  importTransactions: false,
  updateBalance: false,
  lastExternalBalance: 1234.56,
  lastExternalBalanceAt: "2026-08-20T00:00:00.000Z",
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
};

describe("planLinkPreferenceChange", () => {
  it("returns an empty plan when nothing changes", () => {
    const plan = planLinkPreferenceChange(baseLink, {
      importTransactions: false,
      assetAccountId: null,
    });
    expect(plan).toEqual({ linkUpdates: {}, backfill: false, seedBalance: null });
  });

  it("returns an empty plan for an empty change", () => {
    expect(planLinkPreferenceChange(baseLink, {})).toEqual({
      linkUpdates: {},
      backfill: false,
      seedBalance: null,
    });
  });

  it("maps a previously untracked account and seeds its balance", () => {
    const plan = planLinkPreferenceChange(baseLink, { assetAccountId: "asset-1" });
    expect(plan.linkUpdates).toEqual({
      assetAccountId: "asset-1",
      updateBalance: true,
    });
    expect(plan.seedBalance).toEqual({ assetAccountId: "asset-1", balance: 1234.56 });
    expect(plan.backfill).toBe(false);
  });

  it("clamps a negative provider balance to 0 when seeding", () => {
    const plan = planLinkPreferenceChange(
      { ...baseLink, lastExternalBalance: -42 },
      { assetAccountId: "asset-1" },
    );
    expect(plan.seedBalance).toEqual({ assetAccountId: "asset-1", balance: 0 });
  });

  it("does not seed when no provider balance is known yet", () => {
    const plan = planLinkPreferenceChange(
      { ...baseLink, lastExternalBalance: undefined },
      { assetAccountId: "asset-1" },
    );
    expect(plan.linkUpdates).toEqual({ assetAccountId: "asset-1", updateBalance: true });
    expect(plan.seedBalance).toBeNull();
  });

  it("unmapping turns balance pushes off without seeding", () => {
    const plan = planLinkPreferenceChange(
      { ...baseLink, assetAccountId: "asset-1", updateBalance: true },
      { assetAccountId: null },
    );
    expect(plan.linkUpdates).toEqual({ assetAccountId: null, updateBalance: false });
    expect(plan.seedBalance).toBeNull();
  });

  it("switching targets seeds the new target only", () => {
    const plan = planLinkPreferenceChange(
      { ...baseLink, assetAccountId: "asset-1", updateBalance: true },
      { assetAccountId: "asset-2" },
    );
    expect(plan.linkUpdates).toEqual({ assetAccountId: "asset-2", updateBalance: true });
    expect(plan.seedBalance).toEqual({ assetAccountId: "asset-2", balance: 1234.56 });
  });

  it("turning import on requests a history backfill", () => {
    const plan = planLinkPreferenceChange(baseLink, { importTransactions: true });
    expect(plan.linkUpdates).toEqual({ importTransactions: true });
    expect(plan.backfill).toBe(true);
    expect(plan.seedBalance).toBeNull();
  });

  it("turning import off does not backfill", () => {
    const plan = planLinkPreferenceChange(
      { ...baseLink, importTransactions: true },
      { importTransactions: false },
    );
    expect(plan.linkUpdates).toEqual({ importTransactions: false });
    expect(plan.backfill).toBe(false);
  });

  it("applies both changes in one plan", () => {
    const plan = planLinkPreferenceChange(baseLink, {
      importTransactions: true,
      assetAccountId: "asset-1",
    });
    expect(plan.linkUpdates).toEqual({
      importTransactions: true,
      assetAccountId: "asset-1",
      updateBalance: true,
    });
    expect(plan.backfill).toBe(true);
    expect(plan.seedBalance).toEqual({ assetAccountId: "asset-1", balance: 1234.56 });
  });
});
