import type { Lesson } from "../../types";

const lesson: Lesson = {
  id: "ch3-l3-sinking-funds",
  chapterId: "ch3",
  number: 3,
  title: "Sinking funds",
  readMin: 5,
  topics: ["saving", "budgeting"],
  glyph: "🪣",
  summary:
    "Most 'emergencies' are actually predictable. A sinking fund pays for December in July, one small deposit at a time.",
  whyItMatters:
    "Christmas is not a surprise. Neither are tires, annual insurance premiums, or your friend's wedding. Naming these costs early is how a budget survives contact with real life.",
  body: [
    {
      type: "paragraph",
      text: "A sinking fund is money you set aside monthly for a specific future expense you can see coming. Take the total cost, divide by the months until it lands, and save that slice every month. When the bill arrives, the money is already there - no card, no scramble, no raiding the emergency fund.",
    },
    {
      type: "bullet-list",
      title: "Classic sinking funds",
      items: [
        "Car: registration, insurance premiums, tires, and repairs",
        "Holidays and birthdays - the calendar publishes these in advance",
        "Annual subscriptions and memberships",
        "Vacation, with a number attached instead of a vibe",
        "Home or apartment: deposits, repairs, furniture",
      ],
    },
    {
      type: "paragraph",
      text: "The math is deliberately unimpressive. A $600 holiday season saved from January is $50 a month. New tires at $800, eighteen months out, is about $45 a month. Small enough to fit in almost any budget - which is the whole trick. The same expense as a lump in December can wreck a month; as a slice, it's a rounding error.",
    },
    {
      type: "callout",
      tone: "info",
      title: "SINKING FUND VS EMERGENCY FUND",
      text: "The test is surprise. Emergency fund: unexpected and necessary (job loss, ER visit). Sinking fund: expected and scheduled (insurance premium, brake pads eventually). If you keep 'borrowing' from your emergency fund for predictable things, you're missing a sinking fund, not discipline.",
    },
    {
      type: "paragraph",
      text: "In BudgetArk, give each sinking fund its own recurring entry on the Budget tab under Savings, named for the goal: 'Car repairs', 'Holidays', 'Vacation'. The named entries do two jobs at once - they carve the money out of your spendable balance each month, and the history shows you exactly how much each bucket holds.",
    },
    {
      type: "callout",
      tone: "success",
      title: "START WITH ONE",
      text: "Don't build eight buckets tonight. Pick the expense that most recently ambushed you, divide it by the months until it happens again, and add that one recurring entry. Add the next fund next month.",
    },
  ],
  keyTakeaway:
    "Predictable expenses deserve a monthly slice, not a December panic. Name the bucket, automate the slice.",
  action: {
    label: "Create a sinking fund entry",
    route: "budget",
  },
};

export default lesson;
