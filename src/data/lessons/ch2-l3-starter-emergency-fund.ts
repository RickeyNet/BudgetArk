import type { Lesson } from "../../types";

const lesson: Lesson = {
  id: "ch2-l3-starter-emergency-fund",
  chapterId: "ch2",
  number: 3,
  title: "The $1,000 starter emergency fund",
  readMin: 5,
  topics: ["debt", "saving"],
  glyph: "🛡️",
  summary:
    "Before you throw every dollar at debt, keep a small cushion so the next surprise does not become new debt.",
  whyItMatters:
    "One flat tire without cash on hand undoes months of payoff progress when it lands on a card.",
  body: [
    {
      type: "paragraph",
      text: "A starter emergency fund is a small pile of cash reserved for true surprises: medical copays, car repair, broken appliance, sudden travel. The classic first target is $1,000. It is not your forever safety net. It is a shock absorber while you are still in debt.",
    },
    {
      type: "bullet-list",
      title: "What counts as an emergency",
      items: [
        "Unexpected, necessary, and time-sensitive",
        "Would otherwise go on a credit card you cannot pay off this month",
        "Not sales, vacations, or planned upgrades",
      ],
    },
    {
      type: "bullet-list",
      title: "What it is not",
      items: [
        "A vacation fund (that is a sinking fund on the Budget tab)",
        "Investment money (different job, different account)",
        "An excuse to pause debt payoff forever",
      ],
    },
    {
      type: "callout",
      tone: "info",
      title: "WHY BEFORE AGGRESSIVE PAYOFF",
      text: "Without a cushion, every surprise becomes new debt at credit-card rates. You pay off $400, then put $400 back on the card for brakes. The starter fund breaks that cycle so payoff sticks.",
    },
    {
      type: "paragraph",
      text: "On the Debts tab, Build Your Ark tracks the Keel step: your starter cushion target. Savings-category budget entries count toward that reserve. Once Keel is funded, you pour more into the Hull step: clearing non-mortgage debt.",
    },
    {
      type: "callout",
      tone: "success",
      title: "START SMALL IF YOU MUST",
      text: "$1,000 is a target, not a gate. Saving $200, then $500, still helps. Log savings on the Budget tab under Savings so progress shows up in your milestone and on Bridge.",
    },
  ],
  keyTakeaway:
    "A small cash cushion keeps setbacks off the card. Fund Keel, then attack expensive debt.",
  action: {
    label: "Open Build Your Ark",
    route: "debts",
  },
};

export default lesson;
