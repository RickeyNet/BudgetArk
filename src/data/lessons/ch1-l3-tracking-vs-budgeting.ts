import type { Lesson } from "../../types";

const lesson: Lesson = {
  id: "ch1-l3-tracking-vs-budgeting",
  chapterId: "ch1",
  number: 3,
  title: "Tracking vs. budgeting",
  readMin: 5,
  topics: ["budgeting"],
  glyph: "🗒️",
  summary:
    "Two different jobs. Most apps blur them. The blur is why most budgets feel pointless.",
  whyItMatters:
    "If you've ever 'budgeted' for a year and still felt no closer to your goals, this is probably the lesson you skipped.",
  body: [
    {
      type: "paragraph",
      text: "Tracking and budgeting sound like the same thing. They aren't. They are two different jobs, and you need both.",
    },
    {
      type: "bullet-list",
      title: "Tracking",
      items: [
        "Records what already happened",
        "Tells you where the money went",
        "Backward-looking by definition",
      ],
    },
    {
      type: "bullet-list",
      title: "Budgeting",
      items: [
        "Decides where money goes before it leaves",
        "Sets a limit per category",
        "Forward-looking by definition",
      ],
    },
    {
      type: "paragraph",
      text: "Tracking with no budget is just journaling. You learn that you spent too much on dining out, then you do it again next month, then you write it down again. Insight without leverage.",
    },
    {
      type: "paragraph",
      text: "Budgeting with no tracking is just wishing. You set a $400 grocery cap, never check it, and discover at month-end that you spent $612. The cap did nothing because you never looked.",
    },
    {
      type: "callout",
      tone: "info",
      title: "THE PATTERN THAT WORKS",
      text: "Budget at the start of the month. Track during the month. Review at the end. All three, every month.",
    },
    {
      type: "paragraph",
      text: "BudgetArk does both jobs in one place. Category limits live on the Budget tab. Entries you add as you spend are the tracking half. The Spending donut shows the gap between the two in real time, so you can react before the month is over instead of explaining it after.",
    },
  ],
  keyTakeaway:
    "Plan, log, review. All three or none.",
  action: {
    label: "Log an expense",
    route: "budget",
  },
};

export default lesson;
