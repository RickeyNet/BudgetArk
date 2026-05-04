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
          "Top card shows this month's income, expenses, and net. Use the < > arrows above it to look at past months - six months of history are kept.",
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
          "Income, expense, or savings entry. Mark anything that repeats as Recurring and it auto-fills every month.",
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
        id: "bridge-overview",
        anchorId: "bridge-overview-card",
        title: "Tracked balances at a glance",
        body:
          "Tracked Accounts and Emergency Fund roll up here. They feed straight into the Net Worth total above.",
      },
      {
        id: "bridge-accounts",
        anchorId: "bridge-accounts-card",
        title: "Manage your accounts",
        body:
          "Add savings, retirement, brokerage, or any account you want counted toward Net Worth. Tap a row to update its balance any time - the changes flow back into the Bridge view.",
      },
    ],
  },
  Utilities: {
    tabId: "Utilities",
    intro: "Utilities - financial calculators",
    steps: [
      {
        id: "utilities-tool",
        anchorId: "utilities-tool-header",
        title: "Compound interest, loan, and emergency fund",
        body:
          "Tap a tool header to expand it. Use the sliders to explore 'what if' scenarios - for example, the S&P 500 preset on the compound calculator gives a realistic 7% baseline. These tools never write to your data.",
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
        title: "Theme + Layout Density",
        body:
          "Pick a theme palette and a density preset (Compact, Comfortable, Spacious). Density resizes padding and font sizes app-wide.",
      },
      {
        id: "profile-help",
        anchorId: "profile-help-card",
        title: "Help and the walkthrough",
        body:
          "Tap How to use BudgetArk any time to read this tour again, or Replay walkthrough to see the spotlight tips on the next tab visit.",
      },
    ],
  },
};
