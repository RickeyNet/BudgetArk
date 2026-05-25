/**
 * BudgetArk - Achievements Provider
 * File: src/achievements/AchievementsProvider.tsx
 *
 * Global context that owns the unlock state and celebration queue.
 * Any screen can call `runCheck()` from `useAchievements()` after a
 * meaningful write to trigger evaluation + immediate celebration of any
 * badges that just crossed the threshold.
 *
 * Mounts <AchievementUnlockModal> at app root so the celebration is
 * visible from any tab.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import AchievementUnlockModal from "../components/AchievementUnlockModal";
import {
  ACHIEVEMENT_DEFS_BY_ID,
  TOTAL_ACHIEVEMENTS,
  type AchievementDef,
} from "../data/achievementDefs";
import {
  evaluateAchievements,
  type EvaluationResult,
} from "../utils/achievements";

interface AchievementsContextValue {
  unlocked: Record<string, number>;
  totalCount: number;
  isReady: boolean;
  /** Run an evaluation pass; enqueues celebrations for any new unlocks. */
  runCheck: () => Promise<EvaluationResult | null>;
  /** Force-clear the celebration queue (e.g. for testing). */
  clearQueue: () => void;
}

const AchievementsContext = createContext<AchievementsContextValue | null>(null);

export const AchievementsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [unlocked, setUnlocked] = useState<Record<string, number>>({});
  const [queue, setQueue] = useState<AchievementDef[]>([]);
  const [isReady, setIsReady] = useState(false);
  // Guard against concurrent runCheck() calls so we never enqueue the
  // same badge twice if two writes finish back-to-back.
  const inFlightRef = useRef<Promise<EvaluationResult | null> | null>(null);

  const runCheck = useCallback(async (): Promise<EvaluationResult | null> => {
    if (inFlightRef.current) {
      return inFlightRef.current;
    }
    const promise = (async () => {
      try {
        const result = await evaluateAchievements();
        setUnlocked(result.unlocked);
        if (!result.isFirstEvaluation && result.newlyUnlocked.length > 0) {
          const defs = result.newlyUnlocked
            .map((id) => ACHIEVEMENT_DEFS_BY_ID[id])
            .filter((d): d is AchievementDef => d !== undefined);
          if (defs.length > 0) {
            setQueue((prev) => {
              const seen = new Set(prev.map((d) => d.id));
              const added = defs.filter((d) => !seen.has(d.id));
              return [...prev, ...added];
            });
          }
        }
        return result;
      } catch (error) {
        if (__DEV__) console.warn("Achievement check failed:", error);
        return null;
      } finally {
        setIsReady(true);
      }
    })();
    inFlightRef.current = promise;
    try {
      return await promise;
    } finally {
      inFlightRef.current = null;
    }
  }, []);

  // Initial silent eval at app boot - stamps `firstEvaluatedAt` so future
  // checks celebrate but retroactive ones don't pop dozens of modals.
  useEffect(() => {
    void runCheck();
  }, [runCheck]);

  const advance = useCallback(() => {
    setQueue((prev) => prev.slice(1));
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  const value = useMemo<AchievementsContextValue>(
    () => ({
      unlocked,
      totalCount: TOTAL_ACHIEVEMENTS,
      isReady,
      runCheck,
      clearQueue,
    }),
    [unlocked, isReady, runCheck, clearQueue]
  );

  return (
    <AchievementsContext.Provider value={value}>
      {children}
      <AchievementUnlockModal
        achievement={queue[0] ?? null}
        remainingCount={queue.length}
        onAdvance={advance}
      />
    </AchievementsContext.Provider>
  );
};

export const useAchievements = (): AchievementsContextValue => {
  const ctx = useContext(AchievementsContext);
  if (!ctx) {
    throw new Error("useAchievements must be used within AchievementsProvider");
  }
  return ctx;
};
