/**
 * BudgetArk - English strings: pure helpers (misc)
 * File: src/i18n/locales/en/helpersMisc.ts
 *
 * Covers: budgetMonths, dateFormat, syncActivity, customCategoriesStorage,
 * personStorage / businessStorage validation, usePinVerifier, and the
 * user-facing messages of src/services/connections (cross-cutting labels).
 * Read from plain modules via src/i18n/translate.ts.
 */

export const helpersMisc = {
  dates: {
    unknownDate: "Unknown date",
  },
  syncActivity: {
    nothingNew: "nothing new",
    removed: "({{n}} removed)",
    collections: {
      budgetEntries_one: "{{count}} entry",
      budgetEntries_other: "{{count}} entries",
      payments_one: "{{count}} payment",
      payments_other: "{{count}} payments",
      debts_one: "{{count}} debt",
      debts_other: "{{count}} debts",
      savingsGoals_one: "{{count}} savings goal",
      savingsGoals_other: "{{count}} savings goals",
      assetAccounts_one: "{{count}} account",
      assetAccounts_other: "{{count}} accounts",
      holdings_one: "{{count}} holding",
      holdings_other: "{{count}} holdings",
      budgetLimits_one: "{{count}} limit",
      budgetLimits_other: "{{count}} limits",
      monthStartBalances_one: "{{count}} starting balance",
      monthStartBalances_other: "{{count}} starting balances",
      customCategories_one: "{{count}} category",
      customCategories_other: "{{count}} categories",
      businesses_one: "{{count}} business",
      businesses_other: "{{count}} businesses",
      people_one: "{{count}} person",
      people_other: "{{count}} people",
      dismissedTransactions_one: "{{count}} skipped transaction",
      dismissedTransactions_other: "{{count}} skipped transactions",
      netWorthSnapshots_one: "{{count}} net worth snapshot",
      netWorthSnapshots_other: "{{count}} net worth snapshots",
    },
  },
  validation: {
    tooLong: "Keep it under {{max}} characters.",
    alreadyExists: "\"{{name}}\" already exists.",
  },
  categories: {
    nameRequired: "Enter a category name.",
    builtIn: "\"{{name}}\" is already a built-in category.",
    limit: "You can have up to {{max}} custom categories.",
    notFound: "Category not found.",
  },
  people: {
    nameRequired: "Enter a name.",
    limit: "You can have up to {{max}} people.",
    notFound: "Person not found.",
  },
  businesses: {
    nameRequired: "Enter a business name.",
    limit: "You can have up to {{max}} businesses.",
    notFound: "Business not found.",
  },
  pin: {
    incorrect: "Incorrect PIN - try again",
  },
  connections: {
    keystoreUnavailable:
      "This device can't securely store bank credentials (secure keystore unavailable), so the connection wasn't saved. This can affect rooted or sideloaded installs.",
    credentialsMissing: "This connection's stored credentials are missing. Remove and re-add it.",
    syncFailed: "Something went wrong syncing this connection.",
    teller: {
      appIdRequired: "Enter your Teller application id first.",
      badPemFiles:
        "Those files don't look like the certificate.pem and private_key.pem from your teller.zip.",
      listAccountsFailed: "Teller connected but listing accounts failed.",
      authRejected: "Teller rejected this connection's credentials. Re-enroll the bank to keep syncing.",
      rateLimited: "Teller's request limit was reached. Try again later.",
      unexpectedResponse: "Teller returned an unexpected response (HTTP {{status}}).",
      certificateRefused:
        "Teller refused the client certificate. Re-import the certificate and key from your teller.zip.",
      unreachable: "Couldn't reach Teller. Check your connection and try again.",
      unparsable: "Teller's response couldn't be parsed.",
      noEnrollments: "No Teller enrollments yet. Connect a bank through Teller first.",
    },
    simplefin: {
      tokenRequired: "Paste your SimpleFIN setup token first.",
      tokenInvalid:
        "That doesn't look like a SimpleFIN setup token. Copy the whole token from your SimpleFIN Bridge app page and try again.",
      tokenUsed:
        "That token didn't work - SimpleFIN tokens are single-use, so generate a fresh one in SimpleFIN Bridge and paste it here.",
      paymentRequired:
        "SimpleFIN Bridge says payment is required. Check your subscription at bridge.simplefin.org, then try again.",
      unexpectedResponse: "SimpleFIN returned an unexpected response (HTTP {{status}}).",
      accessUrlUnreadable: "SimpleFIN returned an access URL BudgetArk couldn't read.",
      accessUrlMalformed:
        "The stored SimpleFIN access URL is malformed. Remove and re-add this connection.",
      authRejected: "SimpleFIN rejected this connection's credentials.",
      rateLimited: "SimpleFIN's daily request limit was reached. Try again later.",
      unreachable: "Couldn't reach SimpleFIN. Check your connection and try again.",
    },
  },
  /** Partner sync orchestrator errors surfaced on the Profile tab. */
  sync: {
    notPaired: "Not paired with a partner",
  },
} as const;
