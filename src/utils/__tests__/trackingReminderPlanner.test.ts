import {
  CHECK_IN_MESSAGES,
  DEFAULT_TRACKING_REMINDER_SETTINGS,
  MAX_SCHEDULED_REMINDERS,
  MONTH_START_MESSAGES,
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
      settings: settings({ cadenceDays: 7, monthStartEnabled: false }),
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
      settings: settings({ cadenceDays: 1, monthStartEnabled: false }),
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
      settings: settings({ cadenceDays: 1, monthStartEnabled: false }),
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
      settings: settings({ cadenceDays: 1, monthStartEnabled: false }),
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

describe("planTrackingReminders - month-start planning", () => {
  it("schedules the next 1st of the month at the chosen hour", () => {
    // NOW is June 10 → July 1 falls inside the 30-day window (ends July 10).
    const monthStarts = plan({}).filter((r) =>
      r.identifier.startsWith("budgetark-monthstart-")
    );
    expect(monthStarts).toHaveLength(1);
    const [reminder] = monthStarts;
    expect(reminder.identifier).toBe("budgetark-monthstart-2026-07");
    expect(reminder.fireDate.getMonth()).toBe(6);
    expect(reminder.fireDate.getDate()).toBe(1);
    expect(reminder.fireDate.getHours()).toBe(19);
    expect(
      MONTH_START_MESSAGES.some(
        (m) => m.title === reminder.title && m.body === reminder.body
      )
    ).toBe(true);
  });

  it("schedules nothing month-start when that toggle is off", () => {
    const reminders = plan({
      settings: settings({ monthStartEnabled: false }),
    });
    expect(
      reminders.some((r) => r.identifier.startsWith("budgetark-monthstart-"))
    ).toBe(false);
  });

  it("plans only month-starts when check-ins are toggled off", () => {
    const reminders = plan({
      settings: settings({ checkInsEnabled: false }),
    });
    expect(reminders).toHaveLength(1);
    expect(reminders[0].identifier).toBe("budgetark-monthstart-2026-07");
  });

  it("fires today when it's the 1st and the hour hasn't passed", () => {
    const reminders = plan({
      settings: settings({ checkInsEnabled: false }),
      now: new Date(2026, 6, 1, 12, 0, 0), // July 1st, noon
    });
    expect(reminders[0].identifier).toBe("budgetark-monthstart-2026-07");
    expect(reminders[0].fireDate.getDate()).toBe(1);
    expect(reminders[0].fireDate.getHours()).toBe(19);
  });

  it("skips a 1st whose hour has already passed", () => {
    // July 1st 8:30pm: today's slot is gone, and Aug 1 is outside the
    // 30-day window (July has 31 days) - replans closer to August catch it.
    const reminders = plan({
      settings: settings({ checkInsEnabled: false }),
      now: new Date(2026, 6, 1, 20, 30, 0),
    });
    expect(reminders).toHaveLength(0);
  });

  it("drops a check-in that collides with a month-start day", () => {
    // Last entry June 28, cadence 3 → check-ins would fire July 1, 4, 7...
    // July 1 belongs to the month-start nudge; the check-in series resumes
    // on the 4th.
    const reminders = plan({
      entries: [entry({ createdAt: "2026-06-28T12:00:00" })],
      now: new Date(2026, 5, 29, 12, 0, 0),
    });
    const ids = reminders.map((r) => r.identifier);
    expect(ids[0]).toBe("budgetark-monthstart-2026-07");
    expect(ids).not.toContain("budgetark-checkin-2026-07-01");
    expect(ids).toContain("budgetark-checkin-2026-07-04");
  });

  it("rotates month-start copy by month, deterministically", () => {
    const june = plan({
      settings: settings({ checkInsEnabled: false }),
      now: new Date(2026, 4, 15, 12, 0, 0), // May → June 1st nudge
    });
    const july = plan({
      settings: settings({ checkInsEnabled: false }),
      now: new Date(2026, 5, 15, 12, 0, 0), // June → July 1st nudge
    });
    expect(june[0].body).not.toBe(july[0].body);
    const julyAgain = plan({
      settings: settings({ checkInsEnabled: false }),
      now: new Date(2026, 5, 20, 12, 0, 0),
    });
    expect(julyAgain[0].body).toBe(july[0].body);
  });
});
