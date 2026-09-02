/**
 * BudgetArk - Settle Up
 * File: src/utils/settleUp.ts
 *
 * Why: "who spent this" assignments answer a monthly question - what does
 * each person owe for the month? The budget owner logs and pays; an
 * expense assigned to people is each assignee's share (shared entries
 * split evenly, see entryPeople.personShare), and a settlement record says
 * how much of a month has been paid back. Recurring bills count once per
 * month they hit, an actual charge replacing its bill's estimate, so the
 * numbers match the Budget screen and the person report. Pure; the sheet
 * only renders and records.
 */

import type { BudgetEntry, Person } from "../types";
import { entryPersonIds, personShare } from "./entryPeople";
import { fulfilledMonthsByBill, listUnfulfilledOccurrenceMonths } from "./billFulfillment";

/** One "mark settled" action: how much of a person's month was paid back. */
export interface SettlementRecord {
  personId: string;
  /** YYYY-MM the settlement applies to. */
  monthKey: string;
  amount: number;
  settledAt: string;
}

export interface PersonBalance {
  personId: string;
  name: string;
  deleted: boolean;
  /** This month's assigned share, to cents. */
  owed: number;
  /** Settlements recorded for this person + month. */
  settled: number;
  /** max(0, owed - settled). */
  outstanding: number;
  entryCount: number;
}

export interface SettleUpSummary {
  monthKey: string;
  people: PersonBalance[];
  totalOwed: number;
  totalOutstanding: number;
}

/** Records kept per device; older ones fall off the front. */
export const MAX_SETTLEMENT_RECORDS = 2000;
const MAX_SETTLEMENT_AMOUNT = 1_000_000_000;
const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;

const UNKNOWN_PERSON_NAME = "(deleted person)";
const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Fail-closed parse of the stored settlement list. */
export const parseSettlements = (raw: string | null): SettlementRecord[] => {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out: SettlementRecord[] = [];
    for (const value of parsed) {
      if (!value || typeof value !== "object") continue;
      const record = value as Record<string, unknown>;
      if (
        typeof record.personId !== "string" ||
        !record.personId ||
        record.personId.length > 80 ||
        typeof record.monthKey !== "string" ||
        !MONTH_KEY.test(record.monthKey) ||
        typeof record.amount !== "number" ||
        !Number.isFinite(record.amount) ||
        record.amount <= 0 ||
        record.amount > MAX_SETTLEMENT_AMOUNT ||
        typeof record.settledAt !== "string" ||
        Number.isNaN(Date.parse(record.settledAt))
      ) {
        continue;
      }
      out.push({
        personId: record.personId,
        monthKey: record.monthKey,
        amount: record.amount,
        settledAt: record.settledAt,
      });
    }
    return out.slice(-MAX_SETTLEMENT_RECORDS);
  } catch {
    return [];
  }
};

/**
 * Per-person balances for one month. People INCLUDING deleted so a
 * removed household member's open balance still shows; sorted by
 * outstanding, then owed, largest first; people with nothing owed and
 * nothing settled are left out.
 */
export const computeSettleUp = (
  entries: readonly BudgetEntry[],
  people: readonly Person[],
  monthKey: string,
  settlements: readonly SettlementRecord[],
): SettleUpSummary => {
  const personById = new Map(people.map((p) => [p.id, p]));
  const balances = new Map<string, PersonBalance>();
  const ensure = (personId: string): PersonBalance => {
    let balance = balances.get(personId);
    if (!balance) {
      const person = personById.get(personId);
      balance = {
        personId,
        name: person?.name ?? UNKNOWN_PERSON_NAME,
        deleted: !person || !!person.deletedAt,
        owed: 0,
        settled: 0,
        outstanding: 0,
        entryCount: 0,
      };
      balances.set(personId, balance);
    }
    return balance;
  };

  const fulfilledMonths = fulfilledMonthsByBill(entries);
  for (const entry of entries) {
    if (entry.type !== "expense" || entry.deletedAt) continue;
    const assignees = entryPersonIds(entry);
    if (assignees.length === 0) continue;
    const months = listUnfulfilledOccurrenceMonths(entry, fulfilledMonths, monthKey, monthKey);
    if (months.length === 0) continue;
    const share = personShare(entry.amount, assignees.length);
    for (const personId of assignees) {
      const balance = ensure(personId);
      balance.owed += share;
      balance.entryCount += 1;
    }
  }
  for (const record of settlements) {
    if (record.monthKey !== monthKey) continue;
    ensure(record.personId).settled += record.amount;
  }

  let totalOwed = 0;
  let totalOutstanding = 0;
  const result = Array.from(balances.values()).map((balance) => {
    const owed = round2(balance.owed);
    const settled = round2(balance.settled);
    const outstanding = round2(Math.max(0, owed - settled));
    totalOwed += owed;
    totalOutstanding += outstanding;
    return { ...balance, owed, settled, outstanding };
  });
  result.sort((a, b) => b.outstanding - a.outstanding || b.owed - a.owed || a.name.localeCompare(b.name));

  return {
    monthKey,
    people: result,
    totalOwed: round2(totalOwed),
    totalOutstanding: round2(totalOutstanding),
  };
};
