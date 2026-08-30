/**
 * BudgetArk - expense-tracking check-in scheduling (expo-notifications side).
 *
 * Everything here is LOCAL notifications: planned on-device from the user's
 * own entry history, scheduled with the OS, no push token, no server.
 *
 * The planning math lives in `src/utils/trackingReminderPlanner.ts` (pure,
 * unit-tested); this module owns permissions, the Android channel, and
 * keeping the OS schedule in sync with the plan.
 * `rescheduleTrackingReminders` is idempotent - cancel ours, schedule the
 * fresh plan - and is called on app open, on background (so an entry logged
 * this session pushes the next nudge out immediately), and whenever the
 * settings change.
 */

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { getBudgetEntries } from "../storage/budgetStorage";
import { getTrackingReminderSettings } from "../storage/trackingReminderSettingsStorage";
import { planTrackingReminders } from "../utils/trackingReminderPlanner";

export const TRACKING_REMINDER_CHANNEL_ID = "tracking-check-ins";

/** Marker in notification data identifying requests owned by this feature. */
export const TRACKING_REMINDER_DATA_TYPE = "tracking-reminder";

/**
 * Foreground policy: never banner over the app. A "go log your expenses"
 * nudge while the user is literally inside the app would be absurd; the
 * reschedule-on-open wipes pending ones anyway. Anything that slips through
 * still lands in the tray/list for later.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const ensureAndroidChannel = async (): Promise<void> => {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(TRACKING_REMINDER_CHANNEL_ID, {
    name: "Expense check-ins",
    description: "Gentle reminders to keep logging your spending",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250],
  });
};

/**
 * Requests notification permission if it hasn't been decided yet.
 * Returns whether notifications can currently be displayed. When this
 * returns false and the user has permanently declined, the only path back
 * is the OS settings screen - the caller surfaces that.
 */
export const ensureTrackingReminderPermissions = async (): Promise<boolean> => {
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
          request.content.data?.type === TRACKING_REMINDER_DATA_TYPE
      )
      .map((request) =>
        Notifications.cancelScheduledNotificationAsync(request.identifier)
      )
  );
};

const doReschedule = async (): Promise<void> => {
  const settings = await getTrackingReminderSettings();

  if (!settings.enabled) {
    await cancelOurScheduled();
    return;
  }

  await ensureAndroidChannel();

  const entries = await getBudgetEntries();
  const plan = planTrackingReminders({ entries, settings });

  // Cancel-then-schedule keeps the OS schedule an exact mirror of the plan:
  // logging an entry re-anchors every pending nudge, nothing accumulates.
  await cancelOurScheduled();

  for (const reminder of plan) {
    await Notifications.scheduleNotificationAsync({
      identifier: reminder.identifier,
      content: {
        title: reminder.title,
        body: reminder.body,
        data: { type: TRACKING_REMINDER_DATA_TYPE },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminder.fireDate,
        channelId: TRACKING_REMINDER_CHANNEL_ID,
      },
    });
  }
};

let inFlight: Promise<void> | null = null;

/**
 * Recomputes and schedules every check-in from current data. Serialized:
 * concurrent callers share the in-flight run. Never throws - scheduling is
 * best-effort and must not break the caller (app boot, background
 * transition, settings save).
 */
export const rescheduleTrackingReminders = (): Promise<void> => {
  if (inFlight) return inFlight;
  inFlight = doReschedule()
    .catch((error) => {
      if (__DEV__) console.error("Tracking reminder reschedule failed:", error);
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
};

/**
 * Cancels every scheduled check-in. Used by Reset All Data (the settings
 * key is wiped, so the next reschedule would cancel anyway - this just does
 * it immediately instead of leaving stale nudges pending).
 */
export const cancelAllTrackingReminders = async (): Promise<void> => {
  try {
    await cancelOurScheduled();
  } catch (error) {
    if (__DEV__) console.error("Tracking reminder cancel failed:", error);
  }
};
