import React, { useCallback, useEffect, useState } from "react";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import { useCoachmarks } from "./CoachmarksProvider";
import Spotlight from "./Spotlight";
import { COACHMARKS, type CoachmarkTabId } from "../data/coachmarkContent";

/**
 * Hook each tab calls once. Drives a step sequence: while the tab is focused
 * and conditions are met (not seen, not skipped), walks the user through each
 * step in COACHMARKS[tabId].steps via the spotlight overlay. Marks the tab as
 * seen after the last step.
 *
 * If a guided tour is active (Profile's "Replay walkthrough" or the How-To
 * "Replay tour" button kicks one off), completing the last step pops the next
 * tab off the queue and navigates there — so the user gets a chained tour
 * across every tab without having to switch them by hand.
 *
 * Returns a React node the screen renders near its root.
 */
export const useTabCoachmark = (tabId: CoachmarkTabId): React.ReactNode => {
  const { ready, hasSeen, skippedAll, markSeen, skipAll, advanceGuidedTour } = useCoachmarks();
  const isFocused = useIsFocused();
  // `useNavigation<any>` because tab navigators don't share a typed param
  // list with the coachmark module — coercing here is cleaner than threading
  // RootTabParamList into onboarding/.
  const navigation = useNavigation<any>();
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const tour = COACHMARKS[tabId];
  const totalSteps = tour.steps.length;

  // Start the tour on focus (initial mount or focus transition) and also when
  // a Replay clears `seenTabs` while the tab is currently focused. Gating on
  // isFocused is critical: without it, every mounted tab's <Spotlight> Modal
  // would try to present at once after Replay, causing the modal-stacking bug
  // we saw in the screenshots.
  useEffect(() => {
    if (!isFocused) return;
    if (!ready || skippedAll || hasSeen(tabId) || totalSteps === 0) return;
    setStepIndex(0);
    setActive(true);
  }, [isFocused, ready, skippedAll, hasSeen, tabId, totalSteps]);

  // If the tab loses focus while a tour is showing, hide the modal so it
  // doesn't bleed onto the next tab. The start effect above will re-fire
  // cleanly when the user comes back, gated on hasSeen.
  useEffect(() => {
    if (!isFocused && active) setActive(false);
  }, [isFocused, active]);

  const handleNext = useCallback(() => {
    if (stepIndex >= totalSteps - 1) {
      setActive(false);
      void markSeen(tabId);
      const nextTab = advanceGuidedTour();
      if (nextTab) {
        // Brief pause so the spotlight Modal close animation doesn't fight
        // the tab switch — RN handles concurrent dismissals poorly.
        setTimeout(() => {
          try {
            navigation.navigate(nextTab as never);
          } catch (err) {
            if (__DEV__) console.warn("Coachmark guided nav failed:", err);
          }
        }, 220);
      }
      return;
    }
    setStepIndex((i) => i + 1);
  }, [stepIndex, totalSteps, markSeen, tabId, advanceGuidedTour, navigation]);

  const handleSkipAll = useCallback(() => {
    setActive(false);
    void skipAll();
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
