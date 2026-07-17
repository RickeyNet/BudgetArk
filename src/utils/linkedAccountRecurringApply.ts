// BudgetArk - Linked-Account Recurring Contributions: apply + persist
//
// The one place the apply-then-save sequence for missed recurring
// contributions lives. BudgetScreen and BridgeScreen used to carry
// byte-identical copies of this block, each protected only by a comment
// explaining why the save ORDER matters - a correctness invariant enforced
// by comment discipline in two files is one refactor away from a silent
// money bug. The pure catch-up math stays in linkedAccountRecurring.ts;
// this is the side-effecting shell every screen must go through.

import type { AssetAccount, BudgetEntry } from "../types";
import { applyMissedRecurringLinkedAccountContributions } from "./linkedAccountRecurring";
import { saveBudgetEntries } from "../storage/budgetStorage";
import { saveAssetAccounts } from "../storage/assetAccountStorage";

export interface AppliedContributions {
  entries: BudgetEntry[];
  assetAccounts: AssetAccount[];
  changed: boolean;
}

/**
 * Applies any missed recurring linked-account contributions to the given
 * snapshots and persists the result. Returns the processed arrays for the
 * caller's state (identical references when nothing changed).
 *
 * SAVE ORDER IS LOAD-BEARING: entries first (commits the lastAppliedMonth
 * marker), then assets (commits the new balance). Saving assets first - or
 * running the saves concurrently - opens a window where a reader on another
 * tab sees (newBalance, oldLastApplied) and re-applies the same
 * contribution, silently double-crediting the asset. The unit test pins
 * this ordering; don't "parallelize" it.
 */
export const applyAndPersistMissedContributions = async (
  entries: BudgetEntry[],
  assetAccounts: AssetAccount[],
  now?: Date
): Promise<AppliedContributions> => {
  const processed = applyMissedRecurringLinkedAccountContributions(
    entries,
    assetAccounts,
    now
  );

  if (processed.changed) {
    await saveBudgetEntries(processed.entries);
    await saveAssetAccounts(processed.assetAccounts);
  }

  return processed;
};
