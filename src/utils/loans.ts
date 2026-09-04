/**
 * BudgetArk - Loans (money lent out)
 * File: src/utils/loans.ts
 *
 * Pure rules for "Owed to You": an expense marked with `lentTo` is money
 * the user expects back, and `loanRepayments` on the same entry record
 * what has come back so far. This module owns the borrower name
 * normalization, the per-loan and per-borrower arithmetic behind the
 * tracker sheet and the entry-row badge, the repayment add/remove edits
 * (returned as a patched entry so the storage write stays a one-liner),
 * and the spreadsheet cell format the repayments round-trip through.
 * Nothing here touches storage or React so every rule is unit-testable.
 * Ids are supplied by callers - this module stays uuid-free for Jest.
 */

import type { BudgetEntry, LoanRepayment } from "../types";
import { roundToCents } from "./money";
import { sanitizeTextInput } from "./sanitize";

/** Borrower name cap - a first name or "Mom", not an essay. */
export const LENT_TO_MAX_LENGTH = 60;
/** Repayments per loan the validator tolerates (the UI never gets near it). */
export const MAX_LOAN_REPAYMENTS = 200;
/** Note cap on one repayment. */
export const LOAN_REPAYMENT_NOTE_MAX_LENGTH = 120;

const cleanText = (raw: string, max: number): string | undefined => {
  const cleaned = sanitizeTextInput(raw).replace(/\s+/g, " ").trim().slice(0, max).trim();
  return cleaned.length > 0 ? cleaned : undefined;
};

/**
 * Clean a typed borrower name: control characters stripped, whitespace
 * collapsed, capped. Returns undefined for an empty result so callers can
 * assign it straight onto the optional field.
 */
export const normalizeLentTo = (raw: string | undefined | null): string | undefined =>
  typeof raw === "string" ? cleanText(raw, LENT_TO_MAX_LENGTH) : undefined;

export const normalizeRepaymentNote = (raw: string | undefined | null): string | undefined =>
  typeof raw === "string" ? cleanText(raw, LOAN_REPAYMENT_NOTE_MAX_LENGTH) : undefined;

/** Case-insensitive grouping key so "sam" and "Sam" are one borrower. */
export const borrowerKey = (name: string): string => name.trim().toLowerCase();

/** A loan is a non-recurring expense with a borrower. */
export const isLoanEntry = (
  entry: Pick<BudgetEntry, "type" | "lentTo" | "recurring">
): boolean => entry.type === "expense" && !!entry.lentTo && !entry.recurring;

export const loanRepaidTotal = (entry: Pick<BudgetEntry, "loanRepayments">): number =>
  roundToCents(
    (entry.loanRepayments ?? []).reduce((sum, r) => sum + (r.amount > 0 ? r.amount : 0), 0)
  );

/** What is still owed on one loan - never negative, even after an overpayment. */
export const loanOutstanding = (
  entry: Pick<BudgetEntry, "amount" | "loanRepayments">
): number => roundToCents(Math.max(0, entry.amount - loanRepaidTotal(entry)));

export interface LoanLine {
  entry: BudgetEntry;
  repaid: number;
  outstanding: number;
  settled: boolean;
}

export interface BorrowerBalance {
  key: string;
  /** Display name as typed on the most recent loan. */
  name: string;
  lent: number;
  repaid: number;
  outstanding: number;
  /** Newest loan first. */
  loans: LoanLine[];
  openCount: number;
}

export interface LoanLedger {
  borrowers: BorrowerBalance[];
  totalLent: number;
  totalRepaid: number;
  totalOutstanding: number;
  loanCount: number;
}

const byDateDesc = (a: { date: string }, b: { date: string }): number =>
  new Date(b.date).getTime() - new Date(a.date).getTime();

/**
 * Group every loan by borrower. Borrowers with money still owed sort
 * first (largest balance on top), fully repaid borrowers after them by
 * name, so the sheet opens on what matters.
 */
export const buildLoanLedger = (entries: readonly BudgetEntry[]): LoanLedger => {
  const byKey = new Map<string, BorrowerBalance>();
  const loans = entries.filter(isLoanEntry).slice().sort(byDateDesc);

  for (const entry of loans) {
    const name = entry.lentTo as string;
    const key = borrowerKey(name);
    const repaid = loanRepaidTotal(entry);
    const outstanding = loanOutstanding(entry);
    const line: LoanLine = { entry, repaid, outstanding, settled: outstanding <= 0 };
    const existing = byKey.get(key);
    if (existing) {
      existing.lent = roundToCents(existing.lent + entry.amount);
      existing.repaid = roundToCents(existing.repaid + repaid);
      existing.outstanding = roundToCents(existing.outstanding + outstanding);
      existing.loans.push(line);
      if (!line.settled) existing.openCount += 1;
    } else {
      byKey.set(key, {
        key,
        name,
        lent: roundToCents(entry.amount),
        repaid,
        outstanding,
        loans: [line],
        openCount: line.settled ? 0 : 1,
      });
    }
  }

  const borrowers = Array.from(byKey.values()).sort((a, b) => {
    const aOpen = a.outstanding > 0;
    const bOpen = b.outstanding > 0;
    if (aOpen !== bOpen) return aOpen ? -1 : 1;
    if (aOpen && a.outstanding !== b.outstanding) return b.outstanding - a.outstanding;
    return a.name.localeCompare(b.name);
  });

  return {
    borrowers,
    totalLent: roundToCents(borrowers.reduce((s, b) => s + b.lent, 0)),
    totalRepaid: roundToCents(borrowers.reduce((s, b) => s + b.repaid, 0)),
    totalOutstanding: roundToCents(borrowers.reduce((s, b) => s + b.outstanding, 0)),
    loanCount: loans.length,
  };
};

/**
 * Borrower names to offer as chips in the entry form / inbox, most
 * recently lent-to first, deduped case-insensitively.
 */
export const lentToSuggestions = (entries: readonly BudgetEntry[], limit = 8): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  const sorted = entries.filter((e) => !!e.lentTo).slice().sort(byDateDesc);
  for (const entry of sorted) {
    const name = entry.lentTo as string;
    const key = borrowerKey(name);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
    if (out.length >= limit) break;
  }
  return out;
};

export interface NewLoanRepaymentInput {
  id: string;
  amount: number;
  date: string;
  note?: string;
  createdAt: string;
}

/**
 * Validate a repayment against the loan and return the patched entry, or
 * null when it can't be recorded: not a loan, a non-positive / non-finite
 * amount, more than is still owed (to the cent), an unparseable date, a
 * duplicate id, or the repayment cap. Repayments stay sorted oldest first.
 */
export const addLoanRepayment = (
  entry: BudgetEntry,
  input: NewLoanRepaymentInput
): BudgetEntry | null => {
  if (!isLoanEntry(entry)) return null;
  if (!Number.isFinite(input.amount) || input.amount <= 0) return null;
  const amount = roundToCents(input.amount);
  if (amount < 0.01) return null;
  if (amount > loanOutstanding(entry) + 0.001) return null;
  if (!Number.isFinite(Date.parse(input.date))) return null;
  const existing = entry.loanRepayments ?? [];
  if (existing.length >= MAX_LOAN_REPAYMENTS) return null;
  if (existing.some((r) => r.id === input.id)) return null;
  // A tombstoned id would be erased again on the next sync merge.
  if (entry.deletedRepaymentIds?.includes(input.id)) return null;

  const note = normalizeRepaymentNote(input.note);
  const repayment: LoanRepayment = {
    id: input.id,
    amount,
    date: input.date,
    ...(note ? { note } : {}),
    createdAt: input.createdAt,
  };
  const loanRepayments = [...existing, repayment].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  return { ...entry, loanRepayments };
};

/**
 * Drop one repayment and remember its id as a tombstone so a partner
 * phone that still holds the repayment can't bring it back on the next
 * sync merge (see mergeLoanRepayments). Returns the entry unchanged (same
 * reference) when the id is unknown so callers can skip the write.
 */
export const removeLoanRepayment = (entry: BudgetEntry, repaymentId: string): BudgetEntry => {
  const existing = entry.loanRepayments ?? [];
  if (!existing.some((r) => r.id === repaymentId)) return entry;
  const remaining = existing.filter((r) => r.id !== repaymentId);
  const next: BudgetEntry = { ...entry };
  if (remaining.length > 0) next.loanRepayments = remaining;
  else delete next.loanRepayments;
  next.deletedRepaymentIds = capTombstones([
    ...(entry.deletedRepaymentIds ?? []).filter((id) => id !== repaymentId),
    repaymentId,
  ]);
  return next;
};

/** Newest tombstones win the cap; the list is append-only otherwise. */
const capTombstones = (ids: string[]): string[] =>
  ids.length > MAX_LOAN_REPAYMENTS ? ids.slice(ids.length - MAX_LOAN_REPAYMENTS) : ids;

/** Same payment logged twice with fresh ids (a spreadsheet round-trip re-ids repayments). */
const repaymentFingerprint = (r: LoanRepayment): string =>
  `${r.date}|${r.amount}|${r.note ?? ""}`;

/**
 * Set-merge of two copies of the same loan entry after last-write-wins
 * has picked `winner`: every repayment either copy holds survives unless
 * either copy tombstoned it, so two phones logging repayments before a
 * sync keep both, and a removal on one phone sticks everywhere. A loser
 * repayment that matches a winner one exactly (date, amount, note) under
 * a different id is treated as the same payment - spreadsheet round-trips
 * re-id repayments - at the cost of collapsing two genuinely identical
 * same-day payments logged on different phones. Tombstones are unioned
 * too, so a removal can't be undone by merging in the other direction
 * later. The winner's other fields are untouched; a winner that is
 * deleted or no longer a loan is returned as-is (no resurrection), and so
 * is a loser that is a tombstone.
 */
export const mergeLoanRepayments = (winner: BudgetEntry, loser: BudgetEntry): BudgetEntry => {
  if (winner.deletedAt || loser.deletedAt || !isLoanEntry(winner)) return winner;
  const tombstones = new Set([
    ...(winner.deletedRepaymentIds ?? []),
    ...(loser.deletedRepaymentIds ?? []),
  ]);
  const winnerRepayments = (winner.loanRepayments ?? []).filter((r) => !tombstones.has(r.id));
  const seenIds = new Set(winnerRepayments.map((r) => r.id));
  const seenPrints = new Set(winnerRepayments.map(repaymentFingerprint));
  const extra = (loser.loanRepayments ?? []).filter(
    (r) =>
      !tombstones.has(r.id) && !seenIds.has(r.id) && !seenPrints.has(repaymentFingerprint(r))
  );
  const merged = [...winnerRepayments, ...extra]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, MAX_LOAN_REPAYMENTS);
  const tombstoneList = capTombstones(Array.from(tombstones));

  const unchanged =
    merged.length === (winner.loanRepayments ?? []).length &&
    merged.every((r, i) => r === winner.loanRepayments?.[i]) &&
    tombstoneList.length === (winner.deletedRepaymentIds ?? []).length;
  if (unchanged) return winner;

  const next: BudgetEntry = { ...winner };
  if (merged.length > 0) next.loanRepayments = merged;
  else delete next.loanRepayments;
  if (tombstoneList.length > 0) next.deletedRepaymentIds = tombstoneList;
  else delete next.deletedRepaymentIds;
  return next;
};

/* ── Spreadsheet cell format ──────────────────────────────────────────
 * Repayments travel in one cell as `YYYY-MM-DD:amount` pairs separated by
 * semicolons ("2026-09-01:25;2026-09-15:25"). Notes and ids are not
 * carried - a restored repayment gets a fresh id - so the cell stays
 * hand-editable. Parsing is fail-closed per pair: one malformed pair
 * rejects the WHOLE cell rather than guessing at the rest.
 */

export const formatLoanRepaymentsCell = (
  repayments: readonly LoanRepayment[] | undefined
): string =>
  (repayments ?? []).map((r) => `${r.date.slice(0, 10)}:${roundToCents(r.amount)}`).join(";");

const PAIR_RE = /^(\d{4}-\d{2}-\d{2}):(\d+(?:\.\d{1,2})?)$/;

/**
 * Parse the cell back into repayments. Returns undefined for an empty
 * cell and null for a malformed one.
 */
export const parseLoanRepaymentsCell = (
  raw: string,
  makeId: () => string,
  createdAt: string
): LoanRepayment[] | null | undefined => {
  const text = raw.trim();
  if (!text) return undefined;
  const pairs = text
    .split(";")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  if (pairs.length === 0 || pairs.length > MAX_LOAN_REPAYMENTS) return null;
  const out: LoanRepayment[] = [];
  for (const pair of pairs) {
    const m = PAIR_RE.exec(pair);
    if (!m) return null;
    const date = m[1];
    const amount = roundToCents(Number(m[2]));
    if (!Number.isFinite(Date.parse(date)) || !(amount >= 0.01)) return null;
    out.push({ id: makeId(), amount, date, createdAt });
  }
  return out;
};
