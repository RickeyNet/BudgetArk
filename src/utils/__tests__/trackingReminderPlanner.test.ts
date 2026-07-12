import {
  CHECK_IN_MESSAGES,
  DEFAULT_TRACKING_REMINDER_SETTINGS,
  MAX_SCHEDULED_REMINDERS,
  REMINDER_WINDOW_DAYS,
  lastTrackedAt,
  planTrackingReminders,
  type TrackingReminderSettings,
} from "../trackingReminderPlanner";

// Dates use explicit local times (no Z) so getDate()/getHours() return the
// intended values regardless of the test runner's timezone.
const entry = (over: Record<string, unknown> = {}): any => ({
  id: "e1",
  type: "expense",
  category: "Grocery",
  amount: 42,
  date: "2026-06-01T12:00:00",
  createdAt: "2026-06-01T12:00:00",
  updatedAt: "2026-06-01T12:00:00",
  ...over,
});

const settings = (
  over: Partial<TrackingReminderSettings> = {}
): TrackingReminderSettings => ({
  ...DEFAULT_TRACKING_REMINDER_SETTINGS,
  enabled: true,
  ...over,
});

// Midday June 10th - the default evening (19:00) fire time is still ahead.
const NOW = new Date(2026, 5, 10, 12, 0, 0);

const plan = (
  input: Partial<Parameters<typeof planTrackingReminders>[0]> = {}
) =>
  planTrackingReminders({
    entries: [],
    settings: settings(),
    now: NOW,
    ...input,
  });

describe("lastTrackedAt", () => {
  it("returns the newest createdAt", () => {
    const result = lastTrackedAt([
      entry({ createdAt: "2026-06-01T12:00:00" }),
      entry({ id: "e2", createdAt: "2026-06-08T09:30:00" }),
      entry({ id: "e3", createdAt: "2026-05-20T12:00:00" }),
    ]);
    expect(result?.getDate()).toBe(8);
    expect(result?.getMonth()).toBe(5);
  });

  it("ignores unparseable timestamps and returns null when none parse", () => {
    expect(lastTrackedAt([entry({ createdAt: "garbage" })])).toBeNull();
    expect(lastTrackedAt([])).toBeNull();
  });
});

describe("planTrackingReminders", () => {
  it("returns nothing when disabled", () => {
    expect(
      plan({
        entries: [entry()],
        settings: settings({ enabled: false }),
      })
    ).toEqual([]);
  });

  it("anchors the first check-in a full cadence after the last entry", () => {
    // Logged on the 8th, cadence 3 → first nudge the 11th at 19:00.
    const [first] = plan({
      entries: [entry({ createdAt: "2026-06-08T15:00:00" })],
    });
    expect(first.fireDate.getMonth()).toBe(5);
    expect(first.fireDate.getDate()).toBe(11);
    expect(first.fireDate.getHours()).toBe(19);
    expect(first.identifier).toBe("budgetark-checkin-2026-06-11");
  });

  it("treats a brand-new user (no entries) as having tracked now", () => {
    const [first] = plan({ entries: [] });
    // NOW is June 10 → first nudge June 13 at 19:00, not immediately.
    expect(first.fireDate.getDate()).toBe(13);
  });

  it("nudges an already-overdue user at the next reminder hour, not a full cadence out", () => {
    // Last entry May 1st, way past any cadence. NOW is June 10 noon, so the
    // evening slot today (19:00) is still ahead - fire today.
    const [first] = plan({
      entries: [entry({ createdAt: "2026-05-01T12:00:00" })],
    });
    expect(first.fireDate.getDate()).toBe(10);
    expect(first.fireDate.getHours()).toBe(19);
  });

  it("rolls an overdue nudge to tomorrow when today's hour has passed", () => {
    const [first] = plan({
      entries: [entry({ createdAt: "2026-05-01T12:00:00" })],
      now: new Date(2026, 5, 10, 20, 30, 0), // 8:30pm, evening slot gone
    });
    expect(first.fireDate.getDate()).toBe(11);
    expect(first.fireDate.getHours()).toBe(19);
  });

  it("repeats every cadenceDays through the window", () => {
    const reminders = plan({
      entries: [entry({ createdAt: "2026-06-09T12:00:00" })],
      settings: settings({ cadenceDays: 7 }),
    });
    // First on the 16th, then weekly inside the 30-day window.
    const days = reminders.map((r) => r.fireDate.getDate());
    expect(days).toEqual([16, 23, 30, 7]);
    reminders.forEach((r) => expect(r.fireDate.getHours()).toBe(19));
  });

  it("respects the chosen hour", () => {
    const [first] = plan({
      entries: [entry({ createdAt: "2026-06-09T12:00:00" })],
      settings: settings({ hour: 9 }),
    });
    expect(first.fireDate.getHours()).toBe(9);
  });

  it("stays inside the window and under the cap on a daily cadence", () => {
    const reminders = plan({
      entries: [entry({ createdAt: "2026-06-09T12:00:00" })],
      settings: settings({ cadenceDays: 1 }),
    });
    expect(reminders.length).toBeLessThanOrEqual(MAX_SCHEDULED_REMINDERS);
    // Daily fires from tomorrow through the window's last day, inclusive.
    expect(reminders.length).toBe(REMINDER_WINDOW_DAYS + 1);
    const last = reminders[reminders.length - 1].fireDate;
    const windowEnd = new Date(2026, 5, 10 + REMINDER_WINDOW_DAYS, 23, 59, 59);
    expect(last.getTime()).toBeLessThanOrEqual(windowEnd.getTime());
  });

  it("uses lock-screen-safe copy and rotates it deterministically", () => {
    const reminders = plan({
      entries: [entry({ createdAt: "2026-06-09T12:00:00" })],
      settings: settings({ cadenceDays: 1 }),
    });
    // Every title/body comes from the fixed message list (nothing sensitive).
    for (const reminder of reminders) {
      expect(
        CHECK_IN_MESSAGES.some(
          (m) => m.title === reminder.title && m.body === reminder.body
        )
      ).toBe(true);
    }
    // Consecutive daily nudges rotate rather than repeating one message.
    expect(reminders[0].body).not.toBe(reminders[1].body);
    // Deterministic: replanning yields the same copy for the same days.
    const again = plan({
      entries: [entry({ createdAt: "2026-06-09T12:00:00" })],
      settings: settings({ cadenceDays: 1 }),
    });
    expect(again[0].body).toBe(reminders[0].body);
  });

  it("is idempotent for identifiers across replans mid-window", () => {
    const first = plan({
      entries: [entry({ createdAt: "2026-06-09T12:00:00" })],
      settings: settings({ cadenceDays: 7 }),
    });
    // Same data replanned two days later (no new entries): same anchor, so
    // the same fire days - the scheduler's cancel-and-reschedule lands on
    // identical identifiers instead of drifting.
    const later = plan({
      entries: [entry({ createdAt: "2026-06-09T12:00:00" })],
      settings: settings({ cadenceDays: 7 }),
      now: new Date(2026, 5, 12, 12, 0, 0),
    });
    expect(later[0].identifier).toBe(first[0].identifier);
  });

  it("pushes the schedule out when a newer entry is logged", () => {
    const before = plan({
      entries: [entry({ createdAt: "2026-06-08T12:00:00" })],
    });
    const after = plan({
      entries: [
        entry({ createdAt: "2026-06-08T12:00:00" }),
        entry({ id: "e2", createdAt: "2026-06-10T11:00:00" }),
      ],
    });
    expect(before[0].fireDate.getDate()).toBe(11);
    expect(after[0].fireDate.getDate()).toBe(13);
  });
});
