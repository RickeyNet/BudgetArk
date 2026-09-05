// BudgetArk - Entry Date Helpers tests
//
// Pins the UTC-noon contract for stored entry dates. The regression these
// guard: buildEntryDateISO built from local noon shifts day-1 entries into
// the previous month for UTC+13/+14 users (the Add/Edit modal drift bug).

import {
  DEFAULT_RECURRENCE_DAY,
  WEEKDAY_SHORT_LABELS,
  buildEntryDateISO,
  buildMonthDayGrid,
  buildMonthDayRows,
  dayOfMonthFromIso,
  lastDayOfYearMonth,
  localYearMonth,
} from "../entryDate";

describe("buildEntryDateISO", () => {
  it("produces noon UTC with the exact yearMonth prefix the user picked", () => {
    expect(buildEntryDateISO("2026-07", 1)).toBe("2026-07-01T12:00:00.000Z");
    expect(buildEntryDateISO("2026-07", 15)).toBe("2026-07-15T12:00:00.000Z");
  });

  it("is timezone-independent: the string is built, not round-tripped through Date", () => {
    // The old Edit-modal version did new Date(`${ym}-${dd}T12:00:00`) which
    // parses as LOCAL noon; in UTC+13 that serializes as the previous UTC
    // day, moving a day-1 entry into the prior month. The fixed builder
    // must keep the picked month in the YYYY-MM prefix regardless of the
    // device timezone this test runs in.
    expect(buildEntryDateISO("2026-01", 1).slice(0, 7)).toBe("2026-01");
  });

  it("clamps the day into the month", () => {
    expect(buildEntryDateISO("2026-02", 31)).toBe("2026-02-28T12:00:00.000Z");
    expect(buildEntryDateISO("2024-02", 31)).toBe("2024-02-29T12:00:00.000Z");
    expect(buildEntryDateISO("2026-04", 0)).toBe("2026-04-01T12:00:00.000Z");
  });
});

describe("dayOfMonthFromIso", () => {
  it("reads the day from the canonical UTC-noon format", () => {
    expect(dayOfMonthFromIso("2026-07-01T12:00:00.000Z")).toBe(1);
    expect(dayOfMonthFromIso("2026-07-31T12:00:00.000Z")).toBe(31);
  });

  it("round-trips with buildEntryDateISO", () => {
    for (const day of [1, 15, 28]) {
      expect(dayOfMonthFromIso(buildEntryDateISO("2026-03", day))).toBe(day);
    }
  });

  it("uses the string prefix, not local calendar parts", () => {
    // Local getDate() on this value returns the wrong day in offsets beyond
    // +/-12h and flips the recurrence day on every edit. The prefix is what
    // the user picked.
    expect(dayOfMonthFromIso("2026-07-01T00:30:00.000Z")).toBe(1);
  });

  it("falls back to the default for garbage", () => {
    expect(dayOfMonthFromIso("not a date")).toBe(DEFAULT_RECURRENCE_DAY);
    expect(dayOfMonthFromIso("")).toBe(DEFAULT_RECURRENCE_DAY);
  });
});

describe("localYearMonth", () => {
  it("uses the device's local calendar month, not the UTC one", () => {
    // Local parts are what the user sees; build a Date from local parts so
    // the expectation holds in any test-runner timezone.
    const lateEvening = new Date(2026, 6, 31, 23, 30); // Jul 31, 23:30 local
    expect(localYearMonth(lateEvening)).toBe("2026-07");
    // Pairing with buildEntryDateISO keeps the entry in July regardless of
    // how far the UTC clock has rolled over.
    expect(buildEntryDateISO(localYearMonth(lateEvening), lateEvening.getDate())).toBe(
      "2026-07-31T12:00:00.000Z"
    );
  });

  it("zero-pads the month", () => {
    expect(localYearMonth(new Date(2026, 0, 5))).toBe("2026-01");
  });
});

describe("lastDayOfYearMonth", () => {
  it("handles month lengths and leap years", () => {
    expect(lastDayOfYearMonth("2026-01")).toBe(31);
    expect(lastDayOfYearMonth("2026-02")).toBe(28);
    expect(lastDayOfYearMonth("2024-02")).toBe(29);
    expect(lastDayOfYearMonth("2026-04")).toBe(30);
  });
});

describe("buildMonthDayGrid (the entry form's DAY calendar and the Bill Calendar)", () => {
  it("lays days out Sunday-first with blanks before the 1st and pads to whole weeks", () => {
    // September 2026 starts on a Tuesday and has 30 days: 2 leading blanks,
    // 30 days, 3 trailing blanks = 35 cells / 5 weeks.
    const grid = buildMonthDayGrid("2026-09");
    expect(grid.length % 7).toBe(0);
    expect(grid.slice(0, 3)).toEqual([null, null, 1]);
    expect(grid.filter((d) => d != null)).toHaveLength(30);
    expect(grid.slice(-3)).toEqual([null, null, null]);
    expect(grid.length).toBe(35);
    // Column = weekday: day 8 sits under "Tue".
    expect(WEEKDAY_SHORT_LABELS[grid.indexOf(8) % 7]).toBe("Tue");
  });

  it("has no leading blank when the month starts on a Sunday, and 6 when it starts on a Saturday", () => {
    // Feb 2026 starts on a Sunday; Aug 2026 starts on a Saturday.
    expect(buildMonthDayGrid("2026-02")[0]).toBe(1);
    expect(buildMonthDayGrid("2026-08").slice(0, 7)).toEqual([null, null, null, null, null, null, 1]);
  });

  it("uses the month's real length: 28, leap 29, 31", () => {
    const count = (ym: string) => buildMonthDayGrid(ym).filter((d) => d != null).length;
    expect(count("2026-02")).toBe(28);
    expect(count("2028-02")).toBe(29);
    expect(count("2026-07")).toBe(31);
    // Days run 1..N in order with no repeats.
    expect(buildMonthDayGrid("2026-07").filter((d) => d != null)).toEqual(
      Array.from({ length: 31 }, (_, i) => i + 1)
    );
  });

  it("slices the same cells into rows of seven", () => {
    const rows = buildMonthDayRows("2026-09");
    expect(rows).toHaveLength(5);
    expect(rows.every((row) => row.length === 7)).toBe(true);
    expect(rows.flat()).toEqual(buildMonthDayGrid("2026-09"));
    expect(rows[0]).toEqual([null, null, 1, 2, 3, 4, 5]);
  });
});
