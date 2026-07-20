import {
  KEEP_ALIVE_DEFAULT_LEAD_DAYS,
  KEEP_ALIVE_DEFAULT_WINDOW_MONTHS,
  cardsNeedingKeepAlive,
  getEffectiveKeepAliveLeadDays,
  getEffectiveKeepAliveWindowMonths,
  keepAliveDeadline,
  keepAliveStatus,
  latestOutflowByAccount,
  parseKeepAliveDate,
  planKeepAliveStamps,
} from "../cardKeepAlive";

// ts-jest runs transpile-only, so light `as any` casts keep fixtures concise.
const debt = (over: Record<string, unknown> = {}): any => ({
  id: "d1",
  name: "Chase Visa",
  balance: 0,
  debtClass: "personal_credit",
  keepAliveEnabled: true,
  keepAliveLastUsedAt: "2026-01-15T12:00:00.000Z",
  ...over,
});

const link = (over: Record<string, unknown> = {}): any => ({
  id: "l1",
  connectionId: "c1",
  externalAccountId: "acct-1",
  debtId: "d1",
  ...over,
});

const tx = (over: Record<string, unknown> = {}): any => ({
  externalAccountId: "acct-1",
  postedAt: "2026-07-10",
  amount: -12.5,
  pending: false,
  ...over,
});

describe("parseKeepAliveDate", () => {
  it("parses date-only strings as local date parts", () => {
    const parsed = parseKeepAliveDate("2026-07-19");
    expect(parsed).not.toBeNull();
    expect(parsed!.getFullYear()).toBe(2026);
    expect(parsed!.getMonth()).toBe(6);
    expect(parsed!.getDate()).toBe(19); // UTC-midnight parse would shift this west of UTC
  });

  it("parses full ISO timestamps", () => {
    const parsed = parseKeepAliveDate("2026-07-19T12:00:00.000Z");
    expect(parsed).not.toBeNull();
    expect(parsed!.getTime()).toBe(Date.parse("2026-07-19T12:00:00.000Z"));
  });

  it("rejects garbage and rolled-over calendar dates", () => {
    expect(parseKeepAliveDate("")).toBeNull();
    expect(parseKeepAliveDate("not a date")).toBeNull();
    expect(parseKeepAliveDate("2026-02-31")).toBeNull();
  });
});

describe("keepAliveDeadline", () => {
  it("adds whole calendar months", () => {
    const d = keepAliveDeadline(new Date(2026, 0, 15), 6);
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 6, 15]);
  });

  it("clamps month-end into shorter months", () => {
    // Aug 31 + 6mo -> Feb 28 (2027 is not a leap year), not Mar 2/3.
    const d = keepAliveDeadline(new Date(2026, 7, 31), 6);
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2027, 1, 28]);
  });

  it("respects leap-year February", () => {
    const d = keepAliveDeadline(new Date(2027, 7, 31), 6);
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2028, 1, 29]);
  });

  it("handles Jan 31 + 1 month", () => {
    const d = keepAliveDeadline(new Date(2026, 0, 31), 1);
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 1, 28]);
  });

  it("crosses year boundaries", () => {
    const d = keepAliveDeadline(new Date(2026, 10, 5), 3);
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2027, 1, 5]);
  });
});

describe("effective value accessors", () => {
  it("returns stored values when in range", () => {
    expect(
      getEffectiveKeepAliveWindowMonths(debt({ keepAliveWindowMonths: 12 }))
    ).toBe(12);
    expect(getEffectiveKeepAliveLeadDays(debt({ keepAliveLeadDays: 14 }))).toBe(
      14
    );
  });

  it("falls back to defaults for missing, fractional, or out-of-range values", () => {
    expect(getEffectiveKeepAliveWindowMonths(debt({}))).toBe(
      KEEP_ALIVE_DEFAULT_WINDOW_MONTHS
    );
    expect(
      getEffectiveKeepAliveWindowMonths(debt({ keepAliveWindowMonths: 0 }))
    ).toBe(KEEP_ALIVE_DEFAULT_WINDOW_MONTHS);
    expect(
      getEffectiveKeepAliveWindowMonths(debt({ keepAliveWindowMonths: 61 }))
    ).toBe(KEEP_ALIVE_DEFAULT_WINDOW_MONTHS);
    expect(
      getEffectiveKeepAliveWindowMonths(debt({ keepAliveWindowMonths: 6.5 }))
    ).toBe(KEEP_ALIVE_DEFAULT_WINDOW_MONTHS);
    expect(getEffectiveKeepAliveLeadDays(debt({ keepAliveLeadDays: 181 }))).toBe(
      KEEP_ALIVE_DEFAULT_LEAD_DAYS
    );
  });
});

describe("keepAliveStatus", () => {
  // Anchor: last used Jan 15 2026, window 6mo -> deadline Jul 15 2026,
  // default lead 30 days -> warnings begin Jun 15 2026.
  const card = debt({ keepAliveLastUsedAt: "2026-01-15T12:00:00.000Z" });

  it("returns null when disabled or missing/unparseable anchor", () => {
    expect(keepAliveStatus(debt({ keepAliveEnabled: false }))).toBeNull();
    expect(keepAliveStatus(debt({ keepAliveEnabled: undefined }))).toBeNull();
    expect(keepAliveStatus(debt({ keepAliveLastUsedAt: undefined }))).toBeNull();
    expect(keepAliveStatus(debt({ keepAliveLastUsedAt: "junk" }))).toBeNull();
  });

  it("is ok outside the lead window", () => {
    const s = keepAliveStatus(card, new Date(2026, 5, 14));
    expect(s!.status).toBe("ok");
    expect(s!.daysUntil).toBe(31);
  });

  it("turns upcoming exactly at the lead boundary", () => {
    const s = keepAliveStatus(card, new Date(2026, 5, 15));
    expect(s!.status).toBe("upcoming");
    expect(s!.daysUntil).toBe(30);
  });

  it("turns urgent within 7 days of the deadline", () => {
    expect(keepAliveStatus(card, new Date(2026, 6, 7))!.status).toBe(
      "upcoming"
    );
    expect(keepAliveStatus(card, new Date(2026, 6, 8))!.status).toBe("urgent");
    expect(keepAliveStatus(card, new Date(2026, 6, 15))!.status).toBe(
      "urgent"
    );
  });

  it("turns overdue past the deadline", () => {
    const s = keepAliveStatus(card, new Date(2026, 6, 16));
    expect(s!.status).toBe("overdue");
    expect(s!.daysUntil).toBe(-1);
  });

  it("computes the deadline from the stored window", () => {
    const s = keepAliveStatus(
      debt({
        keepAliveLastUsedAt: "2026-01-15T12:00:00.000Z",
        keepAliveWindowMonths: 3,
      }),
      new Date(2026, 3, 1)
    );
    expect([
      s!.deadline.getFullYear(),
      s!.deadline.getMonth(),
      s!.deadline.getDate(),
    ]).toEqual([2026, 3, 15]);
  });
});

describe("cardsNeedingKeepAlive", () => {
  const now = new Date(2026, 6, 1); // deadline Jul 15 -> upcoming

  it("includes only enabled personal-credit cards inside the warning window", () => {
    const debts = [
      debt({ id: "warn" }),
      debt({ id: "off", keepAliveEnabled: false }),
      debt({ id: "car", debtClass: "car" }),
      debt({ id: "fresh", keepAliveLastUsedAt: "2026-06-20T12:00:00.000Z" }),
      debt({ id: "gone", deletedAt: "2026-06-01T00:00:00.000Z" }),
    ];
    const warnings = cardsNeedingKeepAlive(debts, {}, now);
    expect(warnings.map((w) => w.debt.id)).toEqual(["warn"]);
    expect(warnings[0].status).toBe("upcoming");
  });

  it("skips cards dismissed this calendar month but not other months", () => {
    const debts = [debt({ id: "warn" })];
    expect(
      cardsNeedingKeepAlive(debts, { "warn:2026-07": "ts" }, now)
    ).toHaveLength(0);
    expect(
      cardsNeedingKeepAlive(debts, { "warn:2026-06": "ts" }, now)
    ).toHaveLength(1);
  });

  it("sorts soonest deadline first", () => {
    const debts = [
      debt({ id: "later", keepAliveLastUsedAt: "2026-01-20T12:00:00.000Z" }),
      debt({ id: "sooner", keepAliveLastUsedAt: "2026-01-10T12:00:00.000Z" }),
    ];
    const warnings = cardsNeedingKeepAlive(debts, {}, now);
    expect(warnings.map((w) => w.debt.id)).toEqual(["sooner", "later"]);
  });
});

describe("latestOutflowByAccount", () => {
  it("keeps the newest outflow per account, ignoring inflows", () => {
    const latest = latestOutflowByAccount([
      tx({ postedAt: "2026-07-01" }),
      tx({ postedAt: "2026-07-10" }),
      tx({ postedAt: "2026-07-15", amount: 200 }), // payment - ignored
      tx({ externalAccountId: "acct-2", postedAt: "2026-06-05" }),
    ]);
    expect(latest.get("acct-1")).toBe("2026-07-10");
    expect(latest.get("acct-2")).toBe("2026-06-05");
  });

  it("counts pending outflows and skips unparseable dates", () => {
    const latest = latestOutflowByAccount([
      tx({ postedAt: "2026-07-12", pending: true }),
      tx({ postedAt: "garbage" }),
      tx({ postedAt: "2026-07-05" }),
    ]);
    expect(latest.get("acct-1")).toBe("2026-07-12");
  });

  it("ignores zero-amount transactions", () => {
    expect(latestOutflowByAccount([tx({ amount: 0 })]).size).toBe(0);
  });
});

describe("planKeepAliveStamps", () => {
  const nowISO = "2026-07-19T12:00:00.000Z";
  const latest = new Map([["acct-1", "2026-07-10"]]);

  it("stamps a linked, enabled debt with newer activity", () => {
    const stamps = planKeepAliveStamps({
      links: [link()],
      debts: [debt()],
      latestByAccount: latest,
      nowISO,
    });
    expect(stamps).toEqual([{ debtId: "d1", lastUsedAt: "2026-07-10" }]);
  });

  it("skips unlinked links, stale debtIds, and disabled debts", () => {
    expect(
      planKeepAliveStamps({
        links: [link({ debtId: null })],
        debts: [debt()],
        latestByAccount: latest,
        nowISO,
      })
    ).toEqual([]);
    expect(
      planKeepAliveStamps({
        links: [link({ debtId: "missing" })],
        debts: [debt()],
        latestByAccount: latest,
        nowISO,
      })
    ).toEqual([]);
    expect(
      planKeepAliveStamps({
        links: [link()],
        debts: [debt({ keepAliveEnabled: false })],
        latestByAccount: latest,
        nowISO,
      })
    ).toEqual([]);
    expect(
      planKeepAliveStamps({
        links: [link()],
        debts: [debt({ deletedAt: "2026-07-01T00:00:00.000Z" })],
        latestByAccount: latest,
        nowISO,
      })
    ).toEqual([]);
  });

  it("ignores activity at or older than the current stamp", () => {
    expect(
      planKeepAliveStamps({
        links: [link()],
        debts: [debt({ keepAliveLastUsedAt: "2026-07-12T12:00:00.000Z" })],
        latestByAccount: latest,
        nowISO,
      })
    ).toEqual([]);
  });

  it("stamps a debt with no anchor yet", () => {
    const stamps = planKeepAliveStamps({
      links: [link()],
      debts: [debt({ keepAliveLastUsedAt: undefined })],
      latestByAccount: latest,
      nowISO,
    });
    expect(stamps).toEqual([{ debtId: "d1", lastUsedAt: "2026-07-10" }]);
  });

  it("clamps future provider dates at now", () => {
    const stamps = planKeepAliveStamps({
      links: [link()],
      debts: [debt()],
      latestByAccount: new Map([["acct-1", "2026-08-01"]]),
      nowISO,
    });
    expect(stamps).toEqual([{ debtId: "d1", lastUsedAt: nowISO }]);
  });

  it("keeps the newest activity when two links point at one debt", () => {
    const stamps = planKeepAliveStamps({
      links: [link(), link({ id: "l2", externalAccountId: "acct-2" })],
      debts: [debt()],
      latestByAccount: new Map([
        ["acct-1", "2026-07-05"],
        ["acct-2", "2026-07-12"],
      ]),
      nowISO,
    });
    expect(stamps).toEqual([{ debtId: "d1", lastUsedAt: "2026-07-12" }]);
  });
});
