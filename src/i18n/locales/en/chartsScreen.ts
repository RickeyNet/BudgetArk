/**
 * BudgetArk - English strings: Charts tab (screen)
 * File: src/i18n/locales/en/chartsScreen.ts
 *
 * Covers: ChartsScreen.tsx (tab shell: Captain's Course hub, topic chips,
 * the tools section header, and the three calculators that live inline in
 * the screen - compound interest, refinance break-even, emergency fund).
 * Lesson / chapter titles and the learning disclaimer come from src/data
 * and stay English (Phase 4 content). Topic labels, slider labels and rate
 * presets are keyed by their ids.
 */

export const chartsScreen = {
  header: {
    title: "Charts",
    subtitle: "Learn the seas. Plot your course.",
  },
  course: {
    eyebrow: "⭐ CAPTAIN'S COURSE",
    startHere: "START HERE",
    resume: "RESUME",
    chapterRef: "Ch {{number}} · {{title}}",
    readMin: " · {{count}} min",
    lessonReadMin: "{{count}} min",
    filterOnly: "{{glyph}} {{topic}} lessons only",
    showAll: "Show all ✕",
    comingSoon: "Coming soon",
  },
  topics: {
    sectionTitle: "TOPICS",
    hint: "Tap to filter the course by subject",
    labels: {
      budgeting: "Budgeting",
      debt: "Debt",
      saving: "Saving",
      investing: "Investing",
      taxes: "Taxes",
      insurance: "Insurance",
      real_estate: "Real Estate",
      retirement: "Retirement",
      mindset: "Mindset",
    },
  },
  tools: {
    sectionTitle: "TOOLS",
    hint: "Calculators & utilities",
  },
  units: {
    percent: "{{value}}%",
    years: "{{value}} yr",
    yearPreset: "{{count}}yr",
  },
  compound: {
    title: "Compound Interest Calculator",
    hint: "Project your investment growth over time",
    projectedValue: "PROJECTED VALUE",
    subLump: "{{lump}} now + {{monthly}}/mo · after {{years}} years at {{rate}}%",
    subPlain: "in today's dollars · after {{years}} years at {{rate}}%",
    sliders: {
      lumpSum: "Starting Lump Sum",
      contribution: "Monthly Contribution",
      returnRate: "Annual Return",
      years: "Time Horizon",
    },
    presets: {
      savings: "Savings",
      bonds: "Bonds",
      sp500: "S&P 500",
      aggressive: "Aggressive",
    },
    comparison: {
      title: "Lump Sum vs. Monthly",
      once: "{{amount}} once",
      perMonth: "{{amount}}/mo",
      both: "Both",
      crossover:
        "The monthly plan overtakes the lump sum in year {{year}} - but it also puts in {{putIn}} against {{lump}}. Doing both is the real win.",
      noCrossover:
        "Over {{years}} years the lump sum stays ahead of the monthly plan on its own. Doing both is the real win.",
    },
    rule72: "At {{rate}}%, your money doubles roughly every ~{{years}} years (Rule of 72)",
    whyShow: "Why 7%?",
    whyHide: "Hide: Why 7%?",
    why: {
      title: "S&P 500 and Inflation",
      p1: "The S&P 500 is an index of the 500 largest US companies. It has returned an average of ~10% per year since 1926.",
      p2: "However, inflation (the rising cost of goods) historically averages ~3% per year. That means $100 today buys less in the future.",
      p3: "When we subtract inflation (10% - 3%), the real return is about 7%. This calculator uses inflation-adjusted returns by default, so the projected value represents what your money can actually buy in today's dollars.",
      footer: "Past performance does not guarantee future results. Actual returns vary year to year.",
    },
    chart: {
      title: "Growth Over Time",
      totalValue: "Total Value",
      contributions: "Contributions",
      axisYear: "{{count}}yr",
    },
    breakdown: {
      title: "Breakdown",
      putIn: "You Put In",
      contribute: "You Contribute",
      interest: "Interest Earned",
      ratio: "Your money earned {{percent}}% more through compound interest",
    },
  },
  refi: {
    title: "Refinance Break-Even Calculator",
    hint: "See if refinancing actually saves you money",
    breakEven: "BREAK-EVEN",
    pickOne: "Pick at least one debt below to see the comparison.",
    months: "{{count}} mo",
    recoverYears: "~{{years}} years to recover {{amount}} in closing costs",
    recoverUnderYear: "{{amount}} in closing costs recovered in under a year",
    noBreakEven: "New payment isn't lower than current - no break-even.",
    currentLoan: "CURRENT LOAN",
    pickDebts: "Pick the debts you want to refinance",
    noDebts: "Add a debt in the Debt Tracker to use this calculator.",
    debtMeta: "{{balance}} · {{rate}}% APR",
    goalSet: " · goal set",
    summaryTitle: "CURRENT LOAN SUMMARY",
    combinedBalance: "Combined balance",
    apr: "APR",
    weightedApr: "Weighted APR",
    selected: "{{selected}} of {{total}} debts selected",
    weightedByBalance: " · weighted by balance",
    autoFilledHint:
      "Years remaining auto-filled from each debt's goal date. Adjust freely if the goal dates aren't exact.",
    setGoalHint: "Set a goal date on each debt in the tracker to auto-fill years remaining.",
    newLoan: "NEW LOAN",
    sliders: {
      refiCurrentTerm: "Years Remaining",
      refiNewRate: "New Rate (APR)",
      refiNewTerm: "New Term (years)",
      refiClosingCosts: "Closing Costs",
    },
    monthlyPayment: "Monthly Payment",
    current: "Current",
    new: "New",
    savesPerMonth: "Saves {{amount}}/mo",
    costsPerMonth: "Costs {{amount}}/mo more",
    samePayment: "Same monthly payment",
    lifetimeInterest: "Lifetime Interest",
    keepCurrent: "Keep current",
    refinance: "Refinance",
    savesLifetime: "Saves {{amount}} over the life of the loan",
    paysMore: "Pays {{amount}} more in interest overall",
    sameLifetime: "Same lifetime interest",
    netSavings: "Net savings over the new {{years}}-year term: ",
    extendsWarning:
      "Heads up: the new term is longer than what's left on your current loan. Lower monthly payments here partly come from spreading the balance over more months - check the lifetime interest above to see if that trade-off is worth it.",
  },
  ef: {
    title: "Emergency Fund Calculator",
    hint: "Track your safety net progress",
    expensesTitle: "Your Monthly Expenses",
    basedOn: "Based on your budget: {{amount}}/mo average",
    noData: "No budget data yet - enter your monthly expenses below",
    placeholder: "Monthly expenses",
    threeMonth: "3-Month Fund",
    sixMonth: "6-Month Fund",
    saved: "{{amount}} saved",
    monthsToReach_one: "~{{count}} month to reach at {{amount}}/mo",
    monthsToReach_other: "~{{count}} months to reach at {{amount}}/mo",
    threeReached: "3-month fund reached!",
    sixReached: "6-month fund reached!",
    monthlySavings: "Monthly Savings",
    note: "A common target is 3-6 months of living expenses in cash. That can cover job loss, medical emergencies, or unexpected repairs without new debt. Your situation may differ.",
  },
  errors: {
    loadFailed: "Couldn't load your data. Reopen this tab to try again.",
  },
} as const;
