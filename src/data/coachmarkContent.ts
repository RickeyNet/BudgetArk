export type CoachmarkStep = {
  id: string;
  /** Anchor id that the spotlight should focus on. If missing or unmeasurable, falls back to a centered card. */
  anchorId?: string;
  title: string;
  body: string;
};

export type CoachmarkTour = {
  tabId: string;
  intro: string;
  steps: CoachmarkStep[];
};

export const COACHMARK_TAB_IDS = ["DebtTracker", "Budget", "Bridge", "Utilities", "Profile"] as const;

export type CoachmarkTabId = (typeof COACHMARK_TAB_IDS)[number];

export const COACHMARKS: Record<CoachmarkTabId, CoachmarkTour> = {
  DebtTracker: {
    tabId: "DebtTracker",
    intro: "Debts - your payoff plan",
    steps: [
      {
        id: "debts-summary",
        anchorId: "debts-summary-card",
        title: "Your debt at a glance",
        body:
          "Total balance, total paid, and overall progress live here. The ring on the right tracks your % paid off across every debt.",
      },
      {
        id: "debts-fab",
        anchorId: "debts-fab",
        title: "Add a debt with +",
        body:
          "Tap the + button to add a credit card, loan, or mortgage. You set the balance, APR, and minimum payment - payments you record reduce the balance.",
      },
      {
        id: "debts-payments",
        title: "Log payments as you go",
        body:
          "Tap a debt card to record a payment or open its payment history - every payment lowers the balance and counts toward your progress. Give a debt a due day and BudgetArk reminds you in-app when it's coming up, with a one-tap prompt to log the minimum on the day it's due.",
      },
      {
        id: "debts-strategy",
        title: "Pick a payoff strategy",
        body:
          "Choose Avalanche (highest interest rate first), Snowball (smallest balance first), or keep your own custom order. Your strategy drives the payoff projections here and in the Charts tools.",
      },
      {
        id: "debts-milestones",
        anchorId: "debts-milestones-card",
        title: "Build Your Ark milestones",
        body:
          "Tap the milestones card to set targets for the 7 financial milestones - starter cushion, debt-free, emergency fund, retirement, and beyond.",
      },
    ],
  },
  Budget: {
    tabId: "Budget",
    intro: "Budget - what comes in, what goes out",
    steps: [
      {
        id: "budget-summary",
        anchorId: "budget-summary-card",
        title: "Income vs expense",
        body:
          "Top card shows this month's income, expenses, and net. Use the < > arrows above it to look at past months - a full year of history is kept.",
      },
      {
        id: "budget-spending",
        anchorId: "budget-spending-card",
        title: "Category breakdown",
        body:
          "The donut chart breaks down spending by category. Tap any category to see the entries inside or set a monthly limit.",
      },
      {
        id: "budget-fab",
        anchorId: "budget-fab",
        title: "Add an entry with +",
        body:
          "Income, expense, or savings entry. Mark anything that repeats as Recurring and it auto-fills every month. Income entries can be tagged as W-2 or 1099 paychecks to track 401(k) contributions and how much to set aside for taxes.",
      },
      {
        id: "budget-inbox",
        title: "Review Inbox for bank imports",
        body:
          "Connected a bank in Profile? New transactions wait in the tray icon at the top of this screen - nothing enters your budget until you approve it. Confirm or change each category, edit, or skip; approve a merchant with 'always use this category' and its future charges arrive pre-suggested. Transfers between your own accounts are set aside automatically.",
      },
      {
        id: "budget-receipts",
        title: "Receipts and business expenses",
        body:
          "Attach up to three receipt photos to any entry - they're encrypted and never leave this phone. Tag an expense to a business (set businesses up in Profile) and it gets a 💼 badge; a tax-time report with CSV and receipt export lives in Profile → Business Expenses.",
      },
    ],
  },
  Bridge: {
    tabId: "Bridge",
    intro: "Bridge - your net worth",
    steps: [
      {
        id: "bridge-history",
        anchorId: "bridge-history-card",
        title: "Your Net Worth",
        body:
          "Net Worth = everything you own minus everything you owe. The big number rolls up debts, savings, retirement, investments, and tracked accounts. The chart below it plots Net Worth over time - snapshots save automatically when balances change.",
      },
      {
        id: "bridge-accounts",
        anchorId: "bridge-accounts-card",
        title: "Manage your accounts",
        body:
          "Add savings, retirement, brokerage, or any account you want counted toward Net Worth. Tap a row to update its balance any time - the changes flow back into the Bridge view. Accounts linked to a bank connection keep their balances current automatically after every sync.",
      },
      {
        id: "bridge-changes",
        title: "Watch accounts rise and fall",
        body:
          "Every account row and category header shows how much it's up or down - use the 1D / 7D / 30D / 90D switch to change the window. The history behind it is recorded privately on this phone as you use the app, so the numbers appear from your second day on.",
      },
      {
        id: "bridge-holdings",
        title: "Track stocks and ETFs by broker (Live Holdings)",
        body:
          "Turn on Live Holdings to track stocks and ETFs, organized by broker. Each broker (like Fidelity) lives in the Investment section of your accounts - tap it to expand its holdings, with a total for that broker and a combined total across all of them. Add a position by ticker and share count, and its market value counts toward your Net Worth. Prices only update when you tap Update prices, so add all your tickers first and then pull prices once. It stays off until you switch it on here or in Profile, and the first time you will see exactly what leaves your device. Only your ticker symbols are ever sent out to look up prices, never your share counts, balances, or who you are.",
      },
    ],
  },
  Utilities: {
    tabId: "Utilities",
    intro: "Charts - lessons, calculators, and projections",
    steps: [
      {
        id: "charts-course",
        title: "The Captain's Course",
        body:
          "A free personal-finance course in 5 chapters and 24 short lessons - budgeting basics, killing debt, saving, investing, and long-term wealth. Your progress is tracked, and you can read the lessons in any order.",
      },
      {
        id: "utilities-tool",
        anchorId: "utilities-tool-header",
        title: "Financial calculators",
        body:
          "Tap a tool header to expand it: compound interest (the S&P 500 preset gives a realistic 7% baseline), a loan calculator with a full payment schedule you can export, a refinance break-even check, and an emergency fund planner. Use the sliders to explore 'what if' scenarios - these tools never write to your data.",
      },
      {
        id: "charts-what-if",
        title: "What if I stopped spending on…",
        body:
          "Pick one of your spending categories and see two futures side by side: how much sooner you'd be debt-free (and the interest you'd skip), or what that money would grow into after 1, 5, and 10 years. Computed from your own budget history, entirely on this phone.",
      },
    ],
  },
  Profile: {
    tabId: "Profile",
    intro: "Profile - your settings",
    steps: [
      {
        id: "profile-appearance",
        anchorId: "profile-appearance-card",
        title: "Theme, layout, and currency",
        body:
          "Pick a theme palette, a design style, and a density preset (Compact, Comfortable, Spacious) - density resizes padding and font sizes app-wide, and ambient themes bring a living background. Your display currency is set here too.",
      },
      {
        id: "profile-connections",
        title: "Bank connections (optional)",
        body:
          "Link your bank, cards, or brokerage using accounts YOU own - via SimpleFIN Bridge or Teller - and let transactions and balances import themselves. A built-in setup guide walks you through cost, sign-up, and privacy for each provider. Credentials stay encrypted on this device; BudgetArk has no server.",
      },
      {
        id: "profile-sync-data",
        title: "Partner sync and backups",
        body:
          "Pair with a partner's phone and sync over your home Wi-Fi - device to device, no cloud involved. The Data card handles encrypted backups, spreadsheet export/import, and Reset All Data (which starts you over at the first-launch setup).",
      },
      {
        id: "profile-extras",
        title: "Achievements, categories, and more",
        body:
          "The Ship's Log tracks achievements as you use the app. You can also add custom budget categories, manage businesses for expense reports, turn on gentle tracking reminders, flip on privacy mode to block screenshots, and leave an optional tip if BudgetArk has helped you.",
      },
      {
        id: "profile-help",
        anchorId: "profile-help-card",
        title: "Help and the walkthrough",
        body:
          "Tap How to use BudgetArk any time to reread this guide, Replay walkthrough to see the spotlight tips again, or Redo onboarding to run the full first-launch setup and tour from the start.",
      },
    ],
  },
};
