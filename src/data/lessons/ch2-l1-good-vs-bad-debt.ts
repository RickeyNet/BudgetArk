import type { Lesson } from "../../types";

const lesson: Lesson = {
  id: "ch2-l1-good-vs-bad-debt",
  chapterId: "ch2",
  number: 1,
  title: "Good debt vs bad debt",
  readMin: 4,
  topics: ["debt", "mindset"],
  glyph: "⚓",
  summary:
    "Textbooks split debt into good and bad. We treat almost all consumer debt, including car loans, as bad debt worth paying down.",
  whyItMatters:
    "Treating every balance the same leads to either panic or denial. Sorting debt by type tells you what to attack first.",
  body: [
    {
      type: "paragraph",
      text: "Debt is money you owe plus the cost of borrowing it. Personal-finance books often label some loans \"good\" (mortgage, sometimes student loans) and others \"bad\" (cards, lifestyle spending). The label is not moral judgment. It is math plus purpose. BudgetArk is stricter about cars than most books.",
    },
    {
      type: "bullet-list",
      title: "Often called \"good\" debt",
      items: [
        "A mortgage on a home you can afford (an asset that may appreciate, often a lower rate)",
        "Student loans only when the degree has a realistic earning path and the payment is manageable",
      ],
    },
    {
      type: "bullet-list",
      title: "Bad debt in our book (pay it down)",
      items: [
        "Credit cards and store cards carrying a balance month to month",
        "Car loans - see below; we do not treat these as good debt",
        "Medical bills, payment plans, and medical debt in collections",
        "Buy-now-pay-later and loans for vacations, gadgets, or lifestyle you cannot cash-flow today",
      ],
    },
    {
      type: "callout",
      tone: "warn",
      title: "CAR LOANS ARE NOT GOOD DEBT",
      text: "A car loses value the day you drive it off the lot. You may need a car to get to work; that makes the loan necessary sometimes, not good. Need and good are different. Pay car loans off in your Hull phase with your other non-mortgage debt, and compare APR like any other loan.",
    },
    {
      type: "callout",
      tone: "info",
      title: "MEDICAL DEBT",
      text: "Hospital and clinic bills are unplanned bad debt, not a moral failure. Check the bill against your insurance explanation of benefits, ask about financial assistance, and know the APR: a 0% hospital plan is different from a medical credit card at 20%+. List it on the Debts tab like everything else.",
    },
    {
      type: "callout",
      tone: "warn",
      title: "RATE MATTERS MORE THAN THE LABEL",
      text: "Even a mortgage at a terrible rate or a payment you cannot afford is dangerous. Always compare APR and cash flow, not just the category someone else gave the loan.",
    },
    {
      type: "paragraph",
      text: "BudgetArk separates debts on the Debts tab into credit/personal, car, and house so you can see what you are carrying. Hull (Build Your Ark) targets all non-mortgage balances: cards, car, medical logged as personal, and the rest.",
    },
    {
      type: "callout",
      tone: "info",
      title: "IN THE APP",
      text: "Add each real account with its current balance, APR, and minimum payment. Honest numbers beat rounded guesses. You cannot prioritize what you have not listed.",
    },
  ],
  keyTakeaway:
    "Car loans are bad debt here, period. Attack expensive and non-mortgage debt; keep the mortgage for later unless the math says otherwise.",
  action: {
    label: "Open the Debts tab",
    route: "debts",
  },
};

export default lesson;
