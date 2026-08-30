/**
 * BudgetArk - Auto-backup planning tests
 * File: src/services/autoBackup/__tests__/autoBackupPlan.test.ts
 *
 * Pins the scheduled-local-backup decision rules: file-name round-trip and
 * fail-closed parsing, due-check (including clock rollback), prune plan,
 * settings parsing defaults, and the size label.
 */

import {
  AUTO_BACKUP_KEEP,
  type AutoBackupFileInfo,
  DEFAULT_AUTO_BACKUP_SETTINGS,
  autoBackupFileName,
  cadenceMs,
  formatBackupSize,
  isBackupDue,
  parseAutoBackupFileName,
  parseAutoBackupSettings,
  planPrune,
  sortNewestFirst,
} from "../autoBackupPlan";

const NOW = Date.parse("2026-07-26T12:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;

const file = (timestampMs: number): AutoBackupFileInfo => ({
  name: autoBackupFileName(timestampMs),
  timestampMs,
  sizeBytes: null,
});

describe("file naming", () => {
  it("round-trips a timestamp through the file name", () => {
    const name = autoBackupFileName(NOW);
    expect(name).toBe(`auto-backup-${NOW}.enc`);
    expect(parseAutoBackupFileName(name)).toBe(NOW);
  });

  it("fails closed on anything that is not one of ours", () => {
    expect(parseAutoBackupFileName("")).toBeNull();
    expect(parseAutoBackupFileName("auto-backup-.enc")).toBeNull();
    expect(parseAutoBackupFileName("auto-backup-abc.enc")).toBeNull();
    expect(parseAutoBackupFileName("auto-backup-123.enc")).toBeNull(); // too short
    expect(parseAutoBackupFileName(`auto-backup-${NOW}.json`)).toBeNull();
    expect(parseAutoBackupFileName(`prefix-auto-backup-${NOW}.enc`)).toBeNull();
    expect(parseAutoBackupFileName(`auto-backup-${NOW}.enc.tmp`)).toBeNull();
    expect(parseAutoBackupFileName("receipt.jpg.enc")).toBeNull();
  });
});

describe("isBackupDue", () => {
  const weekly = cadenceMs("weekly");

  it("is due with no backups at all", () => {
    expect(isBackupDue([], NOW, weekly)).toBe(true);
  });

  it("is due only once the newest backup is a full cadence old", () => {
    expect(isBackupDue([file(NOW - 6 * DAY)], NOW, weekly)).toBe(false);
    expect(isBackupDue([file(NOW - 7 * DAY)], NOW, weekly)).toBe(true);
    expect(isBackupDue([file(NOW - 30 * DAY)], NOW, weekly)).toBe(true);
  });

  it("judges by the NEWEST file even when older ones exist", () => {
    const files = [file(NOW - 30 * DAY), file(NOW - 1 * DAY), file(NOW - 14 * DAY)];
    expect(isBackupDue(files, NOW, weekly)).toBe(false);
  });

  it("treats a future-stamped newest (clock rollback) as not due", () => {
    expect(isBackupDue([file(NOW + 3 * DAY)], NOW, weekly)).toBe(false);
  });

  it("monthly cadence waits ~30 days", () => {
    const monthly = cadenceMs("monthly");
    expect(isBackupDue([file(NOW - 29 * DAY)], NOW, monthly)).toBe(false);
    expect(isBackupDue([file(NOW - 30 * DAY)], NOW, monthly)).toBe(true);
  });
});

describe("planPrune", () => {
  it("keeps the newest N and dooms the rest", () => {
    const files = [
      file(NOW - 4 * DAY),
      file(NOW - 1 * DAY),
      file(NOW - 3 * DAY),
      file(NOW - 2 * DAY),
      file(NOW),
    ];
    const doomed = planPrune(files, 3);
    expect(doomed).toEqual([
      autoBackupFileName(NOW - 3 * DAY),
      autoBackupFileName(NOW - 4 * DAY),
    ]);
  });

  it("dooms nothing at or under the cap", () => {
    expect(planPrune([], AUTO_BACKUP_KEEP)).toEqual([]);
    expect(planPrune([file(NOW)], AUTO_BACKUP_KEEP)).toEqual([]);
    expect(
      planPrune([file(NOW), file(NOW - DAY), file(NOW - 2 * DAY)], 3)
    ).toEqual([]);
  });

  it("sortNewestFirst does not mutate its input", () => {
    const files = [file(NOW - DAY), file(NOW)];
    const sorted = sortNewestFirst(files);
    expect(sorted[0].timestampMs).toBe(NOW);
    expect(files[0].timestampMs).toBe(NOW - DAY);
  });
});

describe("parseAutoBackupSettings", () => {
  it("defaults to enabled + weekly", () => {
    expect(DEFAULT_AUTO_BACKUP_SETTINGS).toEqual({
      enabled: true,
      cadence: "weekly",
    });
    expect(parseAutoBackupSettings(null)).toEqual(DEFAULT_AUTO_BACKUP_SETTINGS);
    expect(parseAutoBackupSettings("")).toEqual(DEFAULT_AUTO_BACKUP_SETTINGS);
    expect(parseAutoBackupSettings("garbage")).toEqual(
      DEFAULT_AUTO_BACKUP_SETTINGS
    );
    expect(parseAutoBackupSettings("[1]")).toEqual(DEFAULT_AUTO_BACKUP_SETTINGS);
  });

  it("round-trips valid settings and rejects invalid fields piecemeal", () => {
    expect(
      parseAutoBackupSettings(
        JSON.stringify({ enabled: false, cadence: "monthly" })
      )
    ).toEqual({ enabled: false, cadence: "monthly" });
    expect(
      parseAutoBackupSettings(JSON.stringify({ enabled: false, cadence: "daily" }))
    ).toEqual({ enabled: false, cadence: "weekly" });
    expect(
      parseAutoBackupSettings(JSON.stringify({ enabled: "yes", cadence: "monthly" }))
    ).toEqual({ enabled: true, cadence: "monthly" });
  });
});

describe("formatBackupSize", () => {
  it("labels KB and MB, and hides unknown sizes", () => {
    expect(formatBackupSize(null)).toBeNull();
    expect(formatBackupSize(-1)).toBeNull();
    expect(formatBackupSize(0)).toBe("1 KB");
    expect(formatBackupSize(500)).toBe("1 KB");
    expect(formatBackupSize(340 * 1024)).toBe("340 KB");
    expect(formatBackupSize(1.2 * 1024 * 1024)).toBe("1.2 MB");
  });
});
