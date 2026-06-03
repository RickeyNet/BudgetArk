import type { Lesson } from "../../types";

const lesson: Lesson = {
  id: "ch2-l5-refinancing",
  chapterId: "ch2",
  number: 5,
  title: "Refinancing - when it pays",
  readMin: 6,
  topics: ["debt", "real_estate"],
  glyph: "🔄",
  summary:
    "Refinancing swaps your old loan for a new one. It only helps when the math beats the fees.",
  whyItMatters:
    "A lower monthly payment can still cost more if the term stretches longer or closing costs eat the savings.",
  body: [
    {
      type: "paragraph",
      text: "Refinancing means replacing an existing loan with a new loan, usually to get a lower interest rate, a different term, or to consolidate several debts into one payment. The lender pays off the old balance; you start fresh with new paperwork and often new fees.",
    },
    {
      type: "bullet-list",
      title: "When it can make sense",
      items: [
        "Rates dropped meaningfully since you borrowed",
        "Your credit score improved and you qualify for better terms",
        "You want one payment instead of several (consolidation), and the blended rate is truly lower",
        "You can afford the same or higher payment on a shorter term to finish sooner",
      ],
    },
    {
      type: "bullet-list",
      title: "Red flags",
      items: [
        "Closing costs or origination fees bigger than the interest you will save",
        "A longer term that lowers the payment but raises total interest paid",
        "Resetting the clock on a car or mortgage just to free up cash for lifestyle spending",
      ],
    },
    {
      type: "callout",
      tone: "info",
      title: "BREAK-EVEN MONTHS",
      text: "Divide total closing costs by monthly payment savings. That is how many months until you are ahead. If you might sell the house or pay off the car before that date, refinancing may not be worth it.",
    },
    {
      type: "calculator-embed",
      calc: "refinance-break-even",
    },
    {
      type: "paragraph",
      text: "On the Charts tab, the Refinance Break-Even tool under TOOLS pulls debts from your tracker, blends balances and rates, and shows months-to-break-even plus lifetime interest difference. Run the numbers before you sign.",
    },
  ],
  keyTakeaway:
    "Refinance when lower interest and fees beat your break-even timeline, not when a ad promises \"easy money.\"",
  action: {
    label: "Open refinance calculator",
    route: "charts",
  },
};

export default lesson;
