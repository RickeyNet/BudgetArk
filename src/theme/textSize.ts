/**
 * BudgetArk - Text Size Presets
 * File: src/theme/textSize.ts
 *
 * Accessibility text-size axis. This is intentionally separate from Density:
 * Density scales the whole layout (padding, radius, fonts) for "more vs less
 * content per screen", whereas Text Size scales ONLY type so low-vision users
 * can enlarge text without blowing up spacing.
 *
 * The multiplier is applied on top of the active Density's `fontScale`
 * (see DensityProvider), so the two compose: e.g. Compact (0.92) + Large
 * (1.15) => effective 1.058.
 */

export type TextSizePreset = Readonly<{
  id: string;
  name: string;
  description: string;
  /** Multiplier applied to the active density's fontScale. */
  multiplier: number;
}>;

const SMALL: TextSizePreset = {
  id: "small",
  name: "Small",
  description: "Slightly smaller text - fits a bit more on screen.",
  multiplier: 0.9,
};

const DEFAULT: TextSizePreset = {
  id: "default",
  name: "Default",
  description: "Standard text size.",
  multiplier: 1.0,
};

const LARGE: TextSizePreset = {
  id: "large",
  name: "Large",
  description: "Bigger text for easier reading.",
  multiplier: 1.15,
};

const XLARGE: TextSizePreset = {
  id: "xlarge",
  name: "Extra Large",
  description: "Largest text - maximum readability.",
  multiplier: 1.3,
};

export const TEXT_SIZE_PRESETS: readonly TextSizePreset[] = [
  SMALL,
  DEFAULT,
  LARGE,
  XLARGE,
] as const;

export const DEFAULT_TEXT_SIZE_ID: TextSizePreset["id"] = "default";

export const TEXT_SIZE_BY_ID: Readonly<Record<string, TextSizePreset>> =
  TEXT_SIZE_PRESETS.reduce((acc, preset) => {
    acc[preset.id] = preset;
    return acc;
  }, {} as Record<string, TextSizePreset>);
