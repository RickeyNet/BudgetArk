/**
 * BudgetArk - English strings: Debts tab (form)
 * File: src/i18n/locales/en/debtsForm.ts
 *
 * Covers: AddDebtModal.tsx (add / edit debt sheet). Owner and debt-type
 * labels are keyed by their ids from src/types (DEBT_OWNER_OPTIONS /
 * DEBT_CLASS_OPTIONS) - the ids are stored on the debt and never change.
 */

export const debtsForm = {
  title: {
    add: "Add New Debt",
    edit: "Edit Debt",
  },
  subtitle: {
    add: "Enter the details of the debt you want to track",
    edit: "Update the details of this debt",
  },
  name: {
    label: "DEBT NAME",
    placeholder: "e.g., Chase Visa, Student Loan",
  },
  balance: {
    label: "TOTAL BALANCE",
    placeholder: "0.00",
    /** " · as of Jun 25" suffix for the bank balance's timestamp. */
    asOf: " · as of {{date}}",
    fromBank:
      "From {{account}}{{asOf}}. Updates after every bank sync - switch \"Balance from bank\" off below to type it yourself.",
  },
  owner: {
    label: "OWNER",
    options: {
      mine: "Mine",
      partner: "Partner",
      joint: "Joint",
    },
  },
  type: {
    label: "DEBT TYPE",
    options: {
      personal_credit: "Credit / Personal",
      car: "Car",
      house: "House / Mortgage",
    },
  },
  apr: {
    label: "APR (%)",
    placeholder: "0.0",
  },
  minPayment: {
    label: "MIN PAYMENT",
    placeholder: "0.00",
  },
  dueDay: {
    label: "MINIMUM PAYMENT DUE DAY",
    hint: "Day of each month your minimum is due. Day 29-31 falls back to the last day in shorter months.",
    useDefault: "Use default (day {{day}})",
    custom: "Set custom day",
  },
  goal: {
    label: "PAYOFF GOAL DATE (OPTIONAL)",
    selectMonth: "Select month",
    clear: "Clear goal month",
    payHint_one: "Pay {{amount}}/mo to be debt-free in {{count}} month",
    payHint_other: "Pay {{amount}}/mo to be debt-free in {{count}} months",
    tooSoon: "Goal date is too soon - not achievable",
    pickerTitle: "Set payoff goal date",
  },
  bank: {
    label: "CONNECTED BANK ACCOUNT (OPTIONAL)",
    emptyHint:
      "Connect your bank (Profile → Bank Connections) and this card can keep its own balance current - and, with the keep-alive watch on, stamp its last use from your purchases.",
    pickHint:
      "Pick the bank account that is this card. Its balance lands here after every sync, and with the keep-alive watch on, purchases stamp the last-used date for you.",
    notConnected: "Not connected",
    updatesLabel: "BALANCE UPDATES",
    balanceOn: "Balance from bank: On",
    balanceOff: "Balance from bank: Off",
  },
  keepAlive: {
    label: "CARD KEEP-ALIVE (OPTIONAL)",
    hint: "Issuers can close a card that sits unused. Get warned before this card's inactivity window runs out. Closed this card on purpose? Just turn the watch off.",
    on: "Keep-alive watch: On",
    off: "Keep-alive watch: Off",
    windowLabel: "ALLOWED INACTIVITY (ISSUERS VARY)",
    windowChip: "{{count}} mo",
    leadLabel: "START WARNING ME",
    leadChip: "{{count}} days out",
    lastUsedLabel: "LAST-USED TRACKING",
    lastUsedLinked:
      "Stamps itself from {{account}} purchases. Tap \"I used it\" on the card anytime to stamp by hand.",
    lastUsedWithLinks:
      "Tap \"I used it\" on the card after a purchase - or pick a connected account above and it stamps itself.",
    lastUsedNoLinks:
      "Tap \"I used it\" on the card after a purchase. Set up a bank connection (Profile → Bank Connections) and the date stamps itself from your transactions.",
  },
  alerts: {
    notificationsOff: {
      title: "Notifications are off",
      message:
        "Keep-alive tracking still works - you'll see warnings inside the app. To also get reminder notifications, turn them on in your phone's Settings.",
      openSettings: "Open Settings",
    },
  },
  buttons: {
    saveChanges: "Save Changes",
    addDebt: "Add Debt",
  },
} as const;
