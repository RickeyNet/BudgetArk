/**
 * BudgetArk - card keep-alive notification planner (pure).
 *
 * Plans the local "use your card soon" nudges from the debts' keep-alive
 * state. Same shape as trackingReminderPlanner: no expo/React Native
 * imports (the scheduler in src/notifications/cardKeepAliveReminders.ts
 * owns OS integration), deterministic per-fire-day identifiers so the
 * cancel-then-reschedule cycle is idempotent, a bounded scheduling window,
 * and a hard cap under iOS's 64-pending-request ceiling (shared with
 * tracking check-ins' 32).
 *
 * Security rule 11: notification content NEVER carries card names, amounts,
 * or even counts - the lock screen learns only that "a card" wants
 * attention. Because the copy can't disambiguate cards anyway, all cards'
 * nudges are coalesced into ONE notification per calendar day, which also
 * bounds the schedule regardless of how many cards are tracked. The in-app
 * banner is where the specific card and deadline appear.
 */

import type { Debt } from "../types";
import {
  KEEP_ALIVE_URGENT_DAYS,
  getEffectiveKeepAliveLeadDays,
  keepAliveStatus,
} from "./cardKeepAlive";

/** How far ahead nudges are scheduled; replanning happens on every app open. */
export const KEEP_ALIVE_WINDOW_DAYS = 30;

/** Ceiling on scheduled keep-alive notifications (per-day coalescing keeps
 * real counts far lower). */
export const MAX_SCHEDULED_KEEP_ALIVE_REMINDERS = 16;

/** Local hour nudges fire at - mid-morning, when a small errand purchase is
 * actually actionable. */
export const KEEP_ALIVE_REMINDER_HOUR = 10;

/** Cadence of repeat nudges once a card is overdue. */
const OVERDUE_REPEAT_DAYS = 7;

export interface PlannedKeepAliveReminder {
  /** Deterministic per-fire-day id, e.g. `budgetark-keepalive-2026-07-15`. */
  identifier: string;
  title: string;
  body: string;
  fireDate: Date;
}

/**
 * Rotating generic copy. Deliberately content-free (rule 11): no card
 * names, amounts, or counts on the lock screen.
 */
export const KEEP_ALIVE_MESSAGES: readonly { title: string; body: string }[] = [
  {
    title: "A card could use some activity",
    body: "One of your credit cards hasn't been used in a while. A small purchase keeps it active.",
  },
  {
    title: "Keep your credit line afloat",
    body: "An idle card can be closed by its issuer. Open BudgetArk to see which one needs a quick purchase.",
  },
  {
    title: "Quick card check",
    body: "A card you're tracking is nearing its inactivity deadline. A coffee-sized purchase resets the clock.",
  },
];

const dayKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;

export interface PlanKeepAliveRemindersInput {
  debts: readonly Debt[];
  now?: Date;
}

/**
 * Candidate nudge days for one card: the day its lead window opens, one
 * week out, the deadline itself, then weekly while overdue. All relative
 * to the deadline so a reschedule lands on the same days (deterministic).
 */
const candidateOffsets = (leadDays: number): number[] => {
  const offsets = new Set<number>([-leadDays, -KEEP_ALIVE_URGENT_DAYS, 0]);
  for (
    let after = OVERDUE_REPEAT_DAYS;
    after <= KEEP_ALIVE_WINDOW_DAYS;
    after += OVERDUE_REPEAT_DAYS
  ) {
    offsets.add(after);
  }
  return Array.from(offsets);
};

/**
 * Plans every keep-alive nudge to schedule right now. One notification per
 * calendar day across ALL tracked cards, future fires only, inside the
 * window, capped, sorted soonest-first.
 */
export const planKeepAliveReminders = (
  input: PlanKeepAliveRemindersInput
): PlannedKeepAliveReminder[] => {
  const now = input.now ?? new Date();
  const windowEnd = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + KEEP_ALIVE_WINDOW_DAYS,
    23,
    59,
    59
  );

  const fireDays = new Map<string, Date>();
  for (const debt of input.debts) {
    if (debt.deletedAt) continue;
    if (debt.debtClass !== "personal_credit") continue;
    const status = keepAliveStatus(debt, now);
    if (!status) continue;

    const { deadline } = status;
    for (const offset of candidateOffsets(getEffectiveKeepAliveLeadDays(debt))) {
      const fire = new Date(
        deadline.getFullYear(),
        deadline.getMonth(),
        deadline.getDate() + offset,
        KEEP_ALIVE_REMINDER_HOUR,
        0,
        0
      );
      if (fire.getTime() <= now.getTime()) continue;
      if (fire.getTime() > windowEnd.getTime()) continue;
      const key = dayKey(fire);
      if (!fireDays.has(key)) fireDays.set(key, fire);
    }
  }

  return Array.from(fireDays.values())
    .sort((a, b) => a.getTime() - b.getTime())
    .slice(0, MAX_SCHEDULED_KEEP_ALIVE_REMINDERS)
    .map((fire) => {
      // Rotate copy deterministically by calendar day so a reschedule
      // doesn't reshuffle a message already sitting in the tray.
      const message =
        KEEP_ALIVE_MESSAGES[
          Math.floor(fire.getTime() / 86_400_000) % KEEP_ALIVE_MESSAGES.length
        ];
      return {
        identifier: `budgetark-keepalive-${dayKey(fire)}`,
        title: message.title,
        body: message.body,
        fireDate: fire,
      };
    });
};
