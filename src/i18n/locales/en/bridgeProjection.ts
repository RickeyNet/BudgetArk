/**
 * BudgetArk - English strings: Bridge tab (projection)
 * File: src/i18n/locales/en/bridgeProjection.ts
 *
 * Covers: NetWorthProjectionCard.tsx (net-worth outlook chart + goal editor).
 * The month picker it opens is the shared MonthYearPicker (datePicker.*).
 */

export const bridgeProjection = {
  title: "Where This Is Heading",
  /** "{{amount}} by {{month}}" - projected net worth at the horizon. */
  horizon: "{{amount}} by {{month}}",
  onTrack: "On track",
  offTrack: "Off track",
  chart: {
    now: "Now",
  },
  pace: {
    noHistory:
      "No budget history yet, so the line assumes nothing is added month to month - log a few months and it learns your pace.",
    tracked_one:
      "At your pace of {{signedAmount}}/mo after spending and debt minimums (last {{count}} tracked month), with debts paid down at their minimums.",
    tracked_other:
      "At your pace of {{signedAmount}}/mo after spending and debt minimums (last {{count}} tracked months), with debts paid down at their minimums.",
  },
  form: {
    targetLabel: "Target net worth",
    targetPlaceholder: "e.g. 100000",
    byEndOf: "By the end of",
    save: "Save goal",
    pickerTitle: "Reach it by the end of",
  },
  errors: {
    missingAmount: "Enter a target amount.",
    monthPassed: "Pick a month that hasn't passed.",
    notSaved: "That goal couldn't be saved.",
    saveFailed: "Couldn't save the goal.",
    removeFailed: "Couldn't remove the goal.",
  },
  goal: {
    title: "Goal: {{amount}} by {{month}}",
    projected: "Projected then: {{amount}} ({{signedGap}})",
    early: "At this pace you get there around {{month}} - early.",
    onPace: "Right on pace.",
    needsMonthly: "Needs about {{amount}}/mo to land on time",
    arrivesAround: "; at today's pace it arrives around {{month}}.",
    neverReaches: "; today's pace never reaches it.",
    set: "Set a net worth goal",
  },
  footer:
    "Solid: monthly history. Dashed: projection. Estimates, not promises - markets, raises and surprises all move the line.",
} as const;
