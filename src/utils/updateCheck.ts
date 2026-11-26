/**
 * BudgetArk - Update Check
 * File: src/utils/updateCheck.ts
 *
 * The one place an OTA update check runs. The app used to have two
 * independent checkers - the automatic one in App.tsx and the "Check for
 * Updates" row in Settings - each with its own in-flight flag and its own
 * "Update Ready" dialog. Tapping the row while the automatic check was still
 * downloading finished both, and the two dialogs stacked on screen (a
 * user-reported bug). This module is deliberately single-flight: a second
 * caller joins the check already running instead of starting another, so
 * there is exactly one result and App.tsx shows exactly one dialog.
 *
 * Pure logic with injected dependencies (no expo-updates / React Native
 * imports) so the race itself is covered by Jest.
 */

import type { ResolvedUpdateInfo } from "./updateReleaseNotes";

/** Automatic checks run at most this often; manual checks always run. */
export const AUTO_CHECK_INTERVAL_MS = 30 * 60 * 1000;

export type UpdateCheckSource = "auto" | "manual";

export type UpdateCheckOutcome =
  /** OTA updates are off in this build (dev client / updates disabled). */
  | { status: "unavailable" }
  /** An automatic check that didn't run: manual mode, or checked recently. */
  | { status: "skipped" }
  | { status: "upToDate"; checkedAt: string }
  /** Downloaded, but blocked by the downgrade guard (isUpdateSafe). */
  | { status: "rejected" }
  | { status: "ready"; update: ResolvedUpdateInfo }
  | { status: "error"; message: string };

export type UpdateCheckDeps = {
  getPreferences: () => Promise<{ manualUpdateMode: boolean; lastCheckedAt?: string }>;
  setLastCheckedAt: (iso: string) => Promise<unknown>;
  checkForUpdate: () => Promise<{ isAvailable: boolean; manifest?: unknown }>;
  fetchUpdate: () => Promise<{ manifest?: unknown }>;
  resolveUpdate: (manifest: unknown) => ResolvedUpdateInfo;
  /** Fail-closed downgrade guard for the incoming runtime version. */
  isSafe: (incomingRuntimeVersion: string | undefined) => boolean;
  now: () => number;
};

export type UpdateChecker = {
  check: (source: UpdateCheckSource) => Promise<UpdateCheckOutcome>;
  isChecking: () => boolean;
};

export const createUpdateChecker = (deps: UpdateCheckDeps): UpdateChecker => {
  let inFlight: Promise<UpdateCheckOutcome> | null = null;

  const run = async (source: UpdateCheckSource): Promise<UpdateCheckOutcome> => {
    try {
      if (source === "auto") {
        const prefs = await deps.getPreferences();
        if (prefs.manualUpdateMode) return { status: "skipped" };
        const lastChecked = prefs.lastCheckedAt ? Date.parse(prefs.lastCheckedAt) : 0;
        if (deps.now() - lastChecked < AUTO_CHECK_INTERVAL_MS) return { status: "skipped" };
      }

      const checkedAt = new Date(deps.now()).toISOString();
      const checkResult = await deps.checkForUpdate();
      await deps.setLastCheckedAt(checkedAt);
      if (!checkResult.isAvailable) return { status: "upToDate", checkedAt };

      const fetchResult = await deps.fetchUpdate();
      const update = deps.resolveUpdate(fetchResult.manifest || checkResult.manifest || null);
      if (!deps.isSafe(update.runtimeVersion)) return { status: "rejected" };

      return { status: "ready", update };
    } catch (error) {
      const message = (error instanceof Error ? error.message : String(error)).trim();
      return { status: "error", message };
    }
  };

  const check = async (source: UpdateCheckSource): Promise<UpdateCheckOutcome> => {
    // Join the check already running rather than racing it. The one case a
    // joined result isn't good enough: a manual tap that landed on an
    // automatic check which then skipped itself - the user asked for a real
    // check, so run one.
    while (inFlight) {
      const joined = await inFlight;
      if (source === "auto" || joined.status !== "skipped") return joined;
    }
    const started: Promise<UpdateCheckOutcome> = run(source).finally(() => {
      if (inFlight === started) inFlight = null;
    });
    inFlight = started;
    return started;
  };

  return { check, isChecking: () => inFlight !== null };
};
