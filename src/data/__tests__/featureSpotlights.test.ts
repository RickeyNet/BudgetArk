/**
 * Tests for feature-spotlight selection: seen filtering, badgeOnly
 * exclusion, and runtimeVersion gating (features that ship dormant via OTA
 * and only debut when the store build with their native modules arrives).
 */

import {
  FEATURE_SPOTLIGHTS,
  isSpotlightAvailable,
  selectNewBadgeIds,
  selectUnseenSpotlights,
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
});

describe("FEATURE_SPOTLIGHTS data", () => {
  it("has unique ids", () => {
    const ids = FEATURE_SPOTLIGHTS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("only uses known Profile sections in CTAs", () => {
    for (const s of FEATURE_SPOTLIGHTS) {
      if (s.cta?.kind === "profile-section") {
        expect([
          "connections",
          "businesses",
          "tipJar",
          "trackingReminders",
          "theme",
        ]).toContain(s.cta.section);
      }
    }
  });
});
