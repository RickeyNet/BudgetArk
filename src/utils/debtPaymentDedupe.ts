/**
 * BudgetArk - Duplicate Minimum-Payment Detection
 * File: src/utils/debtPaymentDedupe.ts
 *
 * Two devices can both answer the "minimum due today" prompt for the same
 * debt in the same month before they've synced. Historically each device
 * logged the confirmation under a random UUID, so the sync merge (LWW by
 * id) saw two unrelated records and kept both - the payment history and
 * Budget totals counted one real-world payment twice. The debt *balance*
 * stayed right: it lives on a single record, so LWW kept one device's
 * single decrement.
 *
 * Two-part fix:
 *  - `minimumDuePaymentId` gives prompt-logged minimums a deterministic id
 *    (debt + month), so both devices produce the SAME record and the merge
 *    collapses them going forward.
 *  - `dedupeMinimumDuePayments` repairs data that already has duplicates
 *    (and anything a partner still on an older app version keeps creating).
 */

import type { Debt, Payment } from "../types";
import { paymentMonthKey } from "./debtDueCalendar";
import { tombstone } from "../storage/tombstones";

export const MINIMUM_DUE_PAYMENT_ID_PREFIX = "duemin:";

/**
 * Deterministic id for a prompt-logged minimum payment. The due prompt is
 * one-per-debt-per-month by construction (`hasPaymentInMonth` gates it), so
 * debt + calendar month uniquely names the real-world payment - both
 * partners' devices derive the same id and sync's LWW merge dedupes them
 * with no extra machinery.
 */
export const minimumDuePaymentId = (debtId: string, monthKey: string): string =>
  `${MINIMUM_DUE_PAYMENT_ID_PREFIX}${debtId}:${monthKey}`;

const isMinimumDuePaymentId = (id: string): boolean =>
  id.startsWith(MINIMUM_DUE_PAYMENT_ID_PREFIX);

/** Money values compare equal within a cent (currency migration rounds to 2dp). */
const AMOUNT_EPSILON = 0.011;

const appliedOf = (payment: Payment): number =>
  payment.appliedAmount ?? payment.amount;

/**
 * Survivor ranking for a duplicate group. Must be deterministic on both
 * devices (each may run the repair independently before their tombstones
 * have synced): if they picked different survivors, the exchanged
 * tombstones would kill BOTH rows and the payment would vanish entirely.
 * Deterministic-id rows win (future prompt logs collide with them), then
 * earliest date, then smallest id as the tiebreak.
 */
const bySurvivorRank = (a: Payment, b: Payment): number => {
  const aDet = isMinimumDuePaymentId(a.id) ? 0 : 1;
  const bDet = isMinimumDuePaymentId(b.id) ? 0 : 1;
  if (aDet !== bDet) return aDet - bDet;
  const aTime = new Date(a.date).getTime();
  const bTime = new Date(b.date).getTime();
  if (aTime !== bTime) return aTime - bTime;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
};

export interface PaymentDedupeResult {
  payments: Payment[];
  removedCount: number;
}

/**
 * Tombstones duplicate minimum-due payment rows WITHOUT touching debt
 * balances. Callers persist the result via a raw payments write - never
 * `deletePayment`, which would add the row's amount back to a balance that
 * was only ever decremented once.
 *
 * A row is only considered a duplicate when ALL of these hold:
 *
 *  1. Same debt, same calendar month, amount equal to the debt's
 *     minPayment - the only shape the prompt ever logs.
 *  2. The debt's balance arithmetic confirms the double-count: live rows
 *     claim to have applied more than the balance actually dropped
 *     (balance > originalBalance - sum of appliedAmount). A user who
 *     genuinely paid the minimum twice in one month had BOTH decrements
 *     applied, leaves no unexplained gap, and is never touched - removing
 *     one of their rows would silently desync the balance.
 *
 * Removal consumes the unexplained gap (largest-confidence rows kept, one
 * duplicate per matching amount), so a debt whose balance was hand-edited
 * in unrelated ways fails the gate and is conservatively left alone.
 * Returns the input array untouched (removedCount 0) when nothing matches.
 */
export const dedupeMinimumDuePayments = (
  debts: readonly Debt[],
  payments: readonly Payment[],
  nowISO: string
): PaymentDedupeResult => {
  const toRemove = new Set<string>();

  for (const debt of debts) {
    // Can't verify the balance arithmetic without an original balance
    // (pre-validator legacy records) - skip rather than guess.
    if (!Number.isFinite(debt.originalBalance)) continue;

    const rows = payments.filter((p) => p.debtId === debt.id && !p.deletedAt);
    if (rows.length < 2) continue;

    // The unexplained gap: how much MORE the live rows claim to have paid
    // down than the balance actually reflects. Zero for healthy data; equal
    // to the duplicated amount(s) when the cross-device double-log happened.
    const appliedSum = rows.reduce((sum, p) => sum + appliedOf(p), 0);
    let unexplained = debt.balance - (debt.originalBalance - appliedSum);
    if (unexplained < AMOUNT_EPSILON) continue;

    // Group this month's minimum-shaped rows by calendar month.
    const groups = new Map<string, Payment[]>();
    for (const p of rows) {
      if (Math.abs(p.amount - debt.minPayment) > AMOUNT_EPSILON) continue;
      const key = paymentMonthKey(p.date);
      const group = groups.get(key);
      if (group) {
        group.push(p);
      } else {
        groups.set(key, [p]);
      }
    }

    // Sorted month order so multi-month cleanups consume the gap in the
    // same sequence on every device.
    for (const monthKey of [...groups.keys()].sort()) {
      const group = groups.get(monthKey)!;
      if (group.length < 2) continue;
      const ranked = [...group].sort(bySurvivorRank);
      // ranked[0] always survives; remove from the bottom up while the
      // unexplained gap still accounts for the row's applied delta.
      for (let i = ranked.length - 1; i >= 1; i--) {
        const applied = appliedOf(ranked[i]);
        if (applied < AMOUNT_EPSILON) continue;
        if (unexplained < applied - AMOUNT_EPSILON) break;
        toRemove.add(ranked[i].id);
        unexplained -= applied;
      }
    }
  }

  if (toRemove.size === 0) {
    return { payments: [...payments], removedCount: 0 };
  }
  return {
    payments: payments.map((p) =>
      toRemove.has(p.id) ? tombstone(p, nowISO) : p
    ),
    removedCount: toRemove.size,
  };
};
