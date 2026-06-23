import { compareVersions, isUpdateSafe } from "../versionGuard";

describe("compareVersions", () => {
  it("returns 0 for equal versions", () => {
    expect(compareVersions("1.2.3", "1.2.3")).toBe(0);
  });

  it("returns -1 when the first is older, 1 when newer", () => {
    expect(compareVersions("1.2.3", "1.2.4")).toBe(-1);
    expect(compareVersions("1.3.0", "1.2.9")).toBe(1);
    expect(compareVersions("2.0.0", "1.9.9")).toBe(1);
  });

  it("compares segment-by-segment, most significant first", () => {
    expect(compareVersions("1.0.0", "0.99.99")).toBe(1);
    expect(compareVersions("1.10.0", "1.9.0")).toBe(1); // numeric, not lexical
  });

  it("treats missing trailing segments as zero", () => {
    expect(compareVersions("1.0", "1.0.0")).toBe(0);
    expect(compareVersions("1.2", "1.2.1")).toBe(-1);
  });

  it("treats non-numeric segments as zero", () => {
    expect(compareVersions("1.x.0", "1.0.0")).toBe(0);
    expect(compareVersions("1.0.beta", "1.0.0")).toBe(0);
  });
});

describe("isUpdateSafe", () => {
  it("blocks an update missing its version (fail-closed)", () => {
    expect(isUpdateSafe("1.0.0", undefined)).toBe(false);
    expect(isUpdateSafe("1.0.0", "")).toBe(false);
  });

  it("allows an update when the current version is unknown (fail-open)", () => {
    expect(isUpdateSafe(undefined, "1.0.0")).toBe(true);
    expect(isUpdateSafe("", "1.0.0")).toBe(true);
  });

  it("allows a newer or equal incoming version", () => {
    expect(isUpdateSafe("1.0.0", "1.0.1")).toBe(true);
    expect(isUpdateSafe("1.0.0", "1.0.0")).toBe(true);
    expect(isUpdateSafe("1.0.0", "2.0.0")).toBe(true);
  });

  it("rejects a downgrade", () => {
    expect(isUpdateSafe("1.2.0", "1.1.9")).toBe(false);
    expect(isUpdateSafe("2.0.0", "1.9.9")).toBe(false);
  });
});
