// BudgetArk - budgetMonths tests
//
// Pins the shared local month-key contract now that the nine private copies
// are gone: local time (not UTC), zero-padded, day-safe offsets, and the
// Budget tab's next+current+12 navigable months.

import {
  BUDGET_HISTORY_MONTHS,
  formatMonthKeyLabel,
  getBudgetMonthKeys,
  getMonthDateFromKey,
  getMonthKey,
  getMonthKeyOffset,
} from "../budgetMonths";

describe("getMonthKey", () => {
  it("uses the LOCAL calendar month, zero-padded", () => {
    expect(getMonthKey(new Date(2026, 0, 15))).toBe("2026-01");
    expect(getMonthKey(new Date(2026, 11, 31, 23, 59))).toBe("2026-12");
  });

  it("defaults to now", () => {
    const now = new Date();
    expect(getMonthKey()).toBe(getMonthKey(now));
  });
});

describe("getMonthKeyOffset", () => {
  it("walks months across year boundaries", () => {
    const jan = new Date(2026, 0, 31);
    expect(getMonthKeyOffset(1, jan)).toBe("2026-02");
    expect(getMonthKeyOffset(-1, jan)).toBe("2025-12");
    expect(getMonthKeyOffset(-13, jan)).toBe("2024-12");
  });

  it("is day-safe: Jan 31 + 1 month is February, not March", () => {
    expect(getMonthKeyOffset(1, new Date(2026, 0, 31))).toBe("2026-02");
  });
});

describe("getBudgetMonthKeys", () => {
  it("lists next month, the current month, then a trailing year", () => {
    const keys = getBudgetMonthKeys(new Date(2026, 5, 10));
    expect(keys[0]).toBe("2026-07");
    expect(keys[1]).toBe("2026-06");
    expect(keys[keys.length - 1]).toBe("2025-06");
    expect(keys).toHaveLength(BUDGET_HISTORY_MONTHS + 2);
  });
});

describe("month key <-> date/label", () => {
  it("anchors on local midnight of the 1st", () => {
    const d = getMonthDateFromKey("2026-03");
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 2, 1, 0]);
  });

  it("formats a long month + year label", () => {
    const label = formatMonthKeyLabel("2026-03");
    expect(label).toMatch(/2026/);
    expect(label.length).toBeGreaterThan(4);
  });
});
