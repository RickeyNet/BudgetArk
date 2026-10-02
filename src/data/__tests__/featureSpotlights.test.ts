/**
 * Tests for feature-spotlight selection: seen filtering, badgeOnly
 * exclusion, and runtimeVersion gating (features that ship dormant via OTA
 * and only debut when the store build with their native modules arrives).
 */

import {
  FEATURE_AREAS,
  FEATURE_SPOTLIGHTS,
  getSpotlightGuide,
  isSpotlightAvailable,
  selectGuideGroups,
  selectNewBadgeIds,
  selectReplaySpotlights,
  selectUnseenSpotlights,
  spotlightArea,
  type FeatureSpotlight,
} from "../featureSpotlights";

const spotlight = (
  overrides: Partial<FeatureSpotlight> & Pick<FeatureSpotlight, "id">
): FeatureSpotlight => ({
  sinceVersion: "1.9.0",
  icon: "✨",
  title: "Feature",
  blurb: "Blurb",
  ...overrides,
});

const OTA_FEATURE = spotlight({ id: "ota-feature" });
const NATIVE_FEATURE = spotlight({
  id: "native-feature",
  requiresRuntimeVersion: "1.9.0",
});
const BADGE_ONLY = spotlight({ id: "badge-only", badgeOnly: true });

const ALL = [OTA_FEATURE, NATIVE_FEATURE, BADGE_ONLY];

describe("isSpotlightAvailable", () => {
  it("is always available without a runtime requirement", () => {
    expect(isSpotlightAvailable(OTA_FEATURE, "1.8.0")).toBe(true);
    expect(isSpotlightAvailable(OTA_FEATURE, undefined)).toBe(true);
  });

  it("gates on the current runtime version", () => {
    expect(isSpotlightAvailable(NATIVE_FEATURE, "1.8.0")).toBe(false);
    expect(isSpotlightAvailable(NATIVE_FEATURE, "1.9.0")).toBe(true);
    expect(isSpotlightAvailable(NATIVE_FEATURE, "1.10.0")).toBe(true);
  });

  it("fails open when the current runtime is unknown (dev builds)", () => {
    expect(isSpotlightAvailable(NATIVE_FEATURE, undefined)).toBe(true);
  });
});

describe("selectUnseenSpotlights", () => {
  it("returns available, unseen, non-badgeOnly spotlights in order", () => {
    const result = selectUnseenSpotlights(ALL, [], "1.9.0");
    expect(result.map((s) => s.id)).toEqual(["ota-feature", "native-feature"]);
  });

  it("filters spotlights already seen", () => {
    const result = selectUnseenSpotlights(ALL, ["ota-feature"], "1.9.0");
    expect(result.map((s) => s.id)).toEqual(["native-feature"]);
  });

  it("holds back native-gated features on an older store build", () => {
    const result = selectUnseenSpotlights(ALL, [], "1.8.0");
    expect(result.map((s) => s.id)).toEqual(["ota-feature"]);
  });

  it("debuts a native feature later, once the build arrives", () => {
    // User saw the OTA-era carousel on the old build...
    const seenOnOldBuild = selectUnseenSpotlights(ALL, [], "1.8.0").map(
      (s) => s.id
    );
    // ...then the store build lands: only the newly-enabled feature debuts.
    const result = selectUnseenSpotlights(ALL, seenOnOldBuild, "1.9.0");
    expect(result.map((s) => s.id)).toEqual(["native-feature"]);
  });

  it("returns nothing when everything is seen", () => {
    const allIds = ALL.map((s) => s.id);
    expect(selectUnseenSpotlights(ALL, allIds, "1.9.0")).toEqual([]);
  });

  it("treats a merged spotlight as seen when any superseded id was seen", () => {
    const merged = spotlight({
      id: "merged",
      supersedes: ["old-a", "old-b"],
    });
    const list = [merged, OTA_FEATURE];
    expect(selectUnseenSpotlights(list, [], "1.9.0").map((s) => s.id)).toEqual([
      "merged",
      "ota-feature",
    ]);
    expect(
      selectUnseenSpotlights(list, ["old-b"], "1.9.0").map((s) => s.id)
    ).toEqual(["ota-feature"]);
    // Unrelated legacy ids don't count.
    expect(
      selectUnseenSpotlights(list, ["old-c"], "1.9.0").map((s) => s.id)
    ).toEqual(["merged", "ota-feature"]);
  });
});

describe("selectReplaySpotlights", () => {
  it("includes already-seen features, unlike the debut queue", () => {
    // Everything seen: debut queue is empty, but the replay tour is full.
    const allIds = ALL.map((s) => s.id);
    expect(selectUnseenSpotlights(ALL, allIds, "1.9.0")).toEqual([]);
    const replay = selectReplaySpotlights(ALL, "1.9.0");
    expect(replay.map((s) => s.id)).toEqual(["ota-feature", "native-feature"]);
  });

  it("still excludes badgeOnly features from the carousel", () => {
    const replay = selectReplaySpotlights(ALL, "1.9.0");
    expect(replay.map((s) => s.id)).not.toContain("badge-only");
  });

  it("still holds back native-gated features on an older store build", () => {
    const replay = selectReplaySpotlights(ALL, "1.8.0");
    expect(replay.map((s) => s.id)).toEqual(["ota-feature"]);
  });
});

describe("selectNewBadgeIds", () => {
  it("includes badgeOnly features, unlike the carousel", () => {
    const result = selectNewBadgeIds(ALL, [], "1.9.0");
    expect(result).toEqual(["ota-feature", "native-feature", "badge-only"]);
  });

  it("filters acked ids and unavailable features independently", () => {
    const result = selectNewBadgeIds(ALL, ["badge-only"], "1.8.0");
    expect(result).toEqual(["ota-feature"]);
  });

  it("treats a merged spotlight as acked when any superseded id was acked", () => {
    const merged = spotlight({ id: "merged", supersedes: ["old-a"] });
    expect(selectNewBadgeIds([merged], [], "1.9.0")).toEqual(["merged"]);
    expect(selectNewBadgeIds([merged], ["old-a"], "1.9.0")).toEqual([]);
  });
});

describe("spotlightArea", () => {
  it("prefers an explicit area over the CTA target", () => {
    const s = spotlight({
      id: "x",
      area: "bridge",
      cta: { label: "Go", kind: "charts" },
    });
    expect(spotlightArea(s)).toBe("bridge");
  });

  it("derives the area from where the CTA lands", () => {
    expect(spotlightArea(spotlight({ id: "a", cta: { label: "", kind: "debt-tracker" } }))).toBe("debts");
    expect(spotlightArea(spotlight({ id: "b", cta: { label: "", kind: "budget" } }))).toBe("budget");
    expect(spotlightArea(spotlight({ id: "c", cta: { label: "", kind: "budget-add-entry" } }))).toBe("budget");
    expect(spotlightArea(spotlight({ id: "d", cta: { label: "", kind: "bridge" } }))).toBe("bridge");
    expect(spotlightArea(spotlight({ id: "e", cta: { label: "", kind: "charts" } }))).toBe("charts");
    expect(
      spotlightArea(spotlight({ id: "f", cta: { label: "", kind: "profile-section", section: "theme" } }))
    ).toBe("profile");
  });

  it("falls back to profile for a spotlight with neither", () => {
    expect(spotlightArea(OTA_FEATURE)).toBe("profile");
  });
});

describe("selectGuideGroups", () => {
  const debts = spotlight({ id: "debts-1", cta: { label: "", kind: "debt-tracker" } });
  const budgetA = spotlight({ id: "budget-a", cta: { label: "", kind: "budget" } });
  const budgetB = spotlight({ id: "budget-b", area: "budget" });
  const nativeCharts = spotlight({
    id: "charts-native",
    requiresRuntimeVersion: "1.9.0",
    cta: { label: "", kind: "charts" },
  });
  const badge = spotlight({ id: "badge", badgeOnly: true, area: "profile" });
  // Declared out of tab order on purpose.
  const list = [budgetA, nativeCharts, debts, badge, budgetB];

  it("groups by tab in FEATURE_AREAS order, declaration order within", () => {
    const groups = selectGuideGroups(list, "1.9.0");
    expect(groups.map((g) => g.area)).toEqual(["debts", "budget", "charts", "profile"]);
    expect(groups[1].spotlights.map((s) => s.id)).toEqual(["budget-a", "budget-b"]);
  });

  it("includes badgeOnly features - the guide is a directory, not a debut", () => {
    const groups = selectGuideGroups(list, "1.9.0");
    expect(groups.find((g) => g.area === "profile")?.spotlights.map((s) => s.id)).toEqual(["badge"]);
  });

  it("drops features the current store build cannot run, and empty groups", () => {
    const groups = selectGuideGroups(list, "1.8.0");
    expect(groups.map((g) => g.area)).toEqual(["debts", "budget", "profile"]);
  });

  it("never emits an area outside FEATURE_AREAS", () => {
    for (const group of selectGuideGroups(FEATURE_SPOTLIGHTS, undefined)) {
      expect(FEATURE_AREAS).toContain(group.area);
    }
  });
});

describe("getSpotlightGuide", () => {
  it("returns undefined for a spotlight with no guide copy", () => {
    expect(getSpotlightGuide(spotlight({ id: "not-a-real-spotlight" }))).toBeUndefined();
  });

  it("reads the breadcrumb and the numbered steps in order", () => {
    const guide = getSpotlightGuide(
      FEATURE_SPOTLIGHTS.find((s) => s.id === "receipt-photos") as FeatureSpotlight
    );
    expect(guide?.where).toMatch(/Budget/);
    expect(guide?.steps.length).toBeGreaterThanOrEqual(2);
    for (const step of guide?.steps ?? []) {
      expect(step).not.toMatch(/^data\./);
    }
  });

  it("every live spotlight has guide copy with a breadcrumb and 2-5 steps", () => {
    for (const s of FEATURE_SPOTLIGHTS) {
      const guide = getSpotlightGuide(s);
      expect(guide).toBeDefined();
      expect(guide?.where.length).toBeGreaterThan(0);
      expect(guide?.steps.length).toBeGreaterThanOrEqual(2);
      expect(guide?.steps.length).toBeLessThanOrEqual(5);
    }
  });
});

describe("FEATURE_SPOTLIGHTS data", () => {
  it("debuts the feature guide itself with a CTA into the Help card", () => {
    const guide = FEATURE_SPOTLIGHTS.find((s) => s.id === "feature-guide");
    expect(guide?.sinceVersion).toBe("1.11.0");
    expect(guide?.requiresRuntimeVersion).toBeUndefined();
    expect(guide?.cta).toMatchObject({ kind: "profile-section", section: "featureGuide" });
  });

  it("resolves title, blurb and CTA label through the translation tree", () => {
    for (const spotlight of FEATURE_SPOTLIGHTS) {
      expect(spotlight.title).not.toMatch(/^data\./);
      expect(spotlight.blurb).not.toMatch(/^data\./);
      if (spotlight.cta) expect(spotlight.cta.label).not.toMatch(/^data\./);
    }
    const tipJar = FEATURE_SPOTLIGHTS.find((s) => s.id === "tip-jar");
    expect(tipJar?.title).toBe("Tip Jar");
  });

  it("has unique ids", () => {
    const ids = FEATURE_SPOTLIGHTS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("never lists a superseded id as a live spotlight", () => {
    const live = new Set(FEATURE_SPOTLIGHTS.map((s) => s.id));
    for (const s of FEATURE_SPOTLIGHTS) {
      for (const legacyId of s.supersedes ?? []) {
        expect(live.has(legacyId)).toBe(false);
      }
    }
  });

  it("keeps a single 1.11.0 language slide that covers the old german-language id", () => {
    const languageSlides = FEATURE_SPOTLIGHTS.filter(
      (s) => s.sinceVersion === "1.11.0" && s.cta?.kind === "profile-section" && s.cta.section === "language"
    );
    expect(languageSlides.map((s) => s.id)).toEqual(["languages"]);
    expect(languageSlides[0].supersedes).toEqual(["german-language"]);
  });

  it("merges the 1.9.0 theme slides into one that covers the old ids", () => {
    const fleet = FEATURE_SPOTLIGHTS.find((s) => s.id === "theme-fleet");
    expect(fleet?.supersedes).toEqual([
      "deep-sea-theme",
      "slate-classic-themes",
      "four-themes",
    ]);
    // A user who saw the old 1.9.0 carousel owes nothing for the merge.
    const unseen = selectUnseenSpotlights(
      FEATURE_SPOTLIGHTS,
      ["deep-sea-theme", "slate-classic-themes", "four-themes"],
      undefined
    );
    expect(unseen.map((s) => s.id)).not.toContain("theme-fleet");
  });

  it("only uses known Profile sections in CTAs", () => {
    for (const s of FEATURE_SPOTLIGHTS) {
      if (s.cta?.kind === "profile-section") {
        expect([
          "connections",
          "businesses",
          "people",
          "tipJar",
          "trackingReminders",
          "theme",
          "appLock",
          "owedToYou",
          "data",
          "language",
          "featureGuide",
        ]).toContain(s.cta.section);
      }
    }
  });
});
