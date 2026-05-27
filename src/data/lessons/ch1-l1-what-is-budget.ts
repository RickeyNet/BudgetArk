import type { Lesson } from "../../types";

const lesson: Lesson = {
  id: "ch1-l1-what-is-budget",
  chapterId: "ch1",
  number: 1,
  title: "What a budget really is",
  readMin: 3,
  topics: ["budgeting", "mindset"],
  glyph: "🧭",
  summary:
    "A budget is not a restriction. It is a plan you write before the month spends you.",
  whyItMatters:
    "Every other lesson in this course assumes you have a plan to compare against. This is that plan.",
  body: [
    {
      type: "paragraph",
      text: "A budget is a plan for how you'll spend your income over a fixed period, usually a month. You start with what you expect to bring in, then decide ahead of time how much goes to rent, food, savings, debt, and everything else. The point is not to spend less. It is to spend on purpose, so the essentials are covered before the optional stuff competes for the leftovers.",
    },
    {
      type: "bullet-list",
      title: "What a budget is",
      items: [
        "A plan made by you, for your way of life",
        "A way to spend on purpose instead of by accident",
        "A snapshot of what you can afford this month",
      ],
    },
    {
      type: "bullet-list",
      title: "What a budget is not",
      items: [
        "A punishment",
        "A permanent contract you sign once and never revisit",
        "The same shape someone else's budget should be",
      ],
    },
    {
      type: "paragraph",
      text: "A budget is not a one-time setup. Income changes when a raise, a side job, or a slow month hits. Bills change when a subscription renews, insurance resets, or seasonal costs like heating or holidays show up. Priorities change too: a wedding, a move, a new baby, or simply wanting to save harder toward a specific goal. Plan to revisit the budget at the start of every month, even for ten minutes, and update the numbers to match what is actually true right now instead of what was true last month.",
    },
    {
      type: "callout",
      tone: "info",
      title: "Where to Start",
      text: "Open the Budget tab and add two kinds of recurring entries. First, your reliable monthly income: log your paycheck as a recurring entry under Salary, plus any side income you can count on every month. Second, your fixed bills: rent or mortgage under Housing, electric and water under Utilities, and insurance. Only the vital things to keep a roof over your head. The Income vs. Expenses strip at the top of the screen will show what is left after those are in. That leftover is the money you actually get to plan with for everything else.",
    },
    {
      type: "callout",
      tone: "info",
      title: "Next Step",
      text: "Build the first version from real numbers, not aspirational ones. Pull the last two or three months of spending on groceries, gas, eating out, and subscriptions, and use those amounts as your starting line. You can lower them next month if you want, but an honest starting point is what makes a budget you'll actually keep using.",
    },
  ],
  keyTakeaway:
    "A budget is just a plan written before the spending. Nothing more, nothing less.",
  action: {
    label: "Open the Budget tab",
    route: "budget",
  },
};

export default lesson;
