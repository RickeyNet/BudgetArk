import i18next from "i18next";
import { searchFeatureGuide } from "../featureGuideSearch";
import {
  FEATURE_SPOTLIGHTS,
  getSpotlightGuide,
  type FeatureGuide,
  type FeatureSpotlight,
} from "../../data/featureSpotlights";
import { de } from "../../i18n/locales/de";

// Small controlled fixture: real spotlight content is covered by
// featureSpotlights.test.ts; these tests pin the matching/ranking rules.
const spotlight = (
  overrides: Partial<FeatureSpotlight> & Pick<FeatureSpotlight, "id" | "title" | "blurb">
): FeatureSpotlight => ({
  sinceVersion: "1.9.0",
  icon: "✨",
  ...overrides,
});

const FIXTURE: readonly FeatureSpotlight[] = [
  spotlight({
    id: "keep-alive",
    title: "Keep idle credit cards alive",
    blurb: "Warns before an inactivity window runs out.",
  }),
  spotlight({
    id: "receipts",
    title: "Attach the receipt",
    blurb: "Snap photos onto any entry. Encrypted, never leaves your phone.",
  }),
  spotlight({
    id: "payday",
    title: "Until Payday",
    blurb: "Budget by pay period instead of calendar month.",
  }),
  spotlight({
    id: "no-guide",
    title: "Guideless feature",
    blurb: "Mentions credit score in the blurb only.",
  }),
];

const GUIDES: Record<string, FeatureGuide> = {
  "keep-alive": {
    where: "Debts tab → tap a card → Edit",
    steps: ["Turn on the watch.", "Pick the inactivity window."],
  },
  receipts: {
    where: "Budget tab → + Add entry",
    steps: ["Tap the camera.", "Snap up to three photos."],
  },
  payday: {
    where: "Budget tab → cash flow card",
    steps: ["Tell BudgetArk when you are paid.", "See what is due before payday."],
  },
};

const guideFor = (s: FeatureSpotlight): FeatureGuide | undefined => GUIDES[s.id];

const ids = (query: string) =>
  searchFeatureGuide(query, FIXTURE, guideFor).map((s) => s.id);

describe("searchFeatureGuide", () => {
  it("returns nothing for an empty or whitespace query", () => {
    expect(ids("")).toEqual([]);
    expect(ids("   ")).toEqual([]);
  });

  it("matches case-insensitively on the title", () => {
    expect(ids("PAYDAY")).toEqual(["payday"]);
  });

  it("matches on the where-to-find breadcrumb", () => {
    expect(ids("tap a card")).toEqual(["keep-alive"]);
  });

  it("matches on blurb and steps", () => {
    expect(ids("encrypted")).toEqual(["receipts"]);
    expect(ids("camera")).toEqual(["receipts"]);
  });

  it("requires every token to match somewhere", () => {
    expect(ids("budget tab")).toEqual(["receipts", "payday"]);
    expect(ids("budget tab photos")).toEqual(["receipts"]);
    expect(ids("budget nowhere")).toEqual([]);
  });

  it("ranks title hits above breadcrumb hits above body hits", () => {
    // "credit": keep-alive hits in the title, no-guide only in the blurb.
    expect(ids("credit")).toEqual(["keep-alive", "no-guide"]);
    // "tab": every guided feature hits only in its breadcrumb, so the
    // order stays declaration order within the rank.
    expect(ids("tab")).toEqual(["keep-alive", "receipts", "payday"]);
  });

  it("still searches a feature that has no guide copy", () => {
    expect(ids("guideless")).toEqual(["no-guide"]);
  });
});

describe("searchFeatureGuide over the real spotlights", () => {
  // The copy resolves through the translation tree at read time, so
  // switching the global language must switch what the search matches.
  beforeAll(() => {
    if (!i18next.hasResourceBundle("de", "translation")) {
      i18next.addResourceBundle("de", "translation", de);
    }
  });

  afterEach(async () => {
    // eslint-disable-next-line import/no-named-as-default-member
    await i18next.changeLanguage("en");
  });

  it("finds the receipt-photos feature in English", () => {
    const results = searchFeatureGuide("receipt", FEATURE_SPOTLIGHTS, getSpotlightGuide);
    expect(results.map((s) => s.id)).toContain("receipt-photos");
  });

  it("re-resolves copy in the active language", async () => {
    // eslint-disable-next-line import/no-named-as-default-member
    await i18next.changeLanguage("de");
    const results = searchFeatureGuide("beleg", FEATURE_SPOTLIGHTS, getSpotlightGuide);
    expect(results.map((s) => s.id)).toContain("receipt-photos");
  });
});
