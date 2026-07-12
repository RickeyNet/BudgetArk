/**
 * BudgetArk - Render-time change detector
 * File: src/hooks/useValueChanged.ts
 *
 * Returns true for exactly the render in which `value` differs from the
 * value seen on the previous render (compared with Object.is). Callers use
 * it to adjust dependent state during render - the React-docs "adjusting
 * state when a prop changes" pattern - instead of a synchronous setState
 * inside an effect, which would commit a stale frame and then schedule a
 * cascading second render:
 *
 *   if (useValueChanged(visible)) {
 *     if (!visible) resetForm();
 *   }
 *
 * The guarded setPrev below is what makes the render-time setState legal:
 * React re-runs the component immediately (before committing), and on the
 * re-run the comparison is false, so it settles in one pass.
 *
 * `fireOnMount` controls the very first render: false (default) means the
 * initial value counts as "already seen" - use for reset-on-change guards.
 * true means the first render reports a change too - use when replacing an
 * effect that also did work on mount (effects always run after mount).
 */
import { useState } from "react";

export const useValueChanged = <T,>(value: T, fireOnMount = false): boolean => {
  // Boxed so `null` can mean "no previous render observed" (fireOnMount)
  // without colliding with a legitimate null/undefined `value`.
  const [prev, setPrev] = useState<{ value: T } | null>(
    fireOnMount ? null : { value }
  );
  if (prev !== null && Object.is(value, prev.value)) return false;
  setPrev({ value });
  return true;
};
