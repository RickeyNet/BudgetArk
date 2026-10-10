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
import { buildWizardLink, planLinkPreferenceChange } from "../linkPreferences";

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
    expect(plan).toEqual({
      linkUpdates: {},
      backfill: false,
      seedBalance: null,
      seedDebtBalance: null,
    });
  });

  it("returns an empty plan for an empty change", () => {
    expect(planLinkPreferenceChange(baseLink, {})).toEqual({
      linkUpdates: {},
      backfill: false,
      seedBalance: null,
      seedDebtBalance: null,
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

describe("planLinkPreferenceChange - credit card target", () => {
  const cardLink: ExternalAccountLink = {
    ...baseLink,
    externalName: "Chase Sapphire Visa",
    lastExternalBalance: -512.34,
  };

  it("choosing a card sets debtId, turns mirroring on and seeds the amount owed", () => {
    const plan = planLinkPreferenceChange(cardLink, { debtId: "debt-1" });
    expect(plan.linkUpdates).toEqual({ debtId: "debt-1", updateDebtBalance: true });
    expect(plan.seedDebtBalance).toEqual({ debtId: "debt-1", balance: 512.34 });
    expect(plan.seedBalance).toBeNull();
  });

  it("choosing a card drops an existing Bridge target", () => {
    const plan = planLinkPreferenceChange(
      { ...cardLink, assetAccountId: "asset-1", updateBalance: true },
      { debtId: "debt-1" },
    );
    expect(plan.linkUpdates).toEqual({
      debtId: "debt-1",
      updateDebtBalance: true,
      assetAccountId: null,
      updateBalance: false,
    });
  });

  it("a card choice wins over an asset choice in the same change", () => {
    const plan = planLinkPreferenceChange(cardLink, {
      debtId: "debt-1",
      assetAccountId: "asset-1",
    });
    expect(plan.linkUpdates).toEqual({ debtId: "debt-1", updateDebtBalance: true });
    expect(plan.seedBalance).toBeNull();
  });

  it("choosing the already-linked, mirroring card is a no-op", () => {
    const plan = planLinkPreferenceChange(
      { ...cardLink, debtId: "debt-1", updateDebtBalance: true },
      { debtId: "debt-1" },
    );
    expect(plan.linkUpdates).toEqual({});
    expect(plan.seedDebtBalance).toBeNull();
  });

  it("treats undefined updateDebtBalance on a linked card as mirroring on", () => {
    const plan = planLinkPreferenceChange(
      { ...cardLink, debtId: "debt-1" },
      { debtId: "debt-1" },
    );
    expect(plan.linkUpdates).toEqual({});
    expect(plan.seedDebtBalance).toBeNull();
  });

  it("re-choosing a card whose mirroring was off turns it back on and seeds", () => {
    const plan = planLinkPreferenceChange(
      { ...cardLink, debtId: "debt-1", updateDebtBalance: false },
      { debtId: "debt-1" },
    );
    expect(plan.linkUpdates).toEqual({ debtId: "debt-1", updateDebtBalance: true });
    expect(plan.seedDebtBalance).toEqual({ debtId: "debt-1", balance: 512.34 });
  });

  it("linking a card with mirroring off links without seeding", () => {
    const plan = planLinkPreferenceChange(cardLink, {
      debtId: "debt-1",
      updateDebtBalance: false,
    });
    expect(plan.linkUpdates).toEqual({ debtId: "debt-1", updateDebtBalance: false });
    expect(plan.seedDebtBalance).toBeNull();
  });

  it("switching cards seeds the new card", () => {
    const plan = planLinkPreferenceChange(
      { ...cardLink, debtId: "debt-1", updateDebtBalance: true },
      { debtId: "debt-2" },
    );
    expect(plan.linkUpdates).toEqual({ debtId: "debt-2", updateDebtBalance: true });
    expect(plan.seedDebtBalance).toEqual({ debtId: "debt-2", balance: 512.34 });
  });

  it("uses the magnitude of a positively reported card balance", () => {
    const plan = planLinkPreferenceChange(
      { ...cardLink, lastExternalBalance: 80.5 },
      { debtId: "debt-1" },
    );
    expect(plan.seedDebtBalance).toEqual({ debtId: "debt-1", balance: 80.5 });
  });

  it("does not seed a card when no provider balance is known yet", () => {
    const plan = planLinkPreferenceChange(
      { ...cardLink, lastExternalBalance: undefined },
      { debtId: "debt-1" },
    );
    expect(plan.linkUpdates).toEqual({ debtId: "debt-1", updateDebtBalance: true });
    expect(plan.seedDebtBalance).toBeNull();
  });

  it("an empty-string debtId is not a card choice", () => {
    const plan = planLinkPreferenceChange(cardLink, { debtId: "" });
    expect(plan.linkUpdates).toEqual({});
    expect(plan.seedDebtBalance).toBeNull();
  });

  it("debtId null unlinks the card and leaves the asset side alone", () => {
    const plan = planLinkPreferenceChange(
      { ...cardLink, debtId: "debt-1", updateDebtBalance: true },
      { debtId: null },
    );
    expect(plan.linkUpdates).toEqual({ debtId: null });
    expect(plan.seedDebtBalance).toBeNull();
  });

  it("debtId null on an unlinked account is a no-op", () => {
    expect(planLinkPreferenceChange(cardLink, { debtId: null }).linkUpdates).toEqual({});
  });

  it("None clears both destinations in one change", () => {
    const plan = planLinkPreferenceChange(
      { ...cardLink, debtId: "debt-1", assetAccountId: "asset-1", updateBalance: true },
      { assetAccountId: null, debtId: null },
    );
    expect(plan.linkUpdates).toEqual({
      debtId: null,
      assetAccountId: null,
      updateBalance: false,
    });
  });

  it("choosing a Bridge account drops the card", () => {
    const plan = planLinkPreferenceChange(
      { ...baseLink, debtId: "debt-1", updateDebtBalance: true },
      { assetAccountId: "asset-1" },
    );
    expect(plan.linkUpdates).toEqual({
      assetAccountId: "asset-1",
      updateBalance: true,
      debtId: null,
    });
    expect(plan.seedBalance).toEqual({ assetAccountId: "asset-1", balance: 1234.56 });
    expect(plan.seedDebtBalance).toBeNull();
  });

  it("re-choosing the current Bridge account still drops a card on the same link", () => {
    const plan = planLinkPreferenceChange(
      { ...baseLink, assetAccountId: "asset-1", updateBalance: true, debtId: "debt-1" },
      { assetAccountId: "asset-1" },
    );
    expect(plan.linkUpdates).toEqual({ debtId: null });
    expect(plan.seedBalance).toBeNull();
  });

  it("updateDebtBalance alone toggles mirroring off for a linked card", () => {
    const plan = planLinkPreferenceChange(
      { ...cardLink, debtId: "debt-1" },
      { updateDebtBalance: false },
    );
    expect(plan.linkUpdates).toEqual({ updateDebtBalance: false });
    expect(plan.seedDebtBalance).toBeNull();
  });

  it("updateDebtBalance alone turning mirroring on seeds the card", () => {
    const plan = planLinkPreferenceChange(
      { ...cardLink, debtId: "debt-1", updateDebtBalance: false },
      { updateDebtBalance: true },
    );
    expect(plan.linkUpdates).toEqual({ updateDebtBalance: true });
    expect(plan.seedDebtBalance).toEqual({ debtId: "debt-1", balance: 512.34 });
  });

  it("updateDebtBalance alone is ignored when no card is linked", () => {
    const plan = planLinkPreferenceChange(cardLink, { updateDebtBalance: true });
    expect(plan.linkUpdates).toEqual({});
    expect(plan.seedDebtBalance).toBeNull();
  });
});

describe("buildWizardLink", () => {
  const account = {
    externalAccountId: "ext-9",
    name: "Freedom Visa",
    currency: "USD",
    balance: -88.12,
    balanceAsOf: "2026-10-01T00:00:00.000Z",
  };
  const ids = { id: "new-id", nowISO: "2026-10-09T12:00:00.000Z" };

  it("omits debtId and personId when the user chose neither", () => {
    const link = buildWizardLink(
      "conn-1",
      { account, assetAccountId: null, importTransactions: true, personId: null, debtId: null },
      ids,
    );
    expect("debtId" in link).toBe(false);
    expect("personId" in link).toBe(false);
    expect(link).toMatchObject({
      id: "new-id",
      connectionId: "conn-1",
      externalAccountId: "ext-9",
      externalName: "Freedom Visa",
      currency: "USD",
      assetAccountId: null,
      updateBalance: false,
      importTransactions: true,
      lastExternalBalance: -88.12,
      lastExternalBalanceAt: "2026-10-01T00:00:00.000Z",
      createdAt: ids.nowISO,
      updatedAt: ids.nowISO,
    });
  });

  it("a Bridge target explicitly clears any stored card link", () => {
    const link = buildWizardLink(
      "conn-1",
      { account, assetAccountId: "asset-1", importTransactions: false },
      ids,
    );
    expect(link.assetAccountId).toBe("asset-1");
    expect(link.updateBalance).toBe(true);
    expect(link.debtId).toBeNull();
  });

  it("a card choice drops the Bridge target and leaves debtId to linkAccountToDebt", () => {
    const link = buildWizardLink(
      "conn-1",
      { account, assetAccountId: "asset-1", importTransactions: true, debtId: "debt-1" },
      ids,
    );
    expect(link.assetAccountId).toBeNull();
    expect(link.updateBalance).toBe(false);
    expect("debtId" in link).toBe(false);
  });

  it("writes personId only when a person was picked", () => {
    const link = buildWizardLink(
      "conn-1",
      { account, assetAccountId: null, importTransactions: true, personId: "p-1" },
      ids,
    );
    expect(link.personId).toBe("p-1");
  });

  it("falls back to now for the balance timestamp", () => {
    const link = buildWizardLink(
      "conn-1",
      { account: { ...account, balanceAsOf: undefined }, assetAccountId: null, importTransactions: true },
      ids,
    );
    expect(link.lastExternalBalanceAt).toBe(ids.nowISO);
  });
});
