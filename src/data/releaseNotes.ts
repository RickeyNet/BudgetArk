export type ReleaseNote = {
  version: string;
  title: string;
  releasedAt: string;
  highlights: string[];
};

export const RELEASE_NOTES: readonly ReleaseNote[] = [
  {
    version: "1.0.3",
    title: "Shared Debt Planning and Budget Workflow Upgrades",
    releasedAt: "2026-03-08",
    highlights: [
      "Added debt ownership tracking (Mine, Partner, Joint) with filters and balance summaries for couples.",
      "Added explicit debt types (Credit/Personal vs Car/House) for Snowball ordering, plus bulk classification tools and review badges for inferred types.",
      "Added month/year pickers to debt and budget add/edit flows to replace manual date typing.",
      "Expanded budget categories with Grocery, Restaurant, Tech, Giving, Retirement, and Investing.",
      "Added a one-time Food split helper to migrate older Food entries into Grocery or Restaurant.",
    ],
  },
  {
    version: "1.0.2",
    title: "Payment History & Currency Options",
    releasedAt: "2026-03-07",
    highlights: [
      "Added Payment History view accessible from the Debt Tracker summary card, showing all recorded payments grouped by month with totals.",
      "Added \"The Ark\" theme — a warm cream and brown parchment-inspired color scheme.",
      "Added multiple currency and locale presets in Settings (USD, EUR, GBP, CAD, JPY).",
      "Applied locale-aware money formatting across Debt, Budget, Investment, and Payment History screens.",
      "Persisted currency preference in user profile and included it in data export/import backups.",
    ],
  },
  {
    version: "1.0.1",
    title: "Debt Payoff Tools",
    releasedAt: "2026-02-20",
    highlights: [
      "Added debt editing directly from each debt card.",
      "Added payoff strategies with Avalanche and Snowball prioritization modes.",
      "Added optional payoff goal dates with required monthly payment guidance.",
    ],
  },
  {
    version: "1.0.0",
    title: "Initial Release",
    releasedAt: "2026-02-10",
    highlights: [
      "Launched debt tracking with progress insights.",
      "Launched budget management with category views.",
      "Launched investment projections and theme selection.",
    ],
  },
] as const;

export const CURRENT_APP_VERSION = RELEASE_NOTES[0].version;
