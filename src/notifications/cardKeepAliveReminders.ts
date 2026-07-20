/**
 * BudgetArk - card keep-alive nudge scheduling (expo-notifications side).
 *
 * Everything here is LOCAL notifications: planned on-device from the user's
 * own debt records, scheduled with the OS, no push token, no server. The
 * planning math lives in `src/utils/cardKeepAlivePlanner.ts` (pure,
 * unit-tested); this module owns permissions, the Android channel, and
 * keeping the OS schedule in sync with the plan.
 * `rescheduleCardKeepAliveReminders` is idempotent - cancel ours, schedule
 * the fresh plan - and is called on app open, on background, whenever a
 * card's keep-alive settings change, and after a sync stamps new activity.
 *
 * Do NOT call `Notifications.setNotificationHandler` here -
 * `trackingReminders.ts` owns the single global foreground policy (no
 * banner over the app), which is exactly the behavior keep-alive needs too.
 * A second call would silently overwrite it.
 */

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { getDebts } from "../storage/debtStorage";
import { planKeepAliveReminders } from "../utils/cardKeepAlivePlanner";

export const CARD_KEEP_ALIVE_CHANNEL_ID = "card-keep-alive";

/** Marker in notification data identifying requests owned by this feature. */
export const CARD_KEEP_ALIVE_DATA_TYPE = "card-keep-alive-reminder";

const ensureAndroidChannel = async (): Promise<void> => {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(CARD_KEEP_ALIVE_CHANNEL_ID, {
    name: "Card activity reminders",
    description:
      "Gentle reminders to use a tracked credit card before its issuer closes it for inactivity",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250],
  });
};

/**
 * Requests notification permission if it hasn't been decided yet.
 * Returns whether notifications can currently be displayed. When this
 * returns false and the user has permanently declined, the only path back
 * is the OS settings screen - the caller surfaces that. Keep-alive stays
 * enableable either way: the in-app banner works without OS permission.
 */
export const ensureCardKeepAlivePermissions = async (): Promise<boolean> => {
  await ensureAndroidChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
};

const cancelOurScheduled = async (): Promise<void> => {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    all
      .filter(
        (request) =>
          request.content.data?.type === CARD_KEEP_ALIVE_DATA_TYPE
      )
      .map((request) =>
        Notifications.cancelScheduledNotificationAsync(request.identifier)
      )
  );
};

const doReschedule = async (): Promise<void> => {
  const debts = await getDebts();

  if (!debts.some((d) => d.keepAliveEnabled)) {
    await cancelOurScheduled();
    return;
  }

  await ensureAndroidChannel();

  const plan = planKeepAliveReminders({ debts });

  // Cancel-then-schedule keeps the OS schedule an exact mirror of the plan:
  // using a card re-anchors every pending nudge, nothing accumulates.
  await cancelOurScheduled();

  for (const reminder of plan) {
    await Notifications.scheduleNotificationAsync({
      identifier: reminder.identifier,
      content: {
        title: reminder.title,
        body: reminder.body,
        data: { type: CARD_KEEP_ALIVE_DATA_TYPE },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminder.fireDate,
        channelId: CARD_KEEP_ALIVE_CHANNEL_ID,
      },
    });
  }
};

let inFlight: Promise<void> | null = null;

/**
 * Recomputes and schedules every keep-alive nudge from current data.
 * Serialized: concurrent callers share the in-flight run. Never throws -
 * scheduling is best-effort and must not break the caller (app boot,
 * background transition, debt save, connections sync).
 */
export const rescheduleCardKeepAliveReminders = (): Promise<void> => {
  if (inFlight) return inFlight;
  inFlight = doReschedule()
    .catch((error) => {
      if (__DEV__) {
        console.error("Card keep-alive reschedule failed:", error);
      }
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
};

/**
 * Cancels every scheduled keep-alive nudge. Used by Reset All Data (the
 * debts are wiped, so the next reschedule would cancel anyway - this just
 * does it immediately instead of leaving stale nudges pending).
 */
export const cancelAllCardKeepAliveReminders = async (): Promise<void> => {
  try {
    await cancelOurScheduled();
  } catch (error) {
    if (__DEV__) console.error("Card keep-alive cancel failed:", error);
  }
};
