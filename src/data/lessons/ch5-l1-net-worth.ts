import type { Lesson } from "../../types";

const lesson: Lesson = {
  id: "ch5-l1-net-worth",
  chapterId: "ch5",
  number: 1,
  title: "Net worth - the only score",
  readMin: 4,
  topics: ["mindset", "investing"],
  glyph: "🧭",
  summary:
    "Everything you own minus everything you owe. One number that tells the truth when income, spending, and appearances all lie.",
  whyItMatters:
    "A high salary can hide a sinking ship and a modest one can quietly build wealth. Net worth is the only number that can't be fooled by either.",
  body: [
    {
      type: "paragraph",
      text: "Net worth is simple arithmetic: add up what you own (cash, savings, investments, retirement accounts, home value, vehicles), subtract what you owe (mortgage, loans, cards), and the remainder is your score. It can absolutely be negative early on - a student loan larger than your savings is a starting line, not a verdict. What matters is not today's number but its direction over quarters and years.",
    },
    {
      type: "bullet-list",
      title: "Why this beats every other metric",
      items: [
        "Income measures what flows past you; net worth measures what stayed",
        "It unifies the whole course: paying debt, saving, and investing all move the same number",
        "It's immune to lifestyle theater - the car lease that looks like wealth shows up as a liability",
      ],
    },
    {
      type: "paragraph",
      text: "The magic is in the trend, not the level. A month where the market drops can push net worth down even when you did everything right - and a bonus month can flatter it while spending quietly grew. Check it monthly or quarterly, compare against a year ago, and judge yourself only on the slope. Wealth-building is a slope game.",
    },
    {
      type: "callout",
      tone: "info",
      title: "YOUR SHIP'S POSITION",
      text: "The Bridge tab computes net worth from what you track in BudgetArk - accounts, debts, and holdings - and the history card keeps monthly snapshots so the trend line draws itself. The lessons you've completed are, literally, what bends that line upward.",
    },
    {
      type: "callout",
      tone: "warn",
      title: "DON'T COMPARE BOATS",
      text: "Net worth is a private instrument, not a leaderboard. Someone else's number comes with someone else's income, city, health, and starting line. The only comparison that means anything is you versus you, a year ago.",
    },
  ],
  keyTakeaway:
    "Track net worth monthly and judge the slope, not the level. Direction is the whole game.",
  action: {
    label: "See your net worth on Bridge",
    route: "bridge",
  },
};

export default lesson;
