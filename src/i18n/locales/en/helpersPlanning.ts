/**
 * BudgetArk - English strings: pure helpers (planning)
 * File: src/i18n/locales/en/helpersPlanning.ts
 *
 * Covers: purchasePlanner, whatIfSpending, calculations, debtTrackerMath
 * milestones, savingsInterest, trackingStrip, bridgeMath, exchangeCalculator,
 * annualReport (planning + Bridge helper sentences). Read from plain modules
 * via src/i18n/translate.ts. Milestone ids (keel, hull, deck, supplies,
 * gather_animals, moorings, sail) are persisted keys - only their display
 * text lives here.
 */

export const helpersPlanning = {
  /** Build Your Ark steps: display text keyed by milestone id (debtTrackerMath). */
  milestones: {
    steps: {
      keel: {
        title: "Keel",
        description: "Save a starter emergency fund so your plan has a stable base.",
        nextAction: "Set aside your first cushion target before pushing harder elsewhere.",
      },
      hull: {
        title: "Hull",
        description: "Pay off all debt except the house using the debt snowball.",
        nextAction:
          "Apply your next extra payment to the first debt in your chosen payoff order.",
      },
      deck: {
        title: "Deck",
        description:
          "Save 3 to 6 months of living expenses for a fully funded emergency fund.",
        nextAction: "Grow your reserves toward 3-6 months of essentials for stability.",
      },
      supplies: {
        title: "Supplies",
        description: "Invest 15% of household income for retirement.",
        nextAction: "Increase retirement contributions toward 15% of household income.",
      },
      gather_animals: {
        title: "Gather Animals",
        description: "Save for your children’s college education.",
        nextAction: "Open or contribute to a 529 plan or education savings account.",
      },
      moorings: {
        title: "Moorings",
        description: "Pay off your home early with extra principal payments.",
        nextAction: "Make extra principal payments on your mortgage when possible.",
      },
      sail: {
        title: "Sail",
        description: "Build wealth and give generously.",
        nextAction: "Live generously, invest beyond retirement, and build lasting wealth.",
      },
    },
    metric: {
      ratio: "{{current}} / {{target}}",
      ratioMonthly: "{{current}} / {{target}} /mo",
      remaining: "{{amount}} remaining",
      addEducationGoal: "Add an education savings goal to track",
      noMortgage: "No mortgage debt tracked",
      targetMonthly: "Target: {{amount}} /mo",
      completed: "Completed",
      notStarted: "Not started",
    },
  },
  /** Ark guidance on the purchase planner (purchasePlanner.buildArkPurchaseGuidance). */
  ark: {
    noPlan:
      "A sinking fund sets money aside every month so the purchase is paid in cash - it never has to become debt.",
    stepComplete:
      "Your {{step}} step is complete - setting cash aside for this purchase won't knock the Ark off course. Keep the monthly amount inside your free cash flow and pay cash.",
    steps: {
      keel: "You're building your Keel - the starter emergency fund. Fund that first: without a cushion, one surprise expense turns this purchase into new debt. Keep this set-aside small, or park the plan until the Keel is done.",
      hull: "You're on the Hull step - paying off debt. A sinking fund beats financing, but every dollar set aside here is a dollar not knocking down a balance. Check the debt trade-off below and lean toward needs over wants.",
      deck: "You're building the Deck - your full 3-6 month emergency fund. Saving for a purchase alongside it is fine; just keep the emergency fund the bigger slice until it's topped up.",
      supplies:
        "You're past the survival steps of your Ark - a sinking fund is exactly the right tool. Keep your 15% retirement investing first, set this aside from what's left, and pay cash.",
      gather_animals:
        "Your Ark is well underway - set the money aside monthly and pay cash so this purchase never becomes debt. Keep your education savings on pace alongside it.",
      moorings:
        "Your Ark is nearly built - a sinking fund keeps this purchase from touching your mortgage-payoff momentum. Set it aside monthly and pay cash.",
      sail: "You're sailing - buying with cash you set aside on purpose is exactly how this stays a wealth-building habit rather than a setback.",
    },
  },
  /** purchasePlanner.describeHoursOfWork */
  hoursOfWork: {
    underAnHour: "under an hour of work",
    hours_one: "{{count}} hour of work",
    hours_other: "{{count}} hours of work",
    withWeeks_one: "{{base}} - about {{count}} week",
    withWeeks_other: "{{base}} - about {{count}} weeks",
  },
  /** purchasePlanner.describeDebtOpportunityCost */
  debtOpportunity: {
    lead: "{{amount}}/mo on {{debt}} instead",
    neverClears: "{{lead}} would turn a debt its minimum never clears into one that does.",
    sameMonthInterest:
      "{{lead}} would save {{interest}} in interest, though it clears the same month.",
    barelyMoves: "{{lead}} would barely move it - this plan costs you almost nothing there.",
    soonerWithInterest: "{{lead}} would clear it {{months}} and save {{interest}} in interest.",
    sooner: "{{lead}} would clear it {{months}}.",
    monthsSooner_one: "{{count}} month sooner",
    monthsSooner_other: "{{count}} months sooner",
  },
  /** purchasePlanner.describeCostPerUse */
  costPerUse: {
    cents: "{{cents}}¢",
    sentence_one: "about {{cost}} per use ({{uses}}x a month for {{count}} year)",
    sentence_other: "about {{cost}} per use ({{uses}}x a month for {{count}} years)",
  },
  /** calculations.describeUnsolvablePayoff */
  unsolvable: {
    capped:
      "Minimum payments barely outpace interest - clearing these would take over {{years}} years. Add an extra payment to make it solvable.",
    noMinimum:
      "{{name}} has no minimum payment logged, so it never shrinks. Set its minimum or add an extra payment.",
    underwater:
      "{{name}}'s {{minimum}} minimum doesn't cover its ~{{interest}}/mo interest, so it never shrinks. Raise its minimum or add an extra payment.",
    several:
      "{{names}}: their minimum payments don't cover their monthly interest, so they never shrink. Raise those minimums or add an extra payment.",
  },
  /** savingsInterest.describeApy / describeApyGap */
  apy: {
    line: "{{apy}} APY · ~{{amount}}/yr",
    gap: "A typical {{apy}} high-yield account would add about {{amount}}/yr",
  },
  /** trackingStrip.describeDaysSince */
  daysSince: {
    none: "nothing logged yet",
    today: "logged today",
    yesterday: "last entry yesterday",
    daysAgo: "last entry {{days}} days ago",
  },
  /** bridgeMath.formatNextQuoteRefresh */
  nextQuote: {
    hours: "Next update in {{hours}}h",
    days: "Next update in {{days}}d",
  },
  /** exchangeCalculator.describeRatesSnapshot */
  rates: {
    static: "Built-in approximate rates - couldn't reach the rate service",
    justNow: "Rates updated just now",
    minutesAgo_one: "Rates updated {{count}} minute ago",
    minutesAgo_other: "Rates updated {{count}} minutes ago",
    hoursAgo_one: "Rates updated {{count}} hour ago",
    hoursAgo_other: "Rates updated {{count}} hours ago",
    daysAgo_one: "Rates updated {{count}} day ago",
    daysAgo_other: "Rates updated {{count}} days ago",
  },
  /** annualReport.formatAnnualReportShareText (aggregates only - no PII). */
  annualReport: {
    title: "⚓ My {{year}} BudgetArk Report",
    debtPaid: "💳 Debt paid: {{amount}}",
    setAside: "🐖 Set aside: {{amount}}",
    netWorth: "📈 Net worth: {{amount}}",
    savingsRate: "💰 Savings rate: {{rate}}%",
    monthsUnderBudget: "🎯 Months under budget: {{under}}/{{total}}",
    topCategory: "🏷️ Top category: {{category}}",
    footer: "Tracked offline with BudgetArk.",
  },
} as const;
