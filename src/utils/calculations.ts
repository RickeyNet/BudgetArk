/**
 * BudgetArk - Financial Calculations
 * File: src/utils/calculations.ts
 *
 * Pure math functions for debt payoff and investment projections.
 * All functions are stateless and have zero side effects - they take
 * numbers in and return numbers out, making them easy to test.
 *
 * Performance note: All calculations run in O(1) time using closed-form
 * formulas (no iterative loops) unless otherwise noted.
 */

import type { DebtClass } from "../types";

/* ── Input bounds (match importData.ts limits) ── */
const MAX_BALANCE = 1_000_000_000;  // $1B
const MAX_PAYMENT = 1_000_000;      // $1M per month
const MAX_RATE = 200;               // 200% APR
const MAX_YEARS = 100;
const MAX_MONTHS = MAX_YEARS * 12;

/** Clamp a number to [min, max]. Returns min for NaN/non-finite. */
const clamp = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
};

export type PayoffMethod = "avalanche" | "snowball";

export type PayoffDebtInput = {
  id: string;
  balance: number;
  rate: number;
  minPayment: number;
  debtClass?: DebtClass;
};

export type PayoffSimulationResult = {
  method: PayoffMethod;
  monthsToPayoff: number;
  totalInterestPaid: number;
  totalPaid: number;
  debtsClearedInFirstYear: number;
  isPayoffPossible: boolean;
};

const getSnowballPriority = (debtClass?: DebtClass): number => {
  if (debtClass === "house") return 2;
  if (debtClass === "car") return 1;
  return 0;
};

const pickTargetDebtIndex = (
  debts: { balance: number; rate: number; debtClass?: DebtClass }[],
  method: PayoffMethod
): number => {
  let bestIndex = -1;

  for (let i = 0; i < debts.length; i++) {
    if (debts[i].balance <= 0) continue;

    if (bestIndex === -1) {
      bestIndex = i;
      continue;
    }

    const current = debts[i];
    const best = debts[bestIndex];

    if (method === "avalanche") {
      if (current.rate > best.rate) {
        bestIndex = i;
        continue;
      }
      if (current.rate === best.rate && current.balance < best.balance) {
        bestIndex = i;
      }
      continue;
    }

    const currentPriority = getSnowballPriority(current.debtClass);
    const bestPriority = getSnowballPriority(best.debtClass);

    if (currentPriority < bestPriority) {
      bestIndex = i;
      continue;
    }
    if (currentPriority === bestPriority && current.balance < best.balance) {
      bestIndex = i;
      continue;
    }
    if (
      currentPriority === bestPriority &&
      current.balance === best.balance &&
      current.rate > best.rate
    ) {
      bestIndex = i;
    }
  }

  return bestIndex;
};

/**
 * Simulates multi-debt payoff month-by-month using either Avalanche or Snowball.
 *
 * - All debt minimums are paid first each month.
 * - Optional extra payment is then applied to one target debt at a time based on method.
 * - Returns aggregate timeline and interest metrics for what-if comparisons.
 */
export const simulatePayoffPlan = (
  inputDebts: PayoffDebtInput[],
  method: PayoffMethod,
  extraMonthlyPayment: number = 0,
  maxMonths: number = 600
): PayoffSimulationResult => {
  const debts = inputDebts
    .filter((debt) => debt.balance > 0)
    .map((debt) => ({
      id: debt.id,
      balance: clamp(debt.balance, 0, MAX_BALANCE),
      rate: clamp(debt.rate, 0, MAX_RATE),
      minPayment: clamp(debt.minPayment, 0, MAX_PAYMENT),
      debtClass: debt.debtClass,
    }));

  if (debts.length === 0) {
    return {
      method,
      monthsToPayoff: 0,
      totalInterestPaid: 0,
      totalPaid: 0,
      debtsClearedInFirstYear: 0,
      isPayoffPossible: true,
    };
  }

  const effectiveExtra = clamp(extraMonthlyPayment, 0, MAX_PAYMENT);
  let totalInterestPaid = 0;
  let totalPaid = 0;
  let monthsToPayoff = 0;
  let debtsClearedInFirstYear = 0;

  for (let month = 1; month <= maxMonths; month++) {
    let beforeBalance = 0;
    let afterBalance = 0;

    debts.forEach((debt) => {
      if (debt.balance <= 0) return;
      beforeBalance += debt.balance;

      const interest = debt.balance * (debt.rate / 100 / 12);
      debt.balance += interest;
      totalInterestPaid += interest;

      const minimumPayment = Math.min(debt.minPayment, debt.balance);
      debt.balance -= minimumPayment;
      totalPaid += minimumPayment;
    });

    let extraRemaining = effectiveExtra;
    while (extraRemaining > 0) {
      const targetIndex = pickTargetDebtIndex(debts, method);
      if (targetIndex < 0) break;

      const target = debts[targetIndex];
      const extraPayment = Math.min(extraRemaining, target.balance);
      target.balance -= extraPayment;
      totalPaid += extraPayment;
      extraRemaining -= extraPayment;

      if (target.balance <= 0.000001) {
        target.balance = 0;
      }
    }

    debts.forEach((debt) => {
      if (debt.balance > 0) {
        afterBalance += debt.balance;
      }
    });

    const paidOffThisMonth = debts.filter((debt) => debt.balance === 0).length;
    if (month <= 12) {
      debtsClearedInFirstYear = paidOffThisMonth;
    }

    monthsToPayoff = month;
    const allPaidOff = debts.every((debt) => debt.balance <= 0);
    if (allPaidOff) {
      return {
        method,
        monthsToPayoff,
        totalInterestPaid,
        totalPaid,
        debtsClearedInFirstYear,
        isPayoffPossible: true,
      };
    }

    if (afterBalance >= beforeBalance - 0.000001) {
      // Plan is unsolvable - minimum payment doesn't cover monthly interest.
      // Return Infinity for monthsToPayoff so formatPayoffMonths/UI render
      // "Not solvable" instead of showing the misleading early-exit month.
      return {
        method,
        monthsToPayoff: Infinity,
        totalInterestPaid,
        totalPaid,
        debtsClearedInFirstYear,
        isPayoffPossible: false,
      };
    }
  }

  // Hit the simulation cap (MAX_MONTHS) without paying everything off - also
  // an unsolvable / impractical plan, surface it as Infinity for the same
  // reason as above.
  return {
    method,
    monthsToPayoff: Infinity,
    totalInterestPaid,
    totalPaid,
    debtsClearedInFirstYear,
    isPayoffPossible: false,
  };
};

/**
 * Calculates the number of months required to pay off a debt
 * given a fixed monthly payment and APR.
 *
 * Uses the standard amortization formula:
 *   n = -ln(1 - (B * r) / P) / ln(1 + r)
 * where B = balance, r = monthly rate, P = payment
 *
 * @param balance - current remaining balance ($)
 * @param annualRate - APR as a percentage (e.g. 19.9 for 19.9%)
 * @param monthlyPayment - fixed monthly payment amount ($)
 * @returns number of months to payoff, or Infinity if payment is too low
 */
export const calcMonthsToPayoff = (
  balance: number,
  annualRate: number,
  monthlyPayment: number
): number => {
  balance = clamp(balance, 0, MAX_BALANCE);
  annualRate = clamp(annualRate, 0, MAX_RATE);
  monthlyPayment = clamp(monthlyPayment, 0, MAX_PAYMENT);

  if (balance <= 0) return 0;
  if (monthlyPayment <= 0) return Infinity;

  const monthlyRate = annualRate / 100 / 12;

  /* If 0% interest, it's simple division */
  if (monthlyRate === 0) return Math.ceil(balance / monthlyPayment);

  /* If payment doesn't cover interest, debt grows forever */
  if (monthlyPayment <= balance * monthlyRate) return Infinity;

  return Math.ceil(
    -Math.log(1 - (balance * monthlyRate) / monthlyPayment) /
      Math.log(1 + monthlyRate)
  );
};

/**
 * Calculates total interest paid over the life of a debt.
 *
 * @param balance - current remaining balance ($)
 * @param annualRate - APR as a percentage
 * @param monthlyPayment - fixed monthly payment ($)
 * @returns total interest paid in dollars
 */
export const calcTotalInterest = (
  balance: number,
  annualRate: number,
  monthlyPayment: number
): number => {
  balance = clamp(balance, 0, MAX_BALANCE);
  annualRate = clamp(annualRate, 0, MAX_RATE);
  monthlyPayment = clamp(monthlyPayment, 0, MAX_PAYMENT);

  const months = calcMonthsToPayoff(balance, annualRate, monthlyPayment);
  if (months === Infinity || months === 0) return 0;

  /* Simulate month by month rather than `monthlyPayment * ceil(months)`:
   * treating the final partial payment as a full one overstated interest
   * badly (it reported $200 of "interest" on a 0% loan paid in 3.33
   * months). The last month pays only what's still owed. */
  const monthlyRate = annualRate / 100 / 12;
  let remaining = balance;
  let totalInterest = 0;
  for (let m = 0; m < months && remaining > 0; m++) {
    const interest = remaining * monthlyRate;
    totalInterest += interest;
    remaining = remaining + interest - monthlyPayment;
  }
  return Math.max(0, totalInterest);
};

/**
 * Generates a month-by-month amortization schedule.
 * NOTE: This is O(n) where n = number of months. Use sparingly for charts.
 *
 * @param balance - starting balance ($)
 * @param annualRate - APR as a percentage
 * @param monthlyPayment - fixed monthly payment ($)
 * @returns array of { month, balance, interestPaid, principalPaid }
 */
export const generatePayoffSchedule = (
  balance: number,
  annualRate: number,
  monthlyPayment: number
): {
  month: number;
  balance: number;
  interestPaid: number;
  principalPaid: number;
}[] => {
  const schedule: {
    month: number;
    balance: number;
    interestPaid: number;
    principalPaid: number;
  }[] = [];

  balance = clamp(balance, 0, MAX_BALANCE);
  annualRate = clamp(annualRate, 0, MAX_RATE);
  monthlyPayment = clamp(monthlyPayment, 0, MAX_PAYMENT);

  const monthlyRate = annualRate / 100 / 12;
  let remaining = balance;
  let month = 0;

  /* Cap at 600 months (50 years) to prevent infinite loops */
  while (remaining > 0 && month < 600) {
    month++;
    const interest = remaining * monthlyRate;
    const principal = Math.min(monthlyPayment - interest, remaining);

    /* If payment doesn't cover interest, stop */
    if (principal <= 0) break;

    remaining = Math.max(0, remaining - principal);

    schedule.push({
      month,
      balance: remaining,
      interestPaid: interest,
      principalPaid: principal,
    });
  }

  return schedule;
};

/**
 * Calculates the future value of a recurring investment with
 * compound interest (monthly compounding).
 *
 * Formula: FV = P * [((1 + r)^n - 1) / r]
 * where P = monthly contribution, r = monthly rate, n = total months
 *
 * @param monthlyContribution - amount invested per month ($)
 * @param annualReturn - expected annual return as a percentage (e.g. 7 for 7%)
 * @param years - number of years to project
 * @returns future value in dollars
 */
export const calcInvestmentGrowth = (
  monthlyContribution: number,
  annualReturn: number,
  years: number
): number => {
  monthlyContribution = clamp(monthlyContribution, 0, MAX_PAYMENT);
  // Allow negative annual returns so deflationary / loss scenarios produce
  // a real number instead of the silently-suppressed `0` the old `clamp(_, 0, …)`
  // gave. The annuity formula `((1+r)^n − 1) / r` is well-defined for any
  // monthly r > −1; the lower bound here is −MAX_RATE = −200% annual, which
  // maps to monthly r = −1/6 ≈ −0.167, well clear of that singularity.
  annualReturn = clamp(annualReturn, -MAX_RATE, MAX_RATE);
  years = clamp(years, 0, MAX_YEARS);

  if (monthlyContribution <= 0 || years <= 0) return 0;

  const monthlyRate = annualReturn / 100 / 12;
  const totalMonths = years * 12;

  /* 0% return = just the sum of contributions */
  if (monthlyRate === 0) return monthlyContribution * totalMonths;

  return (
    monthlyContribution *
    ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate)
  );
};

/**
 * Generates year-by-year investment growth data for charting.
 * Returns an array with one entry per year showing total value,
 * total contributions, and interest earned.
 */
/**
 * Growth of a one-time amount left to compound with nothing added - the
 * "invest what you have and leave it" half of the lump-sum-vs-monthly
 * comparison. Same monthly-rate convention as calcInvestmentGrowth so the
 * two can be compared or summed. Zero years returns the principal.
 */
export const calcLumpSumGrowth = (
  principal: number,
  annualReturn: number,
  years: number
): number => {
  principal = clamp(principal, 0, MAX_BALANCE);
  annualReturn = clamp(annualReturn, -MAX_RATE, MAX_RATE);
  years = clamp(years, 0, MAX_YEARS);

  if (principal <= 0) return 0;

  const monthlyRate = annualReturn / 100 / 12;
  return principal * Math.pow(1 + monthlyRate, years * 12);
};

export const calcInvestmentTimeline = (
  monthlyContribution: number,
  annualReturn: number,
  years: number,
  /** Optional one-time amount invested at year 0 alongside the contributions. */
  startingBalance: number = 0
): { year: number; total: number; contributed: number; interest: number }[] => {
  monthlyContribution = clamp(monthlyContribution, 0, MAX_PAYMENT);
  // Match calcInvestmentGrowth - negative annual returns are valid input
  // for deflationary / loss scenarios; previously clamped to 0 here too.
  annualReturn = clamp(annualReturn, -MAX_RATE, MAX_RATE);
  years = clamp(years, 0, MAX_YEARS);
  startingBalance = clamp(startingBalance, 0, MAX_BALANCE);

  const timeline: { year: number; total: number; contributed: number; interest: number }[] = [];

  for (let y = 0; y <= years; y++) {
    const total =
      calcInvestmentGrowth(monthlyContribution, annualReturn, y) +
      calcLumpSumGrowth(startingBalance, annualReturn, y);
    // "contributed" is everything the user put in: the lump sum plus the
    // monthly deposits so far. Interest is whatever growth added on top.
    const contributed = startingBalance + monthlyContribution * 12 * y;
    timeline.push({
      year: y,
      total: Math.round(total),
      contributed: Math.round(contributed),
      interest: Math.round(total - contributed),
    });
  }

  return timeline;
};

export type InvestmentScenario = {
  /** Total the user puts in over the horizon. */
  putIn: number;
  /** Balance at the end of the horizon. */
  endValue: number;
  /** endValue - putIn (never below 0 for display purposes). */
  growth: number;
};

export type InvestmentComparison = {
  lumpOnly: InvestmentScenario;
  monthlyOnly: InvestmentScenario;
  both: InvestmentScenario;
  /**
   * First whole year in which the monthly-only balance reaches the
   * lump-sum-only balance, or null if it never does within the horizon
   * (or if either scenario is empty).
   */
  crossoverYear: number | null;
};

/**
 * Lump sum vs. monthly contributions, side by side: what each becomes on
 * its own, what both together become, and the year the monthly plan
 * overtakes the lump sum. Values are rounded to whole currency units.
 */
export const compareInvestmentScenarios = (
  lumpSum: number,
  monthlyContribution: number,
  annualReturn: number,
  years: number
): InvestmentComparison => {
  lumpSum = clamp(lumpSum, 0, MAX_BALANCE);
  monthlyContribution = clamp(monthlyContribution, 0, MAX_PAYMENT);
  annualReturn = clamp(annualReturn, -MAX_RATE, MAX_RATE);
  years = clamp(years, 0, MAX_YEARS);

  const scenario = (putIn: number, endValue: number): InvestmentScenario => ({
    putIn: Math.round(putIn),
    endValue: Math.round(endValue),
    growth: Math.max(0, Math.round(endValue - putIn)),
  });

  const lumpEnd = calcLumpSumGrowth(lumpSum, annualReturn, years);
  const monthlyEnd = calcInvestmentGrowth(monthlyContribution, annualReturn, years);
  const monthlyPutIn = monthlyContribution * 12 * years;

  let crossoverYear: number | null = null;
  if (lumpSum > 0 && monthlyContribution > 0) {
    for (let y = 1; y <= years; y++) {
      if (
        calcInvestmentGrowth(monthlyContribution, annualReturn, y) >=
        calcLumpSumGrowth(lumpSum, annualReturn, y)
      ) {
        crossoverYear = y;
        break;
      }
    }
  }

  return {
    lumpOnly: scenario(lumpSum, lumpEnd),
    monthlyOnly: scenario(monthlyPutIn, monthlyEnd),
    both: scenario(lumpSum + monthlyPutIn, lumpEnd + monthlyEnd),
    crossoverYear,
  };
};

/**
 * Calculates the required monthly payment to pay off a debt by a target date.
 *
 * Uses the annuity payment formula:
 *   P = B * r / (1 - (1 + r)^(-n))
 * where B = balance, r = monthly rate, n = months remaining
 *
 * @param balance - current remaining balance ($)
 * @param annualRate - APR as a percentage (e.g. 19.9 for 19.9%)
 * @param monthsRemaining - number of months until goal date
 * @returns required monthly payment in dollars, or Infinity if impossible
 */
export const calcPaymentForGoalDate = (
  balance: number,
  annualRate: number,
  monthsRemaining: number
): number => {
  balance = clamp(balance, 0, MAX_BALANCE);
  annualRate = clamp(annualRate, 0, MAX_RATE);
  monthsRemaining = clamp(monthsRemaining, 0, MAX_MONTHS);

  if (balance <= 0) return 0;
  if (monthsRemaining <= 0) return Infinity;

  const monthlyRate = annualRate / 100 / 12;

  if (monthlyRate === 0) return balance / monthsRemaining;

  const payment =
    (balance * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -monthsRemaining));

  return isFinite(payment) && payment > 0 ? payment : Infinity;
};

/**
 * Calculates the number of months between now and a target date.
 *
 * Uses UTC getters on both ends. ISO dates like `"2026-06-01"` parse as UTC
 * midnight; mixing that with `getMonth()` (local TZ) used to flip the month
 * back by one for users west of UTC, making `calcPaymentForGoalDate` round
 * to `Infinity` on the boundary.
 *
 * @param goalDateISO - ISO date string for the target date
 * @returns number of months remaining (minimum 0)
 */
export const calcMonthsUntilDate = (goalDateISO: string): number => {
  const now = new Date();
  const goal = new Date(goalDateISO);
  const months =
    (goal.getUTCFullYear() - now.getUTCFullYear()) * 12 +
    (goal.getUTCMonth() - now.getUTCMonth());
  return Math.max(0, months);
};

/**
 * Parses a stored goal date (`"YYYY-MM-DD"`) into a LOCAL-time Date.
 *
 * `new Date("2026-12-01")` parses as UTC midnight, which `toLocaleDateString`
 * then renders as the *previous* calendar day for users west of UTC
 * (Dec 1 → "11/30"). Building the Date from its parts pins it to the intended
 * day in the user's own timezone, so the displayed date matches what they
 * picked. Use this for DISPLAY; use `calcMonthsUntilDate` for month math.
 *
 * @param goalDateISO - ISO date string for the goal date
 * @returns a Date anchored to local midnight on the intended day
 */
export const parseGoalDateLocal = (goalDateISO: string): Date => {
  const [year, month, day] = goalDateISO.slice(0, 10).split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
};

/**
 * Formats a number as a localized currency string.
 *
 * @param amount - number to format
 * @param locale - optional locale (defaults to en-US)
 * @param currencyCode - optional currency code (defaults to USD)
 */
export const formatCurrency = (
  amount: number,
  locale: string = "en-US",
  currencyCode: string = "USD"
): string => {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(amount);
};
