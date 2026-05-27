import type { Lesson } from "../../types";

const lesson: Lesson = {
  id: "ch1-l5-monthly-review",
  chapterId: "ch1",
  number: 5,
  title: "Reading your monthly review",
  readMin: 4,
  topics: ["budgeting", "mindset"],
  glyph: "🔭",
  summary:
    "The review is the cheapest financial coach you'll ever have. Most people skip it.",
  whyItMatters:
    "A month of data with no review is just noise. The review is where you turn it into a decision.",
  body: [
    {
      type: "paragraph",
      text: "At the end of each month BudgetArk produces a Monthly Review. Most people open it, glance at the income total, and close it. That is leaving most of the signal on the table.",
    },
    {
      type: "bullet-list",
      title: "Read in this order",
      items: [
        "Income vs. expenses: did you spend less than you brought in?",
        "Top category: where did the biggest slice of the month go?",
        "Streaks: are you staying under limits month over month?",
        "Category changes: which category moved the most vs. last month?",
      ],
    },
    {
      type: "callout",
      tone: "info",
      title: "ONE MONTH IS DATA",
      text: "One month is data. Three months is a pattern. Don't rewrite your whole budget after a single weird month, but do flag the weird month so you remember it next time.",
    },
    {
      type: "paragraph",
      text: "If a category came in over, ask one question: was the limit wrong, or was the spending wrong? Both answers are valid. The wrong move is changing nothing and hoping next month will be different.",
    },
    {
      type: "paragraph",
      text: "If a category came in under, don't sweep the difference. Move it on purpose: to savings, to debt payoff, to the next month's wants. Otherwise it leaks back into ambient spending and you lose the win.",
    },
    {
      type: "callout",
      tone: "success",
      title: "REVIEW AS REWARD",
      text: "Most months won't be dramatic. That is the goal. A boring Monthly Review means the plan is working.",
    },
  ],
  keyTakeaway:
    "Open the review every month. Read it in order. Move the leftovers on purpose.",
  action: {
    label: "Open Monthly Review",
    route: "bridge",
  },
};

export default lesson;
