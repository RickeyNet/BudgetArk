import type { Lesson } from "../../types";

const lesson: Lesson = {
  id: "ch3-l4-short-term-cash",
  chapterId: "ch3",
  number: 4,
  title: "Where to park short-term cash",
  readMin: 5,
  topics: ["saving"],
  glyph: "⚓",
  summary:
    "Money you need within five years doesn't belong in the market. Match where the cash sits to when you'll need it.",
  whyItMatters:
    "A house down payment invested in stocks can drop 25% the year you find the house. Short-term money has one job: be all there, on time.",
  body: [
    {
      type: "paragraph",
      text: "Once you're saving for real goals - a car in two years, a down payment in four - the question becomes where the money should wait. The rule of thumb: the sooner you need it, the safer and more boring the parking spot. Return is the reward for taking risk over long periods; short timelines can't absorb a bad year.",
    },
    {
      type: "bullet-list",
      title: "The parking lot, by timeline",
      items: [
        "Needed any day (emergency fund): high-yield savings account",
        "Under ~2 years: HYSA or money market fund - full flexibility, solid rate",
        "2-5 years with a known date: CDs or Treasury bills laddered to mature when you need the cash",
        "5+ years: now you're in investing territory - that's the next chapter",
      ],
    },
    {
      type: "paragraph",
      text: "A certificate of deposit (CD) locks your money at a fixed rate for a fixed term - you give up access, you gain certainty. Treasury bills do the same job, backed by the U.S. government, with interest exempt from state income tax. Money market funds float with current rates and stay liquid. All three are fine; the differences are small compared to the difference between any of them and a checking account paying zero.",
    },
    {
      type: "callout",
      tone: "warn",
      title: "THE TEMPTATION",
      text: "When markets are up, cash earning 4% feels slow and someone will tell you to 'put it to work'. Remember what this money is for. A 20% market drop the year you need the down payment doesn't 'average out' - the closing date doesn't move.",
    },
    {
      type: "callout",
      tone: "info",
      title: "INFLATION STILL BITES",
      text: "Cash loses a little purchasing power every year, which is exactly why only short-term money belongs here. Parking a 30-year retirement fund in savings is as costly a mistake as gambling next year's tuition on stocks - risk has to match the timeline in both directions.",
    },
    {
      type: "paragraph",
      text: "Track each parked goal in BudgetArk the same way as your sinking funds: a named recurring Savings entry on the Budget tab. Your growing balances feed into net worth on the Bridge, so you can watch the down payment fund climb month over month.",
    },
  ],
  keyTakeaway:
    "Under five years, safety beats return. HYSA for flexibility, CDs or T-bills for known dates, and the market only for money that can wait.",
  action: {
    label: "Review your savings on Bridge",
    route: "bridge",
  },
};

export default lesson;
