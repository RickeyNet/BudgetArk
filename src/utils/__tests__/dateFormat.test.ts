// BudgetArk - Date Display Formatters tests
//
// Pins the consolidated label helpers (formerly per-file copies in three
// modals + two cards). Locale-dependent output is asserted loosely so the
// suite doesn't depend on the machine's ICU locale.

import { MONTH_LABELS, formatDayLabel, formatYearMonthLabel } from "../dateFormat";

describe("formatYearMonthLabel", () => {
  it("formats YYYY-MM as 'Mon YYYY' without a Date round-trip", () => {
    expect(formatYearMonthLabel("2026-07")).toBe("Jul 2026");
    expect(formatYearMonthLabel("2026-01")).toBe("Jan 2026");
    expect(formatYearMonthLabel("2026-12")).toBe("Dec 2026");
  });

  it("falls back to Jan for out-of-range months", () => {
    expect(formatYearMonthLabel("2026-13")).toBe("Jan 2026");
    expect(formatYearMonthLabel("2026-00")).toBe("Jan 2026");
  });
});

describe("MONTH_LABELS", () => {
  it("has 12 entries aligned with formatYearMonthLabel", () => {
    expect(MONTH_LABELS).toHaveLength(12);
    expect(MONTH_LABELS[6]).toBe("Jul");
  });
});

describe("formatDayLabel", () => {
  it("renders month and day (locale-loose)", () => {
    const label = formatDayLabel("2026-07-16T12:00:00Z");
    expect(label).toMatch(/16/);
    expect(label.length).toBeGreaterThan(2);
  });

  it("includes a weekday only when asked", () => {
    const plain = formatDayLabel("2026-07-16T12:00:00Z");
    const withDay = formatDayLabel("2026-07-16T12:00:00Z", { weekday: true });
    expect(withDay.length).toBeGreaterThan(plain.length);
  });

  it("renders 'Unknown date' for unparseable input, never 'Invalid Date'", () => {
    expect(formatDayLabel("not-a-date")).toBe("Unknown date");
    expect(formatDayLabel("")).toBe("Unknown date");
  });
});
