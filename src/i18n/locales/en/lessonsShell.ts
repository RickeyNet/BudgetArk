/**
 * BudgetArk - English strings: Charts tab (lessons)
 * File: src/i18n/locales/en/lessonsShell.ts
 *
 * Covers: src/lessons/*.tsx chrome (lesson reader, progress, resources) - lesson PROSE stays in src/data.
 * Topic pills and calculator embeds are keyed by their ids (LessonTopic /
 * CalculatorEmbedSection.calc) so the reader can translate what it only
 * knows by id.
 */

export const lessonsShell = {
  reader: {
    crumb: "Ch {{chapter}} · Lesson {{lesson}}",
    backA11y: "Back",
    readMin_one: "{{count}} min read",
    readMin_other: "{{count}} min read",
    comingSoonMeta: "Coming soon",
    topics: {
      budgeting: "Budgeting",
      debt: "Debt",
      saving: "Saving",
      investing: "Investing",
      taxes: "Taxes",
      insurance: "Insurance",
      real_estate: "Real Estate",
      retirement: "Retirement",
      mindset: "Mindset",
    },
    /** Shown under the title whenever the app language is not English. */
    englishOnly: "This lesson is available in English only.",
    whyEyebrow: "WHY THIS MATTERS",
    takeawayEyebrow: "KEY TAKEAWAY",
    completed: "✓ Completed",
    markComplete: "Mark complete",
    tryIt: "TRY IT",
    goDeeper: "GO DEEPER",
    comingSoon: {
      title: "Lesson in progress",
      body: "{{chapter}} ships in a future update. The chapter outline is here so you can see the full course path. Check back soon.",
    },
    previous: "Previous",
    next: "Next",
  },
  renderer: {
    tryIt: "TRY IT",
    calcHint: "Open the matching tool under TOOLS on the Charts tab.",
    calculators: {
      "loan-amortization": "Loan / Mortgage Calculator",
      "compound-interest": "Compound Interest Calculator",
      "refinance-break-even": "Refinance Break-Even Calculator",
      "emergency-fund": "Emergency Fund Calculator",
      "payoff-comparison": "Debt Payoff Strategy",
      fallback: "Calculator",
    },
  },
  celebration: {
    kicker: {
      course: "CAPTAIN'S COURSE COMPLETE",
      chapter: "CHAPTER {{number}} COMPLETE",
      first: "FIRST LESSON COMPLETE",
      lesson: "LESSON COMPLETE",
    },
    title: {
      course: "You've finished every lesson aboard.",
      chapter: "{{chapter}}: chapter cleared",
    },
    subtitle: {
      course: "{{completed}} of {{total}} lessons read. Welcome to the wheelhouse.",
      chapter: "Ch {{number}} done. {{completed}} of {{total}} lessons across the course.",
      first: "One down. The course is yours to set the pace on from here.",
      lesson: "Ch {{number}} · {{completed}} of {{total}} lessons read",
    },
    progress: "{{completed}} / {{total}} course lessons read",
    nextLesson: "Next lesson",
  },
  resource: {
    openInApp: "Open in this app",
    linkFailed: {
      title: "Couldn't open link",
      message: "Your device doesn't have an app that can open that link.",
    },
  },
} as const;
