/**
 * BudgetArk - Onboarding Gate Context
 * File: src/onboarding/OnboardingGateContext.tsx
 *
 * Lets screens deep inside the navigator re-show the first-launch
 * onboarding flow. AppContent owns the isOnboardingComplete gate that
 * swaps the whole navigator for OnboardingScreen; this context exposes a
 * single restartOnboarding() so "Reset All Data" and the Profile screen's
 * "Redo onboarding" row can flip that gate without prop-drilling through
 * the navigation tree.
 */

import { createContext, useContext } from "react";

type OnboardingGateValue = Readonly<{
  /**
   * Unmounts the main app and shows the onboarding flow again. Callers are
   * responsible for persisting the flag first (resetOnboardingStatus in
   * userStorage) so a mid-onboarding app kill also relaunches into it.
   */
  restartOnboarding: () => void;
}>;

const OnboardingGateContext = createContext<OnboardingGateValue | null>(null);

export const OnboardingGateProvider = OnboardingGateContext.Provider;

export const useOnboardingGate = (): OnboardingGateValue => {
  const ctx = useContext(OnboardingGateContext);
  if (!ctx) {
    throw new Error(
      "useOnboardingGate() must be used inside <OnboardingGateProvider>."
    );
  }
  return ctx;
};
