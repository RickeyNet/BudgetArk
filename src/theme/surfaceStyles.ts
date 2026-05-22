/**
 * BudgetArk - Surface Style Presets
 * File: src/theme/surfaceStyles.ts
 *
 * Separates visual treatment (solid vs glass) from color themes.
 */

export type SurfaceStylePreset = Readonly<{
  id: "solid" | "glass";
  name: string;
  description: string;
}>;

export const SURFACE_STYLE_PRESETS: readonly SurfaceStylePreset[] = [
  {
    id: "solid",
    name: "Solid",
    description: "Classic opaque cards and windows.",
  },
  {
    id: "glass",
    name: "Glass",
    description: "Translucent frosted cards across the app.",
  },
] as const;

export const SURFACE_STYLE_BY_ID = Object.fromEntries(
  SURFACE_STYLE_PRESETS.map((preset) => [preset.id, preset])
) as Record<SurfaceStylePreset["id"], SurfaceStylePreset>;

export const DEFAULT_SURFACE_STYLE_ID: SurfaceStylePreset["id"] = "solid";
