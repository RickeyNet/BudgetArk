/**
 * BudgetArk - Business expense report (tax-time view)
 * File: src/utils/businessReport.ts
 *
 * Pure helpers behind BusinessReportModal: aggregate one calendar year of
 * business-tagged expenses per business, expand recurring entries with the
 * app's cadence logic (so the report matches what each month's Budget
 * screen shows), and render a one-way CSV for sharing with an accountant.
 *
 * Business expenses stay in the personal budget math everywhere else; this
 * report is the separated view.
 *
 * Income tagged to a business (a client payment approved from the Review
 * Inbox, a manual deposit) is reported next to the expenses as its own
 * total, so each business shows what came in, what went out and the net.
 * The expense fields keep their names and meaning - the receipt export
 * reads them - and income rides in parallel `income*` fields.
 */

import type { BudgetEntry, Business } from "../types";
import { getMonthKey } from "./budgetMonths";
import {
  entriesForMonth,
  fulfilledMonthsByBill,
  listUnfulfilledOccurrenceMonths,
} from "./billFulfillment";

/** One expense or income occurrence attributed to a business within the report year. */
export interface BusinessReportLine {
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
  hasReceipt: boolean;
}

export interface BusinessReportGroup {
  businessId: string;
  name: string;
  /** True when the business was deleted (or its id is unknown entirely). */
  deleted: boolean;
  total: number;
  /** Occurrences in the year (recurring entries count once per month hit). */
  entryCount: number;
  /** Occurrences whose entry has at least one receipt photo. */
  receiptCount: number;
  /** Sorted by total descending. */
  byCategory: { category: string; total: number }[];
  /** Jan..Dec totals. */
  byMonth: number[];
  /** Expense occurrences, sorted by date ascending. */
  lines: BusinessReportLine[];
  /** Income tagged to the business in the year (0 when there is none). */
  incomeTotal: number;
  /** Income occurrences in the year. */
  incomeCount: number;
  /** Income occurrences, sorted by date ascending. */
  incomeLines: BusinessReportLine[];
}

export interface BusinessReport {
  year: number;
  /**
   * Sorted by expense total descending (income breaks ties); only
   * businesses with activity - expenses or income - in the year.
   */
  perBusiness: BusinessReportGroup[];
  /** Expenses across every business. */
  grandTotal: number;
  /** Income across every business. */
  grandIncomeTotal: number;
}

const UNKNOWN_BUSINESS_NAME = "(deleted business)";

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

/** Current local month as YYYY-MM (default expansion cap). */
export const currentMonthKey = (now: Date = new Date()): string => getMonthKey(now);

/**
 * Aggregates business-tagged expenses and income for one calendar year.
 *
 * @param entries    live budget entries (tombstones already filtered)
 * @param businesses businesses INCLUDING deleted, so a tombstoned client
 *                   still reports under its real name (flagged deleted)
 * @param year       calendar year to report
 * @param nowKey     recurring expansion cap (defaults to the current month
 *                   so future occurrences of an ongoing bill aren't counted)
 */
export const computeBusinessReport = (
  entries: readonly BudgetEntry[],
  businesses: readonly Business[],
  year: number,
  nowKey: string = currentMonthKey()
): BusinessReport => {
  const windowStart = `${year}-01`;
  const yearEnd = `${year}-12`;
  const windowEnd = yearEnd < nowKey ? yearEnd : nowKey;

  const businessById = new Map(businesses.map((b) => [b.id, b]));
  const groups = new Map<string, BusinessReportGroup>();
  // Months where a bill's actual charge stands in for its projection - the
  // projection is skipped there so the bill isn't reported twice.
  const fulfilledMonths = fulfilledMonthsByBill(entries);

  const groupFor = (businessId: string): BusinessReportGroup => {
    let group = groups.get(businessId);
    if (!group) {
      const business = businessById.get(businessId);
      group = {
        businessId,
        name: business?.name ?? UNKNOWN_BUSINESS_NAME,
        deleted: !business || !!business.deletedAt,
        total: 0,
        entryCount: 0,
        receiptCount: 0,
        byCategory: [],
        byMonth: Array.from({ length: 12 }, () => 0),
        lines: [],
        incomeTotal: 0,
        incomeCount: 0,
        incomeLines: [],
      };
      groups.set(businessId, group);
    }
    return group;
  };

  if (windowEnd >= windowStart) {
    for (const entry of entries) {
      if (entry.type !== "expense" || !entry.businessId || entry.deletedAt) {
        continue;
      }
      const months = listUnfulfilledOccurrenceMonths(
        entry,
        fulfilledMonths,
        windowStart,
        windowEnd
      );
      if (months.length === 0) continue;

      const group = groupFor(entry.businessId);

      const originMonth = monthKeyFromISO(entry.date);
      const day = dayFromISO(entry.date);
      const hasReceipt = (entry.attachments?.length ?? 0) > 0;

      for (const monthKey of months) {
        const clampedDay = Math.min(Number(day), lastDayOfMonth(monthKey));
        group.total += entry.amount;
        group.entryCount += 1;
        if (hasReceipt) group.receiptCount += 1;
        const monthIdx = Number(monthKey.split("-")[1]) - 1;
        group.byMonth[monthIdx] += entry.amount;
        group.lines.push({
          entryId: entry.id,
          monthKey,
          date: `${monthKey}-${String(clampedDay).padStart(2, "0")}`,
          category: String(entry.category),
          description: entry.description,
          amount: entry.amount,
          recurring: !!entry.recurring,
          projected: monthKey !== originMonth,
          hasReceipt,
        });
      }
    }

    // Income goes month by month through entriesForMonth - THE membership
    // rule - because a recurring income estimate does not simply vanish
    // when a deposit is filed against it the way a bill does: it shrinks
    // to the paychecks still expected (projectRecurringForMonth). The
    // yearly shortcut the expenses use above would count it wrong.
    const hasBusinessIncome = entries.some(
      (entry) => entry.type === "income" && entry.businessId && !entry.deletedAt
    );
    for (
      let month = 1;
      hasBusinessIncome && month <= 12;
      month += 1
    ) {
      const monthKey = `${year}-${String(month).padStart(2, "0")}`;
      if (monthKey > windowEnd) break;
      for (const entry of entriesForMonth(entries, monthKey)) {
        if (entry.type !== "income" || !entry.businessId || entry.deletedAt) {
          continue;
        }
        const group = groupFor(entry.businessId);
        const clampedDay = Math.min(
          Number(dayFromISO(entry.date)),
          lastDayOfMonth(monthKey)
        );
        group.incomeTotal += entry.amount;
        group.incomeCount += 1;
        group.incomeLines.push({
          entryId: entry.id,
          monthKey,
          date: `${monthKey}-${String(clampedDay).padStart(2, "0")}`,
          category: String(entry.category),
          description: entry.description,
          amount: entry.amount,
          recurring: !!entry.recurring,
          projected: monthKey !== monthKeyFromISO(entry.date),
          hasReceipt: (entry.attachments?.length ?? 0) > 0,
        });
      }
    }
  }

  let grandTotal = 0;
  let grandIncomeTotal = 0;
  const perBusiness = Array.from(groups.values());
  for (const group of perBusiness) {
    grandTotal += group.total;
    grandIncomeTotal += group.incomeTotal;
    group.lines.sort((a, b) => a.date.localeCompare(b.date));
    group.incomeLines.sort((a, b) => a.date.localeCompare(b.date));

    const catTotals = new Map<string, number>();
    for (const line of group.lines) {
      catTotals.set(line.category, (catTotals.get(line.category) ?? 0) + line.amount);
    }
    group.byCategory = Array.from(catTotals, ([category, total]) => ({
      category,
      total,
    })).sort((a, b) => b.total - a.total);
  }
  perBusiness.sort(
    (a, b) => b.total - a.total || b.incomeTotal - a.incomeTotal
  );

  return { year, perBusiness, grandTotal, grandIncomeTotal };
};

/**
 * Escapes one CSV cell: quotes when needed, and defuses spreadsheet formula
 * injection (CWE-1236) by prefixing ' to cells starting with = + - @, same
 * policy as spreadsheetExport.escapeCsvFormulaCells.
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
 * One-way CSV for accountants - flat occurrence rows, not round-trip data
 * (no schema-version coupling with the spreadsheet importer).
 */
export const buildBusinessReportCsv = (report: BusinessReport): string => {
  const rows: string[] = [
    "Date,Business,Type,Category,Description,Amount,Recurring,HasReceipt",
  ];
  for (const group of report.perBusiness) {
    // Expenses first, then income - each block already in date order, and
    // the Type column lets an accountant filter or sum either side.
    const typed = [
      ...group.lines.map((line) => ({ line, type: "Expense" })),
      ...group.incomeLines.map((line) => ({ line, type: "Income" })),
    ];
    for (const { line, type } of typed) {
      rows.push(
        [
          csvCell(line.date),
          csvCell(group.name),
          csvCell(type),
          csvCell(line.category),
          csvCell(line.description ?? ""),
          csvCell(line.amount),
          csvCell(line.recurring),
          csvCell(line.hasReceipt),
        ].join(",")
      );
    }
  }
  return rows.join("\n");
};
