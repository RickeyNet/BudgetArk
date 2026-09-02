/**
 * BudgetArk - Savings Interest
 * File: src/utils/savingsInterest.ts
 *
 * Why: an APY typed on a cash account is only useful once it's turned into
 * dollars a year and compared with what a typical high-yield account pays -
 * that gap is the nudge to move idle cash. Everything here is pure and
 * informational; nothing ever changes a balance. Offline by design: the
 * reference rate is a bundled constant, not a fetched quote (rule 4).
 */

/** Largest APY accepted anywhere (percent). Mirrors isAssetAccountItem. */
export const MAX_APY_PERCENT = 100;

/**
 * A typical high-yield savings APY, percent. Bundled and hand-maintained -
 * REFRESH ANNUALLY alongside the tax tables (see docs/testing.md). The
 * comparison line says "typical", never a bank name, so a stale number
 * misleads no one about a specific product.
 */
export const REFERENCE_HYSA_APY = 4.0;

/** Yearly gap below this many dollars isn't worth a line on the Bridge. */
export const MIN_APY_GAP_TO_SHOW = 10;

/**
 * Parse a typed APY ("4.5", "4.5%", " 4,5 " is NOT accepted - decimal
 * point only, like the balance field). Blank, zero, junk or over the cap
 * -> undefined, which the editor stores as "no APY". Rounded to 2 dp.
 */
export const parseApyInput = (raw: string): number | undefined => {
  const text = raw.trim().replace(/%$/, "").trim();
  if (!text) return undefined;
  const value = Number(text);
  if (!Number.isFinite(value) || value <= 0 || value > MAX_APY_PERCENT) {
    return undefined;
  }
  return Math.round(value * 100) / 100;
};

/** Simple (non-compounding) dollars earned in a year at `apyPercent`. */
export const calcAnnualInterest = (balance: number, apyPercent: number): number => {
  if (!Number.isFinite(balance) || !Number.isFinite(apyPercent)) return 0;
  if (balance <= 0 || apyPercent <= 0) return 0;
  return Math.round(balance * apyPercent) / 100;
};

/**
 * Dollars a year the balance would earn ON TOP of its current rate at the
 * reference APY. 0 when the account already pays at least the reference.
 */
export const calcApyGap = (
  balance: number,
  apyPercent: number,
  referenceApy: number = REFERENCE_HYSA_APY,
): number => {
  const gap =
    calcAnnualInterest(balance, referenceApy) - calcAnnualInterest(balance, apyPercent);
  return gap > 0 ? Math.round(gap * 100) / 100 : 0;
};

/** "4.5%" / "4%" / "0.01%" - trailing zeros trimmed, at most 2 dp. */
export const formatApy = (apyPercent: number): string => {
  const fixed = apyPercent.toFixed(2);
  return `${fixed.replace(/\.?0+$/, "")}%`;
};

/** Row line: "4.5% APY · ~$144/yr". */
export const describeApy = (
  balance: number,
  apyPercent: number,
  money: (amount: number) => string,
): string =>
  `${formatApy(apyPercent)} APY · ~${money(calcAnnualInterest(balance, apyPercent))}/yr`;

/**
 * The comparison line for a savings account, or null when the account
 * already keeps up with the reference rate or the gap is too small to
 * mention. Worded as "typical high-yield" - no bank, no link (rule 4 and
 * the affiliate-links plan both say so).
 */
export const describeApyGap = (
  balance: number,
  apyPercent: number,
  money: (amount: number) => string,
  referenceApy: number = REFERENCE_HYSA_APY,
): string | null => {
  const gap = calcApyGap(balance, apyPercent, referenceApy);
  if (gap < MIN_APY_GAP_TO_SHOW) return null;
  return `A typical ${formatApy(referenceApy)} high-yield account would add about ${money(
    gap,
  )}/yr`;
};
