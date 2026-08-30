/**
 * BudgetArk - Person spending report (who-spent-what view)
 * File: src/utils/personReport.ts
 *
 * Pure helpers behind PersonReportModal: aggregate one calendar year of
 * person-assigned expenses per person, expand recurring entries with the
 * app's cadence logic (so the report matches what each month's Budget
 * screen shows), and render a one-way CSV for sharing.
 *
 * Deliberately a mirror of businessReport.ts (the tax-time twin) rather
 * than a shared generic: the two reports evolve independently and the
 * business one feeds receipt-zip planning, so coupling them would make
 * every person-report tweak a tax-report risk. Assigned expenses stay in
 * the personal budget math everywhere else; this report is the separated
 * view.
 */

import { entryPersonIds, personShare } from "./entryPeople";
import type { BudgetEntry, Person } from "../types";
import {
  fulfilledMonthsByBill,
  listUnfulfilledOccurrenceMonths,
} from "./billFulfillment";
import { currentMonthKey } from "./businessReport";

/** One expense occurrence assigned to a person within the report year. */
export interface PersonReportLine {
  entryId: string;
  /** YYYY-MM the occurrence lands in (recurring entries expand per month). */
  monthKey: string;
  /** YYYY-MM-DD shown in the CSV; projected occurrences reuse the original day. */
  date: string;
  category: string;
  description?: string;
  amount: number;
  recurring: boolean;
  /** True for expanded copies of a recurring entry beyond its start month. */
  projected: boolean;
}

export interface PersonReportGroup {
  personId: string;
  name: string;
  /** True when the person was deleted (or the id is unknown entirely). */
  deleted: boolean;
  total: number;
  /** Occurrences in the year (recurring entries count once per month hit). */
  entryCount: number;
  /** Sorted by total descending. */
  byCategory: { category: string; total: number }[];
  /** Jan..Dec totals. */
  byMonth: number[];
  /** Sorted by date ascending. */
  lines: PersonReportLine[];
}

export interface PersonReport {
  year: number;
  /** Sorted by total descending; only people with activity in the year. */
  perPerson: PersonReportGroup[];
  grandTotal: number;
}

const UNKNOWN_PERSON_NAME = "(deleted person)";

const monthKeyFromISO = (iso: string): string => {
  if (/^\d{4}-\d{2}/.test(iso)) return iso.slice(0, 7);
  const d = new Date(iso);
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${d.getUTCFullYear()}-${m}`;
};

const dayFromISO = (iso: string): string => {
  const m = iso.match(/^\d{4}-\d{2}-(\d{2})/);
  return m ? m[1] : "01";
};

const lastDayOfMonth = (monthKey: string): number => {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(y, m, 0).getDate();
};

/**
 * Aggregates person-assigned expenses for one calendar year.
 *
 * @param entries live budget entries (tombstones already filtered)
 * @param people  people INCLUDING deleted, so a tombstoned person still
 *                reports under their real name (flagged deleted)
 * @param year    calendar year to report
 * @param nowKey  recurring expansion cap (defaults to the current month so
 *                future occurrences of an ongoing bill aren't counted)
 */
export const computePersonReport = (
  entries: readonly BudgetEntry[],
  people: readonly Person[],
  year: number,
  nowKey: string = currentMonthKey()
): PersonReport => {
  const windowStart = `${year}-01`;
  const yearEnd = `${year}-12`;
  const windowEnd = yearEnd < nowKey ? yearEnd : nowKey;

  const personById = new Map(people.map((p) => [p.id, p]));
  const groups = new Map<string, PersonReportGroup>();
  // Same fulfilment rule as the business report: a bill's actual charge
  // replaces its projection in that month, never doubles it.
  const fulfilledMonths = fulfilledMonthsByBill(entries);

  if (windowEnd >= windowStart) {
    for (const entry of entries) {
      if (entry.type !== "expense" || entry.deletedAt) continue;
      const assignees = entryPersonIds(entry);
      if (assignees.length === 0) continue;
      const months = listUnfulfilledOccurrenceMonths(
        entry,
        fulfilledMonths,
        windowStart,
        windowEnd
      );
      if (months.length === 0) continue;
      // Shared spending splits evenly (see entryPeople.personShare) so the
      // grand total still equals what was actually spent.
      const share = personShare(entry.amount, assignees.length);
      const originMonth = monthKeyFromISO(entry.date);
      const day = dayFromISO(entry.date);

      for (const personId of assignees) {
        let group = groups.get(personId);
        if (!group) {
          const person = personById.get(personId);
          group = {
            personId,
            name: person?.name ?? UNKNOWN_PERSON_NAME,
            deleted: !person || !!person.deletedAt,
            total: 0,
            entryCount: 0,
            byCategory: [],
            byMonth: Array.from({ length: 12 }, () => 0),
            lines: [],
          };
          groups.set(personId, group);
        }

        for (const monthKey of months) {
          const clampedDay = Math.min(Number(day), lastDayOfMonth(monthKey));
          group.total += share;
          group.entryCount += 1;
          const monthIdx = Number(monthKey.split("-")[1]) - 1;
          group.byMonth[monthIdx] += share;
          group.lines.push({
            entryId: entry.id,
            monthKey,
            date: `${monthKey}-${String(clampedDay).padStart(2, "0")}`,
            category: String(entry.category),
            description: entry.description,
            amount: share,
            recurring: !!entry.recurring,
            projected: monthKey !== originMonth,
          });
        }
      }
    }
  }

  let grandTotal = 0;
  const perPerson = Array.from(groups.values());
  for (const group of perPerson) {
    grandTotal += group.total;
    group.lines.sort((a, b) => a.date.localeCompare(b.date));

    const catTotals = new Map<string, number>();
    for (const line of group.lines) {
      catTotals.set(line.category, (catTotals.get(line.category) ?? 0) + line.amount);
    }
    group.byCategory = Array.from(catTotals, ([category, total]) => ({
      category,
      total,
    })).sort((a, b) => b.total - a.total);
  }
  perPerson.sort((a, b) => b.total - a.total);

  return { year, perPerson, grandTotal };
};

/**
 * Escapes one CSV cell: quotes when needed, and defuses spreadsheet formula
 * injection (CWE-1236) by prefixing ' to cells starting with = + - @, same
 * policy as businessReport.csvCell.
 */
const csvCell = (raw: string | number | boolean): string => {
  if (typeof raw === "number") return String(raw);
  if (typeof raw === "boolean") return raw ? "yes" : "no";
  let s = raw;
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
};

/**
 * One-way CSV - flat occurrence rows, not round-trip data (no
 * schema-version coupling with the spreadsheet importer).
 */
export const buildPersonReportCsv = (report: PersonReport): string => {
  const rows: string[] = [
    "Date,Person,Category,Description,Amount,Recurring",
  ];
  for (const group of report.perPerson) {
    for (const line of group.lines) {
      rows.push(
        [
          csvCell(line.date),
          csvCell(group.name),
          csvCell(line.category),
          csvCell(line.description ?? ""),
          csvCell(line.amount),
          csvCell(line.recurring),
        ].join(",")
      );
    }
  }
  return rows.join("\n");
};
