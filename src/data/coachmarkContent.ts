/**
 * BudgetArk - Onboarding guide content (single source of truth).
 *
 * Every step here renders on TWO surfaces: the spotlight cards of the
 * guided onboarding tour (Spotlight.tsx via useTabCoachmark) and the
 * searchable Onboarding guide sheet (OnboardingGuideModal). The field
 * split is deliberate:
 *   - `body`   - concise (~40-55 words), what the spotlight card shows at
 *                a glance. Keep it short: it renders inside a tooltip.
 *   - `detail` - the long-form explanation shown in the guide and behind
 *                the card's "Learn more" toggle. This is where depth goes.
 *   - `location` - a where-to-find breadcrumb ("Debts tab → + button"),
 *                shown in the guide and in search results.
 *   - `keywords` - search-only synonyms a user might type ("credit card",
 *                "dark mode", "csv"). Lowercase; never rendered.
 * guideSearch.ts searches title + body + detail + location + keywords;
 * coachmarkContent.test.ts enforces that every step ships detail +
 * location, so new features can't land here half-documented.
 *
 * The COPY lives in the translation tree (src/i18n/locales/en/dataCoachmarks.ts
 * + the German twin), keyed by tab id + step id. Every text field here is a
 * getter that resolves through the global `t` at READ time, so the tour,
 * the guide and guide search all follow the active language and re-resolve
 * after a language switch. Ids, anchors and emoji stay in this file: step
 * ids are persisted by coachmarksStorage and must never change.
 */

import { t } from "../i18n/translate";

/** `keywords` is stored as one comma-separated string per language. */
const splitKeywords = (list: string): string[] =>
  list
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean);

export type CoachmarkStep = {
  id: string;
  /** Anchor id that the spotlight should focus on. If missing or unmeasurable, falls back to a centered card. */
  anchorId?: string;
  /** Hero emoji, feature-spotlight style - big on the tour card, inline in the guide. */
  emoji?: string;
  title: string;
  body: string;
  /** Long-form explanation for the guide + the card's "Learn more" toggle. */
  detail?: string;
  /** Where-to-find breadcrumb, e.g. "Debts tab → + button". */
  location?: string;
  /** Search-only synonyms (lowercase). Never rendered. */
  keywords?: string[];
};

export type CoachmarkTour = {
  tabId: string;
  /** Tab emoji for the guide's accordion headers and search-result eyebrows. */
  emoji: string;
  intro: string;
  steps: CoachmarkStep[];
};

export const COACHMARK_TAB_IDS = ["DebtTracker", "Budget", "Bridge", "Utilities", "Profile"] as const;

export type CoachmarkTabId = (typeof COACHMARK_TAB_IDS)[number];

export const COACHMARKS: Record<CoachmarkTabId, CoachmarkTour> = {
  DebtTracker: {
    tabId: "DebtTracker",
    emoji: "⛓️",
    get intro() {
      return t("data.coachmarks.DebtTracker.intro");
    },
    steps: [
      {
        id: "debts-summary",
        anchorId: "debts-summary-card",
        emoji: "📊",
        get title() {
          return t("data.coachmarks.DebtTracker.steps.debts-summary.title");
        },
        get body() {
          return t("data.coachmarks.DebtTracker.steps.debts-summary.body");
        },
        get detail() {
          return t("data.coachmarks.DebtTracker.steps.debts-summary.detail");
        },
        get location() {
          return t("data.coachmarks.DebtTracker.steps.debts-summary.location");
        },
        get keywords() {
          return splitKeywords(t("data.coachmarks.DebtTracker.steps.debts-summary.keywords"));
        },
      },
      {
        id: "debts-fab",
        anchorId: "debts-fab",
        emoji: "➕",
        get title() {
          return t("data.coachmarks.DebtTracker.steps.debts-fab.title");
        },
        get body() {
          return t("data.coachmarks.DebtTracker.steps.debts-fab.body");
        },
        get detail() {
          return t("data.coachmarks.DebtTracker.steps.debts-fab.detail");
        },
        get location() {
          return t("data.coachmarks.DebtTracker.steps.debts-fab.location");
        },
        get keywords() {
          return splitKeywords(t("data.coachmarks.DebtTracker.steps.debts-fab.keywords"));
        },
      },
      {
        id: "debts-payments",
        emoji: "💵",
        get title() {
          return t("data.coachmarks.DebtTracker.steps.debts-payments.title");
        },
        get body() {
          return t("data.coachmarks.DebtTracker.steps.debts-payments.body");
        },
        get detail() {
          return t("data.coachmarks.DebtTracker.steps.debts-payments.detail");
        },
        get location() {
          return t("data.coachmarks.DebtTracker.steps.debts-payments.location");
        },
        get keywords() {
          return splitKeywords(t("data.coachmarks.DebtTracker.steps.debts-payments.keywords"));
        },
      },
      {
        id: "debts-keepalive",
        emoji: "💳",
        get title() {
          return t("data.coachmarks.DebtTracker.steps.debts-keepalive.title");
        },
        get body() {
          return t("data.coachmarks.DebtTracker.steps.debts-keepalive.body");
        },
        get detail() {
          return t("data.coachmarks.DebtTracker.steps.debts-keepalive.detail");
        },
        get location() {
          return t("data.coachmarks.DebtTracker.steps.debts-keepalive.location");
        },
        get keywords() {
          return splitKeywords(t("data.coachmarks.DebtTracker.steps.debts-keepalive.keywords"));
        },
      },
      {
        id: "debts-strategy",
        emoji: "🎯",
        get title() {
          return t("data.coachmarks.DebtTracker.steps.debts-strategy.title");
        },
        get body() {
          return t("data.coachmarks.DebtTracker.steps.debts-strategy.body");
        },
        get detail() {
          return t("data.coachmarks.DebtTracker.steps.debts-strategy.detail");
        },
        get location() {
          return t("data.coachmarks.DebtTracker.steps.debts-strategy.location");
        },
        get keywords() {
          return splitKeywords(t("data.coachmarks.DebtTracker.steps.debts-strategy.keywords"));
        },
      },
      {
        id: "debts-milestones",
        anchorId: "debts-milestones-card",
        emoji: "🚢",
        get title() {
          return t("data.coachmarks.DebtTracker.steps.debts-milestones.title");
        },
        get body() {
          return t("data.coachmarks.DebtTracker.steps.debts-milestones.body");
        },
        get detail() {
          return t("data.coachmarks.DebtTracker.steps.debts-milestones.detail");
        },
        get location() {
          return t("data.coachmarks.DebtTracker.steps.debts-milestones.location");
        },
        get keywords() {
          return splitKeywords(t("data.coachmarks.DebtTracker.steps.debts-milestones.keywords"));
        },
      },
    ],
  },
  Budget: {
    tabId: "Budget",
    emoji: "💰",
    get intro() {
      return t("data.coachmarks.Budget.intro");
    },
    steps: [
      {
        id: "budget-summary",
        anchorId: "budget-summary-card",
        emoji: "⚖️",
        get title() {
          return t("data.coachmarks.Budget.steps.budget-summary.title");
        },
        get body() {
          return t("data.coachmarks.Budget.steps.budget-summary.body");
        },
        get detail() {
          return t("data.coachmarks.Budget.steps.budget-summary.detail");
        },
        get location() {
          return t("data.coachmarks.Budget.steps.budget-summary.location");
        },
        get keywords() {
          return splitKeywords(t("data.coachmarks.Budget.steps.budget-summary.keywords"));
        },
      },
      {
        id: "budget-cashflow",
        emoji: "💵",
        get title() {
          return t("data.coachmarks.Budget.steps.budget-cashflow.title");
        },
        get body() {
          return t("data.coachmarks.Budget.steps.budget-cashflow.body");
        },
        get detail() {
          return t("data.coachmarks.Budget.steps.budget-cashflow.detail");
        },
        get location() {
          return t("data.coachmarks.Budget.steps.budget-cashflow.location");
        },
        get keywords() {
          return splitKeywords(t("data.coachmarks.Budget.steps.budget-cashflow.keywords"));
        },
      },
      {
        id: "budget-spending",
        anchorId: "budget-spending-card",
        emoji: "🍩",
        get title() {
          return t("data.coachmarks.Budget.steps.budget-spending.title");
        },
        get body() {
          return t("data.coachmarks.Budget.steps.budget-spending.body");
        },
        get detail() {
          return t("data.coachmarks.Budget.steps.budget-spending.detail");
        },
        get location() {
          return t("data.coachmarks.Budget.steps.budget-spending.location");
        },
        get keywords() {
          return splitKeywords(t("data.coachmarks.Budget.steps.budget-spending.keywords"));
        },
      },
      {
        id: "budget-fab",
        anchorId: "budget-fab",
        emoji: "✏️",
        get title() {
          return t("data.coachmarks.Budget.steps.budget-fab.title");
        },
        get body() {
          return t("data.coachmarks.Budget.steps.budget-fab.body");
        },
        get detail() {
          return t("data.coachmarks.Budget.steps.budget-fab.detail");
        },
        get location() {
          return t("data.coachmarks.Budget.steps.budget-fab.location");
        },
        get keywords() {
          return splitKeywords(t("data.coachmarks.Budget.steps.budget-fab.keywords"));
        },
      },
      {
        id: "budget-widget",
        emoji: "📱",
        get title() {
          return t("data.coachmarks.Budget.steps.budget-widget.title");
        },
        get body() {
          return t("data.coachmarks.Budget.steps.budget-widget.body");
        },
        get detail() {
          return t("data.coachmarks.Budget.steps.budget-widget.detail");
        },
        get location() {
          return t("data.coachmarks.Budget.steps.budget-widget.location");
        },
        get keywords() {
          return splitKeywords(t("data.coachmarks.Budget.steps.budget-widget.keywords"));
        },
      },
      {
        id: "budget-inbox",
        emoji: "📥",
        get title() {
          return t("data.coachmarks.Budget.steps.budget-inbox.title");
        },
        get body() {
          return t("data.coachmarks.Budget.steps.budget-inbox.body");
        },
        get detail() {
          return t("data.coachmarks.Budget.steps.budget-inbox.detail");
        },
        get location() {
          return t("data.coachmarks.Budget.steps.budget-inbox.location");
        },
        get keywords() {
          return splitKeywords(t("data.coachmarks.Budget.steps.budget-inbox.keywords"));
        },
      },
      {
        id: "budget-receipts",
        emoji: "🧾",
        get title() {
          return t("data.coachmarks.Budget.steps.budget-receipts.title");
        },
        get body() {
          return t("data.coachmarks.Budget.steps.budget-receipts.body");
        },
        get detail() {
          return t("data.coachmarks.Budget.steps.budget-receipts.detail");
        },
        get location() {
          return t("data.coachmarks.Budget.steps.budget-receipts.location");
        },
        get keywords() {
          return splitKeywords(t("data.coachmarks.Budget.steps.budget-receipts.keywords"));
        },
      },
    ],
  },
  Bridge: {
    tabId: "Bridge",
    emoji: "🧭",
    get intro() {
      return t("data.coachmarks.Bridge.intro");
    },
    steps: [
      {
        id: "bridge-history",
        anchorId: "bridge-history-card",
        emoji: "📈",
        get title() {
          return t("data.coachmarks.Bridge.steps.bridge-history.title");
        },
        get body() {
          return t("data.coachmarks.Bridge.steps.bridge-history.body");
        },
        get detail() {
          return t("data.coachmarks.Bridge.steps.bridge-history.detail");
        },
        get location() {
          return t("data.coachmarks.Bridge.steps.bridge-history.location");
        },
        get keywords() {
          return splitKeywords(t("data.coachmarks.Bridge.steps.bridge-history.keywords"));
        },
      },
      {
        id: "bridge-accounts",
        anchorId: "bridge-accounts-card",
        emoji: "🏦",
        get title() {
          return t("data.coachmarks.Bridge.steps.bridge-accounts.title");
        },
        get body() {
          return t("data.coachmarks.Bridge.steps.bridge-accounts.body");
        },
        get detail() {
          return t("data.coachmarks.Bridge.steps.bridge-accounts.detail");
        },
        get location() {
          return t("data.coachmarks.Bridge.steps.bridge-accounts.location");
        },
        get keywords() {
          return splitKeywords(t("data.coachmarks.Bridge.steps.bridge-accounts.keywords"));
        },
      },
      {
        id: "bridge-changes",
        emoji: "🌊",
        get title() {
          return t("data.coachmarks.Bridge.steps.bridge-changes.title");
        },
        get body() {
          return t("data.coachmarks.Bridge.steps.bridge-changes.body");
        },
        get detail() {
          return t("data.coachmarks.Bridge.steps.bridge-changes.detail");
        },
        get location() {
          return t("data.coachmarks.Bridge.steps.bridge-changes.location");
        },
        get keywords() {
          return splitKeywords(t("data.coachmarks.Bridge.steps.bridge-changes.keywords"));
        },
      },
      {
        id: "bridge-plans",
        emoji: "🛍️",
        get title() {
          return t("data.coachmarks.Bridge.steps.bridge-plans.title");
        },
        get body() {
          return t("data.coachmarks.Bridge.steps.bridge-plans.body");
        },
        get detail() {
          return t("data.coachmarks.Bridge.steps.bridge-plans.detail");
        },
        get location() {
          return t("data.coachmarks.Bridge.steps.bridge-plans.location");
        },
        get keywords() {
          return splitKeywords(t("data.coachmarks.Bridge.steps.bridge-plans.keywords"));
        },
      },
      {
        id: "bridge-holdings",
        emoji: "💹",
        get title() {
          return t("data.coachmarks.Bridge.steps.bridge-holdings.title");
        },
        get body() {
          return t("data.coachmarks.Bridge.steps.bridge-holdings.body");
        },
        get detail() {
          return t("data.coachmarks.Bridge.steps.bridge-holdings.detail");
        },
        get location() {
          return t("data.coachmarks.Bridge.steps.bridge-holdings.location");
        },
        get keywords() {
          return splitKeywords(t("data.coachmarks.Bridge.steps.bridge-holdings.keywords"));
        },
      },
    ],
  },
  Utilities: {
    tabId: "Utilities",
    emoji: "📈",
    get intro() {
      return t("data.coachmarks.Utilities.intro");
    },
    steps: [
      {
        id: "charts-course",
        emoji: "🎓",
        get title() {
          return t("data.coachmarks.Utilities.steps.charts-course.title");
        },
        get body() {
          return t("data.coachmarks.Utilities.steps.charts-course.body");
        },
        get detail() {
          return t("data.coachmarks.Utilities.steps.charts-course.detail");
        },
        get location() {
          return t("data.coachmarks.Utilities.steps.charts-course.location");
        },
        get keywords() {
          return splitKeywords(t("data.coachmarks.Utilities.steps.charts-course.keywords"));
        },
      },
      {
        id: "utilities-tool",
        anchorId: "utilities-tool-header",
        emoji: "🧮",
        get title() {
          return t("data.coachmarks.Utilities.steps.utilities-tool.title");
        },
        get body() {
          return t("data.coachmarks.Utilities.steps.utilities-tool.body");
        },
        get detail() {
          return t("data.coachmarks.Utilities.steps.utilities-tool.detail");
        },
        get location() {
          return t("data.coachmarks.Utilities.steps.utilities-tool.location");
        },
        get keywords() {
          return splitKeywords(t("data.coachmarks.Utilities.steps.utilities-tool.keywords"));
        },
      },
      {
        id: "charts-what-if",
        emoji: "🔮",
        get title() {
          return t("data.coachmarks.Utilities.steps.charts-what-if.title");
        },
        get body() {
          return t("data.coachmarks.Utilities.steps.charts-what-if.body");
        },
        get detail() {
          return t("data.coachmarks.Utilities.steps.charts-what-if.detail");
        },
        get location() {
          return t("data.coachmarks.Utilities.steps.charts-what-if.location");
        },
        get keywords() {
          return splitKeywords(t("data.coachmarks.Utilities.steps.charts-what-if.keywords"));
        },
      },
      {
        id: "charts-purchase",
        emoji: "🛒",
        get title() {
          return t("data.coachmarks.Utilities.steps.charts-purchase.title");
        },
        get body() {
          return t("data.coachmarks.Utilities.steps.charts-purchase.body");
        },
        get detail() {
          return t("data.coachmarks.Utilities.steps.charts-purchase.detail");
        },
        get location() {
          return t("data.coachmarks.Utilities.steps.charts-purchase.location");
        },
        get keywords() {
          return splitKeywords(t("data.coachmarks.Utilities.steps.charts-purchase.keywords"));
        },
      },
    ],
  },
  Profile: {
    tabId: "Profile",
    emoji: "⚙️",
    get intro() {
      return t("data.coachmarks.Profile.intro");
    },
    steps: [
      {
        id: "profile-appearance",
        anchorId: "profile-appearance-card",
        emoji: "🎨",
        get title() {
          return t("data.coachmarks.Profile.steps.profile-appearance.title");
        },
        get body() {
          return t("data.coachmarks.Profile.steps.profile-appearance.body");
        },
        get detail() {
          return t("data.coachmarks.Profile.steps.profile-appearance.detail");
        },
        get location() {
          return t("data.coachmarks.Profile.steps.profile-appearance.location");
        },
        get keywords() {
          return splitKeywords(t("data.coachmarks.Profile.steps.profile-appearance.keywords"));
        },
      },
      {
        id: "profile-connections",
        emoji: "🔗",
        get title() {
          return t("data.coachmarks.Profile.steps.profile-connections.title");
        },
        get body() {
          return t("data.coachmarks.Profile.steps.profile-connections.body");
        },
        get detail() {
          return t("data.coachmarks.Profile.steps.profile-connections.detail");
        },
        get location() {
          return t("data.coachmarks.Profile.steps.profile-connections.location");
        },
        get keywords() {
          return splitKeywords(t("data.coachmarks.Profile.steps.profile-connections.keywords"));
        },
      },
      {
        id: "profile-sync-data",
        emoji: "🔄",
        get title() {
          return t("data.coachmarks.Profile.steps.profile-sync-data.title");
        },
        get body() {
          return t("data.coachmarks.Profile.steps.profile-sync-data.body");
        },
        get detail() {
          return t("data.coachmarks.Profile.steps.profile-sync-data.detail");
        },
        get location() {
          return t("data.coachmarks.Profile.steps.profile-sync-data.location");
        },
        get keywords() {
          return splitKeywords(t("data.coachmarks.Profile.steps.profile-sync-data.keywords"));
        },
      },
      {
        id: "profile-extras",
        emoji: "🏆",
        get title() {
          return t("data.coachmarks.Profile.steps.profile-extras.title");
        },
        get body() {
          return t("data.coachmarks.Profile.steps.profile-extras.body");
        },
        get detail() {
          return t("data.coachmarks.Profile.steps.profile-extras.detail");
        },
        get location() {
          return t("data.coachmarks.Profile.steps.profile-extras.location");
        },
        get keywords() {
          return splitKeywords(t("data.coachmarks.Profile.steps.profile-extras.keywords"));
        },
      },
      {
        id: "profile-help",
        anchorId: "profile-help-card",
        emoji: "🗺️",
        get title() {
          return t("data.coachmarks.Profile.steps.profile-help.title");
        },
        get body() {
          return t("data.coachmarks.Profile.steps.profile-help.body");
        },
        get detail() {
          return t("data.coachmarks.Profile.steps.profile-help.detail");
        },
        get location() {
          return t("data.coachmarks.Profile.steps.profile-help.location");
        },
        get keywords() {
          return splitKeywords(t("data.coachmarks.Profile.steps.profile-help.keywords"));
        },
      },
    ],
  },
};
