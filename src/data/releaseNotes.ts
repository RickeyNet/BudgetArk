export type ReleaseNote = {
  version: string;
  title: string;
  releasedAt: string;
  highlights: string[];
};

export const RELEASE_NOTES: readonly ReleaseNote[] = [
  {
    version: "1.0.4",
    title: "Debt Milestones and UX Polish",
    releasedAt: "2026-03-09",
    highlights: [
      "Added a new Debt Milestones planner with progress tracking, current-step focus, and completion management.",
      "Added editable milestone targets with quick adjust chips (+100, +250, +500, -100).",
      "Completed milestones now collapse into concise cards with congratulatory messages; future steps are collapsed by default and expandable on tap.",
      "Debt Milestones modal is now full-screen with larger text and touch targets for improved readability.",
      "Added monthly recurring toggle to budget entries — mark fixed expenses like rent or subscriptions so they automatically appear in every future month.",
      "Improved debt and budget modal button visibility on Android devices with bottom navigation bars to avoid keyboard overlap.",
      "Updated budget category options by adding Fitness and removing Food from add/edit selection bubbles.",
      "Fixed button text contrast on The Ark theme — accent buttons now use a readable tan instead of black.",
      "Fixed milestone action buttons (Set Current, Reopen Step, etc.) being unreadable on dark themes.",
      "Theme picker cards now preview each theme's own colors, ensuring names are always readable regardless of active theme.",
    ],
  },
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
