import type { Lesson } from "../../types";

const lesson: Lesson = {
  id: "ch4-l1-compounding",
  chapterId: "ch4",
  number: 1,
  title: "Why compounding is the whole game",
  readMin: 5,
  topics: ["investing"],
  glyph: "🌱",
  summary:
    "Money earns returns, then the returns earn returns. Given enough years, the snowball dwarfs the snow you threw on it.",
  whyItMatters:
    "Every investing decision - when to start, what to buy, what fees to accept - is really a decision about how much compounding you'll allow to happen.",
  body: [
    {
      type: "paragraph",
      text: "Compounding means your returns start earning their own returns. Invest $10,000 at 7% and you earn $700 the first year. But the second year you earn 7% on $10,700, the third on $11,449, and the curve keeps steepening. At 7%, money doubles roughly every ten years - so a dollar invested at 25 doubles four times by 65, while the same dollar invested at 45 doubles only twice.",
    },
    {
      type: "bullet-list",
      title: "The same $500/month, at 7%, until age 65",
      items: [
        "Starting at 25: roughly $1.2 million (you contributed $240k)",
        "Starting at 35: roughly $570,000 (you contributed $180k)",
        "Starting at 45: roughly $250,000 (you contributed $120k)",
      ],
    },
    {
      type: "paragraph",
      text: "Read that list again. The 25-year-old contributed only twice as much as the 45-year-old but ends with nearly five times the money. The difference isn't skill or luck - it's the extra doublings. Time in the market is the single input you can never buy back later, which is why 'start now, even small' beats 'start big, someday' every time it's tested.",
    },
    {
      type: "calculator-embed",
      calc: "compound-interest",
    },
    {
      type: "callout",
      tone: "warn",
      title: "COMPOUNDING CUTS BOTH WAYS",
      text: "Credit card debt is compounding running in reverse - which is why Chapter 2 came before this one. The same math also applies to fees: a 1% annual fee sounds tiny but quietly confiscates around a quarter of a 40-year portfolio. Guard your compounding from both.",
    },
    {
      type: "callout",
      tone: "success",
      title: "THE ORDER OF OPERATIONS",
      text: "Expensive debt paid off, starter fund built, emergency fund growing - if you've followed the course, you're ready. Even $50 a month invested now starts the clock, and the clock is the whole game.",
    },
  ],
  keyTakeaway:
    "Start as early as possible, even small. Years invested matter more than dollars invested.",
  action: {
    label: "Open the Compound Interest Calculator",
    route: "charts",
  },
};

export default lesson;
