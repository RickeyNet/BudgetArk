/**
 * BudgetArk - app-root host for card keep-alive notifications.
 *
 * Renders nothing. Keeps the OS schedule of "use your card soon" nudges
 * current and routes notification taps to the DebtTracker tab, where the
 * keep-alive banner names the specific card (the notification itself is
 * deliberately generic - security rule 11). Sibling of TrackingReminderHost
 * with the same lifecycle: reschedule on launch (deferred past first paint -
 * it decrypts debts) and on every move to the background.
 */

import { useEffect } from "react";
import { AppState, InteractionManager } from "react-native";
import * as Notifications from "expo-notifications";
import type { NavigationContainerRefWithCurrent } from "@react-navigation/native";
import type { RootTabParamList } from "../types";
import {
  CARD_KEEP_ALIVE_DATA_TYPE,
  rescheduleCardKeepAliveReminders,
} from "../notifications/cardKeepAliveReminders";

interface CardKeepAliveReminderHostProps {
  navigationRef: NavigationContainerRefWithCurrent<RootTabParamList>;
}

/**
 * Guards against re-handling the same cold-start tap across remounts within
 * one app launch - `getLastNotificationResponseAsync` keeps returning the
 * response that launched the app. Module-scoped per host on purpose: each
 * host filters by its own data type, so both hosts reading the launch
 * response is harmless.
 */
let coldStartResponseHandled = false;

const CardKeepAliveReminderHost: React.FC<CardKeepAliveReminderHostProps> = ({
  navigationRef,
}) => {
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      void rescheduleCardKeepAliveReminders();
    });
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "background") void rescheduleCardKeepAliveReminders();
    });
    return () => {
      task.cancel();
      sub.remove();
    };
  }, []);

  useEffect(() => {
    const isOurs = (response: Notifications.NotificationResponse): boolean =>
      response.notification.request.content.data?.type ===
      CARD_KEEP_ALIVE_DATA_TYPE;

    const navigateToDebts = (attempt = 0) => {
      if (navigationRef.isReady()) {
        try {
          navigationRef.navigate("DebtTracker", { openKeepAlive: true });
        } catch (e) {
          if (__DEV__) console.warn("Keep-alive navigation failed:", e);
        }
        return;
      }
      // Cold start: navigation isn't ready the moment the response is read.
      if (attempt < 5) {
        setTimeout(() => navigateToDebts(attempt + 1), 400);
      }
    };

    // Warm taps - app already running.
    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        if (isOurs(response)) navigateToDebts();
      }
    );

    // Cold-start tap - the response that launched the app fired before this
    // listener existed.
    if (!coldStartResponseHandled) {
      coldStartResponseHandled = true;
      void Notifications.getLastNotificationResponseAsync()
        .then((response) => {
          if (response && isOurs(response)) navigateToDebts();
        })
        .catch(() => {});
    }

    return () => sub.remove();
  }, [navigationRef]);

  return null;
};

export default CardKeepAliveReminderHost;
