import type { Lesson } from "../../types";

const lesson: Lesson = {
  id: "ch3-l2-hysa-basics",
  chapterId: "ch3",
  number: 2,
  title: "High-yield savings 101",
  readMin: 4,
  topics: ["saving"],
  glyph: "🏦",
  summary:
    "Same insurance, same access, ten to twenty times the interest. Moving your savings is an hour of work you do once.",
  whyItMatters:
    "A big-bank savings account often pays 0.01% while online banks pay 4% or more. On a $15,000 emergency fund that gap is hundreds of dollars a year for doing nothing.",
  body: [
    {
      type: "paragraph",
      text: "A high-yield savings account (HYSA) is a normal savings account offered by a bank that runs online instead of on street corners. No branches means lower costs, and lower costs get passed to you as a dramatically higher interest rate. The money is just as safe: look for FDIC insurance (or NCUA at a credit union), which covers up to $250,000 per depositor, per bank.",
    },
    {
      type: "bullet-list",
      title: "What to look for",
      items: [
        "FDIC or NCUA insured - non-negotiable",
        "No monthly fees and no minimum balance requirements",
        "A rate near the top of the market, not necessarily the very top",
        "Easy transfers to and from your everyday checking account",
      ],
    },
    {
      type: "bullet-list",
      title: "What to ignore",
      items: [
        "Teaser rates that expire after a few months",
        "Accounts that demand direct deposit or debit-card swipes to earn the rate",
        "Chasing an extra 0.1% by moving banks every quarter",
      ],
    },
    {
      type: "callout",
      tone: "info",
      title: "RATES FLOAT",
      text: "HYSA rates track the Federal Reserve's rate, so they rise and fall over time. That's fine. The goal is to be in the right neighborhood, not to hold the single best rate in the country every week.",
    },
    {
      type: "paragraph",
      text: "There is a hidden benefit beyond interest: friction. Savings that live at a different bank than your debit card take a day or two to reach checking. That small delay is often exactly enough to stop an impulse raid on the emergency fund, while still being fast enough for a real emergency.",
    },
    {
      type: "callout",
      tone: "success",
      title: "THE ONE-HOUR MOVE",
      text: "Open the account, link your checking, transfer the balance, and set up the recurring deposit you budgeted last lesson. Then log the interest you receive each month as income on the Budget tab - watching the account pay you is great fuel.",
    },
  ],
  keyTakeaway:
    "Park your emergency fund and short-term savings in an FDIC-insured high-yield account. Same safety, real interest.",
  action: {
    label: "Add a recurring savings entry",
    route: "budget",
  },
};

export default lesson;
