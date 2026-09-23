/**
 * BudgetArk - English strings: bundled data (achievements)
 * File: src/i18n/locales/en/dataAchievements.ts
 *
 * Covers: achievementDefs.ts badge titles, descriptions and locked hints,
 * keyed by the persisted achievement id, plus the progress formatters.
 * Resolved lazily from src/data via getters that call src/i18n/translate.ts.
 * Lesson chapter names quoted in descriptions stay English: the Captain's
 * Course itself ships in English only.
 */

export const dataAchievements = {
  badges: {
    first_steps: {
      title: "First Steps",
      description: "Logged your first debt and set sail.",
      hint: "Add a debt to the Debt Tracker.",
    },
    patched_the_hull: {
      title: "Patched the Hull",
      description: "Recorded your first debt payment.",
      hint: "Record a payment toward any debt.",
    },
    half_mast: {
      title: "Half Mast",
      description: "Paid off half of your original non-mortgage debt total.",
      hint: "Pay down 50% of your starting debt.",
    },
    debt_free_captain: {
      title: "Debt-Free Captain",
      description: "All non-mortgage debts cleared. The crew salutes you.",
      hint: "Clear every debt except your mortgage.",
    },
    galley_stocked: {
      title: "Galley Stocked",
      description: "Your emergency fund reached $1,000.",
      hint: "Save $1,000 for emergencies.",
    },
    sextant_sharp: {
      title: "Sextant Sharp",
      description: "Hit your first savings goal target.",
      hint: "Complete any savings goal.",
    },
    treasure_i: {
      title: "Treasure Hoard I",
      description: "Net worth crossed $10,000.",
      hint: "Grow net worth above $10k.",
    },
    treasure_ii: {
      title: "Treasure Hoard II",
      description: "Net worth crossed $25,000.",
      hint: "Grow net worth above $25k.",
    },
    treasure_iii: {
      title: "Treasure Hoard III",
      description: "Net worth crossed $100,000.",
      hint: "Grow net worth above $100k.",
    },
    galleons_hold: {
      title: "Galleon's Hold",
      description: "Net worth crossed $1,000,000. A true treasure ship.",
      hint: "Grow net worth above $1M.",
    },
    ark_builder: {
      title: "Ark Builder",
      description: "Completed your first milestone step.",
      hint: "Finish a Hull/Deck/Supplies milestone.",
    },
    first_mate: {
      title: "First Mate",
      description: "Paired with a partner for cross-device sync.",
      hint: "Pair with your partner from Profile → Sync.",
    },
    doubloon_streak: {
      title: "Doubloon Streak",
      description: "12 consecutive months of savings contributions.",
      hint: "Add a Savings entry every month for a year.",
    },
    cartographer: {
      title: "Cartographer",
      description: "Charted a course - exported your data at least once.",
      hint: "Export your data from Profile → Data.",
    },
    crows_nest: {
      title: "Crow's Nest",
      description: "Kept watch - opened the Monthly Review three times.",
      hint: "Open the Monthly Review from the Budget screen 3 times.",
    },
    steady_crew: {
      title: "Steady Crew",
      description: "Three months running with every category under budget.",
      hint: "Stay under all category limits 3 months in a row.",
    },
    lighthouse_keeper: {
      title: "Lighthouse Keeper",
      description: "Opened the app 30 days in a row.",
      hint: "Keep a 30-day app-open streak.",
    },
    all_sails_set: {
      title: "All Sails Set",
      description: "Held every budget category under its limit for a month.",
      hint: "Keep all category limits for one full month.",
    },
    first_voyage: {
      title: "First Voyage",
      description: "Completed your first Charts lesson.",
      hint: "Finish a lesson in the Captain's Course.",
    },
    course_plotter: {
      title: "Course Plotter",
      description: "Finished Chapter 1: Setting Sail.",
      hint: "Complete every lesson in Chapter 1.",
    },
    hull_hand: {
      title: "Hull Hand",
      description: "Finished Chapter 2: Patching the Hull.",
      hint: "Complete every lesson in Chapter 2.",
    },
    anchored_in_knowledge: {
      title: "Anchored in Knowledge",
      description: "Completed every lesson in every shipped chapter.",
      hint: "Finish the entire Captain's Course.",
    },
    admiral: {
      title: "Admiral",
      description: "Completed every milestone. The Ark is built.",
      hint: "Complete every step in the milestone plan.",
    },
  },
  progress: {
    months: "{{current}} / {{target}} mo",
    days: "{{current}} / {{target}} days",
  },
} as const;
