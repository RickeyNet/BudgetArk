/**
 * BudgetArk - Review Inbox Debt Payments
 * File: src/utils/inboxDebtPayments.ts
 *
 * The Budget tab's "Debt Payments" rows are not budget entries: they are
 * derived from the Debt tracker (each debt's minimum, or the payments
 * logged against it - see expenseCategoryRows.ts). So when a bank import
 * of "PAYMENT TO CHASE CARD" lands in the Review Inbox, the bill picker -
 * which only knows recurring BudgetEntry records - never offered the card.
 * Approving it as a "Debt Payments" expense would then double count: once
 * as the entry, once as the debt's planned minimum.
 *
 * This module is the pure half of offering debts in that same picker:
 * which debts to list (and in what order), how a debt pill's id is told
 * apart from a bill's, and the deterministic Payment id an approval logs
 * under so a retry (or a partner's copy of the same decision) merges into
 * one record instead of paying the debt twice. The storage/ledger shell
 * lives in services/connections/reviewInboxService.ts.
 */

import CryptoJS from "crypto-js";
import type { Debt, Payment } from "../types";

/**
 * Debt pills share the bill picker with recurring-entry pills, so their ids
 * carry a prefix that can never collide with a BudgetEntry uuid.
 */
export const DEBT_OPTION_PREFIX = "debt:";

export const debtOptionId = (debtId: string): string =>
  `${DEBT_OPTION_PREFIX}${debtId}`;

/** The debt id behind a picker value, or undefined for a bill / nothing. */
export const debtIdFromOption = (
  optionId: string | null | undefined
): string | undefined => {
  if (!optionId || !optionId.startsWith(DEBT_OPTION_PREFIX)) return undefined;
  const debtId = optionId.slice(DEBT_OPTION_PREFIX.length);
  return debtId.length > 0 ? debtId : undefined;
};

export interface DebtCandidateQuery {
  /** The charge amount; debts whose minimum is closest rank first. */
  amount?: number;
  /** Currently picked debt: kept in the list even if it no longer qualifies. */
  keepId?: string;
}

/**
 * Debts an outflow could be a payment on, best guess first: live debts
 * that still carry a balance (a paid-off card has nothing to pay; the
 * same rule `buildDebtPaymentPlanForMonth` uses to stop planning it),
 * plus `keepId`. Ordered by how close each minimum is to `amount`, then by
 * larger minimum, then name, so the order is stable before any amount is
 * known.
 */
export const rankDebtCandidates = (
  debts: readonly Debt[],
  query: DebtCandidateQuery = {}
): Debt[] => {
  const candidates = debts.filter(
    (debt) =>
      !debt.deletedAt && (debt.id === query.keepId || debt.balance > 0)
  );
  const amount = query.amount;
  const hasAmount =
    typeof amount === "number" && Number.isFinite(amount) && amount > 0;
  return candidates.sort((a, b) => {
    if (hasAmount) {
      const aDist = Math.abs(a.minPayment - amount);
      const bDist = Math.abs(b.minPayment - amount);
      if (aDist !== bDist) return aDist - bDist;
    }
    if (a.minPayment !== b.minPayment) return b.minPayment - a.minPayment;
    const byName = a.name.localeCompare(b.name);
    if (byName !== 0) return byName;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
};

export const INBOX_PAYMENT_ID_PREFIX = "inbox:";

/**
 * Deterministic Payment id for an inbox row logged against a debt. The
 * pending id already names the real-world transaction uniquely (provider +
 * account + transaction id, or the statement row's digest), so hashing it
 * gives both paired phones - and a retry after a crash between the ledger
 * write and the payment write - the SAME record, which `recordPayment`
 * treats as already logged. Hashed rather than embedded because a pending
 * id can run past the synced-record text limit a partner validates
 * against; the digest is always 64 hex characters.
 */
export const inboxPaymentId = (pendingId: string): string =>
  `${INBOX_PAYMENT_ID_PREFIX}${CryptoJS.SHA256(pendingId).toString(
    CryptoJS.enc.Hex
  )}`;

/** A payment this module logged from a bank row (vs. prompt/manual). */
export const isInboxPaymentId = (id: string): boolean =>
  id.startsWith(INBOX_PAYMENT_ID_PREFIX);

/**
 * How far apart (days) a bank posting and a hand-logged payment can be and
 * still be the same real-world payment. The due-day prompt logs the
 * minimum on the due day; the bank posts the transfer a few days later,
 * occasionally across a month boundary - wider than the inbox's 3-day
 * manual-entry duplicate window for that reason.
 */
export const PAYMENT_MATCH_WINDOW_DAYS = 7;

/** Money values compare equal within a cent (same tolerance as debtPaymentDedupe). */
const AMOUNT_EPSILON = 0.011;

const daysBetween = (aIso: string, bIso: string): number =>
  Math.abs(Date.parse(aIso) - Date.parse(bIso)) / (24 * 3600_000);

/**
 * Live payments on `debtId` that were NOT logged from a bank row (the due
 * prompt's `duemin:` records, or "Log Payment" on the Debts tab) and are
 * dated within the window of `postedAt`. Bank-logged rows are excluded on
 * purpose: two imported payments of the same amount are two real
 * transactions, each already unique by its own id. Closest date first.
 */
export const nearbyManualPayments = (
  payments: readonly Payment[],
  debtId: string,
  postedAt: string,
  windowDays: number = PAYMENT_MATCH_WINDOW_DAYS
): Payment[] =>
  payments
    .filter(
      (payment) =>
        payment.debtId === debtId &&
        !payment.deletedAt &&
        !isInboxPaymentId(payment.id) &&
        Number.isFinite(Date.parse(payment.date)) &&
        daysBetween(payment.date, postedAt) <= windowDays
    )
    .sort(
      (a, b) => daysBetween(a.date, postedAt) - daysBetween(b.date, postedAt)
    );

/**
 * The hand-logged payment a bank row most likely IS: same debt, same
 * amount to the cent, within the window. This is the double-count guard
 * between the due-day prompt ("paid the $50 minimum today?" → Payment) and
 * the bank transaction for that same payment arriving in the Review Inbox
 * a few days later - the second must not decrement the balance again.
 * `dedupeMinimumDuePayments` can't catch it: both rows' decrements were
 * genuinely applied, so the balance shows no unexplained gap.
 */
export const findAlreadyLoggedPayment = (
  payments: readonly Payment[],
  debtId: string,
  amount: number,
  postedAt: string,
  windowDays: number = PAYMENT_MATCH_WINDOW_DAYS
): Payment | undefined =>
  nearbyManualPayments(payments, debtId, postedAt, windowDays).find(
    (payment) => Math.abs(payment.amount - amount) <= AMOUNT_EPSILON
  );
