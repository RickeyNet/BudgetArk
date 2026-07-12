import {
  attachmentIdFromFilename,
  planAttachmentSweep,
  DEFAULT_SWEEP_MIN_AGE_MS,
  type AttachmentFileStat,
} from "../attachmentSweep";

const NOW = 1_800_000_000_000;
const OLD = NOW - DEFAULT_SWEEP_MIN_AGE_MS - 60_000; // past the age gate
const FRESH = NOW - 60_000; // one minute old

const file = (name: string, modifiedAtMs: number | null): AttachmentFileStat => ({
  name,
  modifiedAtMs,
});

describe("attachmentIdFromFilename", () => {
  it("extracts the id from full and thumb names", () => {
    expect(attachmentIdFromFilename("abc-123.jpg.enc")).toBe("abc-123");
    expect(attachmentIdFromFilename("abc-123.thumb.jpg.enc")).toBe("abc-123");
  });

  it("returns null for files the store doesn't own", () => {
    expect(attachmentIdFromFilename("notes.txt")).toBeNull();
    expect(attachmentIdFromFilename("photo.jpg")).toBeNull();
    expect(attachmentIdFromFilename(".jpg.enc")).toBeNull();
  });
});

describe("planAttachmentSweep", () => {
  it("sweeps old unreferenced files (both full and thumb)", () => {
    const plan = planAttachmentSweep(
      [file("gone.jpg.enc", OLD), file("gone.thumb.jpg.enc", OLD)],
      new Set(),
      NOW
    );
    expect(plan.sort()).toEqual(["gone.jpg.enc", "gone.thumb.jpg.enc"]);
  });

  it("keeps referenced files regardless of age (live or tombstoned entries)", () => {
    const plan = planAttachmentSweep(
      [file("kept.jpg.enc", OLD), file("kept.thumb.jpg.enc", OLD)],
      new Set(["kept"]),
      NOW
    );
    expect(plan).toEqual([]);
  });

  it("keeps young unreferenced files (staging in progress)", () => {
    const plan = planAttachmentSweep(
      [file("staged.jpg.enc", FRESH), file("staged.thumb.jpg.enc", FRESH)],
      new Set(),
      NOW
    );
    expect(plan).toEqual([]);
  });

  it("keeps files with unreadable mtimes (never delete blind)", () => {
    const plan = planAttachmentSweep([file("blind.jpg.enc", null)], new Set(), NOW);
    expect(plan).toEqual([]);
  });

  it("never touches files outside the naming scheme", () => {
    const plan = planAttachmentSweep(
      [file("random.txt", OLD), file("export.csv", OLD)],
      new Set(),
      NOW
    );
    expect(plan).toEqual([]);
  });

  it("respects a custom minAgeMs", () => {
    const plan = planAttachmentSweep(
      [file("f.jpg.enc", NOW - 5_000)],
      new Set(),
      NOW,
      1_000
    );
    expect(plan).toEqual(["f.jpg.enc"]);
  });

  it("decides thumb and full independently when references differ", () => {
    // Shouldn't happen in practice, but the planner must not couple them.
    const plan = planAttachmentSweep(
      [file("a.jpg.enc", OLD), file("b.thumb.jpg.enc", OLD)],
      new Set(["a"]),
      NOW
    );
    expect(plan).toEqual(["b.thumb.jpg.enc"]);
  });
});
