/**
 * BudgetArk - card keep-alive math (pure).
 *
 * Issuers close credit cards after extended inactivity, which hurts credit
 * scores. This module owns every date/status computation for the opt-in
 * per-card inactivity watch: deadlines (last use + issuer window), warning
 * status, banner filtering/dismissals, and the pure half of the
 * connections-sync auto-stamping hook. No React Native, expo, or storage
 * imports - everything here runs under plain Node Jest.
 *
 * All calendar math uses local Date(y, m, d) constructors, never
 * ms-per-day arithmetic, so DST transitions can't skew a deadline. Date-only
 * strings (a provider postedAt like "2026-07-19") are parsed as LOCAL date
 * parts - `new Date("YYYY-MM-DD")` would read them as UTC midnight and
 * shift the day for users west of UTC (same trap documented at
 * paymentMonthKey in debtDueCalendar.ts).
 */

import type { Debt, ExternalAccountLink } from "../types";
import type { NormalizedTransaction } from "../services/connections/types";
import { dismissalKey, getMonthKey } from "./debtDueCalendar";

export const KEEP_ALIVE_DEFAULT_WINDOW_MONTHS = 6;
export const KEEP_ALIVE_DEFAULT_LEAD_DAYS = 30;

/**
 * Validation bounds - deliberately wider than the UI chips so a future UI
 * option never turns into a record older peers reject mid-sync.
 * recordValidators.isDebtItem imports these.
 */
export const KEEP_ALIVE_MAX_WINDOW_MONTHS = 60;
export const KEEP_ALIVE_MAX_LEAD_DAYS = 180;

/** Days-until-deadline at or below which a warning turns urgent. */
export const KEEP_ALIVE_URGENT_DAYS = 7;

export type KeepAliveWarningStatus = "upcoming" | "urgent" | "overdue";

export interface KeepAliveStatus {
  deadline: Date;
  /** Whole local days until the deadline; negative once overdue. */
  daysUntil: number;
  status: "ok" | KeepAliveWarningStatus;
}

export interface KeepAliveWarning {
  debt: Debt;
  deadline: Date;
  daysUntil: number;
  status: KeepAliveWarningStatus;
}

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parses a keep-alive timestamp: date-only strings as local date parts,
 * full ISO via the Date constructor. Returns null when unparseable.
 */
export const parseKeepAliveDate = (iso: string): Date | null => {
  if (typeof iso !== "string" || iso.length === 0) return null;
  if (DATE_ONLY_RE.test(iso)) {
    const [y, m, d] = iso.split("-").map(Number);
    const parsed = new Date(y, m - 1, d);
    // Reject rollover (e.g. "2026-02-31" normalizing into March).
    if (parsed.getMonth() !== m - 1 || parsed.getDate() !== d) return null;
    return parsed;
  }
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const lastDayOfMonth = (year: number, monthIndex: number): number =>
  new Date(year, monthIndex + 1, 0).getDate();

const startOfDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const getEffectiveKeepAliveWindowMonths = (debt: Debt): number => {
  const months = debt.keepAliveWindowMonths;
  if (
    typeof months === "number" &&
    Number.isInteger(months) &&
    months >= 1 &&
    months <= KEEP_ALIVE_MAX_WINDOW_MONTHS
  ) {
    return months;
  }
  return KEEP_ALIVE_DEFAULT_WINDOW_MONTHS;
};

export const getEffectiveKeepAliveLeadDays = (debt: Debt): number => {
  const days = debt.keepAliveLeadDays;
  if (
    typeof days === "number" &&
    Number.isInteger(days) &&
    days >= 1 &&
    days <= KEEP_ALIVE_MAX_LEAD_DAYS
  ) {
    return days;
  }
  return KEEP_ALIVE_DEFAULT_LEAD_DAYS;
};

/**
 * Deadline = last use + window, in local calendar months with an
 * end-of-month clamp (Aug 31 + 6mo -> Feb 28/29, not Mar 2/3).
 */
export const keepAliveDeadline = (
  lastUsed: Date,
  windowMonths: number
): Date => {
  const y = lastUsed.getFullYear();
  const m = lastUsed.getMonth() + windowMonths;
  const day = Math.min(lastUsed.getDate(), lastDayOfMonth(y, m));
  return new Date(y, m, day);
};

/**
 * Current keep-alive standing for one debt, or null when the watch is off
 * or has no usable last-used anchor.
 */
export const keepAliveStatus = (
  debt: Debt,
  now: Date = new Date()
): KeepAliveStatus | null => {
  if (!debt.keepAliveEnabled || !debt.keepAliveLastUsedAt) return null;
  const lastUsed = parseKeepAliveDate(debt.keepAliveLastUsedAt);
  if (!lastUsed) return null;

  const deadline = keepAliveDeadline(
    lastUsed,
    getEffectiveKeepAliveWindowMonths(debt)
  );
  const daysUntil = Math.round(
    (startOfDay(deadline).getTime() - startOfDay(now).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  let status: KeepAliveStatus["status"] = "ok";
  if (daysUntil < 0) status = "overdue";
  else if (daysUntil <= KEEP_ALIVE_URGENT_DAYS) status = "urgent";
  else if (daysUntil <= getEffectiveKeepAliveLeadDays(debt)) {
    status = "upcoming";
  }
  return { deadline, daysUntil, status };
};

export const keepAliveDismissalKey = dismissalKey;

/**
 * Cards that should be warned about right now: live personal-credit debts
 * with the watch enabled, inside their lead window (or past the deadline),
 * and not dismissed this calendar month. Per-month dismissal on purpose: an
 * unused card's deadline never moves, so a per-deadline dismissal would
 * silence it forever - actually using the card is what clears the warning.
 * Sorted soonest deadline first.
 */
export const cardsNeedingKeepAlive = (
  debts: readonly Debt[],
  dismissals: Readonly<Record<string, string>> = {},
  now: Date = new Date()
): KeepAliveWarning[] => {
  const monthKey = getMonthKey(now);
  const warnings: KeepAliveWarning[] = [];

  for (const debt of debts) {
    if (debt.deletedAt) continue;
    if (debt.debtClass !== "personal_credit") continue;
    const status = keepAliveStatus(debt, now);
    if (!status || status.status === "ok") continue;
    if (dismissals[keepAliveDismissalKey(debt.id, monthKey)]) continue;
    warnings.push({
      debt,
      deadline: status.deadline,
      daysUntil: status.daysUntil,
      status: status.status,
    });
  }

  return warnings.sort(
    (a, b) => a.deadline.getTime() - b.deadline.getTime()
  );
};

/**
 * Newest outflow postedAt per provider account. Outflows only (amount < 0):
 * issuers keep cards open on purchase activity, and inflows are
 * payments/refunds which don't reliably count. Pending transactions DO
 * count - a swipe happened and pending is the earliest signal. Unparseable
 * dates are skipped fail-closed.
 */
export const latestOutflowByAccount = (
  transactions: readonly NormalizedTransaction[]
): Map<string, string> => {
  const latest = new Map<string, string>();
  for (const tx of transactions) {
    if (!(tx.amount < 0)) continue;
    const parsed = parseKeepAliveDate(tx.postedAt);
    if (!parsed) continue;
    const current = latest.get(tx.externalAccountId);
    const currentParsed = current ? parseKeepAliveDate(current) : null;
    if (!currentParsed || parsed.getTime() > currentParsed.getTime()) {
      latest.set(tx.externalAccountId, tx.postedAt);
    }
  }
  return latest;
};

export interface KeepAliveStamp {
  debtId: string;
  lastUsedAt: string;
}

/**
 * The pure half of the connections-sync auto-stamping hook: which debts
 * should have `keepAliveLastUsedAt` advanced, given the accounts' newest
 * outflows. Emits a stamp only for links whose debtId resolves to a live,
 * keep-alive-enabled debt, only when the new activity is strictly newer
 * than the current stamp (bounds updatedAt churn on P2P sync diffs to at
 * most one write per new-activity day), and clamped at `nowISO` so
 * provider clock skew can't push a deadline into the future.
 */
export const planKeepAliveStamps = (input: {
  links: readonly ExternalAccountLink[];
  debts: readonly Debt[];
  latestByAccount: ReadonlyMap<string, string>;
  nowISO: string;
}): KeepAliveStamp[] => {
  const { links, debts, latestByAccount, nowISO } = input;
  const now = parseKeepAliveDate(nowISO);
  if (!now) return [];

  const stampByDebt = new Map<string, string>();
  for (const link of links) {
    if (!link.debtId) continue;
    const debt = debts.find(
      (d) => d.id === link.debtId && !d.deletedAt && d.keepAliveEnabled
    );
    if (!debt) continue;

    const latestISO = latestByAccount.get(link.externalAccountId);
    if (!latestISO) continue;
    const latest = parseKeepAliveDate(latestISO);
    if (!latest) continue;

    const candidateISO = latest.getTime() > now.getTime() ? nowISO : latestISO;
    const candidate = parseKeepAliveDate(candidateISO);
    if (!candidate) continue;

    const currentStamp = debt.keepAliveLastUsedAt
      ? parseKeepAliveDate(debt.keepAliveLastUsedAt)
      : null;
    if (currentStamp && candidate.getTime() <= currentStamp.getTime()) {
      continue;
    }

    // Two links pointing at the same debt: keep the newest activity.
    const pending = stampByDebt.get(debt.id);
    const pendingParsed = pending ? parseKeepAliveDate(pending) : null;
    if (!pendingParsed || candidate.getTime() > pendingParsed.getTime()) {
      stampByDebt.set(debt.id, candidateISO);
    }
  }

  return Array.from(stampByDebt, ([debtId, lastUsedAt]) => ({
    debtId,
    lastUsedAt,
  }));
};
