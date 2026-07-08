import type { Lesson } from "../../types";

const lesson: Lesson = {
  id: "ch5-l2-buy-vs-rent",
  chapterId: "ch5",
  number: 2,
  title: "Buy vs rent the math",
  readMin: 6,
  topics: ["real_estate"],
  glyph: "🏠",
  summary:
    "Renting is not throwing money away, and buying is not automatically winning. The honest comparison has more line items than the mortgage.",
  whyItMatters:
    "A house is most people's largest purchase and most emotional one. Running the real numbers before house-hunting keeps the biggest decision of the decade from being made by a feeling.",
  body: [
    {
      type: "paragraph",
      text: "The classic argument says rent is money you never see again while a mortgage 'builds equity'. But a huge share of homeownership cost is also money you never see again: mortgage interest, property taxes, insurance, maintenance, HOA fees, and the transaction costs of buying and selling. Owning is partly an investment and partly just a more expensive way to pay for shelter - the math tells you the balance for your specific case.",
    },
    {
      type: "bullet-list",
      title: "The costs renters never pay",
      items: [
        "Mortgage interest - the majority of each payment in the early years",
        "Property tax and homeowner's insurance, forever",
        "Maintenance - budget roughly 1-2% of home value per year",
        "Buying and selling costs - often 8-10% of the price round-trip",
      ],
    },
    {
      type: "paragraph",
      text: "That last item drives the most practical rule in real estate: time horizon. Transaction costs are spread across your years in the home, so buying tends to beat renting only if you'll stay put roughly five or more years. Move after two and the closing costs alone can erase every dollar of equity you built. If your job, relationship, or city might change soon, renting is usually the mathematically stronger - and more flexible - position.",
    },
    {
      type: "callout",
      tone: "info",
      title: "A QUICK SCREENER",
      text: "Compare a home's price to the annual rent for an equivalent place. Under ~15x annual rent, buying looks attractive; over ~20x, renting and investing the difference often wins. It's a screener, not a verdict - but it instantly flags which market you're standing in.",
    },
    {
      type: "calculator-embed",
      calc: "loan-amortization",
    },
    {
      type: "paragraph",
      text: "When you do buy, buy less than the bank offers. Lenders approve payments that leave no room for the rest of this course - retirement contributions, sinking funds, an emergency fund that survives a roof. A common guardrail: keep total housing costs near 28% of gross income or less, and walk into the purchase with the full emergency fund intact.",
    },
    {
      type: "callout",
      tone: "success",
      title: "RENTING TO WIN",
      text: "If the math says rent, rent proudly - and actually invest the monthly difference. A renter who invests the gap frequently ends up wealthier than the neighbor who bought. The mistake isn't renting; it's renting and spending the difference.",
    },
  ],
  keyTakeaway:
    "Buy when you'll stay five-plus years and the payment leaves your plan intact. Otherwise rent, and invest the difference on purpose.",
  action: {
    label: "Run the mortgage numbers",
    route: "charts",
  },
};

export default lesson;
