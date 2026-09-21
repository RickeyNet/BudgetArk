/**
 * BudgetArk - English strings: Budget tab (inbox)
 * File: src/i18n/locales/en/budgetInbox.ts
 *
 * Covers: ReviewInboxModal.tsx (bank-import review inbox). Section titles
 * ("Likely transfers", day labels) come from utils/reviewInboxSections and
 * the unusual-charge line from utils/unusualCharges - not in this tree yet.
 */

export const budgetInbox = {
  title: "Review Inbox",
  subtitle: {
    waiting_one: "{{count}} imported transaction waiting for approval",
    waiting_other: "{{count}} imported transactions waiting for approval",
    empty: "Nothing to review",
  },
  header: {
    rules: "Rules",
    sync: "Sync",
  },
  groupBy: {
    label: "Group by",
    date: "Date",
    vendor: "Vendor",
  },
  bulk: {
    approving: "Approving...",
    approveSuggested: "Approve {{count}} with suggested categories",
    skipAll: "Skip all",
    categorizeAll: "Categorize all",
    close: "Close",
    alwaysFileVendor: "Always file this vendor here",
    working: "Working...",
    approveGroupAs: "Approve {{count}} as {{category}}",
  },
  empty: "Inbox zero. New transactions land here after a sync.",
  row: {
    noDescription: "(no description)",
    pending: "pending",
    suggested: "suggested: {{category}}",
    deletedBusiness: "(deleted business)",
    deletedPerson: "(deleted person)",
    deletedDebt: "(deleted debt)",
  },
  form: {
    nameLabel: "NAME",
    namePlaceholder: "Name this transaction",
    categoryLabel: "CATEGORY",
    appliesToBill: "APPLIES TO BILL",
    notABill: "Not a bill",
    billOption: "{{name}} · est. {{amount}}",
    debtOption: "{{name}} · min {{amount}}",
    debtHint:
      "Logged as a payment on this debt - its balance and payment history update on the Debts tab, and the Budget counts it under Debt Payments. No separate expense is created, and the category above is not used. Tick \"Always do this\" below and future payments to this merchant are logged on the debt without stopping here.",
    businessLabel: "BUSINESS",
    personal: "Personal",
    peopleLabel: "PEOPLE",
    unassigned: "Unassigned",
    lentToLabel: "LENT TO SOMEONE?",
    lentToHint:
      "Money you expect back? Name who has it and track what they pay back under Profile → People → Owed to You.",
    lentToPlaceholder: "Leave blank if this isn't a loan",
    lentToChip: "Lent to {{name}}",
    planLabel: "ADD TO A PURCHASE PLAN",
    planHint:
      "Moved this money into savings for one of your plans? Tap the plan and the amount lands on its balance instead of being filed as an expense.",
    planChipA11y: "Add {{amount}} to {{plan}}",
    planToGo: " · {{amount}} to go",
    planFunded: " · funded",
    rememberRule:
      "Always do this for \"{{merchant}}\" - on Approve, matching transactions here and in future imports are approved automatically with these choices; on Skip, it never imports again",
  },
  billSuggest: {
    title: "🧾 Looks like a monthly bill",
    body_one:
      "{{label}} has posted once a month for {{count}} month, averaging {{amount}}. Make it a recurring bill and this charge - and future ones - file against it instead of stacking on the estimate.",
    body_other:
      "{{label}} has posted once a month for {{count}} months, averaging {{amount}}. Make it a recurring bill and this charge - and future ones - file against it instead of stacking on the estimate.",
    creating: "Creating...",
    create: "Make it a recurring bill · {{amount}}/mo",
  },
  ruleNudge: {
    title: "🔁 You've done this before",
    body_one:
      "You've approved \"{{merchant}}\" as {{category}} {{count}} time. Make it a rule and future imports from this merchant approve themselves with the same category.",
    body_other:
      "You've approved \"{{merchant}}\" as {{category}} {{count}} times. Make it a rule and future imports from this merchant approve themselves with the same category.",
    saving: "Saving...",
    alwaysApproveAs: "Always approve as {{category}}",
  },
  actions: {
    skip: "Skip",
    alwaysSkip: "Always Skip",
    saving: "Saving...",
    logPayment: "Log Payment",
    alwaysLogPayment: "Always Log Payment",
    approve: "Approve",
    alwaysApprove: "Always Approve",
  },
  notices: {
    alreadyLogged:
      "Already on the Debts tab - matched to the {{amount}} payment logged {{date}}. Nothing was counted twice.",
  },
  errors: {
    load: "Couldn't load the inbox.",
    approve: "Couldn't approve this transaction.",
    skip: "Couldn't skip this transaction.",
    addToPlan: "Couldn't add this to the plan.",
    logDebtPayment: "Couldn't log this debt payment.",
    skipMany: "Couldn't skip those transactions.",
    createBill: "Couldn't create the recurring bill.",
    categorizeVendor: "Couldn't categorize this vendor's transactions.",
    bulkApprove: "Couldn't approve all of the suggested transactions.",
  },
} as const;
