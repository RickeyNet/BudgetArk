import {
  normalizeVersionString,
  findReleaseNoteForVersion,
  tryParseReleaseNoteFromMessage,
  resolveUpdateInfo,
  summarizeHighlight,
  HIGHLIGHT_SUMMARY_MAX,
} from "../updateReleaseNotes";

// Controlled, newest-first release list (matches the real data's ordering, on
// which inferReleaseFromCurrentVersion relies).
jest.mock("../../data/releaseNotes", () => ({
  RELEASE_NOTES: [
    { version: "2.0.0", title: "Two", releasedAt: "2026-02-01", highlights: ["a"] },
    { version: "1.5.0", title: "OneFive", releasedAt: "2026-01-01", highlights: ["b"] },
  ],
}));

const note = (over: Record<string, unknown> = {}) => ({
  version: "3.0.0",
  title: "Inline",
  releasedAt: "2026-03-01",
  highlights: ["h"],
  ...over,
});

describe("normalizeVersionString", () => {
  it("accepts a bare semver and strips a leading v", () => {
    expect(normalizeVersionString("1.2.3")).toBe("1.2.3");
    expect(normalizeVersionString("v1.2.3")).toBe("1.2.3");
    expect(normalizeVersionString("V2.0.0")).toBe("2.0.0");
  });

  it("extracts an embedded semver from a sentence", () => {
    expect(normalizeVersionString("Update to 1.2.3 now")).toBe("1.2.3");
  });

  it("returns undefined for partial versions, blanks and non-strings", () => {
    expect(normalizeVersionString("1.2")).toBeUndefined();
    expect(normalizeVersionString("")).toBeUndefined();
    expect(normalizeVersionString("   ")).toBeUndefined();
    expect(normalizeVersionString(123)).toBeUndefined();
    expect(normalizeVersionString(null)).toBeUndefined();
    expect(normalizeVersionString(undefined)).toBeUndefined();
  });
});

describe("findReleaseNoteForVersion", () => {
  it("finds a note by exact (normalized) version", () => {
    expect(findReleaseNoteForVersion("1.5.0")?.title).toBe("OneFive");
    expect(findReleaseNoteForVersion("v2.0.0")?.title).toBe("Two");
  });

  it("returns undefined for an unknown or missing version", () => {
    expect(findReleaseNoteForVersion("9.9.9")).toBeUndefined();
    expect(findReleaseNoteForVersion(undefined)).toBeUndefined();
  });
});

describe("tryParseReleaseNoteFromMessage", () => {
  it("parses a well-formed JSON release note", () => {
    expect(tryParseReleaseNoteFromMessage(JSON.stringify(note()))).toEqual(note());
  });

  it("returns undefined for a plain-string message", () => {
    expect(tryParseReleaseNoteFromMessage("A new update is ready.")).toBeUndefined();
  });

  it("returns undefined for malformed JSON", () => {
    expect(tryParseReleaseNoteFromMessage("{not json")).toBeUndefined();
  });

  it("rejects JSON missing required fields", () => {
    const bad = JSON.stringify({ version: "3.0.0", title: "x" }); // no releasedAt/highlights
    expect(tryParseReleaseNoteFromMessage(bad)).toBeUndefined();
  });

  it("rejects JSON whose highlights are not all strings", () => {
    const bad = JSON.stringify(note({ highlights: ["ok", 5] }));
    expect(tryParseReleaseNoteFromMessage(bad)).toBeUndefined();
  });
});

describe("resolveUpdateInfo", () => {
  it("lets an inline JSON message override the baked-in lookup", () => {
    const info = resolveUpdateInfo({ message: JSON.stringify(note()) }, "1.0.0");
    expect(info.releaseNote).toEqual(note());
    expect(info.message).toBe("Inline"); // inline note's title
    expect(info.appVersion).toBe("3.0.0");
  });

  it("looks up a note from metadata.appVersion", () => {
    const info = resolveUpdateInfo({ metadata: { appVersion: "1.5.0" } }, "1.0.0");
    expect(info.releaseNote?.version).toBe("1.5.0");
    expect(info.message).toBe("OneFive");
  });

  it("infers the next release newer than the current version", () => {
    const info = resolveUpdateInfo({}, "1.0.0");
    expect(info.releaseNote?.version).toBe("2.0.0"); // first entry newer than 1.0.0
  });

  it("falls back to the default message when nothing matches", () => {
    const info = resolveUpdateInfo({}, "9.9.9");
    expect(info.message).toBe("A new update is ready to install.");
    expect(info.releaseNote).toBeUndefined();
  });

  it("passes through createdAt and runtimeVersion strings", () => {
    const info = resolveUpdateInfo(
      { createdAt: "2026-01-01", runtimeVersion: "1.2.3", metadata: { appVersion: "1.5.0" } },
      "1.0.0"
    );
    expect(info.createdAt).toBe("2026-01-01");
    expect(info.runtimeVersion).toBe("1.2.3");
  });

  it("tolerates a non-object manifest", () => {
    const info = resolveUpdateInfo(null, "9.9.9");
    expect(info.message).toBe("A new update is ready to install.");
  });
});

describe("summarizeHighlight", () => {
  it("keeps only the headline sentence", () => {
    expect(
      summarizeHighlight(
        "Refunds are no longer counted as income. When money comes back, tick the box."
      )
    ).toBe("Refunds are no longer counted as income.");
  });

  it("returns a single short sentence unchanged", () => {
    expect(summarizeHighlight("Rental properties get tenants.")).toBe(
      "Rental properties get tenants."
    );
    expect(summarizeHighlight("No full stop here")).toBe("No full stop here");
  });

  it("does not split on dots inside a domain, a number or a version", () => {
    expect(
      summarizeHighlight("About now links to budgetark.app for $1.50 in v1.2.3. More detail.")
    ).toBe("About now links to budgetark.app for $1.50 in v1.2.3.");
  });

  it("does not end the headline before a lowercase continuation", () => {
    expect(summarizeHighlight("Works with banks, cards, etc. and more. Then detail.")).toBe(
      "Works with banks, cards, etc. and more."
    );
  });

  it("cuts an overlong headline at a word boundary with an ellipsis", () => {
    const long = `${"word ".repeat(40).trim()}. Detail after.`;
    const out = summarizeHighlight(long);
    expect(out.length).toBeLessThanOrEqual(HIGHLIGHT_SUMMARY_MAX);
    expect(out.endsWith("word\u2026")).toBe(true);
  });

  it("is idempotent - the OTA message arrives already summarized", () => {
    for (const input of [
      "Refunds are no longer counted as income. When money comes back, tick the box.",
      `${"word ".repeat(40).trim()}, and then some: more. Detail.`,
      "  Padded   and\nwrapped. Detail.",
    ]) {
      const once = summarizeHighlight(input);
      expect(summarizeHighlight(once)).toBe(once);
    }
  });
});
