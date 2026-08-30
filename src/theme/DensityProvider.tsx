/**
 * BudgetArk - Density Provider
 * File: src/theme/DensityProvider.tsx
 *
 * Mirrors ThemeProvider for layout density (Compact / Comfortable / Spacious).
 * Screens read tokens via `useDensity()` and apply them where they currently
 * use hardcoded spacing values.
 *
 * Also owns the accessibility Text Size axis. Text Size only multiplies
 * `tokens.fontScale`, so every screen already reading `tokens.fontScale`
 * (via its local `scale()` helper) gets larger/smaller type app-wide for
 * free, while padding/radius stay put. Density and Text Size compose.
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
import {
  DEFAULT_TEXT_SIZE_ID,
  TEXT_SIZE_BY_ID,
  TEXT_SIZE_PRESETS,
  TextSizePreset,
} from "./textSize";
import { DENSITY_KEY, TEXT_SIZE_KEY, getAppearanceBoot } from "./appearanceBoot";
import { THEME_BY_ID } from "./themes";
import { useTheme } from "./ThemeProvider";

type DensityContextValue = Readonly<{
  densityId: DensityPreset["id"];
  /** Density tokens with the Text Size multiplier already folded into fontScale. */
  tokens: DensityTokens;
  presets: readonly DensityPreset[];
  setDensityId: (id: DensityPreset["id"]) => Promise<void>;
  textSizeId: TextSizePreset["id"];
  textSizePresets: readonly TextSizePreset[];
  setTextSizeId: (id: TextSizePreset["id"]) => Promise<void>;
}>;

const DensityContext = createContext<DensityContextValue | null>(null);

export const DensityProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  // DensityProvider deliberately nests inside ThemeProvider (App.tsx) so the
  // radius tokens can follow square-corner themes like Classic.
  const { themeId } = useTheme();
  const [densityId, setDensityIdState] = useState<DensityPreset["id"]>(DEFAULT_DENSITY_ID);
  const [textSizeId, setTextSizeIdState] = useState<TextSizePreset["id"]>(DEFAULT_TEXT_SIZE_ID);
  // Gate children on the same `ready` pattern as ThemeProvider so a user with
  // a non-default density/text size doesn't see a brief default layout snap
  // before their saved preset loads.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        // Shared boot read (see appearanceBoot.ts) - avoids a serialized
        // per-provider storage round-trip on the startup path.
        const { density: storedDensity, textSize: storedTextSize } =
          await getAppearanceBoot();
        if (cancelled) return;
        if (storedDensity && DENSITY_BY_ID[storedDensity]) setDensityIdState(storedDensity);
        if (storedTextSize && TEXT_SIZE_BY_ID[storedTextSize]) setTextSizeIdState(storedTextSize);
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

  const setTextSizeId = useCallback(async (id: TextSizePreset["id"]) => {
    if (!TEXT_SIZE_BY_ID[id]) return;
    setTextSizeIdState(id);
    await EncryptedStorage.setItem(TEXT_SIZE_KEY, id);
  }, []);

  const baseTokens = DENSITY_BY_ID[densityId]?.tokens ?? DENSITY_BY_ID[DEFAULT_DENSITY_ID].tokens;
  const textMultiplier =
    TEXT_SIZE_BY_ID[textSizeId]?.multiplier ?? TEXT_SIZE_BY_ID[DEFAULT_TEXT_SIZE_ID].multiplier;

  // Fold Text Size into fontScale only. Spacing tokens are deliberately
  // untouched so enlarging text doesn't also balloon padding/margins.
  // Square-corner themes (Classic) zero the radius tokens so every surface
  // reading tokens.radius/radiusSm/radiusPill renders Win98-square.
  const squareCorners = THEME_BY_ID[themeId]?.squareCorners === true;
  const tokens = useMemo<DensityTokens>(
    () => ({
      ...baseTokens,
      fontScale: baseTokens.fontScale * textMultiplier,
      ...(squareCorners ? { radius: 0, radiusSm: 0, radiusPill: 0 } : {}),
    }),
    [baseTokens, textMultiplier, squareCorners]
  );

  const value = useMemo<DensityContextValue>(
    () => ({
      densityId,
      tokens,
      presets: DENSITY_PRESETS,
      setDensityId,
      textSizeId,
      textSizePresets: TEXT_SIZE_PRESETS,
      setTextSizeId,
    }),
    [densityId, tokens, setDensityId, textSizeId, setTextSizeId]
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
