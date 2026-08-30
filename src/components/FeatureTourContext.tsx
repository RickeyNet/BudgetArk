/**
 * BudgetArk - Feature Tour Context
 * File: src/components/FeatureTourContext.tsx
 *
 * Lets screens deep inside the navigator re-open the feature-debut
 * carousel (FeatureSpotlightModal) on demand. AppContent owns the
 * spotlight queue that drives the modal; this context exposes a single
 * replayFeatureTour() so the Profile screen's "Feature tour" row can
 * refill that queue without prop-drilling - the same shape as
 * OnboardingGateContext gives "Redo onboarding".
 */

import { createContext, useContext } from "react";

type FeatureTourValue = Readonly<{
  /**
   * Re-opens the debut carousel with every spotlight that works on this
   * install, seen or not. No-op when the current runtime enables none.
   */
  replayFeatureTour: () => void;
}>;

const FeatureTourContext = createContext<FeatureTourValue | null>(null);

export const FeatureTourProvider = FeatureTourContext.Provider;

export const useFeatureTour = (): FeatureTourValue => {
  const ctx = useContext(FeatureTourContext);
  if (!ctx) {
    throw new Error(
      "useFeatureTour() must be used inside <FeatureTourProvider>."
    );
  }
  return ctx;
};
