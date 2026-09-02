/**
 * BudgetArk - Unusual Charge Flag Tests
 * File: src/utils/__tests__/unusualCharges.test.ts
 */

import { makeBudgetEntry, makePendingTransaction } from "../../__tests__/fixtures";
import {
  buildMerchantHistory,
  describeUnusualCharge,
  FIRST_TIME_LARGE_AMOUNT,
  flagUnusualCharge,
  flagUnusualCharges,
  UNUSUAL_MIN_HISTORY,
} from "../unusualCharges";

const money = (n: number) => `$${n.toFixed(2)}`;

const past = (merchant: string, amounts: number[]) =>
  amounts.map((amount, i) =>
    makeBudgetEntry({ id: `${merchant}-${i}`, merchant, amount, source: "bank" }),
  );

describe("buildMerchantHistory", () => {
  it("collects live, non-recurring expense amounts per merchant", () => {
    const history = buildMerchantHistory([
      ...past("A", [10, 20]),
      makeBudgetEntry({ id: "del", merchant: "A", amount: 99, deletedAt: "2026-01-01" }),
      makeBudgetEntry({ id: "bill", merchant: "A", amount: 99, recurring: true }),
      makeBudgetEntry({ id: "inc", merchant: "A", amount: 99, type: "income" }),
      makeBudgetEntry({ id: "manual", amount: 99 }),
    ]);
    expect(history.get("A")).toEqual([10, 20]);
    expect(history.size).toBe(1);
  });
});

describe("flagUnusualCharge", () => {
  const history = new Map<string, number[]>([
    ["COFFEE", [4, 4.5, 5, 4]],
    ["GAS", [40, 45, 42]],
    ["NEW", []],
    ["THIN", [40, 45]],
  ]);

  it("flags a charge at least 2× the usual and $25 over it", () => {
    expect(flagUnusualCharge(makePendingTransaction({ merchant: "GAS", amount: -120 }), history)).toEqual({
      kind: "above-usual",
      usual: 42,
      ratio: 2.9,
    });
    // 2× but under the $25 floor.
    expect(flagUnusualCharge(makePendingTransaction({ merchant: "COFFEE", amount: -9 }), history)).toBeNull();
    // Big delta but under 2×.
    expect(flagUnusualCharge(makePendingTransaction({ merchant: "GAS", amount: -80 }), history)).toBeNull();
  });

  it("needs enough history before 'usual' means anything", () => {
    expect(UNUSUAL_MIN_HISTORY).toBe(3);
    expect(flagUnusualCharge(makePendingTransaction({ merchant: "THIN", amount: -500 }), history)).toBeNull();
  });

  it("flags a large first-ever charge, not a small one", () => {
    expect(
      flagUnusualCharge(
        makePendingTransaction({ merchant: "UNKNOWN", amount: -FIRST_TIME_LARGE_AMOUNT }),
        history,
      ),
    ).toEqual({ kind: "first-time", amount: FIRST_TIME_LARGE_AMOUNT });
    expect(
      flagUnusualCharge(makePendingTransaction({ merchant: "UNKNOWN", amount: -50 }), history),
    ).toBeNull();
  });

  it("never flags inflows, likely transfers, likely duplicates, or blank merchants", () => {
    expect(flagUnusualCharge(makePendingTransaction({ merchant: "GAS", amount: 500 }), history)).toBeNull();
    expect(
      flagUnusualCharge(makePendingTransaction({ merchant: "GAS", amount: -500, transferLikely: true }), history),
    ).toBeNull();
    expect(
      flagUnusualCharge(makePendingTransaction({ merchant: "GAS", amount: -500, duplicateLikely: true }), history),
    ).toBeNull();
    expect(flagUnusualCharge(makePendingTransaction({ merchant: "", amount: -500 }), history)).toBeNull();
  });
});

describe("flagUnusualCharges / describeUnusualCharge", () => {
  it("keys flags by pending id and describes them", () => {
    const entries = past("GAS", [40, 45, 42]);
    const items = [
      makePendingTransaction({ id: "big", merchant: "GAS", amount: -120 }),
      makePendingTransaction({ id: "fine", merchant: "GAS", amount: -44 }),
      makePendingTransaction({ id: "first", merchant: "JEWELER", amount: -900 }),
    ];
    const flags = flagUnusualCharges(items, entries);
    expect([...flags.keys()].sort()).toEqual(["big", "first"]);
    expect(describeUnusualCharge(flags.get("big")!, money)).toBe("2.9× the usual $42.00 - worth a look");
    expect(describeUnusualCharge(flags.get("first")!, money)).toBe(
      "First charge from this merchant - worth a look",
    );
  });
});
