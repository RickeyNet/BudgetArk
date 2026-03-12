/**
 * BudgetArk — Theme Provider
 * File: src/theme/ThemeProvider.tsx
 *
 * Provides runtime theme selection + persistence.
 * This keeps theme reads fast and avoids prop drilling.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as EncryptedStorage from "../storage/encryptedStorage";
import { DEFAULT_THEME_ID, THEME_BY_ID, THEME_PRESETS, ThemeColors, ThemePreset } from "./themes";

const THEME_KEY = "@budgetark_theme_id" as const;

type ThemeContextValue = Readonly<{
  themeId: ThemePreset["id"];
  colors: ThemeColors;
  presets: readonly ThemePreset[];
  setThemeId: (id: ThemePreset["id"]) => Promise<void>;
}>;

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * ThemeProvider wraps the app so every screen/component can read colors.
 */
export const ThemeProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [themeId, setThemeIdState] = useState<ThemePreset["id"]>(DEFAULT_THEME_ID);

  /** Load saved theme on app start */
  useEffect(() => {
    const load = async () => {
      const stored = await EncryptedStorage.getItem(THEME_KEY);
      if (stored && THEME_BY_ID[stored]) setThemeIdState(stored);
    };
    load();
  }, []);

  /** Persist theme selection */
  const setThemeId = useCallback(async (id: ThemePreset["id"]) => {
    if (!THEME_BY_ID[id]) return; // guard
    setThemeIdState(id);
    await EncryptedStorage.setItem(THEME_KEY, id);
  }, []);

  const colors = THEME_BY_ID[themeId]?.colors ?? THEME_BY_ID[DEFAULT_THEME_ID].colors;

  const value = useMemo<ThemeContextValue>(
    () => ({
      themeId,
      colors,
      presets: THEME_PRESETS,
      setThemeId,
    }),
    [themeId, colors, setThemeId]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

/**
 * Hook to access theme anywhere in the app.
 * Throws early if used outside ThemeProvider (helps catch wiring issues fast).
 */
export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme() must be used inside <ThemeProvider>.");
  return ctx;
};
