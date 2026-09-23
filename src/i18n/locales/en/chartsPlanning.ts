/**
 * BudgetArk - English strings: Charts tab (planning)
 * File: src/i18n/locales/en/chartsPlanning.ts
 *
 * Covers: PurchasePlannerCard.tsx + LoanCalculatorCard.tsx. The planner
 * card's plan LIST is the shared PurchasePlanList (bridge.planner.*); the
 * keys here are the card's own form, cost analysis and Ark guidance chrome.
 * Sentences produced by utils/purchasePlanner (describeHoursOfWork,
 * describeCostPerUse, buildArkPurchaseGuidance) are interpolated as-is.
 */

export const chartsPlanning = {
  plannerCard: {
    title: "Plan a Purchase",
    hint: "Sinking funds that fit around your Ark milestones",
    yourPlans: "Your plans",
    yourPlansHint: "Tap a plan to add funds. Plans live on your Bridge and count toward net worth.",
    newPlan: "+ Plan a new purchase",
    form: {
      what: "What are you saving for?",
      namePlaceholder: "e.g. New laptop",
      price: "Price",
      alreadySaved: "Already saved",
      zeroPlaceholder: "0",
    },
    categories: {
      car: "Car",
      home: "Home",
      travel: "Travel",
      education: "Education",
      other: "Other",
      emergency_fund: "Emergency Fund",
    },
    setAside: {
      label: "Set aside each month",
    },
    needBy: {
      label: "Need it by",
      none: "No date - whenever it's funded",
      pickerTitle: "Need it by",
      required: "That date needs {{required}}/mo.",
      requiredShort: "That date needs {{required}}/mo - your current {{monthly}}/mo won't make it in time.",
    },
    timeline: {
      today: "You could buy this today",
      ready: "Ready {{date}} ({{duration}})",
      pickAmount: "Pick a monthly amount to see a date",
    },
    fit: {
      fits: "Fits comfortably: about {{amount}}/mo is left over after your average spending, and this uses half or less.",
      tight: "Tight: this claims most of the ~{{amount}}/mo left after your average spending. Doable, but there's little room for surprises.",
      over: "Over budget: this is more than the ~{{amount}}/mo left after your average spending - it WILL cut into other spending or goals. Try a smaller amount or a later date.",
      overNoFreeCash:
        "Your average spending already meets or exceeds your income, so any set-aside will cut into existing spending or goals. Consider trimming a category first (the What-If tool above can help).",
      trackFirst:
        "Log a few months of income and expenses in the Budget tab and this tool can check the pace against your real cash flow.",
    },
    cost: {
      title: "What it really costs",
      perUse: "That's {{description}}.",
      perUseHint: "How often will you use it? Slide up from zero to see the price per use - a good test for the wants column.",
      usesLabel: "Times you'll use it per month",
      notTracked: "not tracked",
      usesValue: "{{count}}x",
      years_one: "{{count}} yr",
      years_other: "{{count}} yrs",
    },
    hours: {
      title: "Hours of work",
      line: "{{price}} is {{hours}} at {{rate}}/hr take-home.",
      lineFromIncome: "{{price}} is {{hours}} at {{rate}}/hr take-home (from your average income of {{income}}/mo).",
      hint: "Log your income in the Budget tab, or type your take-home per hour below, to see this price in hours of work.",
      perWeekLabel: "Hours you work per week",
      perWeekValue: "{{count}} hrs",
      overrideLabelWithIncome: "Or type your take-home per hour (leave blank to use your income)",
      overrideLabel: "Your take-home per hour",
      overridePlaceholder: "e.g. 28.50",
    },
    finance: {
      title: "Finance it vs. save for it",
      aprLabel: "APR if you financed it",
      aprValue: "{{rate}}%",
      termChip: "{{count}} mo",
      summary:
        "Financing {{amount}} at {{rate}}% over {{months}} months: {{payment}}/mo, {{interest}} in interest ({{total}} total).",
      alreadyHave: "You already have the money - saving wins outright.",
      savingWins: "Saving instead gets it {{date}}, {{later}} later, and keeps the {{interest}}{{perMonthClause}}.",
      perMonthClause: " - about {{amount}} for every month of waiting the loan would skip",
      extraClause: " The loan payment is also {{amount}}/mo more than your set-aside, for {{months}} months.",
      pickAmount: "Pick a monthly set-aside above to compare the wait against the interest.",
      arkWarning: "A new loan while you're on the {{step}} step moves your Ark backwards - that interest is money the step needs.",
      nothingToFinance: "Nothing to finance - what you've saved already covers it.",
    },
    ark: {
      title: "Your Ark: {{step}} step",
      sinkingFund: "Sinking-fund thinking",
      tradeoff: "Trade-off: {{amount}}/mo toward your debts instead would make you debt-free {{sooner}} sooner{{interestClause}}.",
      interestClause: " and save {{amount}} in interest",
    },
    errors: {
      start: "Couldn't start this fund. Please try again.",
    },
    buttons: {
      start: "Start this fund",
    },
  },
  loan: {
    title: "Loan / Mortgage Calculator",
    hint: "See your monthly payment and total interest",
    sliders: {
      loanAmount: "Loan Amount",
      loanRate: "Interest Rate (APR)",
      loanTerm: "Loan Term",
      rateValue: "{{value}}%",
      termValue: "{{value}} yr",
      preset: "{{count}}yr",
    },
    result: {
      label: "MONTHLY PAYMENT",
      sub_one: "{{amount}} loan · {{rate}}% APR · {{count}} year",
      sub_other: "{{amount}} loan · {{rate}}% APR · {{count}} years",
    },
    breakdown: {
      title: "Cost Breakdown",
      principal: "Principal",
      totalInterest: "Total Interest",
      totalPaid_one: "You'll pay {{total}} total over {{count}} year",
      totalPaid_other: "You'll pay {{total}} total over {{count}} years",
    },
    firstFive: {
      label: "INTEREST IN FIRST 5 YEARS",
      share: "{{percent}}% of your total interest is paid in the first 60 months.",
      shortLoan: "This loan ends before year 5, so this reflects the full-term interest cost.",
      principal: "Principal paid in that span: {{amount}}",
    },
    yearly: {
      title: "Yearly Summary",
      hint: "Groups every 12 payments from the loan start. Final year may be shorter.",
      meta: "{{count}} yr",
      columns: {
        year: "Year",
        payments: "Payments",
        principal: "Principal",
        interest: "Interest",
        endBalance: "End Balance",
      },
    },
    schedule: {
      title: "Amortization Schedule",
      hint: "Month-by-month payment, principal, interest, and remaining balance.",
      meta: "{{count}} mo",
      columns: {
        month: "Month",
        payment: "Payment",
        principal: "Principal",
        interest: "Interest",
        balance: "Balance",
      },
      showing: "Showing {{visible}} of {{total}} months",
      exportCsv: "Export CSV",
      preparing: "Preparing CSV...",
      showMore: "Show {{count}} more",
      showLess: "Show less",
      exportDialogTitle: "Export Amortization Schedule",
      exportSuccess: "CSV export opened. Save or share it from the sheet.",
      exportFailed: "Loan schedule export failed.",
    },
  },
} as const;
