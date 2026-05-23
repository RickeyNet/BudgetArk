import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as EncryptedStorage from "../storage/encryptedStorage";

const BACKGROUND_EFFECTS_KEY = "@budgetark_background_effects_enabled" as const;

type BackgroundEffectsContextValue = Readonly<{
  backgroundEffectsEnabled: boolean;
  setBackgroundEffectsEnabled: (enabled: boolean) => Promise<void>;
}>;

const BackgroundEffectsContext = createContext<BackgroundEffectsContextValue | null>(null);

export const BackgroundEffectsProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [backgroundEffectsEnabled, setBackgroundEffectsEnabledState] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const stored = await EncryptedStorage.getItem(BACKGROUND_EFFECTS_KEY);
        if (cancelled) return;
        if (stored === "0") setBackgroundEffectsEnabledState(false);
        else if (stored === "1") setBackgroundEffectsEnabledState(true);
      } finally {
        if (!cancelled) setReady(true);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const setBackgroundEffectsEnabled = useCallback(async (enabled: boolean) => {
    setBackgroundEffectsEnabledState(enabled);
    await EncryptedStorage.setItem(BACKGROUND_EFFECTS_KEY, enabled ? "1" : "0");
  }, []);

  const value = useMemo<BackgroundEffectsContextValue>(
    () => ({ backgroundEffectsEnabled, setBackgroundEffectsEnabled }),
    [backgroundEffectsEnabled, setBackgroundEffectsEnabled]
  );

  return (
    <BackgroundEffectsContext.Provider value={value}>
      {ready ? children : null}
    </BackgroundEffectsContext.Provider>
  );
};

export const useBackgroundEffects = (): BackgroundEffectsContextValue => {
  const ctx = useContext(BackgroundEffectsContext);
  if (!ctx) {
    throw new Error("useBackgroundEffects() must be used inside <BackgroundEffectsProvider>.");
  }
  return ctx;
};
