/**
 * BudgetArk - English strings: Charts tab (insights)
 * File: src/i18n/locales/en/chartsInsights.ts
 *
 * Covers: WhatIfSpendingCard, SubscriptionDetectiveCard, CurrencyExchangeCard, PersonalInflationCard.
 */

export const chartsInsights = {
  whatIf: {
    title: "What If I Stopped Spending on…",
    hint: "Redirect a category toward debt or savings",
    empty:
      "Log a few months of expenses in the Budget tab, then come back to see what redirecting a category could do.",
    pickCategory: "Pick a category",
    averagesHint: "Monthly averages from your last {{months}} months of entries",
    perMonth: "{{amount}}/mo",
    sliderLabel: "Monthly Amount to Redirect",
    youAverage: "You average {{amount}}/mo on {{category}}",
    towardDebt: "Put it toward debt",
    methods: {
      avalanche: "Avalanche",
      snowball: "Snowball",
    },
    currentPlan: "Current plan",
    redirecting: "Redirecting",
    months: {
      notSolvable: "Not solvable",
      zero: "0 months",
      mo: "{{count}} mo",
      yr: "{{count}} yr",
      yrMo: "{{years}} yr {{months}} mo",
    },
    unpayableFixed: "This extra payment turns an unpayable plan into a real payoff date.",
    stillUnpayable: "Minimums plus this extra still don't cover the interest - try a larger amount.",
    sooner: "Debt-free {{duration}} sooner",
    savesInterest: " · saves {{amount}} in interest",
    growSavingsOr: "…or grow it in savings",
    growSavings: "Grow it in savings",
    noDebts: "No active debts to pay down - showing savings growth only.",
    inYears_one: "In {{count}} year",
    inYears_other: "In {{count}} years",
    fromReturns: "+{{amount}} from returns",
    assumesReturn: "Assumes a {{rate}}% average annual return, compounded monthly.",
    note: "These are estimates, not guarantees - spending rarely drops to zero, and market returns vary. Even redirecting half a category can move your timeline meaningfully.",
  },
  subscriptions: {
    title: "Subscription Detective",
    hintCount: "{{count}} without a bill on file · ~{{amount}}/yr",
    hintIdle: "Find repeat charges with no bill on file",
    noBankHistory:
      "Subscriptions are found in bank-imported expenses. Connect a bank under Profile → Connections and approve a few months of charges, then come back.",
    nothingHiding:
      "Nothing hiding right now: every repeat charge already has a recurring bill, or you've marked it as not a subscription.",
    resultLabel: "WITHOUT A BILL ON FILE",
    perYear: "{{amount}}/yr",
    summary_one:
      "about {{monthly}} a month across {{count}} subscription. Make each one a bill and the budget expects it every {{cadence}} - or hide the ones that aren't subscriptions.",
    summary_other:
      "about {{monthly}} a month across {{count}} subscriptions. Make each one a bill and the budget expects it every {{cadence}} - or hide the ones that aren't subscriptions.",
    cadenceWord: {
      month: "month",
      year: "year",
      mixed: "month or year",
    },
    cadence: {
      monthly: "monthly",
      yearly: "yearly",
    },
    rowMeta: "{{amount}} {{cadence}} · {{charges}} · {{category}}",
    charges_one: "{{count}} charge",
    charges_other: "{{count}} charges",
    makeBill: "Make it a bill",
    saving: "Saving...",
    notSubscription: "Not a subscription",
    a11yMakeBill: "Make {{merchant}} a recurring bill",
    a11yNotSubscription: "{{merchant}} is not a subscription",
    errors: {
      createBill: "Couldn't create the recurring bill.",
      hideMerchant: "Couldn't hide that merchant.",
    },
  },
  exchange: {
    title: "Currency Exchange",
    hint: "Convert an amount between currencies",
    resultLabel: "CONVERTED VALUE",
    amount: "Amount",
    amountPlaceholder: "Amount to convert",
    from: "From",
    to: "To",
    swap: "⇅ Swap",
    refresh: "↻ Refresh rates",
    refreshing: "Refreshing…",
    loadFailed: "Couldn't load rates - tap Refresh to try again.",
    refreshFailed: "Couldn't refresh rates - showing the last saved rates.",
    privacyNote:
      "Rates come from a free public exchange-rate service, typically updated once a day. Only the request for the day's rate table leaves your phone - never your amounts.",
  },
  inflation: {
    title: "Personal Inflation Rate",
    hintRates: "Your prices {{rate}} vs {{headline}} headline",
    hintIdle: "Your own prices, year over year, vs the headline CPI",
    insufficient_one:
      "This needs at least {{min}} tracked months in each of the last two years, on categories you spent on in both. So far: {{count}} month in the last {{window}}, {{prior}} in the {{window}} before. Keep logging and it fills in.",
    insufficient_other:
      "This needs at least {{min}} tracked months in each of the last two years, on categories you spent on in both. So far: {{count}} months in the last {{window}}, {{prior}} in the {{window}} before. Keep logging and it fills in.",
    resultLabel: "YOUR INFLATION RATE",
    above: "Running hotter than the {{headline}} headline",
    below: "Running cooler than the {{headline}} headline",
    inLine: "In line with the {{headline}} headline",
    basket_one: "{{prior}}/mo → {{current}}/mo on the same {{count}} category",
    basket_other: "{{prior}}/mo → {{current}}/mo on the same {{count}} categories",
    byCategory: "By category",
    averageHint:
      "Average per tracked month: last {{window}} months ({{current}} tracked) vs the {{window}} before ({{prior}} tracked)",
    rowMeta: "{{prior}} → {{current}}/mo",
    newSpending:
      "Plus {{amount}}/mo in categories you didn't have last year - new spending, not inflation, so it stays out of the rate.",
    note: "Headline figure: {{label}}, as of {{asOf}}, bundled with the app - nothing is fetched. Your rate mixes price changes with how much you bought, so a category that jumped may be a habit change as much as a price rise. Debt payments and savings are transfers, not prices, and are left out.",
  },
} as const;
