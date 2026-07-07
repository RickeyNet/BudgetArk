import type { Lesson } from "../../types";

const lesson: Lesson = {
  id: "ch3-l1-emergency-fund-full",
  chapterId: "ch3",
  number: 1,
  title: "Emergency fund - 3 to 6 months",
  readMin: 5,
  topics: ["saving"],
  glyph: "🛟",
  summary:
    "The starter fund keeps a bad week off your card. The full fund keeps a bad year from sinking the ship.",
  whyItMatters:
    "Job loss, a medical event, or a big repair is a matter of when, not if. Months of expenses in cash turns a crisis into an inconvenience.",
  body: [
    {
      type: "paragraph",
      text: "In Chapter 2 you built the $1,000 starter cushion. That was a shock absorber for while you were paying down debt. Once the expensive debt is gone, the next job is the full emergency fund: three to six months of essential expenses, sitting in cash, doing nothing but waiting.",
    },
    {
      type: "paragraph",
      text: "Notice the word essential. You are not saving six months of your current lifestyle. You are saving six months of the survival version: housing, utilities, groceries, insurance, minimum debt payments, transportation. If you lost your income tomorrow, subscriptions and restaurants would be the first things overboard, so they don't belong in the target.",
    },
    {
      type: "bullet-list",
      title: "Three months is usually enough when",
      items: [
        "Your income is steady and your field rehires quickly",
        "You have a second earner in the household",
        "Your fixed costs are low relative to income",
      ],
    },
    {
      type: "bullet-list",
      title: "Lean toward six months when",
      items: [
        "Income is variable: commission, freelance, seasonal, tips",
        "You are the only earner, or dependents rely on you",
        "Your job is specialized and a search could run long",
        "A health condition makes surprise costs more likely",
      ],
    },
    {
      type: "calculator-embed",
      calc: "emergency-fund",
    },
    {
      type: "callout",
      tone: "warn",
      title: "DON'T INVEST THIS MONEY",
      text: "The emergency fund's job is to exist, in full, on the worst day of your decade. Stocks can drop 30% in the same recession that costs you your job. Boring cash in a high-yield savings account is the point - the next lesson covers where to keep it.",
    },
    {
      type: "callout",
      tone: "success",
      title: "FUND IT LIKE A BILL",
      text: "Add a recurring Savings entry on the Budget tab and treat it like rent. A fixed amount on payday, every payday, until the target is hit. Progress you can see on Bridge beats intentions every time.",
    },
  ],
  keyTakeaway:
    "Three to six months of essential expenses, in cash, before you chase returns anywhere else.",
  action: {
    label: "Open the Emergency Fund Calculator",
    route: "charts",
  },
};

export default lesson;
