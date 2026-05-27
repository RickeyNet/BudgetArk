import type { Lesson } from "../../types";

const lesson: Lesson = {
  id: "ch1-l2-needs-wants-savings",
  chapterId: "ch1",
  number: 2,
  title: "Needs, Wants, Savings (50/30/20)",
  readMin: 4,
  topics: ["budgeting"],
  glyph: "⚖️",
  summary:
    "The simplest budget framework in the world. Three buckets, three percentages.",
  whyItMatters:
    "If you only ever learn one budgeting rule, learn this one. It tells you the shape a healthy month should have.",
  body: [
    {
      type: "paragraph",
      text: "The 50/30/20 rule splits your take-home pay into three buckets: 50% needs, 30% wants, 20% savings or debt payoff. It is the cheapest budget framework that still works.",
    },
    {
      type: "bullet-list",
      title: "Needs (50%)",
      items: [
        "Rent or mortgage, utilities, basic groceries",
        "Transportation to work",
        "Insurance and minimum debt payments",
        "Anything you can't skip without real consequences",
      ],
    },
    {
      type: "bullet-list",
      title: "Wants (30%)",
      items: [
        "Restaurants, streaming, hobbies",
        "Gym memberships you actually use",
        "Travel, gifts, anything optional",
        "If skipping it would feel sad but not catastrophic, it lives here",
      ],
    },
    {
      type: "bullet-list",
      title: "Savings + debt payoff (20%)",
      items: [
        "Emergency fund contributions",
        "Retirement contributions",
        "Any payment above the minimum on a debt",
        "Sinking funds for car repair, holidays, anything future",
      ],
    },
    {
      type: "callout",
      tone: "info",
      title: "USE TAKE-HOME, NOT GROSS",
      text: "The percentages apply to what hits your bank account, after taxes and pre-tax deductions. If your paycheck shows $4,000, that's the number to split.",
    },
    {
      type: "paragraph",
      text: "Almost no one hits 50/30/20 on the first try. Rent in a big city alone can eat 50% before you've bought a single grocery. That's fine. The percentages are guardrails, not laws. Use them to see where you are, not where you have to be.",
    },
    {
      type: "paragraph",
      text: "If wants are 50% and savings is 0%, the framework is telling you something. Listen, then decide what to do about it. Don't punish yourself, just move one number at a time.",
    },
  ],
  keyTakeaway:
    "50% needs, 30% wants, 20% future. Start there. Tune later.",
  action: {
    label: "Set category limits",
    route: "budget",
  },
};

export default lesson;
