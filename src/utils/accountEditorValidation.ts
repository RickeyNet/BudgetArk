/**
 * BudgetArk - Account editor validation
 * File: src/utils/accountEditorValidation.ts
 *
 * Decides, before anything is written, whether the Bridge account editor's
 * form can be saved - and if not, exactly which fields are wrong, so the
 * sheet can say so instead of Save doing nothing.
 *
 * It exists because the old save path validated as it went: a bad name or
 * balance returned silently, and a ticker row that didn't parse simply
 * "dropped out". For a row that already existed, dropping out meant the
 * holding was tombstoned - clearing the Shares field and tapping Save
 * deleted the position. So the rule here is strict on purpose: a row is
 * either valid, or entirely blank AND brand new (ignored), or it blocks the
 * save. Removing a holding is only ever done with the row's remove button.
 *
 * Pure (no React, no storage) so the rules are pinned by tests.
 */

import { isValidSymbol, normalizeSymbol } from "./holdingsMath";
import { parseMoneyInput } from "./parseMoneyInput";
import { parseApyInput } from "./savingsInterest";

/** The editor's row shape (all fields are raw text as typed). */
export type AccountEditorRow = {
  key: string;
  /** Present when the row edits a holding that already exists. */
  id?: string;
  kind: "ticker" | "fund";
  symbol: string;
  shares: string;
  costBasis: string;
  name: string;
  value: string;
};

export type AccountFieldIssue = "name" | "balance" | "apy";

export type AccountRowIssue =
  | "symbol"
  | "shares"
  | "costBasis"
  | "fundName"
  | "fundValue"
  | "proxy";

export type AccountEditorValidation = {
  valid: boolean;
  fieldIssues: AccountFieldIssue[];
  /** Row key -> what is wrong with it. Only rows with issues appear. */
  rowIssues: Record<string, AccountRowIssue[]>;
  /** Keys of new, completely empty rows - safe to leave out of the save. */
  blankRowKeys: string[];
};

const isBlank = (text: string): boolean => text.trim() === "";

const isBlankRow = (row: AccountEditorRow): boolean =>
  isBlank(row.symbol) &&
  isBlank(row.shares) &&
  isBlank(row.costBasis) &&
  isBlank(row.name) &&
  isBlank(row.value);

/** Optional money field: blank is fine, anything typed must parse to >= 0. */
const optionalMoneyInvalid = (text: string): boolean => {
  if (isBlank(text)) return false;
  const parsed = parseMoneyInput(text);
  return parsed === null || !Number.isFinite(parsed) || parsed < 0;
};

const requiredMoney = (text: string): number | null => {
  const parsed = parseMoneyInput(text);
  return parsed !== null && Number.isFinite(parsed) ? parsed : null;
};

const validateRow = (row: AccountEditorRow): AccountRowIssue[] => {
  const issues: AccountRowIssue[] = [];
  if (row.kind === "fund") {
    if (isBlank(row.name)) issues.push("fundName");
    const value = requiredMoney(row.value);
    if (value === null || value < 0) issues.push("fundValue");
    // The index proxy is optional, but a typed one that isn't a symbol used
    // to be discarded without a word (the fund quietly became fixed-value).
    if (!isBlank(row.symbol) && !isValidSymbol(normalizeSymbol(row.symbol))) {
      issues.push("proxy");
    }
  } else {
    if (!isValidSymbol(normalizeSymbol(row.symbol))) issues.push("symbol");
    const shares = requiredMoney(row.shares);
    if (shares === null || shares <= 0) issues.push("shares");
  }
  if (optionalMoneyInvalid(row.costBasis)) issues.push("costBasis");
  return issues;
};

export const validateAccountEditor = (input: {
  name: string;
  balance: string;
  apy: string;
  /** Investment/Retirement: value comes from holdings, no balance/APY field. */
  isPureHoldings: boolean;
  /** Whether this category shows the ticker/fund rows at all. */
  hasHoldings: boolean;
  rows: readonly AccountEditorRow[];
}): AccountEditorValidation => {
  const fieldIssues: AccountFieldIssue[] = [];
  if (isBlank(input.name)) fieldIssues.push("name");
  if (!input.isPureHoldings) {
    const balance = requiredMoney(input.balance);
    if (balance === null || balance < 0) fieldIssues.push("balance");
    // Blank and 0 both mean "no APY"; anything else must be a usable rate.
    const apyText = input.apy.trim().replace(/%$/, "").trim();
    if (apyText !== "" && Number(apyText) !== 0 && parseApyInput(input.apy) === undefined) {
      fieldIssues.push("apy");
    }
  }

  const rowIssues: Record<string, AccountRowIssue[]> = {};
  const blankRowKeys: string[] = [];
  if (input.hasHoldings) {
    for (const row of input.rows) {
      // Only a NEW row may be skipped for being empty. An emptied existing
      // row falls through to validateRow and blocks the save.
      if (!row.id && isBlankRow(row)) {
        blankRowKeys.push(row.key);
        continue;
      }
      const issues = validateRow(row);
      if (issues.length > 0) rowIssues[row.key] = issues;
    }
  }

  return {
    valid: fieldIssues.length === 0 && Object.keys(rowIssues).length === 0,
    fieldIssues,
    rowIssues,
    blankRowKeys,
  };
};
