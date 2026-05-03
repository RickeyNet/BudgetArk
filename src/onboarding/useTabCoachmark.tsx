import React, { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useCoachmarks } from "./CoachmarksProvider";
import Spotlight from "./Spotlight";
import { COACHMARKS, type CoachmarkTabId } from "../data/coachmarkContent";

/**
 * Hook each tab calls once. Drives a step sequence: when the tab gains focus
 * for the first time (or after a Replay) it walks the user through each step
 * in COACHMARKS[tabId].steps via the spotlight overlay. Marks the tab as seen
 * after the last step.
 *
 * Returns a React node the screen renders near its root.
 */
export const useTabCoachmark = (tabId: CoachmarkTabId): React.ReactNode => {
  const { ready, hasSeen, skippedAll, markSeen, skipAll } = useCoachmarks();
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const tour = COACHMARKS[tabId];
  const totalSteps = tour.steps.length;

  useFocusEffect(
    useCallback(() => {
      if (!ready || skippedAll || hasSeen(tabId) || totalSteps === 0) return;
      setStepIndex(0);
      setActive(true);
    }, [ready, skippedAll, hasSeen, tabId, totalSteps])
  );

  // Re-trigger if Replay clears seen state while user is on the tab.
  useEffect(() => {
    if (!ready || skippedAll || hasSeen(tabId) || totalSteps === 0) return;
    setStepIndex(0);
    setActive(true);
  }, [ready, skippedAll, hasSeen, tabId, totalSteps]);

  const handleNext = useCallback(() => {
    if (stepIndex >= totalSteps - 1) {
      setActive(false);
      markSeen(tabId);
      return;
    }
    setStepIndex((i) => i + 1);
  }, [stepIndex, totalSteps, markSeen, tabId]);

  const handleSkipAll = useCallback(() => {
    setActive(false);
    skipAll();
  }, [skipAll]);

  const step = totalSteps > 0 ? tour.steps[Math.min(stepIndex, totalSteps - 1)] : null;

  return (
    <Spotlight
      visible={active}
      step={step}
      stepIndex={stepIndex}
      totalSteps={totalSteps}
      onNext={handleNext}
      onSkipAll={handleSkipAll}
    />
  );
};
