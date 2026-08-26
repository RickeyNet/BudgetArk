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
 * Kept free of storage so the rules are unit-testable; the service shell
 * (connectionsService.updateLinkPreferences) applies the plan.
 */

import type { ExternalAccountLink } from "../../types";

export interface LinkPreferenceChange {
  importTransactions?: boolean;
  /** Balance target; null = stop pushing balances. */
  assetAccountId?: string | null;
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
}

export const planLinkPreferenceChange = (
  link: ExternalAccountLink,
  change: LinkPreferenceChange,
): LinkPreferencePlan => {
  const linkUpdates: Partial<ExternalAccountLink> = {};
  let backfill = false;
  let seedBalance: LinkPreferencePlan["seedBalance"] = null;

  if (
    change.importTransactions !== undefined &&
    change.importTransactions !== link.importTransactions
  ) {
    linkUpdates.importTransactions = change.importTransactions;
    backfill = change.importTransactions;
  }

  if (
    change.assetAccountId !== undefined &&
    change.assetAccountId !== link.assetAccountId
  ) {
    linkUpdates.assetAccountId = change.assetAccountId;
    linkUpdates.updateBalance = change.assetAccountId !== null;
    if (
      change.assetAccountId !== null &&
      typeof link.lastExternalBalance === "number" &&
      Number.isFinite(link.lastExternalBalance)
    ) {
      seedBalance = {
        assetAccountId: change.assetAccountId,
        balance: Math.max(0, link.lastExternalBalance),
      };
    }
  }

  return { linkUpdates, backfill, seedBalance };
};
