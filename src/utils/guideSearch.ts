/**
 * BudgetArk - onboarding guide keyword search (pure).
 *
 * Powers the search bar in the Onboarding guide (OnboardingGuideModal):
 * type "receipt" or "credit card" and land on how the feature works and
 * where to find it. Pure string matching over the COACHMARKS content -
 * no React Native imports, fully unit-testable in Node.
 *
 * Matching: the query is lowercased and split on whitespace; a step
 * matches only when EVERY token appears somewhere in its haystack
 * (title + body + detail + location + keywords + tab label). Results are
 * ranked by where the best hit landed - title, then keywords, then
 * location, then body/detail - and keep tour order within a rank so the
 * list reads in the app's own tab order.
 */

import {
  COACHMARK_TAB_IDS,
  COACHMARKS,
  type CoachmarkStep,
  type CoachmarkTabId,
  type CoachmarkTour,
} from "../data/coachmarkContent";

export interface GuideSearchResult {
  tabId: CoachmarkTabId;
  /** Human tab label, from the tour intro (e.g. "Debts - your payoff plan"). */
  tabLabel: string;
  step: CoachmarkStep;
}

/** Lower rank sorts first. */
const RANK_TITLE = 0;
const RANK_KEYWORD = 1;
const RANK_LOCATION = 2;
const RANK_BODY = 3;

const tokenize = (query: string): string[] =>
  query.toLowerCase().split(/\s+/).filter(Boolean);

const rankForStep = (
  step: CoachmarkStep,
  tabLabel: string,
  tokens: readonly string[]
): number | null => {
  const title = step.title.toLowerCase();
  const keywords = (step.keywords ?? []).join(" ").toLowerCase();
  const location = (step.location ?? "").toLowerCase();
  const bodyText = `${step.body} ${step.detail ?? ""} ${tabLabel}`.toLowerCase();

  let worst = RANK_TITLE;
  for (const token of tokens) {
    let rank: number;
    if (title.includes(token)) rank = RANK_TITLE;
    else if (keywords.includes(token)) rank = RANK_KEYWORD;
    else if (location.includes(token)) rank = RANK_LOCATION;
    else if (bodyText.includes(token)) rank = RANK_BODY;
    else return null; // every token must match somewhere
    worst = Math.max(worst, rank);
  }
  return worst;
};

/**
 * Searches the guide. Empty/whitespace queries return no results (the UI
 * shows the browsable accordion instead). Stable: tour order is preserved
 * within a rank.
 */
export const searchGuide = (
  query: string,
  tours: Record<CoachmarkTabId, CoachmarkTour> = COACHMARKS
): GuideSearchResult[] => {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  const ranked: { rank: number; order: number; result: GuideSearchResult }[] =
    [];
  let order = 0;
  for (const tabId of COACHMARK_TAB_IDS) {
    const tour = tours[tabId];
    if (!tour) continue;
    for (const step of tour.steps) {
      const rank = rankForStep(step, tour.intro, tokens);
      order += 1;
      if (rank === null) continue;
      ranked.push({
        rank,
        order,
        result: { tabId, tabLabel: tour.intro, step },
      });
    }
  }

  return ranked
    .sort((a, b) => (a.rank !== b.rank ? a.rank - b.rank : a.order - b.order))
    .map((r) => r.result);
};
