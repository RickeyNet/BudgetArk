import {
  KEEP_ALIVE_MESSAGES,
  KEEP_ALIVE_REMINDER_HOUR,
  MAX_SCHEDULED_KEEP_ALIVE_REMINDERS,
  planKeepAliveReminders,
} from "../cardKeepAlivePlanner";
import { makeDebt } from "../../__tests__/fixtures";
import type { Debt } from "../../types";

const debt = (over: Partial<Debt> = {}): Debt =>
  makeDebt({
    id: "d1",
    name: "Chase Sapphire Reserve",
    balance: 0,
    debtClass: "personal_credit",
    keepAliveEnabled: true,
    // Deadline = Jul 15 2026 with the default 6-month window.
    keepAliveLastUsedAt: "2026-01-15T12:00:00.000Z",
    ...over,
  });

describe("planKeepAliveReminders", () => {
  it("plans lead-day, week-before, and deadline nudges inside the window", () => {
    // Now = Jun 14, day before the 30-day lead window opens.
    const planned = planKeepAliveReminders({
      debts: [debt()],
      now: new Date(2026, 5, 14),
    });
    const days = planned.map((p) => p.identifier);
    // The deadline (Jul 15) sits just past the 30-day window from Jun 14;
    // a later replan (every app open) picks it up.
    expect(days).toEqual([
      "budgetark-keepalive-2026-06-15", // deadline - 30 (lead)
      "budgetark-keepalive-2026-07-08", // deadline - 7
    ]);
  });

  it("includes the deadline-day nudge once it enters the window", () => {
    const planned = planKeepAliveReminders({
      debts: [debt()],
      now: new Date(2026, 5, 20),
    });
    expect(planned.map((p) => p.identifier)).toContain(
      "budgetark-keepalive-2026-07-15"
    );
  });

  it("fires at the fixed local hour", () => {
    const planned = planKeepAliveReminders({
      debts: [debt()],
      now: new Date(2026, 5, 14),
    });
    for (const p of planned) {
      expect(p.fireDate.getHours()).toBe(KEEP_ALIVE_REMINDER_HOUR);
    }
  });

  it("repeats weekly once overdue", () => {
    // Now = Jul 20, deadline Jul 15 already passed.
    const planned = planKeepAliveReminders({
      debts: [debt()],
      now: new Date(2026, 6, 20),
    });
    expect(planned.map((p) => p.identifier)).toEqual([
      "budgetark-keepalive-2026-07-22", // deadline + 7
      "budgetark-keepalive-2026-07-29", // deadline + 14
      "budgetark-keepalive-2026-08-05", // deadline + 21
      "budgetark-keepalive-2026-08-12", // deadline + 28
    ]);
  });

  it("skips disabled, non-credit, deleted, and anchorless debts", () => {
    const planned = planKeepAliveReminders({
      debts: [
        debt({ keepAliveEnabled: false }),
        debt({ id: "d2", debtClass: "car" }),
        debt({ id: "d3", deletedAt: "2026-06-01T00:00:00.000Z" }),
        debt({ id: "d4", keepAliveLastUsedAt: undefined }),
      ],
      now: new Date(2026, 5, 14),
    });
    expect(planned).toHaveLength(0);
  });

  it("coalesces multiple cards into one notification per day", () => {
    const planned = planKeepAliveReminders({
      debts: [debt(), debt({ id: "d2", name: "Amex Gold" })],
      now: new Date(2026, 5, 14),
    });
    const ids = planned.map((p) => p.identifier);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(2); // same days as a single card
  });

  it("plans only future fires and respects the cap", () => {
    // Many overdue cards with staggered deadlines -> many candidate days.
    const debts = Array.from({ length: 40 }, (_, i) =>
      debt({
        id: `d${i}`,
        keepAliveLastUsedAt: `2026-01-${String((i % 28) + 1).padStart(2, "0")}`,
      })
    );
    const now = new Date(2026, 6, 20);
    const planned = planKeepAliveReminders({ debts, now });
    expect(planned.length).toBeLessThanOrEqual(
      MAX_SCHEDULED_KEEP_ALIVE_REMINDERS
    );
    for (const p of planned) {
      expect(p.fireDate.getTime()).toBeGreaterThan(now.getTime());
    }
  });

  it("is deterministic across replans", () => {
    const a = planKeepAliveReminders({
      debts: [debt()],
      now: new Date(2026, 5, 14, 9, 0),
    });
    const b = planKeepAliveReminders({
      debts: [debt()],
      now: new Date(2026, 5, 14, 18, 30),
    });
    expect(a.map((p) => p.identifier)).toEqual(b.map((p) => p.identifier));
    expect(a.map((p) => p.title)).toEqual(b.map((p) => p.title));
  });

  it("never leaks a card name, amount, or count into notification content", () => {
    const debts = [
      debt(),
      debt({ id: "d2", name: "Amex Gold", balance: 1234.56 }),
    ];
    const planned = planKeepAliveReminders({
      debts,
      now: new Date(2026, 5, 14),
    });
    expect(planned.length).toBeGreaterThan(0);
    for (const p of planned) {
      for (const d of debts) {
        expect(p.title).not.toContain(d.name);
        expect(p.body).not.toContain(d.name);
        expect(p.body).not.toContain(String(d.balance));
      }
      // Copy comes verbatim from the vetted generic pool.
      expect(
        KEEP_ALIVE_MESSAGES.some(
          (m) => m.title === p.title && m.body === p.body
        )
      ).toBe(true);
    }
  });
});
