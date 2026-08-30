import {
  calcBracketTax,
  calcFederalTax,
  calcFICA,
  calcStateTax,
  calcTakeHome,
  marginalRateFor,
} from "../taxCalc";
import { FEDERAL_BRACKETS_2026 } from "../../data/taxData2026";
import { findStateTax, STATE_TAX_2026 } from "../../data/stateTaxData2026";

describe("calcFederalTax (2026 tables)", () => {
  it("computes marginal tax for a single filer", () => {
    // 10% of 12,400 + 12% of 38,000 + 22% of 49,600
    expect(calcFederalTax(100_000, "single")).toBeCloseTo(16_712, 2);
  });

  it("computes marginal tax for married filing jointly", () => {
    // 10% of 24,800 + 12% of 76,000 + 22% of 99,200
    expect(calcFederalTax(200_000, "marriedJoint")).toBeCloseTo(33_424, 2);
  });

  it("zero or negative taxable income owes nothing", () => {
    expect(calcFederalTax(0, "single")).toBe(0);
    expect(calcFederalTax(-500, "single")).toBe(0);
  });

  it("MFS hits the 37% bracket at $384,350 while single is still at 35%", () => {
    expect(marginalRateFor(400_000, FEDERAL_BRACKETS_2026.marriedSeparate)).toBe(0.37);
    expect(marginalRateFor(400_000, FEDERAL_BRACKETS_2026.single)).toBe(0.35);
  });

  it("keeps the head-of-household $256,200 quirk (not the single $256,225)", () => {
    expect(marginalRateFor(256_210, FEDERAL_BRACKETS_2026.headOfHousehold)).toBe(0.35);
    expect(marginalRateFor(256_210, FEDERAL_BRACKETS_2026.single)).toBe(0.32);
  });

  it("reports a 0% marginal rate at zero taxable income (below the deduction)", () => {
    expect(marginalRateFor(0, FEDERAL_BRACKETS_2026.single)).toBe(0);
    // A $10k salary sits under the standard deduction: no tax, and the next
    // dollar earned is still deduction-covered - marginal must read 0%.
    const r = calcTakeHome({
      grossAnnual: 10_000,
      status: "single",
      stateCode: "TX",
      retirement401kPercent: 0,
      hsaAnnual: 0,
      healthPremiumMonthly: 0,
      payPeriodsPerYear: 26,
    });
    expect(r.federalTax).toBe(0);
    expect(r.marginalFederalRate).toBe(0);
  });

  it("clamps absurd and non-finite inputs instead of throwing", () => {
    // Non-finite fails safe to 0; huge finite values clamp to the $1B cap.
    expect(calcBracketTax(NaN, FEDERAL_BRACKETS_2026.single)).toBe(0);
    expect(calcBracketTax(Infinity, FEDERAL_BRACKETS_2026.single)).toBe(0);
    expect(calcBracketTax(1e15, FEDERAL_BRACKETS_2026.single)).toBe(
      calcBracketTax(1_000_000_000, FEDERAL_BRACKETS_2026.single)
    );
  });
});

describe("calcFICA (2026)", () => {
  it("caps Social Security at the $184,500 wage base", () => {
    const fica = calcFICA(300_000, "single");
    expect(fica.socialSecurity).toBeCloseTo(184_500 * 0.062, 2);
    expect(fica.medicare).toBeCloseTo(300_000 * 0.0145, 2);
    expect(fica.additionalMedicare).toBeCloseTo(100_000 * 0.009, 2);
  });

  it("charges no Additional Medicare at or below the threshold", () => {
    expect(calcFICA(200_000, "single").additionalMedicare).toBe(0);
    // MFS threshold is $125,000 - the same wages DO owe it there.
    expect(calcFICA(200_000, "marriedSeparate").additionalMedicare).toBeCloseTo(675, 2);
  });

  it("totals the three components", () => {
    const fica = calcFICA(60_000, "single");
    expect(fica.total).toBeCloseTo(60_000 * 0.062 + 60_000 * 0.0145, 2);
  });
});

describe("calcStateTax", () => {
  it("returns 0 for no-income-tax states and unknown codes", () => {
    expect(calcStateTax(100_000, findStateTax("TX"), "single")).toBe(0);
    expect(calcStateTax(100_000, findStateTax("WA"), "single")).toBe(0);
    expect(calcStateTax(100_000, undefined, "single")).toBe(0);
  });

  it("applies a flat rate with no deduction (PA)", () => {
    expect(calcStateTax(100_000, findStateTax("PA"), "single")).toBeCloseTo(3_070, 2);
  });

  it("applies a flat rate after the standard deduction (CO)", () => {
    expect(calcStateTax(100_000, findStateTax("CO"), "single")).toBeCloseTo(
      (100_000 - 16_100) * 0.044,
      2
    );
  });

  it("computes progressive brackets after the deduction (CA single)", () => {
    expect(calcStateTax(100_000, findStateTax("CA"), "single")).toBeCloseTo(5_223.42, 1);
  });

  it("doubles progressive thresholds for married filing jointly", () => {
    const single = calcStateTax(100_000, findStateTax("CA"), "single");
    const joint = calcStateTax(100_000, findStateTax("CA"), "marriedJoint");
    expect(joint).toBeLessThan(single);
    expect(joint).toBeGreaterThan(0);
  });

  it("floors Utah's taxpayer credit at zero", () => {
    expect(calcStateTax(30_000, findStateTax("UT"), "single")).toBeCloseTo(
      30_000 * 0.045 - 966,
      2
    );
    expect(calcStateTax(20_000, findStateTax("UT"), "single")).toBe(0);
  });

  it("honors zero-rate bottom brackets (OH below $26,050; MO after deduction)", () => {
    expect(calcStateTax(26_050, findStateTax("OH"), "single")).toBe(0);
    expect(calcStateTax(50_000, findStateTax("OH"), "single")).toBeCloseTo(658.63, 2);
    // 17,000 - 16,100 federal-matched deduction = 900, inside MO's 0% bracket.
    expect(calcStateTax(17_000, findStateTax("MO"), "single")).toBe(0);
  });
});

describe("state data table sanity", () => {
  it("covers all 50 states plus DC exactly once", () => {
    expect(STATE_TAX_2026).toHaveLength(51);
    expect(new Set(STATE_TAX_2026.map((s) => s.code)).size).toBe(51);
  });

  it("every progressive table starts at $0 and ascends", () => {
    for (const state of STATE_TAX_2026) {
      if (state.type !== "progressive") continue;
      const brackets = state.brackets ?? [];
      expect(brackets.length).toBeGreaterThan(0);
      expect(brackets[0].over).toBe(0);
      for (let i = 1; i < brackets.length; i++) {
        expect(brackets[i].over).toBeGreaterThan(brackets[i - 1].over);
        expect(brackets[i].rate).toBeGreaterThan(brackets[i - 1].rate);
      }
    }
  });

  it("every flat state carries a sane rate", () => {
    for (const state of STATE_TAX_2026) {
      if (state.type !== "flat") continue;
      expect(state.rate).toBeGreaterThan(0);
      expect(state.rate).toBeLessThan(0.15);
    }
  });
});

describe("calcTakeHome", () => {
  const base = {
    grossAnnual: 60_000,
    status: "single" as const,
    stateCode: "TX",
    retirement401kPercent: 0,
    hsaAnnual: 0,
    healthPremiumMonthly: 0,
    payPeriodsPerYear: 26,
  };

  it("computes the no-deduction Texas baseline", () => {
    const r = calcTakeHome(base);
    expect(r.federalTaxable).toBe(43_900);
    expect(r.federalTax).toBeCloseTo(5_020, 2);
    expect(r.stateTax).toBe(0);
    expect(r.fica.total).toBeCloseTo(4_590, 2);
    expect(r.takeHomeAnnual).toBeCloseTo(50_390, 2);
    expect(r.takeHomePerPeriod).toBeCloseTo(1_938.08, 2);
    expect(r.marginalFederalRate).toBe(0.12);
    expect(r.effectiveRate).toBeCloseTo(9_610 / 60_000, 6);
  });

  it("401(k) reduces income tax bases but NOT FICA wages", () => {
    const r = calcTakeHome({ ...base, grossAnnual: 100_000, retirement401kPercent: 10 });
    expect(r.pretax401k).toBe(10_000);
    expect(r.federalTaxable).toBe(100_000 - 10_000 - 16_100);
    // FICA still on the full gross.
    expect(r.fica.socialSecurity).toBeCloseTo(100_000 * 0.062, 2);
  });

  it("cafeteria deductions (HSA + premiums) reduce FICA wages too", () => {
    const r = calcTakeHome({
      ...base,
      grossAnnual: 100_000,
      hsaAnnual: 2_000,
      healthPremiumMonthly: 200,
    });
    expect(r.pretaxCafeteria).toBe(4_400);
    expect(r.fica.socialSecurity).toBeCloseTo(95_600 * 0.062, 2);
    expect(r.federalTaxable).toBe(100_000 - 4_400 - 16_100);
  });

  it("clamps hostile inputs instead of producing NaN", () => {
    const r = calcTakeHome({
      ...base,
      grossAnnual: NaN,
      retirement401kPercent: 150,
      hsaAnnual: -50,
      payPeriodsPerYear: 0,
    });
    expect(r.takeHomeAnnual).toBe(0);
    expect(r.effectiveRate).toBe(0);
    expect(Number.isFinite(r.takeHomePerPeriod)).toBe(true);
  });

  it("pre-tax deductions can never exceed gross", () => {
    const r = calcTakeHome({
      ...base,
      grossAnnual: 10_000,
      retirement401kPercent: 100,
      hsaAnnual: 5_000,
    });
    expect(r.pretax401k).toBe(10_000);
    expect(r.pretaxCafeteria).toBe(0);
    expect(r.takeHomeAnnual).toBe(0);
  });
});
