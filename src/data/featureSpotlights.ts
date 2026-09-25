/**
 * BudgetArk - Feature Spotlights
 * File: src/data/featureSpotlights.ts
 *
 * Curated "debut" content for marquee features, shown once as a swipeable
 * carousel after an update (see FeatureSpotlightModal + App.tsx). This is
 * deliberately separate from RELEASE_NOTES: notes are the exhaustive
 * changelog, spotlights are the 3-5 things worth a guided introduction,
 * each with a call-to-action that deep-links straight into the feature.
 *
 * Seen-state is tracked PER FEATURE, not per version (see
 * featureSpotlightStorage). That matters because some features ship dormant
 * in an OTA bundle and only come alive when the store build with their
 * native modules arrives - `requiresRuntimeVersion` gates those, so their
 * debut waits until the feature actually works on this install.
 *
 * Title, blurb and CTA label live in the translation tree
 * (src/i18n/locales/en/dataSpotlights.ts + the German twin), keyed by
 * spotlight id, and are exposed here as getters that resolve through the
 * global `t` at read time - so the carousel follows the active language.
 * Ids, versions, icons and CTA targets stay in this file.
 */

import { compareVersions } from "../utils/versionGuard";
import { t } from "../i18n/translate";

/** Profile-screen surfaces a spotlight CTA (or the openSection deep link) can open. */
export type ProfileSpotlightSection =
  | "connections"
  | "businesses"
  | "people"
  | "owedToYou"
  | "tipJar"
  | "trackingReminders"
  | "theme"
  | "appLock"
  | "data"
  | "language";

export type SpotlightCta =
  | { label: string; kind: "profile-section"; section: ProfileSpotlightSection }
  | { label: string; kind: "budget-add-entry" }
  | { label: string; kind: "budget" }
  | { label: string; kind: "bridge" }
  | { label: string; kind: "charts" }
  | { label: string; kind: "debt-tracker" };

export type FeatureSpotlight = {
  /** Stable id - persisted in seen/acked storage, never rename after release. */
  id: string;
  /**
   * Ids of earlier spotlights this one replaced (slides merged after
   * release). A user who has seen or acked ANY of them is treated as having
   * seen/acked this one, so a merge never re-debuts or re-badges a feature.
   * The old ids stay in storage untouched.
   */
  supersedes?: readonly string[];
  /** Version the feature debuted in; shown on the slide's "NEW IN x.y.z" pill. */
  sinceVersion: string;
  /**
   * Minimum native runtimeVersion the feature needs (features whose release
   * note says "requires this update from the app store"). Omit for features
   * that work via OTA alone. Compared against Updates.runtimeVersion;
   * fail-open when the current runtime is unknown (dev builds).
   */
  requiresRuntimeVersion?: string;
  /**
   * True for features that get a NEW badge on their Profile row but no
   * carousel slide (minor features that shouldn't dilute the debut).
   */
  badgeOnly?: boolean;
  /** Big emoji rendered as the slide's hero. */
  icon: string;
  title: string;
  /** Two sentences max - the carousel is a teaser, not the changelog. */
  blurb: string;
  cta?: SpotlightCta;
};

export const FEATURE_SPOTLIGHTS: readonly FeatureSpotlight[] = [
  {
    id: "german-language",
    sinceVersion: "1.11.0",
    // expo-localization is native: the language picker only exists in the
    // 1.11.0 store build.
    requiresRuntimeVersion: "1.11.0",
    icon: "🌐",
    get title() {
      return t("data.spotlights.german-language.title");
    },
    get blurb() {
      return t("data.spotlights.german-language.blurb");
    },
    cta: {
      get label() {
        return t("data.spotlights.german-language.cta");
      },
      kind: "profile-section",
      section: "language",
    },
  },
  {
    id: "bill-fulfillment",
    sinceVersion: "1.10.0",
    icon: "🧾",
    get title() {
      return t("data.spotlights.bill-fulfillment.title");
    },
    get blurb() {
      return t("data.spotlights.bill-fulfillment.blurb");
    },
    cta: {
      get label() {
        return t("data.spotlights.bill-fulfillment.cta");
      },
      kind: "budget-add-entry",
    },
  },
  {
    id: "bank-card-balances",
    sinceVersion: "1.10.0",
    icon: "💳",
    get title() {
      return t("data.spotlights.bank-card-balances.title");
    },
    get blurb() {
      return t("data.spotlights.bank-card-balances.blurb");
    },
    cta: {
      get label() {
        return t("data.spotlights.bank-card-balances.cta");
      },
      kind: "debt-tracker",
    },
  },
  {
    id: "cash-flow-budget",
    sinceVersion: "1.9.0",
    icon: "💵",
    get title() {
      return t("data.spotlights.cash-flow-budget.title");
    },
    get blurb() {
      return t("data.spotlights.cash-flow-budget.blurb");
    },
  },
  {
    id: "private-entries",
    sinceVersion: "1.9.0",
    icon: "🔒",
    get title() {
      return t("data.spotlights.private-entries.title");
    },
    get blurb() {
      return t("data.spotlights.private-entries.blurb");
    },
    cta: {
      get label() {
        return t("data.spotlights.private-entries.cta");
      },
      kind: "budget-add-entry",
    },
  },
  {
    id: "card-keep-alive",
    sinceVersion: "1.9.0",
    // The in-app banner works via OTA, but the reminder notifications need
    // the expo-notifications runtime - same gate as tracking-reminders.
    requiresRuntimeVersion: "1.9.0",
    icon: "💳",
    get title() {
      return t("data.spotlights.card-keep-alive.title");
    },
    get blurb() {
      return t("data.spotlights.card-keep-alive.blurb");
    },
    cta: {
      get label() {
        return t("data.spotlights.card-keep-alive.cta");
      },
      kind: "debt-tracker",
    },
  },
  {
    id: "income-types",
    sinceVersion: "1.9.0",
    icon: "💵",
    get title() {
      return t("data.spotlights.income-types.title");
    },
    get blurb() {
      return t("data.spotlights.income-types.blurb");
    },
    cta: {
      get label() {
        return t("data.spotlights.income-types.cta");
      },
      kind: "budget-add-entry",
    },
  },
  {
    id: "bank-connections",
    sinceVersion: "1.9.0",
    icon: "🏦",
    get title() {
      return t("data.spotlights.bank-connections.title");
    },
    get blurb() {
      return t("data.spotlights.bank-connections.blurb");
    },
    cta: {
      get label() {
        return t("data.spotlights.bank-connections.cta");
      },
      kind: "profile-section", section: "connections",
    },
  },
  {
    id: "business-expenses",
    sinceVersion: "1.9.0",
    icon: "💼",
    get title() {
      return t("data.spotlights.business-expenses.title");
    },
    get blurb() {
      return t("data.spotlights.business-expenses.blurb");
    },
    cta: {
      get label() {
        return t("data.spotlights.business-expenses.cta");
      },
      kind: "profile-section", section: "businesses",
    },
  },
  {
    id: "people-assignment",
    sinceVersion: "1.9.0",
    icon: "👤",
    get title() {
      return t("data.spotlights.people-assignment.title");
    },
    get blurb() {
      return t("data.spotlights.people-assignment.blurb");
    },
    cta: {
      get label() {
        return t("data.spotlights.people-assignment.cta");
      },
      kind: "profile-section", section: "people",
    },
  },
  {
    id: "receipt-photos",
    sinceVersion: "1.9.0",
    requiresRuntimeVersion: "1.9.0",
    icon: "🧾",
    get title() {
      return t("data.spotlights.receipt-photos.title");
    },
    get blurb() {
      return t("data.spotlights.receipt-photos.blurb");
    },
    cta: {
      get label() {
        return t("data.spotlights.receipt-photos.cta");
      },
      kind: "budget-add-entry",
    },
  },
  {
    id: "tracking-reminders",
    sinceVersion: "1.9.0",
    requiresRuntimeVersion: "1.9.0",
    icon: "⏰",
    get title() {
      return t("data.spotlights.tracking-reminders.title");
    },
    get blurb() {
      return t("data.spotlights.tracking-reminders.blurb");
    },
    cta: {
      get label() {
        return t("data.spotlights.tracking-reminders.cta");
      },
      kind: "profile-section", section: "trackingReminders",
    },
  },
  {
    id: "account-change-tracker",
    sinceVersion: "1.9.0",
    icon: "📈",
    get title() {
      return t("data.spotlights.account-change-tracker.title");
    },
    get blurb() {
      return t("data.spotlights.account-change-tracker.blurb");
    },
    cta: {
      get label() {
        return t("data.spotlights.account-change-tracker.cta");
      },
      kind: "bridge",
    },
  },
  {
    id: "what-if-spending",
    sinceVersion: "1.9.0",
    icon: "🔮",
    get title() {
      return t("data.spotlights.what-if-spending.title");
    },
    get blurb() {
      return t("data.spotlights.what-if-spending.blurb");
    },
    cta: {
      get label() {
        return t("data.spotlights.what-if-spending.cta");
      },
      kind: "charts",
    },
  },
  {
    id: "purchase-planner",
    sinceVersion: "1.9.0",
    icon: "🛒",
    get title() {
      return t("data.spotlights.purchase-planner.title");
    },
    get blurb() {
      return t("data.spotlights.purchase-planner.blurb");
    },
    cta: {
      get label() {
        return t("data.spotlights.purchase-planner.cta");
      },
      kind: "charts",
    },
  },
  {
    id: "take-home-pay",
    sinceVersion: "1.9.0",
    icon: "🧮",
    get title() {
      return t("data.spotlights.take-home-pay.title");
    },
    get blurb() {
      return t("data.spotlights.take-home-pay.blurb");
    },
    cta: {
      get label() {
        return t("data.spotlights.take-home-pay.cta");
      },
      kind: "charts",
    },
  },
  {
    id: "app-lock",
    sinceVersion: "1.9.0",
    icon: "🔐",
    get title() {
      return t("data.spotlights.app-lock.title");
    },
    get blurb() {
      return t("data.spotlights.app-lock.blurb");
    },
    cta: {
      get label() {
        return t("data.spotlights.app-lock.cta");
      },
      kind: "profile-section", section: "appLock",
    },
  },
  {
    id: "theme-fleet",
    sinceVersion: "1.9.0",
    // Replaces the three 1.9.0 theme slides (Deep Sea / Slate & Classic /
    // the four-themes batch) with one. Anyone who saw or acked those must
    // not be shown this one as new - hence `supersedes`.
    supersedes: ["deep-sea-theme", "slate-classic-themes", "four-themes"],
    icon: "🎨",
    get title() {
      return t("data.spotlights.theme-fleet.title");
    },
    get blurb() {
      return t("data.spotlights.theme-fleet.blurb");
    },
    cta: {
      get label() {
        return t("data.spotlights.theme-fleet.cta");
      },
      kind: "profile-section", section: "theme",
    },
  },
  {
    id: "subscription-detective",
    sinceVersion: "1.10.1",
    icon: "🕵️",
    get title() {
      return t("data.spotlights.subscription-detective.title");
    },
    get blurb() {
      return t("data.spotlights.subscription-detective.blurb");
    },
    cta: {
      get label() {
        return t("data.spotlights.subscription-detective.cta");
      },
      kind: "charts",
    },
  },
  {
    id: "owed-to-you",
    sinceVersion: "1.10.1",
    icon: "🤝",
    get title() {
      return t("data.spotlights.owed-to-you.title");
    },
    get blurb() {
      return t("data.spotlights.owed-to-you.blurb");
    },
    cta: {
      get label() {
        return t("data.spotlights.owed-to-you.cta");
      },
      kind: "profile-section", section: "owedToYou",
    },
  },
  {
    id: "net-worth-goal",
    sinceVersion: "1.10.1",
    icon: "🧭",
    get title() {
      return t("data.spotlights.net-worth-goal.title");
    },
    get blurb() {
      return t("data.spotlights.net-worth-goal.blurb");
    },
    cta: {
      get label() {
        return t("data.spotlights.net-worth-goal.cta");
      },
      kind: "bridge",
    },
  },
  {
    id: "paycheck-cycle",
    sinceVersion: "1.10.1",
    icon: "📆",
    get title() {
      return t("data.spotlights.paycheck-cycle.title");
    },
    get blurb() {
      return t("data.spotlights.paycheck-cycle.blurb");
    },
    cta: {
      get label() {
        return t("data.spotlights.paycheck-cycle.cta");
      },
      kind: "budget",
    },
  },
  {
    id: "quarterly-taxes",
    sinceVersion: "1.10.1",
    icon: "🧾",
    get title() {
      return t("data.spotlights.quarterly-taxes.title");
    },
    get blurb() {
      return t("data.spotlights.quarterly-taxes.blurb");
    },
    cta: {
      get label() {
        return t("data.spotlights.quarterly-taxes.cta");
      },
      kind: "charts",
    },
  },
  {
    id: "purchase-plan-priorities",
    sinceVersion: "1.10.1",
    icon: "🎯",
    get title() {
      return t("data.spotlights.purchase-plan-priorities.title");
    },
    get blurb() {
      return t("data.spotlights.purchase-plan-priorities.blurb");
    },
    cta: {
      get label() {
        return t("data.spotlights.purchase-plan-priorities.cta");
      },
      kind: "bridge",
    },
  },
  {
    id: "bank-statement-import",
    sinceVersion: "1.10.2",
    icon: "🏦",
    get title() {
      return t("data.spotlights.bank-statement-import.title");
    },
    get blurb() {
      return t("data.spotlights.bank-statement-import.blurb");
    },
    cta: {
      get label() {
        return t("data.spotlights.bank-statement-import.cta");
      },
      kind: "profile-section", section: "data",
    },
  },
  {
    id: "tip-jar",
    sinceVersion: "1.9.0",
    requiresRuntimeVersion: "1.9.0",
    badgeOnly: true,
    icon: "💛",
    get title() {
      return t("data.spotlights.tip-jar.title");
    },
    get blurb() {
      return t("data.spotlights.tip-jar.blurb");
    },
  },
];

export const ALL_SPOTLIGHT_IDS: readonly string[] = FEATURE_SPOTLIGHTS.map(
  (spotlight) => spotlight.id
);

/**
 * Whether the feature behind a spotlight actually works on this install.
 * Fail-open on unknown current runtime (dev builds report none), fail-closed
 * on an older store build - the debut waits for the build that enables it.
 */
export const isSpotlightAvailable = (
  spotlight: FeatureSpotlight,
  currentRuntimeVersion: string | undefined
): boolean => {
  if (!spotlight.requiresRuntimeVersion) return true;
  if (!currentRuntimeVersion) return true;
  return (
    compareVersions(currentRuntimeVersion, spotlight.requiresRuntimeVersion) >= 0
  );
};

/**
 * Whether a stored id set (seen or acked) covers a spotlight - directly, or
 * through any spotlight it superseded.
 */
const isSpotlightCovered = (
  spotlight: FeatureSpotlight,
  ids: ReadonlySet<string>
): boolean =>
  ids.has(spotlight.id) ||
  (spotlight.supersedes?.some((legacyId) => ids.has(legacyId)) ?? false);

/** Carousel slides still owed to this user, in declaration order. */
export const selectUnseenSpotlights = (
  spotlights: readonly FeatureSpotlight[],
  seenIds: readonly string[],
  currentRuntimeVersion: string | undefined
): FeatureSpotlight[] => {
  const seen = new Set(seenIds);
  return spotlights.filter(
    (spotlight) =>
      !spotlight.badgeOnly &&
      !isSpotlightCovered(spotlight, seen) &&
      isSpotlightAvailable(spotlight, currentRuntimeVersion)
  );
};

/**
 * The full tour for the Profile "Feature tour" replay row: every
 * carousel-worthy spotlight that works on this install, seen or not.
 * Mirrors selectUnseenSpotlights minus the seen filter so a user can
 * rewatch debuts they skipped or want to revisit.
 */
export const selectReplaySpotlights = (
  spotlights: readonly FeatureSpotlight[],
  currentRuntimeVersion: string | undefined
): FeatureSpotlight[] =>
  spotlights.filter(
    (spotlight) =>
      !spotlight.badgeOnly &&
      isSpotlightAvailable(spotlight, currentRuntimeVersion)
  );

/** Ids whose Profile rows should show a NEW badge (until first tapped). */
export const selectNewBadgeIds = (
  spotlights: readonly FeatureSpotlight[],
  ackedIds: readonly string[],
  currentRuntimeVersion: string | undefined
): string[] => {
  const acked = new Set(ackedIds);
  return spotlights
    .filter(
      (spotlight) =>
        !isSpotlightCovered(spotlight, acked) &&
        isSpotlightAvailable(spotlight, currentRuntimeVersion)
    )
    .map((spotlight) => spotlight.id);
};
