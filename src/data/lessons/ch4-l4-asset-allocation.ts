import type { Lesson } from "../../types";

const lesson: Lesson = {
  id: "ch4-l4-asset-allocation",
  chapterId: "ch4",
  number: 4,
  title: "Asset allocation by decade",
  readMin: 6,
  topics: ["investing", "retirement"],
  glyph: "⚖️",
  summary:
    "How much stocks versus bonds matters more than which fund you pick. The right mix is the riskiest one you can hold without selling in a panic.",
  whyItMatters:
    "The investor who holds a decent mix through a crash beats the investor who held a perfect mix and sold at the bottom. Allocation is really about designing for your own worst day.",
  body: [
    {
      type: "paragraph",
      text: "Asset allocation is your portfolio's split between stocks and bonds. Stocks are the engine: higher returns over decades, with gut-wrenching drops along the way. Bonds are the keel: steadier, lower returns that cushion the falls. More stock means a faster boat and rougher seas; more bonds means smoother sailing that arrives later. Research consistently finds this split drives the vast majority of a portfolio's behavior - far more than fund selection.",
    },
    {
      type: "bullet-list",
      title: "A classic starting point by age",
      items: [
        "20s-30s: 90-100% stocks - decades to recover, volatility is noise",
        "40s: ~80% stocks / 20% bonds - still growth-heavy, first shock absorbers",
        "50s: ~70/30 to 60/40 - retirement is visible; a crash matters more",
        "60s+: ~60/40 to 50/50 - protect what compounding built",
      ],
    },
    {
      type: "paragraph",
      text: "These are defaults, not rules, and the honest adjustment is psychological. A 100% stock portfolio historically drops 30-50% a few times per lifetime. If a 40% drop would make you sell, a 90/10 allocation is wrong for you no matter what your birth year says - the allocation you abandon in a crash has a worse return than any allocation you keep.",
    },
    {
      type: "callout",
      tone: "info",
      title: "THE ONE-FUND SHORTCUT",
      text: "A target-date fund does this entire lesson for you: pick the fund named for your retirement year and it holds a diversified mix that automatically shifts from stocks toward bonds as the date approaches. Slightly less control, dramatically harder to get wrong. For most people it's an excellent answer.",
    },
    {
      type: "paragraph",
      text: "If you manage the mix yourself, rebalance about once a year: when a great stock run pushes your 80/20 to 88/12, sell some stock and buy bonds to get back to plan. It feels backwards - trimming winners to buy laggards - which is exactly why it works. Rebalancing forces you to sell high and buy low on a schedule, with no forecasting required.",
    },
    {
      type: "callout",
      tone: "warn",
      title: "DON'T TOUCH THE DIAL IN A STORM",
      text: "Changing allocation during a crash is market timing wearing a disguise. Set the mix in calm weather, write down why, and change it when your life changes - new decade, retirement in sight - not when headlines scream.",
    },
  ],
  keyTakeaway:
    "Pick a stock/bond mix that fits your age and your stomach, rebalance yearly, and only change it when life changes.",
  action: {
    label: "Review your holdings mix",
    route: "bridge",
  },
};

export default lesson;
