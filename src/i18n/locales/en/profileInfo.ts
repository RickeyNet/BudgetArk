/**
 * BudgetArk - English strings: Profile (info)
 * File: src/i18n/locales/en/profileInfo.ts
 *
 * Covers: AboutSection, HelpSection, SupportSection, OrganizeSection, BusinessSection, CategoriesSection.
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
    featureGuide: {
      label: "Feature guide",
      description: "Searchable guide to every feature, the tab-by-tab tour, what's new, and redo onboarding",
      a11yLabel: "Open the feature guide",
    },
  },
  /** Header-less card right under the name card. Briefly folded into HELP; the user wants it at the top - keep it here. */
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
  /** One card for the three "how do I tag entries?" rows: categories, people, businesses. */
  organize: {
    sectionTitle: "ORGANIZE",
  },
  business: {
    businesses: {
      label: "Businesses 💼",
      description: "Tag expenses to a company or side gig, and the tax-time report",
      a11yLabel: "Manage businesses",
    },
  },
  categories: {
    custom: {
      label: "Custom Categories",
      a11yLabel: "Manage custom categories",
      empty: "Add your own budget categories",
      count_one: "{{count}} custom",
      count_other: "{{count}} custom",
    },
  },
} as const;
