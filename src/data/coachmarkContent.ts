export type CoachmarkContent = {
  id: string;
  title: string;
  body: string;
  tip?: string;
};

export const COACHMARK_TAB_IDS = ["DebtTracker", "Budget", "Bridge", "Utilities", "Profile"] as const;

export type CoachmarkTabId = (typeof COACHMARK_TAB_IDS)[number];

export const COACHMARKS: Record<CoachmarkTabId, CoachmarkContent> = {
  DebtTracker: {
    id: "DebtTracker",
    title: "Debts — your payoff plan",
    body:
      "List every debt you owe (cards, loans, mortgage). Tap + to add one. Each card shows balance, APR, and progress; tap it to record a payment. The summary ring at top totals your overall payoff progress.",
    tip: "Tap the milestones card to set targets for the 7 Build-Your-Ark steps — starter cushion, debt-free, emergency fund, retirement, and beyond.",
  },
  Budget: {
    id: "Budget",
    title: "Budget — what comes in, what goes out",
    body:
      "Add income and expenses with the + button. Mark anything that repeats as Recurring and it auto-fills every month. The donut shows category breakdown; tap a category to set a monthly limit.",
    tip: "The Monthly Review card surfaces month-over-month spending changes. Tap it any time to see what shifted.",
  },
  Bridge: {
    id: "Bridge",
    title: "Bridge — your net worth at a glance",
    body:
      "Bridge ties everything together: total assets minus total debt. Add your savings, retirement, and investment accounts here so they roll into Net Worth.",
    tip: "The history graph plots Net Worth over time once you have a few snapshots. Snapshots auto-save when you change a balance.",
  },
  Utilities: {
    id: "Utilities",
    title: "Utilities — financial calculators",
    body:
      "Compound interest, loan payment, and emergency fund calculators. Use the sliders to explore 'what if' scenarios. The S&P 500 preset on the compound calculator gives you a realistic 7% baseline.",
    tip: "These are read-only tools — nothing here writes to your data.",
  },
  Profile: {
    id: "Profile",
    title: "Profile — your settings",
    body:
      "Theme, layout density, partner sync, import/export, and the How-To reference all live here. Your data stays on your device unless you explicitly export or pair with a partner.",
    tip: "Tap 'How to use BudgetArk' any time to replay these tips or read deeper how-to notes per tab.",
  },
};
