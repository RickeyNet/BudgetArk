import type { Lesson } from "../../types";

const lesson: Lesson = {
  id: "ch5-l4-estate-basics",
  chapterId: "ch5",
  number: 4,
  title: "Estate basics (will, beneficiaries, TOD)",
  readMin: 5,
  topics: ["mindset"],
  glyph: "📜",
  summary:
    "A few forms decide whether the wealth you built lands with your people or in a yearlong court process. Most of them are free.",
  whyItMatters:
    "Without instructions, state law and a probate court decide who gets everything - slowly, publicly, and possibly not the way you'd have chosen. An afternoon of paperwork closes that gap.",
  body: [
    {
      type: "paragraph",
      text: "Estate planning sounds like a mansion problem, but it's really a checklist problem, and you already have an estate: bank accounts, retirement funds, maybe a home, maybe kids. The final lesson of the Captain's Course is making sure the ship you've built reaches the right harbor without you. Three tools do most of the work.",
    },
    {
      type: "bullet-list",
      title: "The big three",
      items: [
        "Beneficiary designations - name who inherits each retirement and life-insurance account; these transfer directly, skipping court entirely",
        "TOD/POD designations - the same idea for bank and brokerage accounts (transfer/payable on death); usually a free form at your institution",
        "A will - covers everything else, and critically, names a guardian for minor children",
      ],
    },
    {
      type: "callout",
      tone: "warn",
      title: "BENEFICIARIES BEAT THE WILL",
      text: "A beneficiary designation overrides whatever your will says. The classic disaster is an ex-spouse still named on a 401(k) from years ago. Review every account's beneficiaries after any major life event - marriage, divorce, births, deaths - or once a year on a birthday you'll remember.",
    },
    {
      type: "paragraph",
      text: "Two documents matter while you're still alive: a financial power of attorney, naming who manages money if you're incapacitated, and a healthcare directive, naming who makes medical calls and what you'd want. Without them, your family may need a court order just to pay your mortgage from your own account. Simple wills and both documents can be done inexpensively online in most situations; see a lawyer for blended families, business ownership, or special-needs dependents.",
    },
    {
      type: "callout",
      tone: "info",
      title: "LEAVE A MAP, NOT A TREASURE HUNT",
      text: "Your executor can't claim accounts nobody knows exist. Keep a simple list of institutions and account types (never passwords in the open) somewhere your person can find it. BudgetArk's export on the Profile tab produces a clean snapshot of accounts, debts, and holdings that works well as the backbone of that list.",
    },
    {
      type: "callout",
      tone: "success",
      title: "THE COURSE, COMPLETE",
      text: "Budget built, debts patched, galley stocked, sails full, far waters charted. You now know more practical personal finance than most people ever learn. The habits do the rest - fair winds, Captain.",
    },
  ],
  keyTakeaway:
    "Name beneficiaries on every account, write a will (especially with kids), and add the two incapacity documents. One afternoon protects everything the course built.",
  action: {
    label: "Export a snapshot of your accounts",
    route: "profile",
  },
};

export default lesson;
