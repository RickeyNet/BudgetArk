/**
 * BudgetArk - release notes data tests
 * File: src/data/__tests__/releaseNotes.test.ts
 *
 * Guards the two release-flow invariants CLAUDE.md calls out: every entry's
 * version is valid semver, the list is strictly descending with no
 * duplicates (a mis-ordered or repeated entry would corrupt the in-app
 * update/what's-new prompts), every entry carries non-empty highlights, and
 * CURRENT_APP_VERSION (which the app single-sources everything from) stays
 * in step with app.json's `version` - reading it from disk with `fs` so a
 * release that bumps one but not the other fails CI instead of shipping a
 * store listing that disagrees with the in-app Release Notes screen.
 */
import * as fs from "fs";
import * as path from "path";
import { CURRENT_APP_VERSION, RELEASE_NOTES } from "../releaseNotes";

const SEMVER_RE = /^\d+\.\d+\.\d+$/;

const compareSemver = (a: string, b: string): number => {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
};

describe("RELEASE_NOTES", () => {
  it("is non-empty", () => {
    expect(RELEASE_NOTES.length).toBeGreaterThan(0);
  });

  it("every version is valid semver (X.Y.Z)", () => {
    for (const note of RELEASE_NOTES) {
      expect(note.version).toMatch(SEMVER_RE);
    }
  });

  it("versions are strictly descending, newest first", () => {
    for (let i = 1; i < RELEASE_NOTES.length; i++) {
      const prev = RELEASE_NOTES[i - 1].version;
      const cur = RELEASE_NOTES[i].version;
      expect(compareSemver(prev, cur)).toBeGreaterThan(0);
    }
  });

  it("has no duplicate versions", () => {
    const versions = RELEASE_NOTES.map((n) => n.version);
    expect(new Set(versions).size).toBe(versions.length);
  });

  it("every entry has a non-empty title, releasedAt, and highlights list", () => {
    for (const note of RELEASE_NOTES) {
      expect(note.title.length).toBeGreaterThan(0);
      expect(note.releasedAt.length).toBeGreaterThan(0);
      expect(Array.isArray(note.highlights)).toBe(true);
      expect(note.highlights.length).toBeGreaterThan(0);
      for (const highlight of note.highlights) {
        expect(typeof highlight).toBe("string");
        expect(highlight.length).toBeGreaterThan(0);
      }
    }
  });

  it("every releasedAt is a valid, parseable date", () => {
    for (const note of RELEASE_NOTES) {
      expect(Number.isNaN(Date.parse(note.releasedAt))).toBe(false);
    }
  });
});

describe("CURRENT_APP_VERSION", () => {
  it("is the newest (first) entry's version", () => {
    expect(CURRENT_APP_VERSION).toBe(RELEASE_NOTES[0].version);
  });

  it("matches app.json's version - both files must be bumped together", () => {
    const appJsonPath = path.join(__dirname, "..", "..", "..", "app.json");
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf8")) as {
      expo: { version: string };
    };
    expect(CURRENT_APP_VERSION).toBe(appJson.expo.version);
  });
});
