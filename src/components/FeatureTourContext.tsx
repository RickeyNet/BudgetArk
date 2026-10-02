/**
 * BudgetArk - Feature Tour Context
 * File: src/components/FeatureTourContext.tsx
 *
 * Lets screens deep inside the navigator re-open the feature-debut
 * carousel (FeatureSpotlightModal) on demand, and follow a spotlight's
 * call-to-action from the feature guide. AppContent owns the spotlight
 * queue that drives the modal and the navigationRef the CTAs need; this
 * context exposes both so the Profile screen's Help card can use them
 * without prop-drilling - the same shape as OnboardingGateContext gives
 * "Redo onboarding".
 */

import { createContext, useContext } from "react";
import type { FeatureSpotlight } from "../data/featureSpotlights";

type FeatureTourValue = Readonly<{
  /**
   * Re-opens the debut carousel with every spotlight that works on this
   * install, seen or not. No-op when the current runtime enables none.
   */
  replayFeatureTour: () => void;
  /**
   * Deep-links into a spotlight's feature exactly as the carousel's "Try
   * it" button does (tab + openSection / quickAdd params). The caller must
   * have dismissed any Modal of its own first - this navigates right away.
   */
  openSpotlightCta: (spotlight: FeatureSpotlight) => void;
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
