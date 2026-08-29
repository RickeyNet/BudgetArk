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
 */

import { compareVersions } from "../utils/versionGuard";

/** Profile-screen surfaces a spotlight CTA (or the openSection deep link) can open. */
export type ProfileSpotlightSection =
  | "connections"
  | "businesses"
  | "people"
  | "tipJar"
  | "trackingReminders"
  | "theme"
  | "appLock";

export type SpotlightCta =
  | { label: string; kind: "profile-section"; section: ProfileSpotlightSection }
  | { label: string; kind: "budget-add-entry" }
  | { label: string; kind: "bridge" }
  | { label: string; kind: "charts" }
  | { label: string; kind: "debt-tracker" };

export type FeatureSpotlight = {
  /** Stable id - persisted in seen/acked storage, never rename after release. */
  id: string;
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
    id: "bank-card-balances",
    sinceVersion: "1.10.0",
    icon: "💳",
    title: "Credit cards that track themselves",
    blurb:
      "Link a card on the Debts tab to the bank account behind it and its balance updates after every sync - the same link that stamps the card's last use for the keep-alive watch. One pick per card, and debt tracking mostly runs itself.",
    cta: { label: "Link a card", kind: "debt-tracker" },
  },
  {
    id: "cash-flow-budget",
    sinceVersion: "1.9.0",
    icon: "💵",
    title: "Know what's safe to spend",
    blurb:
      "Tell BudgetArk what's in checking at the start of the month, and the Budget tab projects where the month ends - income in, bills and debt minimums out - with a real safe-to-spend number instead of a guess.",
  },
  {
    id: "private-entries",
    sinceVersion: "1.9.0",
    icon: "🔒",
    title: "Some spending is just yours",
    blurb:
      "Mark any budget entry Private and it never syncs to your partner's device - perfect for gifts and surprises. It still counts in your own budget and rides your backups; only the sharing changes.",
    cta: { label: "Add a private entry", kind: "budget-add-entry" },
  },
  {
    id: "card-keep-alive",
    sinceVersion: "1.9.0",
    // The in-app banner works via OTA, but the reminder notifications need
    // the expo-notifications runtime - same gate as tracking-reminders.
    requiresRuntimeVersion: "1.9.0",
    icon: "💳",
    title: "Don't let a quiet card get closed",
    blurb:
      "Issuers can close a credit card that sits unused - and your credit score takes the hit. Turn on the keep-alive watch for any card and BudgetArk warns you before its inactivity window runs out, right on your Bridge.",
    cta: { label: "Set up a card watch", kind: "debt-tracker" },
  },
  {
    id: "income-types",
    sinceVersion: "1.9.0",
    icon: "💵",
    title: "W-2 or 1099? Tag your paychecks",
    blurb:
      "Mark income as a W-2 paycheck or 1099 contractor pay. W-2 entries can track the 401(k) withheld from each check, and 1099 entries show exactly how much to set aside for taxes - totaled monthly on your Budget.",
    cta: { label: "Log a paycheck", kind: "budget-add-entry" },
  },
  {
    id: "bank-connections",
    sinceVersion: "1.9.0",
    icon: "🏦",
    title: "Your bank, on autopilot",
    blurb:
      "Connect your bank and let transactions import themselves - nothing enters your budget until you approve it in the Review Inbox. Your credentials stay encrypted on this device; BudgetArk has no server and never sits between you and your bank.",
    cta: {
      label: "Set up a connection",
      kind: "profile-section",
      section: "connections",
    },
  },
  {
    id: "business-expenses",
    sinceVersion: "1.9.0",
    icon: "💼",
    title: "Business expenses, sorted",
    blurb:
      "Tag any expense to a company or side gig, then pull a tax-time report with per-business totals and a CSV for your accountant. Tagged entries still count in your regular budget - the separation happens in the report.",
    cta: {
      label: "Create a business",
      kind: "profile-section",
      section: "businesses",
    },
  },
  {
    id: "people-assignment",
    sinceVersion: "1.9.0",
    icon: "👤",
    title: "Who spent that?",
    blurb:
      "Add the people in your household and assign any expense to them - when adding entries or approving imported bank transactions. Every entry shows who it belongs to, so shared spending finally has names on it.",
    cta: {
      label: "Add your people",
      kind: "profile-section",
      section: "people",
    },
  },
  {
    id: "receipt-photos",
    sinceVersion: "1.9.0",
    requiresRuntimeVersion: "1.9.0",
    icon: "🧾",
    title: "Attach the receipt",
    blurb:
      "Snap up to three receipt photos onto any entry, right from the Add and Edit forms. Photos are encrypted before they touch storage and never leave your phone unless you export them yourself.",
    cta: { label: "Add an entry", kind: "budget-add-entry" },
  },
  {
    id: "tracking-reminders",
    sinceVersion: "1.9.0",
    requiresRuntimeVersion: "1.9.0",
    icon: "⏰",
    title: "Gentle tracking nudges",
    blurb:
      "Opt in to a check-in when you haven't logged spending in a while, or a fresh-month reminder to set your goals. Scheduled entirely on your phone - nothing about your finances ever appears on your lock screen.",
    cta: {
      label: "Set up reminders",
      kind: "profile-section",
      section: "trackingReminders",
    },
  },
  {
    id: "account-change-tracker",
    sinceVersion: "1.9.0",
    icon: "📈",
    title: "Watch your accounts rise and fall",
    blurb:
      "Every account and category on the Bridge now shows how much it's up or down over the window you pick - a day, a week, a month, or a quarter. Tracked privately on this phone from your own balances and prices; nothing leaves the device.",
    cta: { label: "See your Bridge", kind: "bridge" },
  },
  {
    id: "what-if-spending",
    sinceVersion: "1.9.0",
    icon: "🔮",
    title: "What if you stopped spending on…?",
    blurb:
      "Pick a spending category and see what redirecting that money could do: how much sooner you'd be debt-free, the interest you'd skip, or what it grows into over 1, 5, and 10 years. Find it under Tools on the Charts tab.",
    cta: { label: "Run a what-if", kind: "charts" },
  },
  {
    id: "purchase-planner",
    sinceVersion: "1.9.0",
    icon: "🛒",
    title: "Plan a purchase, keep your goals",
    blurb:
      "Name the thing you're saving for and BudgetArk builds the sinking fund around it: a monthly amount that fits your real cash flow, the month it's ready, and advice tuned to your Build Your Ark step so the purchase never derails the plan.",
    cta: { label: "Plan a purchase", kind: "charts" },
  },
  {
    id: "take-home-pay",
    sinceVersion: "1.9.0",
    icon: "🧮",
    title: "What actually hits your account",
    blurb:
      "Enter a salary, filing status, and state and see your real per-paycheck take-home - federal, state, Social Security, and Medicare, all from bundled tax tables that never phone home. Tap another state to see what the same salary keeps there.",
    cta: { label: "Estimate your take-home", kind: "charts" },
  },
  {
    id: "app-lock",
    sinceVersion: "1.9.0",
    icon: "🔐",
    title: "Lock the app behind a PIN",
    blurb:
      "Turn on App Lock and BudgetArk asks for a 4-8 digit PIN whenever it opens, so someone borrowing your phone can't browse your finances. The PIN stays on this device - never synced, exported, or backed up.",
    cta: { label: "Set up App Lock", kind: "profile-section", section: "appLock" },
  },
  {
    id: "deep-sea-theme",
    sinceVersion: "1.9.0",
    icon: "🌊",
    title: "New theme: Deep Sea",
    blurb:
      "Abyssal blues with a bioluminescent glow, plus its own ambient background - light rays filtering down from the surface with drifting plankton. It joins Deep Space and Deep Forest under Appearance.",
    cta: { label: "Try Deep Sea", kind: "profile-section", section: "theme" },
  },
  {
    id: "slate-classic-themes",
    sinceVersion: "1.9.0",
    icon: "🎨",
    title: "Two new themes: Slate & Classic",
    blurb:
      "Slate pairs graphite greys with a mustard-yellow accent for a calm, focused look. Classic is a straight-faced throwback to the silver-and-teal desktops of 1998, navy accents and all. Both are waiting under Appearance.",
    cta: { label: "Try them on", kind: "profile-section", section: "theme" },
  },
  {
    id: "four-themes",
    sinceVersion: "1.9.0",
    icon: "🗺️",
    title: "Four new looks for your Ark",
    blurb:
      "Lighthouse is a true high-contrast theme - every color audited for maximum readability. Chart Room is a nautical chart with land-tone cards on sea blue, Harbor Dawn a peach sunrise over seafoam cards, and Ledger the classic green accounting paper. All under Appearance.",
    cta: { label: "Browse themes", kind: "profile-section", section: "theme" },
  },
  {
    id: "tip-jar",
    sinceVersion: "1.9.0",
    requiresRuntimeVersion: "1.9.0",
    badgeOnly: true,
    icon: "💛",
    title: "Tip Jar",
    blurb:
      "Optional one-time tips, handled entirely by the app store. Unlocks nothing - every feature is already free.",
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
      !seen.has(spotlight.id) &&
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
        !acked.has(spotlight.id) &&
        isSpotlightAvailable(spotlight, currentRuntimeVersion)
    )
    .map((spotlight) => spotlight.id);
};
