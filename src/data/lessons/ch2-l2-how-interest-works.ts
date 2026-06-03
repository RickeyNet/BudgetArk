import type { Lesson } from "../../types";

const lesson: Lesson = {
  id: "ch2-l2-how-interest-works",
  chapterId: "ch2",
  number: 2,
  title: "How interest actually works",
  readMin: 6,
  topics: ["debt"],
  glyph: "📈",
  summary:
    "Interest is rent on borrowed money. The APR tells you how expensive that rent is per year.",
  whyItMatters:
    "Minimum payments are designed to keep you paying for years. Understanding interest is how you break that loop.",
  body: [
    {
      type: "paragraph",
      text: "APR (annual percentage rate) is what the lender charges per year on the balance you still owe. It is not a one-time fee. Every month, interest accrues on whatever balance is left, then your payment covers interest first and only then chips away at principal.",
    },
    {
      type: "bullet-list",
      title: "What that means in practice",
      items: [
        "Higher APR = more of each payment disappears into interest",
        "A $5,000 card at 24% APR costs over $1,000 a year in interest if the balance never drops",
        "Paying only the minimum often leaves the balance barely moving",
      ],
    },
    {
      type: "callout",
      tone: "warn",
      title: "THE MINIMUM PAYMENT TRAP",
      text: "Minimums are built to keep accounts profitable for the lender. They are not a payoff plan. If you only pay the minimum on high-rate debt, you are renting that balance indefinitely.",
    },
    {
      type: "paragraph",
      text: "Compound interest works against you on debt: interest earns interest on the next cycle. That is why knocking down the highest-rate balance first (avalanche) saves real money, and why even an extra $50 above the minimum changes the timeline.",
    },
    {
      type: "calculator-embed",
      calc: "loan-amortization",
    },
    {
      type: "paragraph",
      text: "On each debt in BudgetArk, set the APR from your statement (not a guess). The payoff order and projections on the Debts tab use that rate. Wrong APR means wrong priorities.",
    },
  ],
  keyTakeaway:
    "APR is the price of waiting. Pay more than the minimum on the most expensive balance when you can.",
  action: {
    label: "Review your debt APRs",
    route: "debts",
  },
};

export default lesson;
