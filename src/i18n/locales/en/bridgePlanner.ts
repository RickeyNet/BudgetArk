/**
 * BudgetArk - English strings: Bridge tab (planner)
 * File: src/i18n/locales/en/bridgePlanner.ts
 *
 * Covers: PurchasePlanList.tsx (purchase planner / sinking funds) + SliderRow, PurchasePlanChart.
 * Ranking-method and allocation-mode labels are keyed by the ids from
 * utils/purchasePlanner (PLAN_PRIORITY_METHODS / PLAN_ALLOCATION_MODES).
 */

export const bridgePlanner = {
  summary: {
    saved: "SAVED",
    stillToGo: "STILL TO GO",
    total: "TOTAL",
    plans_one: "{{count}} plan",
    plans_other: "{{count}} plans",
    funded: " · {{count}} funded",
    allFundedNow: " · all funded",
    allFundedBy: " · all funded by {{date}}",
    notFundedInHorizon: " · not all funded within 20 years at this pace",
    setAmountToSee: " · set a monthly amount below to see when",
    late_one: "{{count}} plan would miss its need-by date at this pace.",
    late_other: "{{count}} plans would miss their need-by date at this pace.",
  },
  order: {
    label: "ORDER",
    methods: {
      snowball: "Smallest first",
      soonest: "Soonest needed",
      custom: "My order",
    },
    hints: {
      snowball: "Finish the cheapest plans first for quick wins - the snowball.",
      soonest: "Plans with the nearest need-by date come first; undated ones after.",
      custom: "Rank them yourself with the arrows on each plan.",
    },
  },
  setAside: {
    label: "Set aside for all plans",
    perMonth: "{{amount}}/mo",
    chartNow: "Now",
  },
  fit: {
    trackFirst: "Track a full month of income and spending and this will say whether the amount fits.",
    fits: "Fits: about {{amount}}/mo is free after your average spending.",
    tight: "Tight: this takes most of the ~{{amount}}/mo free after your average spending.",
    over: "Over: more than the ~{{amount}}/mo free after your average spending.",
    overNoFreeCash: "Over: your average spending already exceeds your income, so any set-aside comes from somewhere else.",
  },
  allocation: {
    modes: {
      rollover: "One at a time",
      parallel: "Split evenly",
    },
    hints: {
      rollover: "The whole amount goes to the first plan; when it's funded, the money rolls into the next - like a debt snowball.",
      parallel: "The amount is split evenly across every unfunded plan, and a finished plan's share moves to the rest.",
    },
  },
  row: {
    a11yAddFunds: "Add funds to {{name}}",
    fundedMeta: "Funded - ready to buy 🎉",
    progressMeta: "{{current}} of {{target}}",
    requiredSuffix: " · {{amount}}/mo to hit {{date}}",
    ready: "Ready {{date}}",
    monthlyNow: " · {{amount}}/mo now",
    waitsTurn: " · waits its turn",
    misses: " · misses {{date}}",
    lateFor_one: " · {{count}} mo late for {{date}}",
    lateFor_other: " · {{count}} mo late for {{date}}",
    itsDate: "its date",
    notFundedInHorizon: "Not funded within 20 years at this pace",
    moveUp: "Move {{name}} up",
    moveDown: "Move {{name}} down",
  },
  nudges: {
    makesItHappen: "makes it happen",
    sooner_one: "{{count}} mo sooner",
    sooner_other: "{{count}} mo sooner",
    extraMonthlyA11y: "Add {{amount}} a month to all plans",
    extraMonthly: "+{{amount}}/mo · {{sooner}}",
    lumpSumA11y: "Add {{amount}} to {{name}} now",
    finishIt: "Finish it: {{amount}} now",
    lumpSumNow: "+{{amount}} now · {{sooner}}",
  },
  contribute: {
    savedOf: "{{current}} of {{target}} saved.",
    amountPlaceholder: "Amount to add",
    negativeHint: "Use a negative amount to correct a mistake.",
    costPerUseLabel: "COST PER USE (OPTIONAL)",
    usesPlaceholder: "Uses per month",
    yearsPlaceholder: "Years you'll keep it",
    costPerUseHint: "How often you'll use it, and for how long, turns the price into a cost per use.",
    deleteLink: "Delete this plan",
  },
  errors: {
    reorder: "Couldn't save the new order.",
    save: "Couldn't save this plan.",
    delete: "Couldn't delete this plan.",
  },
  deleteDialog: {
    title: "Delete plan?",
    message: "\"{{name}}\" and its {{amount}} saved-so-far record will be removed. The money itself stays wherever you keep it.",
    keep: "Keep it",
  },
} as const;
