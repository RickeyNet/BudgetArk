/**
 * BudgetArk - Density Provider
 * File: src/theme/DensityProvider.tsx
 *
 * Mirrors ThemeProvider for layout density (Compact / Comfortable / Spacious).
 * Screens read tokens via `useDensity()` and apply them where they currently
 * use hardcoded spacing values.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as EncryptedStorage from "../storage/encryptedStorage";
import {
  DEFAULT_DENSITY_ID,
  DENSITY_BY_ID,
  DENSITY_PRESETS,
  DensityPreset,
  DensityTokens,
} from "./density";

const DENSITY_KEY = "@budgetark_density_id" as const;

type DensityContextValue = Readonly<{
  densityId: DensityPreset["id"];
  tokens: DensityTokens;
  presets: readonly DensityPreset[];
  setDensityId: (id: DensityPreset["id"]) => Promise<void>;
}>;

const DensityContext = createContext<DensityContextValue | null>(null);

export const DensityProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [densityId, setDensityIdState] = useState<DensityPreset["id"]>(DEFAULT_DENSITY_ID);
  // Gate children on the same `ready` pattern as ThemeProvider so a user with
  // a non-default density doesn't see a brief Comfortable layout snap before
  // their saved Compact/Spacious tokens load.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const stored = await EncryptedStorage.getItem(DENSITY_KEY);
        if (cancelled) return;
        if (stored && DENSITY_BY_ID[stored]) setDensityIdState(stored);
      } finally {
        if (!cancelled) setReady(true);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const setDensityId = useCallback(async (id: DensityPreset["id"]) => {
    if (!DENSITY_BY_ID[id]) return;
    setDensityIdState(id);
    await EncryptedStorage.setItem(DENSITY_KEY, id);
  }, []);

  const tokens = DENSITY_BY_ID[densityId]?.tokens ?? DENSITY_BY_ID[DEFAULT_DENSITY_ID].tokens;

  const value = useMemo<DensityContextValue>(
    () => ({
      densityId,
      tokens,
      presets: DENSITY_PRESETS,
      setDensityId,
    }),
    [densityId, tokens, setDensityId]
  );

  return (
    <DensityContext.Provider value={value}>
      {ready ? children : null}
    </DensityContext.Provider>
  );
};

export const useDensity = (): DensityContextValue => {
  const ctx = useContext(DensityContext);
  if (!ctx) throw new Error("useDensity() must be used inside <DensityProvider>.");
  return ctx;
};
