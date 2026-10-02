/**
 * BudgetArk - feature guide keyword search (pure).
 *
 * Powers the search bar in the Feature guide (FeatureGuideModal): type
 * "receipt" or "payday" and land on the feature, its where-to-find
 * breadcrumb and its how-to steps. The twin of guideSearch.ts for
 * FEATURE_SPOTLIGHTS instead of COACHMARKS - plain string matching, no
 * React Native imports, unit-testable in Node.
 *
 * Spotlight copy resolves in the ACTIVE language at read time (title and
 * blurb are getters, the guide is read through getSpotlightGuide), and this
 * function reads every field fresh on each call, so a German user typing
 * "Beleg" finds the receipts feature. Callers that memoize results must
 * include `t` in their dependencies.
 *
 * Matching: the query is lowercased and split on whitespace; a feature
 * matches only when EVERY token appears somewhere in its haystack (title +
 * where + blurb + steps). Results rank by where the best hit landed -
 * title, then the breadcrumb, then blurb/steps - and keep declaration
 * order within a rank.
 */

import {
  FEATURE_SPOTLIGHTS,
  getSpotlightGuide,
  type FeatureGuide,
  type FeatureSpotlight,
} from "../data/featureSpotlights";

/** Lower rank sorts first. */
const RANK_TITLE = 0;
const RANK_WHERE = 1;
const RANK_BODY = 2;

const tokenize = (query: string): string[] =>
  query.toLowerCase().split(/\s+/).filter(Boolean);

const rankForSpotlight = (
  spotlight: FeatureSpotlight,
  guide: FeatureGuide | undefined,
  tokens: readonly string[]
): number | null => {
  const title = spotlight.title.toLowerCase();
  const where = (guide?.where ?? "").toLowerCase();
  const body = `${spotlight.blurb} ${(guide?.steps ?? []).join(" ")}`.toLowerCase();

  let worst = RANK_TITLE;
  for (const token of tokens) {
    let rank: number;
    if (title.includes(token)) rank = RANK_TITLE;
    else if (where.includes(token)) rank = RANK_WHERE;
    else if (body.includes(token)) rank = RANK_BODY;
    else return null; // every token must match somewhere
    worst = Math.max(worst, rank);
  }
  return worst;
};

/**
 * Searches the feature guide. Empty/whitespace queries return no results
 * (the UI shows the grouped browse list instead). Stable: declaration
 * order is preserved within a rank. `guideFor` is injectable so tests can
 * pin the ranking rules on a controlled fixture.
 */
export const searchFeatureGuide = (
  query: string,
  spotlights: readonly FeatureSpotlight[] = FEATURE_SPOTLIGHTS,
  guideFor: (spotlight: FeatureSpotlight) => FeatureGuide | undefined = getSpotlightGuide
): FeatureSpotlight[] => {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  const ranked: { rank: number; index: number; spotlight: FeatureSpotlight }[] = [];
  spotlights.forEach((spotlight, index) => {
    const rank = rankForSpotlight(spotlight, guideFor(spotlight), tokens);
    if (rank !== null) ranked.push({ rank, index, spotlight });
  });
  ranked.sort((a, b) => a.rank - b.rank || a.index - b.index);
  return ranked.map((entry) => entry.spotlight);
};
