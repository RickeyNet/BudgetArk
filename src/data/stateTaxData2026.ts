/**
 * BudgetArk - State Income Tax Data (Tax Year 2026)
 * File: src/data/stateTaxData2026.ts
 *
 * Bundled per-state income tax tables for the take-home pay calculator.
 * Data-only - math lives in utils/taxCalc.ts.
 *
 * Source: Tax Foundation, "State Individual Income Tax Rates and Brackets,
 * 2026" (with per-state corrections where noted). Refresh annually via OTA
 * alongside taxData2026.ts.
 *
 * Documented v1 approximations (the calculator's disclaimer covers these):
 *  - Progressive brackets are SINGLE-filer thresholds. Married-joint
 *    estimates double them (exact in CA/MD/etc., close elsewhere);
 *    married-separate and head-of-household reuse the single table.
 *  - `standardDeduction` is subtracted from gross before applying rates.
 *    States that instead start from federal taxable income (SC) or conform
 *    to the federal deduction are entered with the federal amounts. States
 *    with no deduction (exemption/credit systems: IL, IN, MI, PA, NJ, CT,
 *    OH, MA, WV) are entered as 0 - their exemptions are small and v1
 *    ignores them, slightly overstating tax.
 *  - Local/city income taxes (NYC, MD counties, OH cities...) are NOT
 *    modeled; `note` flags the big ones.
 */

import type { TaxBracket } from "./taxData2026";

export interface StateTaxConfig {
  code: string;
  name: string;
  type: "none" | "flat" | "progressive";
  /** Flat states only - fraction, e.g. 0.0495. */
  rate?: number;
  /** Progressive states only - single-filer thresholds. */
  brackets?: TaxBracket[];
  /** Subtracted from gross income before rates. { single, marriedJoint }. */
  standardDeduction?: { single: number; marriedJoint: number };
  /** Flat credit subtracted from the computed tax, floored at 0 (Utah). */
  taxCredit?: { single: number; marriedJoint: number };
  /** Shown under the result when this state is selected. */
  note?: string;
}

const FED_DEDUCTION = { single: 16_100, marriedJoint: 32_200 };

export const STATE_TAX_2026: StateTaxConfig[] = [
  { code: "AL", name: "Alabama", type: "progressive", standardDeduction: { single: 3_000, marriedJoint: 8_500 }, brackets: [
    { rate: 0.02, over: 0 }, { rate: 0.04, over: 500 }, { rate: 0.05, over: 3_000 },
  ] },
  { code: "AK", name: "Alaska", type: "none" },
  { code: "AZ", name: "Arizona", type: "flat", rate: 0.025, standardDeduction: FED_DEDUCTION },
  { code: "AR", name: "Arkansas", type: "progressive", standardDeduction: { single: 2_470, marriedJoint: 4_940 }, brackets: [
    { rate: 0.02, over: 0 }, { rate: 0.039, over: 4_600 },
  ] },
  { code: "CA", name: "California", type: "progressive", standardDeduction: { single: 5_540, marriedJoint: 11_080 }, brackets: [
    { rate: 0.01, over: 0 }, { rate: 0.02, over: 11_079 }, { rate: 0.04, over: 26_264 },
    { rate: 0.06, over: 41_452 }, { rate: 0.08, over: 57_542 }, { rate: 0.093, over: 72_724 },
    { rate: 0.103, over: 371_479 }, { rate: 0.113, over: 445_771 }, { rate: 0.123, over: 742_953 },
    { rate: 0.133, over: 1_000_000 },
  ], note: "Excludes CA SDI payroll deduction (about 1.3% of wages)." },
  { code: "CO", name: "Colorado", type: "flat", rate: 0.044, standardDeduction: FED_DEDUCTION },
  { code: "CT", name: "Connecticut", type: "progressive", brackets: [
    { rate: 0.02, over: 0 }, { rate: 0.045, over: 10_000 }, { rate: 0.055, over: 50_000 },
    { rate: 0.06, over: 100_000 }, { rate: 0.065, over: 200_000 }, { rate: 0.069, over: 250_000 },
    { rate: 0.0699, over: 500_000 },
  ], note: "CT uses personal exemptions and credits this estimate doesn't model." },
  { code: "DE", name: "Delaware", type: "progressive", standardDeduction: { single: 3_250, marriedJoint: 6_500 }, brackets: [
    { rate: 0, over: 0 }, { rate: 0.022, over: 2_000 }, { rate: 0.039, over: 5_000 },
    { rate: 0.048, over: 10_000 }, { rate: 0.052, over: 20_000 }, { rate: 0.0555, over: 25_000 },
    { rate: 0.066, over: 60_000 },
  ] },
  { code: "DC", name: "District of Columbia", type: "progressive", standardDeduction: FED_DEDUCTION, brackets: [
    { rate: 0.04, over: 0 }, { rate: 0.06, over: 10_000 }, { rate: 0.065, over: 40_000 },
    { rate: 0.085, over: 60_000 }, { rate: 0.0925, over: 250_000 }, { rate: 0.0975, over: 500_000 },
    { rate: 0.1075, over: 1_000_000 },
  ] },
  { code: "FL", name: "Florida", type: "none" },
  { code: "GA", name: "Georgia", type: "flat", rate: 0.0519, standardDeduction: { single: 12_000, marriedJoint: 24_000 } },
  { code: "HI", name: "Hawaii", type: "progressive", standardDeduction: { single: 4_400, marriedJoint: 8_800 }, brackets: [
    { rate: 0.014, over: 0 }, { rate: 0.032, over: 9_600 }, { rate: 0.055, over: 14_400 },
    { rate: 0.064, over: 19_200 }, { rate: 0.068, over: 24_000 }, { rate: 0.072, over: 36_000 },
    { rate: 0.076, over: 48_000 }, { rate: 0.079, over: 125_000 }, { rate: 0.0825, over: 175_000 },
    { rate: 0.09, over: 225_000 }, { rate: 0.10, over: 275_000 }, { rate: 0.11, over: 325_000 },
  ] },
  { code: "ID", name: "Idaho", type: "flat", rate: 0.053, standardDeduction: FED_DEDUCTION },
  { code: "IL", name: "Illinois", type: "flat", rate: 0.0495 },
  { code: "IN", name: "Indiana", type: "flat", rate: 0.0295, note: "Most Indiana counties add a local income tax this estimate doesn't include." },
  { code: "IA", name: "Iowa", type: "flat", rate: 0.038, standardDeduction: FED_DEDUCTION },
  { code: "KS", name: "Kansas", type: "progressive", standardDeduction: { single: 3_605, marriedJoint: 8_240 }, brackets: [
    { rate: 0.052, over: 0 }, { rate: 0.0558, over: 23_000 },
  ] },
  { code: "KY", name: "Kentucky", type: "flat", rate: 0.035, standardDeduction: { single: 3_360, marriedJoint: 6_720 } },
  { code: "LA", name: "Louisiana", type: "flat", rate: 0.03, standardDeduction: { single: 12_875, marriedJoint: 25_750 } },
  { code: "ME", name: "Maine", type: "progressive", standardDeduction: FED_DEDUCTION, brackets: [
    { rate: 0.058, over: 0 }, { rate: 0.0675, over: 27_399 }, { rate: 0.0715, over: 64_849 },
  ] },
  { code: "MD", name: "Maryland", type: "progressive", standardDeduction: { single: 3_350, marriedJoint: 6_700 }, brackets: [
    { rate: 0.02, over: 0 }, { rate: 0.03, over: 1_000 }, { rate: 0.04, over: 2_000 },
    { rate: 0.0475, over: 3_000 }, { rate: 0.05, over: 100_000 }, { rate: 0.0525, over: 125_000 },
    { rate: 0.055, over: 150_000 }, { rate: 0.0575, over: 250_000 }, { rate: 0.0625, over: 500_000 },
    { rate: 0.065, over: 1_000_000 },
  ], note: "Maryland counties add a local income tax (2.25-3.2%) this estimate doesn't include." },
  { code: "MA", name: "Massachusetts", type: "progressive", brackets: [
    { rate: 0.05, over: 0 }, { rate: 0.09, over: 1_083_150 },
  ] },
  { code: "MI", name: "Michigan", type: "flat", rate: 0.0425, note: "Some Michigan cities (incl. Detroit) add a local income tax this estimate doesn't include." },
  { code: "MN", name: "Minnesota", type: "progressive", standardDeduction: { single: 15_300, marriedJoint: 30_600 }, brackets: [
    { rate: 0.0535, over: 0 }, { rate: 0.068, over: 33_310 }, { rate: 0.0785, over: 109_430 },
    { rate: 0.0985, over: 203_150 },
  ] },
  { code: "MS", name: "Mississippi", type: "flat", rate: 0.04, standardDeduction: { single: 2_300, marriedJoint: 4_600 } },
  // Missouri's 2026 table: 0% on roughly the first $1,348, then ~$1,348-wide
  // steps to the 4.7% top bracket above ~$9,436 (MO DOR indexed amounts).
  { code: "MO", name: "Missouri", type: "progressive", standardDeduction: FED_DEDUCTION, brackets: [
    { rate: 0, over: 0 }, { rate: 0.02, over: 1_348 }, { rate: 0.025, over: 2_696 },
    { rate: 0.03, over: 4_044 }, { rate: 0.035, over: 5_392 }, { rate: 0.04, over: 6_740 },
    { rate: 0.045, over: 8_088 }, { rate: 0.047, over: 9_436 },
  ] },
  { code: "MT", name: "Montana", type: "progressive", standardDeduction: FED_DEDUCTION, brackets: [
    { rate: 0.047, over: 0 }, { rate: 0.0565, over: 47_500 },
  ] },
  { code: "NE", name: "Nebraska", type: "progressive", standardDeduction: { single: 8_850, marriedJoint: 17_700 }, brackets: [
    { rate: 0.0246, over: 0 }, { rate: 0.0351, over: 4_130 }, { rate: 0.0455, over: 24_760 },
  ] },
  { code: "NV", name: "Nevada", type: "none" },
  { code: "NH", name: "New Hampshire", type: "none", note: "NH's interest & dividends tax was fully repealed - wages were never taxed." },
  { code: "NJ", name: "New Jersey", type: "progressive", brackets: [
    { rate: 0.014, over: 0 }, { rate: 0.0175, over: 20_000 }, { rate: 0.035, over: 35_000 },
    { rate: 0.0553, over: 40_000 }, { rate: 0.0637, over: 75_000 }, { rate: 0.0897, over: 500_000 },
    { rate: 0.1075, over: 1_000_000 },
  ] },
  { code: "NM", name: "New Mexico", type: "progressive", standardDeduction: FED_DEDUCTION, brackets: [
    { rate: 0.015, over: 0 }, { rate: 0.032, over: 5_500 }, { rate: 0.043, over: 16_500 },
    { rate: 0.047, over: 33_500 }, { rate: 0.049, over: 66_500 }, { rate: 0.059, over: 210_000 },
  ] },
  { code: "NY", name: "New York", type: "progressive", standardDeduction: { single: 8_000, marriedJoint: 16_050 }, brackets: [
    { rate: 0.039, over: 0 }, { rate: 0.044, over: 8_500 }, { rate: 0.0515, over: 11_700 },
    { rate: 0.054, over: 13_900 }, { rate: 0.059, over: 80_650 }, { rate: 0.0685, over: 215_400 },
    { rate: 0.0965, over: 1_077_550 }, { rate: 0.103, over: 5_000_000 }, { rate: 0.109, over: 25_000_000 },
  ], note: "New York City and Yonkers add a local income tax this estimate doesn't include." },
  { code: "NC", name: "North Carolina", type: "flat", rate: 0.0399, standardDeduction: { single: 12_750, marriedJoint: 25_500 } },
  { code: "ND", name: "North Dakota", type: "progressive", standardDeduction: FED_DEDUCTION, brackets: [
    { rate: 0, over: 0 }, { rate: 0.0195, over: 48_475 }, { rate: 0.025, over: 244_825 },
  ] },
  // Flat 2.75% on income above $26,050 - modeled as a 0% bracket below it.
  { code: "OH", name: "Ohio", type: "progressive", brackets: [
    { rate: 0, over: 0 }, { rate: 0.0275, over: 26_050 },
  ], note: "Many Ohio municipalities add a local income tax this estimate doesn't include." },
  { code: "OK", name: "Oklahoma", type: "progressive", standardDeduction: { single: 6_350, marriedJoint: 12_700 }, brackets: [
    { rate: 0, over: 0 }, { rate: 0.025, over: 3_750 }, { rate: 0.035, over: 4_900 },
    { rate: 0.045, over: 7_200 },
  ] },
  { code: "OR", name: "Oregon", type: "progressive", standardDeduction: { single: 2_910, marriedJoint: 5_820 }, brackets: [
    { rate: 0.0475, over: 0 }, { rate: 0.0675, over: 4_550 }, { rate: 0.0875, over: 11_400 },
    { rate: 0.099, over: 125_000 },
  ], note: "Ignores Oregon's federal tax subtraction, so it can overstate OR tax at lower incomes." },
  { code: "PA", name: "Pennsylvania", type: "flat", rate: 0.0307, note: "Most PA municipalities add a local earned income tax (often ~1%) this estimate doesn't include." },
  { code: "RI", name: "Rhode Island", type: "progressive", standardDeduction: { single: 11_200, marriedJoint: 22_400 }, brackets: [
    { rate: 0.0375, over: 0 }, { rate: 0.0475, over: 82_050 }, { rate: 0.0599, over: 186_450 },
  ] },
  // SC starts from FEDERAL taxable income, so the federal deduction is the
  // right proxy here.
  { code: "SC", name: "South Carolina", type: "progressive", standardDeduction: FED_DEDUCTION, brackets: [
    { rate: 0, over: 0 }, { rate: 0.03, over: 3_640 }, { rate: 0.06, over: 18_230 },
  ] },
  { code: "SD", name: "South Dakota", type: "none" },
  { code: "TN", name: "Tennessee", type: "none" },
  { code: "TX", name: "Texas", type: "none" },
  { code: "UT", name: "Utah", type: "flat", rate: 0.045, taxCredit: { single: 966, marriedJoint: 1_932 }, note: "Utah's taxpayer credit is applied as a flat estimate; the real credit phases out at higher incomes." },
  { code: "VT", name: "Vermont", type: "progressive", standardDeduction: { single: 7_650, marriedJoint: 15_300 }, brackets: [
    { rate: 0.0335, over: 0 }, { rate: 0.066, over: 49_400 }, { rate: 0.076, over: 119_700 },
    { rate: 0.0875, over: 249_700 },
  ] },
  { code: "VA", name: "Virginia", type: "progressive", standardDeduction: { single: 8_750, marriedJoint: 17_500 }, brackets: [
    { rate: 0.02, over: 0 }, { rate: 0.03, over: 3_000 }, { rate: 0.05, over: 5_000 },
    { rate: 0.0575, over: 17_000 },
  ] },
  { code: "WA", name: "Washington", type: "none", note: "Washington taxes long-term capital gains (7%+ over large thresholds), not wages." },
  { code: "WV", name: "West Virginia", type: "progressive", brackets: [
    { rate: 0.0222, over: 0 }, { rate: 0.0296, over: 10_000 }, { rate: 0.0333, over: 25_000 },
    { rate: 0.0444, over: 40_000 }, { rate: 0.0482, over: 60_000 },
  ] },
  { code: "WI", name: "Wisconsin", type: "progressive", standardDeduction: { single: 13_960, marriedJoint: 25_840 }, brackets: [
    { rate: 0.035, over: 0 }, { rate: 0.044, over: 15_110 }, { rate: 0.053, over: 51_950 },
    { rate: 0.0765, over: 332_720 },
  ], note: "Wisconsin's deduction phases out at higher incomes; this estimate uses the full amount." },
  { code: "WY", name: "Wyoming", type: "none" },
];

export const findStateTax = (code: string): StateTaxConfig | undefined =>
  STATE_TAX_2026.find((s) => s.code === code);
