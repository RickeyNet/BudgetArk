/**
 * BudgetArk - Bank Connections: Link Preference Planner
 * File: src/services/connections/linkPreferences.ts
 *
 * Pure logic behind editing an ExternalAccountLink AFTER setup (the
 * Connections manager's per-account "Import transactions" toggle and
 * "Balance updates" picker). The Add Connection wizard is the only other
 * place these choices are made, and it was a one-shot: a user who chose
 * "None" for a savings account on day one had no way to map it later - and
 * therefore no Bridge account to designate as their emergency fund.
 *
 * A link has ONE balance destination: a Bridge AssetAccount OR a credit card
 * on the Debts tab (ExternalAccountLink.debtId). Choosing one drops the
 * other, so a card's balance never also lands on the Bridge as an asset.
 *
 * Kept free of storage so the rules are unit-testable; the service shell
 * (connectionsService.updateLinkPreferences) applies the plan.
 */

import type { ExternalAccountLink } from "../../types";
import { debtBalanceFromProvider } from "./debtBalances";
import type { NormalizedAccount } from "./types";

export interface LinkPreferenceChange {
  importTransactions?: boolean;
  /** Balance target; null = stop pushing balances. */
  assetAccountId?: string | null;
  /**
   * Credit card on the Debts tab this account IS; null = unlink the card.
   * A card choice wins over an asset choice in the same change (one
   * balance destination per account).
   */
  debtId?: string | null;
  /**
   * Mirror the provider balance onto the linked card. Defaults to ON when a
   * card is chosen; on its own it toggles mirroring for an already-linked
   * card (ignored when the link has no card).
   */
  updateDebtBalance?: boolean;
}

export interface LinkPreferencePlan {
  /** Fields to write onto the link (empty = nothing changed). */
  linkUpdates: Partial<ExternalAccountLink>;
  /**
   * Import just turned on: clear the connection's sync window so the next
   * pass fetches the full initial backfill instead of the short overlap
   * (mirrors finalizeAccountLinks for freshly mapped accounts).
   */
  backfill: boolean;
  /**
   * A balance target was just chosen and the link already knows the
   * provider's balance: push it now (clamped at 0 like the sync path, since
   * AssetAccount balances can't be negative) instead of waiting out the
   * sync cooldown.
   */
  seedBalance: { assetAccountId: string; balance: number } | null;
  /**
   * A card was just chosen (or its mirroring just turned on) and the link
   * already knows the provider's balance: push the amount owed (magnitude,
   * see debtBalanceFromProvider) onto the debt now.
   */
  seedDebtBalance: { debtId: string; balance: number } | null;
}

const knownBalance = (link: ExternalAccountLink): number | null =>
  typeof link.lastExternalBalance === "number" &&
  Number.isFinite(link.lastExternalBalance)
    ? link.lastExternalBalance
    : null;

export const planLinkPreferenceChange = (
  link: ExternalAccountLink,
  change: LinkPreferenceChange,
): LinkPreferencePlan => {
  const linkUpdates: Partial<ExternalAccountLink> = {};
  let backfill = false;
  let seedBalance: LinkPreferencePlan["seedBalance"] = null;
  let seedDebtBalance: LinkPreferencePlan["seedDebtBalance"] = null;

  if (
    change.importTransactions !== undefined &&
    change.importTransactions !== link.importTransactions
  ) {
    linkUpdates.importTransactions = change.importTransactions;
    backfill = change.importTransactions;
  }

  const provider = knownBalance(link);
  const debtChosen = typeof change.debtId === "string" && change.debtId !== "";

  if (debtChosen) {
    const debtId = change.debtId as string;
    const mirror = change.updateDebtBalance ?? true;
    const wasMirroring = link.debtId === debtId && link.updateDebtBalance !== false;
    if (link.debtId !== debtId || (link.updateDebtBalance !== false) !== mirror) {
      linkUpdates.debtId = debtId;
      linkUpdates.updateDebtBalance = mirror;
    }
    // One destination per account: the card replaces any Bridge target.
    if (link.assetAccountId !== null || link.updateBalance) {
      linkUpdates.assetAccountId = null;
      linkUpdates.updateBalance = false;
    }
    if (mirror && !wasMirroring && provider !== null) {
      seedDebtBalance = { debtId, balance: debtBalanceFromProvider(provider) };
    }
  } else {
    if (change.debtId === null && link.debtId) {
      linkUpdates.debtId = null;
    } else if (
      change.debtId === undefined &&
      change.updateDebtBalance !== undefined &&
      link.debtId &&
      (link.updateDebtBalance !== false) !== change.updateDebtBalance
    ) {
      linkUpdates.updateDebtBalance = change.updateDebtBalance;
      if (change.updateDebtBalance && provider !== null) {
        seedDebtBalance = {
          debtId: link.debtId,
          balance: debtBalanceFromProvider(provider),
        };
      }
    }

    if (
      change.assetAccountId !== undefined &&
      change.assetAccountId !== link.assetAccountId
    ) {
      linkUpdates.assetAccountId = change.assetAccountId;
      linkUpdates.updateBalance = change.assetAccountId !== null;
      if (change.assetAccountId !== null && provider !== null) {
        seedBalance = {
          assetAccountId: change.assetAccountId,
          balance: Math.max(0, provider),
        };
      }
    }
    // One destination per account: a Bridge target replaces the card.
    if (
      typeof change.assetAccountId === "string" &&
      change.assetAccountId !== "" &&
      link.debtId
    ) {
      linkUpdates.debtId = null;
      seedDebtBalance = null;
    }
  }

  return { linkUpdates, backfill, seedBalance, seedDebtBalance };
};

/** One account's choices from the wizard's mapping step. */
export interface WizardLinkSelection {
  account: NormalizedAccount;
  assetAccountId: string | null;
  importTransactions: boolean;
  personId?: string | null;
  debtId?: string | null;
}

/**
 * The link object the wizard upserts for one mapped account. upsertLink
 * keeps a stored link's debtId / personId when the incoming value is
 * undefined (explicit null clears), so fields the user made no choice for
 * are OMITTED - a re-run (Teller re-enrollment, finish-setup) must not wipe
 * an existing card link or "whose card" person. Rules:
 * - a card chosen: no Bridge target; debtId is still omitted here because
 *   the service writes it right after through linkAccountToDebt (one
 *   account per card + the immediate balance seed);
 * - a Bridge account chosen: debtId explicitly null (one destination);
 * - neither: debtId omitted (a stored card link survives);
 * - personId only when the selection carries a person.
 */
export const buildWizardLink = (
  connectionId: string,
  selection: WizardLinkSelection,
  ids: { id: string; nowISO: string },
): ExternalAccountLink => {
  const cardChosen = Boolean(selection.debtId);
  const assetAccountId = cardChosen ? null : selection.assetAccountId;
  const link: ExternalAccountLink = {
    id: ids.id,
    connectionId,
    externalAccountId: selection.account.externalAccountId,
    externalName: selection.account.name,
    currency: selection.account.currency,
    assetAccountId,
    importTransactions: selection.importTransactions,
    updateBalance: assetAccountId !== null,
    lastExternalBalance: selection.account.balance,
    lastExternalBalanceAt: selection.account.balanceAsOf ?? ids.nowISO,
    createdAt: ids.nowISO,
    updatedAt: ids.nowISO,
  };
  if (assetAccountId !== null) link.debtId = null;
  if (typeof selection.personId === "string" && selection.personId !== "") {
    link.personId = selection.personId;
  }
  return link;
};
