/**
 * BudgetArk - Quarterly Tax Paid Storage
 * File: src/storage/quarterlyTaxPaidStorage.ts
 *
 * Device-local "I paid this quarter" marks for the Quarterly Taxes tool,
 * keyed by "YYYY-Qn" (see utils/quarterlyTax for the record and its
 * fail-closed parse). Deliberately NOT synced or exported in this first
 * cut: the estimate is one filer's, and the mark is a checkbox, not money.
 * Writes are merges inside the store's write queue so two quick taps can't
 * clobber each other. Capped so a corrupt or runaway store can't grow.
 */

import * as EncryptedStorage from "./encryptedStorage";
import { parseQuarterPaidMap, type QuarterPaidRecord } from "../utils/quarterlyTax";

const STORAGE_KEY = "@budgetark_quarterly_tax_paid" as const;

/** Ten years of quarters is plenty; oldest keys drop first. */
export const MAX_QUARTER_PAID_RECORDS = 40;

const capped = (map: Record<string, QuarterPaidRecord>): Record<string, QuarterPaidRecord> => {
  const keys = Object.keys(map).sort();
  if (keys.length <= MAX_QUARTER_PAID_RECORDS) return map;
  const keep = new Set(keys.slice(-MAX_QUARTER_PAID_RECORDS));
  const out: Record<string, QuarterPaidRecord> = {};
  for (const key of keys) if (keep.has(key)) out[key] = map[key];
  return out;
};

export const getQuarterPaidMap = async (): Promise<Record<string, QuarterPaidRecord>> =>
  parseQuarterPaidMap(await EncryptedStorage.getItem(STORAGE_KEY));

export const markQuarterPaid = async (
  key: string,
  record: QuarterPaidRecord
): Promise<Record<string, QuarterPaidRecord>> => {
  let next: Record<string, QuarterPaidRecord> = {};
  await EncryptedStorage.updateItem(STORAGE_KEY, (current) => {
    next = capped(parseQuarterPaidMap(JSON.stringify({ ...parseQuarterPaidMap(current), [key]: record })));
    return JSON.stringify(next);
  });
  return next;
};

export const unmarkQuarterPaid = async (key: string): Promise<Record<string, QuarterPaidRecord>> => {
  let next: Record<string, QuarterPaidRecord> = {};
  await EncryptedStorage.updateItem(STORAGE_KEY, (current) => {
    const map = parseQuarterPaidMap(current);
    delete map[key];
    next = map;
    return JSON.stringify(next);
  });
  return next;
};
