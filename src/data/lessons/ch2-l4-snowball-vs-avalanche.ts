import type { Lesson } from "../../types";

const lesson: Lesson = {
  id: "ch2-l4-snowball-vs-avalanche",
  chapterId: "ch2",
  number: 4,
  title: "Snowball vs Avalanche",
  readMin: 7,
  topics: ["debt", "mindset"],
  glyph: "❄️",
  summary:
    "Two valid payoff orders. Avalanche saves the most interest. Snowball wins the most momentum.",
  whyItMatters:
    "The best plan is the one you will actually follow for eighteen months, not the one that looks best on a spreadsheet.",
  body: [
    {
      type: "paragraph",
      text: "Once minimums are covered, you send every extra dollar to one target debt at a time. The only argument is which debt gets the extras first.",
    },
    {
      type: "bullet-list",
      title: "Avalanche (highest APR first)",
      items: [
        "Mathematically cheapest: less interest paid over the whole journey",
        "Best when you are motivated by numbers and can wait for wins",
        "BudgetArk default strategy name on the Debts tab",
      ],
    },
    {
      type: "bullet-list",
      title: "Snowball (smallest balance first)",
      items: [
        "Fastest psychological wins: accounts disappear sooner",
        "Best when you need momentum to trust the process",
        "May cost more interest than avalanche, but still beats minimum-only",
      ],
    },
    {
      type: "callout",
      tone: "info",
      title: "CUSTOM ORDER",
      text: "Some people mix both: knock out a tiny balance for a win, then switch to avalanche on what is left. BudgetArk supports a custom payoff order if your situation needs it (for example, a promotional 0% card deadline).",
    },
    {
      type: "calculator-embed",
      calc: "payoff-comparison",
    },
    {
      type: "paragraph",
      text: "Inside Build Your Ark, the Hull milestone is where payoff strategy lives. Compare avalanche vs snowball with your real balances, pick one, then put every extra payment toward the highlighted debt until it is gone.",
    },
    {
      type: "callout",
      tone: "success",
      title: "PICK ONE AND RUN",
      text: "Debating forever is its own form of avoidance. Choose snowball or avalanche this month, log payments as you go, and revisit only if your life changes (new debt, income shift, baby on the way).",
    },
  ],
  keyTakeaway:
    "Avalanche saves interest. Snowball builds momentum. Either beats paying only minimums.",
  action: {
    label: "Set payoff strategy",
    route: "debts",
  },
};

export default lesson;
