/**
 * BudgetArk - Bank Connections: Credit-Card Balance Planner
 * File: src/services/connections/debtBalances.ts
 *
 * Pure logic for mirroring a connected credit-card account's balance onto
 * its Debt-tab record (ExternalAccountLink.debtId). The Bridge half of a
 * bank sync (AssetAccount balances) has always been automatic; before this
 * module a card's balance on the Debts tab was whatever the user last typed,
 * so the payoff ring, net worth, and the card keep-alive watch all sat next
 * to a number the bank had long since moved on from.
 *
 * Kept free of storage/React so the rules are unit-testable; the sync
 * orchestrator (connectionsSyncService) and the debt editor apply the plan.
 */

import type { Debt, ExternalAccountLink } from "../../types";
import type { NormalizedAccount } from "./types";
import { roundToCents } from "../../utils/money";

/**
 * Amount owed on a card, from the provider's signed balance. Providers
 * disagree on the sign of a liability balance (SimpleFIN servers report a
 * card's balance negative; Teller's docs don't say), so the magnitude is
 * used regardless of sign. Known trade-off, documented on purpose: a card
 * with a credit balance (you overpaid, the issuer owes YOU) shows that
 * amount as owed instead of $0 - the mild failure - rather than a real
 * balance silently showing as $0 if the sign were guessed wrong.
 */
export const debtBalanceFromProvider = (balance: number): number => {
  if (!Number.isFinite(balance)) return 0;
  return Math.abs(roundToCents(balance));
};

/** Whether a link feeds its debt's balance (see ExternalAccountLink.updateDebtBalance). */
export const linkUpdatesDebtBalance = (
  link: Pick<ExternalAccountLink, "debtId" | "updateDebtBalance">,
): boolean => Boolean(link.debtId) && link.updateDebtBalance !== false;

export interface DebtBalanceFields {
  balance: number;
  /**
   * Present only when the new balance exceeds the debt's originalBalance:
   * a revolving card's "original" is treated as a high-water mark so the
   * progress ring and "paid off" figure stay in range instead of going
   * negative after new purchases (originalBalance also has to stay >= 0.01
   * for older peers' validators - see AddDebtModal).
   */
  originalBalance?: number;
}

/**
 * The debt fields a provider balance maps to, against the debt's current
 * values. Returns null when nothing would change (bounds updatedAt churn on
 * P2P sync diffs, same rule as the AssetAccount path).
 */
export const debtFieldsForProviderBalance = (
  current: Pick<Debt, "balance" | "originalBalance">,
  providerBalance: number,
): DebtBalanceFields | null => {
  const balance = debtBalanceFromProvider(providerBalance);
  if (current.balance === balance) return null;
  const fields: DebtBalanceFields = { balance };
  if (balance > current.originalBalance) fields.originalBalance = balance;
  return fields;
};

export interface DebtBalanceUpdate extends DebtBalanceFields {
  debtId: string;
}

/**
 * Which debts should have their balance replaced by the provider's, given
 * this sync's fetched accounts. Only links whose debtId resolves to a live
 * debt and whose balance mirroring is on; unchanged balances are skipped.
 * Two links pointing at one debt: the last link wins, deterministically by
 * link order (one account per card is enforced by the editor anyway).
 */
export const planDebtBalanceUpdates = (input: {
  links: readonly ExternalAccountLink[];
  debts: readonly Debt[];
  accounts: readonly NormalizedAccount[];
}): DebtBalanceUpdate[] => {
  const { links, debts, accounts } = input;
  const accountsById = new Map(accounts.map((a) => [a.externalAccountId, a]));
  const byDebt = new Map<string, DebtBalanceUpdate>();

  for (const link of links) {
    if (!linkUpdatesDebtBalance(link)) continue;
    const provider = accountsById.get(link.externalAccountId);
    if (!provider) continue;
    const debt = debts.find((d) => d.id === link.debtId && !d.deletedAt);
    if (!debt) continue;
    const fields = debtFieldsForProviderBalance(debt, provider.balance);
    if (!fields) {
      byDebt.delete(debt.id);
      continue;
    }
    byDebt.set(debt.id, { debtId: debt.id, ...fields });
  }

  return Array.from(byDebt.values());
};
