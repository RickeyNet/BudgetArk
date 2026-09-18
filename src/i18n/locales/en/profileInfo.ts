/**
 * BudgetArk - English strings: Profile (info)
 * File: src/i18n/locales/en/profileInfo.ts
 *
 * Covers: AboutSection, HelpSection, SupportSection, BusinessSection, CategoriesSection.
 */

export const profileInfo = {
  about: {
    sectionTitle: "ABOUT",
    /** "v1.10.4 - Every Cent Counts" */
    versionRow: "v{{version}} - {{title}}",
    tapForReleaseNotes: "Tap for release notes",
    websiteLabel: "Website",
    websiteA11y: "Open the BudgetArk website",
    githubLabel: "GitHub",
    releaseNotes: {
      title: "Release Notes",
      subtitle: "Browse current and past versions.",
      releasedOn: "Released {{date}}",
    },
  },
  help: {
    sectionTitle: "HELP",
    onboarding: {
      label: "Onboarding",
      description: "Searchable guide to everything, or redo the first-launch setup",
    },
    featureTour: {
      label: "Feature tour",
      description: "Rewatch the what's-new tour of recent features",
      a11yLabel: "Replay the feature tour",
    },
  },
  support: {
    feedback: {
      label: "Send Feedback",
      description: "Bug reports & feature requests",
    },
    tipJar: {
      label: "Tip Jar 💛",
      description: "Optional support - nothing to unlock",
    },
  },
  business: {
    sectionTitle: "BUSINESS EXPENSES",
    businesses: {
      label: "Businesses 💼",
      description: "Tag expenses to a company or side gig",
      a11yLabel: "Manage businesses",
    },
    report: {
      label: "Business Expense Report",
      description: "Per-business totals by year, with CSV export",
      a11yLabel: "Open business expense report",
    },
  },
  categories: {
    sectionTitle: "CATEGORIES",
    custom: {
      label: "Custom Categories",
      a11yLabel: "Manage custom categories",
      empty: "Add your own budget categories",
      count_one: "{{count}} custom",
      count_other: "{{count}} custom",
    },
  },
} as const;
