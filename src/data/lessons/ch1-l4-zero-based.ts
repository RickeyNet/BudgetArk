import type { Lesson } from "../../types";

const lesson: Lesson = {
  id: "ch1-l4-zero-based",
  chapterId: "ch1",
  number: 4,
  title: "Zero-based budgeting",
  readMin: 6,
  topics: ["budgeting"],
  glyph: "0️⃣",
  summary:
    "Every dollar gets a job before the month starts. Income minus assignments equals zero.",
  whyItMatters:
    "It is the strictest budget style. It also surfaces problems faster than any other, which is the whole point.",
  body: [
    {
      type: "paragraph",
      text: "Zero-based budgeting (sometimes called 'every dollar' budgeting) gives every dollar of your income a job before the month begins. Income minus everything assigned equals zero. Not '$300 left over.' Zero.",
    },
    {
      type: "callout",
      tone: "info",
      title: "ZERO IS NOT BROKE",
      text: "Money assigned to savings or debt payoff still counts as assigned. Zero just means no unassigned cash, not no cash.",
    },
    {
      type: "bullet-list",
      title: "What it looks like",
      items: [
        "Take-home this month: $4,000",
        "Rent: $1,400",
        "Food: $500",
        "Utilities: $300",
        "Fuel: $400",
        "Wants: $200",
        "Extra debt payment: $1,000",
        "Savings: $200",
        "Total assigned: $4,000. Remainder: $0.",
      ],
    },
    {
      type: "paragraph",
      text: "If your income is irregular (freelance, tips, commission, side work), budget LAST month's income, not this month's hopes. You always have last month's total in hand before you assign it, so you are spending real money instead of expected money.",
    },
    {
      type: "bullet-list",
      title: "Why it works",
      items: [
        "There is no 'leftover' to drift onto random spending",
        "Every category has a target, so overspending is visible immediately",
        "Forces a real conversation between you and your priorities each month",
      ],
    },
    {
      type: "paragraph",
      text: "Zero-based is more upfront work than 50/30/20. The payoff is that you stop wondering where money went, because you decided ahead of time. It is the budget style that scales best as your finances get more complicated.",
    },
    {
      type: "paragraph",
      text: "Try it for one month before you decide if it suits your brain. Some people thrive on the structure. Others find it too rigid and prefer the percentage style. Both are real budgets.",
    },
  ],
  keyTakeaway:
    "Income minus assigned categories should equal zero. Savings and debt payoff count as assigned.",
  action: {
    label: "Set up category limits",
    route: "budget",
  },
};

export default lesson;
