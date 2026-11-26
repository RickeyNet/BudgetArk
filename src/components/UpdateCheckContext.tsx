/**
 * BudgetArk - Update Check Context
 * File: src/components/UpdateCheckContext.tsx
 *
 * Lets the Settings "Check for Updates" row ask AppContent to check, rather
 * than running a check of its own. AppContent owns the single update checker
 * (utils/updateCheck.ts) and the single "Update Ready" dialog; when Settings
 * had its own copy of both, a manual tap during an automatic check put two
 * dialogs on screen at once. Same shape as FeatureTourContext.
 */

import { createContext, useContext } from "react";
import type { UpdateCheckOutcome } from "../utils/updateCheck";

type UpdateCheckValue = Readonly<{
  /**
   * Checks for an OTA update now (joining a check already in flight). When
   * one is ready, AppContent presents the "Update Ready" dialog itself - the
   * caller only reports the other outcomes (up to date, failed, ...).
   */
  checkForUpdatesNow: () => Promise<UpdateCheckOutcome>;
  /** True while any check - automatic or manual - is running. */
  isCheckingUpdates: boolean;
}>;

const UpdateCheckContext = createContext<UpdateCheckValue | null>(null);

export const UpdateCheckProvider = UpdateCheckContext.Provider;

export const useUpdateCheck = (): UpdateCheckValue => {
  const ctx = useContext(UpdateCheckContext);
  if (!ctx) {
    throw new Error(
      "useUpdateCheck() must be used inside <UpdateCheckProvider>."
    );
  }
  return ctx;
};
