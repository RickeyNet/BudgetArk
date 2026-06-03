import type { Lesson } from "../../types";

const lesson: Lesson = {
  id: "ch2-l6-debt-snowflake",
  chapterId: "ch2",
  number: 6,
  title: "The debt snowflake (windfalls)",
  readMin: 4,
  topics: ["debt", "mindset"],
  glyph: "💸",
  summary:
    "Snowball and avalanche are the rivers. Snowflakes are the one-time bursts that speed the melt.",
  whyItMatters:
    "Tax refunds and bonuses are the fastest debt payoff accelerators most people already receive and routinely spend.",
  body: [
    {
      type: "paragraph",
      text: "The debt snowflake is any lump sum thrown at debt outside your normal monthly extra payment: a tax refund, a work bonus, selling something you do not need, a cash gift, side-gig profit, or an insurance reimbursement.",
    },
    {
      type: "bullet-list",
      title: "Good snowflake habits",
      items: [
        "Decide the split before the money arrives (for example, 80% debt, 20% fun)",
        "Send it to the same target debt your payoff strategy highlights",
        "Log it as a payment so the balance and progress ring update immediately",
      ],
    },
    {
      type: "bullet-list",
      title: "Common leaks",
      items: [
        "Treating a refund like \"free money\" instead of money you already earned",
        "Upgrading lifestyle the same month you promised to pay down cards",
        "Splitting across so many small goals that nothing moves",
      ],
    },
    {
      type: "callout",
      tone: "info",
      title: "KEEL VS HULL",
      text: "If you still owe high-rate consumer debt and have no starter cushion, consider funding Keel first, then snowflaking the rest to Hull. If Keel is done, every snowflake can hit the active payoff debt.",
    },
    {
      type: "paragraph",
      text: "On the Debts tab, open a debt and tap Pay to record a one-time amount. The celebration and history views confirm the win. Small snowflakes matter: $75 here and $200 there change the payoff date more than they feel.",
    },
    {
      type: "callout",
      tone: "success",
      title: "MAKE IT VISIBLE",
      text: "Payments logged in BudgetArk update your progress ring and Build Your Ark milestones. Invisible extra payments are easy to forget you made. Log them.",
    },
  ],
  keyTakeaway:
    "Windfalls are payoff fuel. Decide the split early, log the payment, and aim at one target.",
  action: {
    label: "Log a debt payment",
    route: "debts",
  },
};

export default lesson;
