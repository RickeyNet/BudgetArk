/**
 * BudgetArk - English strings: Debts tab (moments)
 * File: src/i18n/locales/en/debtsMoments.ts
 *
 * Covers: DebtPayoffCelebrationModal, DebtPaymentCelebrationModal,
 * DebtFreeCountdownCard, DebtDuePaymentPromptModal, CardKeepAliveBanner,
 * TipJarNudgeCard. The Tip Jar nudge's title/body come from
 * utils/tipJarNudge and are not in this tree yet.
 */

export const debtsMoments = {
  payoff: {
    kicker: {
      own: "Debt cleared",
      partner: "Partner debt cleared",
      joint: "Joint debt cleared",
    },
    title: "You paid off {{name}}",
    subtitle: "One more balance at {{zero}}. Keep rolling freed-up cash into next target.",
    totalCleared: "TOTAL CLEARED",
    paymentFreed: "PAYMENT FREED",
    perMonth: "{{amount}}/mo",
    tipTitle: "Momentum tip",
    tipBody: "Redirect at least {{amount}} each month to next debt for snowball effect.",
    viewHistory: "View History",
    keepGoing: "Keep Going",
  },
  payment: {
    kicker: "PAYMENT LOGGED",
    title: "Nice work",
    subtitle: "{{amount}} logged toward {{name}}.",
    balanceNow: "BALANCE NOW",
    keepGoing: "Keep Going",
  },
  countdown: {
    eyebrow: "DEBT-FREE COUNTDOWN",
    debtFree: "🎉 You're debt-free! Every balance is at zero.",
    notSolvableTitle: "No payoff date at the current pace",
    notSolvableBody:
      "Monthly interest is outpacing these payments, so the balances never reach zero. Even a small extra payment changes that - open Build Your Ark above to compare payoff strategies.",
    units: {
      year_one: "YEAR",
      year_other: "YEARS",
      month_one: "MONTH",
      month_other: "MONTHS",
      day_one: "DAY",
      day_other: "DAYS",
    },
    target: "Projected debt-free in {{month}}",
    pace: {
      perMonth: "{{amount}}/mo",
      history_one: "At your pace of {{pace}} · from your last month of payments",
      history_other: "At your pace of {{pace}} · from your last {{count}} months of payments",
      currentMonth: "At your pace of {{pace}} · from this month's payments",
      minimums: "Assuming minimum payments of {{pace}} · log payments to tune this",
    },
    belowMinimums:
      "Your recent pace of {{pace}} is below your combined minimums - the projection assumes the minimums are met.",
  },
  duePrompt: {
    eyebrow: "MINIMUM DUE TODAY",
    body: "Did you make this month's minimum payment of {{amount}}? (Due on day {{day}} of each month.)",
    hint: "Logging here updates your debt balance and counts toward Budget under Debt Payments.",
    confirm: "Yes, I paid {{amount}}",
    notYet: "Not yet this month",
    later: "Remind me later",
  },
  keepAlive: {
    eyebrow: "CARD KEEP-ALIVE",
    summary_one: "{{count}} card needs a small purchase soon",
    summary_other: "{{count}} cards need a small purchase soon",
    overdue: "{{name}} · deadline passed ({{when}}) - use it soon",
    useBy: "{{name}} · use by {{when}} · {{days}}",
    today: "today",
    tomorrow: "tomorrow",
    inDays_one: "in {{count}} day",
    inDays_other: "in {{count}} days",
    hint: "Idle cards can be closed by their issuer",
    later: "Later",
  },
  tipNudge: {
    eyebrow: "TIP JAR 💛",
    a11yCard: "Tip Jar. {{title}}. {{body}}",
    a11yOpen: "Open the Tip Jar",
    leaveTip: "Leave a tip ›",
    a11yDismiss: "Dismiss",
    notNow: "Not now",
  },
} as const;
