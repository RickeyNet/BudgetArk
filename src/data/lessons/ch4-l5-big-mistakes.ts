import type { Lesson } from "../../types";

const lesson: Lesson = {
  id: "ch4-l5-big-mistakes",
  chapterId: "ch4",
  number: 5,
  title: "Avoiding the big mistakes",
  readMin: 5,
  topics: ["investing", "mindset"],
  glyph: "🧯",
  summary:
    "Investing success is mostly subtraction. Avoid a handful of classic errors and the boring plan does the rest.",
  whyItMatters:
    "The gap between market returns and what investors actually earn comes almost entirely from self-inflicted wounds - buying high, selling low, and paying too much along the way.",
  body: [
    {
      type: "paragraph",
      text: "Here's the strange truth of this chapter: you now know roughly everything you need. Compounding, index funds, tax-advantaged accounts, an allocation you can live with. From here, outcomes are decided less by what you do than by what you manage not to do. These are the classics.",
    },
    {
      type: "bullet-list",
      title: "The five big ones",
      items: [
        "Panic selling - locking in a crash by selling at the bottom, then missing the recovery",
        "Market timing - waiting in cash for 'the right moment' that's only visible in hindsight",
        "Performance chasing - buying whatever fund or coin just had a hot year, right before it cools",
        "High fees - a 1% adviser or fund fee quietly eating a quarter of a 40-year portfolio",
        "Concentration - too much in one stock, one sector, or your own employer",
      ],
    },
    {
      type: "callout",
      tone: "warn",
      title: "MISSING THE BEST DAYS",
      text: "The market's best days cluster tightly around its worst ones. Studies repeatedly show that missing just the 10 best days over a few decades cuts final returns roughly in half - and the surest way to miss them is to be sitting out after a scary drop. Staying in IS the strategy.",
    },
    {
      type: "paragraph",
      text: "The defense against all five mistakes is the same: automate, then ignore. A fixed contribution invests every payday regardless of headlines (dollar-cost averaging), the allocation you set in calm weather absorbs the storms, and an annual check-in replaces the daily scoreboard. Every mistake on the list requires an action - so build a system where the default action is nothing.",
    },
    {
      type: "callout",
      tone: "info",
      title: "EMPLOYER STOCK DESERVES ITS OWN WARNING",
      text: "Your paycheck already depends on your company. If your savings do too, one bad year at work can hit your income and your portfolio at once. A common rule: keep employer stock under 10% of your investments.",
    },
    {
      type: "callout",
      tone: "success",
      title: "CHAPTER 4, IN ONE SENTENCE",
      text: "Buy low-cost index funds inside tax-advantaged accounts, at an allocation you can hold through a crash, automatically, forever - and let compounding do the heavy lifting.",
    },
  ],
  keyTakeaway:
    "You can't control returns; you can control behavior, fees, and diversification. That's enough to win.",
  action: {
    label: "See your progress on Bridge",
    route: "bridge",
  },
};

export default lesson;
