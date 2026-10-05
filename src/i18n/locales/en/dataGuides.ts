/**
 * BudgetArk - English strings: bundled data (guides)
 * File: src/i18n/locales/en/dataGuides.ts
 *
 * Covers: connectionGuides.ts provider setup guides (SimpleFIN / Teller),
 * keyed by provider. Product names, URLs and site labels stay in the data
 * file; only the prose lives here. Resolved lazily from src/data via
 * src/i18n/translate.ts.
 */

import type { BankProvider } from "../../../types";

export const dataGuides = {
  simplefin: {
    tagline:
      "Recommended: one pasted token connects Chase and thousands of US banks and cards. Read-only, open signup.",
    cost: "About $1.50/month or $15/year, billed by SimpleFIN - not BudgetArk.",
    steps: {
      account: {
        title: "Create your SimpleFIN Bridge account",
        detail:
          "Open beta-bridge.simplefin.org, tap Get Started, and enter your email. SimpleFIN emails you a login link - open it and accept the terms.",
      },
      subscribe: {
        title: "Subscribe",
        detail:
          "SimpleFIN is a small paid service (about $1.50/month or $15/year). You need to subscribe before you can add your first bank.",
      },
      connectBank: {
        title: "Connect your bank(s)",
        detail:
          "In the dashboard, open Financial Institutions, choose New Connection, find your bank, and log in through its secure page. Add as many as you like.",
      },
      token: {
        title: "Create a setup token",
        detail:
          "Choose New App (name it 'BudgetArk' if asked) and copy the setup token it shows - a long string of letters and numbers.",
      },
      paste: {
        title: "Paste it into BudgetArk",
        detail:
          "Come back here, paste the token into the box, and tap Connect. BudgetArk handles the rest.",
      },
    },
    tips: {
      singleUse:
        "The setup token is single-use: once BudgetArk claims it, it can't be pasted anywhere else. If it ever fails, just generate a fresh one.",
      readOnly: "SimpleFIN is read-only - it can see balances and transactions, never move money.",
      daily:
        "It refreshes about once a day, so brand-new transactions can take up to 24 hours to show up.",
    },
    privacy: {
      headline: "No - SimpleFIN does not sell your data and shows no ads.",
      points: {
        noSell: "Does not sell your data or use it for advertising or marketing.",
        noCredentials:
          "Never stores your actual bank username or password - those stay between you and your bank.",
        sharing:
          "Shares data only with the service providers needed to reach your bank, plus the standard exceptions every company has: when required by law, or if the company is ever sold.",
      },
    },
  },
  teller: {
    tagline:
      "100 free bank connections - but only if you already have (or can request) a Teller developer account.",
    cost: "Free for up to 100 connections (Teller's Development tier). New accounts are currently request-only.",
    steps: {
      account: {
        title: "Get a Teller developer account",
        detail:
          "Teller has no public signup right now - teller.io only offers Sign In. If you don't already have an account, email support@teller.io and ask for a developer account for a personal budgeting app, or use SimpleFIN instead (open signup, works today).",
      },
      certificate: {
        title: "Download your certificate and key",
        detail:
          "When your account is created, Teller gives you a certificate and a private key (two .pem files) that prove requests come from your app. Download them from the dashboard, and unzip if they arrive zipped.",
      },
      appId: {
        title: "Copy your Application ID",
        detail: "From your Teller dashboard, copy your Application ID. It starts with 'app_'.",
      },
      environment: {
        title: "Use the Development environment",
        detail:
          "To connect real banks for free, choose Development (100 free connections). Sandbox is only fake test data; Production is for paid, large-scale apps.",
      },
      enterDetails: {
        title: "Enter your details in BudgetArk",
        detail:
          "Paste your Application ID, keep the environment on Development, and import both .pem files - the certificate and the private key.",
      },
      connectBank: {
        title: "Connect your bank",
        detail:
          "Tap Open Teller Connect and log in to your bank in Teller's secure window. Your bank login goes to Teller, never to BudgetArk.",
      },
    },
    tips: {
      noAccount:
        "No Teller account and no reply from support? SimpleFIN is the easier path - open signup, about $1.50/month, and it covers thousands of US banks.",
      development:
        "Keep the environment on Development unless Teller specifically told you otherwise - that's the free tier for real banks.",
      storedLocally:
        "Your certificate and key are stored encrypted on this device only and never leave it.",
      readOnly: "Teller is read-only here - it reads balances and transactions, it can't move money.",
    },
    privacy: {
      headline: "No - Teller's policy explicitly says it does not sell your data.",
      points: {
        noSell: 'States plainly: "We do not sell your End User Personal Data."',
        noMarketing:
          "Won't share your information for marketing - not its own, its affiliates', or outside companies'.",
        sharing:
          "Shares your account data with the app you connect (that's BudgetArk, on your phone) and the vendors needed to run the service, plus the standard legal / company-sale exceptions.",
      },
    },
  },
} as const satisfies Record<BankProvider, unknown>;
