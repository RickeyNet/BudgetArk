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
 */

import type { BudgetEntry, Business } from "../types";
import { getMonthKey } from "./budgetMonths";
import {
  fulfilledMonthsByBill,
  listUnfulfilledOccurrenceMonths,
} from "./billFulfillment";

/** One expense occurrence attributed to a business within the report year. */
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
  /** Sorted by date ascending. */
  lines: BusinessReportLine[];
}

export interface BusinessReport {
  year: number;
  /** Sorted by total descending; only businesses with activity in the year. */
  perBusiness: BusinessReportGroup[];
  grandTotal: number;
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
 * Aggregates business-tagged expenses for one calendar year.
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

      let group = groups.get(entry.businessId);
      if (!group) {
        const business = businessById.get(entry.businessId);
        group = {
          businessId: entry.businessId,
          name: business?.name ?? UNKNOWN_BUSINESS_NAME,
          deleted: !business || !!business.deletedAt,
          total: 0,
          entryCount: 0,
          receiptCount: 0,
          byCategory: [],
          byMonth: Array.from({ length: 12 }, () => 0),
          lines: [],
        };
        groups.set(entry.businessId, group);
      }

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
  }

  let grandTotal = 0;
  const perBusiness = Array.from(groups.values());
  for (const group of perBusiness) {
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
  perBusiness.sort((a, b) => b.total - a.total);

  return { year, perBusiness, grandTotal };
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
    "Date,Business,Category,Description,Amount,Recurring,HasReceipt",
  ];
  for (const group of report.perBusiness) {
    for (const line of group.lines) {
      rows.push(
        [
          csvCell(line.date),
          csvCell(group.name),
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
