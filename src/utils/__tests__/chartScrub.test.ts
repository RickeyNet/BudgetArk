/**
 * BudgetArk - chartScrub tests
 * File: src/utils/__tests__/chartScrub.test.ts
 *
 * Pins the finger-to-point mapping the Bridge net worth chart relies on:
 * nearest point wins, edges clamp, degenerate inputs never throw.
 */

import { scrubIndexForX } from "../chartScrub";

const PAD_L = 50;
const INNER = 200; // 5 points -> spaced 50px apart at x = 50, 100, 150, 200, 250

describe("scrubIndexForX", () => {
  it("maps a touch to the nearest evenly spaced point", () => {
    expect(scrubIndexForX(50, INNER, 5, PAD_L)).toBe(0);
    expect(scrubIndexForX(100, INNER, 5, PAD_L)).toBe(1);
    expect(scrubIndexForX(124, INNER, 5, PAD_L)).toBe(1);
    expect(scrubIndexForX(126, INNER, 5, PAD_L)).toBe(2);
    expect(scrubIndexForX(250, INNER, 5, PAD_L)).toBe(4);
  });

  it("clamps a drag past either edge to the first or last point", () => {
    expect(scrubIndexForX(-500, INNER, 5, PAD_L)).toBe(0);
    expect(scrubIndexForX(10, INNER, 5, PAD_L)).toBe(0);
    expect(scrubIndexForX(900, INNER, 5, PAD_L)).toBe(4);
  });

  it("returns 0 for a single point, no points, or a zero-width chart", () => {
    expect(scrubIndexForX(120, INNER, 1, PAD_L)).toBe(0);
    expect(scrubIndexForX(120, INNER, 0, PAD_L)).toBe(0);
    expect(scrubIndexForX(120, 0, 5, PAD_L)).toBe(4); // width guard: no division by zero, clamps
  });
});
