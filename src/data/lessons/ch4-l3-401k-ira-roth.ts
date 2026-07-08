import type { Lesson } from "../../types";

const lesson: Lesson = {
  id: "ch4-l3-401k-ira-roth",
  chapterId: "ch4",
  number: 3,
  title: "401(k), IRA, Roth - which first?",
  readMin: 7,
  topics: ["investing", "retirement", "taxes"],
  glyph: "🪜",
  summary:
    "These aren't investments - they're tax shelters you put investments inside. Fill them in the right order and the same dollars retire richer.",
  whyItMatters:
    "The order you fund accounts in can be worth six figures over a career, and one step of it - the employer match - is a literal 50-100% instant return.",
  body: [
    {
      type: "paragraph",
      text: "A 401(k) is a retirement account through your employer; an IRA is one you open yourself - ten minutes online at any major brokerage, with Fidelity, Charles Schwab, and Vanguard the usual picks. Both are wrappers - the index funds from last lesson go inside them - and both shelter your investments from taxes while they grow. The difference is when you pay tax: Traditional accounts skip tax now and pay it in retirement; Roth accounts pay tax now and never again, with all growth withdrawn tax-free.",
    },
    {
      type: "bullet-list",
      title: "The funding ladder - fill each rung before the next",
      items: [
        "1. 401(k) up to the employer match - free money, take all of it",
        "2. Any high-interest debt - a guaranteed 'return' no market matches",
        "3. IRA (Roth for most people) up to its annual limit",
        "4. Back to the 401(k), toward its much higher annual limit",
        "5. HSA if you have one - triple tax-advantaged; regular brokerage after that",
      ],
    },
    {
      type: "callout",
      tone: "warn",
      title: "NEVER SKIP THE MATCH",
      text: "If your employer matches 50% of contributions up to 6% of salary, that's an instant 50% return before the money is even invested. No debt payoff, no fund, no strategy anywhere in this course beats it. Contribute at least enough to capture every matching dollar.",
    },
    {
      type: "paragraph",
      text: "Roth or Traditional? The honest answer: compare your tax rate today to your expected rate in retirement. Early in a career, when income and tax rates are low, Roth usually wins - pay the small tax now, never pay tax on decades of growth. In peak earning years, Traditional's upfront deduction often wins. If you're truly unsure, Roth is the simpler default and splitting between both is a perfectly good hedge.",
    },
    {
      type: "callout",
      tone: "info",
      title: "LIMITS MOVE - THE ORDER DOESN'T",
      text: "Contribution limits change most years (for 2026, roughly $24,500 for a 401(k) and $7,500 for an IRA - verify current numbers). Don't memorize figures; memorize the ladder. Match, expensive debt, IRA, more 401(k).",
    },
    {
      type: "paragraph",
      text: "One trap to avoid: money sitting in a retirement account isn't automatically invested. Plenty of people contribute for years while the cash sits in a money-market default earning almost nothing. After you set your contribution, pick the investments inside - a low-cost target-date fund or the index funds from last lesson both work.",
    },
    {
      type: "callout",
      tone: "success",
      title: "TEN-MINUTE WIN",
      text: "Log into your 401(k) portal today and check two things: are you getting the full match, and is the money actually invested in something? Those two checks are worth more than a year of market predictions.",
    },
    {
      type: "callout",
      tone: "info",
      title: "FROM THE BOOKSHELF",
      text: "Unshakeable by Tony Robbins goes deeper on the retirement side of this lesson: how to audit the fees hiding inside your 401(k) plan's fund lineup, why a fiduciary advisor answers to you while a broker answers to commissions, and how to stay invested through the crashes you'll live through between now and retirement.",
    },
  ],
  keyTakeaway:
    "Match first, always. Then expensive debt, then IRA, then more 401(k) - and make sure the money inside is actually invested.",
  action: {
    label: "Budget your contributions",
    route: "budget",
  },
  resources: [
    {
      type: "book",
      title: "Unshakeable: Your Financial Freedom Playbook",
      author: "Tony Robbins with Peter Mallouk",
    },
  ],
};

export default lesson;
