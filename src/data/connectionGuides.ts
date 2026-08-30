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
 * Privacy summaries below are distilled from each provider's published policy
 * (linked via `policyUrl`) - kept short and honest, not legal advice. If a
 * provider changes its policy, update the summary here and re-check the link.
 * Verified against the live policies 2026-07.
 *
 * Signup availability is also checked against the live sites: as of 2026-07
 * teller.io shows no public signup (sign-in only; /signup 404s) - new Teller
 * accounts are request-only via support@teller.io. The Teller guide below
 * reflects that and steers first-time users to SimpleFIN; re-check and relax
 * the wording if Teller reopens self-serve signup.
 */

import type { BankProvider } from "../types";

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

const SIMPLEFIN_GUIDE: ConnectionGuide = {
  provider: "simplefin",
  glyph: "🏦",
  name: "SimpleFIN Bridge",
  tagline:
    "Recommended: one pasted token connects Chase and thousands of US banks and cards. Read-only, open signup.",
  cost: "About $1.50/month or $15/year, billed by SimpleFIN - not BudgetArk.",
  siteUrl: "https://beta-bridge.simplefin.org/",
  siteLabel: "beta-bridge.simplefin.org",
  officialGuideUrl: "https://beta-bridge.simplefin.org/info/developers",
  steps: [
    {
      title: "Create your SimpleFIN Bridge account",
      detail:
        "Open beta-bridge.simplefin.org, tap Get Started, and enter your email. SimpleFIN emails you a login link - open it and accept the terms.",
    },
    {
      title: "Subscribe",
      detail:
        "SimpleFIN is a small paid service (about $1.50/month or $15/year). You need to subscribe before you can add your first bank.",
    },
    {
      title: "Connect your bank(s)",
      detail:
        "In the dashboard, open Financial Institutions, choose New Connection, find your bank, and log in through its secure page. Add as many as you like.",
    },
    {
      title: "Create a setup token",
      detail:
        "Choose New App (name it 'BudgetArk' if asked) and copy the setup token it shows - a long string of letters and numbers.",
    },
    {
      title: "Paste it into BudgetArk",
      detail:
        "Come back here, paste the token into the box, and tap Connect. BudgetArk handles the rest.",
    },
  ],
  tips: [
    "The setup token is single-use: once BudgetArk claims it, it can't be pasted anywhere else. If it ever fails, just generate a fresh one.",
    "SimpleFIN is read-only - it can see balances and transactions, never move money.",
    "It refreshes about once a day, so brand-new transactions can take up to 24 hours to show up.",
  ],
  privacy: {
    headline: "No - SimpleFIN does not sell your data and shows no ads.",
    points: [
      "Does not sell your data or use it for advertising or marketing.",
      "Never stores your actual bank username or password - those stay between you and your bank.",
      "Shares data only with the service providers needed to reach your bank, plus the standard exceptions every company has: when required by law, or if the company is ever sold.",
    ],
    policyUrl: "https://beta-bridge.simplefin.org/info/privacy",
  },
};

const TELLER_GUIDE: ConnectionGuide = {
  provider: "teller",
  glyph: "🔗",
  name: "Teller",
  tagline:
    "100 free bank connections - but only if you already have (or can request) a Teller developer account.",
  cost: "Free for up to 100 connections (Teller's Development tier). New accounts are currently request-only.",
  siteUrl: "https://teller.io/",
  siteLabel: "teller.io",
  officialGuideUrl: "https://teller.io/docs/guides/quickstart",
  steps: [
    {
      title: "Get a Teller developer account",
      detail:
        "Teller has no public signup right now - teller.io only offers Sign In. If you don't already have an account, email support@teller.io and ask for a developer account for a personal budgeting app, or use SimpleFIN instead (open signup, works today).",
    },
    {
      title: "Download your certificate and key",
      detail:
        "When your account is created, Teller gives you a certificate and a private key (two .pem files) that prove requests come from your app. Download them from the dashboard, and unzip if they arrive zipped.",
    },
    {
      title: "Copy your Application ID",
      detail:
        "From your Teller dashboard, copy your Application ID. It starts with 'app_'.",
    },
    {
      title: "Use the Development environment",
      detail:
        "To connect real banks for free, choose Development (100 free connections). Sandbox is only fake test data; Production is for paid, large-scale apps.",
    },
    {
      title: "Enter your details in BudgetArk",
      detail:
        "Paste your Application ID, keep the environment on Development, and import both .pem files - the certificate and the private key.",
    },
    {
      title: "Connect your bank",
      detail:
        "Tap Open Teller Connect and log in to your bank in Teller's secure window. Your bank login goes to Teller, never to BudgetArk.",
    },
  ],
  tips: [
    "No Teller account and no reply from support? SimpleFIN is the easier path - open signup, about $1.50/month, and it covers thousands of US banks.",
    "Keep the environment on Development unless Teller specifically told you otherwise - that's the free tier for real banks.",
    "Your certificate and key are stored encrypted on this device only and never leave it.",
    "Teller is read-only here - it reads balances and transactions, it can't move money.",
  ],
  privacy: {
    headline: "No - Teller's policy explicitly says it does not sell your data.",
    points: [
      'States plainly: "We do not sell your End User Personal Data."',
      "Won't share your information for marketing - not its own, its affiliates', or outside companies'.",
      "Shares your account data with the app you connect (that's BudgetArk, on your phone) and the vendors needed to run the service, plus the standard legal / company-sale exceptions.",
    ],
    policyUrl: "https://teller.io/legal/user/privacy",
  },
};

export const CONNECTION_GUIDES: Record<BankProvider, ConnectionGuide> = {
  simplefin: SIMPLEFIN_GUIDE,
  teller: TELLER_GUIDE,
};
