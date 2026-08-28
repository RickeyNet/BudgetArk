/**
 * BudgetArk - Money Input Parser
 * File: src/utils/parseMoneyInput.ts
 *
 * The one parser for free-typed money fields. Five copies used to exist
 * with three different comma rules ("1,5" was 15 in the search filter, 1.5
 * in the balance prompt, and 1 in the purchase planner) - exactly the kind
 * of drift a shared helper prevents. The rule, in full:
 *
 *   1. Whitespace and common currency symbols ($ € £ ¥ ₹) are ignored.
 *   2. A leading "-" is rejected unless `allowNegative` (balances can be
 *      overdrawn; a contribution can be a withdrawal).
 *   3. Exactly one comma and no dot => the comma is the DECIMAL separator
 *      ("1234,56" = 1234.56 - what decimal-pad keyboards emit on many
 *      European locales). Otherwise commas are THOUSANDS separators and
 *      drop out ("1,234.56" = 1234.56, "1,000,000" = 1000000).
 *   4. Anything left that isn't digits with at most one dot is null
 *      ("12abc", "1.2.3", "."). Empty text is null, never 0 - callers that
 *      want 0 use `?? 0`.
 *   5. The magnitude is clamped to `max` (default MAX_MONEY_INPUT, the
 *      same cap importData applies) so extreme input can't overflow math.
 */

/** Upper bound on a typed amount - matches importData's MAX_MONEY. */
export const MAX_MONEY_INPUT = 1_000_000_000;

export interface ParseMoneyOptions {
  /** Accept a leading "-". Default false. */
  allowNegative?: boolean;
  /** Magnitude clamp. Default MAX_MONEY_INPUT. */
  max?: number;
}

const STRIP = /[\s\u00a0$€£¥₹]/g;

export const parseMoneyInput = (
  text: string,
  options: ParseMoneyOptions = {}
): number | null => {
  const max = options.max ?? MAX_MONEY_INPUT;
  let s = text.replace(STRIP, "");
  if (!s) return null;

  let negative = false;
  if (s.startsWith("-")) {
    if (!options.allowNegative) return null;
    negative = true;
    s = s.slice(1);
  }

  const hasDot = s.includes(".");
  const commaCount = (s.match(/,/g) ?? []).length;
  s = !hasDot && commaCount === 1 ? s.replace(",", ".") : s.replace(/,/g, "");

  if (!/^\d*\.?\d*$/.test(s) || s === "." || s === "") return null;
  const value = Number(s);
  if (!Number.isFinite(value)) return null;
  const clamped = Math.min(value, max);
  // Avoid -0 ("-0" typed mid-edit) leaking into comparisons/formatting.
  return negative && clamped !== 0 ? -clamped : clamped;
};
