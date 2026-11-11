/**
 * BudgetArk - Theme Provider
 * File: src/theme/ThemeProvider.tsx
 *
 * Provides runtime theme selection + persistence.
 * This keeps theme reads fast and avoids prop drilling.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { StatusBar } from "react-native";
import * as EncryptedStorage from "../storage/encryptedStorage";
import { useBackgroundEffects } from "./BackgroundEffectsProvider";
import { useSurfaceStyle } from "./SurfaceStyleProvider";
import { DEFAULT_SURFACE_STYLE_ID, type SurfaceStylePreset } from "./surfaceStyles";
import { DEFAULT_THEME_ID, THEME_BY_ID, THEME_PRESETS, ThemeColors, ThemePreset } from "./themes";
import { THEME_KEY, getAppearanceBoot } from "./appearanceBoot";
import { parseColorToRgb, statusBarStyleForBackground, type StatusBarStyle } from "./colorMath";

type ThemeContextValue = Readonly<{
  themeId: ThemePreset["id"];
  colors: ThemeColors;
  /** Status bar icon style that contrasts with `colors.bg` (see colorMath.ts). */
  statusBarStyle: StatusBarStyle;
  presets: readonly ThemePreset[];
  surfaceStyleId: SurfaceStylePreset["id"];
  isGlassSurface: boolean;
  backgroundEffectsEnabled: boolean;
  showAmbientBackground: boolean;
  setThemeId: (id: ThemePreset["id"]) => Promise<void>;
}>;

const ThemeContext = createContext<ThemeContextValue | null>(null);

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

  const statusBarStyle = statusBarStyleForBackground(baseColors.bg);

  const value = useMemo<ThemeContextValue>(
    () => ({
      themeId,
      colors,
      statusBarStyle,
      presets: THEME_PRESETS,
      surfaceStyleId: resolvedSurfaceStyleId,
      isGlassSurface: resolvedSurfaceStyleId === "glass",
      backgroundEffectsEnabled,
      showAmbientBackground,
      setThemeId,
    }),
    [themeId, colors, statusBarStyle, resolvedSurfaceStyleId, backgroundEffectsEnabled, showAmbientBackground, setThemeId]
  );

  return (
    <ThemeContext.Provider value={value}>
      {/* The one app-wide status bar. Mounted here rather than per screen so
          onboarding, the PIN gate and every tab follow the theme, and a
          theme change in Profile updates it immediately. Held back until
          the saved theme is read so it never flashes the default's style. */}
      {ready ? <StatusBar barStyle={statusBarStyle} animated /> : null}
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
