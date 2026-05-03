import React, { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useCoachmarks } from "./CoachmarksProvider";
import Coachmark from "./Coachmark";
import { COACHMARKS, type CoachmarkTabId } from "../data/coachmarkContent";

/**
 * Hook each tab calls once. Shows the tab's coachmark on first focus
 * (when the user lands on the tab and hasn't seen / skipped before).
 *
 * Returns a React node the screen can render — typically near the root
 * so the modal mounts inside the screen's tree.
 */
export const useTabCoachmark = (tabId: CoachmarkTabId): React.ReactNode => {
  const { ready, hasSeen, skippedAll, markSeen, skipAll } = useCoachmarks();
  const [visible, setVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!ready || skippedAll || hasSeen(tabId)) return;
      setVisible(true);
    }, [ready, skippedAll, hasSeen, tabId])
  );

  // If the user replays the tour while already on a tab, re-show.
  useEffect(() => {
    if (!ready || skippedAll || hasSeen(tabId)) return;
    setVisible(true);
  }, [ready, skippedAll, hasSeen, tabId]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    markSeen(tabId);
  }, [markSeen, tabId]);

  const handleSkipAll = useCallback(() => {
    skipAll();
  }, [skipAll]);

  return (
    <Coachmark
      visible={visible}
      content={COACHMARKS[tabId]}
      onDismiss={handleDismiss}
      onSkipAll={handleSkipAll}
    />
  );
};
