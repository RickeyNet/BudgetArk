/**
 * BudgetArk - Lesson route parsing
 * File: src/utils/lessonRoutes.ts
 *
 * A lesson's "Open the calculator" CTA carries a free-form route string.
 * Routes into the Charts tab must name WHICH calculator to open, because
 * the lesson modal already sits on top of that tab: a bare "charts" route
 * can only close the lesson, which reads as a dead button. This is the pure
 * half of that wiring (ChartsScreen owns the open + scroll side effects) so
 * the route contract can be tested against every authored lesson.
 */

/** Calculators on the Charts tab that a lesson can open directly. */
export const CHARTS_TOOL_KEYS = [
  "compound",
  "loan",
  "refinance",
  "emergency-fund",
] as const;

export type ChartsToolKey = (typeof CHARTS_TOOL_KEYS)[number];

/**
 * "charts/tools/<key>" → the tool key. Anything else (a bare "charts", an
 * unknown key, extra segments) returns null - fail closed, so a typo in a
 * lesson file is caught by the lesson-route test rather than opening the
 * wrong calculator.
 */
export const parseChartsToolRoute = (route: string): ChartsToolKey | null => {
  const parts = route.split("/");
  if (parts.length !== 3 || parts[0] !== "charts" || parts[1] !== "tools") {
    return null;
  }
  const key = parts[2];
  return (CHARTS_TOOL_KEYS as readonly string[]).includes(key)
    ? (key as ChartsToolKey)
    : null;
};
