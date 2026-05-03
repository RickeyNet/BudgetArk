/**
 * BudgetArk — Density Presets
 * File: src/theme/density.ts
 *
 * Defines layout density presets (Compact / Comfortable / Spacious).
 * Tokens scale spacing, card padding, corner radius, and font sizes.
 *
 * Migration is incremental — screens can swap hardcoded `padding: 16` for
 * `tokens.pad` over time without breaking existing layouts.
 */

export type DensityTokens = Readonly<{
  pad: number;        // base padding inside cards/sections
  padSm: number;      // tight padding (e.g. inside chips, small rows)
  padLg: number;      // generous padding (e.g. screen edges, hero cards)
  gap: number;        // default gap between sibling elements
  gapSm: number;      // small gap (e.g. between label and value)
  gapLg: number;      // large gap (e.g. between sections)
  radius: number;     // standard card / button corner radius
  radiusSm: number;   // small radius (chips, inline pills)
  fontScale: number;  // multiplier applied to font sizes
  rowHeight: number;  // standard tap-target row height
}>;

export type DensityPreset = Readonly<{
  id: string;
  name: string;
  description: string;
  tokens: DensityTokens;
}>;

const COMPACT: DensityPreset = {
  id: "compact",
  name: "Compact",
  description: "Tighter spacing, more content per screen.",
  tokens: {
    pad: 12,
    padSm: 8,
    padLg: 16,
    gap: 10,
    gapSm: 4,
    gapLg: 16,
    radius: 12,
    radiusSm: 6,
    fontScale: 0.92,
    rowHeight: 44,
  },
};

const COMFORTABLE: DensityPreset = {
  id: "comfortable",
  name: "Comfortable",
  description: "Balanced spacing — the default look.",
  tokens: {
    pad: 16,
    padSm: 12,
    padLg: 20,
    gap: 16,
    gapSm: 6,
    gapLg: 24,
    radius: 16,
    radiusSm: 8,
    fontScale: 1.0,
    rowHeight: 52,
  },
};

const SPACIOUS: DensityPreset = {
  id: "spacious",
  name: "Spacious",
  description: "Larger touch targets and roomier text.",
  tokens: {
    pad: 20,
    padSm: 14,
    padLg: 28,
    gap: 22,
    gapSm: 8,
    gapLg: 32,
    radius: 18,
    radiusSm: 10,
    fontScale: 1.08,
    rowHeight: 60,
  },
};

export const DENSITY_PRESETS: readonly DensityPreset[] = [COMPACT, COMFORTABLE, SPACIOUS] as const;

export const DEFAULT_DENSITY_ID: DensityPreset["id"] = "comfortable";

export const DENSITY_BY_ID: Readonly<Record<string, DensityPreset>> = DENSITY_PRESETS.reduce(
  (acc, preset) => {
    acc[preset.id] = preset;
    return acc;
  },
  {} as Record<string, DensityPreset>
);
