/**
 * BudgetArk - Chart scrub math
 * File: src/utils/chartScrub.ts
 *
 * Pure helper behind "drag a finger along the line" readouts (Bridge net
 * worth history). Kept out of the component so it can be unit tested on
 * Node: the component only maps touch x -> point index and renders.
 */

/**
 * Index of the plotted point under a finger at chart-local `x`. Points are
 * evenly spaced across `innerWidth` starting at `padLeft`, so the nearest
 * index is a rounded ratio, clamped so a drag past either edge sticks to
 * the first / last point. A single point (or none) always yields 0.
 */
export const scrubIndexForX = (
  x: number,
  innerWidth: number,
  pointCount: number,
  padLeft: number
): number => {
  if (pointCount <= 1) return 0;
  const ratio = (x - padLeft) / Math.max(innerWidth, 1);
  return Math.min(pointCount - 1, Math.max(0, Math.round(ratio * (pointCount - 1))));
};
