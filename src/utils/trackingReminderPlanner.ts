/**
 * Pure planning logic for expense-tracking check-in notifications.
 *
 * These are habit nudges, not payment alerts (banks already remind people
 * about bills). A check-in fires only when the user has gone quiet: the
 * next reminder is anchored `cadenceDays` after the most recent budget
 * entry, and the scheduler replans on every app open/background - so a
 * user who logs regularly never hears from it, while a lapsed user gets
 * nudged at their chosen cadence until they log something again.
 *
 * No expo/React Native imports - the scheduler in
 * `src/notifications/trackingReminders.ts` owns the OS integration, this
 * module stays unit-testable in Node.
 */

import type { BudgetEntry } from "../types";

export type ReminderCadenceDays = 1 | 3 | 7;

/** Local hour the reminder fires at: morning, afternoon, or evening. */
export type ReminderHour = 9 | 13 | 19;

export interface TrackingReminderSettings {
  /** Master switch. Off by default - reminders are strictly opt-in. */
  enabled: boolean;
  /** Days of no logged entries before a check-in fires (and repeats). */
  cadenceDays: ReminderCadenceDays;
  /** Local hour of day (see ReminderHour) check-ins fire at. */
  hour: ReminderHour;
}

export const DEFAULT_TRACKING_REMINDER_SETTINGS: TrackingReminderSettings = {
  enabled: false,
  cadenceDays: 3,
  hour: 19,
};

/**
 * How far ahead check-ins are scheduled. Rescheduling happens on every app
 * open and background, so the window only needs to outlast a realistic gap
 * between app opens.
 */
export const REMINDER_WINDOW_DAYS = 30;

/**
 * Ceiling on scheduled notifications. iOS keeps only the 64 soonest pending
 * requests per app; a daily cadence over a 30-day window tops out at ~30,
 * so this is a guard rail, not a working limit.
 */
export const MAX_SCHEDULED_REMINDERS = 32;

export interface PlannedReminder {
  /** Deterministic per-fire-day identifier, e.g. `budgetark-checkin-2026-07-15`. */
  identifier: string;
  title: string;
  body: string;
  fireDate: Date;
}

/**
 * Friendly rotating copy so repeated nudges don't read like a broken robot.
 * Deliberately content-free: no names, no amounts, nothing sensitive on the
 * lock screen.
 */
export const CHECK_IN_MESSAGES: readonly { title: string; body: string }[] = [
  {
    title: "Time for a quick check-in",
    body: "Have a minute? Log your latest spending while it's fresh.",
  },
  {
    title: "Keep your Ark on course",
    body: "Jot down any expenses from the last few days.",
  },
  {
    title: "Quick expense check-in",
    body: "Any spending to track? It only takes a moment.",
  },
  {
    title: "A tidy ledger builds a sturdy Ark",
    body: "Add your recent expenses to keep your budget honest.",
  },
  {
    title: "Don't let spending drift by",
    body: "Take 30 seconds to log anything you've spent.",
  },
];

const dayKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;

/**
 * When the user last logged anything: the newest entry `createdAt`.
 * (`updatedAt` deliberately ignored - sync merges touch it without any
 * tracking happening on this device.) Returns null when no entry has a
 * parseable timestamp.
 */
export const lastTrackedAt = (entries: readonly BudgetEntry[]): Date | null => {
  let latest = Number.NEGATIVE_INFINITY;
  for (const entry of entries) {
    const t = Date.parse(entry.createdAt);
    if (Number.isFinite(t) && t > latest) latest = t;
  }
  return Number.isFinite(latest) ? new Date(latest) : null;
};

export interface PlanTrackingRemindersInput {
  entries: readonly BudgetEntry[];
  settings: TrackingReminderSettings;
  now?: Date;
}

/**
 * Plans the check-ins to schedule right now: the first fires `cadenceDays`
 * after the last logged entry at the chosen hour - or, when the user is
 * already overdue, at the next occurrence of that hour - then repeats every
 * `cadenceDays` through the scheduling window.
 */
export const planTrackingReminders = (
  input: PlanTrackingRemindersInput
): PlannedReminder[] => {
  const { entries, settings } = input;
  if (!settings.enabled) return [];
  const now = input.now ?? new Date();
  const { cadenceDays, hour } = settings;

  // Someone with no entries yet is treated as having tracked "now" - the
  // first nudge waits a full cadence rather than pestering a brand-new user.
  const anchor = lastTrackedAt(entries) ?? now;

  let fire = new Date(
    anchor.getFullYear(),
    anchor.getMonth(),
    anchor.getDate() + cadenceDays,
    hour,
    0,
    0
  );
  if (fire.getTime() <= now.getTime()) {
    // Already overdue - nudge at the next occurrence of the chosen hour
    // (today if it hasn't passed, otherwise tomorrow), not up to a full
    // cadence later.
    fire = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, 0, 0);
    if (fire.getTime() <= now.getTime()) {
      fire = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        hour,
        0,
        0
      );
    }
  }

  const windowEnd = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + REMINDER_WINDOW_DAYS,
    23,
    59,
    59
  );

  const planned: PlannedReminder[] = [];
  while (
    fire.getTime() <= windowEnd.getTime() &&
    planned.length < MAX_SCHEDULED_REMINDERS
  ) {
    // Rotate copy deterministically by calendar day so a reschedule doesn't
    // reshuffle the message a user already saw in their notification list.
    const message =
      CHECK_IN_MESSAGES[
        Math.floor(fire.getTime() / 86_400_000) % CHECK_IN_MESSAGES.length
      ];
    planned.push({
      identifier: `budgetark-checkin-${dayKey(fire)}`,
      title: message.title,
      body: message.body,
      fireDate: fire,
    });
    fire = new Date(
      fire.getFullYear(),
      fire.getMonth(),
      fire.getDate() + cadenceDays,
      hour,
      0,
      0
    );
  }

  return planned;
};
