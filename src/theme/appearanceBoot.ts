/**
 * BudgetArk - Appearance Boot Loader
 * File: src/theme/appearanceBoot.ts
 *
 * One parallel read for every appearance preference consumed during startup.
 *
 * Why: BackgroundEffectsProvider -> SurfaceStyleProvider -> ThemeProvider ->
 * DensityProvider each gate their children on their own storage read, and a
 * nested provider only MOUNTS (and so only starts its read) after its parent
 * unblocked. That serialized the boot path into four back-to-back encrypted
 * storage round-trips before anything rendered. This module starts a single
 * Promise.all for all five keys the moment the bundle evaluates; each
 * provider awaits the shared promise and picks out its value, so the storage
 * latency is paid once instead of four times. The providers keep their own
 * validation and `ready` gating - only the fetch is shared.
 *
 * The write paths stay in the providers (same keys, imported from here so
 * the two sides can't drift).
 */

import * as EncryptedStorage from "../storage/encryptedStorage";

export const BACKGROUND_EFFECTS_KEY = "@budgetark_background_effects_enabled" as const;
export const SURFACE_STYLE_KEY = "@budgetark_surface_style_id" as const;
export const THEME_KEY = "@budgetark_theme_id" as const;
export const DENSITY_KEY = "@budgetark_density_id" as const;
export const TEXT_SIZE_KEY = "@budgetark_text_size_id" as const;

export interface AppearanceBootSnapshot {
  backgroundEffects: string | null;
  surfaceStyle: string | null;
  theme: string | null;
  density: string | null;
  textSize: string | null;
}

/** A failed read degrades to null (= the provider's default), never a throw. */
const readOrNull = (key: string): Promise<string | null> =>
  EncryptedStorage.getItem(key).catch(() => null);

// Kicked off at module-eval time - i.e. during bundle load, before any React
// mount - so the round-trip overlaps with the rest of startup.
const bootPromise: Promise<AppearanceBootSnapshot> = (async () => {
  const [backgroundEffects, surfaceStyle, theme, density, textSize] = await Promise.all([
    readOrNull(BACKGROUND_EFFECTS_KEY),
    readOrNull(SURFACE_STYLE_KEY),
    readOrNull(THEME_KEY),
    readOrNull(DENSITY_KEY),
    readOrNull(TEXT_SIZE_KEY),
  ]);
  return { backgroundEffects, surfaceStyle, theme, density, textSize };
})();

export const getAppearanceBoot = (): Promise<AppearanceBootSnapshot> => bootPromise;
