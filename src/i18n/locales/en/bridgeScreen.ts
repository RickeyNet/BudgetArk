/**
 * BudgetArk - English strings: Bridge tab (screen)
 * File: src/i18n/locales/en/bridgeScreen.ts
 *
 * Covers: BridgeScreen.tsx (tab shell: net worth hero, accounts, inline
 * asset / emergency-fund modals, holdings, alerts, undo). Asset-category
 * labels are keyed by the `AssetAccountCategory` id; change-period chips by
 * their `AccountChangePeriodKey`. The holdings disclosure body comes from
 * src/data/holdingsDisclosure.ts (rule 4 consent copy) - only its buttons
 * live here.
 */

export const bridgeScreen = {
  header: {
    title: "The Bridge",
    subtitle: "Net worth, accounts, and progress.",
  },
  accounts: {
    title: "Accounts",
    add: "+ Add",
    empty: "Track your checking, savings, 401k, HSA, and other account balances here.",
    total: "Total",
    across_one: "across {{count}} account",
    across_other: "across {{count}} accounts",
    plusEmergencyFund: " + Emergency Fund",
    changeLabel: "Change",
    changeChipA11y: "Show {{period}} change",
    periods: {
      "1D": "1D",
      "7D": "7D",
      "30D": "30D",
      "90D": "90D",
    },
    trackingHint: "Tracking starts today - rise/drop appears after the next visit.",
    emergencyFund: "Emergency Fund",
    efFromAccounts_one: "From {{count}} savings account",
    efFromAccounts_other: "From {{count}} savings accounts",
    savingsGoal: "Savings Goal",
    categories: {
      checking: "Checking",
      savings: "Savings",
      retirement: "401k / Retirement",
      hsa: "HSA",
      investment: "Investment",
      other: "Other",
    },
    edit: "Edit",
    editA11y: "Edit {{name}}",
    cash: "Cash",
    noHoldings: "No holdings yet - tap Edit to add tickers.",
    fund: "Fund",
    shares_one: "{{count}} share",
    shares_other: "{{count}} shares",
    tracks: "Tracks {{symbol}}",
    manualValue: "Manual value",
    addHsaAccount: "+ Add HSA account",
    addBroker: "+ Add broker",
  },
  holdingsNudge: {
    a11y: "Enable Live Holdings to see shared holdings",
    title: "📈 Holdings shared with you",
    body_one:
      "{{count}} position synced from your partner. Turn on Live Holdings to see them and include their value in your net worth.",
    body_other:
      "{{count}} positions synced from your partner. Turn on Live Holdings to see them and include their value in your net worth.",
    cta: "Enable Live Holdings ›",
  },
  prices: {
    asOf: "Prices as of {{date}}",
    notFetched: "Prices not fetched yet",
    updateA11y: "Update prices now",
    updating: "Updating...",
    update: "Update prices",
    notices: {
      unavailable:
        "Couldn't update prices right now. Check your connection and try again in a few minutes.",
      rateLimited: "Prices were already updated today.",
      partial_one:
        "Updated most prices - still fetching {{count}} ticker. Tap again in a few minutes to finish.",
      partial_other:
        "Updated most prices - still fetching {{count}} tickers. Tap again in a few minutes to finish.",
      partialUnknown: "Updated most prices - tap again in a few minutes to finish.",
    },
  },
  plans: {
    title: "Purchase Plans",
    planA11y: "Plan a new purchase on the Charts tab",
    add: "+ Plan",
    hint: "Tap a plan to add the money you've set aside.",
    empty:
      "Saving up for something? Tap + Plan to build a sinking fund on the Charts tab - it'll be tracked here and count toward your net worth.",
  },
  shipsLog: {
    a11y: "Open Ship's Log achievements",
    title: "Ship's Log",
    earned: "{{count}}/{{total}} earned",
  },
  annualReport: {
    a11y: "Open your annual financial report",
    title: "Annual Report",
    subtitle: "Your {{year}} year in review",
  },
  assetModal: {
    editTitle: "Edit Account",
    addTitle: "Add Account",
    subHsa: "Track your HSA cash balance and any stocks or ETFs it holds.",
    subHoldings: "Add the broker and the stocks or ETFs it holds. Its value comes from the holdings.",
    subBalance: "Track a balance that will feed your net worth history.",
    namePlaceholderBroker: "Broker name (e.g. Fidelity)",
    namePlaceholderHsa: "HSA provider (e.g. Fidelity)",
    namePlaceholder: "Account name",
    balancePlaceholderHsa: "Cash balance",
    balancePlaceholder: "Balance",
    apyPlaceholder: "APY % (optional) - e.g. 4.5",
    apyA11y: "Annual percentage yield",
    efToggleA11y: "This account is my emergency fund",
    efToggleLabel: "🛡️ Emergency fund",
    efToggleHint:
      "Count this balance as your Emergency Fund. With accounts designated, the fund tracks their combined balance (bank syncing keeps it current) instead of manual contributions.",
    tickerHint:
      "Add stocks/ETFs by ticker (AAPL) or crypto by pair (BTC/USD). For a 401k fund with no ticker (e.g. Spartan 500 Index Pool), use Add 401k fund. Symbols are sent to the price service only when you tap Update prices - add them all first, then pull prices once.",
    fundNamePlaceholder: "Fund name (e.g. Spartan 500 Index Pool)",
    removeFund: "Remove fund",
    proxyPlaceholder: "Track index (optional, e.g. VOO)",
    valuePlaceholder: "Current value",
    fundHintProxy: "Rides {{symbol}} between updates - re-enter the value from each statement to re-anchor.",
    fundHintManual: "No index - holds the value you enter until you change it.",
    tickerPlaceholder: "AAPL or BTC/USD",
    sharesPlaceholder: "Shares",
    costPlaceholder: "Cost",
    removeTicker: "Remove ticker",
    addTicker: "+ Add ticker",
    addFund: "+ Add 401k fund",
  },
  efModal: {
    title: "Emergency Fund",
    currentBalance: "Current balance: {{amount}}",
    amountPlaceholder: "Amount to add (or negative to withdraw)",
    hint: "Enter a positive number to contribute, or negative to withdraw.",
  },
  disclosure: {
    notNow: "Not now",
    enable: "Enable",
  },
} as const;
