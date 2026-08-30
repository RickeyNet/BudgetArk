/**
 * BudgetArk - Federal Tax Data (Tax Year 2026)
 * File: src/data/taxData2026.ts
 *
 * Bundled federal income tax constants for the Charts-tab take-home pay
 * calculator: bracket tables per filing status, standard deductions, and
 * FICA rates/caps. Data-only - all math lives in utils/taxCalc.ts.
 *
 * Sources (update annually via OTA - no network call is ever made):
 *  - IRS Rev. Proc. 2025-32 (2026 inflation adjustments, incl. One Big
 *    Beautiful Bill Act amendments) - brackets + standard deductions.
 *  - SSA 2026 fact sheet - Social Security wage base $184,500.
 * The calculator's "Data source" line and TAX_DATA_YEAR must move together
 * when these tables are refreshed for a new tax year.
 */

export const TAX_DATA_YEAR = 2026;

export type FilingStatus = "single" | "marriedJoint" | "marriedSeparate" | "headOfHousehold";

export const FILING_STATUS_OPTIONS: { value: FilingStatus; label: string }[] = [
  { value: "single", label: "Single" },
  { value: "marriedJoint", label: "Married joint" },
  { value: "marriedSeparate", label: "Married separate" },
  { value: "headOfHousehold", label: "Head of household" },
];

/**
 * One marginal bracket: `rate` (fraction, e.g. 0.22) applies to taxable
 * income ABOVE `over`, up to the next bracket's `over`. Tables must be
 * sorted ascending by `over` with the first entry at 0.
 */
export interface TaxBracket {
  rate: number;
  over: number;
}

export const FEDERAL_BRACKETS_2026: Record<FilingStatus, TaxBracket[]> = {
  single: [
    { rate: 0.10, over: 0 },
    { rate: 0.12, over: 12_400 },
    { rate: 0.22, over: 50_400 },
    { rate: 0.24, over: 105_700 },
    { rate: 0.32, over: 201_775 },
    { rate: 0.35, over: 256_225 },
    { rate: 0.37, over: 640_600 },
  ],
  marriedJoint: [
    { rate: 0.10, over: 0 },
    { rate: 0.12, over: 24_800 },
    { rate: 0.22, over: 100_800 },
    { rate: 0.24, over: 211_400 },
    { rate: 0.32, over: 403_550 },
    { rate: 0.35, over: 512_450 },
    { rate: 0.37, over: 768_700 },
  ],
  // Half the joint thresholds, except the 37% bracket starts at $384,350
  // (not half of the single threshold) - an intentional IRS quirk.
  marriedSeparate: [
    { rate: 0.10, over: 0 },
    { rate: 0.12, over: 12_400 },
    { rate: 0.22, over: 50_400 },
    { rate: 0.24, over: 105_700 },
    { rate: 0.32, over: 201_775 },
    { rate: 0.35, over: 256_225 },
    { rate: 0.37, over: 384_350 },
  ],
  // The 35% bracket starts at $256,200 - NOT the single filer's $256,225.
  // Faithful to Rev. Proc. 2025-32; don't "fix" the 25-dollar difference.
  headOfHousehold: [
    { rate: 0.10, over: 0 },
    { rate: 0.12, over: 17_700 },
    { rate: 0.22, over: 67_450 },
    { rate: 0.24, over: 105_700 },
    { rate: 0.32, over: 201_775 },
    { rate: 0.35, over: 256_200 },
    { rate: 0.37, over: 640_600 },
  ],
};

export const FEDERAL_STANDARD_DEDUCTION_2026: Record<FilingStatus, number> = {
  single: 16_100,
  marriedJoint: 32_200,
  marriedSeparate: 16_100,
  headOfHousehold: 24_150,
};

/** Employee-side FICA constants for 2026. */
export const FICA_2026 = {
  socialSecurityRate: 0.062,
  /** 2026 Social Security taxable wage base (SSA). */
  socialSecurityWageBase: 184_500,
  medicareRate: 0.0145,
  /** Additional Medicare Tax rate on wages above the filing-status threshold. */
  additionalMedicareRate: 0.009,
  /** Not inflation-indexed - fixed in statute since 2013. */
  additionalMedicareThreshold: {
    single: 200_000,
    marriedJoint: 250_000,
    marriedSeparate: 125_000,
    headOfHousehold: 200_000,
  } as Record<FilingStatus, number>,
} as const;
