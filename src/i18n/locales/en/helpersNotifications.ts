/**
 * BudgetArk - English strings: pure helpers (notifications)
 * File: src/i18n/locales/en/helpersNotifications.ts
 *
 * Covers: trackingReminderPlanner, cardKeepAlivePlanner and the schedulers
 * in src/notifications (Android channel names). Read from plain modules via
 * src/i18n/translate.ts.
 *
 * Security rule 11: this copy lands on the lock screen. It must stay
 * content-free - no amounts, account or card names, balances, counts. The
 * planner tests assert that in every language; add nothing here that
 * would let a notification describe money.
 */

export const helpersNotifications = {
  tracking: {
    channel: {
      name: "Expense check-ins",
      description: "Gentle reminders to keep logging your spending",
    },
    /** Rotating quiet-spell check-in copy, keyed by id, rotated by the planner. */
    checkIn: {
      quick: {
        title: "Time for a quick check-in",
        body: "Have a minute? Log your latest spending while it's fresh.",
      },
      onCourse: {
        title: "Keep your Ark on course",
        body: "Jot down any expenses from the last few days.",
      },
      expense: {
        title: "Quick expense check-in",
        body: "Any spending to track? It only takes a moment.",
      },
      tidyLedger: {
        title: "A tidy ledger builds a sturdy Ark",
        body: "Add your recent expenses to keep your budget honest.",
      },
      drift: {
        title: "Don't let spending drift by",
        body: "Take 30 seconds to log anything you've spent.",
      },
    },
    /** Month-start planning copy, rotated by month. */
    monthStart: {
      newMonth: {
        title: "A new month begins",
        body: "Set this month's budget goals and review how last month went.",
      },
      chartCourse: {
        title: "Chart this month's course",
        body: "Look back at last month's spending and set your goals for the month ahead.",
      },
      freshStart: {
        title: "Fresh month, fresh start",
        body: "Take a few minutes to plan this month's budget and check last month's review.",
      },
    },
  },
  keepAlive: {
    channel: {
      name: "Card activity reminders",
      description:
        "Gentle reminders to use a tracked credit card before its issuer closes it for inactivity",
    },
    /** Rotating generic copy: never a card name, amount or count. */
    messages: {
      activity: {
        title: "A card could use some activity",
        body: "One of your credit cards hasn't been used in a while. A small purchase keeps it active.",
      },
      afloat: {
        title: "Keep your credit line afloat",
        body: "An idle card can be closed by its issuer. Open BudgetArk to see which one needs a quick purchase.",
      },
      quickCheck: {
        title: "Quick card check",
        body: "A card you're tracking is nearing its inactivity deadline. A coffee-sized purchase resets the clock.",
      },
    },
  },
} as const;
