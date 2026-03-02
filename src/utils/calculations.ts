/**
 * BudgetBuddy — Financial Calculations
 * File: src/utils/calculations.ts
 *
 * Pure math functions for debt payoff and investment projections.
 * All functions are stateless and have zero side effects — they take
 * numbers in and return numbers out, making them easy to test.
 *
 * Performance note: All calculations run in O(1) time using closed-form
 * formulas (no iterative loops) unless otherwise noted.
 */

/**
 * Calculates the number of months required to pay off a debt
 * given a fixed monthly payment and APR.
 *
 * Uses the standard amortization formula:
 *   n = -ln(1 - (B * r) / P) / ln(1 + r)
 * where B = balance, r = monthly rate, P = payment
 *
 * @param balance — current remaining balance ($)
 * @param annualRate — APR as a percentage (e.g. 19.9 for 19.9%)
 * @param monthlyPayment — fixed monthly payment amount ($)
 * @returns number of months to payoff, or Infinity if payment is too low
 */
export const calcMonthsToPayoff = (
  balance: number,
  annualRate: number,
  monthlyPayment: number
): number => {
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
 * @param balance — current remaining balance ($)
 * @param annualRate — APR as a percentage
 * @param monthlyPayment — fixed monthly payment ($)
 * @returns total interest paid in dollars
 */
export const calcTotalInterest = (
  balance: number,
  annualRate: number,
  monthlyPayment: number
): number => {
  const months = calcMonthsToPayoff(balance, annualRate, monthlyPayment);
  if (months === Infinity || months === 0) return 0;

  /* Total paid minus original balance = interest */
  const totalPaid = monthlyPayment * months;
  return Math.max(0, totalPaid - balance);
};

/**
 * Generates a month-by-month amortization schedule.
 * NOTE: This is O(n) where n = number of months. Use sparingly for charts.
 *
 * @param balance — starting balance ($)
 * @param annualRate — APR as a percentage
 * @param monthlyPayment — fixed monthly payment ($)
 * @returns array of { month, balance, interestPaid, principalPaid }
 */
export const generatePayoffSchedule = (
  balance: number,
  annualRate: number,
  monthlyPayment: number
): Array<{
  month: number;
  balance: number;
  interestPaid: number;
  principalPaid: number;
}> => {
  const schedule: Array<{
    month: number;
    balance: number;
    interestPaid: number;
    principalPaid: number;
  }> = [];

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
 * @param monthlyContribution — amount invested per month ($)
 * @param annualReturn — expected annual return as a percentage (e.g. 7 for 7%)
 * @param years — number of years to project
 * @returns future value in dollars
 */
export const calcInvestmentGrowth = (
  monthlyContribution: number,
  annualReturn: number,
  years: number
): number => {
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
export const calcInvestmentTimeline = (
  monthlyContribution: number,
  annualReturn: number,
  years: number
): { year: number; total: number; contributed: number; interest: number }[] => {
  const timeline: { year: number; total: number; contributed: number; interest: number }[] = [];

  for (let y = 0; y <= years; y++) {
    const total = calcInvestmentGrowth(monthlyContribution, annualReturn, y);
    const contributed = monthlyContribution * 12 * y;
    timeline.push({
      year: y,
      total: Math.round(total),
      contributed: Math.round(contributed),
      interest: Math.round(total - contributed),
    });
  }

  return timeline;
};

/**
 * Formats a number as a USD currency string.
 * Uses manual formatting for speed (avoids Intl.NumberFormat overhead).
 *
 * @param amount — number to format
 * @returns formatted string like "$1,234.56"
 */
export const formatCurrency = (amount: number): string => {
  return (
    "$" +
    amount
      .toFixed(2)
      .replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  );
};
