import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  COACHMARK_VERSION,
  getCoachmarkState,
  resetCoachmarks,
  saveCoachmarkState,
} from "../storage/coachmarksStorage";

type CoachmarksContextValue = Readonly<{
  ready: boolean;
  seenTabs: ReadonlySet<string>;
  skippedAll: boolean;
  hasSeen: (tabId: string) => boolean;
  markSeen: (tabId: string) => Promise<void>;
  skipAll: () => Promise<void>;
  replay: () => Promise<void>;
}>;

const CoachmarksContext = createContext<CoachmarksContextValue | null>(null);

export const CoachmarksProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [ready, setReady] = useState(false);
  const [seenTabs, setSeenTabs] = useState<ReadonlySet<string>>(new Set());
  const [skippedAll, setSkippedAll] = useState(false);

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
      setSeenTabs((prev) => {
        if (prev.has(tabId)) return prev;
        const next = new Set(prev);
        next.add(tabId);
        persist({ seenTabs: next, skippedAll });
        return next;
      });
    },
    [persist, skippedAll]
  );

  const skipAll = useCallback(async () => {
    setSkippedAll(true);
    await persist({ seenTabs, skippedAll: true });
  }, [persist, seenTabs]);

  const replay = useCallback(async () => {
    await resetCoachmarks();
    setSeenTabs(new Set());
    setSkippedAll(false);
  }, []);

  const hasSeen = useCallback((tabId: string) => seenTabs.has(tabId), [seenTabs]);

  const value = useMemo<CoachmarksContextValue>(
    () => ({
      ready,
      seenTabs,
      skippedAll,
      hasSeen,
      markSeen,
      skipAll,
      replay,
    }),
    [ready, seenTabs, skippedAll, hasSeen, markSeen, skipAll, replay]
  );

  return <CoachmarksContext.Provider value={value}>{children}</CoachmarksContext.Provider>;
};

export const useCoachmarks = (): CoachmarksContextValue => {
  const ctx = useContext(CoachmarksContext);
  if (!ctx) throw new Error("useCoachmarks() must be used inside <CoachmarksProvider>.");
  return ctx;
};
