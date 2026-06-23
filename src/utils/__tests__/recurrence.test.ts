import {
  getRecurrenceInterval,
  getRecurrenceTag,
  isEntryActiveInMonth,
  countOccurrencesBetween,
  listOccurrenceMonths,
} from "../recurrence";

describe("getRecurrenceInterval", () => {
  it("defaults non-recurring entries to monthly (1)", () => {
    expect(getRecurrenceInterval({ recurring: false } as any)).toBe(1);
  });

  it("treats legacy recurring entries (no interval) as monthly", () => {
    expect(getRecurrenceInterval({ recurring: true } as any)).toBe(1);
  });

  it("honors a valid stored interval", () => {
    expect(getRecurrenceInterval({ recurring: true, recurrenceInterval: 3 } as any)).toBe(3);
  });

  it("ignores an invalid interval", () => {
    expect(getRecurrenceInterval({ recurring: true, recurrenceInterval: 7 } as any)).toBe(1);
  });
});

describe("getRecurrenceTag", () => {
  it("is empty for non-recurring entries", () => {
    expect(getRecurrenceTag({ recurring: false } as any)).toBe("");
  });

  it("maps intervals to their short tag", () => {
    expect(getRecurrenceTag({ recurring: true, recurrenceInterval: 1 } as any)).toBe("Monthly");
    expect(getRecurrenceTag({ recurring: true, recurrenceInterval: 3 } as any)).toBe("Quarterly");
    expect(getRecurrenceTag({ recurring: true, recurrenceInterval: 6 } as any)).toBe("6 mo");
    expect(getRecurrenceTag({ recurring: true, recurrenceInterval: 12 } as any)).toBe("Yearly");
  });
});

describe("isEntryActiveInMonth", () => {
  it("shows a non-recurring entry only in its own month", () => {
    const e = { date: "2026-03-15", recurring: false } as any;
    expect(isEntryActiveInMonth(e, "2026-03")).toBe(true);
    expect(isEntryActiveInMonth(e, "2026-04")).toBe(false);
  });

  it("never shows an entry before its start month", () => {
    const e = { date: "2026-03-01", recurring: true, recurrenceInterval: 1 } as any;
    expect(isEntryActiveInMonth(e, "2026-02")).toBe(false);
  });

  it("repeats a monthly entry every month from its start", () => {
    const e = { date: "2026-01-01", recurring: true, recurrenceInterval: 1 } as any;
    expect(isEntryActiveInMonth(e, "2026-01")).toBe(true);
    expect(isEntryActiveInMonth(e, "2026-05")).toBe(true);
  });

  it("respects a quarterly cadence", () => {
    const e = { date: "2026-01-01", recurring: true, recurrenceInterval: 3 } as any;
    expect(isEntryActiveInMonth(e, "2026-01")).toBe(true);
    expect(isEntryActiveInMonth(e, "2026-02")).toBe(false);
    expect(isEntryActiveInMonth(e, "2026-04")).toBe(true);
    expect(isEntryActiveInMonth(e, "2027-01")).toBe(true);
  });
});

describe("countOccurrencesBetween", () => {
  it("returns 0 for non-recurring entries", () => {
    const e = { date: "2026-01-01", recurring: false } as any;
    expect(countOccurrencesBetween(e, "2026-01", "2026-06")).toBe(0);
  });

  it("counts monthly occurrences after the last-applied month", () => {
    const e = { date: "2026-01-01", recurring: true, recurrenceInterval: 1 } as any;
    // (2026-01, 2026-04] -> Feb, Mar, Apr = 3
    expect(countOccurrencesBetween(e, "2026-01", "2026-04")).toBe(3);
  });

  it("counts quarterly occurrences", () => {
    const e = { date: "2026-01-01", recurring: true, recurrenceInterval: 3 } as any;
    // (2026-01, 2026-12]: Apr, Jul, Oct = 3
    expect(countOccurrencesBetween(e, "2026-01", "2026-12")).toBe(3);
  });

  it("returns 0 when the window ends before the entry begins", () => {
    const e = { date: "2026-06-01", recurring: true, recurrenceInterval: 1 } as any;
    expect(countOccurrencesBetween(e, "2026-01", "2026-03")).toBe(0);
  });
});

describe("listOccurrenceMonths", () => {
  it("lists a single month for a non-recurring entry inside the window", () => {
    const e = { date: "2026-03-10", recurring: false } as any;
    expect(listOccurrenceMonths(e, "2026-01", "2026-12")).toEqual(["2026-03"]);
  });

  it("omits a non-recurring entry outside the window", () => {
    const e = { date: "2026-03-10", recurring: false } as any;
    expect(listOccurrenceMonths(e, "2026-04", "2026-12")).toEqual([]);
  });

  it("projects recurring months and rolls over the year boundary", () => {
    const e = { date: "2026-11-01", recurring: true, recurrenceInterval: 3 } as any;
    expect(listOccurrenceMonths(e, "2026-11", "2027-06")).toEqual([
      "2026-11",
      "2027-02",
      "2027-05",
    ]);
  });

  it("clips the projection to the window start", () => {
    const e = { date: "2026-01-01", recurring: true, recurrenceInterval: 1 } as any;
    expect(listOccurrenceMonths(e, "2026-03", "2026-05")).toEqual([
      "2026-03",
      "2026-04",
      "2026-05",
    ]);
  });
});
