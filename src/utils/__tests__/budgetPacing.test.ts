import {
  AHEAD_TOLERANCE,
  buildPaceAlerts,
  computeCategoryPacing,
  ordinalDay,
  pacingClockFor,
} from "../budgetPacing";

describe("pacingClockFor", () => {
  it("returns the day and month length for the current local month only", () => {
    const now = new Date(2026, 5, 12); // 12 June 2026, local
    expect(pacingClockFor("2026-06", now)).toEqual({ dayOfMonth: 12, daysInMonth: 30 });
    expect(pacingClockFor("2026-05", now)).toBeNull();
    expect(pacingClockFor("2026-07", now)).toBeNull();
  });

  it("knows February's length, leap years included", () => {
    expect(pacingClockFor("2026-02", new Date(2026, 1, 3))?.daysInMonth).toBe(28);
    expect(pacingClockFor("2024-02", new Date(2024, 1, 3))?.daysInMonth).toBe(29);
  });
});

describe("computeCategoryPacing", () => {
  const mid = { dayOfMonth: 15, daysInMonth: 30 };

  it("is null without a limit, a clock, or sane inputs", () => {
    expect(computeCategoryPacing(100, null, mid)).toBeNull();
    expect(computeCategoryPacing(100, 0, mid)).toBeNull();
    expect(computeCategoryPacing(100, 400, null)).toBeNull();
    expect(computeCategoryPacing(-1, 400, mid)).toBeNull();
    expect(computeCategoryPacing(Number.NaN, 400, mid)).toBeNull();
    expect(computeCategoryPacing(100, 400, { dayOfMonth: 0, daysInMonth: 30 })).toBeNull();
  });

  it("marks an even spread as on track and places the marker at the elapsed fraction", () => {
    const pacing = computeCategoryPacing(200, 400, mid);
    expect(pacing).toMatchObject({
      status: "on-track",
      elapsedFraction: 0.5,
      expectedSpent: 200,
      expectedRatio: 0.5,
      projectedSpent: 400,
      overBy: 0,
    });
  });

  it("flags spending that projects past the limit as ahead", () => {
    // 60% spent on day 12 of 30 -> projects to 150% of the limit.
    const pacing = computeCategoryPacing(240, 400, { dayOfMonth: 12, daysInMonth: 30 });
    expect(pacing?.status).toBe("ahead");
    expect(pacing?.expectedSpent).toBe(160);
    expect(pacing?.projectedSpent).toBe(600);
  });

  it("tolerates a small projected overshoot", () => {
    // Exactly at the tolerance edge stays on track; just past it is ahead.
    const clock = { dayOfMonth: 10, daysInMonth: 30 };
    const edge = (400 / 3) * (1 + AHEAD_TOLERANCE);
    expect(computeCategoryPacing(edge - 0.01, 400, clock)?.status).toBe("on-track");
    expect(computeCategoryPacing(edge + 1, 400, clock)?.status).toBe("ahead");
  });

  it("never says ahead in the first days of the month, only over", () => {
    const day2 = { dayOfMonth: 2, daysInMonth: 30 };
    // 25% spent on day 2 projects to 375% - still noise this early.
    expect(computeCategoryPacing(100, 400, day2)?.status).toBe("on-track");
    expect(computeCategoryPacing(400.01, 400, day2)?.status).toBe("over");
  });

  it("treats spending exactly on the limit as at-limit, not over, and never alerts on it", () => {
    const pacing = computeCategoryPacing(400, 400, mid);
    expect(pacing?.status).toBe("at-limit");
    expect(pacing?.overBy).toBe(0);
    // A cent either side flips it.
    expect(computeCategoryPacing(399.99, 400, mid)?.status).not.toBe("at-limit");
    expect(computeCategoryPacing(400.01, 400, mid)?.status).toBe("over");
    // The banner used to announce "over its $400 limit by $0".
    expect(buildPaceAlerts([{ category: "Grocery", spent: 400, limit: 400 }], mid)).toEqual([]);
    expect(buildPaceAlerts([{ category: "Grocery", spent: 400.01, limit: 400 }], mid)).toHaveLength(1);
  });

  it("reports over with the overshoot amount", () => {
    const pacing = computeCategoryPacing(455.5, 400, mid);
    expect(pacing?.status).toBe("over");
    expect(pacing?.overBy).toBe(55.5);
  });

  it("caps the elapsed fraction at 1 when the clock is past month end", () => {
    const pacing = computeCategoryPacing(100, 400, { dayOfMonth: 31, daysInMonth: 30 });
    expect(pacing?.elapsedFraction).toBe(1);
    expect(pacing?.expectedRatio).toBe(1);
  });
});

describe("buildPaceAlerts", () => {
  const clock = { dayOfMonth: 12, daysInMonth: 30 };
  const rows = [
    { category: "Grocery" as const, spent: 240, limit: 400 }, // ahead (projects 600)
    { category: "Restaurant" as const, spent: 40, limit: 150 }, // on track
    { category: "Shopping" as const, spent: 210, limit: 200 }, // over by 10
    { category: "Entertainment" as const, spent: 95, limit: 100 }, // ahead (projects 237.5)
    { category: "Utilities" as const, spent: 300, limit: null }, // no limit
    { category: "Housing" as const, spent: 1500, limit: 1200 }, // over by 300
  ];

  it("lists over-limit rows first (largest overshoot), then ahead rows by projected overshoot", () => {
    const alerts = buildPaceAlerts(rows, clock);
    expect(alerts.map((a) => `${a.category}:${a.status}`)).toEqual([
      "Housing:over",
      "Shopping:over",
      "Grocery:ahead", // projects +200 over
      "Entertainment:ahead", // projects +137.5 over
    ]);
    expect(alerts[2]).toMatchObject({
      percentSpent: 60,
      expectedSpent: 160,
      projectedSpent: 600,
      limit: 400,
    });
  });

  it("is empty when the month is not current or nothing is off pace", () => {
    expect(buildPaceAlerts(rows, null)).toEqual([]);
    expect(buildPaceAlerts([rows[1]], clock)).toEqual([]);
  });

  it("caps percentSpent for display", () => {
    const alerts = buildPaceAlerts([{ category: "Other", spent: 5000, limit: 1 }], clock);
    expect(alerts[0].percentSpent).toBe(999);
  });
});

describe("ordinalDay", () => {
  it("handles the English suffix rules including the teens", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 30, 31].map(ordinalDay)).toEqual([
      "1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "23rd", "30th", "31st",
    ]);
  });
});
