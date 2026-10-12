/**
 * BudgetArk - English strings: Budget tab (entry)
 * File: src/i18n/locales/en/budgetEntry.ts
 *
 * Covers: BudgetEntryModal.tsx (add / edit entry form). Option labels for
 * income types, recurrence intervals and weekday headers live here keyed
 * by their VALUE so the form can translate options whose data lives in
 * src/types / src/utils.
 */

export const budgetEntry = {
  add: {
    title: "Add Budget Entry",
    subtitle: "Track income and expenses by category.",
    submit_one: "Add Entry",
    submit_other: "Add {{count}} Entries",
    saveAndAnother: "Save + another",
    saveAndAnotherA11y: "Save and add another entry",
  },
  edit: {
    title: "Edit Entry",
    subtitle: "Update or delete this budget entry.",
    loading: "Loading...",
  },
  type: {
    label: "ENTRY TYPE",
    expense: "Expense",
    income: "Income",
  },
  incomeType: {
    label: "INCOME TYPE",
    hint: "W-2 tracks your take-home paycheck and 401(k). 1099 shows how much of each payment to set aside for taxes.",
    options: {
      regular: "Regular",
      w2: "W-2 paycheck",
      "1099": "1099 / contractor",
    },
  },
  retirement: {
    label: "401(K) THIS PAYCHECK (OPTIONAL)",
    hintEdit:
      "The amount below is your take-home (net) pay. If part of this paycheck went to a 401(k), record it here - it's tracked separately, not added to income.",
    hintAdd:
      "Enter your take-home (net) pay as the amount below. If part of this paycheck went to a 401(k), record it here - it's tracked separately, not added to income.",
    firstLineNote: "The 401(k) amount attaches to the first entry.",
  },
  taxSetAside: {
    label: "TAX SET-ASIDE PERCENT",
    hint: "Nothing is withheld from 1099 pay, so set a slice aside for end-of-year taxes. 25-30% is a common starting point.",
    preview: "Set aside {{amount}} of this for taxes.",
  },
  category: {
    label: "CATEGORY",
  },
  amount: {
    label: "AMOUNT",
    placeholder: "0.00",
    descriptionLabel: "DESCRIPTION (OPTIONAL)",
    descriptionPlaceholder: "e.g. Grocery run, Netflix, etc.",
    descriptionLinePlaceholder: "Description (optional)",
  },
  estimate: {
    hint: "Your last {{count}} actual charges averaged {{average}}. The estimate only changes if you tap.",
    hintIncome:
      "Your last {{count}} full months of paychecks averaged {{average}}. The estimate only changes if you tap.",
    use: "Use {{average}}",
    useA11y: "Update estimate to {{average}}",
  },
  lines: {
    label: "ENTRIES",
    addA11y: "Add another entry line",
    hint: "Add multiple amounts for the same category (e.g. several grocery purchases from a bank statement).",
    lineTitle: "Entry {{index}}",
    singleTitle: "Amount",
    removeA11y: "Remove entry {{index}}",
    photosFirstLine: "Photos attach to the first entry.",
  },
  suggestions: {
    useA11y: "Use {{description}}",
    useInCategoryA11y: "Use {{description}} in {{category}}",
  },
  date: {
    monthLabel: "MONTH",
    startMonthLabel: "START MONTH",
    dayLabel: "DAY",
    today: "Today",
    todayA11y: "Set the date to today",
  },
  bill: {
    label: "APPLIES TO BILL",
    option: "{{name}} · est. {{amount}}",
    none: "None",
    hint: "This is the real charge for one of this month's recurring bills. Pick it and the bill's estimate steps aside for the month, so it isn't counted twice.",
  },
  /** A deposit filed as one of an earner's paychecks (income twin of `bill`). */
  paycheck: {
    label: "WHOSE PAYCHECK?",
    option: "{{name}} · est. {{amount}}/mo",
    none: "Not a paycheck",
    hint: "This deposit is one of this month's paychecks for someone in your household. Pick who, and their monthly estimate shrinks by this paycheck's share instead of being counted twice.",
  },
  /** Recurring income: whose paycheck (BudgetEntry.personId on income). */
  earner: {
    label: "EARNER (OPTIONAL)",
    hint: "Whose income is this? Deposits you file against it carry their name, so the budget can tell whose money came in.",
    unassigned: "Unassigned",
    deleted: "👤 (deleted person)",
  },
  /** Recurring income: paychecks per month (option labels reuse budget.cards.paycheck.frequency). */
  payFrequency: {
    label: "PAYCHECKS",
    hint: "How often this pay arrives. The amount above is the estimate for a whole month; each deposit filed against it counts as one paycheck, so after the first of two paychecks the other half of the estimate still counts.",
  },
  recurring: {
    label: "Recurring",
    hint: "This entry will repeat from the start month onward at the frequency you choose below.",
    frequencyLabel: "FREQUENCY",
    frequency: {
      monthly: "Monthly",
      quarterly: "Quarterly",
      semiannual: "Every 6 months",
      yearly: "Yearly",
    },
    payUrlLabel: "PAY URL (OPTIONAL)",
    payUrlHint: "Link to the payment site for this bill. https:// is added if you leave it off.",
    payUrlPlaceholder: "e.g. mybill.example.com/pay",
    dayOfMonthLabel: "DAY OF MONTH",
    dayOfMonthHint: "The day this bill hits. Day 29-31 falls back to the last day in shorter months.",
  },
  privacy: {
    label: "🔒 Private",
    hint: "Never syncs to your partner's device. Still counts in your budget and rides your own backups and exports.",
    alreadySyncedNote: " If this entry synced before, your partner keeps the copy they already have.",
  },
  loan: {
    label: "LENT TO SOMEONE? (OPTIONAL)",
    hint: "Money you expect back. Name who has it and the entry shows up under Profile → People → Owed to You, where you log what they pay back. It still counts as spending this month.",
    clearNote: " Clearing the name also forgets the payments logged against it.",
    placeholder: "Who owes you? Leave blank if nobody",
    chipA11y: "Lent to {{name}}",
  },
  account: {
    label: "LINK TO ACCOUNT",
    hint: "Contributions will be added to this account's balance.",
    none: "None",
  },
  business: {
    label: "BUSINESS (OPTIONAL)",
    hintEdit: "Tag this expense to a business for the tax-time report.",
    hintAdd: "Tag this expense to a business for the tax-time report. It still counts in your personal budget.",
    personal: "Personal",
    deleted: "💼 (deleted business)",
  },
  people: {
    label: "PEOPLE (OPTIONAL)",
    hint: "Who was this for? Pick one person, or everyone it was shared by - the whole family for groceries. Shared spending splits evenly in per-person reports.",
    unassigned: "Unassigned",
    deleted: "👤 (deleted person)",
  },
} as const;
