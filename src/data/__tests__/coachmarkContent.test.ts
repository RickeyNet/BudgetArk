import {
  COACHMARK_TAB_IDS,
  COACHMARKS,
} from "../coachmarkContent";

/**
 * Content-integrity ratchet for the onboarding guide: every step must ship
 * the long-form fields the searchable guide renders. A new feature step
 * that lands without detail/location fails here instead of shipping
 * half-documented.
 */
describe("coachmark guide content", () => {
  const allSteps = COACHMARK_TAB_IDS.flatMap((tabId) =>
    COACHMARKS[tabId].steps.map((step) => ({ tabId, step }))
  );

  it("covers every tab with at least one step", () => {
    for (const tabId of COACHMARK_TAB_IDS) {
      expect(COACHMARKS[tabId].steps.length).toBeGreaterThan(0);
      expect(COACHMARKS[tabId].tabId).toBe(tabId);
      expect(COACHMARKS[tabId].intro.trim().length).toBeGreaterThan(0);
    }
  });

  it("gives every step a non-empty title and body", () => {
    for (const { step } of allSteps) {
      expect(step.title.trim().length).toBeGreaterThan(0);
      expect(step.body.trim().length).toBeGreaterThan(0);
    }
  });

  it("gives every step the guide fields: detail, location, and emoji", () => {
    const missing = allSteps
      .filter(
        ({ step }) =>
          !(
            step.detail?.trim().length &&
            step.location?.trim().length &&
            step.emoji?.trim().length
          )
      )
      .map(({ tabId, step }) => `${tabId}/${step.id}`);
    expect(missing).toEqual([]);
  });

  it("gives every tour a tab emoji", () => {
    for (const tabId of COACHMARK_TAB_IDS) {
      expect(COACHMARKS[tabId].emoji.trim().length).toBeGreaterThan(0);
    }
  });

  it("keeps step ids unique across all tours", () => {
    const ids = allSteps.map(({ step }) => step.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps keywords lowercase (search is lowercased)", () => {
    for (const { step } of allSteps) {
      for (const keyword of step.keywords ?? []) {
        expect(keyword).toBe(keyword.toLowerCase());
        expect(keyword.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("documents the recently shipped features", () => {
    const ids = new Set(allSteps.map(({ step }) => step.id));
    expect(ids.has("debts-keepalive")).toBe(true);
    expect(ids.has("budget-widget")).toBe(true);
  });
});
