/**
 * BudgetArk - Bank Connection Setup Guides
 * File: src/data/connectionGuides.ts
 *
 * Plain-language, step-by-step setup content plus a privacy-at-a-glance
 * summary for each connection provider, surfaced by the Add Connection wizard
 * (ProviderSetupGuideModal). Goal: a very low barrier to entry - a first-time
 * user should be able to follow these without leaving for the provider's docs,
 * but every step also links out to the official source.
 *
 * The prose lives in src/i18n/locales/{en,de}/dataGuides.ts and is resolved
 * lazily through getters (see src/i18n/translate.ts), so the guide reads in
 * the active language and a language switch re-renders it. Only ids, glyphs,
 * product names, URLs and site labels are literal here.
 *
 * Privacy summaries are distilled from each provider's published policy
 * (linked via `policyUrl`) - kept short and honest, not legal advice. If a
 * provider changes its policy, update the summary (both languages) and
 * re-check the link. Verified against the live policies 2026-07.
 *
 * Signup availability is also checked against the live sites: as of 2026-07
 * teller.io shows no public signup (sign-in only; /signup 404s) - new Teller
 * accounts are request-only via support@teller.io. The Teller guide
 * reflects that and steers first-time users to SimpleFIN; re-check and relax
 * the wording if Teller reopens self-serve signup.
 */

import type { BankProvider } from "../types";
import { t } from "../i18n/translate";

export interface GuideStep {
  /** Short imperative headline, e.g. "Create your account". */
  title: string;
  /** One or two plain sentences of detail. */
  detail: string;
}

export interface PrivacySummary {
  /** One-line answer to "do they sell my data?" - the headline reassurance. */
  headline: string;
  /** A few plain-language bullets distilled from the policy. */
  points: readonly string[];
  /** Link to the provider's full, authoritative privacy policy. */
  policyUrl: string;
}

export interface ConnectionGuide {
  provider: BankProvider;
  glyph: string;
  name: string;
  /** One-line "what is this" tagline. */
  tagline: string;
  /** Plain-language cost, billed by the provider (never BudgetArk). */
  cost: string;
  /** The provider's main site, to open in the browser. */
  siteUrl: string;
  /** Human label for siteUrl, e.g. "beta-bridge.simplefin.org". */
  siteLabel: string;
  /** Provider's own official setup/quickstart docs. */
  officialGuideUrl: string;
  steps: readonly GuideStep[];
  /** Short reassurances / gotchas worth calling out. */
  tips: readonly string[];
  privacy: PrivacySummary;
}

/** Step ids per provider, in display order (keys under data.guides.<provider>.steps). */
const SIMPLEFIN_STEPS = ["account", "subscribe", "connectBank", "token", "paste"] as const;
const SIMPLEFIN_TIPS = ["singleUse", "readOnly", "daily"] as const;
const SIMPLEFIN_PRIVACY_POINTS = ["noSell", "noCredentials", "sharing"] as const;

const TELLER_STEPS = [
  "account",
  "certificate",
  "appId",
  "environment",
  "enterDetails",
  "connectBank",
] as const;
const TELLER_TIPS = ["noAccount", "development", "storedLocally", "readOnly"] as const;
const TELLER_PRIVACY_POINTS = ["noSell", "noMarketing", "sharing"] as const;

const SIMPLEFIN_GUIDE: ConnectionGuide = {
  provider: "simplefin",
  glyph: "🏦",
  name: "SimpleFIN Bridge",
  get tagline() {
    return t("data.guides.simplefin.tagline");
  },
  get cost() {
    return t("data.guides.simplefin.cost");
  },
  siteUrl: "https://beta-bridge.simplefin.org/",
  siteLabel: "beta-bridge.simplefin.org",
  officialGuideUrl: "https://beta-bridge.simplefin.org/info/developers",
  get steps(): readonly GuideStep[] {
    return SIMPLEFIN_STEPS.map((id) => ({
      title: t(`data.guides.simplefin.steps.${id}.title`),
      detail: t(`data.guides.simplefin.steps.${id}.detail`),
    }));
  },
  get tips(): readonly string[] {
    return SIMPLEFIN_TIPS.map((id) => t(`data.guides.simplefin.tips.${id}`));
  },
  privacy: {
    get headline() {
      return t("data.guides.simplefin.privacy.headline");
    },
    get points(): readonly string[] {
      return SIMPLEFIN_PRIVACY_POINTS.map((id) => t(`data.guides.simplefin.privacy.points.${id}`));
    },
    policyUrl: "https://beta-bridge.simplefin.org/info/privacy",
  },
};

const TELLER_GUIDE: ConnectionGuide = {
  provider: "teller",
  glyph: "🔗",
  name: "Teller",
  get tagline() {
    return t("data.guides.teller.tagline");
  },
  get cost() {
    return t("data.guides.teller.cost");
  },
  siteUrl: "https://teller.io/",
  siteLabel: "teller.io",
  officialGuideUrl: "https://teller.io/docs/guides/quickstart",
  get steps(): readonly GuideStep[] {
    return TELLER_STEPS.map((id) => ({
      title: t(`data.guides.teller.steps.${id}.title`),
      detail: t(`data.guides.teller.steps.${id}.detail`),
    }));
  },
  get tips(): readonly string[] {
    return TELLER_TIPS.map((id) => t(`data.guides.teller.tips.${id}`));
  },
  privacy: {
    get headline() {
      return t("data.guides.teller.privacy.headline");
    },
    get points(): readonly string[] {
      return TELLER_PRIVACY_POINTS.map((id) => t(`data.guides.teller.privacy.points.${id}`));
    },
    policyUrl: "https://teller.io/legal/user/privacy",
  },
};

export const CONNECTION_GUIDES: Record<BankProvider, ConnectionGuide> = {
  simplefin: SIMPLEFIN_GUIDE,
  teller: TELLER_GUIDE,
};
