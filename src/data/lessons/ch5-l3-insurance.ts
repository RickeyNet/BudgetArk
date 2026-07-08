import type { Lesson } from "../../types";

const lesson: Lesson = {
  id: "ch5-l3-insurance",
  chapterId: "ch5",
  number: 3,
  title: "Insurance - what you actually need",
  readMin: 6,
  topics: ["insurance"],
  glyph: "☂️",
  summary:
    "Insure the catastrophes you couldn't absorb, self-insure the annoyances you could, and skip the products that are mostly commission.",
  whyItMatters:
    "One uninsured disaster - a liability lawsuit, a disability, an early death with dependents - can erase everything the rest of this course builds. Insurance is the hull integrity of the whole plan.",
  body: [
    {
      type: "paragraph",
      text: "Insurance has one job: transfer risks you cannot afford to carry. That single sentence sorts every policy you'll ever be offered. Could the loss sink you? Insure it fully. Could you cover it from your emergency fund? Don't insure it - keep the premium. Most people have this backwards: over-insured against small stuff (phone insurance, extended warranties) and under-insured against ruin (disability, liability).",
    },
    {
      type: "bullet-list",
      title: "The core policies most households need",
      items: [
        "Health - a single hospitalization can outrun any budget",
        "Auto liability - the damage you do to others is the unlimited risk",
        "Homeowner's or renter's - renter's runs ~$15-30/month and people skip it anyway",
        "Term life - only if someone depends on your income; ~10-12x income while they do",
        "Disability - you're far more likely to be unable to work than to die young",
      ],
    },
    {
      type: "callout",
      tone: "warn",
      title: "TERM VS WHOLE LIFE",
      text: "Term life is pure insurance: cheap, simple, expires when the kids are grown. Whole life bundles insurance with a mediocre investment at high fees and pays the seller a large commission - which is why it's pitched so hard. Buy term, invest the difference in the accounts from Chapter 4.",
    },
    {
      type: "paragraph",
      text: "Once your emergency fund is full, raise your deductibles. Moving from a $500 to a $1,500 deductible cuts premiums meaningfully, and Chapter 3 already built the cushion that makes the higher deductible painless. This is self-insurance: the fund absorbs small claims, the policy absorbs disasters, and you stop paying the insurer to handle risks you can carry yourself.",
    },
    {
      type: "bullet-list",
      title: "Usually safe to skip",
      items: [
        "Extended warranties and phone insurance - the emergency fund's job",
        "Life insurance on children or on anyone with no dependents",
        "Rental car damage waivers your auto policy or credit card already covers",
        "Flight, wedding, and gadget micro-policies - high margin, tiny risk",
      ],
    },
    {
      type: "callout",
      tone: "info",
      title: "THE CHEAPEST UPGRADE",
      text: "As net worth grows, an umbrella liability policy adds $1M of coverage above your auto and home policies for a few hundred dollars a year. Once there's a ship worth protecting, it's the best insurance value on the market.",
    },
  ],
  keyTakeaway:
    "Fully insure what could ruin you, self-insure what merely annoys you, and never mix insurance with investing.",
  action: {
    label: "Add premiums to your budget",
    route: "budget",
  },
};

export default lesson;
