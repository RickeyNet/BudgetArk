import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  COACHMARK_VERSION,
  getCoachmarkState,
  resetCoachmarks,
  saveCoachmarkState,
} from "../storage/coachmarksStorage";
import type { CoachmarkTabId } from "../data/coachmarkContent";

type CoachmarksContextValue = Readonly<{
  ready: boolean;
  seenTabs: ReadonlySet<string>;
  skippedAll: boolean;
  hasSeen: (tabId: string) => boolean;
  markSeen: (tabId: string) => Promise<void>;
  skipAll: () => Promise<void>;
  replay: () => Promise<void>;
  /**
   * Set the queue of tabs to auto-navigate to after each tour completes.
   * Pass the tabs the user should walk through *next*, in order, excluding
   * the currently-focused tab (whose tour will fire on its own).
   */
  startGuidedTour: (queue: readonly CoachmarkTabId[]) => void;
  /**
   * Pop the next tab off the guided queue. Returns null when empty. Called
   * by useTabCoachmark after the last step's "Got it" so it can navigate the
   * user to the next tab.
   */
  advanceGuidedTour: () => CoachmarkTabId | null;
}>;

const CoachmarksContext = createContext<CoachmarksContextValue | null>(null);

export const CoachmarksProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [ready, setReady] = useState(false);
  const [seenTabs, setSeenTabs] = useState<ReadonlySet<string>>(new Set());
  const [skippedAll, setSkippedAll] = useState(false);
  // Held in a ref because advanceGuidedTour needs to read+mutate synchronously
  // (it returns the popped value to the caller in the same tick).
  const guidedQueueRef = useRef<CoachmarkTabId[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const state = await getCoachmarkState();
      if (cancelled) return;
      setSeenTabs(new Set(state.seenTabs));
      setSkippedAll(state.skippedAll);
      setReady(true);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(async (next: { seenTabs: ReadonlySet<string>; skippedAll: boolean }) => {
    await saveCoachmarkState({
      seenTabs: Array.from(next.seenTabs),
      skippedAll: next.skippedAll,
      version: COACHMARK_VERSION,
    });
  }, []);

  const markSeen = useCallback(
    async (tabId: string) => {
      // setState updaters must be pure — calling the async `persist` from
      // inside the updater meant a re-render could fire it twice and we
      // couldn't await it. Read seenTabs directly so persist runs once,
      // sequentially, with the value we just committed.
      if (seenTabs.has(tabId)) return;
      const next = new Set(seenTabs);
      next.add(tabId);
      setSeenTabs(next);
      await persist({ seenTabs: next, skippedAll });
    },
    [persist, seenTabs, skippedAll]
  );

  const skipAll = useCallback(async () => {
    setSkippedAll(true);
    guidedQueueRef.current = [];
    await persist({ seenTabs, skippedAll: true });
  }, [persist, seenTabs]);

  const replay = useCallback(async () => {
    await resetCoachmarks();
    setSeenTabs(new Set());
    setSkippedAll(false);
    guidedQueueRef.current = [];
  }, []);

  const hasSeen = useCallback((tabId: string) => seenTabs.has(tabId), [seenTabs]);

  const startGuidedTour = useCallback((queue: readonly CoachmarkTabId[]) => {
    guidedQueueRef.current = [...queue];
  }, []);

  const advanceGuidedTour = useCallback((): CoachmarkTabId | null => {
    const queue = guidedQueueRef.current;
    if (queue.length === 0) return null;
    const head = queue[0];
    guidedQueueRef.current = queue.slice(1);
    return head;
  }, []);

  const value = useMemo<CoachmarksContextValue>(
    () => ({
      ready,
      seenTabs,
      skippedAll,
      hasSeen,
      markSeen,
      skipAll,
      replay,
      startGuidedTour,
      advanceGuidedTour,
    }),
    [ready, seenTabs, skippedAll, hasSeen, markSeen, skipAll, replay, startGuidedTour, advanceGuidedTour]
  );

  return <CoachmarksContext.Provider value={value}>{children}</CoachmarksContext.Provider>;
};

export const useCoachmarks = (): CoachmarksContextValue => {
  const ctx = useContext(CoachmarksContext);
  if (!ctx) throw new Error("useCoachmarks() must be used inside <CoachmarksProvider>.");
  return ctx;
};
