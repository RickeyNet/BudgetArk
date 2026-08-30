/**
 * BudgetArk - Theme Provider
 * File: src/theme/ThemeProvider.tsx
 *
 * Provides runtime theme selection + persistence.
 * This keeps theme reads fast and avoids prop drilling.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as EncryptedStorage from "../storage/encryptedStorage";
import { useBackgroundEffects } from "./BackgroundEffectsProvider";
import { useSurfaceStyle } from "./SurfaceStyleProvider";
import { DEFAULT_SURFACE_STYLE_ID, type SurfaceStylePreset } from "./surfaceStyles";
import { DEFAULT_THEME_ID, THEME_BY_ID, THEME_PRESETS, ThemeColors, ThemePreset } from "./themes";
import { THEME_KEY, getAppearanceBoot } from "./appearanceBoot";

type ThemeContextValue = Readonly<{
  themeId: ThemePreset["id"];
  colors: ThemeColors;
  presets: readonly ThemePreset[];
  surfaceStyleId: SurfaceStylePreset["id"];
  isGlassSurface: boolean;
  backgroundEffectsEnabled: boolean;
  showAmbientBackground: boolean;
  setThemeId: (id: ThemePreset["id"]) => Promise<void>;
}>;

const ThemeContext = createContext<ThemeContextValue | null>(null);

const parseColorToRgb = (
  color: string
): { r: number; g: number; b: number } | null => {
  const hex = color.trim();
  const hexMatch = hex.match(/^#([\da-f]{3}|[\da-f]{6})$/i);
  if (hexMatch) {
    const raw = hexMatch[1];
    const normalized =
      raw.length === 3
        ? raw
            .split("")
            .map((part) => `${part}${part}`)
            .join("")
        : raw;
    return {
      r: parseInt(normalized.slice(0, 2), 16),
      g: parseInt(normalized.slice(2, 4), 16),
      b: parseInt(normalized.slice(4, 6), 16),
    };
  }

  const rgbMatch = color
    .trim()
    .match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*[\d.]+)?\s*\)$/i);
  if (!rgbMatch) return null;

  return {
    r: Number(rgbMatch[1]),
    g: Number(rgbMatch[2]),
    b: Number(rgbMatch[3]),
  };
};

const withAlpha = (color: string, alpha: number): string => {
  const rgb = parseColorToRgb(color);
  if (!rgb) return color;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
};

const isLightColor = (color: string): boolean => {
  const rgb = parseColorToRgb(color);
  if (!rgb) return false;
  const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
  return luminance > 0.72;
};

const AMBIENT_BACKGROUND_THEMES = new Set<ThemePreset["id"]>([
  "deep_space",
  "deepforest",
  "deep_sea",
]);

const applySurfaceStyle = (
  colors: ThemeColors,
  surfaceStyleId: SurfaceStylePreset["id"]
): ThemeColors => {
  if (surfaceStyleId !== "glass") return colors;

  const lightTheme = isLightColor(colors.bg);
  return {
    ...colors,
    card: withAlpha(colors.card, lightTheme ? 0.82 : 0.72),
    cardBorder: withAlpha(colors.accent, lightTheme ? 0.18 : 0.24),
  };
};

/**
 * ThemeProvider wraps the app so every screen/component can read colors.
 *
 * Children render `null` until the persisted theme has been read from
 * storage. Without this gate, the first frame paints with `DEFAULT_THEME_ID`,
 * and a user with a non-default saved theme sees a brief flash of the
 * default before their theme swaps in.
 */
export const ThemeProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { backgroundEffectsEnabled } = useBackgroundEffects();
  const { surfaceStyleId: storedSurfaceStyleId } = useSurfaceStyle();
  const [themeId, setThemeIdState] = useState<ThemePreset["id"]>(DEFAULT_THEME_ID);
  const [ready, setReady] = useState(false);

  /** Load saved theme on app start */
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        // Shared boot read (see appearanceBoot.ts) - avoids a serialized
        // per-provider storage round-trip on the startup path.
        const stored = (await getAppearanceBoot()).theme;
        if (cancelled) return;
        if (stored && THEME_BY_ID[stored]) setThemeIdState(stored);
      } finally {
        if (!cancelled) setReady(true);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Persist theme selection */
  const setThemeId = useCallback(async (id: ThemePreset["id"]) => {
    if (!THEME_BY_ID[id]) return; // guard
    setThemeIdState(id);
    await EncryptedStorage.setItem(THEME_KEY, id);
  }, []);

  // Deep Space and Deep Sea default to Glass so their ambient scenes show
  // through the cards; an explicit user choice always wins.
  const resolvedSurfaceStyleId: SurfaceStylePreset["id"] =
    storedSurfaceStyleId ??
    (themeId === "deep_space" || themeId === "deep_sea"
      ? "glass"
      : DEFAULT_SURFACE_STYLE_ID);
  const showAmbientBackground =
    backgroundEffectsEnabled && AMBIENT_BACKGROUND_THEMES.has(themeId);
  const baseColors = THEME_BY_ID[themeId]?.colors ?? THEME_BY_ID[DEFAULT_THEME_ID].colors;
  const colors = useMemo(
    () => applySurfaceStyle(baseColors, resolvedSurfaceStyleId),
    [baseColors, resolvedSurfaceStyleId]
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      themeId,
      colors,
      presets: THEME_PRESETS,
      surfaceStyleId: resolvedSurfaceStyleId,
      isGlassSurface: resolvedSurfaceStyleId === "glass",
      backgroundEffectsEnabled,
      showAmbientBackground,
      setThemeId,
    }),
    [themeId, colors, resolvedSurfaceStyleId, backgroundEffectsEnabled, showAmbientBackground, setThemeId]
  );

  return (
    <ThemeContext.Provider value={value}>
      {ready ? children : null}
    </ThemeContext.Provider>
  );
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
