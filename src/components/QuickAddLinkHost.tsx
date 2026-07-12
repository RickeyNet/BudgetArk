import { useEffect } from "react";
import { Linking } from "react-native";
import type { NavigationContainerRefWithCurrent } from "@react-navigation/native";
import type { RootTabParamList } from "../types";
import { parseQuickAddUri } from "../utils/quickAddLink";

interface QuickAddLinkHostProps {
  navigationRef: NavigationContainerRefWithCurrent<RootTabParamList>;
}

/**
 * Guards against re-handling the same launch URL across remounts within one
 * app launch - `Linking.getInitialURL` keeps returning the URL that started
 * the app (same pattern as TrackingReminderHost's cold-start guard).
 */
let coldStartUrlHandled = false;

/**
 * App-root host for the home-screen Quick Entry widget's deep links.
 * Renders nothing.
 *
 * Listens for `budgetark://quick-add?category=<name>` (warm taps via the
 * `url` event, cold starts via `getInitialURL`), validates fail-closed
 * through `parseQuickAddUri`, and routes to the Budget tab with the
 * `quickAdd` param - BudgetScreen opens the Add Entry modal from there.
 */
const QuickAddLinkHost: React.FC<QuickAddLinkHostProps> = ({
  navigationRef,
}) => {
  useEffect(() => {
    const handleUrl = (url: string | null, attempt = 0) => {
      const link = parseQuickAddUri(url);
      if (!link) return;

      if (navigationRef.isReady()) {
        try {
          navigationRef.navigate("Budget", { quickAdd: { category: link.category } });
        } catch (e) {
          if (__DEV__) console.warn("Quick-add navigation failed:", e);
        }
        return;
      }
      // Cold start: navigation isn't ready the moment the URL is read.
      if (attempt < 5) {
        setTimeout(() => handleUrl(url, attempt + 1), 400);
      }
    };

    // Warm taps - app already running (foreground or background).
    const sub = Linking.addEventListener("url", (event) => {
      handleUrl(event.url);
    });

    // Cold-start tap - the URL that launched the app fired before this
    // listener existed.
    if (!coldStartUrlHandled) {
      coldStartUrlHandled = true;
      void Linking.getInitialURL()
        .then((url) => handleUrl(url))
        .catch(() => {});
    }

    return () => sub.remove();
  }, [navigationRef]);

  return null;
};

export default QuickAddLinkHost;
