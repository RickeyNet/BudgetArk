import { useEffect } from "react";
import { AppState, InteractionManager } from "react-native";
import * as Notifications from "expo-notifications";
import type { NavigationContainerRefWithCurrent } from "@react-navigation/native";
import type { RootTabParamList } from "../types";
import {
  TRACKING_REMINDER_DATA_TYPE,
  rescheduleTrackingReminders,
} from "../notifications/trackingReminders";

interface TrackingReminderHostProps {
  navigationRef: NavigationContainerRefWithCurrent<RootTabParamList>;
}

/**
 * Guards against re-handling the same cold-start tap across remounts within
 * one app launch - `getLastNotificationResponseAsync` keeps returning the
 * response that launched the app.
 */
let coldStartResponseHandled = false;

/**
 * App-root host for expense-tracking check-in notifications. Renders nothing.
 *
 * Keeps the OS schedule current by rescheduling:
 * - on launch (deferred past first paint - it decrypts budget entries, same
 *   reasoning as DebtDueReminderHost), and
 * - on every move to the background, so an entry logged this session pushes
 *   the next nudge out a full cadence immediately.
 *
 * Also routes notification taps to the Budget tab, where expenses get logged.
 */
const TrackingReminderHost: React.FC<TrackingReminderHostProps> = ({
  navigationRef,
}) => {
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      void rescheduleTrackingReminders();
    });
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "background") void rescheduleTrackingReminders();
    });
    return () => {
      task.cancel();
      sub.remove();
    };
  }, []);

  useEffect(() => {
    const isOurs = (response: Notifications.NotificationResponse): boolean =>
      response.notification.request.content.data?.type ===
      TRACKING_REMINDER_DATA_TYPE;

    const navigateToBudget = (attempt = 0) => {
      if (navigationRef.isReady()) {
        try {
          navigationRef.navigate("Budget");
        } catch (e) {
          if (__DEV__) console.warn("Check-in navigation failed:", e);
        }
        return;
      }
      // Cold start: navigation isn't ready the moment the response is read.
      if (attempt < 5) {
        setTimeout(() => navigateToBudget(attempt + 1), 400);
      }
    };

    // Warm taps - app already running.
    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        if (isOurs(response)) navigateToBudget();
      }
    );

    // Cold-start tap - the response that launched the app fired before this
    // listener existed.
    if (!coldStartResponseHandled) {
      coldStartResponseHandled = true;
      void Notifications.getLastNotificationResponseAsync()
        .then((response) => {
          if (response && isOurs(response)) navigateToBudget();
        })
        .catch(() => {});
    }

    return () => sub.remove();
  }, [navigationRef]);

  return null;
};

export default TrackingReminderHost;
