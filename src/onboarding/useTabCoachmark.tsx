import React, { useCallback, useEffect, useRef, useState } from "react";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import { useCoachmarks } from "./CoachmarksProvider";
import Spotlight from "./Spotlight";
import { COACHMARKS, type CoachmarkTabId } from "../data/coachmarkContent";
import { useValueChanged } from "../hooks/useValueChanged";

/**
 * Hook each tab calls once. Drives a step sequence: while the tab is focused
 * and conditions are met (not seen, not skipped), walks the user through each
 * step in COACHMARKS[tabId].steps via the spotlight overlay. Marks the tab as
 * seen after the last step.
 *
 * If a guided tour is active (Profile's "Replay walkthrough" or the How-To
 * "Replay tour" button kicks one off), completing the last step pops the next
 * tab off the queue and navigates there - so the user gets a chained tour
 * across every tab without having to switch them by hand.
 *
 * Returns a React node the screen renders near its root.
 */
export const useTabCoachmark = (tabId: CoachmarkTabId): React.ReactNode => {
  const { ready, hasSeen, skippedAll, markSeen, skipAll, advanceGuidedTour } = useCoachmarks();
  const isFocused = useIsFocused();
  // `useNavigation<any>` because tab navigators don't share a typed param
  // list with the coachmark module - coercing here is cleaner than threading
  // RootTabParamList into onboarding/.
  const navigation = useNavigation<any>();
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  // Tracks the post-tour navigation timer so we can clear it if the screen
  // unmounts mid-delay (otherwise we'd call `navigation.navigate` against a
  // stale screen ref, occasionally throwing in dev).
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (navTimerRef.current) {
        clearTimeout(navTimerRef.current);
        navTimerRef.current = null;
      }
    };
  }, []);

  const tour = COACHMARKS[tabId];
  const totalSteps = tour.steps.length;

  // Start the tour on focus (initial mount or focus transition) and also when
  // a Replay clears `seenTabs` while the tab is currently focused. Gating on
  // isFocused is critical: without it, every mounted tab's <Spotlight> Modal
  // would try to present at once after Replay, causing the modal-stacking bug
  // we saw in the screenshots.
  //
  // Render-time adjustment (see useValueChanged) rather than an effect. It
  // only fires when eligibility actually flips, so an unrelated context
  // re-render mid-tour can't reset the tour to step 0 the way the old
  // effect's dep list could. fireOnMount covers lazily-mounted tabs that are
  // already focused and eligible on their first render.
  const shouldStart =
    isFocused && ready && !skippedAll && !hasSeen(tabId) && totalSteps > 0;
  if (useValueChanged(shouldStart, true) && shouldStart) {
    setStepIndex(0);
    setActive(true);
  }

  // If the tab loses focus while a tour is showing, hide the modal so it
  // doesn't bleed onto the next tab. The start guard above re-fires cleanly
  // when the user comes back, gated on hasSeen. Conditional on `active`, so
  // this render-time setState settles in one extra pass.
  if (!isFocused && active) {
    setActive(false);
  }

  const handleNext = useCallback(() => {
    if (stepIndex >= totalSteps - 1) {
      setActive(false);
      void markSeen(tabId);
      const nextTab = advanceGuidedTour();
      if (nextTab) {
        // Brief pause so the spotlight Modal close animation doesn't fight
        // the tab switch - RN handles concurrent dismissals poorly.
        if (navTimerRef.current) clearTimeout(navTimerRef.current);
        navTimerRef.current = setTimeout(() => {
          navTimerRef.current = null;
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
