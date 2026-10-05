/**
 * BudgetArk - English strings: Charts tab (tax)
 * File: src/i18n/locales/en/chartsTax.ts
 *
 * Covers: TaxCalculatorCard.tsx + QuarterlyTaxCard.tsx (US-only tools).
 * Filing statuses and pay frequencies are keyed by their stored ids; the
 * German twin adds a "(nur USA)" qualifier to the titles because the
 * rules modeled are American no matter what language the app is in.
 */

export const chartsTax = {
  filingStatus: {
    single: "Single",
    marriedJoint: "Married joint",
    marriedSeparate: "Married separate",
    headOfHousehold: "Head of household",
  },
  takeHome: {
    title: "Take-Home Pay",
    hint: "Estimate US federal, state, and payroll tax on a salary",
    income: {
      sectionTitle: "Your income",
      grossLabel: "Gross annual salary (USD)",
      grossPlaceholder: "e.g. 75000",
      filingStatusLabel: "Filing status",
      paidEveryLabel: "Paid every",
    },
    payFrequency: {
      "52": "Weekly",
      "26": "Biweekly",
      "24": "Semimonthly",
      "12": "Monthly",
    },
    periodNoun: {
      "52": "week",
      "26": "two weeks",
      "24": "half-month",
      "12": "month",
      default: "period",
    },
    state: {
      sectionTitle: "State",
      noWageTax: " - no state income tax on wages",
      pickPrompt: "Pick your state to see the estimate.",
    },
    deductions: {
      sectionTitle: "Pre-tax deductions (optional)",
      k401Label: "401(k) % of pay",
      hsaLabel: "HSA per year",
      healthLabel: "Health / month",
      hint: "Traditional 401(k) lowers income tax; HSA and health premiums lower payroll (FICA) tax too.",
    },
    result: {
      perPeriodLabel: "TAKE-HOME PER {{period}}",
      perYearAndMonth: "{{year}} / year · {{month}} / month",
    },
    segments: {
      sectionTitle: "Where each dollar goes",
      home: "Take-home",
      saved: "Pre-tax savings",
      fed: "Federal",
      state: "State",
      fica: "FICA",
    },
    breakdown: {
      sectionTitle: "Yearly breakdown",
      gross: "Gross salary",
      k401: "401(k) contribution",
      cafeteria: "HSA + health premiums",
      federal: "Federal income tax",
      stateTax: "{{state}} income tax",
      stateFallback: "State",
      socialSecurity: "Social Security",
      medicare: "Medicare",
      takeHome: "Take-home",
      effectiveRate: "Effective tax rate",
      marginalBracket: "Federal marginal bracket",
    },
    compare: {
      sectionTitle: "What if you moved?",
      lead: "Same salary in {{state}}: {{amount}} take-home - ",
      more: "{{amount}} MORE per year.",
      less: "{{amount}} LESS per year.",
      same: "the same.",
    },
    disclaimer:
      "Estimate only - actual tax depends on credits, deductions, local taxes, and other factors not modeled here. Not tax advice. Computed entirely on your phone from bundled {{year}} tables (IRS Rev. Proc. 2025-32; Tax Foundation state data) - nothing you type leaves the device.",
  },
  quarterly: {
    title: "Quarterly Taxes",
    hintWithIncome: "{{year}}: set aside {{setAside}} of ~{{estimated}} estimated",
    hintEmpty: "Estimated payments on your 1099 income",
    updateFailed: "Couldn't update that quarter.",
    prevYear: "Previous year",
    nextYear: "Next year",
    taxYear: "Tax year {{year}}",
    filingStatusLabel: "Filing status",
    empty:
      "No 1099 income logged for {{year}}. Mark income entries as 1099 (with a tax set-aside rate) in the Add Entry form and the quarters fill in here.",
    summary: {
      label: "{{year}} ESTIMATED PAYMENTS",
      sub: "on {{income}} of 1099 income · set aside {{setAside}}",
      short: " ({{amount}} short)",
      spare: " ({{amount}} to spare)",
    },
    status: {
      paid: "Paid {{date}}",
      overdue: "Was due {{date}}",
      due: "Due {{date}}",
      none: "No 1099 income",
    },
    row: {
      title: "{{quarter}} · {{from}}–{{to}}",
      income: "1099 income",
      setAside: "Set aside",
      estimated: "Estimated payment",
      markPaid: "Mark paid",
      undoPaid: "Undo paid",
    },
    disclaimer:
      "Estimates from the {{year}} federal tables: self-employment tax plus income tax on your annualized 1099 income, with the standard deduction. No state tax, credits, W-2 withholding or other income - if you also have a W-2 job, your real installment may differ. Due dates are the IRS calendar; the paid mark stays on this phone.",
  },
} as const;
