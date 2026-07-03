import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as EncryptedStorage from "../storage/encryptedStorage";
import { BACKGROUND_EFFECTS_KEY, getAppearanceBoot } from "./appearanceBoot";

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
        // Shared boot read (see appearanceBoot.ts): one parallel round-trip
        // covers every appearance provider instead of serializing per provider.
        const stored = (await getAppearanceBoot()).backgroundEffects;
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
